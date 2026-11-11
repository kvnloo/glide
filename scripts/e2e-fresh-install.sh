#!/usr/bin/env bash
# Fixed entry point for the new-user acceptance check. Implementation stays in glide/.
set -euo pipefail
exec bash "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/glide/tools/e2e-fresh-install.sh" "$@"
