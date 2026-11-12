// Liquid glass for the `auto` theme, as the hackathon film draws Glide: frosted translucent cards
// over the wallpaper, a thin accent→glow gradient rim with a soft halo, dust motes drifting round
// the live cards, and 150-250ms hover lifts. Every color is the wallpaper palette (wal.ts), bound
// once as --g-* variables; the rules below name only those and Tern's own theme variables.
//
// Tern scopes a plugin sheet inside the surface region: a selector naming the region (.sf-region,
// .sf-main, .sf-dock) never matches, so these rules start at its descendants (.sf, the kit's
// [data-eui='card'], omp's roles). A sheet Tern cannot parse wedges the pane, so the sheet keeps to
// syntax the native renderer itself uses (no :scope, no :is, no currentColor in color-mix):
// GLASS_FORBIDDEN lists them and the tests hold the sheet to it.

import { mix } from '../../frontend/src/hermes/theme.js'

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

/** The glass stylesheet for a wallpaper palette; appended to the auto theme's sheet. */
export function glassCss(p: WalPalette): string {
  const shade = mix(p.bg, '#000000', 0.7)
  const vars = `--g-a: ${p.accent}; --g-b: ${p.glow}; --g-shade: ${shade}; --g-glass: ${p.bg}; --g-ease: cubic-bezier(.2, .7, .2, 1)`
  const a = (pct: number) => `color-mix(in srgb, var(--g-a) ${pct}%, transparent)`
  const b = (pct: number) => `color-mix(in srgb, var(--g-b) ${pct}%, transparent)`
  const glass = (pct: number) => `color-mix(in srgb, var(--g-glass) ${pct}%, transparent)`
  const shadow = (pct: number) => `color-mix(in srgb, var(--g-shade) ${pct}%, transparent)`
  const hi = (pct: number) => `color-mix(in srgb, var(--t1) ${pct}%, transparent)`
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
  // The kit's and the intent cards' sheets land after this one, so each rule outranks theirs.
  const k = "[data-eui][data-eui='card']"
  const card = `${k} .eu-card`
  const editor = ".sf-col[data-role^='omp.editor']"
  // The intent cards rim the council in a fixed violet; under glass it takes the palette's glow. Its label stays --h-fg
  // so the 11px text keeps AA contrast whatever the wallpaper.
  return `
.sf, [data-eui='card'] { ${vars}; }
${k}:not([data-eui-popup]) { position: relative; isolation: isolate; background: transparent; overflow: visible; }
${k}:not([data-eui-popup])::before { content: ''; position: absolute; inset: -28px -120px; pointer-events: none; z-index: -1; background: ${motes}; opacity: .85; animation: glide-drift 40s steps(200) infinite alternate, glide-twinkle 6s steps(24) infinite alternate; }
@keyframes glide-drift { from { transform: translate(0, 0); } to { transform: translate(-12px, -26px); } }
@keyframes glide-twinkle { from { opacity: .45; } to { opacity: .95; } }
${card} { background: ${glass(40)}; -webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%); border-color: transparent; border-radius: 16px; box-shadow: 0 22px 48px -26px ${shadow(90)}, 0 0 34px -12px ${b(60)}, 0 0 64px -28px ${a(55)}, inset 0 1px 0 ${hi(8)}; transition: transform .2s var(--g-ease), box-shadow .2s var(--g-ease); }
${card}::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; z-index: 3; background: ${rim}; ${mask}; opacity: .7; transition: opacity .2s var(--g-ease); }
${card}::before { content: ''; position: absolute; inset: -6px; border-radius: inherit; pointer-events: none; z-index: 2; background: ${sparks}; opacity: 0; transform: translateY(4px); transition: opacity .25s var(--g-ease), transform .25s var(--g-ease); }
${card}:hover { transform: translateY(-1px); box-shadow: 0 28px 60px -24px ${shadow(95)}, 0 0 52px -8px ${b(80)}, 0 0 90px -22px ${a(75)}, inset 0 1px 0 ${hi(10)}; }
${card}:hover::after { opacity: 1; animation: glide-shimmer 2.4s ease-in-out infinite alternate; }
${card}:hover::before { opacity: 1; transform: translateY(0); }
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
${editor} { background: ${glass(78)} !important; -webkit-backdrop-filter: blur(24px) saturate(150%) !important; backdrop-filter: blur(24px) saturate(150%) !important; box-shadow: 0 24px 56px -22px ${shadow(95)}, 0 0 36px -12px ${b(65)}, 0 0 64px -28px ${a(50)}, inset 0 1px 0 ${hi(8)} !important; transition: box-shadow .22s var(--g-ease); }
${editor}::after { background: ${rim} !important; opacity: .9; transition: opacity .22s var(--g-ease); }
${editor}:hover { box-shadow: 0 24px 56px -22px ${shadow(95)}, 0 0 38px -10px ${b(75)}, 0 0 20px -8px ${a(60)}, inset 0 1px 0 ${hi(10)} !important; }
${editor}:hover::after { opacity: 1; animation: glide-shimmer 2.4s ease-in-out infinite alternate; }
.hermes-press { transition: transform .15s var(--g-ease), background-color .18s, box-shadow .18s; }
.hermes-press:hover { background-color: ${a(16)}; box-shadow: 0 0 14px -6px ${a(70)}; }
@media (prefers-reduced-motion: reduce) {
  ${k}:not([data-eui-popup])::before, ${card}:hover::after, ${editor}:hover::after { animation: none; }
  ${card}:hover, ${k} .ih-lane:hover, ${k} .ih-host:hover, ${k} .ih-gate:hover, ${k} .ih-budget:hover, ${k} .ih-key:hover, ${k} .eu-chip:hover, ${k} .eu-btn:hover { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  ${card} { background: var(--card); -webkit-backdrop-filter: none; backdrop-filter: none; }
  ${editor} { background: var(--card) !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
}
`
}
