#!/usr/bin/env python3
"""Capture the real card renderer on the existing isolated Tern studio, never the desktop.

Run from the worktree root. Owns the heavy-job lock and recorder lifetime.
Creates and closes its own studio tab running `bun e2e/card-motion.ts` from frontend/.
"""
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
STUDIO = Path('/home/kvn/.hermes/profiles/clean/cache/scratch/studio')
OUT = ROOT / 'glide/proofs/card-motion'
TERN = '/home/kvn/.local/bin/tern'


def ctl(*args):
    result = subprocess.run([TERN, 'ctl', '--control', str(STUDIO / 'tern/ctl.sock'), *args],
                            capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    if not data.get('ok'):
        raise RuntimeError(data)
    return data


def shot(name):
    result = ctl('shot', 'W1-card-motion-' + name)
    source = Path('/tmp/demo/glide') / result['png']
    shutil.copy2(source, OUT / (name + '.png'))
    layout = Path('/tmp/demo/glide') / result['layout']
    shutil.copy2(layout, OUT / (name + '.layout.json'))


with open('/tmp/glide-studio-heavy.lock', 'w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    while int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines()
                   if line.startswith('MemAvailable:'))) <= 6291456:
        print('Waiting for >6 GiB MemAvailable', flush=True)
        time.sleep(20)
    OUT.mkdir(parents=True, exist_ok=True)
    ctl('tab', 'new')
    ctl('ready')
    ctl('run', json.dumps(f'cd {ROOT / "frontend"} && /home/kvn/.bun/bin/bun e2e/card-motion.ts'))
    for _ in range(20):
        if 'GLIDE / NATIVE CARD MOTION' in json.dumps(ctl('tree')):
            break
        time.sleep(0.5)
    else:
        ctl('tab', 'close')
        raise RuntimeError('The isolated studio tab did not mount the motion verifier')
    try:
        ctl('reduce-motion', 'off')
        ctl('key', 'r')
        time.sleep(0.22)
        shot('entrance')
        (OUT / 'entrance-counts.json').write_text(json.dumps(ctl('dump', '.glide-count-frame'), indent=2))
        ctl('thaw')
        ctl('wait', '900')
        shot('live')
        (OUT / 'live-a11y.json').write_text(json.dumps(ctl('a11y'), indent=2))
        socket = next((STUDIO / 'rt').glob('sway-ipc.*.sock'))
        env = dict(os.environ, XDG_RUNTIME_DIR=str(STUDIO / 'rt'), WAYLAND_DISPLAY='wayland-1', SWAYSOCK=str(socket))
        sway = json.loads(subprocess.check_output(['/home/kvn/.local/opt/sway-nested/bin/swaymsg', '-t', 'get_tree', '-r'], env=env, text=True))

        def nodes(n):
            yield n
            for child in n.get('nodes', []) + n.get('floating_nodes', []):
                yield from nodes(child)

        window = next(n for n in nodes(sway) if n.get('app_id') == 'so.stencil.tern')
        rect = window['rect']
        geom = f"{rect['x']},{rect['y']} {rect['width']}x{rect['height']}"
        with (OUT / 'recorder.log').open('w') as log:
            recorder = subprocess.Popen(['wf-recorder', '-g', geom, '-c', 'libx264', '-p', 'preset=ultrafast',
                                         '-p', 'crf=18', '-y', '-f', str(OUT / 'motion.mp4')], env=env, stdout=log, stderr=log)
            try:
                time.sleep(0.6)
                ctl('key', 'r')
                time.sleep(2.2)
                ctl('key', 'd')
                time.sleep(1.2)
            finally:
                recorder.send_signal(signal.SIGINT)
                if recorder.wait(timeout=20) != 0:
                    raise RuntimeError('Recorder failed; see recorder.log')
        shot('done')
        (OUT / 'done-tree.json').write_text(json.dumps(ctl('tree'), indent=2))
        ctl('key', 'n')
        ctl('wait', '900')
        shot('other-parts')
        ctl('key', 'n')
        ctl('reduce-motion', 'on')
        ctl('key', 'r')
        ctl('wait', '30')
        shot('reduced')
        (OUT / 'reduced-counts.json').write_text(json.dumps(ctl('dump', '.glide-count-frame'), indent=2))
    finally:
        ctl('reduce-motion', 'off')
        ctl('key', 'q')
        ctl('tab', 'close')
    print(json.dumps({'stills': [str(OUT / 'entrance.png'), str(OUT / 'live.png')], 'clip': str(OUT / 'motion.mp4')}))
