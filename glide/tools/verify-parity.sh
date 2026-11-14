#!/usr/bin/env bash
# Run through fleet-build after installing the pinned frontend dependencies.
# Synthetic component/app tests only. This does not certify a native Tern window.
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo/frontend"
tests=(
    a11y agentTiles askPreview codeReview contextMeter rewind
    dictation dictationKeys historySearch sessionInfo sessionTree
    euiApp euiCards euiHostApp euiHostCards euiKitHost euiOffline
    intentCards
)
files=()
for name in "${tests[@]}"; do
    files+=("src/__tests__/$name.test.ts")
done
exec bun run test "${files[@]}" "$@"
