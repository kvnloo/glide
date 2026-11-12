#!/usr/bin/env bash
# Requires git, uv, Python 3.14 and network access to public GitHub and package registries.
# No inherited profile or provider credentials. All history is synthetic.
set -euo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
uv=$(command -v uv) || { echo 'FAIL prerequisites: install uv first' >&2; exit 1; }
# Ignore inherited HERMES_HOME and TMPDIR, even if either names a real profile.
work=$(mktemp -d /tmp/glide-e2e.XXXXXXXXXX)
mkdir "$work/user"
touch "$work/.glide-e2e"
# Each run checks out Hermes core (over 1 GB), so remove it on exit unless GLIDE_E2E_KEEP=1.
if [[ ${GLIDE_E2E_KEEP:-} == 1 ]]; then
    printf 'Isolated HERMES_HOME=%s\nGLIDE_E2E_KEEP=1: artifacts remain here for inspection.\n' "$work"
else
    trap 'rm -rf -- "$work"' EXIT
    printf 'Isolated HERMES_HOME=%s\nRemoved on exit; set GLIDE_E2E_KEEP=1 to keep it.\n' "$work"
fi
env -i HOME="$work/user" HERMES_HOME="$work" PATH=/usr/bin:/bin \
    PYTHONNOUSERSITE=1 PYTHONUNBUFFERED=1 GIT_TERMINAL_PROMPT=0 TERM=dumb \
    UV_CONCURRENT_BUILDS=2 bash -euo pipefail -c '
repo=$1
uv=$2
core="$HERMES_HOME/core"
step() {
    local name=$1 rc
    shift
    printf "RUN %s\n" "$name"
    if "$@" </dev/null; then
        printf "PASS %s exit=0\n" "$name"
    else
        rc=$?
        printf "FAIL %s exit=%s\n" "$name" "$rc" >&2
        exit "$rc"
    fi
}
step bootstrap "$uv" --version
pin=$(tr -d "[:space:]" < "$repo/frontend/hermes-src.lock")
[[ $pin =~ ^[0-9a-f]{40}$ ]] || { echo "FAIL invalid Hermes pin" >&2; exit 1; }
step core-init git init -q "$core"
step core-fetch git -C "$core" fetch --depth 1 https://github.com/NousResearch/hermes-agent.git "$pin"
step core-checkout git -C "$core" checkout -q --detach FETCH_HEAD
printf "Hermes revision=%s\n" "$(git -C "$core" rev-parse HEAD)"
step dependencies "$uv" sync --project "$core" --frozen --no-dev --python 3.14
hermes="$core/.venv/bin/hermes"
# --force explicitly accepts CAUTION for this custom public source. The scanner still runs;
# DANGEROUS remains blocked. --yes-deps supplies non-interactive dependency consent.
step install "$hermes" plugins install kvnloo/glide --force --enable --yes-deps
installed="$HERMES_HOME/plugins/glide"
printf "Installed main revision=%s\n" "$(git -C "$installed" rev-parse HEAD)"
step validate "$hermes" plugins validate "$installed"
step glide-flow "$core/.venv/bin/python" "$repo/glide/tools/fresh_install.py"
printf "PASS fresh-install exit=0\n"
' bash "$repo" "$uv"
