import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { fleetCommand, type FleetHost } from '../commands/fleet.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

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
  const request = vi.fn(async () => reply)
  const draft = vi.fn()
  const resume = vi.fn(async () => undefined)
  const host: FleetHost = { gw: stub<FleetHost['gw']>({ request }), session, transcript, eui,
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
  })

  it('shows source notes and refresh re-calls the same verb in the same panel', async () => {
    const f = setup()
    await fleetCommand(f.host, 'hosts')
    expect(JSON.stringify(f.view().node)).toContain('Source unavailable')
    must(f.view().activate)(-1)
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
    must(view.activate)(-1)
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
})
