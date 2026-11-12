#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bun run test src/__tests__/euiCards.test.ts src/__tests__/fleetActions.test.ts src/__tests__/fleetCommand.test.ts src/__tests__/fleetSandbox.test.ts
node scripts/adapt-eui-kit.mjs --check
