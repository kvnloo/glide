import os
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from compose_run import compose


class CompositeContracts(unittest.TestCase):
    def source(self, root, names, prefix, sha='a'):
        root.mkdir()
        sandboxes = []
        for name in names:
            (root / name).mkdir()
            (root / name / 'receipt').write_text(prefix)
            sid = prefix + '-' + name
            sandboxes.append({'id': sid, 'deleted': True})
            (root / (sid + '-usage.json')).write_text('{"seconds": 10}')
        metadata = {'lanes': [{'id': name} for name in names], 'sandboxes': sandboxes,
                    'revisions': {'main': sha}, 'kit_sha': 'kit', 'canary': True,
                    'deletion_verified': True, 'account_vm_minutes_delta': 1}
        (root / 'run.json').write_text(json.dumps(metadata))

    def test_replacements_preserve_provenance_and_all_accounting(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = os.path.realpath(temp)
            base, new, output = (Path(temp) / name for name in ('base', 'new', 'final'))
            self.source(base, ['clicks', 'console'], 'old')
            self.source(new, ['clicks'], 'fixed')
            metadata = compose(base, new, output)
            self.assertEqual((output / 'clicks/receipt').read_text(), 'fixed')
            self.assertEqual((output / 'console/receipt').read_text(), 'old')
            self.assertEqual((base / 'clicks/receipt').read_text(), 'old')
            self.assertEqual(metadata['lane_sources']['clicks'], str(new))
            self.assertEqual(len(metadata['sandboxes']), 3)
            self.assertEqual(len(list(output.glob('*-usage.json'))), 3)
            self.assertIsNone(metadata['account_vm_minutes_delta'])
            self.assertEqual(metadata['superseded_lanes'], ['clicks'])

    def test_different_revisions_and_unknown_lane_are_rejected(self):
        for names, sha in [(['clicks'], 'b'), (['unknown'], 'a')]:
            with self.subTest(names=names, sha=sha), tempfile.TemporaryDirectory() as temp:
                base, new, output = (Path(temp) / name for name in ('base', 'new', 'final'))
                self.source(base, ['clicks'], 'old')
                self.source(new, names, 'fixed', sha)
                with self.assertRaises(ValueError):
                    compose(base, new, output)
                self.assertFalse(output.exists())

    def test_existing_output_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = os.path.realpath(temp)
            base, new, output = (Path(temp) / name for name in ('base', 'new', 'final'))
            self.source(base, ['clicks'], 'old')
            self.source(new, ['clicks'], 'fixed')
            output.mkdir()
            with self.assertRaises(FileExistsError):
                compose(base, new, output)


if __name__ == '__main__':
    unittest.main()
