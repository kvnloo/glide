import { describe, expect, it } from 'vitest'

import { minifyCss } from '../../../glide/frontend/css.js'
import { type OrbitLane, orbitLayout } from '../voice/orbit.js'
import { armAngle, armPoint, BRAKE_S, brakedAngle, JIGGLE_DEG, JIGGLE_PX, JIGGLE_S, orbitCss, orbitPx, orbitSeats } from '../voice/orbitTargets.js'

const lane = (role: string, state: OrbitLane['state'] = 'idle'): OrbitLane => ({ role, state, hue: '#888888' })
const LANES = [lane('fast'), lane('fast'), lane('fast'), lane('small'), lane('small', 'thinking'), lane('large', 'dead')]

describe('orbit targets', () => {
  it('seats each hit target exactly on its planet (the image\'s pixels) at any frozen t', () => {
    const px = orbitPx(LANES)
    const seats = orbitSeats(LANES)
    for (const t of [0, 0.37, 1.9, 7.25]) {
      const planets = orbitLayout(LANES, t)
      seats.forEach((seat, i) => {
        const p = planets[i]
        if (!p) throw new Error('no planet')
        const at = armPoint(LANES, seat, armAngle(seat, t))
        expect(at.x).toBeCloseTo(p.x * px, 6)
        expect(at.y).toBeCloseTo(p.y * px, 6)
      })
    }
  })

  it('eases a hovered planet to rest: no jump at the pause, full speed out, zero speed in', () => {
    const seat = orbitSeats(LANES)[0]
    if (!seat) throw new Error('no seat')
    const enter = 1.234
    const dt = 1e-4
    // No position jump the instant the pointer arrives.
    expect(brakedAngle(seat, enter + 1e-9, enter)).toBeCloseTo(armAngle(seat, enter), 4)
    // It leaves the pause at its orbit speed and arrives at rest after BRAKE_S, then stays put.
    const orbit = (armAngle(seat, enter + dt) - armAngle(seat, enter)) / dt
    const out = (brakedAngle(seat, enter + dt, enter) - brakedAngle(seat, enter, enter)) / dt
    expect(out).toBeCloseTo(orbit, 1)
    const end = enter + BRAKE_S
    expect(Math.abs((brakedAngle(seat, end, enter) - brakedAngle(seat, end - dt, enter)) / dt)).toBeLessThan(Math.abs(orbit) * 0.01)
    expect(brakedAngle(seat, end + 5, enter)).toBe(brakedAngle(seat, end, enter))
    // The speed only falls.
    let last = Infinity
    for (let k = 1; k <= 30; k++) {
      const t = enter + (k / 30) * BRAKE_S
      const v = Math.abs(brakedAngle(seat, t, enter) - brakedAngle(seat, t - dt, enter)) / dt
      expect(v).toBeLessThanOrEqual(last + 1e-6)
      last = v
    }
    // Coming to rest it travels only half what it would have orbited in BRAKE_S.
    expect(Math.abs(brakedAngle(seat, end, enter) - armAngle(seat, enter))).toBeCloseTo((360 / seat.period) * BRAKE_S / 2, 6)
  })

  it('pauses the arms on hover and brakes with a curve whose slopes are 2 then 0', () => {
    const css = orbitCss(LANES)
    expect(css).toContain(minifyCss(':hover .glide-orbit-arm, .glide-orbit:hover .glide-orbit-face { animation-play-state: paused; }'))
    expect(css).toContain(minifyCss(`transition: transform ${BRAKE_S}s cubic-bezier(0.3333, 0.6667, 0.6667, 1)`))
    expect(css).toContain(minifyCss('.glide-orbit:hover .glide-orbit-tail { opacity: 0; }')) // a stopped planet has no comet tail
    expect(css).toContain(minifyCss('.glide-orbit .sf-image { pointer-events: none;')) // a click reaches the planet, not Tern's image viewer
  })

  it('jiggles within ±3° at about 7 Hz, out of step, and never under reduced motion', () => {
    expect(JIGGLE_DEG).toBeGreaterThanOrEqual(2)
    expect(JIGGLE_DEG).toBeLessThanOrEqual(3)
    expect(JIGGLE_PX).toBeLessThanOrEqual(1) // the bob never carries a planet off its seat
    expect(1 / JIGGLE_S).toBeGreaterThan(6)
    expect(1 / JIGGLE_S).toBeLessThan(8)
    const css = orbitCss(LANES)
    const degs = [...css.matchAll(/@keyframes glide-orbit-jiggle.*?\}\s*\}/g)].flatMap(m => [...m[0].matchAll(/rotate\((-?[\d.]+)deg\)/g)].map(d => Number(d[1])))
    expect(degs.length).toBeGreaterThan(0)
    for (const d of degs) expect(Math.abs(d)).toBeLessThanOrEqual(3)
    const phases = orbitSeats(LANES).map(s => s.jiggleDelay)
    expect(new Set(phases).size).toBe(phases.length)
    for (const p of phases) { expect(p).toBeLessThanOrEqual(0); expect(p).toBeGreaterThan(-JIGGLE_S) }
    const still = orbitCss(LANES, true)
    expect(still).toContain(minifyCss('.glide-orbit-still:hover .glide-orbit-jiggle { animation-name: none; }'))
    expect(still).toContain(minifyCss('.glide-orbit-still:hover .glide-orbit-ring { opacity: 1; }'))
    expect(orbitSeats(LANES, true).every(s => !s.moving && s.brake === 0)).toBe(true)
  })

  it('keeps a dead lane parked: its arm never turns or brakes', () => {
    const dead = orbitSeats(LANES)[5]
    if (!dead) throw new Error('no seat')
    expect(dead.moving).toBe(false)
    expect(armAngle(dead, 0)).toBe(armAngle(dead, 9))
    expect(orbitCss(LANES)).toContain(minifyCss('.glide-orbit .glide-orbit-s5 { '))
  })
})
