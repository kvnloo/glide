// FOCUS-mode lane orbit: while a /glide focus block runs and live voice is on, the call's helper lanes
// circle the voice orb as tinted planets on upright rings seen nearly edge-on, all drawn into one SVG per frame around the
// thinking-orbs engine's voice orb. A thinking lane wears a halo, and a dead lane is parked as a hollow
// grey ring on its orbit, never hidden. Reduced motion draws fixed seats down the front half.
import { MODE_FRAMES, type OrbState as LibraryState, resolvePreset } from 'thinking-orbs/engine'

import { LIBRARY_STATE, type OrbState } from '../chrome/orb.js'

/** Orbit radius per role (viewBox units): fast inner, council outer. */
const ORBIT_R: Readonly<Record<string, number>> = { fast: 60, small: 74, large: 88, council: 102 }
const FALLBACK_R = 81

/** Each role's planet tint (council keeps its lapis seat colour); a parked lane drops to grey. */
export const ROLE_TINT: Readonly<Record<string, string>> = {
  fast: '#e8b04a',
  small: '#5aa9e6',
  large: '#b07cd8',
  council: '#3f6fd8'
}

// Every lane shares one angular velocity, one turn per 9.6 s cached cycle, so the gaps set at the start
// never close: lanes with different periods drift into a bunch on one side and overlap where rings meet.
export const PERIOD = 9.6
// The orbit plane stands vertical, seen nearly edge-on: planets pass above and below the voice orb, sweeping
// a narrow ellipse sideways. TILT is that sweep, wide enough that a near planet's halo on the inner ring clears the orb.
export const TILT = 0.46
export const SCENE = 116 // the outer ring's sweep plus a near planet's halo
export const SCENE_H = 228 // the outer orbit plus a planet's halo above and below
export const PLANET = 5 // body radius before depth scaling
export const HALO = 8
const CX = SCENE / 2
const CY = SCENE_H / 2
const SOURCE = 64 // the engine's avatar preset
const CORE = 36 // the voice orb as drawn here, near the composer orb's 34px
/** The voice orb's drawn radius: the engine's dots reach 28.4 of its 64-unit preset. */
export const ORB_R = (CORE * 28.4) / SOURCE

export const orbitRadius = (role: string) => ORBIT_R[role] ?? FALLBACK_R

export interface OrbitLane { role: string; state: string }
export interface Satellite { role: string; x: number; y: number; z: number; scale: number; alpha: number; parked: boolean }

/** Where every lane sits at `seconds`: pure, so a given t always gives the same picture. */
export function orbitLayout(lanes: readonly OrbitLane[], seconds: number, reduce = false): Satellite[] {
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
      theta = reduce ? Math.PI * (k + 0.5) / moving : Math.PI / 4 + (2 * Math.PI * k) / moving + (2 * Math.PI * seconds) / PERIOD
      k++
    }
    const z = parked ? 0 : Math.sin(theta)
    const depth = (z + 1) / 2
    return {
      role: lane.role,
      x: CX + r * TILT * Math.sin(theta),
      y: CY + r * Math.cos(theta),
      z,
      scale: 0.9 + 0.4 * depth,
      alpha: parked ? 0.55 : 0.55 + 0.45 * depth,
      parked
    }
  })
}

const n = (v: number) => v.toFixed(1)

function marks(state: LibraryState, seconds: number, animated: boolean, dark: boolean): string {
  const preset = resolvePreset(state, SOURCE)
  const frame = MODE_FRAMES[preset.mode](SOURCE, animated ? seconds * preset.speed : 0.6, preset.opts)
  const grey = (white: number) => {
    const ink = Math.min(1, Math.max(0, white))
    return `#${Math.round((dark ? 1 - ink : ink) * 255).toString(16).padStart(2, '0').repeat(3)}`
  }
  const a = (v: number | undefined) => (v ?? 1).toFixed(2)
  const out = frame.lines.map(l => `<line x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}" stroke="${grey(l.white)}" stroke-width="${n(l.w)}" stroke-opacity="${a(l.a)}"/>`)
  for (const d of frame.dots) out.push(`<circle cx="${n(d.x)}" cy="${n(d.y)}" r="${n(d.r)}" fill="${grey(d.white)}" fill-opacity="${a(d.a)}"/>`)
  return out.join('')
}

const still = (s: OrbState) => s === 'idle' || s === 'waiting' || s === 'error'

/** One frame of the planetary scene: rings, far planets, the voice orb, near planets. */
export function orbitSvg(main: OrbState, lanes: readonly OrbitLane[], seconds: number, dark: boolean, reduce = false): string {
  const sats = orbitLayout(lanes, seconds, reduce)
  const t = reduce ? 0 : seconds
  const ink = dark ? '#ffffff' : '#000000'
  // Planets are drawn at their orbit point itself, so each sits exactly on its ring: a solid tinted body,
  // a halo while the lane thinks, and a hollow grey ring when the lane is dead.
  const planet = (s: Satellite, lane: OrbitLane) => {
    const r = PLANET * s.scale
    const tint = ROLE_TINT[lane.role] ?? '#888888'
    const body = s.parked
      ? `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(r)}" fill="none" stroke="#888888" stroke-width="1.2"/>`
      : (lane.state === 'thinking' ? `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(HALO * s.scale)}" fill="${tint}" fill-opacity="0.2"/>` : '') +
        `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(r)}" fill="${tint}"/>` +
        `<circle cx="${n(s.x - r * 0.3)}" cy="${n(s.y - r * 0.3)}" r="${n(r * 0.35)}" fill="#ffffff" fill-opacity="0.35"/>`
    return `<g data-lane="${lane.role}" opacity="${s.alpha.toFixed(2)}">${body}</g>`
  }
  const order = sats.flatMap((s, i) => (lanes[i] ? [{ s, lane: lanes[i] }] : [])).sort((a, b) => a.s.z - b.s.z)
  const back = order.filter(o => o.s.z < 0).map(o => planet(o.s, o.lane)).join('')
  const front = order.filter(o => o.s.z >= 0).map(o => planet(o.s, o.lane)).join('')
  // One ring per orbit in use; an orbit whose every lane is dead is dashed.
  const radii = [...new Set(lanes.map(l => orbitRadius(l.role)))]
  const rings = radii.map(r => {
    const dead = lanes.every(l => orbitRadius(l.role) !== r || l.state === 'dead')
    // Stippled from circles, matching the orb's own dots: Tern's native SVG renderer draws circles, not
    // <ellipse> or <polyline>. A dead orbit's ring is sparser and fainter.
    const dots = dead ? 28 : 56
    const ring = Array.from({ length: dots }, (_, i) => {
      const a = (i * 2 * Math.PI) / dots
      return `<circle cx="${n(CX + r * TILT * Math.sin(a))}" cy="${n(CY + r * Math.cos(a))}" r="0.7" fill="${ink}"/>`
    }).join('')
    return `<g data-ring="${r}" fill-opacity="${dead ? 0.18 : 0.32}">${ring}</g>`
  }).join('')
  const core = `<g transform="translate(${CX - CORE / 2} ${CY - CORE / 2}) scale(${CORE / SOURCE})">${marks(LIBRARY_STATE[main], t, !reduce && !still(main), dark)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE}" height="${SCENE_H}" viewBox="0 0 ${SCENE} ${SCENE_H}">${rings}${back}${core}${front}</svg>`
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
