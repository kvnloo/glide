// Glide's design tokens: one palette, one type ramp, one radius scale, one tracking set. The cards,
// popups and glass write their sizes as plain CSS; designTokens.test.ts fails any radius, font size,
// letter-spacing or hex in them that is not here, so a new component cannot drift. The design-system
// page (glide/tools/design-system.mts) draws every token and component in each theme.

/**
 * Dash's original black and gold: the `dash` theme mode (dash.ts) and glide/themes/dash.json. Muted and dim
 * read 4.5:1 on the lightest layer text sits on (wal.ts `l3`), so walPalette never lifts them (contrast.test.ts).
 */
export const DASH = {
  bg: '#0c0c0a',
  fg: '#ECE8DF',
  gold: '#d7b986',
  muted: '#BBB5A9',
  dim: '#ACA79D',
  error: '#E5484D',
  success: '#8FB98A'
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
export const GOLD = { rim: '#f0d7a0', fill: '#cfae74', shade: '#9c7a43', ink: '#1d160b' } as const

/** Status fallbacks under the host's --h-success / --h-warning / --h-danger, for hosts that do not set them. */
export const STATUS = { ok: '#7fd1a0', warn: '#e8b04a', bad: '#e8513a' } as const

/** The council's own hue on the intent cards; under glass it takes the palette's glow (glass.ts). */
export const COUNCIL_HUE = '#a855d6'

export const SERIF = "'Cormorant Garamond', 'Instrument Serif', 'EB Garamond', Georgia, serif"
export const MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace"

/** Corner radii, px: chips and swatches, rows and tiles, heroes and sections, cards/popups/panes, pills. Circles use 50%. */
export const RADIUS = { chip: 4, tile: 8, block: 12, card: 16, pill: 999 } as const

/**
 * The type ramp, px. Mono labels (uppercase) and meta lines, sans small and body text, serif names and
 * titles, display numbers. Nothing under 10 px: the popups' 8.5 px labels failed at phone scale.
 */
export const TYPE = { label: 10, meta: 11, small: 12, body: 13, lead: 15, name: 17, title: 20, display: 28, hero: 44, giant: 88 } as const

/** Letter-spacing: caps for mono labels, wide for the instrument eyebrows, tight and display for big type. */
export const TRACK = { caps: '.08em', wide: '.16em', tight: '-.01em', display: '-.04em', giant: '-.06em' } as const
