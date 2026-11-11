"""Owned Tern runtime. Never read the owner's profile or auth.json.
Never run `hermes update` (or `hermes profile use`, `hermes gateway restart`) from a test/film lane.
"""
import json
import os
from pathlib import Path
import shlex
import socket
import subprocess
import time
import urllib.request


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def start(spawn, sha):
    scratch = Path('/home/user/army-private')
    scratch.mkdir(mode=0o700, exist_ok=False)
    home, hh, tc, tmp = [scratch / name for name in ('home', 'hermes', 'tern', 'tmp')]
    for path in (home, hh, tc, tmp):
        path.mkdir(mode=0o700)
    core = Path('/home/user/army-deps/hermes')
    exe = str(core / '.venv/bin/hermes')
    # env -i semantics: no inherited sessions, host config, bot secrets, or auth file.
    env = {'HOME': str(home), 'HERMES_HOME': str(hh), 'TMPDIR': str(tmp),
           'PATH': f'{core}/.venv/bin:/home/user/army-deps/bin:/usr/local/bin:/usr/bin:/bin',
           'PYTHONPATH': str(core), 'HERMES_PYTHON_SRC_ROOT': str(core),
           'HERMES_TERN': '1', 'HERMES_TERN_HERMES': exe, 'TERM': 'xterm-256color',
           'TERN_CONFIG_DIR': str(tc), 'TERN_DAEMON_SOCKET': str(tc / 'daemon.sock'),
           'NVIDIA_API_KEY': os.environ['NVIDIA_API_KEY'],
           'HERMES_ENABLE_PROJECT_PLUGINS': 'false', 'PYTHONNOUSERSITE': '1'}
    config = {'model': {'provider': 'nvidia', 'default': 'google/gemma-4-31b-it',
                        'base_url': 'https://integrate.api.nvidia.com/v1'},
              'plugins': {'enabled': ['hermes-tern']},
              'platforms': {'api_server': {'enabled': False}},
              'agent': {'max_turns': 4, 'disabled_toolsets': ['delegation']},
              'delegation': {'model': 'google/gemma-4-31b-it', 'provider': 'nvidia',
                             'fallback_providers': [], 'orchestrator_enabled': False},
              'fallback_providers': [], 'toolsets': ['web'], 'secrets': {}}
    # delegate_task is absent from the web-only allowlist and delegation is disabled at the toolset boundary.
    # JSON is a YAML subset. This fresh config contains no private history or copied secrets.
    (hh / 'config.yaml').write_text(json.dumps(config))
    # Only a disposable dotenv is linked. No live profile file or auth.json is ever copied.
    dotenv = scratch / 'lane.env'
    dotenv.write_text('NVIDIA_API_KEY=' + os.environ['NVIDIA_API_KEY'] + '\n')
    dotenv.chmod(0o600)
    (hh / '.env').symlink_to(dotenv)
    plugins = hh / 'plugins'
    plugins.mkdir()
    (plugins / 'hermes-tern').symlink_to('/home/user/glide', target_is_directory=True)
    if Path('/home/user/glide/ARMY_SHA').read_text().strip() != sha:
        raise RuntimeError('plugin exact-SHA check failed')
    subprocess.run([exe, 'plugins', 'validate', '/home/user/glide'], env=env,
                   stdin=subprocess.DEVNULL, check=True, timeout=120,
                   stdout=open('runs/plugin-validate.log', 'w'), stderr=subprocess.STDOUT)
    # Allow only read/search/browser tools. Delegation cannot be discovered or invoked.
    command = [exe, 'tern', '--new', '--provider', 'nvidia', '-m', 'google/gemma-4-31b-it',
               '--toolsets', 'web', '--max-turns', '4']
    # Start a private gateway before the frontend, as Hermes >=0.23 requires attach.
    spawn([exe, 'gateway', 'run'], 'gateway', env)
    control = tc / 'control.sock'
    spawn(['tern', 'serve', '--control', str(control)], 'tern-serve', env)
    for _ in range(90):
        if control.exists():
            break
        time.sleep(1)
    else:
        raise RuntimeError('tern serve did not create the private --control socket')
    launch = scratch / 'launch.sh'
    launch.write_text('#!/bin/sh\nset -a\n. ' + shlex.quote(str(dotenv)) + '\nset +a\nexec ' + shlex.join(command) + '\n')
    launch.chmod(0o700)
    clean = ['env', '-i', *(key + '=' + value for key, value in env.items() if key != 'NVIDIA_API_KEY'), str(launch)]
    subprocess.run(['tern', 'ctl', '--control', str(control), 'run', json.dumps(shlex.join(clean))],
                   env=env, stdin=subprocess.DEVNULL, check=True, timeout=120,
                   stdout=open('runs/tern-run.log', 'w'), stderr=subprocess.STDOUT)
    port = free_port()
    spawn(['tern', 'web', 'serve', '--listen', f'127.0.0.1:{port}'], 'tern-web', env)
    url = f'http://127.0.0.1:{port}/'
    for _ in range(90):
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return url
        except (OSError, TimeoutError):
            time.sleep(1)
    raise RuntimeError('tern web serve did not answer HTTP on its private loopback port')
