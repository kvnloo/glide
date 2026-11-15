import { describe, expect, it } from 'vitest'
import { euiCardNode } from '../view/euiCard.js'

const render = { click() {}, style() { return 'fixture' }, svg() { return undefined } }

describe('kit CSS scope on the real renderer', () => {
  it('emits the validated card kind alongside the shared eu root', () => {
    const node = euiCardNode('sample', {
      spec: { kind: 'intel-suite', app: 'glide' }, app: 'glide', label: 'Local intelligence',
      node: { t: 'el', tag: 'div', id: 0, cls: '', style: '', attrs: {}, click: false, kids: [] }
    }, render)
    expect(JSON.stringify(node)).toContain('eu k-intel-suite')
  })
})
