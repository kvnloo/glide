import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { projectWorkTree, taskRows, workTreeDoc } from '../glideui/workTree.js'
import { WorkTreeCard, workTreeCss } from '../glideui/workTreeCard.js'
import { MOTION_CSS, MOTION_SHEET } from '../glideui/motion.js'
import { glide } from '../glideui/program.js'
import { Transcript } from '../transcript/store.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'
import { must, tree } from './fakes.js'

function turn() {
  const t = new Transcript()
  t.user({ text: 'Add search; test the keyboard flow', at: 1 })
  const owner = t.messageStart(2)
  return { t, owner }
}

const start = (t: Transcript, id: string, name: string, args: Record<string, unknown>) => t.toolStart({ tool_id: id, name, args }, 3)
const end = (t: Transcript, id: string, name: string, result: unknown = { success: true }) => t.toolComplete({ tool_id: id, name, result }, 4)

describe('live work tree projection', () => {
  it('shows requested clauses without inventing task completion', () => {
    const { t, owner } = turn()
    const live = projectWorkTree(t.entries, owner, '/repo')
    expect(live.tasks.map(r => r.text)).toEqual(['Add search', 'test the keyboard flow'])
    expect(live.tasks.every(r => r.state === 'untracked')).toBe(true)
    t.complete({ status: 'complete' }, 5)
    expect(projectWorkTree(t.entries, owner, '/repo').tasks.every(r => r.state === 'untracked')).toBe(true)
  })

  it('tracks read, edit and confirmed creation, normalizes paths and keeps active parallel writes', () => {
    const { t, owner } = turn()
    start(t, 'read', 'read_file', { path: '/repo/src/./search.ts' })
    end(t, 'read', 'read_file')
    expect(projectWorkTree(t.entries, owner, '/repo').files[0]).toMatchObject({ path: 'src/search.ts', action: 'read', state: 'done' })
    start(t, 'edit', 'patch', { path: 'src/search.ts', old_string: 'a', new_string: 'b' })
    start(t, 'other', 'patch', { path: './src/search.ts', old_string: 'b', new_string: 'c' })
    end(t, 'edit', 'patch')
    expect(projectWorkTree(t.entries, owner, '/repo').files).toHaveLength(1)
    expect(projectWorkTree(t.entries, owner, '/repo').files[0]?.state).toBe('running')
    end(t, 'other', 'patch')
    start(t, 'new', 'write_file', { path: 'src/search.test.ts', content: 'test' })
    end(t, 'new', 'write_file', { success: true, files_created: ['src/search.test.ts'] })
    expect(projectWorkTree(t.entries, owner, '/repo').files[1]).toMatchObject({ action: 'create', state: 'done' })
  })

  it('never checks off a call without a result when the turn ends; late results revise the receipt', () => {
    const { t, owner } = turn()
    start(t, 'edit', 'patch', { path: 'search.ts' })
    t.complete({ status: 'complete' }, 5)
    expect(projectWorkTree(t.entries, owner, '').files[0]?.state).toBe('unconfirmed')
    end(t, 'edit', 'patch')
    expect(projectWorkTree(t.entries, owner, '').files[0]?.state).toBe('done')
    expect(projectWorkTree(t.entries, owner, '').receipt).toContain('1 file')
  })

  it('keeps errors and cancellations distinct from success', () => {
    const { t, owner } = turn()
    start(t, 'bad', 'write_file', { path: 'bad.json', content: 'bad' })
    end(t, 'bad', 'write_file', { error: 'refused' })
    start(t, 'held', 'patch', { path: 'held.ts' })
    t.complete({ status: 'interrupted' }, 5)
    expect(projectWorkTree(t.entries, owner, '').files.map(f => f.state)).toEqual(['error', 'cancelled'])
  })

  it('takes nested todo snapshots, including out-of-band updates and explicit empty clears', () => {
    const { t, owner } = turn()
    t.todos([{ id: 'p', content: 'Search', status: 'in_progress' }, { id: 'c', parent: 'p', content: 'Keyboard', status: 'completed' }])
    const projected = projectWorkTree(t.entries, owner, '')
    expect(projected.tasks).toMatchObject([{ id: 'p', state: 'running' }, { id: 'c', parent: 'p', state: 'done' }])
    expect(taskRows(projected.tasks).map(r => r.label)).toEqual(['◉ Search', '  └ ✓ Keyboard'])
    t.todos([])
    expect(projectWorkTree(t.entries, owner, '').tasks).toEqual([])
    t.complete({ status: 'complete' }, 5)
    t.todos([{ id: 'late', content: 'Do not rewrite receipt' }])
    expect(projectWorkTree(t.entries, owner, '').tasks).toEqual([])
  })

  it('renders cyclic, missing and duplicate todo parents once without looping', () => {
    const { t, owner } = turn()
    t.todos([{ id: 'a', parent: 'b', content: 'A' }, { id: 'b', parent: 'a', content: 'B' }, { id: 'x', parent: 'missing', content: 'X' }, { id: 'a', content: 'duplicate' }])
    expect(taskRows(projectWorkTree(t.entries, owner, '').tasks)).toHaveLength(3)
  })

  it('does not claim a successful change for partial or explicitly unsuccessful file results', () => {
    const { t, owner } = turn()
    start(t, 'partial', 'patch', { path: 'partial.ts' })
    end(t, 'partial', 'patch', { success: true, partial: true })
    start(t, 'failed', 'patch', { path: 'failed.ts' })
    end(t, 'failed', 'patch', { success: false })
    expect(projectWorkTree(t.entries, owner, '').files.map(f => f.state)).toEqual(['unconfirmed', 'error'])
  })

  it('uses bridge normalization and keeps a cleared plan clear across merged todo calls', () => {
    const { t, owner } = turn()
    start(t, 'bridge', 'tool_call', { name: 'read_file', arguments: { path: 'src/a.ts' } })
    end(t, 'bridge', 'tool_call')
    expect(projectWorkTree(t.entries, owner, '').files[0]).toMatchObject({ path: 'src/a.ts', state: 'done' })
    start(t, 'plan', 'todo_list', { todos: [{ id: 'old', content: 'Old task', status: 'pending' }] })
    end(t, 'plan', 'todo_list')
    t.todos([])
    start(t, 'merge', 'todo_list', { merge: true, todos: [{ id: 'new', content: 'New task', status: 'pending' }] })
    expect(projectWorkTree(t.entries, owner, '').tasks.map(t => t.id)).toEqual(['new'])
  })

  it('projects multi-file patch headers without displaying patch contents or command guesses', () => {
    const { t, owner } = turn()
    start(t, 'patch', 'patch', { mode: 'patch', patch: '*** Begin Patch\n*** Add File: src/a.ts\n+secret\n*** Update File: src/b.ts\n*** End Patch' })
    start(t, 'shell', 'terminal', { command: 'cat /private/secret' })
    expect(projectWorkTree(t.entries, owner, '').files.map(f => f.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(JSON.stringify(workTreeDoc(projectWorkTree(t.entries, owner, ''), 'files', true))).not.toContain('secret')
  })
})

describe('work tree glide/v1 card', () => {
  it('publishes the shared motion sheet without another host card or widget', async () => {
    const card = new WorkTreeCard(() => undefined)
    await card.ready()
    const { t } = turn()
    const sheets = new Map<string, string>()
    const rendered = card.node(t, '/repo', { send: () => undefined }, (name, css) => sheets.set(name, css))
    expect(JSON.stringify(tree(must(rendered)))).toContain('data-glide-motion')
    expect(sheets.get(MOTION_SHEET)).toBe(MOTION_CSS)
    card.dispose()
  })

  it('binds the real adapter, switches views, collapses at end and rejects stale actions after reset', async () => {
    const g = await glide()
    const card = new WorkTreeCard(() => undefined)
    await card.ready()
    const { t } = turn()
    const sheets: string[] = []
    const rendered = () => card.node(t, '/repo', { send: () => undefined }, (_name, css) => sheets.push(css))
    const initial = rendered()
    expect(initial).not.toBeNull()
    const work = projectWorkTree(t.entries, must(t.live), '/repo')
    expect(g.bind(g.compile('root = GlideCard("work-tree", [Tabs("tabs"), List("rows"), Text("receipt"), Buttons("actions")])', 'test'), workTreeDoc(work, 'tasks', true)).typeName).toBe('Card')
    t.complete({ status: 'complete' }, 5)
    const collapsed = rendered()
    expect(JSON.stringify(tree(must(collapsed)))).toContain('Show work tree')
    expect(JSON.stringify(tree(must(collapsed)))).not.toContain('glide.list.row')
    const oldScope = card.scope
    card.send(oldScope, { action: 'expand' })
    card.send(oldScope, { action: 'tab', entities: { tab: 'tasks' } })
    expect(JSON.stringify(tree(must(rendered())))).toContain('glide.list.row')
    t.reset({ session: 'other', usage: undefined })
    expect(rendered()).toBeNull()
    card.send(oldScope, { action: 'expand' })
    expect(rendered()).toBeNull()
    expect(sheets.join('')).toContain('prefers-reduced-motion')
  })

  it('keeps the tree bounded and styled only with tokens; reduced motion disables the accent pulse', () => {
    expect(tokenDrift(readFileSync(new URL('../glideui/workTreeCard.tsx', import.meta.url), 'utf8'))).toEqual(NO_DRIFT)
    expect(workTreeCss([0])).toContain('@media (prefers-reduced-motion:reduce)')
    expect(workTreeCss([0])).toContain('animation:none')
    expect(workTreeCss([0])).not.toMatch(/box-shadow:(?!none)|<animate|glow/)
  })
})
