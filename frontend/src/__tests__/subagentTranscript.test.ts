import { describe, expect, it } from 'vitest'

import { stepsOf, SubagentTranscript } from '../agents/transcript.js'
import type { Requester } from '../wire/rpc.js'

import { stub } from './fakes.js'

/** A gateway answering `session.transcript` with the queued pages, the last one repeated. */
function gateway(pages: Record<string, unknown>[]): Requester {
  let i = 0
  return stub<Requester>({ request: async () => pages[Math.min(i++, pages.length - 1)] })
}

const row = { args: { command: 'sed -n 1,80p README.md' }, context: 'sed -n 1,80p README.md', name: 'terminal', role: 'tool', row_kind: 'message', timestamp: 2 }

describe('subagent transcript', () => {
  it('keeps reading an ended child the gateway has not stored yet, then reads its rows', async () => {
    const gw = gateway([
      { available: false, rows: [], running: false },
      { available: true, next_cursor: 'c1', rows: [row], running: false },
      { available: true, next_cursor: 'c1', rows: [], running: false }
    ])
    const t = new SubagentTranscript(gw, 's1', 'sub1')
    expect(await t.read()).toBe(false)
    expect(t.finished).toBe(false)
    expect(await t.read()).toBe(true)
    expect(t.finished).toBe(true)
    expect(stepsOf(t.rows)).toEqual([{ args: 'sed -n 1,80p README.md', at: 2000, call: { command: 'sed -n 1,80p README.md' }, kind: 'tool', name: 'terminal', running: false }])
  })

  it('gives up on an ended child that is never stored', async () => {
    const t = new SubagentTranscript(gateway([{ available: false, rows: [], running: false }]), 's1', 'sub1')
    for (let i = 0; i < 4; i++) {
      await t.read()
      expect(t.finished).toBe(false)
    }
    await t.read()
    expect(t.finished).toBe(true)
  })
})
