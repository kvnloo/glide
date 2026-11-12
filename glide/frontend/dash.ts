// The `dash` theme mode (`/theme`, `/glide theme dash`): Dash's original look, warm night, cream ink and
// one gold. The same tokens glide/themes/dash.json gives Tern and omp, so the Hermes pane and its cards
// match the window around them.

import { mix, readableOn } from '../../frontend/src/hermes/theme.js'
import { tintFloor, wallSamples } from './glass.js'
import { DASH, NIGHT_INKS } from './tokens.js'
import { walPalette, walTernPalette, type TernPalette, type WalColors, type WalPalette } from './wal.js'

export { DASH }

/**
 * Dash's palette in the wallpaper palette's shape, so the same glass and card stylesheet (walCss) wears it.
 * With the wallpaper's colors.json the glass floor is taken over the wallpaper too: Dash's cream ink on its
 * black glass has to hold 4.5:1 over a white-armoured scene, not only over Dash's own swatches.
 */
export function dashPalette(wall?: WalColors): WalPalette {
  const p = walPalette({
    special: { background: DASH.bg, foreground: DASH.fg },
    colors: { color1: DASH.error, color2: DASH.success, color3: DASH.gold, color7: DASH.muted, color8: DASH.dim }
  }, 'dash')
  // Gold is the only accent: walPalette would pick the most saturated slot (the error red).
  const samples = [...new Set([...p.samples, ...(wall ? wallSamples(wall) : [])])]
  const inks = [p.fg, DASH.gold, p.muted, p.dim, p.error, p.success, p.warning, ...NIGHT_INKS]
  return { ...p, accent: DASH.gold, glow: DASH.gold, accentInk: readableOn(DASH.gold), selectedBg: mix(DASH.bg, DASH.gold, 0.18), samples, floor: tintFloor(inks, DASH.bg, samples) }
}

export function dashTernPalette(p: WalPalette = dashPalette()): TernPalette {
  return { ...walTernPalette(p), name: { dark: 'dash', light: 'dash' } }
}
