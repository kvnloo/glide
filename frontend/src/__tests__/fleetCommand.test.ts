import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { fleetCommand, type FleetHost } from '../commands/fleet.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import type { UiNode } from '../glideui/library.js'

import { must, ofKind, stub } from './fakes.js'

vi.mock('../overlays/pullRequests.js', () => ({ openUrl: vi.fn() }))
const cards: EuiCards[] = []
afterEach(() => { cards.splice(0).forEach(card => card.close()); vi.clearAllMocks() })

function setup(reply: unknown = { kind: 'fleet-hosts', app: 'k3s', data: { at: '2026-11-11T00:00:00Z', hosts: [], notes: ['Source unavailable'] } }) {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('fixture-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  cards.push(eui)
  const request = vi.fn(async (_method: string, _params: unknown) => reply)
  const draft = vi.fn()
  const resume = vi.fn(async () => undefined)
  const host: FleetHost = { gw: stub<FleetHost['gw']>({ request }), session, transcript, eui,
    notice: (text, tone) => { transcript.notice(text, tone) }, reveal: vi.fn(),
    control: () => stub<ReturnType<FleetHost['control']>>({ draft }), resume }
  return { host, request, draft, resume, session, transcript, eui,
    view: () => must(eui.hostView(ofKind(transcript.entries.at(-1), 'panel'))) }
}

describe('fleet commands', () => {
  it.each([
    ['hosts', '', 'hosts', undefined, 'k3s'],
    ['portfolio', '', 'portfolio', undefined, 'dash'],
    ['portfolio', 'sample', 'portfolio', 'sample', 'dash'],
    ['factory', 'graph', 'factory', undefined, 'aodl']
  ])('registers /%s %s with help and calls the fleet verb', async (name, arg, view, portfolio, app) => {
    const f = setup({ kind: `fleet-${view}`, app, data: { at: '2026-11-11T00:00:00Z', notes: [] } })
    expect(localCommand(name)?.help).toBeTruthy()
    await must(localCommand(name)).run(stub({ ...f.host }), arg)
    expect(f.request).toHaveBeenCalledWith('glide.fleet', { session_id: 'fixture-session', view, ...(portfolio ? { portfolio } : {}) })
    expect(f.view().spec.kind).toBe(`fleet-${view}`)
    expect(JSON.stringify(f.view().ui)).toContain('Source: read-only fleet collectors')
  })

  it.each(['unknown method: glide.fleet', 'Method not found', { code: -32601 }])('renders and refreshes through stock command.dispatch for %j', async error => {
    const doc = { kind: 'fleet-portfolio', app: 'dash', data: { at: '2026-11-11T00:00:00Z', portfolios: {}, notes: ['Synthetic source unavailable'] } }
    const f = setup()
    f.request.mockImplementation(async method => {
      if (method === 'glide.fleet') throw typeof error === 'string' ? new Error(error) : error
      return { output: JSON.stringify(doc) }
    })
    await fleetCommand(f.host, 'portfolio', 'sample')
    expect(f.request).toHaveBeenCalledWith('command.dispatch', {
      name: 'fleet', arg: 'portfolio {"portfolio":"sample"}', session_id: 'fixture-session'
    })
    expect(f.view().spec.kind).toBe('fleet-portfolio')
    expect(JSON.stringify(f.view().ui)).toContain('Synthetic source unavailable')
    must(f.view().send)({ action: 'refresh', entities: {} })
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(4))
    expect(f.transcript.entries.filter(e => e.kind === 'panel')).toHaveLength(1)
  })

  it.each([{ output: 'not-json' }, { output: JSON.stringify({ error: 'Synthetic fleet failure' }) }, { output: '{}' }, { output: JSON.stringify({ kind: 'fleet-factory', app: 'aodl', data: {} }) }])('rejects malformed stock dispatch reply %j visibly', async reply => {
    const f = setup()
    f.request.mockRejectedValueOnce(new Error('unknown method: glide.fleet')).mockResolvedValueOnce(reply)
    await fleetCommand(f.host, 'hosts')
    expect(f.eui.host.size).toBe(0)
    expect(JSON.stringify(f.transcript.entries)).toContain('/hosts:')
  })

  it('shows source notes and refresh re-calls the same verb in the same panel', async () => {
    const f = setup()
    await fleetCommand(f.host, 'hosts')
    expect(JSON.stringify(f.view().ui)).toContain('Source unavailable')
    must(f.view().send)({ action: 'refresh', entities: {} })
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(2))
    expect(f.transcript.entries.filter(e => e.kind === 'panel')).toHaveLength(1)
  })

  it.each([['hosts', 'extra'], ['portfolio', 'two keys']])('reports invalid /%s arguments without an RPC', async (name, arg) => {
    const f = setup()
    await must(localCommand(name)).run(stub({ ...f.host }), arg)
    expect(f.request).not.toHaveBeenCalled()
    expect(JSON.stringify(f.transcript.entries)).toContain('Usage:')
  })

  it('requires an attached session and reports source errors', async () => {
    const f = setup()
    f.session.ref = { live: null, stored: null }
    await fleetCommand(f.host, 'hosts')
    expect(f.request).not.toHaveBeenCalled()
    expect(JSON.stringify(f.transcript.entries)).toContain('attached session')
    f.session.ref = { live: liveSessionId('fixture-session'), stored: null }
    f.request.mockRejectedValue(new Error('Synthetic source failure'))
    await fleetCommand(f.host, 'hosts')
    expect(JSON.stringify(f.transcript.entries)).toContain('Synthetic source failure')
  })

  it('drops refresh and initial results after transcript replacement', async () => {
    const f = setup()
    await fleetCommand(f.host, 'hosts')
    const pending = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => pending.promise)
    const view = f.view()
    must(view.send)({ action: 'refresh', entities: {} })
    f.transcript.load([])
    f.eui.host.sync()
    pending.resolve({ kind: 'fleet-hosts', app: 'k3s', data: {} })
    await vi.waitFor(() => expect(f.eui.host.size).toBe(0))
    expect(f.transcript.entries).toHaveLength(0)
    const next = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => next.promise)
    const command = fleetCommand(f.host, 'hosts')
    f.transcript.load([])
    next.resolve({ kind: 'fleet-hosts', app: 'k3s', data: {} })
    await command
    expect(f.eui.host.size).toBe(0)
  })

  it('rejects malformed and mismatched replies visibly', async () => {
    for (const reply of [null, { error: 'source failed' }, { kind: 'fleet-factory', app: 'aodl', data: {} }]) {
      const f = setup(reply)
      await fleetCommand(f.host, 'hosts')
      expect(f.eui.host.size).toBe(0)
      expect(JSON.stringify(f.transcript.entries)).toContain('/hosts:')
    }
  })

  it('ignores late replies after same-id adoption or transcript replacement', async () => {
    const pending = Promise.withResolvers<unknown>()
    const f = setup()
    f.request.mockImplementation(() => pending.promise)
    const running = fleetCommand(f.host, 'hosts')
    f.session.ref = { live: liveSessionId('fixture-session'), stored: null }
    pending.resolve({ kind: 'fleet-hosts', app: 'k3s', data: {} })
    await running
    expect(f.eui.host.size).toBe(0)
  })

  // Synthetic snapshot: two hosts, three agents, one pod; one repository task listed under two products.
  const hostsDoc = { kind: 'fleet-hosts', app: 'k3s', data: { at: '2026-11-11T00:00:00Z', notes: [], hosts: [
    { id: 'h1', label: 'alpha', role: 'Local host', online: true, gauges: { cpu: 40, mem: 60, disk: null, gpu: 70 },
      k3s: { node: 'Ready', version: 'v1', pods: [['ns', 'pod-a', 'Pending', 2, 'ContainerCreating']] },
      harnesses: [{ kind: 'Hermes', agents: [{ id: 's-one', name: 'sample one', state: 'working' }, { id: 's-two', name: 'sample two', state: 'blocked', line: 'waiting on you' }] },
        { kind: 'fx', agents: [{ id: 'process:9', name: 'fx worker', state: 'idle' }] }] },
    { id: 'h2', label: 'beta', online: false, k3s: null, harnesses: [] }] } }
  const find = (n: UiNode | undefined, name: UiNode['typeName']): UiNode | undefined => {
    if (!n) return undefined
    if (n.typeName === name) return n
    for (const k of 'children' in n.props ? n.props.children : []) { const hit = find(k, name); if (hit) return hit }
    return undefined
  }

  it('draws /hosts natively: tabs switch locally, rows send the kit fleet intents', async () => {
    const f = setup(hostsDoc)
    await fleetCommand(f.host, 'hosts')
    const ui = must(f.view().ui)
    const list = find(ui, 'List')
    expect(list?.typeName === 'List' && list.props.items.map(i => [i.label, i.badge, i.group])).toEqual([
      ['sample one', 'working', 'alpha · Local host'], ['sample two', 'needs you', 'alpha · Local host'],
      ['fx worker', 'idle', 'alpha · Local host']])
    expect(JSON.stringify(ui)).toContain('No agents reported: beta (offline)')
    must(f.view().send)(must(list?.typeName === 'List' ? list.props.items[1]?.intent : undefined))
    await vi.waitFor(() => expect(f.draft).toHaveBeenCalledWith('Follow up with sample two on h1: '))
    must(f.view().send)({ action: 'tab', entities: { tab: 'k3s' } })
    await vi.waitFor(() => expect(find(f.view().ui, 'Tabs')?.props).toMatchObject({ active: 'k3s' }))
    const pods = find(f.view().ui, 'List')
    expect(pods?.typeName === 'List' && pods.props.items[0]).toMatchObject({ label: 'ns/pod-a', badge: 'Pending', tone: 'warning', value: '2 restarts' })
    expect(JSON.stringify(f.view().ui)).toContain('Not in cluster: beta')
    must(f.view().send)({ action: 'tab', entities: { tab: 'machines' } })
    await vi.waitFor(() => expect(find(f.view().ui, 'Table')).toBeDefined())
    const table = find(f.view().ui, 'Table')
    expect(table?.typeName === 'Table' && table.props.rows[0]?.cells).toMatchObject({ cpu: 0.4, disk: '—' })
    expect(f.request).toHaveBeenCalledTimes(1)
    expect(f.transcript.entries.filter(e => e.kind === 'panel')).toHaveLength(1)
  })

  it('draws /portfolio with one row per repository task and /factory graph as an SVG spine', async () => {
    const task = { id: 'demo/r#7', label: 'Sample task', status: 'next', url: 'https://github.com/demo/r/issues/7' }
    const p = setup({ kind: 'fleet-portfolio', app: 'dash', data: { at: '2026-11-11T00:00:00Z', notes: [], portfolios: { s: { label: 'Sample', products: [
      { id: 'a', label: 'Product A', horizon: 'now', features: [{ id: 'f', label: 'demo/r', tasks: [task] }] },
      { id: 'b', label: 'Product B', horizon: 'next', features: [{ id: 'g', label: 'demo/r', tasks: [task] }] }] } } } })
    await fleetCommand(p.host, 'portfolio')
    const lists = JSON.stringify(p.view().ui)
    expect(lists.match(/"label":"Sample task"/g)).toHaveLength(1) // one row per repository task, marked in place
    expect(lists).toContain('"badge":"next step"')
    expect(lists).toContain('#7 · every product')
    const f = setup({ kind: 'fleet-factory', app: 'aodl', data: { at: '2026-11-11T00:00:00Z', notes: [],
      nodes: [{ id: 'brain', col: 0, label: 'Brain', state: 'live' }, { id: 'lane:b', col: 1, label: 'build', state: 'failing', reason: 'red', action: 'Prepare fix' }],
      edges: [['brain', 'lane:b', 'delegated', true], ['brain', 'ghost', 'delegated', false]] } })
    await fleetCommand(f.host, 'factory')
    const graphic = find(f.view().ui, 'Graphic')
    expect(graphic?.typeName === 'Graphic' && graphic.props.alt).toContain('2 nodes, 1 edge')
    expect(graphic?.typeName === 'Graphic' && (graphic.props.svg.match(/<path/g) ?? []).length).toBe(1)
    must(f.view().send)({ action: 'queue-fix', entities: { node: 'lane:b' } })
    await vi.waitFor(() => expect(f.draft).toHaveBeenCalledWith('Investigate and prepare a fix for build (lane:b). '))
  })
})
