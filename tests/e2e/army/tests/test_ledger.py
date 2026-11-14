import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ledger import reconcile


class LedgerContracts(unittest.TestCase):
    def fixture(self, parent, count):
        root = parent / '20260101T000000Z-sweeps'
        root.mkdir()
        boxes = [{'id':'box-' + str(i), 'created_at':1, 'deleted_at':10, 'deleted':True} for i in range(count)]
        (root / 'run.json').write_text(json.dumps({'sandboxes':boxes, 'error':'failed run still owns its sandboxes'}))
        for box in boxes:
            (root / (box['id'] + '-usage.json')).write_text(json.dumps({'seconds':60}))
        for phase in ('before','after'):
            (root / ('billing-' + phase + '.json')).write_text(json.dumps({'limits':{'keepGoing':{'enabled':False}}, 'walletStatus':{'balanceDollars':0}}))

    def test_failed_run_is_counted_and_live_sandbox_is_not_deleted(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            self.fixture(parent,2)
            result = reconcile(parent,'20260101',{'sandboxes':[]})
            self.assertTrue(result['receipt_audit_passed'])
            self.assertEqual(result['vm_minutes_before_delete'],2)
            self.assertEqual(result['peak_concurrency_all_attempts'],2)
            live = reconcile(parent,'20260101',{'sandboxes':[{'id':'box-0'}]})
            self.assertFalse(live['receipt_audit_passed'])
            self.assertFalse(live['all_deleted'])

    def test_ninth_concurrent_owner_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            self.fixture(parent,9)
            result = reconcile(parent,'20260101',{'sandboxes':[]})
            self.assertFalse(result['receipt_audit_passed'])
            self.assertEqual(result['peak_concurrency_all_attempts'],9)


if __name__ == '__main__':
    unittest.main()
