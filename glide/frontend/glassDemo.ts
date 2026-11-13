// /glide glass playground. This is the only Glide surface that may cast a coloured glow.
// An integrator calls openGlassDemo from GlideHost.glassDemo and supplies the real apply callback.
// The sample is synthetic and sits on a striped swatch so frost is visible. Strength thins the tint from
// opaque (0%) to the contrast-safe floor (100%) and grows the glow; text never drops below AA.
import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import { contrastRatio, mix } from '../../frontend/src/hermes/theme.js'
import { nativeOverlayKey } from '../../frontend/src/overlays/identity.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import { euiPopupNode } from '../../frontend/src/view/euiCard.js'

import type { CouncilHost } from './councilPopup.js'
import { SATURATE_STEPS, saturateHex, tintFloor } from './glass.js'
import { DASH, GOLD, MONO, NIGHT, RADIUS, SERIF, TRACK, TYPE } from './tokens.js'
import type { WalPalette } from './wal.js'

export const GLASS_STRENGTHS = [0, 40, 80, 100] as const
export type GlassStrength = (typeof GLASS_STRENGTHS)[number]
export const GLASS_TRANSITION_MS = 240
export const USE_STRENGTH_ID = 1
export const STRENGTH_ID_BASE = 10

const APP = 'glide'
const INKS = [NIGHT.text, NIGHT.text2, NIGHT.text3, NIGHT.agree] as const
const AA = 4.5
const rgba = (hex: string, alpha: number): string => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${rgb.join(',')},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
}
const samplesFor = (palette: WalPalette): string[] =>
  [...new Set([...palette.samples, DASH.bg, DASH.fg, GOLD.fill])]
/** The synthetic backdrop the sample frosts: transcript-like lines and one gold dot, crisp enough that
 * blur and tint read at a glance, quiet enough not to outshout the card. */
const SWATCH = [
  `radial-gradient(circle at 82% 34%,${GOLD.fill} 0 18px,transparent 19px)`,
  `repeating-linear-gradient(180deg,${rgba(DASH.fg, 0.42)} 0 2px,transparent 2px 11px)`,
  DASH.bg
].join(',')

/** A fixed tint floor across the whole transition. Strength never lowers text contrast to sell transparency. */
export function glassDemoTint(palette: WalPalette): number {
  return Math.max(82, tintFloor(INKS, DASH.bg, samplesFor(palette), SATURATE_STEPS))
}

export interface GlassDemoMeasurement {
  readonly strength: GlassStrength
  readonly tint: number
  readonly blur: number
  readonly saturate: number
  readonly worstContrast: number
}

/** Calculates the worst text contrast across every wallpaper sample and intervening saturation stop.
 * Includes the actual gold action ink on its opaque fill; a two-decimal readout rounds DOWN. */
export function measureGlassDemo(palette: WalPalette, strength: GlassStrength, opaque = false): GlassDemoMeasurement {
  const tint = opaque ? 100 : Math.round(100 - (100 - glassDemoTint(palette)) * strength / 100)
  const blur = Math.round(22 * strength / 100)
  const saturate = 1 + 0.4 * strength / 100
  const steps = [...new Set([1, ...SATURATE_STEPS.filter(s => s <= saturate), saturate])]
  const textRatios = samplesFor(palette).flatMap(wall => steps.flatMap(step => {
    const backdrop = mix(saturateHex(wall, step), DASH.bg, tint / 100)
    return INKS.map(ink => contrastRatio(ink, backdrop) ?? 0)
  }))
  const worst = Math.min(...textRatios, contrastRatio(GOLD.ink, GOLD.fill) ?? 0)
  return {
    strength, tint, blur, saturate: Math.round(saturate * 100),
    worstContrast: Math.floor((worst + Number.EPSILON) * 100) / 100
  }
}

function mediaMatches(query: string): boolean {
  try {
    const match = (globalThis as { matchMedia?: (q: string) => { matches: boolean } }).matchMedia
    return match?.(query).matches ?? false
  } catch {
    return false
  }
}

export interface GlassDemoViewOptions {
  /** Optional overrides for headless shots and hosts without matchMedia. */
  readonly reducedMotion?: boolean
  readonly reducedTransparency?: boolean
}

const text = (value: string): EuiNode => ({ t: 'text', text: value })

/** One card at one of four stops. All colours, type, tracking and radii are design tokens. */
export function glassDemoCard(palette: WalPalette, strength: GlassStrength, options: GlassDemoViewOptions = {}): EuiNode {
  let next = 100
  const el = (tag: string, style: string, kids: readonly EuiNode[], attrs: Record<string, string> = {}, id?: number): EuiNode => ({
    t: 'el', tag, id: id ?? next++, cls: '', style, attrs, click: id !== undefined, kids
  })
  const reducedMotion = options.reducedMotion ?? mediaMatches('(prefers-reduced-motion: reduce)')
  const opaque = options.reducedTransparency ?? mediaMatches('(prefers-reduced-transparency: reduce)')
  const m = measureGlassDemo(palette, strength, opaque)
  const transition = reducedMotion ? 'none' : `background-color ${GLASS_TRANSITION_MS}ms ease, box-shadow ${GLASS_TRANSITION_MS}ms ease, backdrop-filter ${GLASS_TRANSITION_MS}ms ease, -webkit-backdrop-filter ${GLASS_TRANSITION_MS}ms ease`
  // The halo appears only in this DEMO, and never carries text or the action's gold hierarchy.
  const halo = strength === 0 || opaque ? '' :
    `, 0 0 ${Math.round(strength * 0.3)}px ${Math.round(strength * 0.03)}px ${rgba(palette.glow, strength / 100 * 0.5)}`
  const sampleStyle = [
    'display:flex;flex-direction:column;gap:8px;min-width:0;padding:14px',
    `border-radius:${RADIUS.tile}px;border:1px solid ${NIGHT.borderStrong}`,
    `background-color:${rgba(DASH.bg, m.tint / 100)}`,
    opaque ? 'backdrop-filter:none;-webkit-backdrop-filter:none'
      : `backdrop-filter:blur(${m.blur}px) saturate(${m.saturate}%);-webkit-backdrop-filter:blur(${m.blur}px) saturate(${m.saturate}%)`,
    `box-shadow:inset 0 1px 0 ${rgba(DASH.fg, 0.12)},0 12px 28px -18px ${rgba(DASH.bg, 0.9)}${halo}`,
    `transition:${transition}`
  ].join(';')
  const label = `font-family:${MONO};font-size:${TYPE.label}px;letter-spacing:${TRACK.caps};color:${NIGHT.text3}`
  const buttons = GLASS_STRENGTHS.map((value, i) => {
    const selected = value === strength
    return el('button', [
      'flex:0 0 auto;min-width:58px;min-height:44px;padding:7px 12px',
      `border-radius:${RADIUS.chip}px;border:1px solid ${selected ? NIGHT.text2 : NIGHT.borderStrong}`,
      `background-color:${selected ? rgba(DASH.fg, 0.11) : 'transparent'};color:${NIGHT.text}`,
      `font-family:${MONO};font-size:${TYPE.small}px;cursor:pointer;transition:${reducedMotion ? 'none' : `background-color ${GLASS_TRANSITION_MS}ms ease`}`
    ].join(';'), [text(`${value}%`)], {
      'data-glass-strength': String(value),
      'aria-pressed': String(selected),
      'aria-label': `Preview glass at ${value} percent`
    }, STRENGTH_ID_BASE + i)
  })
  const readout = el('div', 'display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 10px', [
    el('span', label, [text('WORST TEXT CONTRAST')]),
    el('span', `font-family:${MONO};font-size:${TYPE.body}px;color:${NIGHT.text}`,
      [text(`${m.worstContrast.toFixed(2)}:1 · ${m.worstContrast >= AA ? 'AA' : 'BELOW AA'}`)],
      { 'data-glass-contrast': m.worstContrast.toFixed(2), 'aria-live': 'polite' })
  ])
  const sample = el('div', sampleStyle, [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px', [
      el('span', label, [text('FOCUS BRIEF')]),
      el('span', `font-family:${MONO};font-size:${TYPE.label}px;letter-spacing:${TRACK.caps};color:${NIGHT.agree}`,
        [text('READY')])
    ]),
    el('span', `font-family:${SERIF};font-size:${TYPE.name}px;color:${NIGHT.text};line-height:1.2`,
      [text('One clear next step')]),
    el('p', `margin:0;max-width:72ch;font-size:${TYPE.body}px;line-height:1.5;color:${NIGHT.text2}`,
      [text('The small lane prepared a sample summary. Review the brief before sharing it.')])
  ], { 'data-glass-sample': 'true', 'data-glass-active': String(strength) })
  const swatch = el('div', `padding:18px;border-radius:${RADIUS.tile}px;background:${SWATCH}`, [sample], { 'data-glass-swatch': 'true' })

  return el('div', '', [
    el('div', 'display:flex;align-items:center;gap:8px;height:24px;min-width:0;white-space:nowrap;overflow:hidden', [
      el('span', `font-weight:500;font-size:${TYPE.body}px;color:${NIGHT.text2}`, [text('Glide')]),
      el('span', `font-weight:400;font-size:${TYPE.body}px;color:${NIGHT.text};overflow:hidden;text-overflow:ellipsis`,
        [text('· Glass playground')])
    ]),
    el('section', [
      'display:flex;flex-direction:column;gap:12px;min-width:0;padding:14px',
      `border-radius:${RADIUS.tile}px;border:1px solid var(--l3);background-color:${DASH.bg};color:${NIGHT.text}`
    ].join(';'), [
      el('div', 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap', [
        el('span', `font-family:${SERIF};font-size:${TYPE.title}px;color:${NIGHT.text}`,
          [text('Glass at a glance')]),
        el('span', `padding:3px 9px;border:1px solid ${NIGHT.agree};border-radius:${RADIUS.pill}px;font-family:${MONO};font-size:${TYPE.label}px;letter-spacing:${TRACK.caps};color:${NIGHT.agree}`,
          [text('DEMO')], { 'data-glass-demo': 'true' })
      ]),
      swatch,
      el('div', 'display:flex;flex-direction:column;gap:8px', [
        el('span', `font-size:${TYPE.body}px;color:${NIGHT.text2}`, [text(`Glass strength · ${strength}%`)]),
        el('div', 'display:flex;flex-wrap:wrap;gap:8px', buttons, { role: 'group', 'aria-label': 'Preview glass strength' })
      ]),
      readout,
      el('p', `margin:0;max-width:72ch;font-size:${TYPE.meta}px;color:${NIGHT.text3}`,
        [text('The tint stays readable on bright wallpaper. Glow is demo-only.')]),
      el('div', 'display:flex;justify-content:flex-end', [
        el('button', [
          'width:max-content;min-width:160px;min-height:44px;padding:7px 16px;cursor:pointer',
          `border-radius:${RADIUS.tile}px;border:1px solid ${GOLD.rim};background-color:${GOLD.fill}`,
          `color:${GOLD.ink};font-family:${SERIF};font-size:${TYPE.name}px`
        ].join(';'), [text('Use this strength')], { 'data-glass-use': String(strength) }, USE_STRENGTH_ID)
      ])
    ], { 'data-glass-playground': 'true' })
  ])
}

/** Opens the real Tern popup. Only Use invokes onUse; preview choices do not mutate settings.
 * Integration: call openGlassDemo(host, palette, applyStrength) from GlideHost.glassDemo. */
export function openGlassDemo(
  host: CouncilHost,
  palette: WalPalette,
  onUse: (strength: GlassStrength) => void,
  options: GlassDemoViewOptions & { readonly startStrength?: GlassStrength } = {}
): Overlay | undefined {
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('The glass playground needs a pane with ephemeral-ui cards', 'warning')
    return undefined
  }
  let selected: GlassStrength = options.startStrength ?? 0
  const move = (direction: number) => {
    const idx = GLASS_STRENGTHS.indexOf(selected)
    selected = GLASS_STRENGTHS[Math.max(0, Math.min(GLASS_STRENGTHS.length - 1, idx + direction))] ?? selected
    host.changed()
  }
  const overlay: Overlay = {
    key: 'glide-glass-demo',
    modal: true,
    focus: () => null,
    node: id => euiPopupNode(nativeOverlayKey(id), 'Glide · Glass playground · demo', {
      spec: { kind: 'glass-demo', app: APP }, app: APP, label: 'Glass playground', identity: 'glass-demo',
      node: glassDemoCard(palette, selected, options),
      activate: n => {
        if (n >= STRENGTH_ID_BASE && n < STRENGTH_ID_BASE + GLASS_STRENGTHS.length) {
          selected = GLASS_STRENGTHS[n - STRENGTH_ID_BASE] ?? selected
          host.changed()
        } else if (n === USE_STRENGTH_ID) {
          apply()
        }
      }
    }, eui),
    onKey: key => {
      if (key.name === 'escape') host.close(overlay)
      else if (key.name === 'left') move(-1)
      else if (key.name === 'right') move(1)
      else if (key.name === 'enter') apply()
      return true
    }
  }
  const apply = () => {
    try {
      onUse(selected)
      host.close(overlay)
    } catch (error) {
      host.transcript.notice(`Could not apply glass strength: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }
  host.open(overlay)
  return overlay
}
