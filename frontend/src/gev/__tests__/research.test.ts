import { describe, expect, it, vi } from 'vitest'

import { at, elapsed, PLATFORMS } from '../research/case.js'
import { researchCard } from '../research/card.js'
import type { ResearchCase } from '../research/case.js'
import { CASES, clock, findCase, researchCommand } from '../research/index.js'

function must(q: string): ResearchCase {
  const c = findCase(q)
  if (!c) throw new Error(`no case ${q}`)
  return c
}

describe('deep research cases', () => {
  it('every case is well formed: ids unique, parts inside its span, sim stages start before they finish', () => {
    expect(new Set(CASES.map(c => c.id)).size).toBe(CASES.length)
    for (const c of CASES) {
      expect(c.inspiredBy.url).toMatch(/^https:\/\/www\.youtube\.com\/(watch\?v=|shorts\/)[\w-]{11}$/)
      expect(c.view.startsWith('#v=2&')).toBe(true)
      for (const p of [...c.pulls, ...c.findings, ...c.tallies]) expect(p.t).toBeLessThanOrEqual(c.span)
      for (const s of c.sim) expect(s.start).toBeLessThanOrEqual(s.t)
    }
  })

  it('the Learjet case is replayed from the real knowledge base, the rest are badged authored', () => {
    const lj = must('learjet')
    expect(lj.basis).toBe('kb')
    expect(at(lj, lj.span).total).toBeGreaterThan(2000)
    expect(at(lj, lj.span).total).toBe(Object.values(lj.tallies.at(-1)?.by ?? {}).reduce((a, b) => a + b, 0))
    expect(CASES.filter(c => c.basis === 'kb')).toEqual([lj])
  })

  it('sources only grow as research time passes, and never lag the feed', () => {
    for (const c of CASES) {
      let last = -1
      for (let i = 0; i <= 50; i++) {
        const s = at(c, clock(c.span, i / 50))
        expect(s.total).toBeGreaterThanOrEqual(last)
        for (const p of PLATFORMS) expect(s.by[p]).toBeGreaterThanOrEqual(s.pulls.filter(q => q.platform === p).length)
        last = s.total
      }
      expect(at(c, c.span).done).toBe(true)
      expect(at(c, c.span).sim.every(x => x.status === 'done')).toBe(true)
    }
  })

  it('the log clock gives the first minutes screen time and ends on the span', () => {
    expect(clock(18000, 0)).toBe(0)
    expect(clock(18000, 1)).toBe(18000)
    expect(clock(18000, 0.3)).toBeLessThan(30)
    expect(elapsed(12.2)).toBe('12 min')
    expect(elapsed(18237)).toBe('12 d 15 h')
  })

  it('the card says what it is: authored examples are badged, tiers shown, sources counted', () => {
    const c = must('dark-fleet')
    const ui = JSON.stringify(researchCard(at(c, c.span)))
    expect(ui).toContain('AUTHORED EXAMPLE')
    expect(ui).toContain('INFERRED')
    expect(ui).toContain('"skin":"gev"')
    expect(JSON.stringify(researchCard(at(must('learjet'), 30)))).toContain('REAL SOURCES')
  })
})

describe('/research', () => {
  it('without a case lists the cases; with one publishes a card that plays to the end', async () => {
    const panel = vi.fn()
    const notice = vi.fn()
    await researchCommand({ transcript: { panel, notice } }, '')
    expect(String(panel.mock.calls[0]?.[1])).toContain('learjet-n722bd')

    vi.useFakeTimers()
    const updates: unknown[] = []
    const publishNative = vi.fn(() => ({ update: (card: unknown) => { updates.push(card) } }))
    const host = { transcript: { panel, notice }, eui: { host: { publishNative } } }
    await researchCommand(host, 'ground stop', { seconds: 2, fps: 4, owner: undefined })
    expect(publishNative).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(3000)
    vi.useRealTimers()
    const last = JSON.stringify(updates.at(-1))
    expect(updates.length).toBe(8)
    expect(last).toContain('"status":"done"')
    expect(last).toContain('Ground stop')
  })
})
