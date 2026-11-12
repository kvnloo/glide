#!/usr/bin/env python3
"""Run one explore goal in an owned Boat VM, or run the pre-lane G0 gate."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import traceback
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from probe import probe
from tern import start as start_tern


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--probe', nargs='+')
    args = parser.parse_args()
    os.chdir(ROOT)
    Path('runs').mkdir(exist_ok=True)
    # This entry point deliberately cannot run against Kevin's live desktop or home.
    if ROOT != Path('/home/user/army'):
        raise RuntimeError('lane.py runs only inside Boat at /home/user/army')
    children, logs = [], []

    def spawn(command, name, env=None, cwd=None):
        log = open('runs/' + name + '.log', 'w')
        logs.append(log)
        child = subprocess.Popen(command, env=env, cwd=cwd, stdin=subprocess.DEVNULL,
                                 stdout=log, stderr=subprocess.STDOUT)
        children.append(child)
        return child

    def cleanup():
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()
        for log in logs:
            log.close()

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(130))
    lane = json.loads(Path('lane-config.json').read_text()) if not args.probe else None
    status = dict(lane, status='running', exit=1, stage='start') if lane else {}

    def save():
        Path('runs/lane.tmp').write_text(json.dumps(status, indent=2))
        Path('runs/lane.tmp').replace('runs/lane.json')

    code = 1
    try:
        spawn([sys.executable, '-m', 'http.server', '18931', '--bind', '127.0.0.1', '--directory', 'site'], 'kit-server')
        for _ in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18931/fleet.html', timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError('kit static server readiness failed')
        env = dict(os.environ, E2E_TELEMETRY_DISABLED='1', DO_NOT_TRACK='1',
                   CHROME_EXE='/usr/bin/google-chrome', TMPDIR='/tmp')
        env.pop('WAYLAND_DISPLAY', None)
        # Only the sandbox display is allowed. G0 uses headless Chrome regardless.
        env['DISPLAY'] = ':0'
        if args.probe:
            subprocess.run(['node', 'boat/capture.mjs'], env=env, check=True, timeout=120)
            for model in args.probe:
                result = probe(ROOT / 'canonical-probe.py', ROOT / 'runs/g0/kit.jpg', model)
                name = model.replace('/', '_').replace(':', '_')
                Path('runs/g0/' + name + '-probe.json').write_text(json.dumps(result, indent=2))
                print(json.dumps(result), flush=True)
            code = 0
        else:
            status['stage'] = 'target-readiness'
            save()
            if lane['target'].startswith('tern-'):
                env['TERN_URL'] = start_tern(spawn, lane['sha'])
            env['E2E_MODEL'] = lane['model']
            command = ['node_modules/.bin/e2e', 'explore', lane['goal'], '--config', 'army.config.ts',
                       '--target', lane['target'], '--max-steps', str(lane['steps']), '--timeout', '900000',
                       '--output', 'runs/' + lane['id'], '--reporter', 'list']
            if lane['ai_trace']:
                command.append('--ai-trace')
            status.update(stage='explore', command=[x if x != lane['goal'] else '<goal in goals.tsv>' for x in command])
            save()
            child = spawn(command, lane['id'], env)
            try:
                code = child.wait(timeout=1000)
            except subprocess.TimeoutExpired:
                raise RuntimeError('e2e explore exceeded 1000 second lane deadline')
    except Exception as error:
        status.update(error=str(error), traceback=traceback.format_exc())
        Path('runs/setup-error.json').write_text(json.dumps(status, indent=2))
        print('Lane failed: ' + str(error), file=sys.stderr)
    finally:
        cleanup()
        if lane:
            status.update(status='done', exit=code)
            save()
    return code


if __name__ == '__main__':
    sys.exit(main())
