import { describe, expect, it, vi, afterEach } from 'vitest'

import { fleetIntent, type FleetHost } from '../commands/fleet.js'
import type { EuiKitContext } from '../eui/host.js'
import { openUrl } from '../overlays/pullRequests.js'
import { decodeEuiKit } from '../wire/euiKit.js'

import { stub } from './fakes.js'

vi.mock('../overlays/pullRequests.js', () => ({ openUrl: vi.fn() }))
afterEach(() => vi.clearAllMocks())

// Synthetic rows use the fleet-data.js example shape. No local sources are read.
const hosts = (kind = 'Hermes', id = 'ayo') => decodeEuiKit({ kind: 'fleet-hosts', app: 'k3s', data: { hosts: [{
  id: 'groot', online: true, harnesses: [{ kind, agents: [{ id, name: 'ayo', state: 'working' }] }],
  k3s: { pods: [['z0', 'litellm', 'Running', 0, '']] }
}] } })
const portfolio = (url?: string) => decodeEuiKit({ kind: 'fleet-portfolio', app: 'dash', data: { portfolios: { glide: { products: [{ id: 'glide', features: [{ id: 'cards', tasks: [{ id: 'g3', label: 'fleet + factory cards', ...(url ? { url } : {}) }] }] }] } } } })
const factory = (url?: string) => decodeEuiKit({ kind: 'fleet-factory', app: 'aodl', data: { nodes: [{ id: 'c2', label: 'HOSS12-SALV-77', ...(url ? { url } : {}) }] } })
const agent = { host: 'groot', agent: 'ayo' }
const task = { product: 'glide', feature: 'cards', task: 'g3' }
const node = { node: 'c2' }
const pod = { host: 'groot', ns: 'z0', name: 'litellm' }
function setup() {
  const notice = vi.fn(), panel = vi.fn(), draft = vi.fn(), resume = vi.fn(async () => undefined)
  const request = vi.fn(async (): Promise<unknown> => ({ text: 'Synthetic pod description' }))
  const control = () => stub<ReturnType<FleetHost['control']>>({ panel, draft })
  const host = stub<FleetHost>({ transcript: { notice }, control, resume, gw: { request } })
  const controller = new AbortController()
  const current = { value: true }
  const context: EuiKitContext = { sessionId: 'fixture-session', revision: 1, signal: controller.signal, isCurrent: () => current.value }
  return { host, context, controller, current, notice, panel, draft, resume, request }
}

describe('fleet fixed action routes', () => {
  it('resumes only a trusted Hermes session id', async () => {
    const f = setup()
    await fleetIntent(f.host, hosts(), { action: 'open-chat', entities: agent }, f.context)
    expect(f.resume).toHaveBeenCalledWith('ayo')
    for (const [kind, id] of [['Hermes process', 'process:12'], ['Hermes', 'process:12'], ['Hermes', '12'], ['Codex', 'ayo']]) {
      await fleetIntent(f.host, hosts(kind, id), { action: 'open-chat', entities: { ...agent, agent: id } }, f.context)
    }
    expect(f.resume).toHaveBeenCalledTimes(1)
    expect(f.notice).toHaveBeenCalledWith(expect.stringContaining('Not a Hermes session'), 'warning')
  })

  it.each(['nudge', 'set-next', 'queue-fix'])('%s drafts through the composer and never submits', async action => {
    const f = setup()
    const [doc, entities] = action === 'nudge' ? [hosts(), agent] : action === 'set-next' ? [portfolio(), task] : [factory(), node]
    await fleetIntent(f.host, doc, { action, entities }, f.context)
    expect(f.draft).toHaveBeenCalledTimes(1)
    expect(f.request).not.toHaveBeenCalled()
    expect(f.resume).not.toHaveBeenCalled()
  })

  it('describes a pod via the read-only verb and shows a text panel', async () => {
    const f = setup()
    await fleetIntent(f.host, hosts(), { action: 'open-pod', entities: pod }, f.context)
    expect(f.request).toHaveBeenCalledWith('glide.fleet_pod', { session_id: 'fixture-session', ...pod })
    expect(f.panel).toHaveBeenCalledWith('z0/litellm', 'Synthetic pod description')
  })

  it.each(['open-task', 'open-node'])('%s opens only the URL in the trusted row', async action => {
    const f = setup()
    const doc = action === 'open-task' ? portfolio('https://example.test/task') : factory('https://example.test/node')
    const entities = action === 'open-task' ? task : node
    await fleetIntent(f.host, doc, { action, entities: { ...entities, url: 'https://other.test/forged' } }, f.context)
    expect(openUrl).toHaveBeenCalledWith(action === 'open-task' ? 'https://example.test/task' : 'https://example.test/node')
    expect(f.request).not.toHaveBeenCalled()
  })

  it('resolves prefixed product ids without crossing portfolios that reuse feature and task ids', async () => {
    const f = setup()
    const board = (id: string, url: string) => ({ products: [{ id, features: [{ id: 'cards', tasks: [{ id: 'g3', label: 'fleet + factory cards', url }] }] }] })
    const doc = decodeEuiKit({ kind: 'fleet-portfolio', app: 'dash', data: { portfolios: {
      glide: board('glide:glide', 'https://example.test/glide'), flow: board('flow:glide', 'https://example.test/flow')
    } } })
    await fleetIntent(f.host, doc, { action: 'open-task', entities: { ...task, product: 'flow:glide' } }, f.context)
    expect(openUrl).toHaveBeenCalledExactlyOnceWith('https://example.test/flow')
    await fleetIntent(f.host, doc, { action: 'set-next', entities: { ...task, product: 'glide:glide' } }, f.context)
    expect(f.draft).toHaveBeenCalledExactlyOnceWith('Set next: fleet + factory cards (glide:glide/cards/g3). ')
    await fleetIntent(f.host, doc, { action: 'open-task', entities: task }, f.context)
    expect(openUrl).toHaveBeenCalledTimes(1)
    expect(f.notice).toHaveBeenCalledWith(expect.stringContaining('Task unavailable'), 'warning')
    expect(f.request).not.toHaveBeenCalled()
  })

  it.each([undefined, 'javascript:alert(1)', 'file:///tmp/not-allowed', 'https://user:secret@example.test', 'not a url'])('rejects unavailable or unsafe URL %s visibly', async url => {
    const f = setup()
    await fleetIntent(f.host, factory(url), { action: 'open-node', entities: node }, f.context)
    expect(openUrl).not.toHaveBeenCalled()
    expect(f.notice).toHaveBeenCalledTimes(1)
  })

  it.each([
    { action: 'shell.exec', entities: {} }, { action: 'nudge', entities: {} },
    { action: 'nudge', entities: { ...agent, agent: 'foreign' } },
    { action: 'open-pod', entities: { ...pod, ns: 'foreign' } },
    { action: 'queue-fix', entities: node }
  ])('shows a note for unknown, invalid, foreign or wrong-kind action %j', async detail => {
    const f = setup()
    await fleetIntent(f.host, hosts(), detail, f.context)
    expect(f.notice).toHaveBeenCalledTimes(1)
    expect(f.request).not.toHaveBeenCalled()
    expect(f.draft).not.toHaveBeenCalled()
    expect(f.resume).not.toHaveBeenCalled()
  })

  it.each(['stale', 'abort', 'failure', 'malformed'])('fences a %s pod reply', async reason => {
    const f = setup()
    const pending = Promise.withResolvers<unknown>()
    f.request.mockImplementation(() => pending.promise)
    const run = fleetIntent(f.host, hosts(), { action: 'open-pod', entities: pod }, f.context)
    if (reason === 'stale') f.current.value = false
    if (reason === 'abort') f.controller.abort()
    if (reason === 'failure') pending.reject(new Error('Unavailable synthetic cluster'))
    else pending.resolve(reason === 'malformed' ? {} : { text: 'Late result' })
    await run
    expect(f.panel).not.toHaveBeenCalled()
    expect(f.notice).toHaveBeenCalledTimes(reason === 'failure' || reason === 'malformed' ? 1 : 0)
  })

  it('does nothing from an already stale or aborted publication', async () => {
    const f = setup()
    f.current.value = false
    await fleetIntent(f.host, hosts(), { action: 'open-chat', entities: agent }, f.context)
    expect(f.resume).not.toHaveBeenCalled()
    expect(f.notice).not.toHaveBeenCalled()
  })
})
