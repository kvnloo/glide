// The `dash` theme mode (`/theme`, `/glide theme dash`): Dash's original look, warm night, cream ink and
// one gold. The same tokens glide/themes/dash.json gives Tern and omp, so the Hermes pane and its cards
// match the window around them.

import { mix, readableOn } from '../../frontend/src/hermes/theme.js'
import { walPalette, walTernPalette, type TernPalette, type WalPalette } from './wal.js'

export const DASH = {
  bg: '#0c0c0a',
  fg: '#ECE8DF',
  gold: '#d7b986',
  muted: '#A8A294',
  dim: '#837E72',
  error: '#E5484D',
  success: '#8FB98A'
} as const

/** Dash's palette in the wallpaper palette's shape, so the same glass and card stylesheet (walCss) wears it. */
export function dashPalette(): WalPalette {
  const p = walPalette({
    special: { background: DASH.bg, foreground: DASH.fg },
    colors: { color1: DASH.error, color2: DASH.success, color3: DASH.gold, color7: DASH.muted, color8: DASH.dim }
  }, 'dash')
  // Gold is the only accent: walPalette would pick the most saturated slot (the error red).
  return { ...p, accent: DASH.gold, glow: DASH.gold, accentInk: readableOn(DASH.gold), selectedBg: mix(DASH.bg, DASH.gold, 0.18) }
}

export function dashTernPalette(p: WalPalette = dashPalette()): TernPalette {
  return { ...walTernPalette(p), name: { dark: 'dash', light: 'dash' } }
}
