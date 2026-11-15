#!/usr/bin/env bash
# Runs only in the fleet snapshot of the ayo/EUI1 worktree.
set -u
ROOT=$PWD
OUT=$ROOT/ayo-verification
mkdir -p "$OUT" "$ROOT/.ayo-hermes-src"
exec > >(tee "$OUT/runner.log") 2>&1
printf 'node=%s\nbun=%s\n' "$(node --version)" "$(bun --version)"
tar -xf ayo-hermes-src.tar -C "$ROOT/.ayo-hermes-src" || exit $?
export HERMES_SRC=$ROOT/.ayo-hermes-src
export DISPLAY= WAYLAND_DISPLAY=
cd frontend || exit $?
node scripts/hermes-src.mjs || exit $?
bun install --frozen-lockfile > "$OUT/install.log" 2>&1
rc=$?
printf 'install\t%s\n' "$rc" > "$OUT/status.tsv"
if [ "$rc" -ne 0 ]; then cat "$OUT/install.log"; exit "$rc"; fi
failed=0
check() {
  local name=$1 rc
  shift
  printf '\n$'; printf ' %q' "$@"; printf '\n'
  "$@" > "$OUT/$name.log" 2>&1
  rc=$?
  printf '%s\t%s\n' "$name" "$rc" >> "$OUT/status.tsv"
  tail -n 20 "$OUT/$name.log"
  [ "$rc" -eq 0 ] || failed=1
}
check focused bun run test -- src/__tests__/euiCards.test.ts --maxWorkers=2
check typecheck bun run typecheck
check full-suite bun run test -- --maxWorkers=2
check bundle bun run bundle
sha256sum dist/entry.js > "$OUT/bundle.sha256"
exit "$failed"
