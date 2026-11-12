#!/usr/bin/env bash
# Fleet native gate: fleet/eui card tests plus a check that the vendored kit adaptation is current.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../frontend"
bun run test src/__tests__/euiCards.test.ts src/__tests__/fleetActions.test.ts src/__tests__/fleetCommand.test.ts src/__tests__/fleetSandbox.test.ts
node ../glide/tools/adapt-eui-kit.mjs --check
