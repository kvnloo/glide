"""Deterministic planner; reuses W4's sandbox ownership and dependency snapshot."""
import concurrent.futures
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

from up import Army, ROOT, boat, digest, guard_budget, redact, run

SWEEPS = ('sweep-clicks', 'sweep-themes', 'sweep-console', 'sweep-build')


def plan(revisions):
    lanes = []
    for target, sha in [('kit', revisions[0][1]), *[('tern-' + name, sha) for name, sha in revisions]]:
        for sweep in SWEEPS:
            if target == 'kit' and sweep == 'sweep-build':
                continue
            lanes.append({'id': target + '-' + sweep, 'sweep': sweep,
                          'target': 'kit' if target == 'kit' else 'tern', 'sha': sha,
                          'canary': os.getenv('CANARY') == '1', 'deterministic': True,
                          'goal': sweep, 'model': 'none'})
    selected = [lane for lane in lanes if re.search(os.getenv('ONLY', '.'), lane['id'])]
    if not selected:
        raise ValueError('no deterministic lanes selected')
    return selected


def archive_tree(repo, sha, dest):
    dest.mkdir()
    archive = dest.parent / (dest.name + '.tar')
    with archive.open('wb') as stream:
        subprocess.run(['git', '-C', str(repo), 'archive', sha], stdout=stream, check=True)
    with tarfile.open(archive) as tar:
        tar.extractall(dest, filter='data')


def main():
    os.chdir(ROOT)
    concurrency = int(os.getenv('LANES', '8'))
    if not 1 <= concurrency <= 8:
        raise ValueError('LANES must be 1..8')
    revisions = [(name, run('git', 'rev-parse', ref).strip()) for name, ref in (
        ('main', os.getenv('MAIN_SHA', 'origin/main')),
        ('pr269', os.getenv('PR_SHA', 'origin/feat/eui-fleet-vendor')))]
    selected = plan(revisions)
    kit_repo = Path(os.environ['KIT_DIR'])  # ephemeral-ui gh-pages checkout
    kit_sha = run('git', '-C', str(kit_repo), 'rev-parse', os.getenv('KIT_SHA', 'c3b7b27')).strip()
    snapshot = os.getenv('SNAPSHOT', 'glide-army-5ae480ebbfeda4f5')
    snaps = boat('snapshots')
    if not any(s['name'] == snapshot and s['status'] == 'ready' for s in snaps['named']):
        raise RuntimeError('W4 dependency snapshot is not ready: ' + snapshot)
    out = Path(os.getenv('OUT', 'runs/boat/' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-sweeps')).resolve()
    out.mkdir(parents=True, exist_ok=False)
    army = Army(out)
    before = boat('billing')
    (out / 'billing-before.json').write_text(json.dumps(before, indent=2))
    guard_budget(before, min(len(selected), concurrency))
    army.meta.update(deterministic=True, snapshot=snapshot, revisions=dict(revisions), kit_sha=kit_sha,
                     canary=os.getenv('CANARY') == '1', concurrency=concurrency)
    army.save()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(130))
    try:
        with tempfile.TemporaryDirectory(prefix='glide-sweeps-') as temp:
            temp = Path(temp)
            archive_tree(kit_repo, kit_sha, temp / 'kit-source')
            payloads = {}
            for sha in dict.fromkeys(lane['sha'] for lane in selected):
                dest = temp / sha
                dest.mkdir()
                src = dest / 'army'
                shutil.copytree(ROOT, src, ignore=shutil.ignore_patterns('node_modules', 'runs', '.e2e', '__pycache__', '*.pyc'))
                from canary import prepare_site
                manifest = prepare_site(temp / 'kit-source', src / 'site', army.meta['canary'])
                (src / 'canary-manifest.json').write_text(json.dumps(manifest, indent=2))
                archive_tree(ROOT.parents[2], sha, dest / 'glide')
                (dest / 'glide/ARMY_SHA').write_text(sha)
                pin = json.loads((dest / 'glide/frontend/src/vendor/ephemeral-ui/PIN.json').read_text())
                for lane in selected:
                    if lane['sha'] == sha:
                        lane.update(kit_sha=kit_sha, expected_pin=kit_sha, archived_pin=pin['sha'])
                bundle = dest / 'payload.tgz'
                with tarfile.open(bundle, 'w:gz', compresslevel=1) as tar:
                    tar.add(src, arcname='army')
                    tar.add(dest / 'glide', arcname='glide')
                payloads[sha] = bundle
            army.meta['payloads'] = {sha: digest(p) for sha, p in payloads.items()}
            pending, active = selected[:], {}
            while pending or active:
                while pending and len(active) < concurrency:
                    guard_budget(boat('billing'), 1)
                    lane = pending.pop(0)
                    sid = army.new('glide-' + lane['id'], snapshot)
                    # Snapshot paths belong only to this clone. Never inherit previous run receipts.
                    army.remote(sid, 'rm -rf runs site /home/user/army-private; mkdir -p runs', 30)
                    army.upload(sid, payloads[lane['sha']], include_glide=True)
                    config = temp / (lane['id'] + '.json')
                    config.write_text(json.dumps(lane))
                    run('boat', '--no-update', 'scp', str(config), f'{sid}:/home/user/army/lane-config.json')
                    boat('exec', sid, '--detach', '--cwd', 'army', '--', 'python3', 'boat/sweep_lane.py')
                    active[sid] = (lane, time.monotonic())
                    army.meta['lanes'].append(dict(lane, sandbox=sid))
                    army.save()
                time.sleep(int(os.getenv('POLL_SECONDS', '5')))
                # Remote reads are independent; keep completion/deletion ahead of new admission.
                with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                    statuses = dict(zip(active, pool.map(lambda sid: army.remote(sid, 'cat runs/lane.json 2>/dev/null || true', 30), active)))
                for sid, text in statuses.items():
                    lane, start = active[sid]
                    status = json.loads(text) if text.strip() else {}
                    expired = time.monotonic() - start > int(os.getenv('LANE_TIMEOUT', '2100'))
                    if status.get('status') == 'done' or expired:
                        try:
                            army.pull(sid, out / lane['id'])
                        finally:
                            army.delete(sid)
                        del active[sid]
                        if expired or status.get('exit', 1):
                            army.meta.setdefault('failed_lanes', []).append(lane['id'])
                        army.save()
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
        alive = {s['id'] for s in current['sandboxes']}
        army.meta['deletion_verified'] = all(s['id'] not in alive for s in army.meta['sandboxes'])
        army.meta['account_vm_minutes_delta'] = (after['limits']['creditUsedSeconds'] - before['limits']['creditUsedSeconds']) / 60
        army.meta['finished_at'] = time.time()
        army.save()
        from findings import main as findings
        findings(out)
        run(sys.executable, str(ROOT / 'sanity.py'), str(out))
        print('Artifacts: ' + str(out), flush=True)
    return int(bool(army.meta.get('failed_lanes') or not army.meta['deletion_verified']))
