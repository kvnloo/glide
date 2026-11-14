#!/usr/bin/env python3
"""Capture and exercise the real agents overlay in an owned, offscreen Tern studio."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path, default=ROOT / 'docs/images/agent-tree')
args = parser.parse_args()
out = args.out.resolve()
out.mkdir(parents=True, exist_ok=True)

with open('/tmp/glide-studio-heavy.lock', 'a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    while int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))) < 6291456:
        print('Waiting for MemAvailable > 6 GiB', flush=True)
        time.sleep(30)
    with tempfile.TemporaryDirectory(prefix='glide-agent-tree-') as work:
        work = Path(work)
        bundle = work / 'fixture.mjs'
        subprocess.run([str(ROOT / 'frontend/node_modules/.bin/esbuild'), str(ROOT / 'frontend/e2e/agent-tree-studio.ts'), '--bundle', '--platform=node', '--format=esm', '--target=node22', f'--tsconfig={ROOT}/frontend/tsconfig.json', '--preserve-symlinks', "--banner:js=import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);", f'--outfile={bundle}'], cwd=ROOT, check=True)
        env = {'HOME': str(work), 'PATH': os.environ['PATH'], 'LANG': 'C.UTF-8', 'TERM': 'xterm-256color',
               'TERN_CONFIG_DIR': str(work / 'config'), 'TERN_DAEMON_SOCKET': str(work / 'daemon.sock')}
        # No host display, session socket, profile, or gateway environment is inherited.
        control = work / 'ctl.sock'
        tern = shutil.which('tern')
        if not tern:
            raise RuntimeError('Tern is unavailable. No desktop fallback is allowed.')
        def ctl(*command):
            result = subprocess.run([tern, 'ctl', '--control', str(control), *command], env=env, capture_output=True, text=True, check=True)
            return result.stdout
        with open(out / 'studio.log', 'w') as log:
            proc = subprocess.Popen([tern, 'serve', '--control', str(control), '--out', str(out), '--dir', str(work)], env=env, stdout=log, stderr=subprocess.STDOUT)
            try:
                for _ in range(100):
                    if control.exists():
                        break
                    if proc.poll() is not None:
                        raise RuntimeError('Owned Tern exited. Inspect studio.log.')
                    time.sleep(.1)
                else:
                    raise RuntimeError('Owned Tern control endpoint did not appear.')
                ctl('resize', '1440', '1000')
                ctl('run', json.dumps(f'{shutil.which("node")} {bundle} 2>{out}/fixture-stderr.log'))
                for _ in range(100):
                    tree = ctl('tree')
                    if 'Planner' in tree:
                        break
                    time.sleep(.1)
                else:
                    (out / 'startup-tree.json').write_text(tree)
                    (out / 'startup-state.json').write_text(ctl('state'))
                    ctl('shot', 'startup-failure')
                    raise RuntimeError('The real overlay did not render. Inspect fixture-stderr.log and startup-state.json.')
                ctl('shot', 'collapsed')
                ctl('record', 'start', 'expansion', 'fps', '30')
                ctl('wait', '600')
                ctl('click', '[data-agent-toggle=planner]')
                ctl('wait', '320')
                expanded = ctl('tree')
                if 'UI worker' not in expanded or 'Current step' not in expanded:
                    raise RuntimeError('Mouse expansion did not expose context and children.')
                ctl('key', 'Right')
                ctl('key', 'Enter')
                ctl('wait', '320')
                nested = ctl('tree')
                if 'Keyboard checks' not in nested:
                    raise RuntimeError('Keyboard expansion did not expose the nested child.')
                ctl('shot', 'expanded')
                ctl('wait', '800')
                ctl('key', 'Left')
                ctl('wait', '320')
                ctl('key', 'Left')
                ctl('key', 'Enter')
                ctl('wait', '320')
                ctl('record', 'stop')
                (out / 'expanded-tree.json').write_text(nested)
                (out / 'verification.json').write_text(json.dumps({'renderer': 'real Tern offscreen studio', 'mouse_expansion': True, 'keyboard_nested_expansion': True, 'desktop_access': False}, indent=2) + '\n')
            finally:
                if proc.poll() is None:
                    ctl('quit')
                proc.wait()
        print(json.dumps({'stills': [str(out / 'collapsed.png'), str(out / 'expanded.png')], 'clip': str(out / 'expansion.mp4')}))
