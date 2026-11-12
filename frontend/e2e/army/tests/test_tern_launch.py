import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'boat'))
from tern import launch_script


class TernLaunchContracts(unittest.TestCase):
    def test_web_pty_profile_reset_cannot_escape_owned_environment(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dotenv = root / 'lane.env'
            dotenv.write_text('NVIDIA_API_KEY=\n')
            owned = {'HOME': str(root / 'synthetic home'), 'HERMES_HOME': str(root / 'hermes'), 'PATH': os.defpath}
            query = "import json,os; print(json.dumps({k:os.getenv(k) for k in ['HOME','HERMES_HOME','TERN_PANE_ID','NVIDIA_API_KEY']}))"
            script = root / 'launch.sh'
            script.write_text(launch_script(owned, dotenv, [sys.executable, '-c', query]))
            result = subprocess.run(['/bin/sh', str(script)], env={'HERMES_HOME':'wrong-profile',
                'HOME':'wrong-home', 'TERN_PANE_ID':'owned-test-pane', 'NVIDIA_API_KEY':'unset-me'},
                capture_output=True, text=True, check=True)
            self.assertEqual(json.loads(result.stdout), {**{k:owned[k] for k in ('HOME','HERMES_HOME')},
                'TERN_PANE_ID':'owned-test-pane', 'NVIDIA_API_KEY':''})


if __name__ == '__main__':
    unittest.main()
