// FOCUS-mode lane orbit: while a /glide focus block runs and live voice is on, the call's helper lanes
// circle the voice orb as small satellites on tilted orbits, all drawn into one SVG per frame with the
// thinking-orbs engine. Each role keeps one engine design (fast = orbits, small = globe, large = the
// thinking orb's rubik, council = web), each lane's real state still picks moving vs still frame, and a
// dead lane is parked greyed on its orbit, never hidden. Reduced motion draws fixed, evenly spaced seats.
import { MODE_FRAMES, type OrbState as LibraryState, resolvePreset } from 'thinking-orbs/engine'

import { LIBRARY_STATE, type OrbState } from '../chrome/orb.js'

/** The engine design each lane role wears as a satellite. */
export const ROLE_DESIGN: Readonly<Record<string, LibraryState>> = {
  fast: 'working', // particles on tilted orbits
  small: 'searching', // globe
  large: 'solving', // the main orb's thinking rubik
  council: 'connecting' // a web of seats
}

/** Orbit radius (viewBox units) and period (seconds; divides the 9.6 s cached cycle): fast inner and quick, council outer and slow. */
const ORBIT: Readonly<Record<string, { r: number; period: number }>> = {
  fast: { r: 46, period: 3.2 },
  small: { r: 57, period: 4.8 },
  large: { r: 67, period: 9.6 },
  council: { r: 77, period: 9.6 }
}
const FALLBACK = { r: 62, period: 9.6 }

/** Each role's planet tint (council keeps its lapis seat colour); a parked lane drops to grey. */
export const ROLE_TINT: Readonly<Record<string, string>> = {
  fast: '#e8b04a',
  small: '#5aa9e6',
  large: '#b07cd8',
  council: '#3f6fd8'
}

export const SCENE = 184 // council's outer orbit plus a near satellite fits
export const SCENE_H = 80 // the voice orb plus the tilted orbits' height
const C = SCENE / 2
const TILT = 0.32 // orbit plane seen from slightly above
const SAT = 20 // the engine's small preset size
const MAIN = 64

export interface OrbitLane { role: string; state: string }
export interface Satellite { role: string; x: number; y: number; z: number; scale: number; alpha: number; parked: boolean }

/** Where every lane sits at `seconds`: pure, so a given t always gives the same picture. */
export function orbitLayout(lanes: readonly OrbitLane[], seconds: number, reduce = false): Satellite[] {
  return lanes.map((lane, i) => {
    const o = ORBIT[lane.role] ?? FALLBACK
    const parked = lane.state === 'dead'
    // Parked lanes sit at the orbit's far left; reduced motion spreads lanes evenly over the front half.
    const theta = parked ? Math.PI
      : reduce ? Math.PI * (i + 0.5) / lanes.length
        : (i * 2 * Math.PI) / Math.max(1, lanes.length) + (2 * Math.PI * seconds) / o.period
    const z = parked ? 0 : Math.sin(theta)
    const depth = (z + 1) / 2
    return {
      role: lane.role,
      x: C + o.r * Math.cos(theta),
      y: C + o.r * TILT * Math.sin(theta),
      z,
      scale: 0.95 + 0.45 * depth,
      alpha: parked ? 0.35 : 0.45 + 0.55 * depth,
      parked
    }
  })
}

const n = (v: number) => v.toFixed(1)

function marks(state: LibraryState, size: 20 | 64, seconds: number, animated: boolean, dark: boolean, muted = false, tint?: string): string {
  const preset = resolvePreset(state, size)
  const frame = MODE_FRAMES[preset.mode](size, animated ? seconds * preset.speed : 0.6, preset.opts)
  const grey = (white: number) => {
    if (tint && !muted) return tint
    const ink = Math.min(1, Math.max(0, muted ? 0.55 + white * 0.3 : white))
    return `#${Math.round((dark ? 1 - ink : ink) * 255).toString(16).padStart(2, '0').repeat(3)}`
  }
  const a = (v: number | undefined) => (v ?? 1).toFixed(2)
  const out = frame.lines.map(l => `<line x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}" stroke="${grey(l.white)}" stroke-width="${n(l.w)}" stroke-opacity="${a(l.a)}"/>`)
  for (const d of frame.dots) out.push(`<circle cx="${n(d.x)}" cy="${n(d.y)}" r="${n(d.r)}" fill="${grey(d.white)}" fill-opacity="${a(d.a)}"/>`)
  return out.join('')
}

const still = (s: OrbState) => s === 'idle' || s === 'waiting' || s === 'error'

/** One frame of the planetary scene: far satellites, the voice orb, near satellites. */
export function orbitSvg(main: OrbState, lanes: readonly OrbitLane[], seconds: number, dark: boolean, reduce = false): string {
  const sats = orbitLayout(lanes, seconds, reduce)
  const t = reduce ? 0 : seconds
  const sat = (s: Satellite, lane: OrbitLane) => {
    const k = s.scale
    const tint = ROLE_TINT[lane.role]
    const body = marks(ROLE_DESIGN[lane.role] ?? 'breathing', SAT, t, !reduce && lane.state === 'thinking', dark, s.parked, tint)
    // A soft planet disc under the dots so each satellite reads as one body, not loose particles.
    const disc = `<circle cx="${SAT / 2}" cy="${SAT / 2}" r="${SAT / 2}" fill="${s.parked ? '#888888' : tint ?? '#888888'}" fill-opacity="${s.parked ? 0.08 : 0.18}"/>`
    return `<g data-lane="${lane.role}" opacity="${s.alpha.toFixed(2)}" transform="translate(${n(s.x - (SAT * k) / 2)} ${n(s.y - (SAT * k) / 2)}) scale(${k.toFixed(3)})">${disc}${body}</g>`
  }
  const order = sats.flatMap((s, i) => (lanes[i] ? [{ s, lane: lanes[i] }] : [])).sort((a, b) => a.s.z - b.s.z)
  const back = order.filter(o => o.s.z < 0).map(o => sat(o.s, o.lane)).join('')
  const front = order.filter(o => o.s.z >= 0).map(o => sat(o.s, o.lane)).join('')
  const ring = dark ? '#ffffff' : '#000000'
  const rings = [...new Set(lanes.map(l => (ORBIT[l.role] ?? FALLBACK).r))]
    .map(r => `<ellipse cx="${C}" cy="${C}" rx="${r}" ry="${n(r * TILT)}" fill="none" stroke="${ring}" stroke-opacity="0.16" stroke-width="0.6"/>`).join('')
  const core = `<g transform="translate(${C - MAIN / 2} ${C - MAIN / 2})">${marks(LIBRARY_STATE[main], MAIN, t, !reduce && !still(main), dark)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE}" height="${SCENE_H}" viewBox="0 ${C - SCENE_H / 2} ${SCENE} ${SCENE_H}">${rings}${back}${core}${front}</svg>`
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
