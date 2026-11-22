// The shared theme: kvnloo/ephemeral-ui's theme/glide.json, the one file Glide, Dash, Hermes desktop and the
// phones read, so they match. Glide wears its pinned copy (glide/themes/shared, PIN.json names the commit;
// glide/tools/check_shared_theme.py fails a hand edit or a stale pin). tokens.ts takes Dash's night, the
// gold, the radii, the type ramp and the tracking from it, glass.ts its frost and easing, and
// glide/whole_theme.py writes the dash window theme's colors from it. Never edit the copy: re-vendor.

import theme from '../themes/shared/glide.json'

/** The theme file's shape version this reader knows; any other is refused rather than half-read. */
export const SHARED_V = 0

if (theme.v !== SHARED_V) throw new Error(`glide/themes/shared/glide.json: v ${theme.v}, Glide reads v ${SHARED_V}`)

export const SHARED = theme

/** One backdrop level: blur px, saturate %, optional fixed tint %. */
export interface GlassLevel { readonly blur: number; readonly saturate: number; readonly tint?: number }

/** `backdrop-filter` (with its -webkit- twin) for a glass level; `inline` writes it as a style attribute does. */
export const frost = (g: GlassLevel, inline = false) => {
  const f = `blur(${g.blur}px) saturate(${g.saturate}%)`
  return inline ? `-webkit-backdrop-filter:${f};backdrop-filter:${f}` : `-webkit-backdrop-filter: ${f}; backdrop-filter: ${f}`
}
