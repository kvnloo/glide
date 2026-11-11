#!/usr/bin/env python3
"""Boat snapshot/lane lifecycle, adapted from trafficiq's e2e/army/boat/up.sh."""
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from canary import prepare_site
from findings import main as findings


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if result.returncode:
        # Never echo argv. boat new contains an ephemeral API key.
        raise RuntimeError(f'{args[0]} {args[1] if len(args) > 1 else ""} failed, exit {result.returncode}: ' + redact((result.stderr + '\n' + result.stdout)[-3000:]))
    return result.stdout


def redact(text):
    for key in ('NVIDIA_API_KEY',):
        value = os.environ.get(key)
        if value:
            text = text.replace(value, '<redacted>')
    return text


def boat(*args):
    text = run('boat', '--no-update', '--json', *map(str, args))
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return [json.loads(line) for line in text.splitlines() if line.strip()]


def records(data):
    return data if isinstance(data, list) else [data]


def stdout(data):
    return ''.join(row.get('stdout', row.get('data', '') if row.get('type', row.get('stream')) == 'stdout' else '') for row in records(data))


def guard_budget(billing, starts):
    limits = billing['limits']
    wallet = billing.get('walletStatus', {})
    if (limits['keepGoing']['enabled'] or wallet.get('autoTopUp', {}).get('enabled')
        or wallet.get('balanceDollars', 0) != 0 or limits.get('nextStartDollars', 0) != 0):
        raise RuntimeError('plan-only guard: wallet must be $0, extra starts and auto-top-up off, next start free')
    if not limits['canStart'] or limits['creditBalanceSeconds'] < 3600:
        raise RuntimeError('plan-only guard: unavailable or fewer than 60 VM minutes left')
    for window in ('day', 'hour', 'minute'):
        if limits['starts'][window]['remaining'] < starts:
            raise RuntimeError(f'plan-only guard: insufficient {window} start quota; wait for reset')


class Army:
    def __init__(self, out):
        self.out = out
        self.owned = []
        self.meta = {'sandboxes': [], 'lanes': [], 'started_at': time.time()}

    def save(self):
        (self.out / 'run.json').write_text(json.dumps(self.meta, indent=2))

    def new(self, name, snapshot=None, keyed=False):
        args = ['new', '--name', name, '--no-env', '--type', os.getenv('TYPE', 'default'),
                '--ttl', os.getenv('TTL', '1800')]
        if snapshot:
            args += ['--from', snapshot]
        if keyed:
            args += ['-e', 'NVIDIA_API_KEY=' + os.environ['NVIDIA_API_KEY']]
        result = boat(*args)
        created = next((r for r in records(result) if r.get('event') == 'created'), None)
        if not created or not created.get('id'):
            raise RuntimeError('boat new did not return a created sandbox id')
        sid = created['id']
        self.owned.append(sid)
        self.meta['sandboxes'].append({'id': sid, 'name': name, 'created_at': time.time(), 'deleted': False})
        self.save()
        print(f'Created {name}: {sid}', flush=True)
        return sid

    def delete(self, sid):
        try:
            usage = boat('usage', sid)
            (self.out / f'{sid}-usage.json').write_text(json.dumps(usage, indent=2))
        except Exception as error:
            self.meta.setdefault('usage_errors', []).append(redact(str(error)))
        # A failed usage query must never prevent deletion.
        boat('delete', sid, '--yes')
        self.owned.remove(sid)
        entry = next(item for item in self.meta['sandboxes'] if item['id'] == sid)
        entry.update(deleted=True, deleted_at=time.time())
        self.save()
        print('Deleted ' + sid, flush=True)

    def remote(self, sid, command, timeout=120):
        result = boat('exec', sid, '--timeout', timeout, '--cwd', 'army', '--', 'bash', '-euc', command)
        for row in records(result):
            code = row.get('exitCode', row.get('exit_code', 0))
            if code:
                raise RuntimeError(f'Boat command failed on {sid}: exit {code}')
        return stdout(result)

    def upload(self, sid, bundle, include_glide=False):
        run('boat', '--no-update', 'scp', str(bundle), f'{sid}:/tmp/army.tgz')
        # Never overwrite the snapshot's rebuilt frontend with the archived dist bundle.
        exclude = '' if include_glide else '--exclude=glide '
        boat('exec', sid, '--timeout', 120, '--', 'bash', '-euc', 'tar ' + exclude + '-xzf /tmp/army.tgz -C /home/user; rm /tmp/army.tgz')

    def pull(self, sid, folder):
        self.remote(sid, 'tar -czf /tmp/army-results.tgz runs', 120)
        folder.mkdir(parents=True, exist_ok=True)
        archive = folder / 'results.tgz'
        run('boat', '--no-update', 'scp', f'{sid}:/tmp/army-results.tgz', str(archive))
        with tarfile.open(archive) as tar:
            tar.extractall(folder, filter='data')

    def cleanup(self):
        for sid in self.owned[:]:
            try:
                self.delete(sid)
            except Exception as error:
                self.meta.setdefault('cleanup_errors', []).append(redact(str(error)))
                self.save()


def goals():
    selected = []
    pattern = re.compile(os.getenv('ONLY', '.'))
    for line in (ROOT / 'goals.tsv').read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        lane, target, goal = line.split('\t', 2)
        if pattern.search(lane) and target.startswith(os.getenv('KIND', '') + ('-' if os.getenv('KIND') else '')):
            selected.append({'id': lane, 'target': target, 'goal': goal,
                             'model': os.getenv('E2E_MODEL', 'google/gemma-4-31b-it')})
    pair = json.loads(Path(os.environ['PAIR_CONFIG']).read_text()) if os.getenv('PAIR_CONFIG') else {}
    pair_lane = os.getenv('PAIR_LANE', pair.get('lane'))
    pair_model = os.getenv('PAIR_MODEL', pair.get('model'))
    if pair_lane:
        original = next((x for x in selected if x['id'] == pair_lane), None)
        if not original or not pair_model:
            raise ValueError('PAIR_LANE must select a lane and PAIR_MODEL must name a second model')
        if pair_model == original['model']:
            raise ValueError('PAIR_MODEL must differ from the primary model')
        selected.append(dict(original, id=original['id'] + '-paired', model=pair_model, paired_with=original['id']))
    if not selected:
        raise ValueError('no goals selected')
    return selected


def bundle(dest, sha, kit, probe, tern, bun):
    army = dest / 'army'
    shutil.copytree(ROOT, army, ignore=shutil.ignore_patterns('node_modules', 'runs', '.e2e', '__pycache__', '*.pyc'))
    manifest = prepare_site(kit, army / 'site', os.getenv('CANARY') == '1')
    (army / 'canary-manifest.json').write_text(json.dumps(manifest, indent=2))
    shutil.copy2(probe, army / 'canonical-probe.py')
    shutil.copy2(tern, army / 'tern-bin')
    shutil.copy2(bun, army / 'bun-bin')
    with open(dest / 'glide.tar', 'wb') as stream:
        subprocess.run(['git', '-C', str(ROOT.parents[2]), 'archive', sha], stdout=stream, check=True)
    glide = dest / 'glide'
    glide.mkdir()
    with tarfile.open(dest / 'glide.tar') as tar:
        tar.extractall(glide, filter='data')
    (glide / 'ARMY_SHA').write_text(sha)
    archive = dest / 'bundle.tgz'
    with tarfile.open(archive, 'w:gz', compresslevel=1) as tar:
        tar.add(army, arcname='army')
        tar.add(glide, arcname='glide')
    return archive


def main():
    os.chdir(ROOT)
    os.environ['BOAT_NO_UPDATE'] = '1'
    if not os.getenv('NVIDIA_API_KEY'):
        raise RuntimeError('run via the ops with-keys.sh; NVIDIA_API_KEY is missing')
    if os.getenv('E2E_BASE_URL', 'https://integrate.api.nvidia.com/v1') != 'https://integrate.api.nvidia.com/v1':
        raise ValueError('only the authorized free NIM endpoint is enabled')
    selected = goals()
    concurrency = int(os.getenv('LANES', '2'))
    if not 1 <= concurrency <= 3:
        raise ValueError('LANES must be 1..3 to respect NIM throughput')
    out = Path(os.getenv('OUT', 'runs/boat/' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()))).resolve()
    out.mkdir(parents=True, exist_ok=False)
    army = Army(out)
    before = boat('billing')
    (out / 'billing-before.json').write_text(json.dumps(before, indent=2))
    guard_budget(before, min(len(selected), concurrency) + 1)
    sha = run('git', '-C', str(ROOT), 'rev-parse', os.getenv('GLIDE_SHA', 'HEAD')).strip()
    tag = os.getenv('HERMES_TAG', 'v0.23.1+canary.20261110T064422Z')
    hermes_sha = os.getenv('HERMES_SHA', 'da06acacc986ebe8e9c74f5a7b2867c5a8a7d64b')
    tern = Path(os.getenv('TERN_BIN', str(Path.home() / '.local/bin/tern'))).resolve()
    bun = Path(os.getenv('BUN_BIN', shutil.which('bun') or '')).resolve()
    probe = Path(os.getenv('PROBE_SCRIPT', str(Path.home() / '.hermes/profiles/clean/skills/rendered-ui-qualification/scripts/probe-vision-model.py')))
    default_kit = Path('/mnt/zer0models/workspace/zer0/products/launch-videos/pretotypes/ephemeral-ui/src')
    kit = Path(os.getenv('KIT_DIR', str(default_kit)))
    key = hashlib.sha256((''.join([digest(ROOT / 'package-lock.json'), digest(ROOT / 'boat/setup.sh'),
                                  sha, tag, hermes_sha, digest(tern), digest(bun)])).encode()).hexdigest()[:16]
    snap = 'glide-army-' + key
    army.meta.update(sha=sha, hermes_tag=tag, hermes_sha=hermes_sha, snapshot=snap,
                     steps=int(os.getenv('STEPS', '8')), canary=os.getenv('CANARY') == '1')
    army.save()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(130))
    try:
        with tempfile.TemporaryDirectory(prefix='glide-army-') as temp:
            archive = bundle(Path(temp), sha, kit, probe, tern, bun)
            army.meta['payload_sha256'] = digest(archive)
            snaps = boat('snapshots')
            existing = any(item['name'] == snap and item.get('status') == 'ready' for item in snaps['named'])
            if not existing:
                allowance = snaps.get('namedAllowance', {})
                if allowance.get('used', 0) >= allowance.get('free', 0):
                    raise RuntimeError('no free named snapshot slots; refusing paid snapshot storage')
                base = army.new(snap + '-build')
                army.upload(base, archive, include_glide=True)
                cmd = shlex.join(['env', 'GLIDE_SHA=' + sha, 'HERMES_TAG=' + tag, 'HERMES_SHA=' + hermes_sha,
                                  'bash', 'boat/setup.sh'])
                (out / 'snapshot-setup.log').write_text(army.remote(base, cmd, 1800))
                boat('snapshot', base, snap)
                army.delete(base)
            # G0 is on a snapshot clone. It is not an explorer lane and receives no goal.
            g0 = army.new('glide-army-g0', snap, keyed=True)
            army.upload(g0, archive)
            model_ids = list(dict.fromkeys(lane['model'] for lane in selected))
            cmd = shlex.join(['env', 'CANARY=' + os.getenv('CANARY', '0'), 'python3', 'boat/lane.py', '--probe', *model_ids])
            try:
                (out / 'g0.log').write_text(army.remote(g0, cmd, 600))
            finally:
                army.pull(g0, out / 'g0')
                army.delete(g0)
            pending, active = selected[:], {}
            failures = []
            while pending or active:
                while pending and len(active) < concurrency:
                    guard_budget(boat('billing'), 1)
                    lane = pending.pop(0)
                    lane.update(sha=sha, canary=os.getenv('CANARY') == '1', steps=army.meta['steps'],
                                ai_trace=os.getenv('AI_TRACE', '1') == '1')
                    sid = army.new('glide-army-' + lane['id'], snap, keyed=True)
                    army.upload(sid, archive)
                    config = Path(temp) / 'lane-config.json'
                    config.write_text(json.dumps(lane))
                    run('boat', '--no-update', 'scp', str(config), f'{sid}:/home/user/army/lane-config.json')
                    # Detached exec rejects --timeout. Never pass both.
                    boat('exec', sid, '--detach', '--cwd', 'army', '--', 'bash', 'boat/lane.sh')
                    active[sid] = (lane, time.monotonic())
                    army.meta['lanes'].append(dict(lane, sandbox=sid))
                    army.save()
                time.sleep(int(os.getenv('POLL_SECONDS', '10')))
                for sid, (lane, start) in list(active.items()):
                    text = army.remote(sid, 'cat runs/lane.json 2>/dev/null || true', 30)
                    status = json.loads(text) if text.strip() else {}
                    expired = time.monotonic() - start > int(os.getenv('LANE_TIMEOUT', '1200'))
                    if status.get('status') == 'done' or expired:
                        army.pull(sid, out / lane['id'])
                        army.delete(sid)
                        del active[sid]
                        if status.get('exit', 1) != 0 or expired:
                            failures.append(lane['id'])
            army.meta['failed_lanes'] = failures
    except Exception as error:
        army.meta['error'] = redact(str(error))
        army.save()
        raise
    finally:
        army.cleanup()
        after = boat('billing')
        (out / 'billing-after.json').write_text(json.dumps(after, indent=2))
        current = boat('list')
        (out / 'boat-list-after.json').write_text(json.dumps(current, indent=2))
        alive = {item['id'] for item in current['sandboxes']}
        army.meta['deletion_verified'] = all(item['id'] not in alive for item in army.meta['sandboxes'])
        army.meta['account_vm_minutes_delta'] = (after['limits']['creditUsedSeconds'] - before['limits']['creditUsedSeconds']) / 60
        army.meta['account_delta_note'] = 'Account-wide billing delta includes unrelated running sandboxes; per-sandbox usage receipts are saved separately.'
        army.meta['finished_at'] = time.time()
        army.save()
        findings(out)
        run(sys.executable, str(ROOT / 'sanity.py'), str(out))
        print('Artifacts: ' + str(out), flush=True)
    if army.meta.get('failed_lanes') or not army.meta['deletion_verified']:
        return 1
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print('ARMY BLOCKED: ' + redact(str(error)), file=sys.stderr)
        sys.exit(1)
