#!/usr/bin/env bash
# Local, Linux fleet cohort. Usage: bash glide/tools/fleet-army.sh RECEIPT_DIR
# Prerequisites: the Python test env (pytest) and frontend frozen dependencies.
set -euo pipefail
: "${1:?usage: fleet-army.sh RECEIPT_DIR}"
dest=$(realpath -m -- "$1")
python=${PYTHON:-python3}
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
[[ $(uname -s) == Linux ]] || { echo 'Fleet source proof requires Linux procfs' >&2; exit 1; }
git diff --quiet HEAD -- || { echo 'Commit tracked changes before issuing HEAD-bound receipts' >&2; exit 1; }
sha=$(git rev-parse HEAD)
mkdir -p -- "$dest"
# Never leave a previous receipt looking like a pass after this invocation fails.
receipt="$dest/fleet-cohort-$sha.json"
rm -f -- "$receipt"
printf 'Fleet cohort SHA: %s\n' "$sha"
set -x
"$python" -m pytest -q glide/tests/test_fleet_readonly.py glide/tests/test_fleet.py
(cd frontend && bun run test src/__tests__/fleetCommand.test.ts src/__tests__/fleetActions.test.ts \
    src/__tests__/fleetSandbox.test.ts src/__tests__/factoryCommand.test.ts)
set +x
[[ $(git rev-parse HEAD) == "$sha" ]] && git diff --quiet HEAD -- || {
  echo 'Checkout changed during the fleet cohort' >&2
  exit 1
}
tmp=$(mktemp "$dest/.fleet-cohort.XXXXXXXX")
trap 'rm -f -- "$tmp"' EXIT
"$python" - "$sha" > "$tmp" <<'PY'
import json
import sys

json.dump([
    {"feature": f"fleet-{view}", "sha": sys.argv[1], "verdict": "pass",
     "mode": "local-source-workers-and-renderer-fixtures"}
    for view in ("hosts", "portfolio", "factory")
], sys.stdout, indent=2)
PY
mv -- "$tmp" "$receipt"
node frontend/scripts/features-gate.mjs --receipts "$dest"
