#!/usr/bin/env python3
"""Rebuild this blocked checkpoint from actual receipts and offline test results."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
repo = root.parent
previous = json.loads((root / 'STATE.json').read_text())
captured = json.loads((root / 'native/verified-startup/receipt.json').read_text())
failed = json.loads((root / 'native/isolated-theme-rejected/receipt.json').read_text())
commands = [json.loads(line) for line in (root / 'native/isolated-theme-rejected/commands.jsonl').read_text().splitlines()]
error = json.loads(next(row['stdout'] for row in reversed(commands) if row['exit'] != 0))['error']
assert captured['captures'] == ['welcome'] and failed['captures'] == []
assert captured['source_revision'] == failed['source_revision']
assert failed['threshold_kib'] == 4194304 and failed['samples'][0]['available_kib'] >= 4194304
assert error == 'no theme called "dash"'
assert not subprocess.check_output(['git', 'diff', '--name-only', captured['source_revision'], '--', '.', ':(exclude).dream-loop'], cwd=repo, text=True).strip(), 'Production source changed'
for reference in previous['target']['references']:
    assert hashlib.sha256(Path(reference['path']).read_bytes()).hexdigest() == reference['sha256']
test_command = ['python3', '.dream-loop/test_native_baseline.py']
tests = subprocess.run(test_command, cwd=repo, capture_output=True, text=True)
(root / 'readiness-green.log').write_text(tests.stdout + tests.stderr)
assert tests.returncode == 0 and 'Ran 7 tests' in tests.stderr
syntax_command = ['python3', '-m', 'py_compile', *[str(p.relative_to(repo)) for p in sorted(root.glob('*.py'))]]
subprocess.run(syntax_command, cwd=repo, check=True)
board = json.loads((root / 'board-publication.json').read_text())
assert len(board['checks']) == 4 and all(row['status'] == 200 for row in board['checks'])
state = {
    'status': 'blocked-before-qualified-baseline',
    'updated_utc': datetime.now(timezone.utc).isoformat(),
    'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=repo, text=True).strip(),
    'source_revision': captured['source_revision'], 'worktree': str(repo), 'target': previous['target'],
    'baseline': {'native_captured_surfaces': 1, 'qualified_surfaces': 0, 'receipt': 'native/verified-startup/receipt.json', 'native_png': 'native/verified-startup/serve/welcome.png', 'preview': 'native/verified-startup/serve/welcome-preview.png', 'native_size': [2120, 1192], 'logical_size': [1060, 596], 'dpr': 2, 'theme_qualified': False, 'populated_sweep_executed': False},
    'blockers': {
        'dash_theme': {'error': error, 'exit': 1, 'receipt': 'native/isolated-theme-rejected/receipt.json', 'available_kib': failed['samples'][0]['available_kib'], 'threshold_kib': failed['threshold_kib'], 'tested_binaries': {'mbp_installed_sha256': 'c6cc3765acade43c12ca90a7f97c78f47d242231bb035f89ec6de689fc96e759', 'groot_private_copy_sha256': '0db148a2b640e6241b336b4729de2e79ef0c342209a310f1c88dc9ba51971053'}},
        'free_vision': {'status': 'no usable configured credential', 'resolver': 'hermes_cli.config.get_env_value', 'providers_checked': ['OPENROUTER_API_KEY', 'NVIDIA_API_KEY', 'GROQ_API_KEY'], 'probe_exit': 1, 'probe_log': 'free-vision-g0.log', 'model_requests': 0, 'paid_tools_used': False}
    },
    'legacy': {'receipt': 'mbp-baseline-receipt.json', 'meaning': 'Superseded first attempt at the obsolete 6 GiB gate'},
    'rejected_evidence': ['baseline/: shell screen, not rendered Glide', 'mbp-baseline-retry-receipt.json: false-positive shell readiness'],
    'verification': {'offline_tests': {'command': ' '.join(test_command), 'exit': tests.returncode, 'passed': 7}, 'syntax': {'command': ' '.join(syntax_command), 'exit': 0}, 'product_vitest': 'not run', 'typecheck': 'not run', 'lint': 'not run', 'token_drift': 'not run', 'native_rubric': 'not run', 'full_suite_ci': 'not run', 'motion_clip': None, 'owner_acceptance': False},
    'rounds': 0, 'accepted': 0, 'production_edits': False,
    'rubric_before': {}, 'rubric_after': {},
    'sheet': str(root / 'baseline-diagnostic-sheet.png'), 'sheet_kind': 'Non-native diagnostic; not a qualified before/after comparison',
    'board_url': board['url'], 'board_kind': board['kind'], 'pr': previous.get('pr'),
    'resume': 'Repair isolated Dash discovery and supply a usable free vision credential to the judge process. Validate the unexecuted sweep prototype before counting populated baselines. Then begin production UI rounds; keep only independently judged wins.'
}
(root / 'STATE.json').write_text(json.dumps(state, indent=2) + '\n')
print(json.dumps({'status': state['status'], 'offline_tests': 7, 'accepted': 0}))
