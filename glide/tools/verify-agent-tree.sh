#!/usr/bin/env bash
# Run focused checks without competing with studio renders or full local suites.
set -euo pipefail
cd "$(dirname "$0")/../.."
exec 9>/tmp/glide-studio-heavy.lock
flock 9
while [ "$(awk '/MemAvailable/{print $2}' /proc/meminfo)" -lt 6291456 ]; do
  echo 'Waiting for MemAvailable > 6 GiB'
  sleep 30
done
cd frontend
bun run test src/__tests__/agentTree.test.ts src/__tests__/sheetModes.test.ts src/__tests__/agents.test.ts src/__tests__/agentTreeOverlay.test.ts src/__tests__/subagentTranscript.test.ts src/__tests__/subagentEvents.test.ts src/__tests__/glideWidgets.test.ts
bun run typecheck
bun run lint
bun run check:strict
bun run check:suppressions
bun run check:size
