// Glide cards sit in the transcript the way omp's tool cards do (measured in Tern, 1060x596):
// as wide as the column, a 13px head row above the box, an 8px flat box with a 14px inset.
import { describe, expect, it } from 'vitest'

import { euiStyles } from '../eui/cards.js'
import { hostSnapshot } from '../eui/hostSnapshot.js'
import type { EuiNode } from '../eui/sandbox.js'

const card = { kind: 'note', title: 'Deep-work block on until 10:32', summary: 'Asks are held.', rows: [] } as never

const els = (n: EuiNode): Extract<EuiNode, { t: 'el' }>[] => n.t === 'el' ? [n, ...n.kids.flatMap(els)] : []

describe('host card layout', () => {
  it('puts the title in a head row above the box, not inside it', () => {
    const root = hostSnapshot(card, 'pending') as Extract<EuiNode, { t: 'el' }>
    const [head, box] = root.kids as [Extract<EuiNode, { t: 'el' }>, Extract<EuiNode, { t: 'el' }>]
    expect(head.cls).toBe('eui-host-head')
    expect(JSON.stringify(head)).toContain('Deep-work block on until 10:32')
    expect(box.cls).toBe('eu-card eui-host')
    expect(els(box).some(e => e.tag === 'h3')).toBe(false)
  })

  it('fills the column with a flat omp box', () => {
    const css = euiStyles()
    // The kit ships compacted under the [data-eu] root mark; the last rule for a selector is the one the cascade keeps.
    const rule = (sel: string): string => {
      const at = css.lastIndexOf(`${sel}{`)
      return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
    }
    expect(rule('[data-eu]')).not.toMatch(/max-width:\s*\d+px/)
    const box = rule('[data-eu] .eu-card.eui-host')
    expect(box).toMatch(/border-radius:\s*8px/)
    expect(box).toMatch(/box-shadow:\s*none/)
    expect(box).toMatch(/padding:\s*14px/)
    expect(rule('[data-eu] .eui-host-head')).toMatch(/font:\s*500 13px/)
  })

  it('keeps contents at their own size in the wider column', () => {
    const css = euiStyles()
    const rule = (sel: string): string => {
      const at = css.lastIndexOf(`${sel}{`)
      return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
    }
    // omp has no full-width buttons; the hold button is content-width with one 1px outline.
    expect(rule('[data-eu] .ih-hold')).toMatch(/width:\s*auto/)
    expect(rule('[data-eu] .ih-hold')).toMatch(/border:\s*1px solid/)
    expect(rule('[data-eu] .ah-fact')).not.toMatch(/flex:\s*1 1 0/)
    expect(rule('[data-eu] .eu-card.eui-host>p')).toMatch(/max-width:\s*72ch/)
  })
})
