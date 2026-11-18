#!/usr/bin/env bash
# reuse-checked: glide/tools/verify-studio.sh (needs an existing studio; this brings one up), lab/fake_model.py
# write_home (same disposable home, but a real model), the clean-profile scratch studio (pruned after 24 h:
# lost 11-17) -- new: a tracked, owned film studio for real Glide takes.
#
# A headless film studio for real Glide takes: its own sway (1920x1080@60, never the user's display), its own
# HERMES_HOME with Glide from this checkout and a real model, its own gateway and one fullscreen Tern running
# `hermes tern`. Every unit is `glide-studio-*` in the user's agent.slice; `down` stops them all.
#
#   lab/studio.sh up|down|shot OUT.png|ctl ARGS...
#   env: STUDIO (default ~/glide-studio/run), HERMES_BIN (the Hermes to run), TERN, SWAY, STUDIO_MODEL (default
#        openai/gpt-oss-120b), STUDIO_BASE_URL (default Groq), STUDIO_KEY_ENV (default GROQ_API_KEY, read from
#        ~/.hermes/.env; it is copied only into the studio home's .env, mode 600)
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
S=${STUDIO:-$HOME/glide-studio/run}
H=$S/home R=$S/rt
HERMES_BIN=${HERMES_BIN:-$HOME/glide-studio/hermes/.venv/bin/hermes}
SWAY=${SWAY:-$(command -v sway)} TERN=${TERN:-$(command -v tern)}
ctl() { "$TERN" ctl --control "$S/ctl.sock" "$@"; }
stop() { for u in glide-studio-tern glide-studio-gw glide-studio-sway; do systemctl --user stop $u 2>/dev/null || true; systemctl --user reset-failed $u 2>/dev/null || true; done; }

home() {
  mkdir -p "$H/plugins" "$S/work"
  ln -sfn "$root" "$H/plugins/glide"
  python3 - "$H" "${STUDIO_MODEL:-openai/gpt-oss-120b}" "${STUDIO_BASE_URL:-https://api.groq.com/openai/v1}" <<'PY'
import json, sys, pathlib
home, model, base = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
(home / "config.yaml").write_text(json.dumps({
    "model": {"provider": "custom", "default": model, "base_url": base},
    "approvals": {"mode": "off"},
    "auxiliary": {"title_generation": {"enabled": False}},
    "plugins": {"enabled": ["glide"], "disabled": []},
    "telemetry": {"shared_metrics": {"enabled": False, "send": False, "offer_version": 2}},
}, indent=2))
PY
  local key_env=${STUDIO_KEY_ENV:-GROQ_API_KEY} key
  key=$(grep -m1 "^$key_env=" "$HOME/.hermes/.env" | cut -d= -f2-)
  [ -n "$key" ] || { echo "studio: no $key_env in ~/.hermes/.env" >&2; exit 1; }
  (umask 077; printf 'OPENAI_API_KEY=%s\n' "$key" > "$H/.env")
}

up() {
  stop; home
  mkdir -p "$R" && chmod 700 "$R"
  printf '%s\n' 'output HEADLESS-1 mode 1920x1080@60Hz scale 1' 'default_border none' 'gaps outer 0' \
    'for_window [app_id=".*"] fullscreen enable' > "$S/sway.conf"
  systemd-run --user --unit=glide-studio-sway --slice=agent.slice -E XDG_RUNTIME_DIR="$R" -E WLR_BACKENDS=headless \
    -E WLR_LIBINPUT_NO_DEVICES=1 "$SWAY" -c "$S/sway.conf" >/dev/null
  for _ in $(seq 40); do [ -S "$R/wayland-1" ] && break; sleep 0.5; done
  [ -S "$R/wayland-1" ] || { echo "studio: sway gave no wayland-1" >&2; exit 1; }
  local env=(-E HERMES_HOME="$H" -E PATH="$(dirname "$HERMES_BIN"):$HOME/.local/bin:/usr/bin:/bin" -E LANG=C.UTF-8 -E TERM=xterm-256color)
  systemd-run --user --unit=glide-studio-gw --slice=agent.slice --working-directory="$S/work" "${env[@]}" "$HERMES_BIN" gateway run >/dev/null
  systemd-run --user --unit=glide-studio-tern --slice=agent.slice --working-directory="$S/work" "${env[@]}" \
    -E XDG_RUNTIME_DIR="$R" -E WAYLAND_DISPLAY=wayland-1 -E XDG_SESSION_TYPE=wayland -E TERN_BUILD_URL=http://127.0.0.1:9 \
    -E TERN_CONFIG_DIR="$S/tern/cfg" -E TERN_DAEMON_SOCKET="$S/tern/daemon.sock" -E XDG_STATE_HOME="$S/tern/state" \
    "$TERN" --control "$S/ctl.sock" -e "$HERMES_BIN" tern >/dev/null
  for _ in $(seq 90); do ctl tree 2>/dev/null | grep -q "Ask Hermes" && { echo "studio: up ($S)"; return; }; sleep 1; done
  echo "studio: Glide never showed its composer" >&2; exit 1
}

case "${1:-}" in
  up) up ;;
  down) stop; echo "studio: down" ;;
  shot) XDG_RUNTIME_DIR="$R" WAYLAND_DISPLAY=wayland-1 grim "${2:?out.png}" ;;
  ctl) shift; ctl "$@" ;;
  *) sed -n 6,13p "$0"; exit 2 ;;
esac
