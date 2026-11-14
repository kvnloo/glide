import type { JSX } from '@stencil-hq/tern'

import { MONO, RADIUS, TYPE } from '../../../glide/frontend/tokens.js'
import type { TurnEntry } from '../model.js'
import type { Transcript } from '../transcript/store.js'
import type { GlideView } from '../wire/openui.js'
import type { UiIntent } from './library.js'
import { glide, type Glide } from './program.js'
import { node, UI_CSS, UI_SHEET, type UiRender } from './render.js'
import { fileRows, projectWorkTree, workTreeDoc, type WorkTab } from './workTree.js'

const PROGRAM = 'root = GlideCard("work-tree", [Tabs("tabs"), List("rows"), Text("receipt"), Buttons("actions")])'
const EMPTY = PROGRAM.replace('List("rows")', 'Text("empty")')
const RECEIPT = 'root = GlideCard("work-tree", [Text("receipt"), Buttons("actions")])'
type Source = Pick<Transcript, 'entries' | 'lifetime' | 'live'>
type Sheet = (name: string, css: string) => void

/** Only presentation state lives here. Turn and file/task states always come from the transcript. */
export class WorkTreeCard {
  readonly #changed: () => void
  #glide: Glide | undefined
  readonly #views = new Map<string, GlideView>()
  #loading: Promise<void> | undefined
  #error = ''
  #source: Source | undefined
  #owner: TurnEntry | undefined
  #scope = ''
  #tab: WorkTab = 'files'
  #expanded = true
  #ended = false
  #closed = false

  constructor(changed: () => void) { this.#changed = changed }
  get scope() { return this.#scope }

  ready(): Promise<void> {
    this.#loading ??= glide().then(g => {
      for (const source of [PROGRAM, EMPTY, RECEIPT]) this.#views.set(source, g.compile(source, 'work-tree'))
      if (!this.#closed) { this.#glide = g; this.#changed() }
    }).catch(error => {
      this.#error = error instanceof Error ? error.message : String(error)
      if (!this.#closed) this.#changed()
    })
    return this.#loading
  }

  node(source: Source, cwd: string, render: UiRender, sheet: Sheet): JSX.Element | null {
    this.#source = source
    const turn = source.live ?? (this.#owner && source.entries.includes(this.#owner) ? this.#owner : undefined)
    const scope = turn ? `${source.lifetime}:${turn.id}` : ''
    if (scope !== this.#scope) {
      this.#scope = scope
      this.#owner = turn
      this.#expanded = true
      this.#ended = false
      this.#tab = 'files'
    }
    if (!turn || this.#closed) return null
    if (turn.end.status !== 'live' && !this.#ended) { this.#ended = true; this.#expanded = false }
    const work = projectWorkTree(source.entries, turn, cwd)
    sheet(UI_SHEET, UI_CSS)
    const active = this.#tab === 'files' && this.#expanded
      ? fileRows(work.files).flatMap((r, i) => r.tone === 'accent' && r.value !== 'reading' ? [i] : []) : []
    const reads = this.#tab === 'files' && this.#expanded ? fileRows(work.files).flatMap((r, i) => r.value === 'read' || r.value === 'reading' ? [i] : []) : []
    sheet('glide-work-tree', workTreeCss(active, reads))
    if (!this.#glide) {
      void this.ready()
      return <text key="glide.work-tree.loading" role="glide.work-tree.notice" text={this.#error ? `Work tree unavailable: ${this.#error}` : 'Preparing work tree…'} wrap="word" />
    }
    const doc = workTreeDoc(work, this.#tab, this.#expanded)
    const rows = this.#tab === 'files' ? work.files : work.tasks
    const program = this.#expanded ? rows.length ? PROGRAM : EMPTY : RECEIPT
    const view = this.#views.get(program)
    if (!view) return null
    const bound = this.#glide.bind(view, doc)
    return <col key="glide.work-tree" role={this.#expanded ? 'glide.work-tree' : 'glide.work-tree.receipt'}>{node(bound, 'card', { ...render, send: intent => this.send(scope, intent) })}</col>
  }

  send(scope: string, intent: UiIntent): void {
    const source = this.#source
    const owner = this.#owner
    if (this.#closed || !source || !owner || scope !== this.#scope || scope !== `${source.lifetime}:${owner.id}` || !source.entries.includes(owner) || (source.live && source.live !== owner)) return
    if (intent.action === 'tab') {
      const tab = intent.entities?.['tab']
      if (tab !== 'files' && tab !== 'tasks') return
      this.#tab = tab
    } else if (intent.action === 'expand' || intent.action === 'collapse') {
      this.#expanded = intent.action === 'expand'
    } else return
    this.#changed()
  }

  dispose() { this.#closed = true; this.#source = undefined; this.#owner = undefined }
}

/** Local state paint only. No JS frame loop, glow, SVG animation, or shared motion-layer changes. */
export function workTreeCss(active: readonly number[], reads: readonly number[] = []): string {
  const root = "[data-role='glide.work-tree']"
  const both = ":is([data-role='glide.work-tree'],[data-role='glide.work-tree.receipt'])"
  const pulses = active.map(i => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.list.row']`).join(',')
  const editing = active.map(i => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.strong']`).join(',')
  const dim = reads.map(i => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.strong']`).join(',')
  return `
${both}{font-size:${TYPE.body}px;min-width:0}
${both} .sf-card{border-radius:${RADIUS.tile}px;box-shadow:none;border:1px solid var(--l3);background:var(--l1);color:var(--t1);padding:14px}
${both} .sf-card-head,${both} .sf-card-body{padding:0}
${both} .sf-chip.st-running{color:var(--t2);background:var(--l2)}
${both} [data-role='glide.body']{padding:0;gap:6px}
${both} [data-role='glide.source']{opacity:1}
${both} [data-role='glide.list']{max-height:156px;overflow:auto;gap:0}
${both} [data-role='glide.list.row']{padding:2px 6px;min-height:28px;border-left:2px solid transparent;gap:8px}
${both} [data-role='glide.strong']{font-family:${MONO};font-size:${TYPE.small}px;font-weight:400;white-space:pre;min-width:0;color:var(--t1)}
${both} [data-role='glide.list.value']{font-size:${TYPE.meta}px;color:var(--t2);flex-shrink:0}
${both} [data-role='glide.muted']{font-size:${TYPE.meta}px;opacity:1;color:var(--t3)}
${both} [data-role='glide.text']{font-size:${TYPE.meta}px;color:var(--t2)}
${both} [data-role='glide.actions']{gap:4px}
${both} [data-role='glide.actions'] button{font-size:${TYPE.meta}px;min-height:28px;padding:2px 8px}
${pulses ? `${pulses}{border-left-color:var(--accent);animation:glide-work-edit 1.4s ease-in-out infinite}` : ''}
@keyframes glide-work-edit{0%,100%{border-left-color:var(--accent)}50%{border-left-color:var(--l3)}}
${editing ? `${editing}{color:var(--accent)}` : ''}
${dim ? `${dim}{color:var(--t3)}` : ''}
@media (prefers-reduced-motion:reduce){${root} [data-role='glide.list.row']{animation:none!important}}
@media (max-width:480px){${both} .sf-card{padding:10px}${both} [data-role='glide.list']{max-height:116px}${both} [data-role='glide.list.value']{max-width:9ch}${both} .sf-tabs button{min-height:44px}}
`
}
