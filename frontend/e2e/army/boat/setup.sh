#!/usr/bin/env bash
# Secret-free deps snapshot. Never run `hermes update` (or `hermes profile use`, `hermes gateway restart`) from a test/film lane.
set -euo pipefail
cd /home/user/army
npm ci --no-audit --no-fund
mkdir -p /home/user/army-deps/bin
install -m 755 /home/user/army/tern-bin /home/user/army-deps/bin/tern
command -v uv >/dev/null || { curl -LsSf https://astral.sh/uv/install.sh | sh; }
export PATH="/home/user/.local/bin:$PATH"
core=/home/user/army-deps/hermes
# This is a disposable tag checkout, never the owner's deploy checkout.
git clone --depth 1 --branch "$HERMES_TAG" https://github.com/NousResearch/hermes-agent.git "$core"
[ "$(git -C "$core" rev-parse HEAD)" = "$HERMES_SHA" ]
UV_PROJECT_ENVIRONMENT="$core/.venv" uv sync --project "$core" --frozen --no-dev --python 3.14
"$core/.venv/bin/python" "$core/scripts/write_install_stamp.py" -o "$core/install-stamp.json" \
  --base-version 0.23.1 --display-version 0.23.1 --distance 0 --update-mechanism external
# The archive was produced by git archive <GLIDE_SHA>, not from a dirty working tree.
[ "$(cat /home/user/glide/ARMY_SHA)" = "$GLIDE_SHA" ]
# Frontend dependencies are prepared here; no local host compilation.
cd /home/user/glide/frontend
export HERMES_PYTHON_SRC_ROOT="$core" HERMES_SRC="$core"
# Compile against the same disposable Hermes tag used by this snapshot.
command -v bun >/dev/null || { curl -fsSL https://bun.sh/install | bash; }
export PATH="/home/user/.bun/bin:$PATH"
bun install --frozen-lockfile
bun run bundle
cd /home/user/army
node -e 'import("playwright-core").then(()=>console.log("e2e deps ready"))'
/home/user/army-deps/bin/tern --version
