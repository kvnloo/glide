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
type View = { sections: Section[]; onAction: { render: (event: { value?: unknown }) => void } }

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
  if (!(element instanceof Node)) throw new Error('Factory aside missing')
  return element.props as unknown as View
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
    // Private run IDs are stable row keys, never text in the visible hero or attention copy.
    expect(JSON.stringify(sections)).not.toContain('running-a')
    expect(section(pane, 'attention')?.rows.map(r => r.label)).toEqual(['FAILED · Held run', 'DONE · Awaiting review'])
  })

  it('gives only a same-session approved render one action, never an approval shortcut', async () => {
    const { pane, request } = opened(sample())
    await vi.waitFor(() => expect(section(pane, 'suggestions')?.rows).toHaveLength(4))
    const rows = section(pane, 'suggestions')!.rows
    expect(rows.filter(r => r.control)).toEqual([expect.objectContaining({
      id: 'approved-one', control: { act: 'render', k: 'action', label: 'Run approved intent' }
    })])
    expect(rows.find(r => r.id === 'pending-one')?.hint).toContain('Review pending')
    expect(rows.find(r => r.id === 'pending-one')?.disabled).toBe('AODL review unavailable')
    expect(rows.find(r => r.id === 'other-session')?.control).toBeUndefined()
    view(pane).onAction.render({ value: 'pending-one' })
    view(pane).onAction.render({ value: 'other-session' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('keeps one quiet poll error line without a stack or a second warning', async () => {
    const { pane } = opened(new Error('Factory timed out\n    at hidden/internal.ts:12'))
    await vi.waitFor(() => expect(section(pane, 'check')?.rows[0]?.hint).toBe('Factory timed out'))
    expect(section(pane, 'check')?.rows).toHaveLength(1)
    expect(view(pane).sections.filter(s => s.id === 'check')).toHaveLength(1)
    expect(JSON.stringify(view(pane).sections)).not.toContain('hidden/internal')
  })

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
