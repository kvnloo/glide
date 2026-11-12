#!/usr/bin/env python3
"""Bounded, secret-free Boat diagnostics with output collection before cleanup."""
import argparse
import json
from pathlib import Path
import time
from up import Army, ROOT, boat, guard_budget, run


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('probe', choices=['web-help', 'gpu'])
    args = parser.parse_args()
    out = ROOT / 'runs/boat' / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + args.probe)
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
