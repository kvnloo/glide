#!/usr/bin/env bash
# Heavy browser work belongs on Boat, never the shared host desktop.
set -euo pipefail
exec bash "$(dirname "$0")/boat/up.sh" "$@"
