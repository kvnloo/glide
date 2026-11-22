// #289: Tern draws `button:where(.sf-el)` as an inline-flex row with `white-space: nowrap`, and text-overflow
// does not apply to a flex container. A long kit label therefore never ellipsized: it overflowed the
// button and, centred, clipped at both ends. The label now sits in its own shrinkable span, which is a
// flex item that can ellipsize, and the button is capped at its container's width.
import { Node } from '@stencil-hq/tern'
import { describe, expect, it } from 'vitest'

import { euiStyles } from '../eui/cards.js'
import type { EuiNode } from '../eui/sandbox.js'
import { euiCardNode, type EuiRender } from '../view/euiCard.js'

const render: EuiRender = { click: () => undefined, svg: () => undefined, style: () => 's1' }
const LONG = 'Open colony-20261103-233209/mushroom-grow-optimizer'

const text = (value: string): EuiNode => ({ t: 'text', text: value })
const el = (id: number, tag: string, kids: EuiNode[], cls = ''): EuiNode =>
  ({ t: 'el', id, tag, cls, attrs: {}, style: '', kids, click: tag === 'button' })
const snapshot = el(0, 'div', [el(1, 'div', [
  el(2, 'button', [text(LONG)], 'is-act'),
  el(3, 'button', [el(4, 'i', []), text('Layers')], 'hint'),
  el(5, 'button', [text('  ')])
], 'is-root')])

// The drawn tree, read through Tern's own Node fields.
const drawn = () => euiCardNode('c', { spec: { kind: 'intel-suite', app: 'glide' }, app: 'glide', label: 't', node: snapshot }, render)
const all = (n: unknown): Node[] => n instanceof Node ? [n, ...n.children.flatMap(all)] : []
const button = (id: number): Node | undefined => all(drawn()).find(n => n.props['key'] === `n${id}`)
const labelled = (n: Node | undefined) => n?.children.some(c => c.props['class'] === 'eu-label') ?? false

describe('kit button labels (#289)', () => {
  it('puts a text-only label in its own span so it can ellipsize inside a flex button', () => {
    const b = button(2)
    expect(b?.props['tag']).toBe('button')
    expect(b?.props['text']).toBeUndefined()
    expect(b?.children).toHaveLength(1)
    expect(b?.children[0]?.props).toMatchObject({ tag: 'span', class: 'eu-label', text: LONG })
  })

  it('leaves mixed-content and blank buttons as the kit drew them', () => {
    expect(button(3)).toBeDefined()
    expect(labelled(button(3))).toBe(false)
    expect(labelled(button(5))).toBe(false)
  })

  it('ships the rule that caps the button and lets the label shrink', () => {
    const css = euiStyles()
    const rule = (sel: string): string => {
      const at = css.lastIndexOf(`${sel}{`)
      return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
    }
    expect(rule('.eu button')).toMatch(/max-width:\s*100%/)
    const label = rule('.eu button>.eu-label')
    for (const decl of [/min-width:\s*0/, /overflow:\s*hidden/, /text-overflow:\s*ellipsis/, /white-space:\s*nowrap/]) expect(label).toMatch(decl)
  })
})
