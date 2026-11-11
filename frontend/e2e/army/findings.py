#!/usr/bin/env python3
"""Aggregate e2e explore reports. Provider gaps are never application verdicts."""
import json
from pathlib import Path
import re
import sys
from canary import DEFECTS


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def recall(findings):
    reported, evidence = [], {}
    for defect in DEFECTS:
        hits = []
        for finding in findings:
            # Do not read the goal, seed manifest, or AI trace as a reported defect.
            text = json.dumps({k: v for k, v in finding.items() if k in
                ('title', 'actual', 'description', 'expected', 'repro_steps')}).lower()
            if defect['id'] == 'dead-button':
                match = ('needs you' in text or 'button' in text) and any(t in text for t in ('nothing', 'respond', 'dead', 'does not', "doesn't", 'no effect'))
            elif defect['id'] == 'black-light-surface':
                match = 'light' in text and any(t in text for t in ('black', 'dark background', 'dark surface'))
            elif defect['id'] == 'phone-clipped-label':
                match = any(t in text for t in ('clip', 'truncat')) and any(t in text for t in ('host', 'label', 'title'))
            else:
                match = any(t in text for t in ('count', 'stat', 'online', '99/6')) and any(t in text for t in ('wrong', 'incorrect', '99', 'mismatch', 'inaccurate'))
            if match:
                hits.append(finding.get('title', 'untitled'))
        if hits:
            reported.append(defect['id'])
            evidence[defect['id']] = hits
    return {'reported': reported, 'missed': [d['id'] for d in DEFECTS if d['id'] not in reported],
            'recall': len(reported) / len(DEFECTS), 'matches': evidence,
            'method': 'conservative text match; confirm against finding screenshots'}


def collect(root: Path):
    lanes = []
    for meta in sorted(root.rglob('lane.json')):
        if 'runs' not in meta.parts:
            continue
        lane = json.loads(meta.read_text())
        if 'sha' not in lane:
            continue
        folder = meta.parent / lane['id']
        reports = list(folder.rglob('report.json')) if folder.exists() else []
        found, states = [], []
        for report in reports:
            for item in walk(json.loads(report.read_text())):
                states.extend(str(item[k]).lower() for k in ('status', 'ended', 'outcome') if k in item)
                if 'severity' in item and 'title' in item:
                    if not any(f['title'] == item['title'] for f in found):
                        found.append(item)
        log = (meta.parent / (lane['id'] + '.log'))
        text = log.read_text(errors='replace') if log.exists() else ''
        gap = (lane.get('exit', 1) != 0 or not reports or any(s in ('aborted', 'failed', 'error', 'unsupported') for s in states)
               or bool(re.search(r'cut short|STEP_TIMEOUT|model provider failed|AUTOMATION_UNSUPPORTED|ended: aborted|PROVIDER_ERROR', text, re.I)))
        lane.update(findings=found, screenshots=[str(p.resolve()) for p in sorted(folder.rglob('*.png'))],
                    verdict='coverage-gap' if gap else 'findings' if found else 'pass')
        lane['canary'] = recall(found) if lane.get('canary') else None
        lane['pass_trusted'] = False  # Premium screenshot review is a separate, explicit gate.
        lanes.append(lane)
    return lanes


def cell(value):
    return str(value).replace('|', '\\|').replace('\n', ' ')


def render(lanes):
    out = ['# Findings', '', '| Lane | Verdict | Severity | Finding | Evidence |', '|---|---|---|---|---|']
    for lane in lanes:
        if not lane['findings']:
            out.append(f"| {cell(lane['id'])} | {lane['verdict']} | | No reported findings, not a certified PASS | |")
        for finding in lane['findings']:
            evidence = finding.get('evidence', finding.get('screenshot', 'inspect lane PNGs'))
            out.append('| ' + ' | '.join(map(cell, (lane['id'], lane['verdict'], finding['severity'], finding['title'], evidence))) + ' |')
        if lane['canary']:
            r = lane['canary']
            out.append(f"\n{lane['id']} seeded recall: {len(r['reported'])}/4. Reported: {', '.join(r['reported']) or 'none'}. Missed: {', '.join(r['missed']) or 'none'}.")
    out += ['', 'Coverage gaps are provider, setup, or automation failures, not app defects.',
            'PASS verdicts remain untrusted until SANITY.md is completed. Canary misses void PASS.',
            'A two-step smoke is infrastructure proof, not a completed goal or recall qualification.']
    return '\n'.join(out) + '\n'


def main(root):
    lanes = collect(root)
    (root / 'findings.json').write_text(json.dumps(lanes, indent=2))
    text = render(lanes)
    run = root / 'run.json'
    if run.exists():
        metadata = json.loads(run.read_text())
        if metadata.get('error'):
            text += '\nRun blocked before qualification. See run.json error and G0 receipts.\n'
    (root / 'FINDINGS.md').write_text(text)
    print(text)
    return lanes


if __name__ == '__main__':
    main(Path(sys.argv[1] if len(sys.argv) > 1 else 'runs'))
