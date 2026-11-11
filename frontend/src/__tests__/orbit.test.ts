import { describe, expect, it } from 'vitest'

import { focusBlock, orbitLayout, orbitSvg } from '../voice/orbit.js'

const LANES = [
  { role: 'fast', state: 'thinking' },
  { role: 'small', state: 'idle' },
  { role: 'large', state: 'answered' },
  { role: 'council', state: 'thinking' }
]

describe('focus lane orbit', () => {
  it('places lanes deterministically for a given t, and they move over time', () => {
    expect(orbitLayout(LANES, 1.25)).toEqual(orbitLayout(LANES, 1.25))
    expect(orbitSvg('listening', LANES, 1.25, true)).toBe(orbitSvg('listening', LANES, 1.25, true))
    expect(orbitLayout(LANES, 2)[0]?.x).not.toBeCloseTo(orbitLayout(LANES, 1)[0]?.x ?? 0)
    // Fast is the inner orbit, council the outer.
    const at = orbitLayout(LANES, 0, true)
    const reach = (i: number) => Math.hypot((at[i]?.x ?? 0) - 92, ((at[i]?.y ?? 0) - 92) / 0.32)
    expect(reach(0)).toBeLessThan(reach(3))
  })

  it('repeats on the 9.6 s cached cycle', () => {
    expect(orbitLayout(LANES, 9.6).map(s => s.x.toFixed(3))).toEqual(orbitLayout(LANES, 0).map(s => s.x.toFixed(3)))
  })

  it('reduced motion draws static, evenly spaced, front-facing seats', () => {
    expect(orbitLayout(LANES, 0, true)).toEqual(orbitLayout(LANES, 7.3, true))
    expect(orbitSvg('speaking', LANES, 0, false, true)).toBe(orbitSvg('speaking', LANES, 5, false, true))
    for (const s of orbitLayout(LANES, 3, true)) expect(s.z).toBeGreaterThan(0)
  })

  it('parks a dead lane greyed on its orbit instead of hiding it', () => {
    const lanes = [{ role: 'fast', state: 'thinking' }, { role: 'council', state: 'dead' }]
    const a = orbitLayout(lanes, 0.4)[1]
    expect(a).toEqual(orbitLayout(lanes, 3.1)[1])
    expect(a?.parked).toBe(true)
    expect(a?.alpha).toBeLessThan(0.5)
    expect(a?.alpha).toBeGreaterThan(0)
    expect(orbitSvg('listening', lanes, 0.4, true)).toContain('data-lane="council"')
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
