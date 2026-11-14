#!/usr/bin/env bash
# Fails when a revision's committed frontend/dist/entry.js is not what its source builds.
# The fork has Actions off, so bundle.yml never rebuilds dist on main; this is the local gate.
#
#   scripts/dist-fresh.sh [REV]           check REV (default HEAD) in a throwaway worktree
#   scripts/dist-fresh.sh --commit        rebuild in this checkout and commit dist if it changed
#
# Builds against the Hermes checkout pinned by frontend/hermes-src.lock. HERMES_SRC names any
# hermes-agent clone (default: this checkout's frontend/.hermes-src link); when its HEAD is not
# the pin, a detached worktree of it at the pin is used. node_modules: $GLIDE_NODE_MODULES or
# this checkout's frontend/node_modules.
set -euo pipefail
# A hook exports GIT_DIR and friends; they would point `git -C "$src"` back at this repo.
unset $(git rev-parse --local-env-vars)

mode=check
[[ ${1:-} == --commit ]] && { mode=commit; shift; }
rev=${1:-HEAD}
top=$(git rev-parse --show-toplevel)
cleanup=()
trap 'for c in "${cleanup[@]}"; do eval "$c"; done' EXIT

modules=${GLIDE_NODE_MODULES:-$(readlink -f "$top/frontend/node_modules" 2>/dev/null || true)}
[[ -d $modules/esbuild ]] || { echo "dist-fresh: no node_modules with esbuild (set GLIDE_NODE_MODULES)" >&2; exit 2; }

if [[ $mode == check ]]; then
  sha=$(git rev-parse --verify "$rev^{commit}")
  tree=$(mktemp -d "${TMPDIR:-/tmp}/dist-fresh.XXXXXX")
  git worktree add -q --detach "$tree" "$sha"
  cleanup+=("git -C '$top' worktree remove --force '$tree'")
  ln -s "$modules" "$tree/frontend/node_modules"
else
  sha=$(git rev-parse HEAD)
  tree=$top
  git diff --quiet HEAD -- frontend || { echo "dist-fresh: frontend/ has uncommitted changes" >&2; exit 2; }
fi

pin=$(tr -d '[:space:]' < "$tree/frontend/hermes-src.lock")
src=${HERMES_SRC:-$(readlink -f "$top/frontend/.hermes-src" 2>/dev/null || true)}
[[ -d $src ]] || { echo "dist-fresh: set HERMES_SRC to a hermes-agent clone" >&2; exit 2; }
if [[ $(git -C "$src" rev-parse HEAD) != "$pin" ]]; then
  pinned=$(mktemp -d "${TMPDIR:-/tmp}/dist-fresh-hsrc.XXXXXX")
  git -C "$src" worktree add -q --detach "$pinned" "$pin"
  cleanup+=("git -C '$src' worktree remove --force '$pinned'")
  src=$pinned
fi

before=$(sha256sum < "$tree/frontend/dist/entry.js" | cut -c1-16)
(cd "$tree/frontend" && HERMES_SRC=$src node scripts/hermes-src.mjs >/dev/null && node scripts/build.mjs)
after=$(sha256sum < "$tree/frontend/dist/entry.js" | cut -c1-16)

if git -C "$tree" diff --quiet -- frontend/dist/entry.js; then
  echo "dist-fresh: ok ${sha:0:12} dist/entry.js $before matches its source (hermes $pin)"
  exit 0
fi
if [[ $mode == commit ]]; then
  git -C "$tree" add frontend/dist/entry.js
  git -C "$tree" commit -q -m "chore(frontend): build dist/entry.js for ${sha:0:7}"
  echo "dist-fresh: committed $(git -C "$tree" rev-parse --short HEAD) dist/entry.js $before -> $after"
  exit 0
fi
echo "dist-fresh: STALE ${sha:0:12} committed dist/entry.js $before, source builds $after" >&2
echo "  fix: scripts/dist-fresh.sh --commit   (on the branch being pushed)" >&2
exit 1
