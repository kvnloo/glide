#!/usr/bin/env python3
"""Prepare an auditable premium re-judge sample. Never claim a re-judge ran."""
import argparse
import json
import math
from pathlib import Path
import random
import secrets
from findings import collect


def sample(lanes, rng):
    passes = [{'lane': lane['id'], 'path': shot} for lane in lanes if lane['verdict'] == 'pass'
              for shot in lane['screenshots']]
    return {'rejudge_status': 'pending', 'model': 'premium model, separately authorized',
            'pass_population': len(passes), 'sample_fraction': 0.10,
            'pass_screenshots': rng.sample(passes, math.ceil(len(passes) * .10)),
            'zero_finding_lanes': [lane for lane in lanes if not lane['findings']],
            'miss_rate': None, 'degraded_lanes': [],
            'instructions': 'Review every sampled PNG and every zero-finding lane, including its screenshots. Missing screenshots are a coverage gap. Record missed defects and mark affected lanes degraded.'}


def paired_diff(first, second):
    for key in ('sha', 'goal', 'target'):
        if first.get(key) != second.get(key):
            raise ValueError('paired lanes must have identical ' + key)
    if first['model'] == second['model']:
        raise ValueError('paired lane needs a second model id')
    left = {f['title'] for f in first['findings']}
    right = {f['title'] for f in second['findings']}
    return {'first': first['id'], 'second': second['id'], 'sha': first['sha'],
            'models': [first['model'], second['model']], 'both': sorted(left & right),
            'only_first': sorted(left - right), 'only_second': sorted(right - left),
            'method': 'title diff; premium reviewer must reconcile paraphrases'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root', type=Path)
    parser.add_argument('--seed', type=int)
    parser.add_argument('--pair', nargs=2)
    args = parser.parse_args()
    seed = args.seed if args.seed is not None else secrets.randbits(64)
    lanes = collect(args.root)
    manifest = sample(lanes, random.Random(seed))
    manifest['seed'] = seed
    pairs = [lane for lane in lanes if lane.get('paired_with')]
    ids = args.pair or ([pairs[0]['paired_with'], pairs[0]['id']] if pairs else None)
    if ids:
        by_id = {lane['id']: lane for lane in lanes}
        manifest['paired_diff'] = paired_diff(*(by_id[i] for i in ids))
    else:
        manifest['paired_diff'] = {'status': 'pending', 'command': 'PAIR_LANE=kit-hosts PAIR_MODEL=<second-model-id> bash boat/up.sh'}
    (args.root / 'sanity-manifest.json').write_text(json.dumps(manifest, indent=2))
    (args.root / 'SANITY.md').write_text('\n'.join([
        '# Sanity review', '', f'Random seed: {seed}.',
        f"PASS screenshots sampled: {len(manifest['pass_screenshots'])}/{manifest['pass_population']}.",
        f"Zero-finding lanes requiring review: {len(manifest['zero_finding_lanes'])}.",
        'Premium re-judge: PENDING. Miss rate: unknown. No PASS is certified.',
        'Review paths and paired findings diff are in sanity-manifest.json.',
        'Record the reviewer model, verdict per PNG, missed defects, and degraded lanes before trusting the run.',
        '', '## Paired diff', '```json', json.dumps(manifest['paired_diff'], indent=2), '```', ''
    ]))


if __name__ == '__main__':
    main()
