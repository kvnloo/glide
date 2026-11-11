// Named actions on buttons inside retained transcript rows (the Task card's agent tiles and its
// "voice lanes" link) carry no node handler: the SDK must yield them to App's input loop.
import type { ActionEvent } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { settle, setup } from './appSetup.js'
import { must } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))

const apps: ReturnType<typeof setup>['app'][] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.dispose()
  vi.restoreAllMocks()
})

/** The ids of emitted native nodes whose props include `label` (a button's aria name). */
function nodeIds(value: unknown, label: string, owner?: string): string[] {
  if (Array.isArray(value)) return value.flatMap(v => nodeIds(v, label, owner))
  if (!value || typeof value !== 'object') return []
  const id = 'id' in value && typeof value.id === 'string' ? value.id : owner
  if (id && Object.values(value).includes(label)) return [id]
  return Object.values(value).flatMap(v => nodeIds(v, label, id))
}

/** The Task card's copy in the transcript, not the dock pill's hover card. */
const inMain = (value: unknown, label: string) => nodeIds(value, label).find(id => id.startsWith('main.'))

const TILE = 'Running · Open Agent 1 beside the chat'

describe('transcript card actions', () => {
  it.each([false, true])('reach App from a running Task card (retention=%s)', async retention => {
    const { app, ops, tern } = setup({}, { features: retention ? ['settle'] : [] })
    apps.push(app)
    const t = app.transcript
    t.messageStart(1)
    t.toolStart({ args: { tasks: [{ goal: 'List /tmp' }] }, name: 'delegate_task', tool_id: 'call_d' }, 2)
    t.toolComplete({ name: 'delegate_task', result: { delegation_id: 'deleg_1', mode: 'background', status: 'dispatched' }, tool_id: 'call_d' }, 3)
    t.complete({ status: 'complete' }, 4)
    app.agents.apply('subagent.start', { delegation_id: 'deleg_1', goal: 'List /tmp', subagent_id: 'sa-1', task_count: 1, task_index: 0 }, 5)
    app.changed()
    await settle()

    /** What Tern does with a click: the SDK runs a node handler if one claims it, else App reads it. */
    const click = async (id: string, full: string) => {
      const [act, value] = full.split('=')
      const event: ActionEvent = { act: must(act), ev: 'action', id, raw: {}, sf: 'hermes', ...(value ? { value } : {}) }
      const handled = tern.dispatch(event)
      if (handled) await handled()
      else tern.send({ ...event })
      await settle()
    }

    const lanes = must(inMain(ops(), 'Voice lanes: open the lanes popup'), 'voice lanes button')
    await click(lanes, 'open-lanes=all')
    expect(app.overlays.map(o => o.key)).toContain('glide-lanes')

    app.close(must(app.overlays.find(o => o.key === 'glide-lanes')))
    const tile = must(inMain(ops(), TILE), 'agent tile button')
    await click(tile, 'open-agent=sa-1')
    expect(app.overlays.some(o => o.key.startsWith('agents'))).toBe(true)
  })
})
