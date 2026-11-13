import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { intelCommand, type IntelHost } from '../commands/intel.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import { EuiHostCards } from '../eui/host.js'
import type { UiIntent, UiNode } from '../glideui/library.js'
import { euiCardNode } from '../view/euiCard.js'
import type { EuiSandbox } from '../eui/sandbox.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { decodeIntel, decodeIntelIntent, intelText } from '../wire/intel.js'

import { must, ofKind, stub } from './fakes.js'

// Synthetic contract rows only. This is not a substitute for acceptance with the new kit.
function document(tab = 0) {
  return { kind: 'intel-suite', app: 'glide', data: {
    at: '2026-11-11T00:00:00Z', tab,
    climbs: [{ id: 'run-a', label: 'Synthetic climb', metric: 'score', points: [1, 2], best: 2 }],
    routes: [{ skill: 'sample-skill', hits: 2, corrected: 0 }],
    memory: [{ level: 'L0', name: 'Packet', size: '1 KB', fresh: 'now', stale: false }],
    failures: [{ sig: 'failure-a', source: 'fixture', spark: '010', count: 1, status: 'open' }],
    trace: [{ lane: 'sample', spans: [[0, 1, 'm']] }], notes: ['Synthetic source unavailable']
  } }
}
const dispatch = (value: unknown) => ({ output: JSON.stringify(value) })
const closures: (() => void)[] = []
afterEach(() => { closures.splice(0).forEach(close => close()); vi.clearAllMocks() })

function find(n: UiNode, name: UiNode['typeName']): UiNode | undefined {
  if (n.typeName === name) return n
  for (const k of 'children' in n.props ? n.props.children : []) { const hit = find(k, name); if (hit) return hit }
  return undefined
}

function setup() {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('fixture-session'), stored: null }
  const transcript = new Transcript()
  const request = vi.fn(async (): Promise<unknown> => dispatch(document()))
  const panel = vi.fn()
  let detail: unknown
  const sandbox: EuiSandbox = { kinds: ['intel-suite'], apps: () => [], mount: (_kind, _app, _change, _doc, intent) => ({
    app: 'glide', label: 'Intel', snapshot: () => null,
    click: () => { intent?.(detail); return true }, dispose: () => undefined
  }) }
  const cards = new EuiHostCards(['intel-suite'], vi.fn(), euiHostPort({ session, transcript }, () => true), async () => sandbox)
  closures.push(() => cards.close())
  const host: IntelHost = { session, transcript, gw: stub<IntelHost['gw']>({ request }),
    eui: stub<NonNullable<IntelHost['eui']>>({ host: cards }),
    control: () => stub<ReturnType<IntelHost['control']>>({ panel }) }
  const entry = () => ofKind(transcript.entries.find(e => e.kind === 'panel'), 'panel')
  const view = () => must(cards.view(entry()))
  const tap = async (action: UiIntent, sent = view()) => {
    await vi.waitFor(() => expect(cards.size).toBe(1))
    await Promise.resolve()
    detail = action
    must(sent.send)(action)
    await Promise.resolve()
    await Promise.resolve()
  }
  const part = (name: UiNode['typeName']) => find(must(view().ui), name)
  const activeTab = () => { const t = part('Tabs'); return t?.typeName === 'Tabs' ? Number(t.props.active) : undefined }
  return { host, request, panel, session, transcript, cards, view, tap, part, activeTab }
}

describe('intel stock command boundary', () => {
  it('unwraps the actual stock dispatch envelope, validates data and strips demo authority', () => {
    expect(decodeIntel(dispatch({ ...document(), demo: true }))).toEqual(document())
    expect(intelText(dispatch({ text: 'Synthetic detail' }))).toBe('Synthetic detail')
  })

  it.each([null, document(), { output: 4 }, { output: 'not json' }, dispatch({ error: 'Synthetic failure' }),
    dispatch({ kind: 'intel-suite', app: 'glide' }), dispatch({ ...document(), kind: 'fleet-hosts' }),
    dispatch({ ...document(), app: 'other' }), dispatch({ kind: 'intel-suite', app: 'glide', demo: true, data: {} })])('rejects invalid dispatch/data %j', raw => {
    expect(() => decodeIntel(raw)).toThrow()
  })

  it.each([
    { at: 'yesterday' }, { tab: 5 }, { climbs: [{ id: 'a', label: 'a', metric: 'a', points: Array(65).fill(1), best: 1 }] },
    { routes: Array(13).fill({ skill: 's', hits: 1, corrected: 0 }) },
    { routes: [{ skill: 's', hits: -1, corrected: 0 }] }, { routes: [{ skill: 's', hits: 0.5, corrected: 0 }] },
    { memory: [{ level: 'L6', name: 'x', size: '', fresh: '', stale: false }] },
    { failures: [{ sig: 'f', source: 'x', spark: '012', count: 1, status: 'open' }] },
    { failures: [{ sig: 'f', source: 'x', spark: '0'.repeat(15), count: 1, status: 'open' }] },
    { failures: [{ sig: 'f', source: 'x', spark: '', count: 1, status: 'unknown' }] },
    { trace: [{ lane: 'x', spans: [[2, 1, 'm']] }] }, { trace: [{ lane: 'x', spans: [[0, 1, 'x']] }] },
    { trace: [{ lane: 'x', spans: Array(101).fill([0, 1, 'm']) }, { lane: 'y', spans: Array(100).fill([0, 1, 't']) }] },
    { notes: ['x'.repeat(201)] }, { climbs: [] , routes: null }
  ])('rejects malformed intel fields %j', fields => {
    const doc = document()
    expect(() => decodeIntel(dispatch({ ...doc, data: { ...doc.data, ...fields } }))).toThrow()
  })

  it('accepts empty source arrays with notes and enforces the document byte limit', () => {
    const doc = { kind: 'intel-suite', app: 'glide', data: { at: '2026-11-11T00:00:00Z', climbs: [], routes: [], memory: [], failures: [], trace: [], notes: ['Unavailable'] } }
    expect(decodeIntel(dispatch(doc))).toEqual(doc)
    expect(() => decodeIntel({ output: ' '.repeat(1024 * 1024 + 1) })).toThrow()
    expect(() => intelText(dispatch({ text: 12 }))).toThrow()
    expect(() => intelText(dispatch({ text: 'x'.repeat(65537) }))).toThrow()
  })

  it.each([{ action: 'tab', entities: { tab: -1 } }, { action: 'tab', entities: { tab: '1' } },
    { action: 'open-climb', entities: {} }, { action: 'open-skill', entities: { skill: 'x'.repeat(201) } },
    { action: 'shell.exec', entities: {} }])('rejects invalid intents %j', raw => {
    expect(() => decodeIntelIntent(raw)).toThrow()
  })
})

describe('intel command and host-owned actions', () => {
  it.each([['', 'hill', 0], ['--json', 'hill', 0], ['hill', 'hill', 0], ['skills', 'skills', 1], ['memory', 'memory', 2], ['failures', 'failures', 3], ['trace', 'trace', 4], ['--json trace', 'trace', 4]])('registers /intel %s and uses only stock dispatch', async (arg, tab, index) => {
    const f = setup()
    expect(localCommand('intel')?.help).toContain('hill')
    await must(localCommand('intel')).run(stub({ ...f.host }), arg)
    expect(f.request).toHaveBeenCalledExactlyOnceWith('command.dispatch', { name: 'intel', arg: `--json ${tab}`, session_id: 'fixture-session' })
    expect(f.view().spec.kind).toBe('intel-suite')
    expect(f.view().spec.app).toBe('glide')
    // A native glide/v1 tree from the shipped program for that tab; no kit snapshot is mounted.
    expect(f.view().node).toBeNull()
    expect(f.activeTab()).toBe(index)
    // Methodology notes stay on the source line rather than as prose rows.
    expect(must(f.view().ui).props).toMatchObject({ title: 'Local intelligence', source: 'Source: /intel · Synthetic source unavailable' })
  })

  it.each(['bogus', 'hill skills', '--json trace extra', 'trace --other'])('rejects invalid args %s without sending', async arg => {
    const f = setup()
    await intelCommand(f.host, arg)
    expect(f.request).not.toHaveBeenCalled()
    expect(JSON.stringify(f.transcript.entries)).toContain('Usage: /intel')
  })

  it('switches tabs in place without an RPC and refreshes the selected tab via both controls', async () => {
    const f = setup()
    await intelCommand(f.host, '')
    const old = f.view()
    await f.tap({ action: 'tab', entities: { tab: 3 } })
    expect(f.request).toHaveBeenCalledTimes(1)
    expect(f.activeTab()).toBe(3)
    expect(f.view().identity).not.toBe(old.identity)
    // A queued tap from the replaced revision is dropped.
    await f.tap({ action: 'refresh', entities: {} }, old)
    expect(f.request).toHaveBeenCalledTimes(1)
    await f.tap({ action: 'refresh', entities: {} })
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(2))
    expect(f.request).toHaveBeenLastCalledWith('command.dispatch', { name: 'intel', arg: '--json failures', session_id: 'fixture-session' })
    await vi.waitFor(() => expect(f.activeTab()).toBe(3))
    // The card's own Refresh button sends the same intent.
    const actions = f.part('Buttons')
    const refresh = actions?.typeName === 'Buttons' ? actions.props.items.find(b => b.label === 'Refresh') : undefined
    await f.tap(must(refresh).intent)
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(3))
    expect(f.transcript.entries.filter(e => e.kind === 'panel')).toHaveLength(1)
    expect(f.activeTab()).toBe(3)
  })

  it.each([
    ['open-climb', { id: 'run-a' }, 'climb run-a'],
    ['open-skill', { skill: 'sample-skill' }, 'skill sample-skill'],
    ['open-failure', { sig: 'failure-a' }, 'failure failure-a']
  ])('%s reads backend detail and opens a text panel', async (action, entities, command) => {
    const f = setup()
    await intelCommand(f.host, '')
    f.request.mockResolvedValue(dispatch({ text: 'Synthetic detail text' }))
    await f.tap({ action, entities })
    await vi.waitFor(() => expect(f.panel).toHaveBeenCalledWith(expect.any(String), 'Synthetic detail text'))
    expect(f.request).toHaveBeenLastCalledWith('command.dispatch', { name: 'intel', arg: `--json ${command}`, session_id: 'fixture-session' })
  })

  it('quotes opaque detail ids for the backend parser rather than adding arguments', async () => {
    const f = setup()
    const doc = document()
    const entity = "Synthetic O'Brien climb --json trace"
    doc.data.climbs = [{ ...must(doc.data.climbs[0]), id: entity }]
    f.request.mockResolvedValue(dispatch(doc))
    await intelCommand(f.host, '')
    f.request.mockResolvedValue(dispatch({ text: 'Quoted fixture detail' }))
    await f.tap({ action: 'open-climb', entities: { id: entity } })
    await vi.waitFor(() => expect(f.panel).toHaveBeenCalledWith('Synthetic climb', 'Quoted fixture detail'))
    expect(f.request).toHaveBeenLastCalledWith('command.dispatch', { name: 'intel', arg: "--json climb 'Synthetic O'\\''Brien climb --json trace'", session_id: 'fixture-session' })
  })

  it.each<UiIntent>([
    { action: 'unknown', entities: {} }, { action: 'tab', entities: { tab: 5 } },
    { action: 'open-climb', entities: { id: 'foreign' } }, { action: 'open-skill', entities: { skill: 'foreign' } },
    { action: 'open-failure', entities: { sig: 'foreign' } }
  ])('shows a visible note without RPC for invalid or foreign action %j', async detail => {
    const f = setup()
    await intelCommand(f.host, '')
    await f.tap(detail)
    expect(f.request).toHaveBeenCalledTimes(1)
    expect(f.panel).not.toHaveBeenCalled()
    expect(JSON.stringify(f.transcript.entries)).toContain('Intel action:')
  })

  it.each(['same-id', 'transcript', 'abort'])('drops initial responses after %s ownership changes', async reason => {
    const f = setup()
    const pending = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => pending.promise)
    const run = intelCommand(f.host, '')
    if (reason === 'same-id') f.session.ref = { live: liveSessionId('fixture-session'), stored: null }
    if (reason === 'transcript') f.transcript.load([])
    if (reason === 'abort') f.session.info = stub({ profile_name: 'fixture-profile' })
    pending.resolve(dispatch(document()))
    await run
    expect(f.cards.size).toBe(0)
  })

  it.each(['detail', 'refresh'])('drops pending %s results and errors after transcript replacement', async action => {
    const f = setup()
    await intelCommand(f.host, '')
    const pending = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => pending.promise)
    await f.tap(action === 'detail' ? { action: 'open-climb', entities: { id: 'run-a' } } : { action: 'refresh', entities: {} })
    f.transcript.load([])
    f.cards.sync()
    pending.reject(new Error('Late synthetic failure'))
    await Promise.resolve()
    await Promise.resolve()
    expect(f.cards.size).toBe(0)
    expect(f.panel).not.toHaveBeenCalled()
    expect(f.transcript.entries).toHaveLength(0)
  })

  it('discards detail and refresh replies from a replaced revision', async () => {
    const f = setup()
    await intelCommand(f.host, '')
    const pending = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => pending.promise)
    await f.tap({ action: 'open-climb', entities: { id: 'run-a' } })
    await f.tap({ action: 'tab', entities: { tab: 1 } })
    pending.resolve(dispatch({ text: 'Stale detail' }))
    await Promise.resolve()
    await Promise.resolve()
    expect(f.panel).not.toHaveBeenCalled()
    const refresh = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => refresh.promise)
    await f.tap({ action: 'refresh', entities: {} })
    await f.tap({ action: 'tab', entities: { tab: 4 } })
    refresh.resolve(dispatch(document(1)))
    await Promise.resolve()
    await Promise.resolve()
    expect(f.activeTab()).toBe(4)
  })

  it('requires a session and cards, and reports malformed initial/detail/refresh replies', async () => {
    const f = setup()
    f.session.ref = { live: null, stored: null }
    await intelCommand(f.host, '')
    expect(f.request).not.toHaveBeenCalled()
    f.session.ref = { live: liveSessionId('fixture-session'), stored: null }
    await intelCommand({ session: f.session, transcript: f.transcript, gw: f.host.gw, control: f.host.control }, '')
    expect(f.request).not.toHaveBeenCalled()
    f.request.mockResolvedValue({ output: 'bad' })
    await intelCommand(f.host, '')
    expect(f.cards.size).toBe(0)
    expect(JSON.stringify(f.transcript.entries)).toContain('/intel:')
    f.request.mockResolvedValue(dispatch(document()))
    await intelCommand(f.host, '')
    f.request.mockResolvedValue(dispatch({ text: 1 }))
    await f.tap({ action: 'open-climb', entities: { id: 'run-a' } })
    await vi.waitFor(() => expect(JSON.stringify(f.transcript.entries)).toContain('Intel action:'))
    await f.tap({ action: 'refresh', entities: {} })
    await vi.waitFor(() => expect(JSON.stringify(f.transcript.entries)).toContain('Invalid /intel'))
    expect(f.panel).not.toHaveBeenCalled()
  })

  it('draws the bound program with native Tern kinds through the real card registry, never the kit sandbox', async () => {
    const f = setup()
    const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session: f.session, transcript: f.transcript }, () => true))
    closures.push(() => eui.close())
    await intelCommand({ ...f.host, eui }, '')
    const view = must(eui.hostView(ofKind(f.transcript.entries.find(e => e.kind === 'panel'), 'panel')))
    expect(view.node).toBeNull()
    const tree = JSON.stringify(euiCardNode('main.intel.host', view, eui))
    for (const role of ['glide.card', 'glide.tabs', 'glide.spark', 'glide.hero', 'glide.list', 'glide.actions', 'glide.source']) expect(tree).toContain(`"${role}"`)
    for (const text of ['Local intelligence', 'Hill climbs', 'Synthetic climb', 'best 2', 'Source: /intel']) expect(tree).toContain(text)
    expect(tree).not.toContain('data-eui-kind')
    expect(tree).not.toContain('sample-skill')
    // The hill program's list row opens the same backend detail the kit row did.
    f.request.mockResolvedValue(dispatch({ text: 'Synthetic detail text' }))
    const list = find(must(view.ui), 'List')
    const row = list?.typeName === 'List' ? list.props.items[0] : undefined
    must(view.send)(must(must(row).intent))
    await vi.waitFor(() => expect(f.panel).toHaveBeenCalledWith('Synthetic climb', 'Synthetic detail text'))
  })
})
