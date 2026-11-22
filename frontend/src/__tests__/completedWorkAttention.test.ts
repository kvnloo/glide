// Every retained tool failure or warning that the work fold must keep visible, in one completed turn.
// Each signal has its own focused fixture (listed per case below); this guards them together:
// all of them shown in order beside each other, their outcomes untouched, ordinary work folded.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { NodeJson } from '@stencil-hq/tern'
import { describe, expect, it } from 'vitest'

import { entryId, toolCallId } from '../core/ids.js'
import type { Block, ToolCall, TurnEntry } from '../model.js'
import { readConflictNotice } from '../tools/read-conflicts.js'
import { PATCH_CONTEXT_WARNING, WRITE_CONTEXT_WARNING } from '../tools/patch-warning.js'
import { history } from '../transcript/history.js'
import { Transcript } from '../transcript/store.js'
import { entryNode, type TranscriptContext } from '../view/transcript.js'
import { foldOf, parts } from '../view/workLogModel.js'
import { parseJson, record } from '../wire/json.js'
import { stub, tree } from './fakes.js'
import { call } from './toolFixtures.js'

const tool = (id: string, c: ToolCall): Extract<Block, { kind: 'tool' }> => ({ kind: 'tool', id: entryId(id), call: c })
const text = (id: string): Block => ({ kind: 'text', id: entryId(id), text: id })
const turn = (blocks: Block[]): TurnEntry => ({ kind: 'turn', id: entryId('turn'), rev: 0, startedAt: 0, end: { status: 'done', endedAt: 1000 }, blocks })
const cx: TranscriptContext = { copy: () => undefined, now: 1000, welcome: { version: '' } }
const nodes = (root: NodeJson): NodeJson[] => [root, ...(root.c ?? []).flatMap(nodes)]
const clean = (id: string) => tool(id, call('terminal', { command: 'true' }, { result: { output: id, exit_code: 0, error: null } }))

function produce(script: string, ...args: string[]): unknown {
  return parseJson(execFileSync('python3', [resolve(`src/__tests__/fixtures/${script}`), ...args], {
    cwd: resolve('.hermes-src'), encoding: 'utf8', env: { ...process.env, PYTHONPATH: resolve('.hermes-src'), PYTHONDONTWRITEBYTECODE: '1' }
  }))
}

function first(value: unknown): Record<string, unknown> {
  const item = record(Array.isArray(value) ? value[0] : value)
  if (!item) throw new Error('missing producer output')
  return item
}

/** A completed call through the canonical completion envelope, as the live transcript stores it. */
function live(envelope: Record<string, unknown>): ToolCall {
  const transcript = new Transcript()
  transcript.toolComplete(stub(envelope), 5)
  const c = transcript.call(toolCallId(String(envelope['tool_call_id'])))
  if (!c) throw new Error('missing live call')
  return c
}

/** Issue, card name, the disclosure the card must show, and the call carrying the signal. */
function signals() {
  return [
    // #188 readConflictFold.test.ts, readConflictIntegration.test.ts
    { issue: 188, card: 'read', shows: readConflictNotice(1), status: 'done', block: tool('read', live(first(produce('read-conflict-core.py')))) },
    // #181 writeContextWarningFold.test.ts, writeWarningIntegration.test.ts
    { issue: 181, card: 'write', shows: WRITE_CONTEXT_WARNING, status: 'done', block: tool('write', live(first(produce('write-context-core.py', 'success')))) },
    // #175 patchContextWarningFold.test.ts, patchWarningIntegration.test.ts
    { issue: 175, card: 'edit', shows: PATCH_CONTEXT_WARNING, status: 'done', block: tool('patch-warning', live(first(produce('patch-context-core.py')))) },
    // #161 memoryStagedFold.test.ts
    {
      issue: 161, card: 'memory', shows: 'Hermes reported this memory change was staged for approval; application was not confirmed.', status: 'done',
      block: tool('memory', call('memory', { action: 'add' }, { result: { success: true, staged: true, pending_id: '1a2b3c4d', message: 'Pending approval' } }))
    },
    // #144 patchLintFold.test.ts, v4aLintFold.test.ts
    {
      issue: 144, card: 'edit', shows: 'SyntaxError: invalid syntax', status: 'done',
      block: tool('patch-lint', call('patch', { path: 'x.py', old_string: 'x = 1', new_string: 'def broken(:' }, { result: first(produce('patch-lint-core.py')) }))
    },
    // #137 terminalRecreatedFold.test.ts
    {
      issue: 137, card: 'bash', shows: 'Hermes reports the execution environment was recreated; background processes and unpersisted files may be lost.', status: 'done',
      block: tool('recreated', call('terminal', { command: 'true' }, { result: first(produce('terminal-recreated-core.py')) }))
    },
    // #127 delegateFold.test.ts
    {
      issue: 127, card: 'task', shows: 'At least one delegated task reached its iteration limit; its report may be incomplete.', status: 'done',
      block: tool('task', call('delegate_task', { goal: 'audit' }, { result: { results: [{ status: 'completed', exit_reason: 'max_iterations', truncated: true, summary: 'partial' }] } }))
    },
    // #116 webFold.test.ts
    {
      issue: 116, card: 'fetch', shows: 'Extraction failed: unreachable', status: 'done',
      block: tool('fetch', call('web_extract', { urls: ['https://example.test/a', 'https://example.test/b'] }, { result: { results: [{ url: 'https://example.test/a', content: 'page' }, { url: 'https://example.test/b', error: 'unreachable' }] } }))
    },
    // #106 searchErrors.test.ts
    {
      issue: 106, card: 'grep', shows: 'search failed', status: 'error',
      block: tool('search', call('search_files', {}, { result: { matches: [{ path: 'safe.py', line: 1, content: 'partial hit' }], error: 'search failed' }, outcome: { duration: 1, kind: 'error' } }))
    }
  ] as const
}

describe('retained failures and warnings stay visible together in completed work (#188 #181 #175 #161 #144 #137 #127 #116 #106)', () => {
  it('shows every signal before the answer, in order, beside ordinary folded work', () => {
    const shown = signals()
    const blocks: Block[] = shown.flatMap((s, i) => [clean(`work-${i}`), s.block])
    const t = turn([...blocks, clean('last'), text('answer')])
    const fold = foldOf(t)
    if (!fold) throw new Error('expected a completed-work fold')

    for (const s of shown) expect([s.issue, fold.hidden.has(s.block.id)]).toEqual([s.issue, false])
    for (const b of blocks.filter(b => String(b.id).startsWith('work-'))) expect(fold.hidden.has(b.id)).toBe(true)
    expect(parts(t).flatMap(p => p.blocks.map(b => String(b.id)))).toEqual(t.blocks.map(b => String(b.id)))
    expect(parts(t).filter(p => p.kind === 'shown').flatMap(p => p.blocks.map(b => String(b.id))))
      .toEqual([...shown.map(s => String(s.block.id)), 'answer'])

    const root = tree(entryNode(t, 'main.attention', cx))
    const cards = nodes(root).filter(n => n.k === 'tool')
    for (const s of shown.filter(s => s.status === 'done')) {
      const card = cards.find(n => n.p?.['name'] === s.card && JSON.stringify(n).includes(s.shows))
      expect([s.issue, card?.p?.['status'], card?.p?.['collapsed']]).toEqual([s.issue, s.status, false])
      expect(s.block.call.outcome.kind).toBe('done')
    }
    // A failed call keeps its own failed work row (#74); its reason stays beside the partial rows (#106).
    const failed = nodes(root).filter(n => n.p?.['role'] === 'hermes.work.row' && JSON.stringify(n).includes('search failed'))
    expect(failed).toHaveLength(1)
    const row = nodes(failed[0] ?? { k: 'col' })
    expect(row.some(n => n.k === 'icon' && n.p?.['name'] === 'x' && n.p?.['tone'] === 'error')).toBe(true)
    expect(row.filter(n => n.p?.['role'] === 'omp.tool.error').map(n => n.p?.['spans'])).toEqual([[{ s: 'error', t: 'search failed' }]])
    expect(JSON.stringify(failed[0])).toContain('partial hit')
    const view = JSON.stringify(root)
    expect(view).not.toContain('/backend/private')
    expect(view).not.toContain('sibling-secret')
    expect(view).not.toContain('Resolve them')
  })

  it('keeps the signals visible when the answer comes first, without reordering the turn', () => {
    const shown = signals()
    const t = turn([clean('before'), text('answer'), ...shown.map(s => s.block)])
    const fold = foldOf(t)
    for (const s of shown) expect(fold?.hidden.has(s.block.id) ?? false).toBe(false)
    expect(parts(t).flatMap(p => p.blocks.map(b => String(b.id)))).toEqual(t.blocks.map(b => String(b.id)))
  })

  it('folds the same calls once their results carry no signal', () => {
    // The lint producer's second result is its clean one.
    const lint = produce('patch-lint-core.py')
    const cleanLint = record(Array.isArray(lint) ? lint[1] : undefined)
    if (!cleanLint) throw new Error('missing clean lint result')
    const quiet = [
      tool('read', call('read_file', { path: 'x' }, { result: { content: '1|ok' } })),
      tool('write', call('write_file', { path: 'x' }, { result: { bytes_written: 2, verified: true } })),
      tool('patch', call('patch', { path: 'x' }, { result: { success: true, diff: '-a\n+b\n' } })),
      tool('memory', call('memory', { action: 'add' }, { result: { success: true } })),
      tool('lint', call('patch', { path: 'x' }, { result: cleanLint })),
      tool('terminal', call('terminal', { command: 'true' }, { result: { output: 'ok', exit_code: 0, error: null } })),
      tool('task', call('delegate_task', {}, { result: { results: [{ status: 'completed', summary: 'done' }] } })),
      tool('fetch', call('web_extract', {}, { result: { results: [{ url: 'https://example.test/a', content: 'page' }] } })),
      tool('search', call('search_files', {}, { result: { matches: [{ path: 'safe.py', line: 1, content: 'hit' }] } }))
    ]
    const t = turn([...quiet, text('answer')])
    for (const b of quiet) expect([String(b.id), foldOf(t)?.hidden.has(b.id)]).toEqual([String(b.id), true])
  })

  it('replays retained signals from stored history and keeps them unfolded', () => {
    let n = 0
    const entries = history({ kept: [], id: p => entryId(`${p}${++n}`), messages: [
      { role: 'user', text: 'go' },
      { role: 'tool', name: 'delegate_task', tool_call_id: 'd', args: { goal: 'audit' }, content: JSON.stringify({ results: [{ status: 'completed', exit_reason: 'max_iterations', truncated: true, summary: 'partial' }] }) },
      { role: 'tool', name: 'web_extract', tool_call_id: 'w', args: {}, content: JSON.stringify({ results: [{ url: 'https://example.test/b', error: 'unreachable' }] }) },
      { role: 'tool', name: 'memory', tool_call_id: 'm', args: { action: 'add' }, content: JSON.stringify({ success: true, staged: true, pending_id: '1a2b3c4d', message: 'Pending approval' }) },
      { role: 'assistant', text: 'answer' }
    ] })
    const replayed = entries.find(e => e.kind === 'turn')
    if (replayed?.kind !== 'turn') throw new Error('missing replay turn')
    const tools = replayed.blocks.filter(b => b.kind === 'tool')
    expect(tools).toHaveLength(3)
    for (const b of tools) expect(foldOf(replayed)?.hidden.has(b.id) ?? false).toBe(false)
    const view = JSON.stringify(tree(entryNode(replayed, 'main.replay', cx)))
    expect(view).toContain('iteration limit')
    expect(view).toContain('Extraction failed: unreachable')
    expect(view).toContain('staged for approval')
  })
})
