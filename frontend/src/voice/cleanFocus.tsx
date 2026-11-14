// `/glide focus clean`: during a deep-work block the pane drops its transcript, cards and dock, and Tern's
// glass shows only the thinking orb, centred and slowly pulsing, inside the block's ring timer. The orb is
// the library orb (orbit.ts orbMarks); its ink drifts from the palette's accent toward its partner hue and
// sits further along that ramp the busier the agent is. Only the ring glows (owner rule: glow is the ring's
// alone). Any key, End block, or the block running out brings the normal view back.
import { html, type JSX, type Session, type Surface } from '@stencil-hq/tern'

import { mix } from '../hermes/theme.js'
import { LIBRARY_STATE, type OrbScene, type OrbState, ThinkingOrb } from '../chrome/orb.js'
import { DASH, MONO, TYPE } from '../../../glide/frontend/tokens.js'
import { ROLE_RAMP } from '../../../glide/frontend/orbitTokens.js'
import type { WalPalette } from '../../../glide/frontend/wal.js'
import { focusBlock, orbMarks } from './orbit.js'

/** The clean view's layer node; its two images are animated and redrawn under it. */
export const CLEAN_ID = 'layer.clean'
export const CLEAN_SHEET = 'glide-clean'

/** Whether the clean view is up. It only stays up while a block runs. */
export const cleanFocus = {
  on: false,
  /** Shows the clean view; false (and nothing changes) without a running block. */
  enter(now = Date.now()): boolean {
    this.on = focusBlock.active(now)
    return this.on
  },
  exit() {
    this.on = false
  },
  /** Per frame: a block that ran out takes the clean view down with it. */
  shown(now = Date.now()): boolean {
    if (this.on && !focusBlock.active(now)) this.on = false
    return this.on
  }
}

/** The two inks the orb drifts between, and the ink a failure wears. */
export interface CleanPalette { readonly accent: string; readonly alt: string; readonly error: string; readonly bg: string }

/** Dash's black and gold, with the orbit's teal as the partner hue: the palette without a wallpaper one. */
export const DASH_CLEAN: CleanPalette = { accent: DASH.gold, alt: ROLE_RAMP.small.dark, error: DASH.error, bg: DASH.bg }

/** Hue in degrees, saturation and value of a #rrggbb ink. */
function hueSat(hex: string): [number, number, number] {
  const ch = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  const r = ch(1), g = ch(3), b = ch(5)
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, max === 0 ? 0 : d / max, max]
}

/** The palette ink farthest round the hue wheel from the accent (among bright, coloured ones), so the drift reads. */
export function partnerHue(accent: string, inks: readonly string[]): string | undefined {
  const [a] = hueSat(accent)
  let best: string | undefined, far = 40
  for (const ink of inks) {
    if (!/^#[0-9a-f]{6}$/i.test(ink)) continue
    const [h, s, v] = hueSat(ink)
    const d = Math.min(Math.abs(h - a), 360 - Math.abs(h - a))
    if (s >= 0.25 && v >= 0.45 && d > far) { far = d; best = ink }
  }
  return best
}

/** The theme's palette when it has one (wallpaper or Dash): accent to its most distinct partner hue; else Dash's. */
export const cleanPalette = (wal: Pick<WalPalette, 'accent' | 'glow' | 'error' | 'bg' | 'success' | 'layers' | 'samples'> | undefined): CleanPalette =>
  wal ? { accent: wal.accent, alt: partnerHue(wal.accent, [wal.glow, ...wal.layers, wal.success, ...wal.samples]) ?? DASH_CLEAN.alt, error: wal.error, bg: wal.bg } : DASH_CLEAN


/** How far along accent -> alt each agent state sits: resting gold, thinking halfway, a running tool at the far hue. */
export const STATE_HUE: Readonly<Record<OrbState, number>> = {
  idle: 0, waiting: 0, listening: 0.3, speaking: 0.4, thinking: 0.55, composing: 0.75, working: 1, error: 0
}

/** The cached cycle: the drift and the pulse both divide it, so the 30 fps loop is seamless. */
export const CLEAN_CYCLE = 9.6
const DRIFT = 0.4
const PULSE = 0.045
const PULSE_S = 4.8

/** The orb's ink at `seconds`: its state's place on the ramp, drifting slowly either side of it. */
export function cleanInk(p: CleanPalette, state: OrbState, seconds: number, reduce = false): string {
  if (state === 'error') return p.error
  const base = STATE_HUE[state]
  const drift = reduce ? 0 : DRIFT * Math.sin((2 * Math.PI * seconds) / CLEAN_CYCLE)
  // Rest drifts up from the accent, a running tool down from the alt; the middle states swing both ways.
  const t = Math.min(1, Math.max(0, base + (base <= 0 ? Math.abs(drift) : base >= 1 ? -Math.abs(drift) : drift)))
  return mix(p.accent, p.alt, t)
}

/** The breathing scale at `seconds`: one slow swell per 4.8 s, none under reduced motion. */
export const cleanPulse = (seconds: number, reduce = false) => (reduce ? 1 : 1 + PULSE * Math.sin((2 * Math.PI * seconds) / PULSE_S))

const n = (v: number) => v.toFixed(1)
const SOURCE = 64
/** The orb image's size in px, and the ring's: the orb sits inside the ring with room to breathe. */
export const CLEAN_ORB = 200
export const CLEAN_RING = 300

/** One frame of the clean orb: the library frame for `state`, inked along the palette ramp, nearer marks brighter. */
export function cleanOrbSvg(p: CleanPalette, state: OrbState, seconds: number, reduce = false): string {
  const hue = cleanInk(p, state, seconds, reduce)
  const animated = !reduce && state !== 'idle' && state !== 'waiting' && state !== 'error'
  const body = orbMarks(LIBRARY_STATE[state], seconds, animated, white => mix(hue, p.bg, Math.min(1, Math.max(0, white)) * 0.55))
  const k = cleanPulse(seconds, reduce)
  const c = SOURCE / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CLEAN_ORB}" height="${CLEAN_ORB}" viewBox="0 0 ${SOURCE} ${SOURCE}"><g transform="translate(${n(c)} ${n(c)}) scale(${k.toFixed(4)}) translate(${n(-c)} ${n(-c)})">${body}</g></svg>`
}

/** The orb as a ThinkingOrb scene: it always moves (the pulse and drift), so even a resting orb breathes. */
export function cleanScene(palette: () => CleanPalette): OrbScene {
  return {
    w: CLEAN_ORB,
    h: CLEAN_ORB,
    key: () => { const p = palette(); return `${p.accent}:${p.alt}:${p.error}:${p.bg}` },
    svg: (state, seconds, _dark, reduce) => cleanOrbSvg(palette(), state, seconds, reduce)
  }
}

/**
 * The ring timer: the share of the block still left, from twelve o'clock, in the accent. Its glow is a few
 * wider, fainter strokes of the same ink under the arc (no filter: Tern paints SVG blobs as plain images, so
 * the inks are literal colours too).
 */
export function cleanRingSvg(p: CleanPalette, left: number, total: number, track: string): string {
  const s = CLEAN_RING, c = s / 2, r = c - 16, len = 2 * Math.PI * r
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  const arc = (w: number, a: number) => `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="round" stroke-dasharray="${n(len * frac)} ${n(len)}" transform="rotate(-90 ${c} ${c})"/>`
  const glow = frac > 0 ? [arc(22, 0.06), arc(15, 0.1), arc(10, 0.16)].join('') + arc(5, 1) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-opacity="0.22" stroke-width="5"/>${glow}</svg>`
}

/** Centres the ring on the pane and the orb in the ring; nothing else is drawn, so Tern's glass shows round it. */
export const CLEAN_CSS = `
.glide-clean { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: transparent; pointer-events: none; }
.glide-clean-ring { position: relative; width: ${CLEAN_RING}px; height: ${CLEAN_RING}px; }
.glide-clean-ring > * { position: absolute; left: 0; top: 0; }
.glide-clean-orb { position: absolute; left: ${(CLEAN_RING - CLEAN_ORB) / 2}px; top: ${(CLEAN_RING - CLEAN_ORB) / 2}px; width: ${CLEAN_ORB}px; height: ${CLEAN_ORB}px; }
.glide-clean-left { font: 500 ${TYPE.small}px/1.4 ${MONO}; letter-spacing: .08em; opacity: .72; }
`

/** The whole clean view: the ring with the orb in it and the minutes left under it. */
export function cleanNode(ring: { blob: string }, orb: { blob?: string; alt?: string }, left: number): JSX.Element {
  return (
    <html.div class="glide-clean" key={CLEAN_ID.slice('layer.'.length)} role="glide.clean">
      <html.div class="glide-clean-ring" key="ring">
        <image key="track" role="glide.clean.ring" blob={ring.blob} alt={`${left} min left`} w={CLEAN_RING} h={CLEAN_RING} />
        <html.div class="glide-clean-orb" key="orb">
          <image key="img" role="glide.clean.orb" {...orb} w={CLEAN_ORB} h={CLEAN_ORB} />
        </html.div>
      </html.div>
      <html.span class="glide-clean-left" key="left" text={`${left} min left`} />
    </html.div>
  )
}

const ORB_NODE = `${CLEAN_ID}.ring.orb.img`
/** The ring redraws on the minute; a block that runs out takes the view down on the next tick. */
const TICK_MS = 15_000

/** The clean view's animators: the orb (a ThinkingOrb on the clean scene), the ring's blob and the hiding sheet. */
export class CleanView {
  readonly #tern: Session
  #surface: Surface
  readonly #palette: () => CleanPalette
  readonly #changed: () => void
  #orb: ThinkingOrb | undefined
  #state: OrbState = 'idle'
  #reduce: boolean
  #sheet = ''
  #ring = { key: '', blob: '' }
  #timer: NodeJS.Timeout | undefined

  constructor(tern: Session, surface: Surface, palette: () => CleanPalette, changed: () => void) {
    this.#tern = tern
    this.#surface = surface
    this.#palette = palette
    this.#changed = changed
    this.#reduce = Boolean(tern.caps.reduceMotion)
  }

  /** A recovered surface: fresh animator and the sheet sent again. */
  surface(surface: Surface) {
    this.#orb?.close()
    this.#orb = undefined
    this.#surface = surface
    this.#sheet = ''
  }

  /** The agent's state this frame (idle, thinking, tool running, done). */
  update(state: OrbState) {
    this.#state = state
  }

  /** The layer while the clean view is up (starting its animator), else null (stopping it and showing the pane). */
  node(now = Date.now()): JSX.Element | null {
    const on = cleanFocus.shown(now)
    this.#style(on ? CLEAN_CSS : '')
    if (!on) {
      this.#stop()
      return null
    }
    if (!this.#orb) {
      this.#orb = new ThinkingOrb(this.#tern, this.#surface, { node: ORB_NODE, label: 'Hermes agent', scene: cleanScene(this.#palette) })
      this.#orb.environment({ reduce: this.#reduce })
    }
    this.#orb.update(this.#state)
    if (!this.#timer) {
      this.#timer = setInterval(() => this.#changed(), TICK_MS)
      this.#timer.unref()
    }
    const left = focusBlock.left(now)
    const p = this.#palette()
    const key = `${left}:${focusBlock.minutes}:${p.accent}:${p.bg}`
    if (key !== this.#ring.key) {
      this.#ring = { key, blob: this.#tern.blob(Buffer.from(cleanRingSvg(p, left, focusBlock.minutes, p.accent)), 'image/svg+xml') }
    }
    return cleanNode(this.#ring, this.#orb.props(), left)
  }

  close() {
    this.#stop()
  }

  #style(css: string) {
    if (css !== this.#sheet && !this.#surface.closed) {
      this.#sheet = css
      this.#surface.stylesheet(CLEAN_SHEET, css)
    }
  }

  #stop() {
    this.#orb?.close()
    this.#orb = undefined
    clearInterval(this.#timer)
    this.#timer = undefined
  }
}
