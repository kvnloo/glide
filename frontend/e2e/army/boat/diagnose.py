#!/usr/bin/env python3
"""Bounded, secret-free Boat diagnostics with output collection before cleanup."""
import argparse
import json
import shlex
from pathlib import Path
import time
from up import Army, ROOT, RUNS, boat, guard_budget, run


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('probe', choices=['web-help', 'gpu', 'plugins'])
    args = parser.parse_args()
    out = RUNS / 'boat' / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + args.probe)
    out.mkdir(parents=True)
    owner = Army(out)
    before = boat('billing')
    (out / 'billing-before.json').write_text(json.dumps(before, indent=2))
    guard_budget(before, 1)
    try:
        sid = owner.new('glide-' + args.probe, 'glide-army-5ae480ebbfeda4f5')
        try:
            if args.probe == 'gpu':
                run('boat', '--no-update', 'scp', str(ROOT / 'boat/gpu-probe.mjs'), sid + ':/home/user/army/boat/gpu-probe.mjs')
                command = 'mkdir -p runs; node boat/gpu-probe.mjs >runs/gpu-capabilities.json 2>&1; cat runs/gpu-capabilities.json'
            elif args.probe == 'plugins':
                env = ['env', '-i', 'HOME=/home/user/probe/home', 'HERMES_HOME=/home/user/probe/hermes',
                       'PYTHONPATH=/home/user/army-deps/hermes', 'HERMES_PYTHON_SRC_ROOT=/home/user/army-deps/hermes',
                       'PATH=/home/user/army-deps/hermes/.venv/bin:/home/user/army-deps/bin:/usr/bin:/bin',
                       'HERMES_ENABLE_PROJECT_PLUGINS=false']
                script = "import logging,sys; logging.basicConfig(level=logging.DEBUG); from hermes_cli.main import main; sys.argv=['hermes','tern','--help']; main()"
                command = '''mkdir -p runs /home/user/probe/home /home/user/probe/hermes/plugins
printf '%s' '{"plugins":{"enabled":["hermes-tern"]}}' >/home/user/probe/hermes/config.yaml
ln -s /home/user/glide /home/user/probe/hermes/plugins/hermes-tern
set +e
''' + shlex.join([*env, '/home/user/army-deps/hermes/.venv/bin/python', '-c', script]) + ' >runs/plugins.txt 2>&1; cat runs/plugins.txt; exit 0'
            else:
                command = '''mkdir -p runs; set +e
/home/user/army-deps/bin/tern web serve --help >runs/tern-web-help.txt 2>&1
code=$?
printf '%s\\n' "$code" >runs/probe-exit.txt
cat runs/tern-web-help.txt
exit 0'''
            output = owner.remote(sid, command, 180)
            (out / 'probe-output.txt').write_text(output)
            print(output)
        finally:
            owner.pull(sid, out / 'probe')
    finally:
        owner.cleanup()
        after = boat('billing')
        (out / 'billing-after.json').write_text(json.dumps(after, indent=2))
        current = boat('list')
        (out / 'boat-list-after.json').write_text(json.dumps(current, indent=2))
        alive = {s['id'] for s in current['sandboxes']}
        owner.meta.update(deletion_verified=all(s['id'] not in alive for s in owner.meta['sandboxes']),
                          account_vm_minutes_delta=(after['limits']['creditUsedSeconds'] - before['limits']['creditUsedSeconds']) / 60)
        owner.save()
        print(out)


if __name__ == '__main__':
    main()
