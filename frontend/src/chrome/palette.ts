// Theme palettes for the session shell. Dash's tokens supply the quiet inks;
// the accent is reserved for the primary action and the focused row.
// Tern mode sends no palette, and a skin keeps its own semantic hues.

import type { HermesSkin } from '@hermes/shared/skin'
import type { Palette } from '@stencil-hq/tern'

import { DASH, NIGHT } from '../../../glide/frontend/tokens.js'
import { ensureContrast, mix } from '../hermes/theme.js'
import { skinColors, type SkinSemantics } from '../hermes/theme.js'
import type { ThemeMode } from '../settings.js'

type Tokens = Record<string, string>

/** A focused row has one restrained gold wash, not gold secondary copy. */
const DARK_SELECTED = mix(DASH.bg, DASH.gold, 0.12)
const LIGHT_SELECTED = mix(DASH.fg, DASH.gold, 0.12)

/** Every readable ink clears 4.5:1 on both its canvas and its selected row. */
const NOUS: { dark: Tokens; light: Tokens } = {
  dark: {
    accent: DASH.gold,
    dim: NIGHT.text3,
    error: ensureContrast(DASH.error, DARK_SELECTED, 4.5),
    mdLink: NIGHT.text2,
    muted: DASH.muted,
    selectedBg: DARK_SELECTED,
    statusLinePath: NIGHT.text3,
    text: DASH.fg
  },
  light: {
    accent: ensureContrast(DASH.gold, LIGHT_SELECTED, 4.5),
    dim: ensureContrast(DASH.dim, LIGHT_SELECTED, 4.5),
    error: ensureContrast(DASH.error, LIGHT_SELECTED, 4.5),
    mdLink: NIGHT.faint,
    muted: NIGHT.faint,
    selectedBg: LIGHT_SELECTED,
    statusLinePath: NIGHT.faint,
    text: DASH.bg
  }
}

/** The palette mode sends; skin is consulted only for the skin mode. */
export function paletteFor(mode: ThemeMode, skin: HermesSkin | undefined): Palette {
  if (mode === 'nous') {
    return { dark: NOUS.dark, light: NOUS.light, name: { dark: 'nous', light: 'nous' } }
  }

  if (mode === 'skin' && skin) {
    const name = skin.name || 'default'

    return {
      dark: semantic(resolve(skin, 'dark')),
      light: semantic(resolve(skin, 'light')),
      name: { dark: name, light: name }
    }
  }

  return { dark: {}, light: {}, name: { dark: 'tern', light: 'tern' } }
}

/** A skin's polarity-specific colors override its base colors. */
function resolve(skin: HermesSkin, polarity: 'dark' | 'light'): SkinSemantics & { bg: string } {
  const colors = { ...skin.colors, ...(polarity === 'light' ? skin.light_colors : skin.dark_colors) }
  const raw = colors['background']
  const bg = typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw)
    ? raw : polarity === 'dark' ? DASH.bg : DASH.fg
  return { ...skinColors(colors, polarity), bg }
}

function semantic(c: SkinSemantics & { bg: string }): Tokens {
  const ink = (color: string) => ensureContrast(color, c.bg, 4.5)
  const accent = ink(c.accent)
  const out: Tokens = {
    accent,
    borderAccent: accent,
    error: ink(c.error),
    success: ink(c.ok),
    warning: ink(c.warn)
  }

  // Never assign the accent to secondary text, paths, bullets or model labels.
  // Ignore non-hex colors from an ANSI fallback.
  for (const key in out) {
    if (!/^#[0-9a-f]{3,8}$/i.test(out[key] ?? '')) {
      delete out[key]
    }
  }

  return out
}
