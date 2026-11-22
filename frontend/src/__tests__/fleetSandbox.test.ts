import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EuiCards } from '../eui/cards.js'
import { openUrl } from '../overlays/pullRequests.js'
import { record } from '../wire/json.js'

import { setup, settle } from './appSetup.js'
import { key, must, ofKind } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))
vi.mock('../overlays/pullRequests.js', async original => ({ ...await original<typeof import('../overlays/pullRequests.js')>(), openUrl: vi.fn() }))
const apps: ReturnType<typeof setup>['app'][] = []
beforeEach(() => { delete process.env['HERMES_TERN_QUERY']; delete process.env['HERMES_TERN_IMAGE'] })
afterEach(() => { apps.splice(0).forEach(app => app.dispose()); vi.clearAllMocks() })

const at = '2026-11-11T00:00:00Z'
const DOCS = {
  hosts: { kind: 'fleet-hosts', app: 'k3s', data: { at, notes: ['Synthetic source unavailable'], hosts: [
    { id: 'h1', label: 'alpha', role: 'Local host', online: true, gauges: { cpu: 40, mem: 60, disk: null, gpu: 70 },
      k3s: { node: 'Ready', version: 'v1', pods: [['z0', 'litellm', 'Running', 0, '']] },
      harnesses: [{ kind: 'Hermes', agents: [{ id: 'ayo', name: 'ayo', state: 'working' }, { id: 'bee', name: 'bee', state: 'blocked', line: 'waiting on you' }] }] }] } },
  portfolio: { kind: 'fleet-portfolio', app: 'dash', data: { at, notes: [], portfolios: { glide: { label: 'Glide', products: [
    { id: 'glide:cards', label: 'Cards', horizon: 'now', features: [{ id: 'fleet', label: 'demo/r', tasks: [
      { id: 'demo/r#7', label: 'Sample task', status: 'next', url: 'https://example.test/task/7' },
      { id: 'demo/r#8', label: 'Later task', status: 'todo', url: 'https://example.test/task/8' }] }] }], shared: [] } } } },
  factory: { kind: 'fleet-factory', app: 'aodl', data: { at, notes: [],
    nodes: [{ id: 'brain', col: 0, label: 'Brain', state: 'live', url: 'https://example.test/node/brain' },
      { id: 'lane:b', col: 1, label: 'build', state: 'failing', reason: 'red', action: 'Prepare fix' }],
    edges: [['brain', 'lane:b', 'delegated', true]] } }
}

/** The newest drawn control whose accessible name or label is `name`: its native id. */
function control(ops: unknown, name: string): string | undefined {
  let found: string | undefined
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    const props = 'p' in value ? record(value.p) : undefined
    if ('id' in value && typeof value.id === 'string' && (props?.['aria'] === name || props?.['label'] === name)) found = value.id
    Object.values(value).forEach(visit)
  }
  visit(ops)
  return found
}

// The shipped /hosts, /portfolio and /factory graph cards are native glide/v1 programs: tapped here as
// Tern taps them, through the real App, its card host and the fleet intent route.
describe('native fleet cards through App and native Tern taps', () => {
  async function fixture(command: string, view: keyof typeof DOCS) {
    const f = setup({
      'glide.fleet': () => DOCS[view],
      'glide.fleet_pod': () => ({ text: 'Synthetic kubectl describe output' }),
      'session.resume': () => ({ session_id: 'resumed-fixture', messages: [] })
    }, { features: ['blobs'] })
    apps.push(f.app)
    await f.type(command)
    await f.press(key('enter'))
    const entry = () => ofKind(f.app.transcript.entries.find(e => e.kind === 'panel'), 'panel')
    await vi.waitFor(() => expect(f.app.eui.hostView(entry())?.ui).toBeTruthy())
    await settle()
    const tap = async (name: string) => {
      const id = must(control(f.ops(), name))
      const action = f.tern.dispatch({ ev: 'action', sf: 'hermes', id, act: 'click', raw: {} })
      expect(action).toBeTypeOf('function')
      await action?.()
      await settle()
    }
    return { ...f, tap, view: () => must(f.app.eui.hostView(entry())) }
  }

  it('drafts a nudge without sending and refreshes in place', async () => {
    const f = await fixture('/hosts', 'hosts')
    expect(JSON.stringify(f.frame())).toContain('Synthetic source unavailable')
    await f.tap('bee')
    expect(f.app.stores.composer.text).toContain('Follow up with bee on h1')
    expect(f.sent('prompt.submit')).toHaveLength(0)
    await f.tap('Refresh')
    await vi.waitFor(() => expect(f.sent('glide.fleet')).toHaveLength(2))
    expect(f.app.eui.host.size).toBe(1)
  }, 30_000)

  it('resumes a Hermes agent from its row', async () => {
    const f = await fixture('/hosts', 'hosts')
    await f.tap('ayo')
    await vi.waitFor(() => expect(f.sent('session.resume')).toHaveLength(1))
    expect(record(f.sent('session.resume')[0])?.['session_id']).toBe('ayo')
  }, 30_000)

  it('switches to k3s pods and shows read-only pod text', async () => {
    const f = await fixture('/hosts', 'hosts')
    must(f.view().send)({ action: 'tab', entities: { tab: 'k3s' } })
    await settle()
    await f.tap('z0/litellm')
    await vi.waitFor(() => expect(JSON.stringify(f.frame())).toContain('Synthetic kubectl describe output'))
    expect(f.sent('glide.fleet_pod')).toHaveLength(1)
    expect(f.sent('prompt.submit')).toHaveLength(0)
  }, 30_000)

  it('opens a portfolio task safely and drafts set-next for the next step without a prompt', async () => {
    const f = await fixture('/portfolio glide', 'portfolio')
    await f.tap('Later task')
    expect(openUrl).toHaveBeenCalledWith('https://example.test/task/8')
    await f.tap('Sample task')
    expect(f.app.stores.composer.text).toContain('Set next: Sample task (glide:cards/fleet/demo/r#7)')
    expect(f.sent('prompt.submit')).toHaveLength(0)
  }, 30_000)

  it('drafts the factory fix through the fleet intent route, with no command sent', async () => {
    const f = await fixture('/factory graph', 'factory')
    await f.tap('Prepare fix · build')
    expect(f.app.stores.composer.text).toContain('Investigate and prepare a fix for build (lane:b)')
    expect(f.sent('prompt.submit')).toHaveLength(0)
    expect(f.sent('command.dispatch')).toHaveLength(0)
  }, 30_000)

  it('keeps model-authored fleet fences non-authoritative and strips claimed payload', async () => {
    const eui = new EuiCards(vi.fn())
    const parts = eui.split('```ephemeral-ui\n{"kind":"fleet-hosts","app":"k3s","data":{"hosts":[]},"demo":true,"callback":"resume"}\n```', 'model')
    expect(parts[0]).toEqual({ kind: 'card', key: 'model:0', spec: { kind: 'fleet-hosts', app: 'k3s' } })
    const part = parts[0]
    if (part?.kind !== 'card') throw new Error('Missing model card')
    eui.view(part.key, part.spec)
    await vi.waitFor(() => expect(JSON.stringify(eui.view(part.key, part.spec).node)).toContain('No data supplied'))
    expect(eui.host.size).toBe(0)
    expect(openUrl).not.toHaveBeenCalled()
    eui.close()
  })
})
