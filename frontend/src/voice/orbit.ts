// FOCUS-mode lane orbit: while a /glide focus block runs and live voice is on, the call's helper lanes
// circle the voice orb as tinted planets on upright, tinted tracks, all drawn into one SVG per frame around the
// thinking-orbs engine's voice orb. A thinking lane wears a halo, and a dead lane is parked at the top of its
// dashed track as a red struck-through ring, never hidden. Reduced motion draws fixed seats down the front half.
import { MODE_FRAMES, type OrbState as LibraryState, resolvePreset } from 'thinking-orbs/engine'

import { LIBRARY_STATE, type OrbState } from '../chrome/orb.js'

/** Orbit radius per role (viewBox units): fast inner, council outer, one track per lane. */
const ORBIT_R: Readonly<Record<string, number>> = { fast: 46, small: 62, large: 78, council: 94 }
const FALLBACK_R = 70

/** Each role's planet and track tint (council keeps its lapis seat colour), deeper on a light theme for contrast. */
// One warm-to-cool ramp, read inside out: fast is a hot amber spark, small a cool teal, large a deep violet
// and council the lapis seat colour. Same lightness band, so no planet shouts over another.
export const ROLE_TINT: Readonly<Record<string, string>> = {
  fast: '#f2b24c',
  small: '#3fc8b4',
  large: '#a98bf5',
  council: '#5aa7ff'
}
const ROLE_TINT_LIGHT: Readonly<Record<string, string>> = {
  fast: '#c47a12',
  small: '#0f8a7a',
  large: '#6a4fc4',
  council: '#1f6fd6'
}
export const tint = (role: string, dark: boolean) => (dark ? ROLE_TINT : ROLE_TINT_LIGHT)[role] ?? (dark ? '#aaaaaa' : '#555555')
/** A dead lane's mark: a red hollow ring struck through. */
export const deadTint = (dark: boolean) => (dark ? '#ff6b6b' : '#c62828')

// The cached cycle is 9.6 s. Each lane's period divides it, so the loop stays seamless, and its speed says
// what the lane is: fast laps the orb four times a cycle, small twice, large and council once. Every lane
// has its own track, so differing speeds never make two planets collide.
export const PERIOD = 9.6
const ROLE_PERIOD: Readonly<Record<string, number>> = { fast: 2.4, small: 4.8, large: 9.6, council: 9.6 }
export const lanePeriod = (role: string) => ROLE_PERIOD[role] ?? PERIOD
// The orbit is seen face-on: every track is a true circle around the voice orb (owner ask: circular, not oval).
// TILT stays as the horizontal sweep factor so the layout math keeps one shape; 1 means a circle.
export const TILT = 1
export const PLANET = 5 // body radius before depth scaling
export const HALO = 8
const PAD = HALO * 1.3 + 1 // a near planet's halo, so nothing on a ring is clipped
const SOURCE = 64 // the engine's avatar preset
const CORE = 60 // the voice orb as drawn here
/** The voice orb's drawn radius: the engine's dots reach 28.4 of its 64-unit preset. */
export const ORB_R = (CORE * 28.4) / SOURCE

export const orbitRadius = (role: string) => ORBIT_R[role] ?? FALLBACK_R

export interface OrbitLane { role: string; state: string }
export interface Satellite { role: string; x: number; y: number; z: number; scale: number; alpha: number; parked: boolean; theta: number; r: number }

/** The scene's size: just the outermost track in use plus a planet's halo, so the picture is no taller than its rings. */
export function orbitScene(lanes: readonly OrbitLane[]): { w: number; h: number } {
  const r = Math.max(orbitRadius('fast'), ...lanes.map(l => orbitRadius(l.role)))
  return { w: Math.ceil(2 * (r * TILT + PAD)), h: Math.ceil(2 * (r + PAD)) }
}

/** Where every lane sits at `seconds`: pure, so a given t always gives the same picture. */
export function orbitLayout(lanes: readonly OrbitLane[], seconds: number, reduce = false): Satellite[] {
  const { w, h } = orbitScene(lanes)
  const moving = lanes.filter(l => l.state !== 'dead').length
  let k = 0
  const parkedAt = new Map<number, number>()
  return lanes.map(lane => {
    const r = orbitRadius(lane.role)
    const parked = lane.state === 'dead'
    let theta: number
    if (parked) {
      // A dead lane waits at the top of its orbit; a second one on the same orbit sits just past it.
      const j = parkedAt.get(r) ?? 0
      parkedAt.set(r, j + 1)
      theta = Math.PI + j * 0.45
    } else {
      // Moving lanes are evenly spaced around the orbit and turn together; reduced motion seats them down the front half.
      theta = reduce ? Math.PI * (k + 0.5) / moving : Math.PI / 4 + (2 * Math.PI * k) / moving + (2 * Math.PI * seconds) / lanePeriod(lane.role)
      k++
    }
    const z = parked ? 0 : Math.sin(theta)
    const depth = (z + 1) / 2
    return {
      role: lane.role,
      x: w / 2 + r * TILT * Math.sin(theta),
      y: h / 2 + r * Math.cos(theta),
      z,
      // Face-on there is no near or far: every planet is drawn at one size and strength.
      scale: TILT < 1 ? 0.9 + 0.4 * depth : 1.1,
      alpha: parked ? 0.9 : TILT < 1 ? 0.75 + 0.25 * depth : 1,
      parked,
      theta,
      r
    }
  })
}

const n = (v: number) => v.toFixed(1)

function marks(state: LibraryState, seconds: number, animated: boolean, dark: boolean): string {
  const preset = resolvePreset(state, SOURCE)
  const frame = MODE_FRAMES[preset.mode](SOURCE, animated ? seconds * preset.speed : 0.6, preset.opts)
  const grey = (white: number) => {
    // On a light theme the voice orb's greys are deepened so it holds its own against the tinted planets.
    const ink = Math.min(1, Math.max(0, dark ? white : white * 0.7))
    return `#${Math.round((dark ? 1 - ink : ink) * 255).toString(16).padStart(2, '0').repeat(3)}`
  }
  const a = (v: number | undefined) => (v ?? 1).toFixed(2)
  const out = frame.lines.map(l => `<line x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}" stroke="${grey(l.white)}" stroke-width="${n(l.w)}" stroke-opacity="${a(l.a)}"/>`)
  for (const d of frame.dots) out.push(`<circle cx="${n(d.x)}" cy="${n(d.y)}" r="${n(d.r)}" fill="${grey(d.white)}" fill-opacity="${a(d.a)}"/>`)
  return out.join('')
}

const still = (s: OrbState) => s === 'idle' || s === 'waiting' || s === 'error'

/** Dots `step` apart along an ellipse's arc length, so a stippled track reads as one even line. */
export function stipple(cx: number, cy: number, a: number, b: number, step: number): [number, number][] {
  const N = 720
  const pts: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const t = (i * 2 * Math.PI) / N
    pts.push([cx + a * Math.sin(t), cy + b * Math.cos(t)])
  }
  const len = [0]
  for (let i = 1; i <= N; i++) len.push((len[i - 1] ?? 0) + Math.hypot((pts[i]?.[0] ?? 0) - (pts[i - 1]?.[0] ?? 0), (pts[i]?.[1] ?? 0) - (pts[i - 1]?.[1] ?? 0)))
  const total = len[N] ?? 0
  const count = Math.round(total / step)
  const out: [number, number][] = []
  let j = 0
  for (let k = 0; k < count; k++) {
    const s = (k * total) / count
    while ((len[j + 1] ?? total) < s) j++
    const f = (s - (len[j] ?? 0)) / ((len[j + 1] ?? total) - (len[j] ?? 0) || 1)
    out.push([(pts[j]?.[0] ?? 0) + f * ((pts[j + 1]?.[0] ?? 0) - (pts[j]?.[0] ?? 0)), (pts[j]?.[1] ?? 0) + f * ((pts[j + 1]?.[1] ?? 0) - (pts[j]?.[1] ?? 0))])
  }
  return out
}

/** A dead lane's mark at (x, y): a red hollow ring with an x struck through it, all circles. */
export function deadMark(x: number, y: number, r: number, dark: boolean): string {
  const red = deadTint(dark)
  const strike: string[] = []
  for (let i = -3; i <= 3; i++) {
    const d = (i / 3) * r * 0.55
    strike.push(`<circle cx="${n(x + d)}" cy="${n(y + d)}" r="0.55"/>`, `<circle cx="${n(x + d)}" cy="${n(y - d)}" r="0.55"/>`)
  }
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${red}" stroke-width="1.3"/><g fill="${red}">${strike.join('')}</g>`
}

/** One frame of the planetary scene: tracks, far planets, the voice orb, near planets. */
export function orbitSvg(main: OrbState, lanes: readonly OrbitLane[], seconds: number, dark: boolean, reduce = false): string {
  const { w, h } = orbitScene(lanes)
  const CX = w / 2
  const CY = h / 2
  const sats = orbitLayout(lanes, seconds, reduce)
  const t = reduce ? 0 : seconds
  const edge = dark ? '#000000' : '#ffffff'
  // Planets are drawn at their orbit point itself, so each sits exactly on its track: a solid tinted body
  // with a thin rim, a halo while the lane thinks, and a red struck-through ring when the lane is dead.
  const planet = (s: Satellite, lane: OrbitLane) => {
    const r = PLANET * s.scale
    const c = tint(lane.role, dark)
    // A comet tail as long as the lane is quick: the same 0.35 s of travel is a long streak on fast, a stub on large.
    const tail = s.parked || reduce ? '' : Array.from({ length: 6 }, (_, i) => {
      const lag = ((i + 1) / 6) * ((2 * Math.PI * 0.35) / lanePeriod(lane.role))
      const th = s.theta - lag
      const k = 1 - (i + 1) / 7
      return `<circle cx="${n(CX + s.r * TILT * Math.sin(th))}" cy="${n(CY + s.r * Math.cos(th))}" r="${n(r * (0.35 + 0.5 * k))}" fill-opacity="${(0.45 * k).toFixed(2)}"/>`
    }).join('')
    const trail = tail ? `<g data-tail="${lane.role}" fill="${c}">${tail}</g>` : ''
    const body = s.parked
      ? deadMark(s.x, s.y, r, dark)
      : (lane.state === 'thinking' ? `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(HALO * s.scale)}" fill="${c}" fill-opacity="0.2"/>` : '') +
        `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(r)}" fill="${c}" stroke="${edge}" stroke-width="0.8"/>` +
        `<circle cx="${n(s.x - r * 0.3)}" cy="${n(s.y - r * 0.3)}" r="${n(r * 0.35)}" fill="#ffffff" fill-opacity="0.4"/>`
    return `<g data-lane="${lane.role}" opacity="${s.alpha.toFixed(2)}">${trail}${body}</g>`
  }
  const order = sats.flatMap((s, i) => (lanes[i] ? [{ s, lane: lanes[i] }] : [])).sort((a, b) => a.s.z - b.s.z)
  const back = order.filter(o => o.s.z < 0).map(o => planet(o.s, o.lane)).join('')
  const front = order.filter(o => o.s.z >= 0).map(o => planet(o.s, o.lane)).join('')
  // One track per orbit in use, tinted as its lane, stippled evenly from circles (Tern's native SVG renderer
  // draws circles, not <ellipse> or <path>). The near half is bolder than the far half; a track holding only
  // dead lanes is a grey dashed line.
  const radii = [...new Set(lanes.map(l => orbitRadius(l.role)))]
  const rings = radii.map(r => {
    const on = lanes.filter(l => orbitRadius(l.role) === r)
    const dead = on.every(l => l.state === 'dead')
    const dots = stipple(CX, CY, r * TILT, r, 2)
    const dot = ([x, y]: [number, number]) => `<circle cx="${n(x)}" cy="${n(y)}" r="0.7"/>`
    if (dead) {
      const dash = dots.filter((_, i) => i % 4 < 2).map(dot).join('')
      return `<g data-ring="${r}" fill="${dark ? '#9a9a9a' : '#6a6a6a'}" fill-opacity="0.6">${dash}</g>`
    }
    const near = dots.filter(([x]) => x >= CX).map(dot).join('')
    const far = dots.filter(([x]) => x < CX).map(dot).join('')
    return `<g data-ring="${r}" fill="${tint(on[0]?.role ?? '', dark)}"><g fill-opacity="${TILT < 1 ? 0.7 : 0.38}">${far}</g><g fill-opacity="${TILT < 1 ? 1 : 0.38}">${near}</g></g>`
  }).join('')
  const core = `<g transform="translate(${n(CX - CORE / 2)} ${n(CY - CORE / 2)}) scale(${(CORE / SOURCE).toFixed(4)})">${marks(LIBRARY_STATE[main], t, !reduce && !still(main), dark)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rings}${back}${core}${front}</svg>`
}

/** A row's key beside its label: the lane's planet, or its dead mark, so each track reads against its name. */
export function laneSwatch(lane: OrbitLane, dark: boolean, size = 14): string {
  const c = size / 2
  const body = lane.state === 'dead'
    ? deadMark(c, c, 4.6, dark)
    : `<circle cx="${c}" cy="${c}" r="4.6" fill="${tint(lane.role, dark)}" stroke="${dark ? '#000000' : '#ffffff'}" stroke-width="0.8"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`
}

/** The newest /glide focus answer: a block is active until its end time. */
export const focusBlock = {
  until: 0,
  note(f: { block: { minutes_left: number } | null }, now = Date.now()) {
    this.until = f.block && f.block.minutes_left > 0 ? now + f.block.minutes_left * 60_000 : 0
  },
  active(now = Date.now()) {
    return now < this.until
  }
}
