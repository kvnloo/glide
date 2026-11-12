#!/usr/bin/env bash
# Stage dependencies explicitly: fleet excludes .hermes-src and external dependency symlinks.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
: "${HERMES_SRC:?Set HERMES_SRC to the matching Hermes checkout}"
stage=$(mktemp -d /tmp/glide-fleet-verify.XXXXXX)
trap 'rm -rf "$stage"' EXIT
rsync -a --exclude=node_modules --exclude=.git --exclude=dist --exclude=.hermes-src "$root/" "$stage/"
mkdir -p "$stage/fleet-hermes-fixture"
pin=$(cat "$root/frontend/hermes-src.lock")
paths=(apps/shared agent gateway tools hermes_cli hermes_agent hermes_platform cron plugins providers tui_gateway locales pm acp_adapter pyproject.toml uv.lock)
while IFS= read -r file; do
  if [[ $file == *.py ]]; then paths+=("$file"); fi
done < <(git -C "$HERMES_SRC" ls-tree --name-only "$pin")
git -C "$HERMES_SRC" archive "$pin" "${paths[@]}" | tar -x -C "$stage/fleet-hermes-fixture"
# Preserve the original commit identity for fixtures that verify the source pin.
# This copies an existing object; it creates no commit or ref in the shared checkout.
git init --quiet --bare "$stage/fleet-hermes-git"
copied=$(git -C "$HERMES_SRC" cat-file commit "$pin" | git --git-dir="$stage/fleet-hermes-git" hash-object -t commit -w --stdin)
test "$copied" = "$pin"
printf '%s\n' "$pin" > "$stage/fleet-hermes-git/HEAD"
if [[ -n ${FLEET_KIT_SRC:-} ]]; then
  mkdir -p "$stage/fleet-kit-fixture"
  cp -a "$FLEET_KIT_SRC/src" "$stage/fleet-kit-fixture/"
fi
# Optional artifacts are produced by the supplied command under frontend/fleet-results/.
fetch=()
if [[ -n ${FLEET_OUT:-} ]]; then
  mkdir -p "$FLEET_OUT"
  fetch=(--out "$(cd "$FLEET_OUT" && pwd)" --fetch src/frontend/fleet-results)
fi
fleet-build --src "$stage" --node mbp --wait 1800 "${fetch[@]}" -- bash -lc '
  set -euo pipefail
  mv fleet-hermes-fixture frontend/.hermes-src
  mv fleet-hermes-git frontend/.hermes-src/.git
  mkdir -p frontend/.hermes-src/.git/refs
  test "$(git -C frontend/.hermes-src rev-parse HEAD)" = "$(cat frontend/hermes-src.lock)"
  cd frontend
  bun install --frozen-lockfile
  if test -d ../fleet-kit-fixture; then
    export FLEET_KIT_SRC="$PWD/../fleet-kit-fixture/src"
    export FLEET_KIT_DIR="$PWD/../fleet-built-fixture"
    node scripts/fleet-kit-fixture.mjs "$FLEET_KIT_SRC" "$FLEET_KIT_DIR"
  fi
  exec "$@"
' fleet-verify "$@"
