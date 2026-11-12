// Glide's design tokens: one palette, one type ramp, one radius scale, one tracking set. The cards,
// popups and glass write their sizes as plain CSS; designTokens.test.ts fails any radius, font size,
// letter-spacing or hex in them that is not here, so a new component cannot drift. The design-system
// page (glide/tools/design-system.mts) draws every token and component in each theme.

/** Dash's original black and gold: the `dash` theme mode (dash.ts) and glide/themes/dash.json. */
export const DASH = {
  bg: '#0c0c0a',
  fg: '#ECE8DF',
  gold: '#d7b986',
  muted: '#A8A294',
  dim: '#837E72',
  error: '#E5484D',
  success: '#8FB98A'
} as const

/** The popups' night inks (council, lanes) on Dash's canvas; the glass floor keeps each text ink 4.5:1 (wal.ts). */
export const NIGHT = {
  canvas: DASH.bg, text: DASH.fg, text2: '#B4AFA3', text3: '#A39F94', faint: '#5e5b52',
  action: DASH.gold, strong: '#eccd8c', muted: '#AF9D7E', danger: '#e37f65', agree: '#98cf8b',
  border: 'rgba(236,232,223,0.10)', borderStrong: 'rgba(236,232,223,0.16)'
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
