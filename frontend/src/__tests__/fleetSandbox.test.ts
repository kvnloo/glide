import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EuiCards } from '../eui/cards.js'
import type { UiIntent, UiNode } from '../glideui/library.js'
import { openUrl } from '../overlays/pullRequests.js'
import { record } from '../wire/json.js'

import { setup, settle } from './appSetup.js'
import { key, must, ofKind } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))
vi.mock('../overlays/pullRequests.js', async original => ({ ...await original<typeof import('../overlays/pullRequests.js')>(), openUrl: vi.fn() }))
const apps: ReturnType<typeof setup>['app'][] = []
beforeEach(() => { delete process.env['HERMES_TERN_QUERY']; delete process.env['HERMES_TERN_IMAGE'] })
afterEach(() => { apps.splice(0).forEach(app => app.dispose()); vi.clearAllMocks() })

const hosts = { hosts: [{ id: 'fixture-host', label: 'Fixture machine', online: true,
  gauges: { cpu: 23 }, notes: ['Synthetic host gauge unavailable'],
  k3s: { node: 'Ready', pods: [['sample', 'worker', 'Running', 0, '']] },
  harnesses: [
    { kind: 'Hermes', agents: [{ id: 'fixture-session', name: 'Review session', state: 'idle' }] },
    { kind: 'fx', agents: [{ id: 'process:1', name: 'Build helper', state: 'blocked' }] }
  ]
}] }
const portfolio = { portfolios: { sample: { label: 'Sample portfolio', products: [{
  id: 'sample:core', label: 'Core', features: [{ id: 'core:work', label: 'Work', tasks: [
    { id: 'task-1', label: 'Review queue', status: 'next', url: 'https://example.test/task/1' },
    { id: 'task-2', label: 'Working change', status: 'active', url: 'https://example.test/task/2' }
  ] }]
}] } } }
const factory = {
  nodes: [
    { id: 'brain', col: 0, label: 'Brain', state: 'idle' },
    { id: 'review', col: 2, label: 'Blocked review', state: 'failing', action: 'Prepare fix' }
  ], edges: [['brain', 'review', 'delegated', false]]
}

function intents(n: UiNode): UiIntent[] {
  if (n.typeName === 'Buttons' || n.typeName === 'List' || n.typeName === 'Tabs') {
    return n.props.items.flatMap(i => i.intent ? [i.intent] : [])
  }
  return 'children' in n.props ? n.props.children.flatMap(intents) : []
}

describe('fleet through the App and native renderer', () => {
  async function fixture(command: string, kind: string, app: string, data: object) {
    const f = setup({
      'glide.fleet': () => ({ kind, app, data: { ...data, at: '2026-11-11T00:00:00Z', notes: ['Synthetic source unavailable'] } }),
      'glide.fleet_pod': () => ({ text: 'Synthetic kubectl describe output' }),
      'session.resume': () => ({ session_id: 'resumed-fixture', messages: [] })
    }, { features: ['blobs'] })
    apps.push(f.app)
    await f.type(command)
    await f.press(key('enter'))
    const view = () => must(f.app.eui.hostView(ofKind(f.app.transcript.entries.find(e => e.kind === 'panel'), 'panel')))
    await vi.waitFor(() => expect(view().ui).toBeDefined())
    await settle()
    expect(view().node).toBeNull()
    const frame = () => JSON.stringify(f.frame())
    expect(frame()).toContain('glide.card')
    expect(frame()).toContain('Synthetic source unavailable')
    const tap = async (action: string, from = view()) => {
      must(from.send)(must(intents(must(from.ui)).find(i => i.action === action)))
      await settle()
    }
    return { ...f, view, frame, tap }
  }

  it('shows host notes, drafts without sending, refreshes one panel, and resumes a Hermes session', async () => {
    const f = await fixture('/hosts', 'fleet-hosts', 'k3s', hosts)
    expect(f.frame()).toContain('Synthetic host gauge unavailable')
    expect(f.frame()).toContain('Build helper')
    await f.tap('nudge')
    expect(f.app.stores.composer.text).toContain('Follow up with Build helper')
    expect(f.sent('prompt.submit')).toHaveLength(0)
    const old = f.view()
    await f.tap('refresh')
    await vi.waitFor(() => expect(f.view().identity).not.toBe(old.identity))
    expect(f.app.eui.host.size).toBe(1)
    await f.tap('refresh', old)
    expect(f.sent('glide.fleet')).toHaveLength(2)
    await f.tap('open-chat')
    await vi.waitFor(() => expect(f.sent('session.resume')).toHaveLength(1))
    expect(record(f.sent('session.resume')[0])?.['session_id']).toBe('fixture-session')
  })

  it('switches to k3s pods and requests read-only pod detail', async () => {
    const f = await fixture('/hosts', 'fleet-hosts', 'k3s', hosts)
    const view = f.view()
    const podTab = intents(must(view.ui)).find(i => i.action === 'tab' && i.entities?.['tab'] === 'k3s')
    must(view.send)(must(podTab))
    await vi.waitFor(() => expect(f.frame()).toContain('sample/worker'))
    await f.tap('open-pod')
    await vi.waitFor(() => expect(f.frame()).toContain('Synthetic kubectl describe output'))
    expect(f.sent('glide.fleet_pod')).toHaveLength(1)
    expect(f.sent('prompt.submit')).toHaveLength(0)
  })

  it('opens portfolio tasks safely and drafts set-next without sending', async () => {
    const f = await fixture('/portfolio sample', 'fleet-portfolio', 'dash', portfolio)
    expect(f.frame()).toContain('Review queue')
    await f.tap('open-task')
    expect(openUrl).toHaveBeenCalledWith('https://example.test/task/2')
    await f.tap('set-next')
    expect(f.app.stores.composer.text).toContain('Set next: Review queue')
    expect(f.sent('prompt.submit')).toHaveLength(0)
  })

  it('renders the native factory spine and drafts a fix without dispatching', async () => {
    const f = await fixture('/factory graph', 'fleet-factory', 'aodl', factory)
    expect(f.frame()).toContain('Factory graph: 2 nodes, 1 edge')
    await f.tap('queue-fix')
    expect(f.app.stores.composer.text).toContain('Investigate and prepare a fix for Blocked review')
    expect(f.sent('prompt.submit')).toHaveLength(0)
    expect(f.sent('command.dispatch')).toHaveLength(0)
  })

  it('keeps model-authored fleet fences non-authoritative and strips claimed payload', async () => {
    const eui = new EuiCards(vi.fn())
    try {
      const parts = eui.split('```ephemeral-ui\n{"kind":"fleet-hosts","app":"k3s","data":{"hosts":[]},"demo":true,"callback":"resume"}\n```', 'model')
      expect(parts[0]).toEqual({ kind: 'card', key: 'model:0', spec: { kind: 'fleet-hosts', app: 'k3s' } })
      const part = parts[0]
      if (part?.kind !== 'card') throw new Error('Missing model card')
      eui.view(part.key, part.spec)
      await vi.waitFor(() => expect(JSON.stringify(eui.view(part.key, part.spec).node)).toContain('No data supplied'))
      expect(eui.host.size).toBe(0)
      expect(openUrl).not.toHaveBeenCalled()
    } finally {
      eui.close()
    }
  })
})
