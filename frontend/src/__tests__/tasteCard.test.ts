import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { tasteCard } from '../../../glide/frontend/taste.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const board = Object.freeze({
  title: 'Neighborhood food atlas',
  url: 'http://127.0.0.1:8765/boards'
})

test('Taste card presents one hero, one state, one board link and one action', () => {
  const card = tasteCard(board, 21)

  expect(card).toEqual({
    kind: 'approve',
    app: 'glide',
    title: 'Neighborhood food atlas',
    rows: [
      { label: 'State', value: 'Open beside chat' },
      { label: 'Board', value: 'http://127.0.0.1:8765/boards' }
    ],
    approval: {
      label: 'Open board',
      description: 'Bring the board pane into view.'
    }
  })
  expect(JSON.stringify(card).split(board.url)).toHaveLength(2)
  expect(JSON.stringify(card)).not.toContain('21')
})

test('Taste card is pure and requires a confirmed pane block', () => {
  const first = tasteCard(board, 21)
  const second = tasteCard(board, 21)

  expect(second).toEqual(first)
  expect(board.title).toBe('Neighborhood food atlas')
  expect(board.url).toBe('http://127.0.0.1:8765/boards')
  expect(() => tasteCard(board, 0)).toThrow('Taste pane needs a valid block')
  expect(() => tasteCard(board, Number.NaN)).toThrow('Taste pane needs a valid block')
})

test('Taste card source stays within design tokens', () => {
  const file = new URL('../../../glide/frontend/taste.ts', import.meta.url)
  expect(tokenDrift(readFileSync(file, 'utf8'))).toEqual(NO_DRIFT)
})
