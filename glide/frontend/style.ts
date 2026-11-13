// The agent's restyle (`glide_ui_style`): a warmth and an optional accent laid over the wallpaper's
// colors before walPalette() resolves them, so the chat, every card and every mounted widget retint
// together and walPalette's 4.5:1 text floor still holds. Tokens only: nothing names a card.

import { ensureContrast, mix, readableOn } from '../../frontend/src/hermes/theme.js'

import type { WalColors, WalPalette } from './wal.js'

export interface UiStyle {
  /** -1 (cool) .. 1 (warm); 0 is the wallpaper as it is. */
  readonly warmth?: number | undefined
  /** One accent for the whole surface (#rrggbb), lifted to the text floor. */
  readonly accent?: string | undefined
}

const WARM = { bg: '#2a170a', fg: '#ffe6c7', hue: '#ff9a3c' } as const
const COOL = { bg: '#0a1a2c', fg: '#d6e8ff', hue: '#4aa3ff' } as const

/** The wallpaper's colors pulled toward warm or cool by |warmth|; no style is the colors unchanged. */
export function styleWal(wal: WalColors, style: UiStyle | undefined): WalColors {
  const w = Math.max(-1, Math.min(1, style?.warmth ?? 0))
  if (!w) return wal
  const to = w > 0 ? WARM : COOL
  const k = Math.abs(w)
  return {
    special: { ...wal.special, background: mix(wal.special.background, to.bg, 0.55 * k), foreground: mix(wal.special.foreground, to.fg, 0.4 * k) },
    colors: Object.fromEntries(Object.entries(wal.colors).map(([name, c]) => [name, /^#[0-9a-f]{6}$/i.test(c) ? mix(c, to.hue, 0.35 * k) : c]))
  }
}

/** The resolved palette with the style's accent, lifted to 4.5:1 over the background. */
export function styleAccent(p: WalPalette, style: UiStyle | undefined): WalPalette {
  if (!style?.accent) return p
  // Over the background and the card layers, as walPalette lifts every text ink.
  const accent = [p.bg, ...p.layers].reduce((ink, under) => ensureContrast(ink, under, 4.5, 0.01), style.accent)
  return { ...p, accent, glow: accent, accentInk: readableOn(accent), selectedBg: mix(p.bg, accent, 0.18) }
}
