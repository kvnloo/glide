import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EuiCards } from '../eui/cards.js'
import type { EuiEl, EuiNode } from '../eui/sandbox.js'
import { openUrl } from '../overlays/pullRequests.js'
import { decodeEuiKit } from '../wire/euiKit.js'
import { record, parseJson } from '../wire/json.js'

import { setup, settle } from './appSetup.js'
import { key, must, ofKind } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))
vi.mock('../overlays/pullRequests.js', async original => ({ ...await original<typeof import('../overlays/pullRequests.js')>(), openUrl: vi.fn() }))
vi.mock('../eui/cards.js', async original => {
  const actual = await original<typeof import('../eui/cards.js')>()
  return { ...actual, EuiCards: class extends actual.EuiCards {
    constructor(...args: ConstructorParameters<typeof actual.EuiCards>) { super(args[0], args[1], args[2], process.env['FLEET_KIT_DIR'] ?? args[3]) }
  } }
})
const apps: ReturnType<typeof setup>['app'][] = []
beforeEach(() => { delete process.env['HERMES_TERN_QUERY']; delete process.env['HERMES_TERN_IMAGE'] })
afterEach(() => { apps.splice(0).forEach(app => app.dispose()); vi.clearAllMocks() })
function elements(node: EuiNode | null): EuiEl[] {
  return node?.t === 'el' ? [node, ...node.kids.flatMap(elements)] : []
}
const text = (node: EuiNode): string => node.t === 'text' ? node.text : node.t === 'el' ? node.kids.map(text).join(' ') : ''
function nativeId(value: unknown, id: number, revision: string): string | undefined {
  if (Array.isArray(value)) return value.map(v => nativeId(v, id, revision)).find(Boolean)
  if (!value || typeof value !== 'object') return undefined
  if ('id' in value && typeof value.id === 'string' && value.id.includes(`.${revision}.`) && value.id.endsWith(`.n${id}`)) return value.id
  return Object.values(value).map(v => nativeId(v, id, revision)).find(Boolean)
}

// Required by fleet-verify.sh with FLEET_KIT_SRC until the orchestrator vendors the new fleet kinds.
describe.skipIf(!process.env['FLEET_KIT_DIR'])('source fleet kit through App and native Tern taps', () => {
  async function fixture(command: string, index: number) {
    const dir = must(process.env['FLEET_KIT_DIR'])
    const docs: unknown = parseJson(readFileSync(join(dir, 'fixtures.json'), 'utf8'))
    if (!Array.isArray(docs)) throw new Error('Missing synthetic fleet docs')
    const doc = decodeEuiKit(docs[index])
    const raw: { kind: string; app: string; data: Record<string, unknown> } = { ...doc, data: { ...doc.data, notes: ['Synthetic source unavailable'] } }
    const hosts: unknown = raw.data['hosts']
    if (index === 0 && Array.isArray(hosts)) {
      raw.data['hosts'] = hosts.map((host: unknown) => ({ ...record(host), notes: ['Synthetic host gauge unavailable'] }))
    }
    const f = setup({
      'glide.fleet': () => raw,
      'glide.fleet_pod': () => ({ text: 'Synthetic kubectl describe output' }),
      'session.resume': () => ({ session_id: 'resumed-fixture', messages: [] })
    }, { features: ['blobs'] })
    apps.push(f.app)
    await f.type(command)
    await f.press(key('enter'))
    const entry = () => ofKind(f.app.transcript.entries.find(e => e.kind === 'panel'), 'panel')
    const view = () => must(f.app.eui.hostView(entry()))
    await vi.waitFor(() => expect(JSON.stringify(view().node)).toContain('fl-root'), { timeout: 10_000 })
    await settle()
    expect(JSON.stringify(f.frame())).toContain('Synthetic source unavailable')
    expect(JSON.stringify(view().node)).not.toContain('Fleet data unavailable')
    const tap = async (find: (node: EuiEl) => boolean) => {
      const current = view()
      const target = must(elements(current.node).find(find))
      const id = must(nativeId(f.ops(), target.id, must(current.identity)))
      const action = f.tern.dispatch({ ev: 'action', sf: 'hermes', id, act: 'click', raw: {} })
      expect(action).toBeTypeOf('function')
      await action?.()
      await settle()
    }
    return { ...f, view, tap }
  }

  it('renders live payload and notes, expands an agent, drafts without sending, refreshes and resumes', async () => {
    const f = await fixture('/hosts', 0)
    expect(JSON.stringify(f.frame())).toContain('Synthetic host gauge unavailable')
    await f.tap(n => n.tag === 'summary' && n.cls.includes('fh-agent') && text(n).includes('ayo'))
    await f.tap(n => n.tag === 'button' && text(n) === 'Nudge')
    expect(f.app.stores.composer.text).toContain('Follow up with ayo')
    expect(f.sent('prompt.submit')).toHaveLength(0)
    const old = f.view()
    await f.tap(n => n.id === -1)
    await vi.waitFor(() => expect(f.sent('glide.fleet')).toHaveLength(2))
    expect(f.app.eui.host.size).toBe(1)
    expect(f.view().identity).not.toBe(old.identity)
    must(old.activate)(-1)
    expect(f.sent('glide.fleet')).toHaveLength(2)
    await vi.waitFor(() => expect(JSON.stringify(f.view().node)).toContain('fh-agent'))
    await settle()
    await f.tap(n => n.tag === 'summary' && n.cls.includes('fh-agent') && text(n).includes('ayo'))
    await f.tap(n => n.tag === 'button' && text(n) === 'Open chat')
    await vi.waitFor(() => expect(f.sent('session.resume')).toHaveLength(1))
    expect(record(f.sent('session.resume')[0])?.['session_id']).toBe('ayo')
  }, 30_000)

  it('switches the actual hosts selector to pods and shows read-only pod text', async () => {
    const f = await fixture('/hosts', 0)
    await f.tap(n => n.tag === 'select' && n.attrs['aria-label'] === 'Hosts view')
    await f.tap(n => n.tag === 'select' && n.attrs['aria-label'] === 'Hosts view')
    await f.tap(n => n.tag === 'button' && text(n) === 'Open z0/litellm')
    await vi.waitFor(() => expect(JSON.stringify(f.frame())).toContain('Synthetic kubectl describe output'))
    expect(f.sent('glide.fleet_pod')).toHaveLength(1)
    expect(f.sent('prompt.submit')).toHaveLength(0)
  }, 30_000)

  it('opens portfolio tasks safely and drafts set-next without a prompt', async () => {
    const f = await fixture('/portfolio glide', 1)
    await f.tap(n => n.tag === 'button' && text(n) === 'Open task')
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/example\.test\/task\//))
    await f.tap(n => n.tag === 'button' && text(n) === 'Set next' && !n.attrs['disabled'])
    expect(f.app.stores.composer.text).toContain('Set next:')
    expect(f.app.stores.composer.text).toMatch(/\(glide:[^/]+\//)
    expect(f.sent('prompt.submit')).toHaveLength(0)
  }, 30_000)

  it('opens factory graph nodes and drafts fixes through the real kit intent route', async () => {
    const f = await fixture('/factory graph', 2)
    await f.tap(n => n.attrs['data-fleet-svg-control'] === 'brain')
    expect(openUrl).toHaveBeenCalledWith('https://example.test/node/brain')
    await f.tap(n => n.tag === 'button' && n.cls.includes('ff-act') && !n.attrs['disabled'])
    expect(f.app.stores.composer.text).toContain('Investigate and prepare a fix')
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
