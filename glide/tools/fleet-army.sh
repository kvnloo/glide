#!/usr/bin/env bash
# Local, Linux fleet cohort. Usage: bash glide/tools/fleet-army.sh RECEIPT_DIR
# Prerequisites: pytest, frontend frozen dependencies and the built source-kit fixture.
set -euo pipefail
: "${1:?usage: fleet-army.sh RECEIPT_DIR}"
dest=$(realpath -m -- "$1")
python=${PYTHON:-python3}
: "${FLEET_KIT_DIR:?Build the source kit with frontend/scripts/fleet-kit-fixture.mjs}"
export FLEET_KIT_DIR
FLEET_KIT_DIR=$(realpath -- "$FLEET_KIT_DIR")
[[ -s "$FLEET_KIT_DIR/fixtures.json" && -s "$FLEET_KIT_DIR/kit.js" ]] || {
  echo 'Fleet source-kit fixture is incomplete' >&2
  exit 1
}
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
