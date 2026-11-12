#!/usr/bin/env python3
"""One deterministic sweep per sandbox. No provider calls or model verdicts.
Never run `hermes update` (or `hermes profile use`, `hermes gateway restart`) from a test/film lane.
"""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import traceback

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tern import start as start_tern


def main():
    if ROOT != Path('/home/user/army'):
        raise RuntimeError('sweep_lane.py runs only inside Boat at /home/user/army')
    os.chdir(ROOT)
    Path('runs').mkdir(exist_ok=True)
    lane = json.loads(Path('lane-config.json').read_text())
    status = dict(lane, status='running', stage='start', exit=1)
    children, logs = [], []

    def save():
        # Boat may rehydrate the home mount while dependencies are first touched.
        # Re-enter its stable path rather than inheriting a retired directory inode.
        os.chdir(ROOT)
        Path('runs/lane.tmp').write_text(json.dumps(status, indent=2))
        Path('runs/lane.tmp').replace('runs/lane.json')

    def spawn(command, name, env=None, cwd=None):
        log = open(ROOT / ('runs/' + name + '.log'), 'w')
        logs.append(log)
        child = subprocess.Popen(command, env=env, cwd=cwd or str(ROOT), stdin=subprocess.DEVNULL,
                                 stdout=log, stderr=subprocess.STDOUT)
        children.append(child)
        return child

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(130))
    save()
    try:
        spawn([sys.executable, '-m', 'http.server', '18931', '--bind', '127.0.0.1', '--directory', 'site'], 'kit-server')
        if lane['target'] == 'tern':
            status['stage'] = 'exact-sha-build'
            save()
            env = dict(os.environ, PATH='/home/user/army-deps/bin:' + os.environ['PATH'],
                       HERMES_SRC='/home/user/army-deps/hermes', HERMES_PYTHON_SRC_ROOT='/home/user/army-deps/hermes')
            build = spawn(['bash', '-euc', 'node scripts/hermes-src.mjs; bun install --frozen-lockfile; bun run bundle'],
                          'glide-build', env, '/home/user/glide/frontend')
            if build.wait(timeout=600):
                raise RuntimeError('exact-SHA frontend build failed; see glide-build.log')
            status['stage'] = 'target-readiness'
            save()
            os.environ['ARMY_DETERMINISTIC'] = '1'
            url = start_tern(spawn, lane['sha'])
            lane['url'] = url
        else:
            lane['url'] = 'http://127.0.0.1:18931/'
        os.chdir(ROOT)
        Path('sweep-config.json').write_text(json.dumps(lane))
        status['stage'] = 'detector-regressions'
        save()
        regression = spawn(['node', 'tests/sweep-browser-contract.mjs'], 'detector-regressions')
        if regression.wait(timeout=90):
            raise RuntimeError('rendered detector regression failed; see detector-regressions.log')
        status['stage'] = 'sweep'
        save()
        child = spawn(['node', 'sweeps.mjs', 'sweep-config.json'], 'sweep')
        status['exit'] = child.wait(timeout=1800)
    except Exception as error:
        status.update(error=str(error), traceback=traceback.format_exc())
        Path('runs/setup-error.json').write_text(json.dumps(status, indent=2))
    finally:
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
        status['status'] = 'done'
        save()
    return status['exit']


if __name__ == '__main__':
    sys.exit(main())
