#!/usr/bin/env bash
# Focused red/green proof only. Does not certify native Tern rendering.
set -u
ROOT=$PWD
OUT=$ROOT/ayo-red-green
mkdir -p "$OUT" "$ROOT/.ayo-hermes-src"
exec > >(tee "$OUT/runner.log") 2>&1
tar -xf ayo-hermes-src.tar -C "$ROOT/.ayo-hermes-src" || exit $?
export HERMES_SRC=$ROOT/.ayo-hermes-src
export DISPLAY= WAYLAND_DISPLAY=
cd frontend || exit $?
node scripts/hermes-src.mjs || exit $?
bun install --frozen-lockfile > "$OUT/install.log" 2>&1 || { cat "$OUT/install.log"; exit 1; }
cp src/eui/cards.ts "$OUT/cards.candidate.ts"
cp src/view/euiCard.tsx "$OUT/euiCard.candidate.tsx"
restore() {
  cp "$OUT/cards.candidate.ts" src/eui/cards.ts
  cp "$OUT/euiCard.candidate.tsx" src/view/euiCard.tsx
}
trap restore EXIT
tar -xf "$ROOT/ayo-baseline.tar" -C "$ROOT" || exit $?
bun run test -- src/__tests__/euiCards.test.ts --maxWorkers=2 > "$OUT/red.log" 2>&1
red=$?
printf 'red\t%s\n' "$red" > "$OUT/status.tsv"
tail -n 35 "$OUT/red.log"
restore
bun run test -- src/__tests__/euiCards.test.ts --maxWorkers=2 > "$OUT/green.log" 2>&1
green=$?
printf 'green\t%s\n' "$green" >> "$OUT/status.tsv"
tail -n 20 "$OUT/green.log"
sha256sum src/eui/cards.ts src/view/euiCard.tsx src/__tests__/euiCards.test.ts > "$OUT/candidate.sha256"
# Require exactly the two added regressions to fail on the original source.
node --input-type=module - "$OUT/red.log" <<'JS'
import { readFileSync } from 'node:fs';
const text = readFileSync(process.argv[2], 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
const wanted = ['lets the intent-declare sentence shrink inside its flex row', 'draws intent-declare sentence rows as wrapping divs, not one-line buttons'];
if (!/2 failed.*15 passed/.test(text) || !wanted.every(name => text.includes(name))) process.exit(1);
JS
assertion=$?
printf 'red-assertion\t%s\n' "$assertion" >> "$OUT/status.tsv"
[ "$red" -ne 0 ] && [ "$green" -eq 0 ] && [ "$assertion" -eq 0 ]
