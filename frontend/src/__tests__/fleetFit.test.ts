import { describe, expect, it } from 'vitest'

import { euiDir } from '../eui/cards.js'
import { FLEET_ROW_CAP, fleetFit } from '../eui/fleetFit.js'
import { createSandbox, type EuiMounted, type EuiNode } from '../eui/sandbox.js'

// Synthetic fixtures only.
const settle = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
type El = Extract<EuiNode, { t: 'el' }>

/** Elements carrying `cls`; with `visible`, none under a hidden node. */
function all(n: EuiNode | null, cls: string, visible = false, out: El[] = []): El[] {
  if (n?.t !== 'el' || (visible && n.attrs['hidden'])) return out
  if (n.cls.split(' ').includes(cls)) out.push(n)
  for (const k of n.kids) all(k, cls, visible, out)
  return out
}
const shown = (n: EuiNode | null, cls: string) => all(n, cls, true)
/** The nth match, failing the test when it is missing. */
function nth(n: EuiNode | null, cls: string, i: number): El {
  const el = all(n, cls)[i]
  if (!el) throw new Error(`no ${cls} #${i}`)
  return el
}
const text = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(text).join('') : ''

const task = (id: string, status: string) => ({ id, label: 'Task ' + id, status })
const product = (id: string, statuses: string[]) => ({ id, label: 'Product ' + id, horizon: 'now', features: [
  { id: id + '-a', label: id + ' area a', horizon: 'now', tasks: statuses.map((s, i) => task(id + i, s)) },
  { id: id + '-b', label: id + ' area b', horizon: 'next', tasks: [task(id + 'b', 'next')] }] })
const portfolio = { kind: 'fleet-portfolio', app: 'dash', data: { at: '2026-11-12T00:00:00Z', portfolios: { s: { label: 'Synthetic', lead: 'Synthetic', shared: [],
  products: [product('p1', ['next', 'done']), product('p2', ['active', 'blocked', 'next', 'done', 'done', 'done']), product('p3', ['next']), product('p4', ['next'])] } } } }
const factory = { kind: 'fleet-factory', app: 'aodl', data: { at: '2026-11-12T00:00:00Z', stats: { queue: 1, depth: 4, sendsHour: 1, capHour: 4, posted: 1, verifyPass: 1 },
  nodes: [{ id: 'b', col: 0, label: 'Brain', kind: 'chat', state: 'live' },
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'c' + i, col: 1, label: 'Card ' + i, kind: 'chat', state: 'failing', reason: 'failed ' + i, action: 'Prepare fix' }))],
  edges: [1, 2, 3, 4, 5].map(i => ['b', 'c' + i, 'delegated', true]) } }

async function mount(doc: { kind: string, app: string }, fitted = true): Promise<EuiMounted> {
  const sb = await createSandbox(euiDir(), 'dark')
  const card = sb.mount(doc.kind, doc.app, () => undefined, doc, undefined, fitted ? fleetFit(doc.kind) : undefined)
  await settle(200)
  return card
}

describe('fleetFit', () => {
  it('fits only the fleet kinds', () => {
    expect(fleetFit('kanban')).toBeUndefined()
    expect(fleetFit('fleet-hosts')).toBeTypeOf('function')
  })

  it('opens only the urgent portfolio group and caps groups, features and tasks behind "N more"', async () => {
    const card = await mount(portfolio)
    try {
      const snap = card.snapshot()
      const groups = all(snap, 'fp-group')
      expect(groups.map(g => g.attrs['open'])).toEqual(['', 'true', '', ''])
      expect(text(nth(snap, 'fp-group', 1))).toContain('Product p2')
      // Two groups shown, the rest behind one button; one feature shown per group; three tasks per feature.
      expect(shown(snap, 'fp-group')).toHaveLength(2)
      expect(shown(nth(snap, 'fp-group', 1), 'fp-feat')).toHaveLength(1)
      expect(shown(nth(snap, 'fp-group', 1), 'fp-task')).toHaveLength(FLEET_ROW_CAP)
      expect(all(snap, 'fl-more').map(text)).toEqual(['3 more', '1 more', '2 more'])
      // Every tag is one neutral pill; none keeps the kit's per-status class.
      expect(all(snap, 'fl-tag').length).toBeGreaterThan(0)
      expect([...all(snap, 'fp-st'), ...all(snap, 'fp-hz'), ...all(snap, 'fp-tag')]).toHaveLength(0)
    } finally { card.dispose() }
  }, 30_000)

  it('reveals capped rows on "N more" and never re-closes a group the reader opened', async () => {
    const card = await mount(portfolio)
    try {
      const more = all(card.snapshot(), 'fl-more').find(b => text(b) === '3 more')
      if (!more) throw new Error('no "3 more"')
      expect(more.click).toBe(true)
      card.click(more.id)
      await settle(300)
      let snap = card.snapshot()
      expect(shown(nth(snap, 'fp-group', 1), 'fp-task')).toHaveLength(6)
      expect(all(snap, 'fl-more').map(text)).toEqual(['1 more', '2 more'])

      const first = nth(snap, 'fp-prow', 0)
      card.click(first.id)
      await settle(300)
      snap = card.snapshot()
      expect(nth(snap, 'fp-group', 0).attrs['open']).toBe('true')
    } finally { card.dispose() }
  }, 30_000)

  it('folds the factory stats and graph below capped action rows', async () => {
    const card = await mount(factory)
    try {
      const snap = card.snapshot()
      const fold = all(snap, 'fl-fold')
      expect(fold).toHaveLength(1)
      expect(nth(snap, 'fl-fold', 0).attrs['open']).toBe('')
      expect(all(snap, 'ff-graph')).toHaveLength(0)
      expect(shown(snap, 'ff-bi')).toHaveLength(FLEET_ROW_CAP)
      expect(all(snap, 'fl-more').map(text)).toEqual(['2 more'])
    } finally { card.dispose() }
  }, 30_000)

  it('leaves an unfitted mount as the kit drew it', async () => {
    const card = await mount(portfolio, false)
    try {
      const snap = card.snapshot()
      expect(all(snap, 'fp-group').map(g => g.attrs['open'])).toEqual(['true', 'true', 'true', 'true'])
      expect(all(snap, 'fl-more')).toHaveLength(0)
    } finally { card.dispose() }
  }, 30_000)
})
