// /glide taste's card: the board title as hero, one state line, the short board URL, one action.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { tasteBoard, tasteCard } from '../../../glide/frontend/taste.js'
import { hostSnapshot } from '../eui/hostSnapshot.js'
import type { EuiNode } from '../eui/sandbox.js'
import { decodeEuiHostCard } from '../wire/euiHostCard.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

// Synthetic board only.
const board = tasteBoard({ title: 'Neighborhood food atlas', url: 'http://127.0.0.1:8765/s/sample-atlas/' })
const els = (n: EuiNode): Extract<EuiNode, { t: 'el' }>[] => n.t === 'el' ? [n, ...n.kids.flatMap(els)] : []
const text = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(text).join('') : ''

describe('tasteCard', () => {
  it('is a valid host approve card with one hero, one state, one short URL and one action', () => {
    const card = decodeEuiHostCard(tasteCard(board, 21), ['approve'])
    expect(card).toEqual({
      kind: 'approve', app: 'glide', title: 'Neighborhood food atlas',
      rows: [{ label: 'State', value: 'Open beside chat' }, { label: 'Board', value: '127.0.0.1:8765/s/sample-atlas' }],
      approval: { label: 'Open board', description: 'Bring the board pane into view.' }
    })
  })

  it('renders the title in the head row and one Open board button, without the pane block id', () => {
    const root = hostSnapshot(tasteCard(board, 21), 'pending')
    const all = els(root)
    expect(text(all.find(e => e.cls === 'eui-host-head') ?? root)).toBe('GlideNeighborhood food atlas')
    expect(all.filter(e => e.tag === 'button').map(text)).toEqual(['Open board'])
    const shown = text(root)
    expect(shown.split('127.0.0.1:8765/s/sample-atlas')).toHaveLength(2)
    expect(shown).not.toContain('http://')
    expect(shown).not.toContain('21')
  })

  it('is pure and refuses an unconfirmed pane block', () => {
    expect(tasteCard(board, 21)).toEqual(tasteCard(board, 21))
    expect(board).toEqual({ title: 'Neighborhood food atlas', url: 'http://127.0.0.1:8765/s/sample-atlas/' })
    for (const block of [0, -1, 1.5, Number.NaN]) {
      expect(() => tasteCard(board, block)).toThrow('Taste pane needs a valid block')
    }
  })

  it.each(['glide/frontend/taste.ts', 'glide/tools/taste-shots.mts'])('%s stays within the design tokens', file => {
    expect(tokenDrift(readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8'))).toEqual(NO_DRIFT)
  })
})
