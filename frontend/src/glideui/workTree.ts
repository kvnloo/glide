import { posix } from 'node:path'

import type { Entry, Todo, ToolCall, TurnEntry } from '../model.js'
import { detailOf, resultOf } from '../tools/detail.js'
import { type GlideDoc, slot, type UiParts, type UiTone } from './library.js'

export type WorkTab = 'files' | 'tasks'
type WorkState = 'pending' | 'running' | 'done' | 'error' | 'cancelled' | 'untracked' | 'unconfirmed'
type FileAction = 'read' | 'edit' | 'write' | 'create' | 'delete'
export interface WorkFile { readonly path: string; readonly action: FileAction; readonly state: WorkState }
export interface WorkTask { readonly id: string; readonly parent?: string; readonly text: string; readonly state: WorkState }
export interface WorkTree {
  readonly turn: TurnEntry
  readonly files: readonly WorkFile[]
  readonly tasks: readonly WorkTask[]
  readonly receipt: string
}
type WorkRow = UiParts['List']['items'][number]

const TODO_STATE: Record<Todo['status'], WorkState> = { pending: 'pending', in_progress: 'running', completed: 'done', cancelled: 'cancelled' }
const MARK: Record<WorkState, string> = { pending: '○', running: '◉', done: '✓', error: '!', cancelled: '−', untracked: '○', unconfirmed: '?' }
const tone = (state: WorkState): UiTone => state === 'running' ? 'accent' : state === 'error' ? 'error' : 'neutral'
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function filePath(raw: string, cwd: string): string {
  const path = posix.normalize(raw.trim())
  const root = cwd ? posix.normalize(cwd) : ''
  return root && path.startsWith(root + '/') ? path.slice(root.length + 1) : path
}

/** Paths only. Never mine commands, output prose or file contents for guessed activity. */
function targets(call: ToolCall, cwd: string): { path: string; action: FileAction }[] {
  const d = detailOf(call)
  if (d.tool !== 'read_file' && d.tool !== 'patch' && d.tool !== 'write_file') return []
  const found = new Map<string, FileAction>()
  const put = (path: unknown, action: FileAction) => {
    if (typeof path === 'string' && path.trim()) found.set(filePath(path, cwd), action)
  }
  const action = d.tool === 'read_file' ? 'read' : d.tool === 'patch' ? 'edit' : 'write'
  put(d.path, action)
  if (d.tool === 'patch' && typeof call.args['patch'] === 'string') {
    for (const m of call.args['patch'].matchAll(/^\*\*\* (Add|Update|Delete) File: (.+)$/gm)) put(m[2], m[1] === 'Add' ? 'create' : m[1] === 'Delete' ? 'delete' : 'edit')
    for (const m of call.args['patch'].matchAll(/^\*\*\* Move to: (.+)$/gm)) put(m[1], 'edit')
  }
  const result = resultOf(call)
  if (call.completedAt !== undefined && call.outcome.kind === 'done' && d.tool !== 'read_file') {
    for (const [key, kind] of [['files_modified', 'edit'], ['files_created', 'create'], ['files_deleted', 'delete']] as const) {
      const paths = result?.[key]
      if (Array.isArray(paths)) for (const path of paths) put(path, kind)
    }
  }
  return [...found].map(([path, action]) => ({ path, action }))
}

function fileState(call: ToolCall, turn: TurnEntry): WorkState {
  if (call.outcome.kind === 'error' || call.outcome.kind === 'cancelled') return call.outcome.kind
  const result = resultOf(call)
  if (result?.['success'] === false || result?.['failed'] === true || result?.['is_error'] === true) return 'error'
  if (result?.['partial'] === true) return 'unconfirmed'
  if (call.completedAt !== undefined) return 'done'
  return call.outcome.kind === 'running' && turn.end.status === 'live' ? 'running' : 'unconfirmed'
}

/** A pure projection of one turn. Explicit empty plans are clears, not a request to restore old tasks. */
export function projectWorkTree(entries: readonly Entry[], turn: TurnEntry, cwd: string): WorkTree {
  const calls = turn.blocks.flatMap(b => b.kind === 'tool' ? [b.call] : [])
  const byPath = new Map<string, WorkFile[]>()
  for (const call of calls) {
    for (const target of targets(call, cwd)) {
      const ops = byPath.get(target.path) ?? []
      ops.push({ ...target, state: fileState(call, turn) })
      byPath.set(target.path, ops)
    }
  }
  const files = [...byPath.values()].flatMap(ops => {
    const edits = ops.filter(op => op.action !== 'read')
    const relevant = edits.length ? edits : ops
    const latest = relevant.findLast(op => op.state === 'running') ?? relevant.at(-1)
    return latest ? [latest] : []
  })
  const snapshot = turn.todos
  const index = entries.indexOf(turn)
  const prompt = entries.slice(0, index).findLast(e => e.kind === 'user' && !e.steered)
  const clauses = (prompt?.kind === 'user' ? prompt.text : turn.continued ?? 'Working on your request')
    .split(/\n+|;\s*/).map(s => s.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '').trim()).filter(Boolean).slice(0, 32)
  const tasks: WorkTask[] = snapshot === undefined
    ? clauses.map((text, i) => ({ id: `ask-${i}`, text, state: 'untracked' }))
    : snapshot.map(t => ({ id: t.id, text: t.content, state: TODO_STATE[t.status], ...(t.parent ? { parent: t.parent } : {}) }))
  const done = tasks.filter(t => t.state === 'done').length
  const open = tasks.filter(t => t.state === 'pending' || t.state === 'running').length
  const untracked = tasks.filter(t => t.state === 'untracked').length
  const failed = files.filter(f => f.state === 'error').length
  const unconfirmed = files.filter(f => f.state === 'unconfirmed').length
  const state = { live: 'Working', done: 'Turn ended', error: 'Turn failed', interrupted: 'Interrupted' }[turn.end.status]
  const receipt = [state, plural(files.length, 'file'), snapshot === undefined ? `${untracked} requested · untracked` : `${done}/${tasks.filter(t => t.state !== 'cancelled').length} tasks done`,
    ...(open ? [`${open} open`] : []), ...(failed ? [`${failed} failed`] : []), ...(unconfirmed ? [`${unconfirmed} unconfirmed`] : [])].join(' · ')
  return { turn, files, tasks, receipt }
}

/** Flatten parent edges in source order. Orphans and cycles remain visible exactly once. */
export function taskRows(tasks: readonly WorkTask[]): WorkRow[] {
  const unique = new Map(tasks.map(t => [t.id, t]))
  const children = new Map<string, WorkTask[]>()
  for (const task of unique.values()) {
    const parent = task.parent && unique.has(task.parent) && task.parent !== task.id ? task.parent : ''
    children.set(parent, [...(children.get(parent) ?? []), task])
  }
  const rows: WorkRow[] = []
  const seen = new Set<string>()
  const walk = (roots: readonly WorkTask[]) => {
    const stack = roots.map(task => ({ task, depth: 0 })).reverse()
    while (stack.length) {
      const next = stack.pop()
      if (!next || seen.has(next.task.id)) continue
      const { task, depth } = next
      seen.add(task.id)
      rows.push({ id: task.id, label: `${'  '.repeat(Math.min(depth, 8))}${depth ? '└ ' : ''}${MARK[task.state]} ${task.text}`, value: task.state === 'untracked' ? 'requested' : task.state, tone: tone(task.state) })
      stack.push(...(children.get(task.id) ?? []).map(task => ({ task, depth: depth + 1 })).reverse())
    }
  }
  walk(children.get('') ?? [])
  walk([...unique.values()].filter(t => !seen.has(t.id)))
  return rows
}

export function fileRows(files: readonly WorkFile[]): WorkRow[] {
  const rows: WorkRow[] = []
  const dirs = new Set<string>()
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = file.path.split('/').filter(Boolean)
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/')
      if (dirs.has(path)) continue
      dirs.add(path)
      rows.push({ id: `dir:${path}`, label: `${'  '.repeat(Math.min(i, 8))}└ ${parts[i]}/` })
    }
    rows.push({ id: `file:${file.path}`, label: `${'  '.repeat(Math.min(parts.length - 1, 8))}└ ${MARK[file.state]} ${parts.at(-1) ?? file.path}`, ...(file.action === 'read' ? { detail: 'Read' } : {}),
      value: file.state === 'running' ? (file.action === 'read' ? 'reading' : file.action === 'create' ? 'creating' : file.action === 'write' ? 'writing' : 'editing') : file.state === 'done' ? file.action === 'read' ? 'read' : file.action === 'create' ? 'created' : file.action === 'delete' ? 'deleted' : 'edited' : file.state,
      tone: tone(file.state) })
  }
  return rows
}

export function workTreeDoc(work: WorkTree, tab: WorkTab, expanded: boolean): GlideDoc {
  const rows = tab === 'files' ? fileRows(work.files) : taskRows(work.tasks)
  return {
    id: 'work-tree', title: 'Work tree', app: work.turn.end.status === 'live' ? 'LIVE' : 'RECEIPT',
    status: work.turn.end.status === 'live' ? 'running' : work.turn.end.status === 'error' ? 'error' : 'done',
    slots: {
      tabs: slot('Tabs', { active: tab, items: [{ id: 'files', label: 'FILES', count: work.files.length, intent: { action: 'tab', entities: { tab: 'files' } } }, { id: 'tasks', label: 'FEATURES / TASKS', count: work.tasks.length, intent: { action: 'tab', entities: { tab: 'tasks' } } }] }),
      rows: slot('List', { numbered: false, items: rows }),
      empty: slot('Text', { body: tab === 'files' ? 'Waiting for file tools…' : 'No tasks in the current plan.', tone: 'muted' }),
      receipt: slot('Text', { body: work.receipt }),
      actions: slot('Buttons', { items: [{ label: expanded ? 'Collapse work tree' : 'Show work tree', intent: { action: expanded ? 'collapse' : 'expand' } }] })
    }
  }
}
