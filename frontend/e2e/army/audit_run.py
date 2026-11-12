#!/usr/bin/env python3
"""Audit W5 receipts, not app acceptance. Nonzero lane exits stay visible."""
import argparse
from collections import Counter
import json
import math
from pathlib import Path

from findings import collect


def audit(root):
    metadata = json.loads((root / 'run.json').read_text())
    lanes = collect(root)
    sanity = json.loads((root / 'sanity-manifest.json').read_text())
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    expected = {'kit-sweep-' + s for s in ('clicks', 'themes', 'console')}
    expected.update('tern-' + t + '-sweep-' + s for t in ('main', 'pr269') for s in ('clicks', 'themes', 'console', 'build'))
    require({lane['id'] for lane in lanes} == expected, 'Expected the exact eleven W5 lane IDs')
    require(len({lane['id'] for lane in lanes}) == len(lanes), 'Duplicate lane IDs')
    require(metadata.get('deletion_verified'), 'Deletion was not verified by boat list')
    events, sandboxes = [], []
    for sandbox in metadata['sandboxes']:
        require(sandbox['deleted'], 'Sandbox not deleted: ' + sandbox['id'])
        events.extend([(sandbox['created_at'], 1), (sandbox.get('deleted_at', float('inf')), -1)])
        usage = root / (sandbox['id'] + '-usage.json')
        require(usage.is_file(), 'Missing per-sandbox usage: ' + sandbox['id'])
        sandboxes.append({**sandbox, 'seconds_before_delete': json.loads(usage.read_text())['seconds'] if usage.is_file() else None})
    active = peak = 0
    for _, delta in sorted(events):
        active += delta
        peak = max(peak, active)
    require(peak <= 8, 'More than eight concurrent sandboxes')

    finding_classes, gap_classes = Counter(), Counter()
    recalls, coverage, exits = {}, {}, {}
    for lane in lanes:
        folder = root / lane['id'] / 'runs'
        report = json.loads((folder / lane['id'] / 'report.json').read_text())
        require(lane.get('status') == 'done', 'Incomplete lane: ' + lane['id'])
        if lane['id'] in ('kit-sweep-themes', 'kit-sweep-console'):
            matrix = [c for c in report['coverage'] if c.get('phase') == 'clean' and c.get('surface') == 'fleet']
            cases = {(c['theme'], c['width'], c['kind']) for c in matrix}
            require(len(matrix) == len(cases) == 81, 'Incomplete or duplicate fleet matrix: ' + lane['id'])
            themes = {c['theme'] for c in matrix}
            require(len(themes) == 9, 'Expected nine themes: ' + lane['id'])
            require(cases == {(t, w, k) for t in themes for w in (390, 768, 1440) for k in ('fleet-hosts', 'fleet-portfolio', 'fleet-factory')}, 'Wrong fleet widths or kinds: ' + lane['id'])
        if lane['id'] in ('kit-sweep-clicks', 'kit-sweep-console'):
            gallery = [c for c in report['coverage'] if c.get('surface') == 'gallery']
            require(len(gallery) == 55, 'Expected all 55 frozen gallery examples: ' + lane['id'])
            fleet = {(c['width'], c['kind']) for c in report['controls'] if c.get('phase') == 'clean' and c.get('surface') == 'fleet'}
            require(fleet == {(w, k) for w in (390, 768, 1440) for k in ('fleet-hosts', 'fleet-portfolio', 'fleet-factory')}, 'Incomplete fleet control matrix: ' + lane['id'])
        require(report.get('detector_regressions', {}).get('controls') == 'passed', 'Controller fixture did not pass: ' + lane['id'])
        require('PASS:' in (folder / 'detector-regressions.log').read_text(), 'Style fixtures did not pass: ' + lane['id'])
        require(not lane.get('pass_trusted'), 'Premium review must not be implicitly certified')
        finding_classes.update(f['classification'] for f in lane['findings'])
        gap_classes.update(g['classification'] for g in lane['gaps'])
        recalls[lane['id']] = lane['canary']
        require(not lane['canary']['missed'], 'Matching canary missed: ' + lane['id'])
        exits[lane['id']] = lane['exit']
        coverage[lane['id']] = {'verdict': lane['verdict'], 'controls': lane['controls'],
                               'cases': len(report['coverage']), 'screenshots': len(lane['screenshots'])}
        for shot in lane['screenshots']:
            path = Path(shot)
            require(path.is_file(), 'Missing screenshot: ' + shot)
            if path.is_file():
                with path.open('rb') as stream:
                    require(stream.read(8) == b'\x89PNG\r\n\x1a\n', 'Invalid PNG: ' + shot)

    population = sum(len(lane.get('pass_screenshots', [])) for lane in lanes)
    require(sanity['pass_population'] == population, 'Sampler population mismatch')
    require(len(sanity['pass_screenshots']) >= math.ceil(population * .1), 'Sampler below ten percent')
    require({l['id'] for l in sanity['zero_finding_lanes']} == {l['id'] for l in lanes if not l['findings']}, 'Sampler omitted a zero-finding lane')
    require(sanity['rejudge_status'] == 'pending', 'Unexpected premium-review claim')
    require(all(Path(s['path']).is_file() for s in sanity['pass_screenshots']), 'Sample PNG absent')
    return {'receipt_audit_passed': not errors, 'errors': errors,
            'app_qualification_passed': not errors and all(lane['verdict'] == 'pass' and lane.get('pass_trusted') for lane in lanes),
            'revisions': metadata['revisions'], 'kit_sha': metadata['kit_sha'],
            'findings_count_by_class': dict(finding_classes + gap_classes),
            'finding_records_by_class': dict(finding_classes), 'gaps_count_by_class': dict(gap_classes),
            'counting_note': 'Non-canary observations plus coverage-gap records, not deduplicated root causes.',
            'canary_recall_per_lane': recalls, 'calibration_surface': 'served kit copy, not proof of Tern target coverage',
            'coverage': coverage, 'lane_exits': exits, 'sandboxes': sandboxes, 'peak_concurrency': peak,
            'vm_minutes_before_delete': sum(s['seconds_before_delete'] or 0 for s in sandboxes) / 60,
            'vm_minutes_measurement': 'per-sandbox usage queried immediately before deletion; excludes deletion latency',
            'account_vm_minutes_delta': metadata['account_vm_minutes_delta'],
            'account_delta_caveat': 'includes unrelated account activity',
            'sanity': {'population': population, 'sample': len(sanity['pass_screenshots']),
                       'zero_finding_lanes': len(sanity['zero_finding_lanes']), 'rejudge_status': sanity['rejudge_status']}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    result = audit(args.root)
    (args.root / 'audit.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
    return int(not result['receipt_audit_passed'])


if __name__ == '__main__':
    raise SystemExit(main())
