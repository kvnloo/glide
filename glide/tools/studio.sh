#!/usr/bin/env bash
# reuse-checked: glide/tools/verify-studio.sh (needs an existing studio; this brings one up), lab/fake_model.py
# write_home (same disposable home, but a real model), the clean-profile scratch studio (pruned after 24 h:
# lost 11-17) -- new: a tracked, owned film studio for real Glide takes.
#
# A headless film studio for real Glide takes: its own sway (1920x1080@60, never the user's display), its own
# HERMES_HOME with Glide from this checkout and a real model, its own gateway and one fullscreen Tern running
# `hermes tern`. Every unit is `glide-studio-*` in the user's agent.slice; `down` stops them all.
#
#   glide/tools/studio.sh up|down|shot OUT.png|rec OUT.mp4 [SECS]|check TAKE.mp4|wall IMG|ctl ARGS...
#   rec records at 60 fps (STUDIO_FPS=30 for a 30 fps take), then runs check: ffprobe's avg_frame_rate must be STUDIO_FPS.
#   Take checklist: glide/docs/film-takes.md.
#   env: STUDIO (default ~/glide-studio/run), HERMES_BIN (the Hermes to run), TERN, SWAY, STUDIO_MODEL (default
#        moonshotai/kimi-k3.1-pro), STUDIO_BASE_URL (default NVIDIA NIM), STUDIO_PROVIDER (default nvidia: `custom`
#        replays `reasoning` next to `reasoning_content`, which NIM rejects; Groq's 8k TPM can't fit one turn),
#        STUDIO_KEY_ENV (default NVIDIA_API_KEY, read from
#        STUDIO_KEY_FILE, default ~/.hermes/.env; it is copied only into the studio home's .env, mode 600), STUDIO_GW_MEM / STUDIO_TERN_MEM
#        (cgroup caps, default 1G / 2G). Tern's Stencil sign-in comes from the session keyring: run where Tern is signed in.
#        STUDIO_WALLPAPER: an image as the studio desktop's wallpaper, seen through a clear Tern window (opacity 0, Zen
#        layout, no status line); `wall IMG...` swaps it live (a run of images cross-fades). STUDIO_REPO: a git repo cloned (--shared) as the work
#        folder (on STUDIO_REPO_BRANCH), so the session has a real history (the commits widget reads it). STUDIO_GLIDE / STUDIO_TERN: JSON merged into the
#        home's glide/settings.json / the studio Tern's settings.json at `up`.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
S=${STUDIO:-$HOME/glide-studio/run}
H=$S/home R=$S/rt
HERMES_BIN=${HERMES_BIN:-$HOME/glide-studio/hermes/.venv/bin/hermes}
SWAY=${SWAY:-$(command -v sway)} TERN=${TERN:-$(command -v tern)}
ctl() { "$TERN" ctl --control "$S/ctl.sock" "$@"; }
want_fps() {  # the take's rate: 60 unless STUDIO_FPS names another whole number.
  local f=${STUDIO_FPS:-60}
  [[ $f =~ ^[1-9][0-9]*$ ]] || { echo "studio: STUDIO_FPS must be a whole number, got '$f'" >&2; exit 2; }
  echo "$f"
}
check() {  # check TAKE FPS: fail a take whose measured average frame rate is not FPS (within 0.5).
  local rate
  rate=$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 "$1") ||
    { echo "studio: ffprobe could not read $1" >&2; exit 1; }
  awk -v r="$rate" -v want="$2" -v take="$1" 'BEGIN { n = split(r, p, "/"); fps = (n == 2 && p[2] > 0) ? p[1] / p[2] : r + 0
    ok = fps - want <= 0.5 && want - fps <= 0.5
    printf "studio: %s %s: %.2f fps (avg_frame_rate %s, want %d)\n", ok ? "take ok" : "REJECT take", take, fps, r, want > (ok ? "/dev/stdout" : "/dev/stderr")
    exit !ok }'
}
stop() { for u in glide-studio-tern glide-studio-gw glide-studio-sway 'glide-studio-wall-*'; do systemctl --user stop "$u" 2>/dev/null || true; systemctl --user reset-failed "$u" 2>/dev/null || true; done; }

merge() {  # merge FILE JSON: the object's keys laid over FILE's (a missing file is {}).
  python3 -c 'import json,sys,pathlib; f=pathlib.Path(sys.argv[1]); d=json.loads(f.read_text()) if f.exists() else {}
d.update(json.loads(sys.argv[2])); f.write_text(json.dumps(d, indent=2) + "\n")' "$1" "$2"
}

home() {
  mkdir -p "$H/plugins" "$S/work"
  # Each take opens a fresh session (the pane resumes the home's last one) and a bare Glide (settings.json reopens the
  # last take's pages and widgets); the earlier ones are archived, not deleted.
  if [ -e "$H/state.db" ] || [ -e "$H/glide/settings.json" ]; then local a="$S/archive/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$a"; mv "$H"/state.db* "$H/sessions" "$H/glide" "$a/" 2>/dev/null || true; fi
  ln -sfn "$root" "$H/plugins/glide"
  # STUDIO_THEME: an omp theme JSON the studio's Tern (and so Glide's default `tern` theme) wears as its dark theme.
  if [ -n "${STUDIO_THEME:-}" ]; then local tn; tn=$(basename "$STUDIO_THEME" .json); mkdir -p "$S/omp/themes" "$S/tern/cfg"
    cp "$STUDIO_THEME" "$S/omp/themes/"; printf 'theme:\n  dark: %s\n  light: %s\n' "$tn" "$tn" > "$S/omp/config.yml"
    printf '{"theme":"Dark","theme_dark":"%s"}\n' "$tn" > "$S/tern/cfg/settings.json"; fi
  # A wallpaper is only seen through a clear window: no opacity, the Zen layout (its tab pill fades while typing), no
  # status line; no update or turn-finished toasts over the take.
  if [ -n "${STUDIO_WALLPAPER:-}" ]; then mkdir -p "$S/tern/cfg"; merge "$S/tern/cfg/settings.json" \
    '{"opacity":0,"blur":0,"material":"clear","layout":"Float","status_bar":false,"auto_update":false,"notifications":false}'; fi
  # STUDIO_TERN: JSON merged into the studio Tern's settings.json (e.g. {"ui_font_size":18} to frame the UI larger).
  if [ -n "${STUDIO_TERN:-}" ]; then mkdir -p "$S/tern/cfg"; merge "$S/tern/cfg/settings.json" "$STUDIO_TERN"; fi
  if [ -n "${STUDIO_REPO:-}" ] && [ ! -d "$S/work/.git" ]; then  # an earlier plain work folder is archived
    mkdir -p "$S/archive"; mv "$S/work" "$S/archive/work-$(date +%Y%m%d-%H%M%S)"; git clone -q --shared "$STUDIO_REPO" "$S/work"
    # and the source's pushed branches too, so the history is the whole repo's, not one checkout's
    git -C "$S/work" fetch -q origin '+refs/remotes/origin/*:refs/remotes/upstream/*' 2>/dev/null || true
    # STUDIO_REPO_BRANCH: the branch the work folder is on (the composer shows it), from the source's pushed one
    [ -z "${STUDIO_REPO_BRANCH:-}" ] || git -C "$S/work" checkout -q -B "$STUDIO_REPO_BRANCH" "upstream/$STUDIO_REPO_BRANCH"; fi
  if [ -n "${STUDIO_GLIDE:-}" ]; then mkdir -p "$H/glide"; merge "$H/glide/settings.json" "$STUDIO_GLIDE"; fi
  # STUDIO_PLUGINS: extra plugin dirs to link in (e.g. a model-provider plugin such as the Claude subscription).
  local pl; for pl in ${STUDIO_PLUGINS:-}; do ln -sfn "$pl" "$H/plugins/$(basename "$pl")"; done
  python3 - "$H" "${STUDIO_MODEL:-moonshotai/kimi-k3.1-pro}" "${STUDIO_BASE_URL-https://integrate.api.nvidia.com/v1}" "${STUDIO_PROVIDER:-nvidia}" <<'PY'
import json, os, sys, pathlib
home, model, base, provider = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
(home / "config.yaml").write_text(json.dumps({
    "model": {"provider": provider, "default": model, **({"base_url": base} if base else {})},
    "approvals": {"mode": "off"},
    "auxiliary": {"title_generation": {"enabled": False}},
    "plugins": {"enabled": ["glide", *[pathlib.Path(x).name for x in os.environ.get("STUDIO_PLUGINS", "").split()]], "disabled": []},
    "telemetry": {"shared_metrics": {"enabled": False, "send": False, "offer_version": 2}},
}, indent=2))
PY
  local key_env=${STUDIO_KEY_ENV:-NVIDIA_API_KEY} key
  if [ "$key_env" = none ]; then : > "$H/.env"; else  # none: the provider signs in itself (Claude subscription)
  key=$(grep -m1 "^$key_env=" "${STUDIO_KEY_FILE:-$HOME/.hermes/.env}" | cut -d= -f2-)
  [ -n "$key" ] || { echo "studio: no $key_env in ~/.hermes/.env" >&2; exit 1; }
  (umask 077; printf '%s=%s\n' "$key_env" "$key" > "$H/.env"); fi
}

unlock() {  # Tern's Stencil sign-in needs the login keyring; it re-locks on its own, so unlock via the TPM-sealed helper.
  local q=(busctl --user get-property org.freedesktop.secrets /org/freedesktop/secrets/collection/login
    org.freedesktop.Secret.Collection Locked) u
  export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}
  timeout 8 "${q[@]}" 2>/dev/null | grep -q true || return 0
  u=${STUDIO_KEYRING_HELPER:-}
  [ -n "$u" ] && timeout 30 /usr/bin/python3 "$u" >/dev/null 2>&1
  timeout 8 "${q[@]}" 2>/dev/null | grep -q false || { echo "studio: login keyring locked; Tern can't sign in" >&2; exit 1; }
}
up() {
  stop; unlock; home
  mkdir -p "$R" && chmod 700 "$R"
  rm -f "$R"/wayland-* "$R"/sway-ipc.*  # left by a killed sway or a reboot: a stale socket passes the ready check below
  # Sway draws no wallpaper under a fullscreen window: with one, the lone window is tiled (it fills the output anyway).
  if [ -n "${STUDIO_WALLPAPER:-}" ]; then printf '%s\n' 'output HEADLESS-1 mode 1920x1080@60Hz scale 1' \
    "output HEADLESS-1 bg $STUDIO_WALLPAPER fill" 'default_border none' 'gaps outer 0' > "$S/sway.conf"
  else printf '%s\n' 'output HEADLESS-1 mode 1920x1080@60Hz scale 1' 'default_border none' 'gaps outer 0' \
    'for_window [app_id=".*"] fullscreen enable' > "$S/sway.conf"; fi
  systemd-run --user --unit=glide-studio-sway --slice=agent.slice -E XDG_RUNTIME_DIR="$R" -E WLR_BACKENDS=headless \
    -E WLR_LIBINPUT_NO_DEVICES=1 -E LD_LIBRARY_PATH="${SWAY_LIB:-}" "$SWAY" -c "$S/sway.conf" >/dev/null
  for _ in $(seq 40); do [ -S "$R/wayland-1" ] && break; sleep 0.5; done
  [ -S "$R/wayland-1" ] || { echo "studio: sway gave no wayland-1" >&2; exit 1; }
  local env=(-E HERMES_HOME="$H" -E PATH="$(dirname "$HERMES_BIN"):$HOME/.local/bin:/usr/bin:/bin" -E LANG=C.UTF-8 -E TERM=xterm-256color)
  systemd-run --user --unit=glide-studio-gw --slice=agent.slice -p MemoryMax=${STUDIO_GW_MEM:-2G} -p Nice=5 --working-directory="$S/work" "${env[@]}" "$HERMES_BIN" gateway run >/dev/null
  # Every take starts from an empty pane: Tern's daemon replays saved panes (and their old sessions).
  rm -rf "$S/tern/daemon.sock.state" "$S/tern/daemon.prompt"
  systemd-run --user --unit=glide-studio-tern --slice=agent.slice -p MemoryMax=${STUDIO_TERN_MEM:-2G} -p Nice=5 --working-directory="$S/work" "${env[@]}" \
    -E XDG_RUNTIME_DIR="$R" -E WAYLAND_DISPLAY=wayland-1 -E XDG_SESSION_TYPE=wayland -E TERN_BUILD_URL=http://localhost:9 \
    -E TERN_CONFIG_DIR="$S/tern/cfg" -E PI_CODING_AGENT_DIR="$S/omp" -E TERN_DAEMON_SOCKET="$S/tern/daemon.sock" -E XDG_STATE_HOME="$S/tern/state" -E XDG_CACHE_HOME="$S/tern/cache" \
    "$TERN" --control "$S/ctl.sock" -e /bin/bash >/dev/null
  # Tern opens its own shell; the pane runs `hermes tern` from it (as a user would).
  for _ in $(seq 60); do ctl state 2>/dev/null | grep -q '"prompt":true' && break; sleep 1; done
  # Tern's shells do not inherit this unit's environment: name the studio home on the command line, or
  # `hermes tern` dials the user's own profile (11-17: a studio turn ran on the owner's profile).
  # The launch goes through a written script so the tab title (OSC 2, STUDIO_TITLE) isn't the typed command line.
  printf '%s\n' "printf '\\033]2;%s\\007' \"${STUDIO_TITLE:-hermes}\"; cd '$S/work' && clear" \
    "exec env HERMES_HOME='$H' '$HERMES_BIN' tern" > "$S/pane.sh"
  ctl type "\". $S/pane.sh\"" >/dev/null; ctl key Enter >/dev/null
  for _ in $(seq 90); do ctl tree 2>/dev/null | grep -q "Ask Hermes" && break; sleep 1; done
  # Refuse to run turns unless the pane shows the studio's own model.
  # Refuse to run turns unless the pane's Hermes runs on the studio home (zsh rc sets the owner's own).
  local pid ok=""; for pid in $(systemctl --user show -p ControlGroup --value glide-studio-tern | xargs -I{} cat /sys/fs/cgroup{}/cgroup.procs 2>/dev/null); do
    tr '\0' '\n' </proc/$pid/environ 2>/dev/null | grep -qx "HERMES_HOME=$H" && grep -q tern /proc/$pid/cmdline && ok=1; done
  [ -n "$ok" ] || { stop; echo "studio: no hermes tern on HERMES_HOME=$H in the pane; stopped" >&2; exit 1; }
  ctl update idle >/dev/null 2>&1 || true  # a staged Tern update's toast is not part of the take
  echo "studio: up ($S, home $H)"; return
  echo "studio: Glide never showed its composer" >&2; exit 1
}

case "${1:-}" in
  up) up ;;
  down) stop; echo "studio: down" ;;
  shot) XDG_RUNTIME_DIR="$R" WAYLAND_DISPLAY=wayland-1 grim "${2:?out.png}" ;;
  rec)
    fps=$(want_fps); take=${2:?out.mp4}
    if [[ -e "$take" || -L "$take" ]]; then
      echo "studio: take already exists: $take" >&2
      exit 1
    fi
    # Keep capturing static scenes. SIGINT lets the recorder finish the MP4 at the time limit.
    XDG_RUNTIME_DIR="$R" WAYLAND_DISPLAY=wayland-1 timeout -s INT -k 5 "${3:-20}" \
      nice -n 10 wf-recorder -D -r "$fps" \
      -c libx264 -p preset=veryfast -p crf=18 -f "$take" || [ $? -eq 124 ]
    [ -s "$take" ] || { echo "studio: no take written to $take" >&2; exit 1; }
    check "$take" "$fps" ;;
  check) fps=$(want_fps); check "${2:?take.mp4}" "$fps" ;;
  ctl) shift; ctl "$@" ;;
  wall) shift; [ $# -gt 0 ] || { echo "studio: wall IMG..." >&2; exit 2; }
    # Each image is a new swaybg drawn over the last (a later background surface stacks on top), so a run of images
    # cross-fades with no bare frame between them; once the last is up, every earlier one goes, sway's own included.
    old=$(systemctl --user list-units --plain --no-legend 'glide-studio-wall-*' | awk '{print $1}')
    for img in "$@"; do systemd-run --user --unit="glide-studio-wall-$(date +%s%N)" --slice=agent.slice -E XDG_RUNTIME_DIR="$R" \
      -E WAYLAND_DISPLAY=wayland-1 swaybg -o HEADLESS-1 -i "$img" -m fill >/dev/null 2>&1; sleep "${STUDIO_WALL_STEP:-0.05}"; done
    sleep 0.4
    for u in $old; do systemctl --user stop "$u" 2>/dev/null || true; done
    for u in $(systemctl --user list-units --plain --no-legend 'glide-studio-wall-*' | awk '{print $1}' | head -n -1); do systemctl --user stop "$u"; done
    for p in $(cat "/sys/fs/cgroup$(systemctl --user show -p ControlGroup --value glide-studio-sway)/cgroup.procs" 2>/dev/null); do
      [ "$(cat /proc/$p/comm 2>/dev/null)" = swaybg ] && kill "$p"; done; : ;;
  *) sed -n 6,15p "$0"; exit 2 ;;
esac
