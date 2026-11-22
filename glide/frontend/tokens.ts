// Glide's design tokens: one palette, one type ramp, one radius scale, one tracking set. The cards,
// popups and glass write their sizes as plain CSS; designTokens.test.ts fails any radius, font size,
// letter-spacing or hex in them that is not here, so a new component cannot drift. The design-system
// page (glide/tools/design-system.mts) draws every token and component in each theme. Dash's night, the gold,
// the radii, the type ramp and the tracking are read from the shared theme file (sharedTheme.ts), so Glide,
// Dash and the phones wear the same values; the rest are Glide's own.

import { SHARED } from './sharedTheme.js'

const NIGHT_SET = SHARED.color.dark

/**
 * Dash's original black and gold: the `dash` theme mode (dash.ts) and glide/themes/dash.json. Muted and dim
 * read 4.5:1 on the lightest layer text sits on (wal.ts `l3`), so walPalette never lifts them (contrast.test.ts).
 */
export const DASH = {
  bg: NIGHT_SET.bg,
  fg: NIGHT_SET.fg,
  gold: SHARED.brand.accent,
  muted: NIGHT_SET.mutedFg,
  dim: NIGHT_SET.faint,
  error: NIGHT_SET.danger,
  success: NIGHT_SET.success
} as const

/**
 * The command-palette templates' palettes (templates.ts): Mono is greyscale with white for the one accent,
 * Studio a warm charcoal with Dash's light gold (kvnloo/glide#346; red instead of gold is the owner's call).
 * Error and success keep their hue in both, so a failed turn still reads as one.
 */
export const MONO_INK = {
  bg: '#0a0a0a',
  fg: '#e8e8e8',
  accent: '#f5f5f5',
  muted: '#b0b0b0',
  dim: '#a0a0a0',
  error: '#e5484d',
  success: '#8fb98a'
} as const

export const STUDIO = {
  bg: '#17140f',
  fg: '#f3ecdf',
  accent: '#e6cd96',
  muted: '#c2b9a8',
  dim: '#b3aa98',
  error: '#e5484d',
  success: '#8fb98a'
} as const

/** The popups' night inks (council, lanes) on Dash's canvas; the glass floor keeps each text ink 4.5:1 (wal.ts). */
export const NIGHT = {
  canvas: DASH.bg, text: DASH.fg, text2: DASH.muted, text3: DASH.dim, faint: '#5e5b52',
  action: DASH.gold, strong: '#eccd8c', muted: '#B6A689', danger: '#ea9580', agree: '#98cf8b',
  // A 1 px line reads at 1.5:1 on the canvas and on l1 (contrast.test.ts).
  border: 'rgba(236,232,223,0.18)', borderStrong: 'rgba(236,232,223,0.24)'
} as const
/** The popups' text inks (faint marks bars only). */
export const NIGHT_INKS = [NIGHT.text, NIGHT.text2, NIGHT.text3, NIGHT.action, NIGHT.strong, NIGHT.muted, NIGHT.danger, NIGHT.agree] as const

/** The one gold call to action (the council's Convene): a rim brightest on top over Dash's gold, dark ink. */
export const GOLD = { ...SHARED.brand.cta } as const

/** Status fallbacks under the host's --h-success / --h-warning / --h-danger, for hosts that do not set them. */
export const STATUS = { ok: '#7fd1a0', warn: '#e8b04a', bad: '#e8513a' } as const

/** The council's own hue on the intent cards; under glass it takes the palette's glow (glass.ts). */
export const COUNCIL_HUE = '#a855d6'

export const SERIF = "'Cormorant Garamond', 'Instrument Serif', 'EB Garamond', Georgia, serif"
export const MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace"

/** Corner radii, px: chips and swatches, rows and tiles, heroes and sections, cards/popups/panes, pills. Circles use 50%. */
const { chip, tile, block, card, pill } = SHARED.radius
export const RADIUS = { chip, tile, block, card, pill } as const

/**
 * The type ramp, px. Mono labels (uppercase) and meta lines, sans small and body text, serif names and
 * titles, display numbers. Nothing under 10 px: the popups' 8.5 px labels failed at phone scale.
 */
export const TYPE = { ...SHARED.type.size } as const

/** Letter-spacing: caps for mono labels, wide for the instrument eyebrows, tight and display for big type. */
export const TRACK = { ...SHARED.type.tracking } as const
