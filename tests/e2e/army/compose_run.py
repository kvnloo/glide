#!/usr/bin/env python3
"""Select replacement lane receipts without rewriting either source campaign."""
import argparse
import json
from pathlib import Path
import shutil


def compose(base, replacement, output):
    base, replacement, output = (p.resolve() for p in (base, replacement, output))
    roots = (base, replacement)
    records = [json.loads((root / 'run.json').read_text()) for root in roots]
    for key in ('revisions', 'kit_sha', 'canary'):
        if records[0][key] != records[1][key]:
            raise ValueError('Cannot combine different ' + key)
    if any(root == output or root in output.parents for root in roots):
        raise ValueError('Output must be outside both source campaigns')
    lanes = [{lane['id']: lane for lane in record['lanes']} for record in records]
    if not lanes[1] or not lanes[1].keys() <= lanes[0].keys():
        raise ValueError('Replacement IDs must be a nonempty subset of the base lanes')
    sandboxes = [item for record in records for item in record['sandboxes']]
    if len({s['id'] for s in sandboxes}) != len(sandboxes):
        raise ValueError('Source campaigns share sandbox ownership')
    sources = {name: replacement if name in lanes[1] else base for name in lanes[0]}
    metadata = {
        'composite': True, 'revisions': records[0]['revisions'], 'kit_sha': records[0]['kit_sha'],
        'canary': records[0]['canary'], 'sandboxes': sandboxes,
        'deletion_verified': all(record['deletion_verified'] for record in records),
        'lanes': [lanes[1].get(name, lane) for name, lane in lanes[0].items()],
        'lane_sources': {name: str(root) for name, root in sources.items()},
        'superseded_lanes': list(lanes[1]),
        'source_campaigns': [{'root': str(root), 'payloads': record.get('payloads', {}),
                              'account_vm_minutes_delta': record['account_vm_minutes_delta']}
                             for root, record in zip(roots, records)],
        'account_vm_minutes_delta': None,
        'accounting_note': 'All source sandboxes included, even superseded lanes. Account deltas are not added; this is not one fresh eleven-sandbox run.'}
    output.mkdir(parents=True, exist_ok=False)
    for name, root in sources.items():
        shutil.copytree(root / name, output / name)
    for root, record in zip(roots, records):
        for sandbox in record['sandboxes']:
            filename = sandbox['id'] + '-usage.json'
            shutil.copyfile(root / filename, output / filename)
    (output / 'run.json').write_text(json.dumps(metadata, indent=2))
    return metadata


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('base', type=Path)
    parser.add_argument('replacement', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    compose(args.base, args.replacement, args.output)
    print(args.output.resolve())


if __name__ == '__main__':
    main()
