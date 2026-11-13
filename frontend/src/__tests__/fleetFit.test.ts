import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { liveSessionId } from '../core/ids.js'
import { euiDir } from '../eui/cards.js'
import { FLEET_ROW_CAP, fleetFit } from '../eui/fleetFit.js'
import { EuiHostCards } from '../eui/host.js'
import { createSandbox, type EuiMounted, type EuiNode, type EuiSandbox } from '../eui/sandbox.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { must, ofKind } from './fakes.js'

// Synthetic fixtures only.
type El = Extract<EuiNode, { t: 'el' }>

/** Elements carrying `cls`, in document order. */
function all(n: EuiNode | null | undefined, cls: string, out: El[] = []): El[] {
  if (n?.t !== 'el') return out
  if (n.cls.split(' ').includes(cls)) out.push(n)
  for (const k of n.kids) all(k, cls, out)
  return out
}
/** The nth match, failing the test when it is missing. */
function nth(n: EuiNode | null | undefined, cls: string, i: number): El {
  const el = all(n, cls)[i]
  if (!el) throw new Error(`no ${cls} #${i}`)
  return el
}
const text = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(text).join('') : ''
const button = (n: EuiNode, label: string): El => must(all(n, 'fl-more').find(b => text(b) === label))

const task = (id: string, status: string) => ({ id, label: 'Task ' + id, status })
const product = (id: string, statuses: string[]) => ({ id, label: 'Product ' + id, horizon: 'now', features: [
  { id: id + '-a', label: id + ' area a', horizon: 'now', uses: ['kit'], tasks: statuses.map((s, i) => task(id + i, s)) },
  { id: id + '-b', label: id + ' area b', horizon: 'next', tasks: [task(id + 'b', 'next')] }] })
const portfolio = { kind: 'fleet-portfolio', app: 'dash', data: { at: '2026-11-12T00:00:00Z', portfolios: { s: { label: 'Synthetic', lead: 'Synthetic lead', shared: [{ id: 'kit', label: 'Kit', owner: 'p1' }],
  products: [product('p1', ['next', 'done']), product('p2', ['active', 'blocked', 'next', 'done', 'done', 'done']), product('p3', ['next']), product('p4', ['next'])] } } } }
const agent = (id: string, state: string) => ({ id, name: 'Agent ' + id, state, line: 'line ' + id, age: '1m', model: 'sample' })
const host = (id: string, states: string[]) => ({ id, label: 'Host ' + id, role: 'Sample', online: true, gauges: { cpu: 1, mem: 1, swap: 1, disk: 1, gpu: null }, k3s: null,
  harnesses: [{ kind: 'Sample', agents: states.map((s, i) => agent(id + i, s)) }, { kind: 'Other', agents: [agent(id + 'o', 'idle')] }] })
const hosts = { kind: 'fleet-hosts', app: 'k3s', data: { at: '2026-11-12T00:00:00Z',
  hosts: [host('h1', ['working']), host('h2', ['idle', 'working', 'blocked', 'idle']), host('h3', ['idle']), host('h4', ['idle'])] } }
const factory = { kind: 'fleet-factory', app: 'aodl', data: { at: '2026-11-12T00:00:00Z', stats: { queue: 1, depth: 4, sendsHour: 1, capHour: 4, posted: 1, verifyPass: 1 },
  nodes: [{ id: 'b', col: 0, label: 'Brain', kind: 'chat', state: 'live' },
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'c' + i, col: 1, label: 'Card ' + i, kind: 'chat', state: 'failing', reason: 'failed ' + i, action: 'Prepare fix' }))],
  edges: [1, 2, 3, 4, 5].map(i => ['b', 'c' + i, 'delegated', true]) } }

let sandbox: Promise<EuiSandbox> | undefined
const kit = () => (sandbox ??= createSandbox(euiDir(), 'dark'))
const live: EuiMounted[] = []
const cards: EuiHostCards[] = []
afterEach(() => { live.splice(0).forEach(m => m.dispose()); cards.splice(0).forEach(c => c.close()) })

/** One mount and its fit, read the way the host reads them: the kit's snapshot, then the fit's rewrite. */
async function mount(doc: { kind: string, app: string }) {
  const card = (await kit()).mount(doc.kind, doc.app, () => undefined, doc)
  live.push(card)
  const fit = must(fleetFit(doc.kind))
  return { card, fit, view: () => fit(must(card.snapshot())), click: (id: number) => fit.click(id) || card.click(id) }
}

describe('fleetFit', () => {
  it('fits only the fleet kinds', () => {
    expect(fleetFit('kanban')).toBeUndefined()
    expect(fleetFit('fleet-hosts')).toBeTypeOf('function')
  })

  it("is in the host's first painted frame and never edits the kit's DOM", async () => {
    const session = new SessionState(() => undefined)
    session.ref = { live: liveSessionId('fixture-session'), stored: null }
    const transcript = new Transcript()
    const mounted: EuiMounted[] = []
    const sb = await kit()
    const spy: EuiSandbox = { ...sb, mount: (...args) => { const m = sb.mount(...args); mounted.push(m); live.push(m); return m } }
    const frames: EuiNode[] = []
    const view = () => host.view(ofKind(transcript.entries.at(-1), 'panel'))
    const host: EuiHostCards = new EuiHostCards(['fleet-portfolio'], () => { const node = view()?.node; if (node) frames.push(node) },
      euiHostPort({ session, transcript }, () => true), () => Promise.resolve(spy))
    cards.push(host)
    host.publishKit(portfolio, vi.fn())
    await vi.waitFor(() => expect(mounted).toHaveLength(1))
    // Every frame drawn from the kit, the first included, already holds the closed groups and the "N more" pills.
    const drawn = frames.filter(f => all(f, 'fp-root').length)
    expect(drawn.length).toBeGreaterThan(0)
    for (const frame of drawn) {
      expect(all(frame, 'fp-group').map(g => g.attrs['open'])).toEqual(['true'])
      expect(all(frame, 'fl-more').map(text)).toEqual(['5 more', '1 more', '3 more'])
    }
    // The kit's own DOM keeps every group open: the fit rewrites what is drawn, not what the kit owns.
    expect(all(must(mounted[0]).snapshot(), 'fp-group').map(g => g.attrs['open'])).toEqual(['true', 'true', 'true', 'true'])
    expect(all(must(mounted[0]).snapshot(), 'fl-more')).toHaveLength(0)
  }, 30_000)

  it('opens only the urgent portfolio group, caps groups, features and tasks, and drops what Tern already shows', async () => {
    const { view } = await mount(portfolio)
    const snap = view()
    const group = nth(snap, 'fp-group', 0)
    expect(text(group)).toContain('Product p2')
    expect(all(snap, 'fp-feat')).toHaveLength(1)
    // The blocked task sorts second and takes the one place under the cap.
    expect(all(group, 'fp-task').map(t => t.attrs['data-task'])).toEqual(['p21'])
    expect(all(snap, 'fl-more').map(text)).toEqual(['5 more', '1 more', '3 more'])
    // Every tag is one neutral pill; none keeps the kit's per-status class.
    expect(all(snap, 'fl-tag').length).toBeGreaterThan(0)
    expect([...all(snap, 'fp-st'), ...all(snap, 'fp-hz'), ...all(snap, 'fp-tag')]).toHaveLength(0)
    // The select names the portfolio and the gold pill the next step; the age shares the stats line.
    expect([...all(snap, 'fp-title'), ...all(snap, 'fp-next-k'), ...all(snap, 'fp-ftags'), ...all(snap, 'eu-ico')]).toHaveLength(0)
    expect(all(nth(snap, 'fp-stats', 0), 'fl-updated')).toHaveLength(1)
  }, 30_000)

  it('reveals capped rows on "N more", opens a closed group once, then hands its toggle back to the kit', async () => {
    const { view, click } = await mount(portfolio)
    expect(click(button(view(), '5 more').id)).toBe(true)
    let snap = view()
    expect(all(nth(snap, 'fp-group', 0), 'fp-task')).toHaveLength(6)
    expect(all(snap, 'fl-more').map(text)).toEqual(['1 more', '3 more'])

    click(button(snap, '3 more').id)
    snap = view()
    expect(all(snap, 'fp-group').map(g => g.attrs['open'])).toEqual(['', 'true', '', ''])
    const first = nth(snap, 'fp-prow', 0)
    expect(first.click).toBe(true)
    click(first.id)
    snap = view()
    expect(nth(snap, 'fp-group', 0).attrs['open']).toBe('true')
    // Now the kit's own summary: a second click closes it in the kit.
    const kitRow = nth(snap, 'fp-prow', 0)
    expect(kitRow.id).toBeGreaterThan(0)
    click(kitRow.id)
    expect(nth(view(), 'fp-group', 0).attrs['open']).toBe('')
  }, 30_000)

  it('shows only the blocked host, open, caps agents, and drops the duplicate head and the empty hint', async () => {
    const { view } = await mount(hosts)
    const snap = view()
    expect(all(snap, 'fh-host-group').map(g => [text(nth(g, 'fh-host', 0)), g.attrs['open']])).toEqual([['Host h2', 'true']])
    expect(all(nth(snap, 'fh-host-group', 0), 'fh-agentwrap')).toHaveLength(2)
    expect(all(snap, 'fl-more').map(text)).toEqual(['2 more', '1 more', '3 more'])
    expect([...all(snap, 'fh-head'), ...all(snap, 'fh-toast')]).toHaveLength(0)
    expect(all(nth(snap, 'fl-controls', 0), 'fl-updated')).toHaveLength(1)
  }, 30_000)

  it('shows one whole intel failure row, then "N more" reveals the rest', () => {
    const fit = must(fleetFit('intel-suite'))
    const row = (id: number): El => ({ t: 'el', tag: 'div', id, cls: 'is-frow', style: '', attrs: {}, click: false, kids: [{ t: 'text', text: 'Failure ' + id }] })
    const list: El = { t: 'el', tag: 'div', id: 1, cls: 'is-flist', style: '', attrs: {}, click: false, kids: [row(2), row(3), row(4)] }
    let snap = fit(list)
    expect(all(snap, 'is-frow').map(text)).toEqual(['Failure 2'])
    const more = button(snap, '2 more')
    expect(fit.click(more.id)).toBe(true)
    snap = fit(list)
    expect(all(snap, 'is-frow')).toHaveLength(3)
    expect(all(snap, 'fl-more')).toHaveLength(0)
  })

  it('folds the factory stats and graph below capped action rows, and toggles the fold', async () => {
    const { view, click, fit } = await mount(factory)
    let snap = view()
    const fold = nth(snap, 'fl-fold', 0)
    expect(fold.attrs['open']).toBe('')
    expect(all(snap, 'ff-graph')).toHaveLength(0)
    expect(all(snap, 'ff-bi')).toHaveLength(FLEET_ROW_CAP)
    expect(all(snap, 'fl-more').map(text)).toEqual(['2 more'])
    expect(all(nth(snap, 'ff-tally', 0), 'fl-updated')).toHaveLength(1)
    const summary = nth(fold, 'fl-tag', 0)
    click(summary.id)
    snap = view()
    expect(nth(snap, 'fl-fold', 0).attrs['open']).toBe('true')
    expect(all(snap, 'ff-graph')).toHaveLength(1)
    click(summary.id)
    expect(all(view(), 'ff-graph')).toHaveLength(0)
    // Only the fit's own ids are the fit's: kit ids and kitSnapshot's refresh fall through.
    expect([7, -1, -2].map(id => fit.click(id))).toEqual([false, false, false])
  }, 30_000)
})
