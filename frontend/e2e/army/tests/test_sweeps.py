import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'boat')]
from findings import collect
from sweeps_up import plan


class SweepContracts(unittest.TestCase):
    def test_planner_has_all_targets_and_never_a_model(self):
        with patch.dict(os.environ, {'CANARY': '1'}, clear=True):
            lanes = plan([('main', 'a'*40), ('pr269', 'b'*40)])
        self.assertEqual(len(lanes), 11)
        self.assertEqual(sum(l['target'] == 'kit' for l in lanes), 3)
        self.assertTrue(all(l['model'] == 'none' and l['canary'] for l in lanes))
        self.assertEqual({l['sha'] for l in lanes if l['target'] == 'tern'}, {'a'*40, 'b'*40})

    def fixture(self, root, report, exit_code=0):
        folder = root / 'lane/runs/lane'
        folder.mkdir(parents=True)
        (folder / 'report.json').write_text(json.dumps(report))
        (folder.parent / 'lane.json').write_text(json.dumps({'id':'lane', 'sha':'a'*40,
            'status':'done', 'deterministic':True, 'exit':exit_code}))

    def test_seeded_findings_are_not_real_defects(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = os.path.realpath(temp)
            root = Path(temp)
            self.fixture(root, {'status':'passed', 'findings':[{'classification':'canary', 'title':'black light surface', 'evidence':['runs/lane/shot.png']}],
                'screenshots':['runs/lane/shot.png'], 'canary':{'expected':['seed'], 'reported':['seed'], 'missed':[], 'recall':1}})
            lane = collect(root)[0]
            self.assertEqual(lane['findings'], [])
            self.assertEqual(len(lane['seeded_findings']), 1)
            self.assertEqual(lane['screenshots'], [str(root / 'lane/runs/lane/shot.png')])

    def test_canary_miss_voids_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = os.path.realpath(temp)
            root = Path(temp)
            self.fixture(root, {'status':'canary-fail','canary':{'reported':[], 'missed':['dead-button']}})
            self.assertEqual(collect(root)[0]['verdict'], 'canary-fail')

    def test_failed_browser_never_becomes_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = os.path.realpath(temp)
            root = Path(temp)
            self.fixture(root, {'status':'failed'}, exit_code=1)
            self.assertEqual(collect(root)[0]['verdict'], 'coverage-gap')

    def test_tern_web_requires_the_announced_token_before_http_readiness(self):
        source = (ROOT / 'boat/tern.py').read_text()
        gate = source.index("if '?token=' not in url:")
        self.assertLess(gate, source.index('with urllib.request.urlopen(url, timeout=2)'))
        lane = (ROOT / 'boat/sweep_lane.py').read_text()
        self.assertIn('cwd=cwd or str(ROOT)', lane)
        self.assertIn("os.chdir(ROOT)\n        Path('sweep-config.json')", lane)

    def test_no_model_keys_in_sweep_lifecycle(self):
        source = (ROOT / 'boat/sweeps_up.py').read_text()
        self.assertNotIn('keyed=True', source)
        self.assertNotIn('NVIDIA_API_KEY', source)
        self.assertIn('finally:\n                            army.delete(sid)', source)
        self.assertIn('deletion_verified', source)


if __name__ == '__main__':
    unittest.main()
