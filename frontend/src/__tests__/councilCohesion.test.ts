import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { demoRun } from '../../../glide/frontend/council.js'
import { councilCard } from '../../../glide/frontend/councilPopup.js'
import type { EuiNode } from '../eui/sandbox.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const nodes = (n: EuiNode): EuiNode[] => [n, ...(n.t === 'el' ? n.kids.flatMap(nodes) : [])]

describe('council shares the tool-card grammar', () => {
  it('keeps the brief, seat state, controls and a small one-colour seat ring, without display type', () => {
    const run = demoRun()
    const all = nodes(councilCard({ run, live: false, from: 'SAMPLE' }, { t: null }))
    const styles = all.flatMap(n => n.t === 'text' ? [] : [n.style]).join(';')
    expect(styles).not.toContain('Cormorant')
    expect(styles).not.toContain('border-radius:16px')
    const svgs = all.flatMap(n => n.t === 'svg' ? [n] : [])
    expect(svgs.every(n => n.w <= 180)).toBe(true)
    const ring = svgs.find(n => n.w > 32)
    expect(ring).toBeDefined()
    for (const seat of run.seats) expect(ring?.svg).toContain(`>${seat.name}<`)
    expect(ring?.svg).not.toMatch(/Gradient|serif|#dc9a32|#2f8a5c|#25418f/)
    expect(JSON.stringify(all)).toContain('Convene council')
    expect(JSON.stringify(all)).toContain('data-council-seat')
  })

  it('uses design tokens', () => {
    expect(tokenDrift(readFileSync(new URL('../../../glide/frontend/councilPopup.ts', import.meta.url), 'utf8'))).toEqual(NO_DRIFT)
  })
})
