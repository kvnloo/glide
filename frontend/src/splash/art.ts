// Glide's launch picture: a pure function of elapsed time. The thinking orb plays a few of its
// animations, sheds particles that write "glide" in cursive, and settles as the dot of the i, where
// it keeps changing animation until the app is ready. Nothing here owns a clock or a surface.
import { MODE_FRAMES, type OrbState as LibraryState, resolvePreset } from 'thinking-orbs/engine'

/** Picture size in SVG units; the splash scales it to the pane. */
export const ART_W = 360
export const ART_H = 200

// Phase boundaries in milliseconds.
const ORB_END = 1000 // the big orb cycles its animations
const MORPH_END = 2450 // particles have written the word, the orb sits on the i
/** The splash may hand off once the word is written and has had a beat on screen. */
export const SPLASH_INTRO_MS = 2800
export const SPLASH_EXIT_MS = 480
/** Hold frames repeat on this cycle, so a slow start draws a bounded set of distinct frames. */
export const HOLD_CYCLE_MS = 6000

// "glide" in Hershey Script Simplex (A. V. Hershey, U.S. National Bureau of Standards; public
// domain), font units with y up, 100 = ascender. Single strokes, so the word can be written.
const STROKES: readonly (readonly number[])[] = [
  [27.3, 54.5, 24.2, 60.6, 18.2, 63.6, 12.1, 63.6, 6.1, 60.6, 3, 57.6, 0, 51.5, 0, 45.5, 3, 39.4, 9.1, 36.4, 15.2, 36.4, 21.2, 39.4, 24.2, 42.4],
  [30.3, 63.6, 24.2, 42.4, 12.1, 9.1, 9.1, 3, 3, 0, 0, 3, 0, 9.1, 3, 18.2, 12.1, 27.3, 21.2, 33.3, 27.3, 36.4, 36.4, 42.4, 45.5, 51.5],
  [45.5, 51.5, 51.5, 60.6, 60.6, 75.8, 63.6, 81.8, 66.7, 90.9, 66.7, 97, 63.6, 100, 57.6, 97, 54.5, 90.9, 51.5, 78.8, 48.5, 57.6, 48.5, 39.4, 51.5, 36.4, 54.5, 36.4, 60.6, 39.4, 63.6, 42.4, 69.7, 51.5],
  [69.7, 51.5, 75.8, 63.6, 69.7, 45.5, 69.7, 39.4, 72.7, 36.4, 75.8, 36.4, 81.8, 39.4, 84.8, 42.4, 90.9, 51.5],
  [118.2, 54.5, 115.2, 60.6, 109.1, 63.6, 103, 63.6, 97, 60.6, 93.9, 57.6, 90.9, 51.5, 90.9, 45.5, 93.9, 39.4, 100, 36.4, 106.1, 36.4, 112.1, 39.4, 115.2, 45.5, 133.3, 100],
  [121.2, 63.6, 118.2, 48.5, 118.2, 39.4, 121.2, 36.4, 124.2, 36.4, 130.3, 39.4, 133.3, 42.4, 139.4, 51.5],
  [142.4, 42.4, 148.5, 45.5, 151.5, 48.5, 154.5, 54.5, 154.5, 60.6, 151.5, 63.6, 148.5, 63.6, 142.4, 60.6, 139.4, 54.5, 139.4, 45.5, 142.4, 39.4, 148.5, 36.4, 154.5, 36.4, 160.6, 39.4, 163.6, 42.4, 169.7, 51.5]
]
const TITTLE = { x: 80.3, y: 77.3 }

const SCALE = 1.55
const WORD_W = 169.7 * SCALE
const OX = (ART_W - WORD_W) / 2
const OY = (ART_H - 100 * SCALE) / 2 + 6
const px = (x: number) => OX + x * SCALE
const py = (y: number) => OY + (100 - y) * SCALE

interface Pt {
  x: number
  y: number
  /** Arc length from the start of the word. */
  s: number
}

/** Catmull-Rom through each stroke, sampled densely, with one arc length running across the word. */
function sampleWord(): { strokes: Pt[][]; length: number } {
  let s = 0
  const strokes = STROKES.map(flat => {
    const p: { x: number; y: number }[] = []
    for (let i = 0; i + 1 < flat.length; i += 2) p.push({ x: px(flat[i] ?? 0), y: py(flat[i + 1] ?? 0) })
    const at = (j: number) => p[Math.min(p.length - 1, Math.max(0, j))] ?? { x: 0, y: 0 }
    const out: Pt[] = []
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
      for (let k = i === 0 ? 0 : 1; k <= 6; k++) {
        const t = k / 6, t2 = t * t, t3 = t2 * t
        const at = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
        const x = at(p0.x, p1.x, p2.x, p3.x), y = at(p0.y, p1.y, p2.y, p3.y)
        const prev = out.at(-1)
        if (prev) s += Math.hypot(x - prev.x, y - prev.y)
        out.push({ x, y, s })
      }
    }
    return out
  })
  return { strokes, length: s }
}

const WORD = sampleWord()

/** The point at arc length `s` along the word. */
function pointAt(s: number): { x: number; y: number } {
  for (const stroke of WORD.strokes) {
    if (s > (stroke.at(-1)?.s ?? -1)) continue
    let a: Pt | undefined
    for (const b of stroke) {
      if (a && s <= b.s) {
        const f = b.s === a.s ? 0 : Math.max(0, (s - a.s) / (b.s - a.s))
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      }
      a = b
    }
  }
  const end = WORD.strokes.at(-1)?.at(-1)
  return { x: end?.x ?? 0, y: end?.y ?? 0 }
}

/** SVG path data for the word between arc lengths `from` and `to`. */
function wordPath(from: number, to: number): string {
  const n = (v: number) => v.toFixed(1)
  let d = ''
  for (const stroke of WORD.strokes) {
    const first = stroke[0]
    if (!first || first.s >= to || (stroke.at(-1)?.s ?? 0) <= from) continue
    let open = false
    for (const p of stroke) {
      if (p.s < from) continue
      if (!open) {
        // A stroke's first point shares its arc length with the previous stroke's last one.
        const q = from <= first.s ? first : pointAt(from)
        d += `M${n(q.x)} ${n(q.y)}`
        open = true
      }
      if (p.s > to) {
        const q = pointAt(to)
        d += `L${n(q.x)} ${n(q.y)}`
        break
      }
      d += `L${n(p.x)} ${n(p.y)}`
    }
  }
  return d
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface ArtInk {
  ink: string
  gold: string
  dark: boolean
}

export const artInk = (dark: boolean): ArtInk => (dark ? { ink: '#ece8e1', gold: '#d7b986', dark } : { ink: '#1d1b18', gold: '#8a6a2f', dark })

/** The orb animations the splash steps through: the big orb's opening, then the tittle's loop. */
const OPENING: readonly LibraryState[] = ['working', 'solving', 'weaving']
const LOOP: readonly LibraryState[] = ['composing', 'searching', 'connecting', 'listening']

/** Orb dots for one library state, centred on (cx, cy) at `size` px, faded by `alpha`. */
function orbMarks(state: LibraryState, seconds: number, cx: number, cy: number, size: number, alpha: number, ink: ArtInk): string {
  if (alpha <= 0.01) return ''
  const preset = resolvePreset(state, 64)
  const frame = MODE_FRAMES[preset.mode](64, seconds * preset.speed, preset.opts)
  const k = size / 64
  const grey = (white: number) => {
    const v = Math.round((ink.dark ? 1 - clamp(white) : clamp(white)) * 255)
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`
  }
  const n = (v: number) => v.toFixed(1)
  const out: string[] = []
  for (const l of frame.lines) {
    out.push(`<line x1="${n(cx + (l.x1 - 32) * k)}" y1="${n(cy + (l.y1 - 32) * k)}" x2="${n(cx + (l.x2 - 32) * k)}" y2="${n(cy + (l.y2 - 32) * k)}" stroke="${grey(l.white)}" stroke-width="${n(l.w * k)}" stroke-opacity="${((l.a ?? 1) * alpha).toFixed(2)}"/>`)
  }
  for (const d of frame.dots) {
    out.push(`<circle cx="${n(cx + (d.x - 32) * k)}" cy="${n(cy + (d.y - 32) * k)}" r="${n(Math.max(0.3, d.r * k))}" fill="${grey(d.white)}" fill-opacity="${((d.a ?? 1) * alpha).toFixed(2)}"/>`)
  }
  return out.join('')
}

/** Two library states crossfading over the last `fade` ms of each `slot` ms step. */
function cycleOrb(states: readonly LibraryState[], ms: number, slot: number, fade: number, cx: number, cy: number, size: number, alpha: number, ink: ArtInk): string {
  const i = Math.floor(ms / slot)
  const into = ms - i * slot
  const mix = clamp((into - (slot - fade)) / fade)
  const a = states[i % states.length] ?? 'working', b = states[(i + 1) % states.length] ?? 'working'
  return orbMarks(a, ms / 1000, cx, cy, size, alpha * (1 - mix), ink) + orbMarks(b, ms / 1000, cx, cy, size, alpha * mix, ink)
}

// Particles: each one leaves the orb at a pseudo-random spot and lands at its place along the word.
const PARTICLES = 96
const FLIGHT_MS = 420
const LAUNCH_SPREAD_MS = 900
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const BIG = { x: ART_W / 2, y: ART_H / 2, size: 104 }
const SMALL = { x: px(TITTLE.x), y: py(TITTLE.y) - 1, size: 20 }
const STROKE_W = 2.6

/**
 * One frame at `ms` since the splash opened. `exitMs` is the time the exit began (null while it plays
 * or holds). Hold frames repeat every HOLD_CYCLE_MS.
 */
export function splashSvg(ms: number, ink: ArtInk, exitMs: number | null = null, reduce = false): string {
  const parts: string[] = []
  const t = reduce ? Math.max(ms, MORPH_END) : ms
  const L = WORD.length

  // The orb: big and centred, then gliding to the i.
  const move = ease(clamp((t - ORB_END) / 900))
  const ox = lerp(BIG.x, SMALL.x, move), oy = lerp(BIG.y, SMALL.y, move), size = lerp(BIG.size, SMALL.size, move)
  const appear = ease(clamp(t / 320))
  if (t < MORPH_END) {
    parts.push(cycleOrb(OPENING, t, 380, 140, ox, oy, size * lerp(0.7, 1, appear), appear, ink))
  } else {
    const hold = reduce ? 0 : (t - MORPH_END) % HOLD_CYCLE_MS
    parts.push(cycleOrb(LOOP, hold, HOLD_CYCLE_MS / LOOP.length, 260, SMALL.x, SMALL.y, SMALL.size, 1, ink))
  }

  // The written word: revealed behind the particles as they land.
  const written = clamp((t - ORB_END - FLIGHT_MS) / LAUNCH_SPREAD_MS) * L
  if (written > 0) {
    parts.push(`<path d="${wordPath(0, written)}" fill="none" stroke="${ink.ink}" stroke-width="${STROKE_W}" stroke-linecap="round" stroke-linejoin="round"/>`)
  }

  // Particles in flight (only during the morph).
  if (t > ORB_END && t < MORPH_END) {
    for (let k = 0; k < PARTICLES; k++) {
      const u = k / (PARTICLES - 1)
      const p = (t - ORB_END - u * LAUNCH_SPREAD_MS) / FLIGHT_MS
      if (p <= 0 || p >= 1.25) continue
      const f = ease(clamp(p))
      const ang = hash(k) * Math.PI * 2, rad = Math.sqrt(hash(k + 99)) * size * 0.18
      const sx = ox + Math.cos(ang) * rad, sy = oy + Math.sin(ang) * rad
      const end = pointAt(u * L)
      // Swoop: the control point lifts above the straight line, so particles arc onto the word.
      const cx = (sx + end.x) / 2 + (hash(k + 7) - 0.5) * 16, cy = Math.min(sy, end.y) - 16 - hash(k + 3) * 10
      const x = (1 - f) ** 2 * sx + 2 * (1 - f) * f * cx + f * f * end.x
      const y = (1 - f) ** 2 * sy + 2 * (1 - f) * f * cy + f * f * end.y
      const a = p < 1 ? 1 : 1 - (p - 1) / 0.25
      const r = lerp(0.9, STROKE_W / 2, f)
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${k % 7 === 0 ? ink.gold : ink.ink}" fill-opacity="${a.toFixed(2)}"/>`)
    }
  }

  // Hold: a short gold glint glides along the word twice a cycle.
  if (t >= MORPH_END && !reduce) {
    const g = ((t - MORPH_END) % (HOLD_CYCLE_MS / 2)) / (HOLD_CYCLE_MS / 2)
    const head = g * L * 1.3
    if (head - L * 0.08 < L) {
      parts.push(`<path d="${wordPath(Math.max(0, head - L * 0.08), Math.min(L, head))}" fill="none" stroke="${ink.gold}" stroke-width="${STROKE_W + 0.4}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/>`)
    }
  }

  const leaving = exitMs === null ? 0 : ease(clamp((ms - exitMs) / SPLASH_EXIT_MS))
  const body = parts.join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W * 2}" height="${ART_H * 2}" viewBox="0 0 ${ART_W} ${ART_H}"><g opacity="${(1 - leaving).toFixed(3)}" transform="translate(0 ${(-8 * leaving).toFixed(2)})">${body}</g></svg>`
}
