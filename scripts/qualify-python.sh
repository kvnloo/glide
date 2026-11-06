#!/usr/bin/env bash
# Run through fleet-build. Never point this at a live Hermes installation.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/qualification-python"
mkdir -p "$out"
core=$(mktemp -d)
export HOME="$core/home"
mkdir -p "$HOME"
export HERMES_HOME="$core/profile"
export GIT_TERMINAL_PROMPT=0
export UV_NO_PROGRESS=1
export DO_NOT_TRACK=1
export OPENUI_TELEMETRY_DISABLED=1
unset PYTHONPATH HERMES_SRC HERMES_PROFILE
if ! command -v uv >/dev/null; then
    # Boat provides Python, not the host's toolchain. Keep bootstrap job-local.
    python3 -m pip install --target "$core/bootstrap" uv==0.11.7
    export PATH="$core/bootstrap/bin:$PATH"
    export PYTHONPATH="$core/bootstrap"
fi
# Read the existing CI pin rather than introduce another dependency version.
pin=$(python3 - "$root/.github/workflows/checks.yml" <<'PY'
import re
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
match = re.search(r'^      HERMES_TEST_CORE_SHA: ([0-9a-f]{40})$', text, re.M)
if match is None:
    raise SystemExit('missing exact HERMES_TEST_CORE_SHA in checks.yml')
print(match[1])
PY
)
# Snapshot workers may omit .git; do not mistake a declared pin for a checkout proof.
plugin=$(git -C "$root" rev-parse HEAD 2>/dev/null || printf 'unavailable-in-fleet-snapshot')
printf 'plugin_git_head=%s\ncore=%s\nhost=%s\n' "$plugin" "$pin" "$(hostname)" | tee "$out/source.txt"
git -c credential.helper= init -q "$core/source"
git -c credential.helper= -C "$core/source" fetch --depth=1 https://github.com/kvnloo/hermes-agent.git "$pin"
git -C "$core/source" checkout -q --detach FETCH_HEAD
python3 "$root/tests/test_ci_pin_contract.py" require --repo "$core/source" --sha "$pin"
uv sync --project "$core/source" --frozen --python 3.14
cd "$root"
# The native_fallback suite is excluded by the repo's pytest.ini, not silently skipped here.
set +e
uv run --project "$core/source" --frozen --no-sync --with pytest --with pytest-asyncio python -m pytest -q --junitxml="$out/pytest.xml" > "$out/pytest.log" 2>&1
suite=$?
cat "$out/pytest.log"
# Both HOME and HERMES_HOME are disposable. PM may sync only this temporary checkout.
uv run --project "$core/source" --frozen --no-sync python -m hermes_cli.main plugins validate "$root" --install-deps --json > "$out/validate.json" 2> "$out/validate.err"
validation=$?
cat "$out/validate.err"
cat "$out/validate.json"
set -e
printf 'pytest=%s\nvalidate=%s\n' "$suite" "$validation" | tee "$out/exit-codes.txt"
[ "$suite" -eq 0 ] && [ "$validation" -eq 0 ]
