// Glide's whole-app themes (`/theme`, the glide_theme tool, GL-062): one table of named token sets
// (themes.json, which the tool reads too), each worn the way the dash mode wears Dash: the wallpaper
// palette's shape, so the chat, every card, widget and page retint through the same tokens and stylesheet
// (walCss), with walPalette's 4.5:1 text floor. Each theme names its pair for the other phase (day/night).

import table from './themes.json'

import { styleAccent, styleWal, type UiStyle } from './style.js'
import { walPalette, walTernPalette, type TernPalette, type WalPalette } from './wal.js'

export type GlideTheme = keyof typeof table.themes
export type ThemePhase = 'day' | 'night'

/** One entry of the table, as themes.json writes it. */
interface TableEntry {
  readonly label: string
  readonly detail: string
  readonly phase: string
  readonly pair: string
  readonly bg: string
  readonly fg: string
  readonly accent: string
  readonly muted: string
  readonly dim: string
  readonly error: string
  readonly success: string
  readonly warning: string
  readonly info: string
  readonly magenta: string
  readonly cyan: string
}

/** A theme's tokens, its phase and its pair read as the names they are. */
export interface ThemeTokens extends Omit<TableEntry, 'phase' | 'pair'> {
  readonly phase: ThemePhase
  readonly pair: GlideTheme
}

const THEMES: Readonly<Record<GlideTheme, TableEntry>> = table.themes

export function isGlideTheme(v: unknown): v is GlideTheme {
  return typeof v === 'string' && Object.hasOwn(THEMES, v)
}

/** The table's names, in its order. */
export const GLIDE_THEMES: readonly GlideTheme[] = Object.keys(THEMES).filter(isGlideTheme)

export function themeTokens(name: GlideTheme): ThemeTokens {
  const t = THEMES[name]
  // whole_theme.py's tests hold every pair to a table name of the other phase; a bad row pairs with itself.
  return { ...t, phase: t.phase === 'night' ? 'night' : 'day', pair: isGlideTheme(t.pair) ? t.pair : name }
}

/** The Tern window theme the launcher installs for `name` (whole_theme.py omp_themes). */
export const windowThemeOf = (name: GlideTheme) => `glide-${name}`

/**
 * The theme's palette in the wallpaper palette's shape. The agent's glide_ui_style still tints it: warmth
 * before the floor is taken, an accent after (lifted to 4.5:1 like the theme's own).
 */
export function themePalette(name: GlideTheme, style?: UiStyle): WalPalette {
  const t = THEMES[name]
  const colors = { special: { background: t.bg, foreground: t.fg }, colors: { color1: t.error, color2: t.success, color3: t.warning, color4: t.info, color5: t.magenta, color6: t.cyan, color7: t.muted, color8: t.dim } }
  // The table's accent, not walPalette's most saturated slot; a style's accent wins over both.
  return styleAccent(walPalette(styleWal(colors, style), name), { accent: style?.accent ?? t.accent })
}

/** The program palette (`t`) the theme sends, named for its window theme. */
export function themeTernPalette(name: GlideTheme, p: WalPalette = themePalette(name)): TernPalette {
  const window = windowThemeOf(name)
  return { ...walTernPalette(p), name: { dark: window, light: window } }
}
