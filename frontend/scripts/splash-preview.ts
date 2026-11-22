// Renders the launch splash to SVG frames without Tern or a gateway, for review and recordings:
//   bun scripts/splash-preview.ts <out-dir> [dark|light] [fps]
// Turn them into a video with: ffmpeg -framerate <fps> -i <out-dir>/f%04d.png ...
// reuse-checked: ui-tsp scripts/splash-demo.ts -- plays cell designs in a live Tern pane; this needs headless frames.
import { mkdirSync, writeFileSync } from 'node:fs'

import { artInk, SPLASH_INTRO_MS, splashSvg } from '../src/splash/art.js'

const [out = 'splash-frames', theme = 'dark', rate = '30'] = process.argv.slice(2)
const fps = Number(rate)
const exitAt = SPLASH_INTRO_MS + 2200
mkdirSync(out, { recursive: true })
for (let f = 0; f * 1000 / fps < exitAt + 700; f++) {
  const ms = (f * 1000) / fps
  writeFileSync(`${out}/f${String(f).padStart(4, '0')}.svg`, splashSvg(ms, artInk(theme !== 'light'), ms >= exitAt ? exitAt : null))
}
