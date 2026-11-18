import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { euiDir, euiStyles } from '../eui/cards.js'
import { createSandbox, type EuiNode } from '../eui/sandbox.js'
import { intelDetailBody, presentIntel, type IntelDoc } from '../wire/intel.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const opaqueFailure = 'failure-' + 'a'.repeat(24)
const opaqueSession = 'session-' + 'b'.repeat(24)

// All scores, stores and names are synthetic. No installed profile data is used.
function fixture(): IntelDoc {
  return {
    kind: 'intel-suite', app: 'glide',
    data: {
      at: '2026-11-12T21:00:00Z', tab: 0,
      climbs: [
        { id: 'climb-a', label: 'lab/recall-score', metric: 'recall@3', points: [0.5, 0.62, 0.7], best: 0.7 },
        { id: 'climb-b', label: 'lab/small-run', metric: 'accuracy', points: [0.4], best: 0.4 }
      ],
      routes: [{ skill: 'systematic-debugging', hits: 8, corrected: 1 }],
      memory: [
        { level: 'L5', name: 'State-Packet.md', size: '8000 B', fresh: '2026-11-12T20:50:00Z', stale: false },
        { level: 'L2', name: 'facts.jsonl', size: '960 B', fresh: '2026-11-01T00:00:00Z', stale: true }
      ],
      failures: [
        { sig: opaqueFailure, source: 'gateway-retry', spark: '01011', count: 3, status: 'open' },
        { sig: 'failure-' + 'c'.repeat(24), source: 'old-replay', spark: '0000', count: 50, status: 'fixed' }
      ],
      trace: [{ lane: opaqueSession, spans: [[0, 2, 'm'], [2, 5, 't']] }],
      notes: ['Source: /home/sample/internal.json; read only.']
    }
  }
}

describe('intel card height', () => {
  // Real Tern at 1060x596 scrolled the card head away: a 34px serif hero, a 300px stage floor and notes.
  it('drops the hero, and caps the stage and the opened Source notes so the card head stays on screen', () => {
    const css = euiStyles()
    expect(css).toMatch(/\.k-intel-suite :is\(\.is-head,\s*\.is-receipt:empty\)\s*\{\s*display:\s*none/)
    expect(css).toMatch(/:is\(\.is-stage,\s*\.is-notes\)\s*\{\s*min-height:\s*0;\s*max-height:\s*var\(--cap,\s*208px\);\s*overflow:\s*hidden auto/)
    expect(css).toMatch(/\.is-notes\s*\{\s*--cap:\s*80px/)
  })

  // Tern's 406px transcript at 1060x596 left the head under the tab bar; a lower stage cap alone clipped the chart's floor.
  it('fits the hill chart inside the capped stage by scaling it by width, never by clipping its foot', () => {
    const css = euiStyles()
    // 420px wide draws the cropped 640x174 viewBox 114px tall: hero chrome (88px) plus chart stay inside the 208px stage.
    expect(css).toMatch(/\.k-intel-suite \.is-chart\s*\{\s*max-width:\s*420px/)
    expect(css).toMatch(/\[data-eui-svg\]\s*>\s*\.sf-image[^{]*\{\s*max-width:\s*100%;\s*height:\s*auto/)
    expect(css).toMatch(/\.k-intel-suite\s*\{\s*--h-density:\s*\.5/)
  })

  it.each([[[0.51, 0.55, 0.6, 0.58, 0.7]], [[0.4]], [[0, 0, 0]], [[-3, 12, 5]]])('crops the hill chart to its plot without cutting a gridline, point or label: %j', async points => {
    const kit = await createSandbox(euiDir(), 'dark')
    const doc = fixture()
    const card = kit.mount('intel-suite', 'glide', () => undefined,
      { ...doc, data: { ...doc.data, climbs: [{ id: 'climb-a', label: 'lab/x', metric: 'score', points, best: Math.max(...points) }] } })
    try {
      const charts: Extract<EuiNode, { t: 'svg' }>[] = []
      const walk = (n: EuiNode | null): void => { if (n?.t === 'svg' && n.cls === 'is-chart') charts.push(n); else if (n?.t === 'el') n.kids.forEach(walk) }
      walk(card.snapshot())
      const svg = charts[0]?.svg ?? ''
      expect(svg).toContain('viewBox="0 34 640 174"')
      expect(charts[0]?.h).toBe(174)
      const nums = (re: RegExp) => [...svg.matchAll(re)].map(m => Number(m[1]))
      const cy = nums(/<circle[^>]*\bcy="([-\d.]+)"/g)
      expect(cy).toHaveLength(points.length)
      // Points (r <= 5, stroke 2), gridlines and 16-unit labels (baseline 5 above their line) inside y 34..208.
      for (const y of [...cy.map(v => v + 6), ...nums(/<line[^>]*\by1="([-\d.]+)"/g)]) expect(y).toBeLessThanOrEqual(208)
      for (const y of [...cy.map(v => v - 6), ...nums(/<text[^>]*\by="([-\d.]+)"/g).map(v => v - 13)]) expect(y).toBeGreaterThanOrEqual(34)
    } finally { card.dispose() }
  })

  it('drops the kit rules for the hidden hero head and the stage floor it overrides', () => {
    const css = euiStyles()
    expect(css).not.toMatch(/\.is-(title|eyebrow)\b/)
    expect(css).not.toMatch(/\.eu \.is-head\s*(\{|>\s*\.is-act)/)
    expect(css).not.toMatch(/\.eu \.is-stage\s*\{/)
    expect(css).toMatch(/\.eu \.is-root\s*>\s*\*\s*,\s*\.eu \.is-pane\s*>\s*\*/)
  })
})

describe('intel card design projection', () => {
  it('leads the hill with the latest observed score and its trend without changing the best', () => {
    const raw = fixture()
    const shown = presentIntel(raw).card.data
    expect(shown.climbs[0]?.label).toContain('Now 0.7 · Rising +0.2')
    expect(shown.climbs[0]?.metric).toBe('Recall at three')
    expect(shown.climbs[0]?.best).toBe(0.7)
    expect(shown.climbs[0]?.points).toEqual([0.5, 0.62, 0.7])
    expect(raw.data.climbs[0]?.label).toBe('lab/recall-score')
    expect(shown.climbs[0]?.label).not.toContain('/')
  })

  it('puts unresolved failures first, names the next step, and preserves opaque action lookups', () => {
    const raw = fixture()
    const shown = presentIntel(raw)
    const first = shown.card.data.failures[0]
    expect(first?.status).toBe('open')
    expect(first?.sig).toContain('Open · Gateway retry')
    expect(first?.source).toContain('Next: review')
    expect(shown.failures.get(first?.sig ?? '')).toBe(opaqueFailure)
    expect(shown.card.data.failures[1]?.status).toBe('fixed')
    expect(shown.card.data.failures[1]?.source).toContain('verify the fix')
    expect(shown.card.data.failures.some(f => f.sig.includes(opaqueFailure))).toBe(false)
    const skill = shown.card.data.routes[0]?.skill ?? ''
    expect(skill).toBe('Systematic debugging')
    expect(shown.skills.get(skill)).toBe('systematic-debugging')
  })

  it('makes freshness legible, warns about stale memory, and hides session identities', () => {
    const result = presentIntel(fixture()).card.data
    expect(result.memory[0]?.fresh).toBe('Updated 10 min ago')
    expect(result.memory[0]?.name).toBe('State Packet')
    expect(result.memory[1]?.name).toContain('Review ')
    expect(result.memory[1]?.stale).toBe(true)
    expect(result.trace[0]?.lane).toBe('Session 1')
    expect(result.notes[0]).not.toContain('/home/')
    expect(result.notes[0]).not.toContain('.json')
  })

  it('renders safe explanatory details rather than raw paths, ids or ledger keys', () => {
    const data = fixture().data
    const climb = data.climbs[0]
    const failure = data.failures[0]
    expect(climb).toBeDefined()
    expect(failure).toBeDefined()
    const score = intelDetailBody('climb',
      'recall\n/home/sample/trials.jsonl\nrecall@3\nLast 10 points: [0.5, 0.62, 0.7]', climb)
    expect(score).toContain('Current score: 0.7')
    expect(score).toContain('Since first score: +0.2')
    expect(score).not.toContain('/home/')
    const ledger = 'fix-state.json / hidden-key\n{\n  "what": "Retry failed",\n  "fails": 3,\n  "passes": 1,\n  "ok": false\n}'
    const summary = intelDetailBody('failure', ledger, failure)
    expect(summary).toContain('Retry failed')
    expect(summary).toContain('Failed checks: 3')
    expect(summary).toContain('Next: inspect')
    expect(summary).not.toContain('"fails"')
    expect(summary).not.toContain('fix-state.json')
    expect(intelDetailBody('skill', 'Synthetic detail text', data.routes[0])).toBe('Synthetic detail text')
  })

  it('does not invent a score, fix or changed memory when the collectors returned nothing', () => {
    const raw = fixture()
    const data = { ...raw.data, climbs: [], routes: [], failures: [], memory: [], trace: [] }
    const shown = presentIntel({ ...raw, data }).card.data
    expect(shown.climbs).toEqual([])
    expect(shown.failures).toEqual([])
    expect(shown.memory).toEqual([])
    expect(shown.trace).toEqual([])
  })
})

describe('intel design-token drift gate', () => {
  // Every changed or new presentation file participates without editing the shared test list.
  for (const file of [
    'frontend/src/commands/intel.ts',
    'frontend/src/wire/intel.ts',
    'glide/intel.py',
    'glide/tools/intel-shots.mts',
    'frontend/src/__tests__/intelDesign.test.ts'
  ]) {
    it(file + ' uses tokens only', () => {
      expect(tokenDrift(readFileSync(join(root, file), 'utf8'))).toEqual(NO_DRIFT)
    })
  }
})
