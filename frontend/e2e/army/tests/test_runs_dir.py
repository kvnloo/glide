from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'boat'))
import diagnose
import sweeps_up
import up


class RunsDirContracts(unittest.TestCase):
    def test_evidence_lives_outside_the_worktree(self):
        # `git worktree remove` deletes ignored files, so in-tree runs/ evidence is lost on cleanup.
        repo = up.ROOT.resolve().parents[2]
        self.assertFalse(up.RUNS.resolve().is_relative_to(repo))
        self.assertIs(sweeps_up.RUNS, up.RUNS)
        self.assertIs(diagnose.RUNS, up.RUNS)


if __name__ == '__main__':
    unittest.main()
