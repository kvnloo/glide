#!/usr/bin/env python3
"""Capture the production council in a private Tern window on the existing headless studio.

Usage: python glide/tools/council-capture.py OUT_DIR STUDIO_DIR SWAYMSG
Requires the existing studio compositor, Tern, grim, wf-recorder, and platform TTS.
The shared heavy lock and >6 GiB memory gate apply before any GUI process starts.
"""
import fcntl
import json
import os
import re
from pathlib import Path
import shutil
import shlex
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]).resolve()
STUDIO = Path(sys.argv[2]).resolve()
SWAYMSG = sys.argv[3]
PLATFORM = ROOT / '.hermes-agent/council-platform/usr'
OUT.mkdir(parents=True, exist_ok=True)


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kwargs).stdout


def memory():
    return int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))


with open('/tmp/glide-studio-heavy.lock', 'w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    while memory() <= 6291456:
        print('Waiting for MemAvailable > 6 GiB', flush=True)
        time.sleep(30)
    assert (STUDIO / 'rt/wayland-1').is_socket(), 'Isolated studio unavailable. Do not use the live desktop.'
    bundle = run(['node', str(ROOT / 'glide/tools/council-native-build.mjs')], cwd=ROOT).strip()
    env = dict(os.environ, XDG_RUNTIME_DIR=str(STUDIO / 'rt'), WAYLAND_DISPLAY='wayland-1',
               XDG_SESSION_TYPE='wayland', TERN_CONFIG_DIR=str(OUT / 'cfg'),
               TERN_DAEMON_SOCKET=str(OUT / 'daemon.sock'), XDG_STATE_HOME=str(OUT / 'state'),
               TERN_BUILD_URL='http://127.0.0.1:9', PULSE_SINK='glide_council_w5',
               PULSE_SERVER=os.environ.get('PULSE_SERVER', f"unix:{os.environ.get('XDG_RUNTIME_DIR', '/run/user/' + str(os.getuid()))}/pulse/native"),
               PATH=f"{PLATFORM / 'bin'}:{os.environ['PATH']}",
               LD_LIBRARY_PATH=str(PLATFORM / 'lib'), ESPEAK_DATA_PATH=str(PLATFORM / 'share/espeak-ng-data'))
    env.pop('DISPLAY', None)
    env.pop('TERN_PANE', None)
    env.pop('TERN_WINDOW_KEY', None)
    # A null sink accepts real synthesized PCM without playing it on Kevin's speakers.
    module = run(['pactl', 'load-module', 'module-null-sink', 'sink_name=glide_council_w5',
                  'sink_properties=device.description=CouncilVerification,priority.session=0']).strip()
    # Match the settled state of a profile that has declined Tern's own omp manager prompt.
    omp = OUT / 'cfg/omp'
    omp.mkdir(parents=True, exist_ok=True)
    (omp / 'state.json').write_text(json.dumps({'managed': False, 'checked': 0, 'no_build': False, 'offered': True}))
    ctl = str(OUT / 'ctl.sock')
    window = None
    recorder = None
    try:
        log = open(OUT / 'native.log', 'w')
        window = subprocess.Popen(['tern', '--control', ctl, '--dir', str(ROOT)], cwd=ROOT, env=env, stdout=log, stderr=log)
        def control(*args):
            return run(['tern', 'ctl', '--control', ctl, *args], env=env)
        for _ in range(60):
            if Path(ctl).is_socket():
                break
            if window.poll() is not None:
                raise RuntimeError((OUT / 'native.log').read_text())
            time.sleep(.5)
        # Native account fixture applies only to this owned process and config.
        control('account', 'signed-in', 'atlas')
        control('appearance', 'dark')
        control('theme', 'dark', 'dash')
        control('resize', '1440', '900')
        for _ in range(60):
            state = json.loads(control('state'))
            if state.get('focused', {}).get('prompt'):
                break
            time.sleep(.5)
        command = ['env', *[f'{key}={env[key]}' for key in ['PATH', 'LD_LIBRARY_PATH', 'ESPEAK_DATA_PATH', 'PULSE_SERVER', 'PULSE_SINK']],
                   shutil.which('node'), bundle]
        control('type', json.dumps('exec ' + shlex.join(command) + ' 2>' + shlex.quote(str(OUT / 'app.log'))))
        control('key', 'Enter')
        for _ in range(60):
            tree = control('tree')
            if 'Socratic council' in tree:
                break
            state = json.loads(control('state'))
            if state.get('focused', {}).get('exited') is not None:
                raise RuntimeError('Council process exited: ' + (OUT / 'app.log').read_text())
            time.sleep(.5)
        else:
            (OUT / 'mount-tree.json').write_text(tree)
            (OUT / 'mount-state.json').write_text(control('state'))
            raise RuntimeError('Native council did not mount; inspect mount-tree.json and mount-state.json')
        sway = str(next((STUDIO / 'rt').glob('sway-ipc.*.sock')))
        swaymsg = SWAYMSG
        # Only this owned headless client is resized. No host compositor commands.
        run([swaymsg, '-s', sway, f'[pid={window.pid}] floating enable, resize set 1440 900, move position 0 0'], env=env)
        time.sleep(1)
        recorder = subprocess.Popen(['wf-recorder', '--audio=glide_council_w5.monitor', '-C', 'aac', '-g', '0,0 1440x900', '-r', '15', '-c', 'libx264',
                                     '-p', 'preset=ultrafast', '-p', 'crf=20', '-f', str(OUT / 'native-raw.mp4'), '-y'],
                                    env=env, stdout=log, stderr=log)
        control('key', 'Enter')
        time.sleep(1)
        run(['grim', '-g', '0,0 1440x900', str(OUT / 'brief.png')], env=env)
        time.sleep(4)
        control('key', 'r')
        # R during working enables reading the report. The brief reader is exercised on replay below.
        for _ in range(80):
            tree = control('tree')
            if 'Return to card' in tree:
                break
            time.sleep(.4)
        (OUT / 'speaking-tree.json').write_text(tree)
        assert 'Return to card' in tree, 'Real platform playback never reached the orb'
        time.sleep(.35)  # Let the seekable card-to-orb fade reach its steady state.
        run(['grim', '-g', '0,0 1440x900', str(OUT / 'speaking.png')], env=env)
        control('key', 'x')
        time.sleep(.4)
        tree = control('tree')
        assert 'VERDICT' in tree and 'RECEIPTS' in tree and 'Return to card' not in tree, 'Any-key return failed'
        run(['grim', '-g', '0,0 1440x900', str(OUT / 'report.png')], env=env)
        (OUT / 'report-tree.json').write_text(tree)
        control('key', 'Enter')
        time.sleep(4)
        tree = control('tree')
        assert 'Return to card' in tree, 'Replay did not read the brief'
        (OUT / 'replay-tree.json').write_text(tree)
        control('click', '.sf-layer button')
        time.sleep(.4)
        tree = control('tree')
        assert 'Socratic council' in tree and 'Return to card' not in tree, 'Click return failed'
        control('key', 'm')
        time.sleep(.3)
        assert 'Unmute' in control('tree'), 'Mute control failed'
        control('key', 'Escape')
        (OUT / 'receipt.json').write_text(json.dumps({'native': True, 'synthetic': True, 'platform_speech': True,
            'audio_sink': 'null', 'any_key_return': True, 'brief_and_report': True, 'memory_kib': memory()}, indent=2))
    finally:
        if recorder:
            recorder.send_signal(signal.SIGINT)
            recorder.wait(timeout=30)
        if window:
            try:
                run(['tern', 'ctl', '--control', ctl, 'quit'], env=env)
            except subprocess.CalledProcessError:
                window.terminate()
            try:
                window.wait(timeout=15)
            except subprocess.TimeoutExpired:
                window.kill()
                window.wait()
        run(['pactl', 'unload-module', module])
    run(['ffmpeg', '-y', '-i', str(OUT / 'native-raw.mp4'), '-c:v', 'libx264', '-preset', 'veryslow', '-threads', '2',
         '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'council.mp4')])
    audio = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(OUT / 'council.mp4'), '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True).stderr
    (OUT / 'audio-check.txt').write_text(audio)
    peak = re.search(r'max_volume: (-?[\d.]+) dB', audio)
    assert peak and float(peak[1]) > -50, 'No audible speech reached the dedicated recording sink'
    receipt = json.loads((OUT / 'receipt.json').read_text())
    receipt.update(click_return=True, mute=True, audio_peak_db=float(peak[1]))
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps({'stills': [str(OUT / 'brief.png'), str(OUT / 'report.png')], 'clip': str(OUT / 'council.mp4')}))
