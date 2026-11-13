// The Hermes skin's semantic colors for one polarity, as the Ink TUI derives them (ui-tui/src/theme.ts
// `fromSkin`, which is not a public module): the skin's own token, else Hermes' default seed for that
// polarity, lifted until it reads on the background.

import { ensureContrast, relativeLuminance } from '@hermes/shared/color'
import type { SkinColors } from '@hermes/shared/skin'

/** The contrast helpers, for glide/ code that cannot resolve @hermes/shared itself. */
export { contrastRatio, ensureContrast, mix, readableOn, relativeLuminance } from '@hermes/shared/color'

/** The four colors tern takes from a skin. */
export interface SkinSemantics {
  accent: string
  error: string
  ok: string
  warn: string
}

/** Hermes' default seeds (ui-tui/src/theme.ts DARK_SEEDS and LIGHT_SEEDS) and assumed backgrounds. */
const SEEDS: Record<'dark' | 'light', SkinSemantics & { bg: string }> = {
  dark: { accent: '#FFBF00', bg: '#101014', error: '#ef5350', ok: '#4caf50', warn: '#ffa726' },
  light: { accent: '#956E00', bg: '#ffffff', error: '#C14240', ok: '#367E39', warn: '#956115' }
}

// Contrast floors against the background: the accent is display text, the rest are status colors.
const ACCENT_FLOOR = { dark: 1.45, light: 1.18 }
const STATUS_FLOOR = { dark: 2.2, light: 1.6 }

/** The background the skin's colors sit on: the one it authors when readable, else Hermes' seed for `polarity`. */
export function skinBackground(colors: SkinColors, polarity: 'dark' | 'light'): string {
  const value = (colors['background'] ?? '').trim()
  const hex = value.startsWith('#') ? value : `#${value}`

  return value && relativeLuminance(hex) !== null ? hex : SEEDS[polarity].bg
}

/** The skin's accent, error, ok and warn colors for `polarity`. */
export function skinColors(colors: SkinColors, polarity: 'dark' | 'light'): SkinSemantics {
  const seeds = SEEDS[polarity]
  const bg = skinBackground(colors, polarity)
  const lift = (color: string, floor: number) => ensureContrast(color, bg, floor)

  return {
    accent: lift(colors['ui_accent'] ?? colors['banner_accent'] ?? seeds.accent, ACCENT_FLOOR[polarity]),
    error: lift(colors['ui_error'] ?? seeds.error, STATUS_FLOOR[polarity]),
    ok: lift(colors['ui_ok'] ?? seeds.ok, STATUS_FLOOR[polarity]),
    warn: lift(colors['ui_warn'] ?? seeds.warn, STATUS_FLOOR[polarity])
  }
}
