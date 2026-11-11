import { describe, expect, it } from 'vitest'

import { focusBlock, HALO, laneSwatch, ORB_R, orbitLayout, orbitRadius, orbitScene, orbitSvg, PERIOD, PLANET, stipple, TILT } from '../voice/orbit.js'

const LANES = [
  { role: 'fast', state: 'thinking' },
  { role: 'small', state: 'idle' },
  { role: 'large', state: 'answered' },
  { role: 'council', state: 'thinking' }
]
const ROLES = ['fast', 'small', 'large', 'council']
const { w: SCENE, h: SCENE_H } = orbitScene(LANES)

const CY = SCENE_H / 2
const TAGS = new Set(['svg', 'g', 'circle'])
const tags = (svg: string) => new Set([...svg.matchAll(/<(\w+)[ >]/g)].map(m => m[1]))
const FRAMES = Array.from({ length: 144 }, (_, i) => (i * PERIOD) / 144)

/** Every mix the broker can send: any non-empty subset of the roles, each lane live or dead. */
function mixes() {
  const out: { role: string; state: string }[][] = []
  for (let set = 1; set < 16; set++) {
    const roles = ROLES.filter((_, i) => set & (1 << i))
    for (let dead = 0; dead < 1 << roles.length; dead++) {
      out.push(roles.map((role, i) => ({ role, state: dead & (1 << i) ? 'dead' : i % 2 ? 'idle' : 'thinking' })))
    }
  }
  return out
}

/** Where a lane sits on its ring, 1 exactly on it. */
const onRing = (s: { x: number; y: number }, role: string, lanes = LANES) => {
  const { w, h } = orbitScene(lanes)
  return ((s.x - w / 2) / (orbitRadius(role) * TILT)) ** 2 + ((s.y - h / 2) / orbitRadius(role)) ** 2
}

describe('focus lane orbit', () => {
  it('places lanes deterministically for a given t, and they move over time', () => {
    expect(orbitLayout(LANES, 1.25)).toEqual(orbitLayout(LANES, 1.25))
    expect(orbitSvg('listening', LANES, 1.25, true)).toBe(orbitSvg('listening', LANES, 1.25, true))
    expect(orbitLayout(LANES, 2)[0]?.y).not.toBeCloseTo(orbitLayout(LANES, 1)[0]?.y ?? 0)
  })

  it('repeats on the 9.6 s cached cycle', () => {
    expect(orbitLayout(LANES, PERIOD).map(s => s.y.toFixed(3))).toEqual(orbitLayout(LANES, 0).map(s => s.y.toFixed(3)))
  })

  it('is circular: planets circle the orb on round tracks, in a square scene', () => {
    expect(SCENE_H).toBe(SCENE)
    const ys = FRAMES.flatMap(t => orbitLayout(LANES, t).map(s => s.y))
    const xs = FRAMES.flatMap(t => orbitLayout(LANES, t).map(s => s.x))
    expect(Math.abs((Math.max(...ys) - Math.min(...ys)) - (Math.max(...xs) - Math.min(...xs)))).toBeLessThan(12)
    expect(Math.min(...ys)).toBeLessThan(CY - orbitRadius('fast') + 1)
    expect(Math.max(...ys)).toBeGreaterThan(CY + orbitRadius('fast') - 1)
    const svg = orbitSvg('listening', LANES, 0, false)
    const rings = [...svg.matchAll(/<g data-ring="[\d.]+"[^>]*>((?:<g [^>]*>|<\/g>|<circle [^>]*\/>)+?)<\/g>(?=<g data-(?:ring|lane)|<g transform)/g)]
    expect(rings).toHaveLength(4)
    for (const m of rings) {
      const pts = [...(m[1] ?? '').matchAll(/cx="([\d.-]+)" cy="([\d.-]+)"/g)].map(p => [Number(p[1]), Number(p[2])] as const)
      const w = Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]))
      const h = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]))
      expect(Math.abs(h - w)).toBeLessThan(w * 0.03) // round, not oval
    }
    // Only elements Tern's native SVG renderer draws.
    expect(tags(svg)).toEqual(TAGS)
    expect(svg).toContain(`viewBox="0 0 ${SCENE} ${SCENE_H}"`)
  })

  it('planets keep a stable draw order and one strength face-on', () => {
    for (const t of FRAMES) {
      const svg = orbitSvg('listening', LANES, t, false)
      const core = svg.indexOf('<g transform=')
      for (const [i, s] of orbitLayout(LANES, t).entries()) {
        const at = svg.indexOf(`data-lane="${LANES[i]?.role}"`)
        expect(at < core).toBe(s.z < 0)
        expect(s.alpha).toBe(1)
      }
    }
  })

  it('every planet sits exactly on its ring, also in the drawn SVG', () => {
    for (const t of FRAMES) {
      for (const [i, s] of orbitLayout(LANES, t).entries()) expect(onRing(s, LANES[i]?.role ?? '')).toBeCloseTo(1, 6)
    }
    const svg = orbitSvg('listening', LANES, 1.7, false)
    for (const [i, s] of orbitLayout(LANES, 1.7).entries()) {
      const g = new RegExp(`data-lane="${LANES[i]?.role}"[^>]*>(?:<circle [^>]*fill-opacity="0.2"/>)?<circle cx="([\\d.]+)" cy="([\\d.]+)" r="[\\d.]+" fill="#`).exec(svg)
      expect(Math.abs(Number(g?.[1]) - s.x)).toBeLessThan(0.06)
      expect(Math.abs(Number(g?.[2]) - s.y)).toBeLessThan(0.06)
    }
  })

  it('never bunches: in every lane mix and frame, planets keep clear of each other and the orb, inside the scene', () => {
    const bad: string[] = []
    for (const lanes of mixes()) {
      for (const t of FRAMES) {
        const sats = orbitLayout(lanes, t)
        for (const [i, a] of sats.entries()) {
          const halo = HALO * a.scale
          const { w: SCENE, h: SCENE_H } = orbitScene(lanes)
          const at = `${lanes.map(l => `${l.role}=${l.state}`).join(',')} t=${t}`
          if (a.x - halo < 0 || a.x + halo > SCENE || a.y - halo < 0 || a.y + halo > SCENE_H) bad.push(`${a.role} clipped, ${at}`)
          // Planets pass above, below and beside the voice orb, never across it.
          if (Math.hypot(a.x - SCENE / 2, a.y - SCENE_H / 2) <= ORB_R + halo + 1) bad.push(`${a.role} on the orb, ${at}`)
          for (const b of sats.slice(i + 1)) {
            if (Math.hypot(a.x - b.x, a.y - b.y) <= PLANET * (a.scale + b.scale) + 2) bad.push(`${a.role}/${b.role} overlap, ${at}`)
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('reduced motion draws static seats spread down the front half', () => {
    expect(orbitLayout(LANES, 0, true)).toEqual(orbitLayout(LANES, 7.3, true))
    expect(orbitSvg('speaking', LANES, 0, false, true)).toBe(orbitSvg('speaking', LANES, 5, false, true))
    const seats = orbitLayout(LANES, 3, true)
    for (const s of seats) expect(s.z).toBeGreaterThan(0)
    const ys = seats.map(s => s.y)
    expect([...ys].sort((a, b) => b - a)).toEqual(ys) // top to bottom in lane order: one vertical spread
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(orbitRadius('fast'))
    for (const lanes of mixes()) {
      const sats = orbitLayout(lanes, 0, true)
      for (const [i, a] of sats.entries()) {
        for (const b of sats.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(PLANET * (a.scale + b.scale) + 2)
      }
    }
  })

  it('parks a dead lane greyed on its orbit instead of hiding it', () => {
    const lanes = [{ role: 'fast', state: 'thinking' }, { role: 'council', state: 'dead' }]
    const a = orbitLayout(lanes, 0.4)[1]
    expect(a).toEqual(orbitLayout(lanes, 3.1)[1])
    expect(a?.parked).toBe(true)
    expect(a?.alpha).toBeLessThan(1)
    expect(a?.alpha).toBeGreaterThan(0)
    expect(onRing(a ?? { x: 0, y: 0 }, 'council', lanes)).toBeCloseTo(1, 6)
    for (const dark of [true, false]) {
      const svg = orbitSvg('listening', lanes, 0.4, dark)
      // A red hollow ring struck through, on a grey dashed track that holds only the dead lane.
      const mark = /data-lane="council"[^>]*><circle [^>]*fill="none" stroke="(#[0-9a-f]{6})"[^>]*\/><g fill="(#[0-9a-f]{6})">((?:<circle [^>]*\/>)+)<\/g>/.exec(svg)
      expect(mark?.[1]).toBe(dark ? '#ff6b6b' : '#c62828')
      expect(mark?.[2]).toBe(mark?.[1])
      expect(mark?.[3]?.match(/<circle/g)?.length).toBeGreaterThanOrEqual(10)
      expect(svg).toMatch(new RegExp(`<g data-ring="${orbitRadius('council')}" fill="#[0-9a-f]{6}" fill-opacity="0.6">`))
      expect(tags(svg)).toEqual(TAGS)
    }
    expect(laneSwatch({ role: 'council', state: 'dead' }, false)).toContain('stroke="#c62828"')
    expect(laneSwatch({ role: 'fast', state: 'idle' }, false)).toContain('fill="#b5730f"')
    expect(tags(laneSwatch({ role: 'council', state: 'dead' }, true))).toEqual(TAGS)
  })

  it('stipples each track evenly along its arc length, dense enough to read as one line', () => {
    const dots = stipple(50, 100, 40, 90, 2.2)
    const gaps = dots.map((p, i) => {
      const q = dots[(i + 1) % dots.length] ?? p
      return Math.hypot(q[0] - p[0], q[1] - p[1])
    })
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.05)
    expect(Math.max(...gaps)).toBeLessThan(2.4)
  })

  it('sizes the scene to the outermost track in use, and every live track is tinted as its lane', () => {
    const three = [{ role: 'fast', state: 'idle' }, { role: 'small', state: 'idle' }, { role: 'large', state: 'idle' }]
    expect(orbitScene(three).h).toBeLessThan(orbitScene(LANES).h)
    expect(orbitScene(three).h).toBeLessThanOrEqual(2 * (orbitRadius('large') + HALO * 1.3 + 1) + 1)
    const svg = orbitSvg('listening', three, 0, false)
    for (const [role, c] of [['fast', '#b5730f'], ['small', '#1f6fb2'], ['large', '#a03c9c']] as const) {
      expect(svg).toContain(`<g data-ring="${orbitRadius(role)}" fill="${c}">`)
    }
  })

  it('is off outside a focus block', () => {
    focusBlock.note({ block: null }, 1000)
    expect(focusBlock.active(1000)).toBe(false)
    focusBlock.note({ block: { minutes_left: 50 } }, 1000)
    expect(focusBlock.active(1000 + 49 * 60_000)).toBe(true)
    expect(focusBlock.active(1000 + 51 * 60_000)).toBe(false)
    focusBlock.note({ block: null }, 2000)
    expect(focusBlock.active(2000)).toBe(false)
  })
})
