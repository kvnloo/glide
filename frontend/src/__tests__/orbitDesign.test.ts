// Local opt-in to the design drift gate; orbitTokens.ts is the token source.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ROLE_TINT, ORBIT_MARK, roleTint } from '../../../glide/frontend/orbitTokens.js'
import { STATUS } from '../../../glide/frontend/tokens.js'
import { deadMark, deadTint, orbitLayout, orbitSvg } from '../voice/orbit.js'
import { HIT, JIGGLE_S, orbitCss, orbitSeats, planetSvg } from '../voice/orbitTargets.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const lanes = [
  { role: 'fast', state: 'thinking' },
  { role: 'small', state: 'idle' },
  { role: 'council', state: 'dead' }
] as const

describe('FOCUS orbit design', () => {
  for (const file of ['frontend/src/voice/orbit.ts', 'frontend/src/voice/orbitTargets.ts']) {
    it(`${file} uses design tokens only`, () => {
      expect(tokenDrift(readFileSync(resolve(root, file), 'utf8'))).toEqual(NO_DRIFT)
    })
  }

  it('has one named, balanced role ramp for both themes and a neutral fallback', () => {
    expect(Object.keys(ROLE_TINT)).toEqual(['fast', 'small', 'large', 'council'])
    for (const role of Object.keys(ROLE_TINT)) {
      for (const dark of [true, false]) {
        const ink = roleTint(role, dark)
        expect(ink).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(ink).toBe(dark ? ROLE_TINT[role as keyof typeof ROLE_TINT].dark : ROLE_TINT[role as keyof typeof ROLE_TINT].light)
      }
    }
    expect(new Set(Object.values(ROLE_TINT).map(c => c.dark)).size).toBe(4)
  })

  it('uses host danger ink on every dead mark, with tokenized SVG fallbacks', () => {
    expect(deadTint(true)).toBe(`var(--h-danger, ${STATUS.bad})`)
    expect(ORBIT_MARK.danger).toBe(deadTint(false))
    for (const dark of [true, false]) {
      const mark = deadMark(12, 12, 4, dark)
      expect(mark).toContain(`style="stroke:${ORBIT_MARK.danger}"`)
      expect(mark.match(/style="fill:var\(--h-danger/g)?.length).toBeGreaterThanOrEqual(10)
      expect(orbitSvg('idle', lanes, 0, dark)).toContain(ORBIT_MARK.danger)
      expect(planetSvg({ role: 'fast', state: 'dead' }, dark)).toContain(ORBIT_MARK.danger)
    }
  })

  it('stops the orbit on hover or keyboard focus, then signals clickability with a tiny jiggle', () => {
    const css = orbitCss(lanes)
    expect(css).toContain('.glide-orbit:hover .glide-orbit-arm')
    expect(css).toContain('.glide-orbit:focus-within .glide-orbit-arm')
    expect(css).toContain('.glide-orbit:focus-within .glide-orbit-s0 > .glide-orbit-brake')
    expect(css).toContain('glide-orbit-jiggle')
    expect(JIGGLE_S).toBeGreaterThanOrEqual(0.12)
    expect(HIT).toBeGreaterThanOrEqual(44)
    expect(css).toContain(`width:${HIT}px;height:${HIT}px`)
    expect(css).toContain(':focus-visible')
  })

  it('fixes seats and suspends jiggle/tails under reduced motion, including OS preference', () => {
    const a = orbitLayout(lanes, 0, true)
    expect(orbitLayout(lanes, 8.3, true)).toEqual(a)
    expect(orbitSeats(lanes, true).every(s => !s.moving && s.brake === 0)).toBe(true)
    const css = orbitCss(lanes)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation:none !important')
    expect(css).toContain('.glide-orbit-tail{opacity:0 !important}')
    const fixed = orbitSeats(lanes, true)
    expect(css).toContain(`transform:rotate(-${Number((fixed[0]!.theta * 180 / Math.PI).toFixed(3))}deg) !important`)
    expect(orbitSvg('idle', lanes, 1, true, true)).toEqual(orbitSvg('idle', lanes, 7, true, true))
  })
})
