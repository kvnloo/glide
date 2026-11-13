import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Node } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FactoryPane } from '../chrome/factory.js'
import { liveSessionId } from '../core/ids.js'
import { SessionState } from '../session/state.js'

import { stub } from './fakes.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

type Row = { id: string; label?: string; hint?: string; disabled?: string; control?: { act?: string; label?: string } }
type Section = { id: string; rows: Row[] }
type View = { sections: Section[] }
const isView = (value: unknown): value is View =>
  typeof value === 'object' && value !== null && Array.isArray(Reflect.get(value, 'sections'))

const run = (name: string, state: 'ready' | 'running' | 'done' | 'failed') => ({
  run: name, state, output: null, seconds: null, verdict: null, compare: null
})
const suggestion = (id: string, status: 'pending' | 'approved' | 'rejected', session_id = 'a') => ({
  run: 'ready', action: 'render', title: 'Render sample scene', contract_id: id, session_id, status,
  review: { available: false, reason: 'Sample review unavailable.' }
})
const sample = () => ({
  runs: [run('running-a', 'running'), run('running-b', 'running'), run('held-private', 'failed'), run('done-private', 'done')],
  suggestions: [suggestion('approved-one', 'approved'), suggestion('pending-one', 'pending'), suggestion('rejected-one', 'rejected'),
    suggestion('other-session', 'approved', 'b')],
  running_count: 2
})

const panes: FactoryPane[] = []
afterEach(() => { for (const pane of panes.splice(0)) pane.dispose(); vi.useRealTimers() })

function opened(response: unknown) {
  const session = new SessionState(vi.fn())
  session.ref = { live: liveSessionId('a'), stored: null }
  const request = vi.fn(async () => {
    if (response instanceof Error) throw response
    return { output: JSON.stringify(response) }
  })
  const pane = new FactoryPane({
    gw: stub<ConstructorParameters<typeof FactoryPane>[0]['gw']>({ request }),
    session, changed: vi.fn()
  })
  panes.push(pane)
  pane.adopt(session.ref.live)
  pane.toggle()
  return { pane, request }
}

function view(pane: FactoryPane): View {
  const element = pane.node('layer.factory')
  expect(element).toBeInstanceOf(Node)
  if (!(element instanceof Node) || !isView(element.props)) throw new Error('Factory aside missing')
  return element.props
}
const section = (pane: FactoryPane, id: string) => view(pane).sections.find(s => s.id === id)

describe('factory native aside design', () => {
  it('leads with one glanceable sentence and the next action, not a running list', async () => {
    const { pane } = opened(sample())
    await vi.waitFor(() => expect(section(pane, 'status-line')?.rows[0]?.label).toBe('2 jobs running, 1 held, 1 done.'))
    const sections = view(pane).sections
    expect(sections[0]?.rows).toHaveLength(1)
    expect(sections[0]?.rows[0]?.hint).toBe('Run an approved suggestion below.')
    expect(sections[1]?.id).toBe('suggestions')
    expect(sections.find(s => s.id === 'running')).toBeUndefined()
    // Active runs are only counted in the hero; runs needing a decision are named so rows stay distinguishable.
    expect(JSON.stringify(sections)).not.toContain('running-a')
    expect(section(pane, 'attention')?.rows.map(r => [r.label, r.hint?.split(' · ')[0]]))
      .toEqual([['held-private', 'FAILED'], ['done-private', 'DONE']])
  })

  it('gives only a same-session approved render one action, never an approval shortcut', async () => {
    const { pane, request } = opened(sample())
    await vi.waitFor(() => expect(section(pane, 'suggestions')?.rows).toHaveLength(4))
    const rows = section(pane, 'suggestions')?.rows ?? []
    expect(rows.filter(r => r.control)).toEqual([expect.objectContaining({
      id: 'approved-one', control: { act: 'render', k: 'action', label: 'Run approved intent' }
    })])
    expect(rows.find(r => r.id === 'pending-one')?.hint).toContain('Review pending')
    expect(rows.find(r => r.id === 'pending-one')?.disabled).toBe('AODL review unavailable')
    expect(rows.find(r => r.id === 'other-session')?.control).toBeUndefined()
    // Only the snapshot poll went out: rendering the list never dispatches a render.
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('settles a first failed check into one plain unavailable state, never a stack or a spinner', async () => {
    const { pane } = opened(new Error('Factory timed out\n    at hidden/internal.ts:12'))
    await vi.waitFor(() => expect(section(pane, 'status-line')?.rows[0]?.label).toBe('Factory check timed out'))
    expect(section(pane, 'status-line')?.rows[0]?.hint).toBe('Retrying on the next check.')
    expect(section(pane, 'suggestions')?.rows.map(r => r.label)).toEqual(['None while the factory is unavailable'])
    expect(section(pane, 'check')).toBeUndefined()
    expect(JSON.stringify(view(pane).sections)).not.toMatch(/hidden\/internal|Checking factory|Finding the next/)
  })

  // Real Tern showed these codes verbatim under 'Checking factory…' that never resolved.
  for (const [error, label, next] of [
    [Object.assign(new Error('unsupported_command'), { data: { reason: 'unsupported_command' } }), 'Factory is not on this gateway', 'hermes --cli'],
    [new Error('gateway inaccessible: profile_parked'), "Hermes paused this profile's gateway", 'hermes gateway restart'],
    [new Error('gateway inaccessible: brand_new_code'), 'Last check failed', 'Retrying on the next check.']
  ] as const) {
    it('maps ' + error.message + ' to plain copy with one next action', async () => {
      const { pane } = opened(error)
      await vi.waitFor(() => expect(section(pane, 'status-line')?.rows[0]?.label).toBe(label))
      expect(section(pane, 'status-line')?.rows[0]?.hint).toContain(next)
      expect(JSON.stringify(view(pane).sections)).not.toMatch(/[a-z]+_[a-z]+|inaccessible/)
    })
  }

  it('retains the last known counts and pauses the render when suggestions fail closed', async () => {
    const { pane } = opened({ ...sample(), error: 'Review temporarily unavailable\nat internal location', fail_closed: true })
    await vi.waitFor(() => expect(section(pane, 'check')?.rows[0]?.hint).toBe('Review temporarily unavailable'))
    expect(section(pane, 'status-line')?.rows[0]?.label).toBe('2 jobs running, 1 held, 1 done.')
    expect(section(pane, 'suggestions')?.rows.every(row => !row.control)).toBe(true)
    expect(section(pane, 'check')?.rows).toHaveLength(1)
  })

  const here = dirname(fileURLToPath(import.meta.url))
  for (const file of ['chrome/factory.tsx', 'wire/factory.ts']) {
    it(file + ' uses the design tokens without drift', () => {
      expect(tokenDrift(readFileSync(join(here, '..', file), 'utf8'))).toEqual(NO_DRIFT)
    })
  }
})
