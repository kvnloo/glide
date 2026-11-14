#!/usr/bin/env python3
"""Reconcile all owned W5 attempts, including failed probes, against a fresh Boat list."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / 'boat'))
from up import boat


def reconcile(parent, since, listing):
    sandboxes, errors, warnings, events = {}, [], [], []
    alive = {s['id'] for s in listing['sandboxes']}
    for path in sorted(parent.glob('*/run.json')):
        if path.parent.name < since:
            continue
        metadata = json.loads(path.read_text())
        for item in metadata.get('sandboxes', []):
            sid = item['id']
            if sid in sandboxes:
                errors.append('Duplicate ownership receipt: ' + sid)
                continue
            usage = path.parent / (sid + '-usage.json')
            seconds = json.loads(usage.read_text())['seconds'] if usage.is_file() else None
            confirmed = item['deleted'] and sid not in alive
            if not confirmed:
                errors.append('Deletion not confirmed: ' + sid)
            if seconds is None:
                errors.append('Usage receipt missing: ' + sid)
            sandboxes[sid] = {**item, 'run': str(path.parent.resolve()), 'seconds_before_delete': seconds,
                              'deletion_confirmed': confirmed}
            events.extend([(item['created_at'], 1), (item.get('deleted_at', float('inf')), -1)])
        for phase in ('before', 'after'):
            billing = path.parent / ('billing-' + phase + '.json')
            if not billing.is_file():
                warnings.append('Billing receipt absent: ' + str(billing))
                continue
            record = json.loads(billing.read_text())
            wallet, limits = record.get('walletStatus', {}), record['limits']
            if (limits['keepGoing']['enabled'] or wallet.get('autoTopUp', {}).get('enabled')
                    or wallet.get('balanceDollars', 0) != 0):
                errors.append('Plan-only invariant violated: ' + str(billing))
    active = peak = 0
    for _, change in sorted(events):
        active += change
        peak = max(peak, active)
    if peak > 8:
        errors.append('More than eight owned sandboxes overlapped')
    if not sandboxes:
        errors.append('No owned sandbox receipts found')
    return {'receipt_audit_passed': not errors, 'errors': errors, 'warnings': warnings,
            'sandboxes': list(sandboxes.values()), 'sandbox_count': len(sandboxes),
            'all_deleted': all(s['deletion_confirmed'] for s in sandboxes.values()),
            'peak_concurrency_all_attempts': peak,
            'vm_minutes_before_delete': sum(s['seconds_before_delete'] or 0 for s in sandboxes.values()) / 60,
            'measurement': 'Per-sandbox usage queried before deletion; excludes deletion latency. Account billing deltas must not be added across overlapping runs.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root', type=Path)
    parser.add_argument('--since', required=True, help='Inclusive UTC directory prefix')
    args = parser.parse_args()
    listing = boat('list')
    (args.root / 'W5-boat-list-final.json').write_text(json.dumps(listing, indent=2))
    result = reconcile(args.root, args.since, listing)
    output = args.root / 'W5-LEDGER.json'
    output.write_text(json.dumps(result, indent=2))
    print(json.dumps({k: v for k, v in result.items() if k != 'sandboxes'}, indent=2))
    print(output.resolve())
    return int(not result['receipt_audit_passed'])


if __name__ == '__main__':
    raise SystemExit(main())
