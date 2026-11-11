import { Node } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FactoryPane } from '../chrome/factory.js'
import { liveSessionId } from '../core/ids.js'
import { SessionState } from '../session/state.js'
import { decodeFactory, factoryAnswers } from '../wire/factory.js'

import { must, stub } from './fakes.js'

const run = (name: string, state: 'ready' | 'running' | 'done' | 'failed') => ({
  run: name, state, output: null, seconds: null, verdict: null, compare: null
})
const suggestion = (status: 'pending' | 'approved' = 'pending') => ({
  run: 'ready', action: 'render', title: 'Render ready', contract_id: 'contract-1', session_id: 'a', status,
  review: { available: false, reason: 'Canonical review-existing API is unavailable.' }
})
const snapshot = () => ({
  runs: [run('ready', 'ready'), run('working-a', 'running'), run('working-b', 'running'), run('broken', 'failed'), run('finished', 'done')],
  suggestions: [suggestion()], running_count: 2
})

function setup(answer: () => Promise<unknown> = async () => snapshot()) {
  const session = new SessionState(vi.fn())
  session.ref = { live: liveSessionId('a'), stored: null }
  const request = vi.fn(async () => ({ output: JSON.stringify(await answer()) }))
  const pane = new FactoryPane({ gw: stub<ConstructorParameters<typeof FactoryPane>[0]['gw']>({ request }), session, changed: vi.fn() })
  pane.adopt(session.ref.live)
  return { pane, session, request }
}

const panes: FactoryPane[] = []
afterEach(() => { for (const pane of panes.splice(0)) pane.dispose(); vi.useRealTimers() })
const owned = (answer?: () => Promise<unknown>) => { const result = setup(answer); panes.push(result.pane); return result }

function props(pane: FactoryPane): Record<string, unknown> {
  const element = pane.node('layer.factory')
  expect(element).toBeInstanceOf(Node)
  if (!(element instanceof Node)) throw new Error('Factory node missing')
  return element.props
}

describe('Factory pane', () => {
  it('is off by default and reads no data until explicitly opened', async () => {
    const { pane, request } = owned()
    expect(pane.open).toBe(false)
    expect(pane.node('layer.factory')).toBeNull()
    expect(request).not.toHaveBeenCalled()
    pane.toggle()
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(request).toHaveBeenCalledWith('command.dispatch', { name: 'factory', arg: 'json suggest {}', session_id: 'a' })
  })

  it('shows only attention rows, one quiet running line, and no approval control', async () => {
    const { pane } = owned()
    pane.toggle()
    await vi.waitFor(() => expect(JSON.stringify(props(pane))).toContain('contract-1'))
    const view = JSON.stringify(props(pane))
    expect(view).toContain('broken')
    expect(view).toContain('Awaiting review')
    expect(view).toContain('2 jobs running')
    expect(view).not.toContain('working-a')
    expect(view).not.toContain('working-b')
    expect(view).toContain('pending')
    expect(view).not.toContain('"act":"approve"')
    expect(view).toContain('AODL review unavailable')
  })

  it('polls at least ten seconds apart even after close and reopen, and stops when closed', async () => {
    vi.useFakeTimers()
    const { pane, request } = owned()
    pane.toggle()
    await vi.advanceTimersByTimeAsync(0)
    expect(request).toHaveBeenCalledTimes(1)
    pane.toggle()
    pane.toggle()
    await vi.advanceTimersByTimeAsync(9999)
    expect(request).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(request).toHaveBeenCalledTimes(2)
    pane.toggle()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('drops an in-flight answer and its handlers after a session switch', async () => {
    const pending = Promise.withResolvers<unknown>()
    const { pane, session } = owned(() => pending.promise)
    pane.toggle()
    session.ref = { live: liveSessionId('b'), stored: null }
    pane.adopt(session.ref.live)
    pending.resolve(snapshot())
    await new Promise(resolve => setImmediate(resolve))
    expect(JSON.stringify(props(pane))).not.toContain('contract-1')
  })

  it('retains attention rows but disables actions when canonical suggestions are unavailable', async () => {
    const { pane } = owned(async () => ({ ...snapshot(), suggestions: [], error: 'AODL machine proposals unavailable', fail_closed: true }))
    pane.toggle()
    await vi.waitFor(() => expect(JSON.stringify(props(pane))).toContain('AODL machine proposals unavailable'))
    expect(JSON.stringify(props(pane))).toContain('broken')
  })

  it('shows an approved render action, but never launches automatically', async () => {
    const { pane, request } = owned(async () => ({ ...snapshot(), suggestions: [suggestion('approved')] }))
    pane.toggle()
    await vi.waitFor(() => expect(JSON.stringify(props(pane))).toContain('Run approved intent'))
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('Factory decoding', () => {
  it('decodes pending contracts and preserves fail-closed snapshot errors', () => {
    expect(decodeFactory(factoryAnswers.suggest, JSON.stringify(snapshot())).suggestions[0]?.contract_id).toBe('contract-1')
    expect(decodeFactory(factoryAnswers.suggest, JSON.stringify({ ...snapshot(), error: 'blocked', fail_closed: true })).error).toBe('blocked')
  })

  it.each([
    { ...snapshot(), running_count: -1 },
    { ...snapshot(), suggestions: [{ ...suggestion(), contract_id: '' }] },
    { ...snapshot(), suggestions: [{ ...suggestion(), status: 'chat-approved' }] },
    { ...snapshot(), suggestions: [{ ...suggestion(), review: { available: true, url: 'fake://review' } }] }
  ])('rejects malformed suggestion data', (value: unknown) => {
    expect(() => decodeFactory(factoryAnswers.suggest, JSON.stringify(value))).toThrow('unexpected /factory answer')
  })

  it('rejects malformed render state and plugin error responses', () => {
    expect(() => decodeFactory(factoryAnswers.render, '{"run":"x","state":"approved"}')).toThrow()
    expect(() => decodeFactory(factoryAnswers.render, '{"error":"approval required"}')).toThrow('approval required')
    expect(() => decodeFactory(factoryAnswers.suggest, 'not json')).toThrow()
    expect(must(factoryAnswers.status)).toBeDefined()
  })
})
