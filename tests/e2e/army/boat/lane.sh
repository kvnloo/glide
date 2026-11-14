#!/usr/bin/env bash
# Runs only inside an owned Boat sandbox. No host desktop or ambient Tern sockets.
# Never run `hermes update` (or `hermes profile use`, `hermes gateway restart`) from a test/film lane.
set -euo pipefail
cd /home/user/army
exec python3 boat/lane.py
