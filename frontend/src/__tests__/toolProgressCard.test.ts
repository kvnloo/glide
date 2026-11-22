// GL-108: tool calls as a live ephemeral-ui card (glide/frontend/toolProgress.ts). The projection, the
// publisher's lifecycle against a stub host, and the real App replaying fixtures/turn-tools.jsonl.
import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EuiNativeCard } from '../eui/host.js'
import type { UiNode } from '../glideui/library.js'
import { Transcript } from '../transcript/store.js'
import { parseJson, record } from '../wire/json.js'
import { MAX_STEPS, progressFraction, toolProgressCard, ToolProgressCards } from '../../../glide/frontend/toolProgress.js'

import { settle, setup } from './appSetup.js'
import { must, ofKind } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))

const label = (call: { name: string }, running: boolean) => `${running ? 'Running' : 'Ran'} ${call.name}`
const parts = (card: EuiNativeCard): readonly UiNode[] => card.ui.typeName === 'Card' ? card.ui.props.children : []
const part = <K extends UiNode['typeName']>(card: EuiNativeCard, k: K) => parts(card).find((p): p is Extract<UiNode, { typeName: K }> => p.typeName === k)
const receipt = (card: EuiNativeCard) => parts(card).flatMap(p => p.typeName === 'Text' ? [p.props.body] : []).at(-1)
const status = (card: EuiNativeCard) => card.ui.typeName === 'Card' ? card.ui.props.status : undefined

function liveTurn() {
  const t = new Transcript()
  t.user({ text: 'tidy the docs', at: 1 })
  const turn = t.messageStart(2)
  return { t, turn }
}

describe('the tool-progress card projection', () => {
  it('shows each call as a step, the running call\'s progress as a meter, and edited files as a tree', () => {
    const { t, turn } = liveTurn()
    t.toolStart({ tool_id: 'a', name: 'read_file', args: { path: '/repo/README.md' } }, 3)
    t.toolComplete({ tool_id: 'a', name: 'read_file', duration_s: 0.1, result: { content: 'x' } }, 4)
    t.toolStart({ tool_id: 'b', name: 'patch', args: { path: '/repo/src/app.ts', old_string: 'a', new_string: 'b' } }, 5)
    t.toolStart({ tool_id: 'c', name: 'mcp_index', args: {} }, 6)
    const card = toolProgressCard(t.entries, turn, '/repo', label, new Map([['c', { progress: 3, total: 4, percent: null, message: 'Indexing' }]]))
    expect(card).toMatchObject({ kind: 'tool-progress', title: 'Tool progress', app: 'LIVE' })
    expect(status(card)).toBe('running')
    expect(must(part(card, 'Steps')).props.items).toEqual([
      { id: 'a', text: 'Ran read_file', status: 'done', note: '100 ms' },
      { id: 'b', text: 'Running patch', status: 'active' },
      { id: 'c', text: 'Running mcp_index', status: 'active', note: 'Indexing · 75%' }
    ])
    expect(must(part(card, 'Meter')).props).toMatchObject({ label: 'Indexing', value: 0.75, total: '3/4' })
    const files = must(part(card, 'Section'))
    expect(files.props).toMatchObject({ title: 'Files', aside: '1 changed' })
    const rows = files.props.children[0]?.typeName === 'List' ? files.props.children[0].props.items.map(r => r.label) : []
    expect(rows).toEqual(['└ ✓ README.md', '└ src/', '  └ ◉ app.ts'])
    expect(receipt(card)).toBe('Working · 1 of 3 tools done · 2 files')
  })

  it('settles into a receipt at turn end: no meter, every step closed, the turn\'s status', () => {
    const { t, turn } = liveTurn()
    t.toolStart({ tool_id: 'a', name: 'terminal', args: { command: 'make' } }, 3)
    t.toolComplete({ tool_id: 'a', name: 'terminal', duration_s: 2.5, result: { output: 'ok', exit_code: 0 } }, 5)
    t.toolStart({ tool_id: 'b', name: 'mcp_index', args: {} }, 6)
    t.complete({ status: 'interrupted' }, 1502)
    const card = toolProgressCard(t.entries, turn, '', label, new Map([['b', { progress: 1, total: 2, percent: null, message: null }]]))
    expect(card.app).toBe('SETTLED')
    expect(part(card, 'Meter')).toBeUndefined()
    expect(must(part(card, 'Steps')).props.items.map(s => [s.status, s.note])).toEqual([['done', '2.5 s'], ['blocked', 'stopped · 1.5 s']])
    expect(receipt(card)).toBe('Interrupted · 2 tools · 1.5 s')
  })

  it('keeps the newest steps of a long turn and counts the rest', () => {
    const { t, turn } = liveTurn()
    for (let i = 0; i < MAX_STEPS + 3; i++) t.toolStart({ tool_id: `c${i}`, name: 'terminal', args: { command: `echo ${i}` } }, 3 + i)
    const card = toolProgressCard(t.entries, turn, '', label, new Map())
    expect(must(part(card, 'Steps')).props.items.map(s => s.id)).toEqual(Array.from({ length: MAX_STEPS }, (_, i) => `c${i + 3}`))
    expect(parts(card).some(p => p.typeName === 'Text' && p.props.body === '3 earlier steps not shown')).toBe(true)
  })

  it('reads progress as percent first, then progress over total, and nothing without either', () => {
    expect(progressFraction({ progress: 1, total: 4, percent: 90, message: null })).toBe(0.9)
    expect(progressFraction({ progress: 1, total: 4, percent: null, message: null })).toBe(0.25)
    expect(progressFraction({ progress: 7, total: null, percent: null, message: null })).toBeUndefined()
    expect(progressFraction({ progress: 9, total: 4, percent: null, message: null })).toBe(1)
  })
})

describe('ToolProgressCards', () => {
  function host() {
    const t = new Transcript()
    const cards: EuiNativeCard[] = []
    const update = vi.fn((card: EuiNativeCard) => { cards.push(card) })
    const publishNative = vi.fn((card: EuiNativeCard) => { cards.push(card); return { update } })
    const tp = new ToolProgressCards({ eui: () => ({ host: { publishNative } }), transcript: () => t, cwd: () => '', label })
    return { t, tp, cards, publishNative, update }
  }

  it('publishes once per turn, updates on progress and completion, and settles at turn end', () => {
    const { t, tp, cards, publishNative, update } = host()
    t.messageStart(1)
    t.toolStart({ tool_id: 'a', name: 'terminal', args: { command: 'ls' } }, 2)
    tp.track()
    expect(publishNative).not.toHaveBeenCalled() // One command: its transcript row says it all.
    t.toolComplete({ tool_id: 'a', name: 'terminal', result: { output: '', exit_code: 0 } }, 3)
    tp.track()
    t.toolStart({ tool_id: 'b', name: 'mcp_index', args: {} }, 4)
    tp.track()
    expect(publishNative).toHaveBeenCalledOnce()
    tp.progress({ tool_id: 'b', name: 'mcp_index', progress: 1, total: 2 })
    expect(must(part(must(cards.at(-1)), 'Meter')).props.value).toBe(0.5)
    tp.progress({ tool_id: 'b', name: 'mcp_index', progress: 2, total: 2, message: 'Almost' })
    expect(must(part(must(cards.at(-1)), 'Meter')).props).toMatchObject({ value: 1, label: 'Almost' })
    t.toolComplete({ tool_id: 'b', name: 'mcp_index', result: {} }, 5)
    tp.track()
    t.complete({ status: 'complete' }, 6)
    tp.settle()
    expect(publishNative).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledTimes(4)
    expect(must(cards.at(-1)).app).toBe('SETTLED')
    expect(tp.turn).toBeUndefined()
    tp.settle()
    expect(update).toHaveBeenCalledTimes(4) // Settled once: a late settle changes nothing.
  })

  it('a single call that reports progress, or a single edit, is worth a card', () => {
    const a = host()
    a.t.messageStart(1)
    a.t.toolStart({ tool_id: 'x', name: 'mcp_index', args: {} }, 2)
    a.tp.progress({ tool_id: 'x', name: 'mcp_index', progress: 1, total: 3 })
    expect(a.publishNative).toHaveBeenCalledOnce()
    const b = host()
    b.t.messageStart(1)
    b.t.toolStart({ tool_id: 'y', name: 'write_file', args: { path: 'a.md', content: '' } }, 2)
    b.tp.track()
    expect(b.publishNative).toHaveBeenCalledOnce()
  })

  it('a new turn without a settle closes the old card and starts its own', () => {
    const { t, tp, cards, publishNative } = host()
    t.messageStart(1)
    t.toolStart({ tool_id: 'a', name: 'write_file', args: { path: 'a.md', content: '' } }, 2)
    tp.track()
    const first = tp.turn
    t.complete({ status: 'complete' }, 3) // The message.complete never reached the card.
    t.messageStart(4)
    t.toolStart({ tool_id: 'b', name: 'write_file', args: { path: 'b.md', content: '' } }, 5)
    tp.track()
    expect(publishNative).toHaveBeenCalledTimes(2)
    expect(tp.turn).not.toBe(first)
    expect(cards.map(c => c.app)).toEqual(['LIVE', 'SETTLED', 'LIVE'])
  })

  it('a host that refuses (no active session) or goes stale leaves the transcript alone', () => {
    const t = new Transcript()
    const publishNative = vi.fn(() => { throw new Error('Host card needs an active session') })
    const tp = new ToolProgressCards({ eui: () => ({ host: { publishNative } }), transcript: () => t, cwd: () => '', label })
    t.messageStart(1)
    t.toolStart({ tool_id: 'a', name: 'write_file', args: { path: 'a.md', content: '' } }, 2)
    expect(() => { tp.track(); tp.progress({ tool_id: 'a', name: 'write_file', progress: 1 }); tp.settle() }).not.toThrow()
    const stale = vi.fn(() => { throw new Error('Host card is no longer current') })
    const tp2 = new ToolProgressCards({ eui: () => ({ host: { publishNative: () => ({ update: stale }) } }), transcript: () => t, cwd: () => '', label })
    t.toolStart({ tool_id: 'b', name: 'write_file', args: { path: 'b.md', content: '' } }, 3)
    tp2.track()
    expect(() => { tp2.track(); tp2.track() }).not.toThrow()
    expect(stale).toHaveBeenCalledOnce()
  })
})

describe('App replaying fixtures/turn-tools.jsonl', () => {
  const apps: ReturnType<typeof setup>['app'][] = []
  beforeEach(() => {
    delete process.env['HERMES_TERN_QUERY']
    delete process.env['HERMES_TERN_IMAGE']
  })
  afterEach(() => {
    for (const app of apps.splice(0)) app.dispose()
  })

  it('draws a live eui card that updates per tool.progress and settles at turn end', async () => {
    const { app, emit } = setup()
    apps.push(app)
    await settle()
    const events = readFileSync(new URL('./fixtures/turn-tools.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean)
      .map(l => record(parseJson(l)) ?? {}).filter(e => e['type'] !== 'gateway.ready')
    const panel = () => app.transcript.entries.find(e => e.kind === 'panel' && app.eui.hostView(e)?.label === 'Tool progress')
    const view = () => {
      const e = panel()
      return e ? app.eui.hostView(ofKind(e, 'panel')) : undefined
    }
    const seen: { type: string; meter?: number; app?: string; steps?: string; receipt?: string }[] = []
    for (const ev of events) {
      emit('event', { ...ev, session_id: app.session.ref.live })
      await settle()
      const v = view()
      if (!v?.ui || v.ui.typeName !== 'Card') { seen.push({ type: String(ev['type']) }); continue }
      const kids = v.ui.props.children
      const meter = kids.find(k => k.typeName === 'Meter')
      const steps = kids.find(k => k.typeName === 'Steps')
      seen.push({ type: String(ev['type']), app: v.app,
        ...(meter?.typeName === 'Meter' ? { meter: meter.props.value } : {}),
        ...(steps?.typeName === 'Steps' ? { steps: steps.props.items.map(s => s.status[0]).join('') } : {}),
        receipt: kids.flatMap(k => k.typeName === 'Text' ? [k.props.body] : []).at(-1) ?? '' })
    }
    // The card comes with the turn's second call, and every later tool event moves it.
    expect(seen.map(s => [s.type, s.app ?? '-', s.steps ?? '-', s.meter ?? '-'])).toEqual([
      ['message.start', '-', '-', '-'],
      ['message.delta', '-', '-', '-'],
      ['tool.generating', '-', '-', '-'],
      ['tool.start', '-', '-', '-'],
      ['tool.complete', '-', '-', '-'],
      ['tool.start', 'LIVE', 'da', '-'],
      ['tool.complete', 'LIVE', 'dd', '-'],
      ['tool.start', 'LIVE', 'dda', '-'],
      ['tool.progress', 'LIVE', 'dda', 0.25],
      ['tool.progress', 'LIVE', 'dda', 0.75],
      ['tool.complete', 'LIVE', 'ddd', '-'],
      ['tool.start', 'LIVE', 'ddda', '-'],
      ['tool.complete', 'LIVE', 'dddd', '-'],
      ['message.delta', 'LIVE', 'dddd', '-'],
      ['message.complete', 'SETTLED', 'dddd', '-'],
      ['session.info', 'SETTLED', 'dddd', '-']
    ])
    expect(seen.at(-1)?.receipt).toMatch(/^Done · 4 tools · 2 files · /)
    // One card for the turn, in the transcript after it.
    expect(app.transcript.entries.filter(e => e.kind === 'panel')).toHaveLength(1)
    const v = must(view())
    const files = v.ui?.typeName === 'Card' ? v.ui.props.children.find(k => k.typeName === 'Section') : undefined
    expect(files?.typeName === 'Section' && files.props.children[0]?.typeName === 'List'
      ? files.props.children[0].props.items.map(r => [r.label.trim(), r.value]) : []).toEqual([['└ ✓ README.md', 'read'], ['└ src/', undefined], ['└ ✓ notes.md', 'edited']])
  })
})
