import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from audit_run import audit
from findings import collect
from sanity import sample
import random


class ReceiptAuditContracts(unittest.TestCase):
    def fixture(self, root, substitute=False, bad_exit=False):
        ids = ['kit-sweep-' + s for s in ('clicks', 'themes', 'console')]
        ids += ['tern-' + target + '-sweep-' + s for target in ('main', 'pr269') for s in ('clicks', 'themes', 'console', 'build')]
        if substitute:
            ids[0] = 'kit-other'
        sandboxes = []
        for index, name in enumerate(ids):
            folder = root / name / 'runs'
            (folder / name).mkdir(parents=True)
            shot = 'runs/' + name + '/shot.png'
            (root / name / shot).write_bytes(b'\x89PNG\r\n\x1a\n')
            report = {'status': 'passed', 'controls': [], 'coverage': [], 'findings': [],
                      'checks': [{'pass': True, 'evidence': shot}], 'screenshots': [shot],
                      'detector_regressions': {'controls': 'passed'},
                      'canary': {'expected': [], 'reported': [], 'missed': [], 'recall': None}}
            kinds = ('fleet-hosts', 'fleet-portfolio', 'fleet-factory')
            if name in ('kit-sweep-themes', 'kit-sweep-console'):
                report['coverage'] += [{'phase':'clean', 'surface':'fleet', 'theme':'theme-' + str(t), 'width':w, 'kind':k}
                                       for t in range(9) for w in (390,768,1440) for k in kinds]
            if name in ('kit-sweep-clicks', 'kit-sweep-console'):
                report['coverage'] += [{'phase':'clean', 'surface':'gallery', 'kind':'kind-' + str(i)} for i in range(55)]
                report['controls'] = [{'phase':'clean', 'surface':'fleet', 'width':w, 'kind':k} for w in (390,768,1440) for k in kinds]
            (folder / name / 'report.json').write_text(json.dumps(report))
            (folder / 'detector-regressions.log').write_text('PASS: style fixtures\nPASS: same-URL seeded-to-clean document isolation and exactly one intent per click')
            lane = {'id': name, 'sha': 'a' * 40, 'status': 'done', 'deterministic': True,
                    'exit': 1 if bad_exit and index == 0 else 0}
            (folder / 'lane.json').write_text(json.dumps(lane))
            sid = 'sandbox-' + str(index)
            sandboxes.append({'id': sid, 'deleted': True, 'created_at': index * 10, 'deleted_at': index * 10 + 2})
            (root / (sid + '-usage.json')).write_text(json.dumps({'seconds': 2}))
        metadata = {'sandboxes': sandboxes, 'deletion_verified': True, 'revisions': {'main': 'a' * 40, 'pr269': 'b' * 40},
                    'kit_sha': 'c' * 40, 'account_vm_minutes_delta': 3}
        (root / 'run.json').write_text(json.dumps(metadata))
        (root / 'sanity-manifest.json').write_text(json.dumps(sample(collect(root), random.Random(1))))

    def test_receipts_do_not_certify_nonzero_lanes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root, bad_exit=True)
            result = audit(root)
            self.assertFalse(result['app_qualification_passed'])

    def test_substituting_a_required_lane_fails_the_audit(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root, substitute=True)
            self.assertFalse(audit(root)['receipt_audit_passed'])

    def test_seed_to_clean_isolation_receipt_is_required(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root)
            (root / 'kit-sweep-clicks/runs/detector-regressions.log').write_text('PASS: style fixtures')
            result = audit(root)
            self.assertFalse(result['receipt_audit_passed'])
            self.assertIn('Seed-to-clean isolation not proved: kit-sweep-clicks', result['errors'])

    def test_missing_matrix_case_is_not_complete_coverage(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root)
            path = root / 'kit-sweep-themes/runs/kit-sweep-themes/report.json'
            report = json.loads(path.read_text())
            report['coverage'].pop()
            path.write_text(json.dumps(report))
            self.assertFalse(audit(root)['receipt_audit_passed'])

    def test_usage_concurrency_and_sampler_are_recomputed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.fixture(root)
            result = audit(root)
            self.assertTrue(result['receipt_audit_passed'], result['errors'])
            self.assertEqual(result['peak_concurrency'], 1)
            self.assertAlmostEqual(result['vm_minutes_before_delete'], 22 / 60)
            self.assertEqual(result['sanity']['sample'], 2)
            shot = next(root.rglob('shot.png'))
            shot.unlink()
            self.assertFalse(audit(root)['receipt_audit_passed'])


if __name__ == '__main__':
    unittest.main()
