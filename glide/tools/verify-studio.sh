#!/usr/bin/env bash
# Call only against an owned headless studio, never the user's desktop.
set -euo pipefail
: "${GLIDE_STUDIO_DIR:?Set the existing fframestudio checkout}"
: "${GLIDE_STUDIO_CONTROL:?Set the isolated Tern control socket}"
: "${TERN_DAEMON_SOCKET:?Set the isolated Tern daemon socket}"
: "${TERN_CONFIG_DIR:?Set the isolated Tern config directory}"
: "${XDG_RUNTIME_DIR:?Set the isolated Wayland runtime directory}"
: "${WAYLAND_DISPLAY:?Set the isolated Wayland display}"
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
out=${1:-glide/docs/proofs/studio}
for tool in node tern grim wf-recorder ffmpeg; do command -v "$tool" >/dev/null; done
exec 9>/tmp/glide-studio-heavy.lock
flock 9
while ! awk '/MemAvailable/ {exit !($2 > 6291456)}' /proc/meminfo; do
  echo 'Waiting for MemAvailable > 6 GiB'
  sleep 15
done
mkdir -p .studio-proof
node --input-type=module - <<'JS'
import { build } from './frontend/node_modules/esbuild/lib/main.js'
await build({
  entryPoints: ['frontend/scripts/verify-studio.ts'], bundle: true,
  platform: 'node', format: 'esm', target: 'node22',
  outfile: '.studio-proof/verify.mjs', preserveSymlinks: true,
  jsx: 'automatic', jsxImportSource: '@stencil-hq/tern',
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
})
JS
node .studio-proof/verify.mjs "$out"
ffmpeg -hide_banner -loglevel error -y -i "$out/raw.mp4" -an \
  -c:v libx264 -crf 23 -preset veryfast -pix_fmt yuv420p -movflags +faststart "$out/studio.mp4"
