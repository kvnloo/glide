"""Offline contracts. Run with python3 -m unittest discover -s tests -p 'test_*.py'."""
import importlib.util
import json
from pathlib import Path
import random
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from canary import prepare_site
from findings import collect, render
from sanity import sample, paired_diff


class ArmyContracts(unittest.TestCase):
    def test_canary_changes_only_copy_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as d:
            source, dest = Path(d) / 'source', Path(d) / 'served'
            source.mkdir()
            original = '<html><body><div id="stage"></div></body></html>'
            (source / 'fleet.html').write_text(original)
            manifest = prepare_site(source, dest, True)
            self.assertEqual((source / 'fleet.html').read_text(), original)
            self.assertEqual(len(manifest['defects']), 4)
            self.assertIn('army-canary.js', (dest / 'fleet.html').read_text())
            self.assertNotIn('defects', (dest / 'fleet.html').read_text())
            prepare_site(source, dest, True)
            self.assertEqual((dest / 'fleet.html').read_text().count('army-canary.js'), 1)
            with self.assertRaises(ValueError):
                prepare_site(source, source, True)

    def fixture(self, root, lane, findings=(), status='passed', exit_code=0):
        dest = root / lane / 'runs' / lane
        dest.mkdir(parents=True)
        (dest / 'report.json').write_text(json.dumps({'status': status, 'findings': findings}))
        (dest.parent / 'lane.json').write_text(json.dumps({
            'id': lane, 'status': 'done', 'exit': exit_code, 'sha': 'a' * 40,
            'goal': 'Click and scroll', 'model': 'free', 'canary': True,
        }))
        return dest

    def test_provider_failure_is_not_pass(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            dest = self.fixture(root, 'gap', status='aborted', exit_code=1)
            (dest.parent / 'gap.log').write_text('model provider failed STEP_TIMEOUT')
            lanes = collect(root)
            self.assertEqual(lanes[0]['verdict'], 'coverage-gap')
            self.assertIn('coverage-gap', render(lanes))

    def test_recall_matches_report_not_seed_manifest(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.fixture(root, 'seen', [{'severity': 'major', 'title': 'Needs you button does nothing',
                                        'actual': 'Click does not respond', 'evidence': ['shot.png']}])
            lane = collect(root)[0]
            self.assertEqual(lane['canary']['reported'], ['dead-button'])
            self.assertEqual(lane['canary']['recall'], 0.25)
            self.assertFalse(lane['pass_trusted'])

    def test_sanity_samples_at_least_ten_percent_and_every_zero_lane(self):
        lanes = [{'id': 'ok', 'verdict': 'pass', 'findings': [1],
                  'screenshots': [f'shot-{n}.png' for n in range(31)]},
                 {'id': 'zero', 'verdict': 'coverage-gap', 'findings': [], 'screenshots': []}]
        result = sample(lanes, random.Random(42))
        self.assertEqual(len(result['pass_screenshots']), 4)
        self.assertEqual(result['zero_finding_lanes'][0]['id'], 'zero')
        self.assertEqual(result['rejudge_status'], 'pending')

    def test_pair_requires_same_goal_and_sha(self):
        a = {'id': 'a', 'sha': 'a' * 40, 'goal': 'Click', 'model': 'free', 'findings': []}
        b = dict(a, id='b', sha='b' * 40, model='premium')
        with self.assertRaises(ValueError):
            paired_diff(a, b)
        b['sha'] = a['sha']
        b['findings'] = [{'title': 'Dead button'}]
        self.assertEqual(paired_diff(a, b)['only_second'], ['Dead button'])

    def test_budget_fails_closed(self):
        spec = importlib.util.spec_from_file_location('army_up', ROOT / 'boat/up.py')
        up = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(up)
        billing = {'limits': {'keepGoing': {'enabled': False}, 'nextStartDollars': 0,
                              'canStart': True, 'creditBalanceSeconds': 7200,
                              'starts': {key: {'remaining': 10} for key in ('day', 'hour', 'minute')}},
                   'walletStatus': {'balanceDollars': 0, 'autoTopUp': {'enabled': False}}}
        up.guard_budget(billing, 2)
        for key in ('enabled',):
            billing['limits']['keepGoing'][key] = True
            with self.assertRaises(RuntimeError):
                up.guard_budget(billing, 1)
            billing['limits']['keepGoing'][key] = False
        billing['walletStatus']['balanceDollars'] = 1
        with self.assertRaises(RuntimeError):
            up.guard_budget(billing, 1)
        billing['walletStatus']['balanceDollars'] = 0
        billing['limits']['starts']['minute']['remaining'] = 0
        with self.assertRaises(RuntimeError):
            up.guard_budget(billing, 1)

    def test_usage_failure_cannot_block_sandbox_deletion(self):
        spec = importlib.util.spec_from_file_location('army_up_cleanup', ROOT / 'boat/up.py')
        up = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(up)
        calls = []
        def fake_boat(*args):
            calls.append(args)
            if args[0] == 'usage':
                raise RuntimeError('usage temporarily unavailable')
            return {}
        up.boat = fake_boat
        with tempfile.TemporaryDirectory() as d:
            army = up.Army(Path(d))
            army.owned = ['owned-sandbox']
            army.meta['sandboxes'] = [{'id': 'owned-sandbox', 'deleted': False}]
            army.delete('owned-sandbox')
            self.assertIn(('delete', 'owned-sandbox', '--yes'), calls)
            self.assertTrue(army.meta['sandboxes'][0]['deleted'])
            self.assertEqual(army.owned, [])

    def test_probe_rejects_empty_plans(self):
        from probe import probe
        with tempfile.TemporaryDirectory() as d:
            script = Path(d) / 'canonical.py'
            # Exercise the canonical-script wrapper's real JSON parsing with a tiny local responder.
            import io
            import urllib.request
            original = urllib.request.urlopen
            replies = [
                {'choices': [{'message': {'tool_calls': [{'function': {'name': 'click', 'arguments': '{"label":"Agents"}'}}]}}]},
                {'choices': [{'message': {'content': ''}}]},
            ]
            script.write_text('import urllib.request, json\nfor _ in range(2):\n json.load(urllib.request.urlopen("test-response"))\n')
            try:
                urllib.request.urlopen = lambda *a, **k: io.BytesIO(json.dumps(replies.pop(0)).encode())
                with self.assertRaises(ValueError):
                    probe(script, Path(d) / 'real.jpg', 'free-model')
            finally:
                urllib.request.urlopen = original

    def test_checked_in_pair_reuses_goal_and_target(self):
        import os
        from unittest.mock import patch
        spec = importlib.util.spec_from_file_location('army_up_pair', ROOT / 'boat/up.py')
        up = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(up)
        with patch.dict(os.environ, {'ONLY': '^kit-hosts$', 'KIND': 'kit',
                                    'PAIR_CONFIG': str(ROOT / 'paired-lane.json')}, clear=True):
            first, second = up.goals()
        self.assertEqual(first['goal'], second['goal'])
        self.assertEqual(first['target'], second['target'])
        self.assertNotEqual(first['model'], second['model'])
        self.assertEqual(second['paired_with'], first['id'])

    def test_pair_rejects_same_model_and_different_target(self):
        a = {'id': 'a', 'sha': 'a' * 40, 'goal': 'Click', 'model': 'free', 'target': 'kit-phone', 'findings': []}
        with self.assertRaises(ValueError):
            paired_diff(a, dict(a, id='b'))
        with self.assertRaises(ValueError):
            paired_diff(a, dict(a, id='b', model='second', target='kit-desktop'))

    def test_no_private_or_paid_runtime_defaults(self):
        setup = (ROOT / 'boat' / 'tern.py').read_text()
        self.assertIn('env -i', setup)
        self.assertIn('--control', setup)
        self.assertIn('127.0.0.1', setup)
        self.assertIn('delegate_task', setup)
        self.assertIn('platforms', setup)
        self.assertNotIn('shutil.copy', setup)


if __name__ == '__main__':
    unittest.main()
