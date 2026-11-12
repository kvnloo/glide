// Liquid glass for the `auto` theme, as the hackathon film draws Glide: frosted translucent cards
// over the wallpaper, a thin accent→glow gradient rim with a soft halo, dust motes drifting round
// the live cards, and 150-250ms hover lifts. Every Glide view wears it: the kit's cards (intent,
// council, focus, digest, hosts, fleet, intel), Tern's popups and modals, the composer, the live
// lanes dock, the status row and the transcript's own lines. Every color is the wallpaper palette (wal.ts), bound once as --g-*
// variables; the rules below name only those and Tern's own theme variables. No tint that text sits
// on drops under the palette's floor (tintFloor), so text keeps 4.5:1 over any wallpaper pixel.
//
// Tern scopes a plugin sheet inside the surface region: a selector naming the region (.sf-region,
// .sf-main, .sf-dock) never matches, so these rules start at its descendants (.sf, the kit's
// [data-eui='card'], omp's roles). A sheet Tern cannot parse wedges the pane, so the sheet keeps to
// syntax the native renderer itself uses (no :scope, no :is, no currentColor in color-mix):
// GLASS_FORBIDDEN lists them and the tests hold the sheet to it.

import { contrastRatio, mix } from '../../frontend/src/hermes/theme.js'

import type { WalColors, WalPalette } from './wal.js'

/** Syntax that wedges or never matches in a Tern plugin sheet. */
export const GLASS_FORBIDDEN = ['//', ':scope', ':is(', ':where(', 'currentColor', '.sf-region', '.sf-main', '.sf-dock', '.sf-layer'] as const

const HEX = /^#[0-9a-f]{6}$/i

/** Hue of `#rrggbb` in degrees, with its HSL saturation and lightness. */
function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

/** `#rrggbb` through CSS saturate(s): the Filter Effects matrix on sRGB, clamped to the gamut. */
export function saturateHex(hex: string, s: number): string {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
  const m: [number, number, number][] = [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
  ]
  return '#' + m.map(([x, y, z]) => Math.round(Math.min(255, Math.max(0, x * rgb[0] + y * rgb[1] + z * rgb[2]))).toString(16).padStart(2, '0')).join('')
}

/** The wallpaper's own pixels as pywal samples them: the background and color0..color6 (7, 8 and 15 are greys it derives). */
export function wallSamples(wal: WalColors): string[] {
  const all = [wal.special.background, ...[0, 1, 2, 3, 4, 5, 6].map(i => wal.colors[`color${i}`] ?? '')]
  return [...new Set(all.filter(c => HEX.test(c)).map(c => c.toLowerCase()))]
}

/** The saturate() steps the glass reaches: at rest 140%, and the playground sweeps 120% to 180%. */
export const SATURATE_STEPS = [1, 1.2, 1.4, 1.6, 1.8] as const
const AA = 4.5

/**
 * The least tint opacity, in whole percent, from which up to 100% every ink keeps 4.5:1 against the
 * tint laid over every wallpaper sample, each also taken through every saturate() step the backdrop
 * filter reaches. A blur only averages pixels, so the samples' extremes bound it. 100 when only the
 * opaque tint holds.
 */
export function tintFloor(inks: readonly string[], tint: string, samples: readonly string[]): number {
  const backdrops = samples.flatMap(c => SATURATE_STEPS.map(s => saturateHex(c, s)))
  const holds = (pct: number) => backdrops.every(px => {
    const under = mix(px, tint, pct / 100)
    return inks.every(ink => (contrastRatio(ink, under) ?? 0) >= AA)
  })
  let pct = 100
  while (pct > 0 && holds(pct - 1)) pct--
  return pct
}

/**
 * The glow that pairs with the accent: of color1..color6, the one whose hue sits farthest from the
 * accent's, weighted by saturation and by lightness, since a glow must read as light (the film's
 * gold accent finds its bright cyan, not the darker teal). The accent itself when nothing else is
 * colored.
 */
export function pickGlow(wal: WalColors, accent: string): string {
  if (!HEX.test(accent)) return accent
  const a = hsl(accent)
  let best = accent
  let top = 0
  for (let i = 1; i <= 6; i++) {
    const c = wal.colors[`color${i}`] ?? ''
    if (!HEX.test(c)) continue
    const { h, s, l } = hsl(c)
    const apart = Math.min(Math.abs(h - a.h), 360 - Math.abs(h - a.h))
    const score = apart * s * l
    if (score > top) {
      best = c
      top = score
    }
  }
  return best
}

/** The panes' resting tint, raised to the palette's floor. */
export const restTint = (p: WalPalette): number => Math.max(62, p.floor)

// The selectors each view answers to. Tern scopes the sheet inside the region, so each starts at a descendant.
const K = "[data-eui][data-eui='card']"
const CARD = `${K} .eu-card`
const MOTES = `${K}:not([data-eui-popup])::before`
// Doubled class: outranks Tern's [data-theme='dark'] composer rules without !important, so the playground can animate it.
const EDITOR = ".sf.sf-col.sf-col[data-role^='omp.editor']"
const POPUP = '.sf-overlay .sf-ov-card'
const LANES = ".sf-col[data-role='omp.live.lanes']"
const STATUS = '.sf.sf-status:not(.transparent)'
const NATIVE = '.sf.sf-card'
// The transcript's banner and notice lines sit on Tern's own window glass, whose opacity the owner picks, so
// they take the floor tint as a strip of glass (padding offset by margin: no reflow). Text inside a pane already
// on the tint stays bare.
const TEXT = '.sf.sf-text, .sf.sf-card.nohead'
const INNER = ".sf-card .sf-text, .sf-ov-card .sf-text, [data-eui] .sf-text, .sf-col[data-role] .sf-text"
const RIMMED = [CARD, EDITOR, POPUP, LANES]
/** Each Glide view and the selector its glass rides on. */
export const GLASS_VIEWS = { cards: CARD, composer: EDITOR, popups: POPUP, lanes: LANES, status: STATUS, native: NATIVE, transcript: '.sf.sf-text' } as const
const after = (sel: readonly string[]) => sel.map(s => `${s}::after`).join(', ')

/** The glass stylesheet for a wallpaper palette; appended to the auto theme's sheet. */
export function glassCss(p: WalPalette): string {
  const shade = mix(p.bg, '#000000', 0.7)
  const vars = `--g-a: ${p.accent}; --g-b: ${p.glow}; --g-shade: ${shade}; --g-glass: ${p.bg}; --g-ease: cubic-bezier(.2, .7, .2, 1)`
  const a = (pct: number) => `color-mix(in srgb, var(--g-a) ${pct}%, transparent)`
  const b = (pct: number) => `color-mix(in srgb, var(--g-b) ${pct}%, transparent)`
  const glass = (pct: number) => `color-mix(in srgb, var(--g-glass) ${pct}%, transparent)`
  const shadow = (pct: number) => `color-mix(in srgb, var(--g-shade) ${pct}%, transparent)`
  const hi = (pct: number) => `color-mix(in srgb, var(--t1) ${pct}%, transparent)`
  const tint = glass(restTint(p))
  const frost = '-webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%)'
  const halo = `0 22px 48px -26px ${shadow(90)}, 0 0 34px -12px ${b(60)}, 0 0 64px -28px ${a(55)}, inset 0 1px 0 ${hi(8)}`
  const haloHot = `0 28px 60px -24px ${shadow(95)}, 0 0 52px -8px ${b(80)}, 0 0 90px -22px ${a(75)}, inset 0 1px 0 ${hi(10)}`
  // Gold on top fading to cyan below, as the film's cards are rimmed. Tern sizes a gradient to its
  // box whatever background-size says, so the hover shimmer breathes the rim rather than sliding it.
  const rim = `linear-gradient(180deg, var(--g-a), ${a(70)} 30%, ${b(70)} 62%, var(--g-b))`
  const mask = '-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude'
  const mote = (size: number, x: number, y: number, c: string) => `radial-gradient(${size * 2}px ${size * 2}px at ${x}% ${y}%, ${c}, ${c} 25%, transparent 70%)`
  const motes = [
    mote(3, 4, 12, 'var(--g-a)'), mote(2.5, 96, 8, 'var(--g-b)'), mote(3.5, 2, 58, b(80)), mote(3, 98, 46, a(90)),
    mote(2.5, 6, 92, a(80)), mote(3, 94, 88, b(85)), mote(2, 12, 34, a(70)), mote(2.5, 89, 26, b(75)),
    mote(2, 9, 74, b(70)), mote(2, 91, 66, a(70)), mote(1.5, 7, 4, b(60)), mote(1.5, 93, 97, a(60)),
    mote(2, 3, 40, a(55)), mote(2, 97, 30, b(55))
  ].join(', ')
  // Sparks sit on the rim line (the layer reaches 6px past the card), clear of the content padding.
  const sparks = [mote(2.5, 28, 2, 'var(--g-a)'), mote(2, 74, 2, 'var(--g-a)'), mote(2.5, 99, 46, 'var(--g-b)'), mote(2, 62, 98, 'var(--g-b)'), mote(1.5, 1, 64, 'var(--g-b)')].join(', ')
  const k = K
  // The kit's and the intent cards' sheets land after this one, so each rule outranks theirs. The intent
  // cards rim the council in a fixed violet; under glass it takes the palette's glow. Its label stays --h-fg
  // so the 11px text keeps AA contrast whatever the wallpaper. Tern's own cards (tool calls, notices) keep
  // their tone tints and take the resting tint as their plain background.
  return `
.sf, [data-eui='card'], .sf-overlay { ${vars}; --sf-card-bg: ${tint}; --pop-bg: ${tint}; --modal-bg: ${tint}; --glass-hi: ${hi(10)}; }
${k}:not([data-eui-popup]) { position: relative; isolation: isolate; background: transparent; overflow: visible; }
${MOTES} { content: ''; position: absolute; inset: -28px -120px; pointer-events: none; z-index: -1; background: ${motes}; opacity: .85; animation: glide-drift 40s steps(200) infinite alternate, glide-twinkle 6s steps(24) infinite alternate; }
@keyframes glide-drift { from { transform: translate(0, 0); } to { transform: translate(-12px, -26px); } }
@keyframes glide-twinkle { from { opacity: .45; } to { opacity: .95; } }
${CARD}, ${EDITOR}, ${POPUP}, ${LANES} { background: ${tint}; ${frost}; box-shadow: ${halo}; transition: transform .2s var(--g-ease), box-shadow .2s var(--g-ease); }
${CARD} { border-color: transparent; border-radius: 16px; }
${LANES} { position: relative; isolation: isolate; padding: 8px 12px; border-radius: 14px; }
${STATUS} { background: ${tint}; ${frost}; box-shadow: inset 0 1px 0 ${hi(10)}, 0 -1px 0 ${a(22)}; }
${NATIVE} { ${frost}; box-shadow: inset 0 0 0 1px ${a(22)}, inset 0 1px 0 ${hi(10)}; }
${POPUP} { box-shadow: ${halo}, 0 0 0 1px ${a(18)}; }
.sf-overlay .sf-ov-dim { background: ${shadow(40)}; }
${after(RIMMED)} { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; z-index: 3; background: ${rim}; ${mask}; opacity: .7; transition: opacity .2s var(--g-ease); }
${EDITOR}::after { opacity: .9; }
.sf-place-dir, .sf-place-sep, .sf-t-dim { color: var(--t3); }
.sf-t-muted { color: var(--t2); }
${TEXT} { background: ${tint}; ${frost}; padding: 6px 10px; margin: -6px -10px; border-radius: 10px; box-shadow: inset 0 0 0 1px ${a(22)}, inset 0 1px 0 ${hi(10)}; }
${INNER} { background: none; padding: 0; margin: 0; border-radius: 0; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; animation: none; }
${CARD}::before { content: ''; position: absolute; inset: -6px; border-radius: inherit; pointer-events: none; z-index: 2; background: ${sparks}; opacity: 0; transform: translateY(4px); transition: opacity .25s var(--g-ease), transform .25s var(--g-ease); }
${CARD}:hover { transform: translateY(-1px); box-shadow: ${haloHot}; }
${EDITOR}:hover { box-shadow: 0 24px 56px -22px ${shadow(95)}, 0 0 38px -10px ${b(75)}, 0 0 20px -8px ${a(60)}, inset 0 1px 0 ${hi(10)}; }
${CARD}:hover::after, ${EDITOR}:hover::after { opacity: 1; animation: glide-shimmer 2.4s ease-in-out infinite alternate; }
${CARD}:hover::before { opacity: 1; transform: translateY(0); }
@keyframes glide-shimmer { from { opacity: .85; } to { opacity: 1; } }
${k} .ih-hero { background: linear-gradient(180deg, ${hi(5)}, transparent), ${glass(26)}; border-color: ${a(22)}; transition: border-color .2s var(--g-ease), box-shadow .2s var(--g-ease); }
${k} .ih-hero:hover { border-color: ${b(45)}; box-shadow: 0 0 22px -12px ${b(70)}, inset 0 1px 0 ${hi(9)}; }
${k} .ih-lane, ${k} .ih-flow, ${k} .ih-host, ${k} .ih-gate, ${k} .ih-budget { background: ${glass(24)}; border-color: ${a(26)}; transition: transform .18s var(--g-ease), border-color .18s, box-shadow .18s; }
${k} .ih-sample { background: ${glass(45)}; border-color: ${a(45)}; color: var(--g-a); }
${k} .ih-lane:hover, ${k} .ih-host:hover, ${k} .ih-gate:hover, ${k} .ih-budget:hover { transform: translateY(-1px); border-color: ${a(60)}; box-shadow: 0 0 14px -6px ${a(60)}; }
${k} .ih-key, ${k} .eu-chip { transition: background-color .18s var(--g-ease), transform .18s var(--g-ease), box-shadow .18s; }
${k} .ih-key:hover, ${k} .eu-chip:hover { background-color: ${a(14)}; transform: translateY(-1px); box-shadow: 0 0 12px -4px ${a(55)}; }
${k} .ih-l-council, ${k} .ih-gate, ${k} .ih-pip { border-color: var(--g-b); }
${k} .ih-l-council { box-shadow: 0 0 0 1px ${b(25)}, 0 0 16px -6px ${b(60)}; }
${k} .ih-flowlink.ih-gated { background: var(--g-b); }
${k} .eu-btn { background: ${glass(45)}; border-color: ${a(30)}; }
${k} .eu-btn:hover { border-color: ${a(70)}; box-shadow: 0 0 16px -6px ${a(70)}; transform: translateY(-1px); }
${k} .eu-btn:active, .sf-act:active { transform: scale(.97); transition-duration: .08s; }
.hermes-press { transition: transform .15s var(--g-ease), background-color .18s, box-shadow .18s; }
.hermes-press:hover { background-color: ${a(16)}; box-shadow: 0 0 14px -6px ${a(70)}; }
@media (prefers-reduced-motion: reduce) {
  ${MOTES}, ${CARD}:hover::after, ${EDITOR}:hover::after { animation: none; }
  ${CARD}:hover, ${k} .ih-lane:hover, ${k} .ih-host:hover, ${k} .ih-gate:hover, ${k} .ih-budget:hover, ${k} .ih-key:hover, ${k} .eu-chip:hover, ${k} .eu-btn:hover { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .sf, [data-eui='card'], .sf-overlay { --sf-card-bg: var(--card); --pop-bg: var(--card); --modal-bg: var(--card); }
  ${CARD}, ${EDITOR}, ${POPUP}, ${LANES}, ${STATUS}, ${NATIVE}, ${TEXT} { background: var(--card); -webkit-backdrop-filter: none; backdrop-filter: none; }
  ${INNER} { background: none; }
}
`
}

/** The playground's sheet, installed for one cycle by `/glide glass demo`. */
export const PLAY_SHEET = 'glide-glass-play'
export const PLAY_SECONDS = 10

/** One playground keyframe: tint opacity (percent), blur (px), saturate (percent), rim and halo glow, mote tiling. */
export interface PlayStop { at: number; tint: number; blur: number; saturate: number; glow: number; motes: number }

/** The cycle: rest, a crisp clear frame, the deepest frost, a warm glow, rest. Tint never under the floor. */
export function playStops(p: WalPalette): PlayStop[] {
  const rest = restTint(p)
  const up = (n: number) => Math.min(100, Math.max(p.floor, n))
  return [
    { at: 0, tint: rest, blur: 22, saturate: 140, glow: 1, motes: 1 },
    { at: 20, tint: up(rest + 10), blur: 8, saturate: 120, glow: 0.5, motes: 1 },
    { at: 50, tint: up(p.floor), blur: 28, saturate: 180, glow: 1.8, motes: 2 },
    { at: 75, tint: up(Math.round((rest + p.floor) / 2) + 4), blur: 16, saturate: 160, glow: 1.3, motes: 1.5 },
    { at: 100, tint: rest, blur: 22, saturate: 140, glow: 1, motes: 1 }
  ]
}

/**
 * The playground: every glass surface sweeps blur 8-28px, saturation 120-180%, its tint, rim glow and mote
 * density over PLAY_SECONDS, then settles back, all in CSS keyframes (no per-frame JS). The values are
 * resolved rgba() rather than color-mix() so every stop interpolates. Reduced motion keeps it still and
 * reduced transparency keeps it opaque.
 */
export function glassPlayCss(p: WalPalette, seconds = PLAY_SECONDS): string {
  const rgba = (hex: string, pct: number) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
    return `rgba(${r}, ${g}, ${bl}, ${Math.round(Math.min(100, pct)) / 100})`
  }
  const shade = mix(p.bg, '#000000', 0.7)
  const stops = playStops(p)
  const frame = (sel: (s: PlayStop) => string) => stops.map(s => `${s.at}% { ${sel(s)} }`).join(' ')
  const glass = (s: PlayStop) => `background-color: ${rgba(p.bg, s.tint)}; -webkit-backdrop-filter: blur(${s.blur}px) saturate(${s.saturate}%); backdrop-filter: blur(${s.blur}px) saturate(${s.saturate}%)`
  const halo = (s: PlayStop) => `box-shadow: 0 22px 48px -26px ${rgba(shade, 90)}, 0 0 ${Math.round(34 * s.glow)}px -12px ${rgba(p.glow, 60 * s.glow)}, 0 0 ${Math.round(64 * s.glow)}px -28px ${rgba(p.accent, 55 * s.glow)}, inset 0 1px 0 ${rgba(p.fg, 8 * s.glow)}`
  const run = (name: string) => `animation: ${name} ${seconds}s cubic-bezier(.45, 0, .55, 1) 1`
  const lit = [CARD, EDITOR, POPUP, LANES].join(', ')
  const all = [lit, STATUS, NATIVE, TEXT, after(RIMMED), MOTES].join(', ')
  return `
@keyframes glide-play { ${frame(s => `${glass(s)}; ${halo(s)}`)} }
@keyframes glide-play-flat { ${frame(glass)} }
@keyframes glide-play-rim { ${frame(s => `opacity: ${Math.min(1, 0.55 + 0.25 * s.glow).toFixed(2)}`)} }
@keyframes glide-play-motes { ${frame(s => `opacity: ${Math.min(1, 0.6 + 0.2 * s.motes).toFixed(2)}; background-size: ${Math.round(100 / s.motes)}% ${Math.round(100 / s.motes)}%`)} }
${lit} { ${run('glide-play')}; }
${STATUS}, ${NATIVE}, ${TEXT} { ${run('glide-play-flat')}; }
${INNER} { animation: none; }
${after(RIMMED)} { ${run('glide-play-rim')}; }
${MOTES} { ${run('glide-play-motes')}; }
@media (prefers-reduced-motion: reduce) { ${all} { animation: none; } }
@media (prefers-reduced-transparency: reduce) { ${all} { animation: none; } }
`
}

