#!/usr/bin/env python3
"""Final W8 native stills in the EXISTING isolated Groot studio only.

Uses the existing work-tree proof app: real App/SDK, synthetic gateway/events.
Never starts a GUI, gateway, compositor, or model. Requires built proof bundles.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import time

STUDIO = Path('/home/kvn/.hermes/profiles/clean/cache/scratch/studio')
CONTROL = STUDIO/'tern/ctl.sock'
ROOT = Path(__file__).resolve().parents[2]


def available():
    return int(next(x.split()[1] for x in Path('/proc/meminfo').read_text().splitlines() if x.startswith('MemAvailable:')))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('before'); p.add_argument('after'); p.add_argument('out')
    a = p.parse_args()
    out = Path(a.out).resolve(); out.mkdir(parents=True, exist_ok=False)
    receipt = {'native': True, 'synthetic': True, 'physical_display_access': False, 'captures': [], 'gaps': [], 'memory_samples': [], 'bundles': {k: hashlib.sha256(Path(v).read_bytes()).hexdigest() for k, v in [('before', a.before), ('after', a.after)]}}
    owned = False
    seq = 0

    def ctl(*args):
        r = subprocess.run(['tern', 'ctl', '--control', str(CONTROL), *args], capture_output=True, text=True)
        with (out/'commands.jsonl').open('a') as f:
            f.write(json.dumps({'args': args, 'exit': r.returncode, 'stdout': r.stdout, 'stderr': r.stderr})+'\n')
        if r.returncode:
            raise RuntimeError('ctl rejected '+str(args)+': '+r.stdout+r.stderr)
        data = json.loads(r.stdout)
        if data.get('ok') is False:
            raise RuntimeError('ctl rejected '+str(args)+': '+r.stdout)
        return data

    def gate():
        for attempt in range(46):
            mem = available(); receipt['memory_samples'].append({'at': time.time(), 'available_kib': mem})
            if mem >= 3*1024*1024:
                return
            if attempt < 45:
                print('Waiting for Groot 3 GiB gate:', mem, flush=True); time.sleep(60)
        raise RuntimeError('Groot stayed below the correction 3 GiB gate for 45 minutes')

    def wait(test, label):
        deadline = time.monotonic()+90
        while time.monotonic() < deadline:
            if test(): return
            time.sleep(.2)
        raise RuntimeError('Timed out: '+label)

    def shot(phase, name, needle=None):
        gate()
        if needle:
            wait(lambda: needle in json.dumps(ctl('tree')), name)
        ctl('wait', '1200')
        dest = out/(phase+'-'+name)
        (dest.with_suffix('.tree.json')).write_text(json.dumps(ctl('tree'), indent=2))
        (dest.with_suffix('.dump.json')).write_text(json.dumps(ctl('dump'), indent=2))
        shot_name = 'w8-'+str(os.getpid())+'-'+phase+'-'+name
        result = ctl('shot', shot_name)
        shots = list(Path('/tmp/demo/glide/target/shots/tern').rglob(shot_name+'.png'))
        if len(shots) != 1:
            raise RuntimeError('Expected one native shot artifact: '+str(result))
        for suffix in ['.png', '.layout.json']:
            shutil.copy2(shots[0].with_name(shot_name+suffix), dest.with_name(dest.name+suffix))
        receipt['captures'].append({'phase': phase, 'surface': name, 'result': result})
        (out/'receipt.json').write_text(json.dumps(receipt, indent=2))
        print('Native captured', phase, name, flush=True)

    with open('/tmp/glide-studio-heavy.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        original = ctl('state')
        previous = next(s['name'] for s in original['sessions'] if s['current'])
        try:
            gate()
            if original['font'] != 13 or original['theme_dark'] != 'dash':
                raise RuntimeError('Studio must already use font 13 and Dash')
            ctl('session', 'new', 'W8-native-'+str(os.getpid())); owned = True
            ctl('resize', '1060', '596'); ctl('appearance', 'dark')
            for phase, bundle in [('before', a.before), ('after', a.after)]:
                run = out/phase; run.mkdir()
                home = run/'home'; home.mkdir()
                env = {'HOME':str(home), 'HERMES_HOME':str(home/'.hermes'), 'XDG_CONFIG_HOME':str(home/'.config'), 'XDG_DATA_HOME':str(home/'.local/share'), 'XDG_CACHE_HOME':str(home/'.cache'), 'XDG_STATE_HOME':str(home/'.local/state'), 'WORK_TREE_PROOF':str(run), 'GLIDE_AUTO_THEME':'0', 'PI_CODING_AGENT_DIR':str(home/'.omp/agent')}
                command = 'exec /usr/bin/env -u DISPLAY -u WAYLAND_DISPLAY -u TMUX -u STY -u ZELLIJ '+shlex.join([k+'='+v for k,v in env.items()])+ ' /usr/bin/node '+shlex.quote(str(Path(bundle).resolve()))+' 2>'+shlex.quote(str(run/'app.stderr.log'))
                ctl('run', json.dumps(command))
                def state():
                    try: return json.loads((run/'state.json').read_text())
                    except (FileNotFoundError, json.JSONDecodeError): return {}
                wait(lambda: state().get('ready'), phase+' proof app attached')
                wait(lambda: 'sf-editor' in json.dumps(ctl('tree')), 'real composer rendered')
                shot(phase, 'welcome', 'Hermes')
                def action(name):
                    nonlocal seq
                    seq += 1
                    (run/'input.json').write_text(json.dumps({'sequence':seq, 'action':name}))
                    wait(lambda: state().get('sequence')==seq or name=='quit' and (run/'exit.json').exists(), name)
                action('start'); action('edit')
                shot(phase, 'work-tree', 'search.ts')
                ctl('click', "[data-role='glide.tabs'] .sf-tab:nth-child(2)")
                shot(phase, 'work-tasks', 'Verify keyboard flow')
                action('done')
                shot(phase, 'work-receipt', 'Show work tree')
                ctl('click', "button[aria-label='Show work tree']")
                wait(lambda: 'Verify keyboard flow' in json.dumps(ctl('tree')), 'receipt expand through native button')
                for name, command, needle in [('council-brief','/council','Socratic council'),('theme-picker','/theme','Dash'),('settings','/settings','Settings')]:
                    try:
                        ctl('type', json.dumps(command)); ctl('key', 'Enter')
                        shot(phase, name, needle)
                        if name == 'council-brief':
                            ctl('key', 'Enter'); ctl('wait', '3000'); shot(phase, 'council-seats', 'Astra')
                            ctl('wait', '30000'); shot(phase, 'council-report', 'Ship the plugin first')
                    except Exception as error:
                        receipt['gaps'].append({'phase':phase, 'surface':name, 'reason':str(error)})
                    finally:
                        ctl('key', 'Escape')
                action('quit')
                wait(lambda: (run/'exit.json').exists(), 'proof app shutdown')
            receipt['status'] = 'captured-with-gaps' if receipt['gaps'] else 'captured'
        except Exception as error:
            receipt.update(status='blocked', reason=str(error))
            raise
        finally:
            if owned:
                # This is only our named session, never another worker's tab.
                ctl('session', 'switch', 'W8-native-'+str(os.getpid()))
                ctl('session', 'close')
                ctl('session', 'switch', previous)
                ctl('resize', *map(str, map(int, original['viewport'])))
            (out/'receipt.json').write_text(json.dumps(receipt, indent=2))

if __name__ == '__main__': main()
