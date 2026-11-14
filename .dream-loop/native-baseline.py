#!/usr/bin/env python3
"""Capture an unchanged Glide baseline in a private offscreen Tern process.

Run on mbp after deploying git archive to /tmp/glide-w8-cohesion/source.
Never uses or restarts an existing Tern window, gateway, or display.
"""
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path('/tmp/glide-w8-cohesion')
SOURCE = ROOT / 'source'
TERN = ROOT / 'bin/tern'
OUT = ROOT / ('baseline-retry-' + str(time.time_ns()))
HOME = ROOT / 'profile'
THRESHOLD = 4194304  # W8 retry note overrides the common 6 GiB gate.


def memory():
    return int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))


def is_ready(tree):
    nodes = list(json.loads(tree).get('tree', []))
    editor = model = False
    while nodes:
        node = nodes.pop()
        classes = node.get('class', '').split()
        text = node.get('text', '')
        if 'sf-t-error' in classes or 'gateway unavailable' in text:
            return False
        editor |= 'sf-editor' in classes
        model |= text == 'fake-model'
        nodes.extend(node.get('children', []))
    return editor and model


def isolated_env(inherited, fixtures=None):
    env = {key: value for key, value in inherited.items() if key not in {'DISPLAY', 'WAYLAND_DISPLAY', 'SWAYSOCK', 'HYPRLAND_INSTANCE_SIGNATURE'} and not key.startswith(('TERN_', 'HERMES_', 'GLIDE_'))}
    env.update(HOME=str(ROOT / 'home'), HERMES_HOME=str(HOME), TERN_CONFIG_DIR=str(ROOT / 'tern/config'), TERN_DAEMON_SOCKET=str(ROOT / 'tern/daemon.sock'), XDG_CONFIG_HOME=str(ROOT / 'home/.config'), XDG_DATA_HOME=str(ROOT / 'home/.local/share'), XDG_CACHE_HOME=str(ROOT / 'home/.cache'), XDG_STATE_HOME=str(ROOT / 'tern/state'), TERN_BUILD_URL='http://127.0.0.1:9')
    env.update(fixtures or {})
    return env


def main(sweep=None, fixture_env=None):
    OUT.mkdir(parents=True, exist_ok=False)
    (ROOT / 'latest-baseline.json').write_text(json.dumps({'out': str(OUT)}))
    receipt = {'status': 'blocked', 'source_revision': '653d6e98c669f9293c4d4d5f625714a398345dbe', 'threshold_kib': THRESHOLD, 'samples': [], 'captures': [], 'display_access': False}
    processes = []
    with open('/tmp/glide-studio-heavy.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            receipt['reason'] = 'Studio heavy lock is owned by another job.'
            (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
            return 75
        try:
            for attempt in range(46):
                available = memory()
                receipt['samples'].append({'time': time.time(), 'available_kib': available})
                print('MemAvailable_kib=' + str(available), flush=True)
                if available >= THRESHOLD:
                    break
                if attempt < 45:
                    time.sleep(60)
            else:
                receipt['reason'] = 'MemAvailable stayed below 4 GiB for 45 minutes.'
                return 75
            env = isolated_env(os.environ, fixture_env)
            env['PATH'] = str(TERN.parent) + os.pathsep + env['PATH']
            Path(env['HOME']).mkdir(exist_ok=True)
            theme_dir = Path(env['HOME']) / '.omp/agent/themes'
            theme_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(SOURCE / 'glide/themes/dash.json', theme_dir / 'dash.json')
            env['PI_CODING_AGENT_DIR'] = str(theme_dir.parent)
            with open(OUT / 'model.log', 'w') as log:
                model = subprocess.Popen(['python3', str(SOURCE / 'lab/fake_model.py'), '--home', str(HOME), '--port', '18748'], env=env, stdout=log, stderr=log)
                processes.append(model)
            for _ in range(80):
                if (HOME / 'config.yaml').exists():
                    break
                if model.poll() is not None:
                    raise RuntimeError('Synthetic model failed; see model.log.')
                time.sleep(.1)
            settings = HOME / 'glide/settings.json'
            settings.parent.mkdir(exist_ok=True)
            settings.write_text(json.dumps({'theme': 'dash'}))
            core = ROOT / 'hermes-stock'
            env.update(PYTHONPATH=str(core), HERMES_PYTHON_SRC_ROOT=str(core), HERMES_NODE='/usr/bin/node')
            hermes = ['/home/kvn/.hermes/hermes-agent/venv/bin/python', '-m', 'hermes_cli.main']
            with open(OUT / 'gateway.log', 'w') as log:
                gateway = subprocess.Popen([*hermes, 'gateway', 'run'], env=env, cwd=core, stdout=log, stderr=log)
                processes.append(gateway)
            control = str(ROOT / ('tern/ctl-' + str(time.time_ns()) + '.sock'))
            Path(control).parent.mkdir(exist_ok=True)
            with open(OUT / 'tern.log', 'w') as log:
                tern = subprocess.Popen([str(TERN), 'serve', '--out', str(OUT), '--control', control, '--dir', str(SOURCE)], env=env, cwd=ROOT, stdout=log, stderr=log)
                processes.append(tern)
            def ctl(*args):
                result = subprocess.run([str(TERN), 'ctl', '--control', control, *args], env=env, capture_output=True, text=True, timeout=25)
                with open(OUT / 'commands.jsonl', 'a') as log:
                    log.write(json.dumps({'args': args, 'exit': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}) + '\n')
                result.check_returncode()
                payload = json.loads(result.stdout)
                if payload.get('ok') is False:
                    raise RuntimeError(f'Private Tern control rejected {args}: {payload}')
                return result.stdout
            for _ in range(80):
                if Path(control).is_socket():
                    break
                if tern.poll() is not None:
                    raise RuntimeError('Private Tern failed; see tern.log.')
                time.sleep(.1)
            ctl('account', 'signed-in', 'atlas')
            ctl('resize', '1060', '596')
            ctl('appearance', 'dark')
            command_env = ' '.join(key + '=' + __import__('shlex').quote(env[key]) for key in ('PATH', 'HOME', 'HERMES_HOME', 'TERN_CONFIG_DIR', 'TERN_DAEMON_SOCKET', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'PYTHONPATH', 'HERMES_PYTHON_SRC_ROOT', 'HERMES_NODE', 'PI_CODING_AGENT_DIR', *[key for key in env if key.startswith('GLIDE_')]))
            ctl('run', json.dumps('env ' + command_env + ' ' + __import__('shlex').join(hermes) + ' tern --new --provider custom --model fake-model 2>' + str(OUT / 'app.log')))
            # A cold disposable stock runtime can take several minutes to prepare.
            deadline = time.monotonic() + 1200
            while time.monotonic() < deadline:
                tree = ctl('tree')
                if is_ready(tree):
                    break
                if tern.poll() is not None:
                    raise RuntimeError('Private Tern exited before the composer mounted.')
                if gateway.poll() is not None:
                    raise RuntimeError('Private stock gateway exited; inspect gateway.log.')
                time.sleep(.5)
            else:
                (OUT / 'startup.tree.json').write_text(tree)
                raise RuntimeError('Glide did not reach its composer. Inspect startup.tree.json and logs.')
            ctl('theme', 'dark', 'dash')
            ctl('wait', '500')
            (OUT / 'appearance-state.json').write_text(ctl('state'))
            ctl('shot', 'welcome')
            receipt['captures'].append('welcome')
            if sweep:
                sweep(ctl, receipt, OUT)
            receipt['status'] = 'baseline-started'
            receipt['reason'] = 'Offscreen real Tern baseline only. No candidate, judge, or acceptance is claimed.'
            ctl('quit')
        except Exception as error:
            receipt['reason'] = str(error)
            print(receipt['reason'], flush=True)
            return 1
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
            receipt['memory_after_kib'] = memory()
            (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
