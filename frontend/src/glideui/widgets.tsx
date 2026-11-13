// The widgets mounted around the composer (mounts.ts): read from settings.json's `ui`, which the plugin's
// glide_ui_* tools write, and followed live. Each program is compiled once by the real glide/v1 adapter,
// bound to its source's document on every frame, design-checked (checks.ts) before it is drawn, and its
// verdict is written to ui-status.json, which the mounting tool waits on. render.tsx draws the tree, the
// same renderer transcript cards use; this is its second mount.

import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import type { JSX } from '@stencil-hq/tern'

import type { WalPalette } from '../../../glide/frontend/wal.js'
import { watchWal } from '../../../glide/frontend/wal.js'
import { readUi } from '../wire/files.js'
import type { GlideView } from '../wire/openui.js'

import { checkMarkup, checkPalette, checkTree } from './checks.js'
import type { GlideDoc, UiNode } from './library.js'
import { commitsDoc, focusDoc, type UiState, type WidgetMount, type WidgetSlot } from './mounts.js'
import { glide, type Glide } from './program.js'
import { node, UI_CSS, type UiRender } from './render.js'

export interface WidgetsHost {
  /** settings.json, which holds `ui`. */
  readonly file: string
  /** Re-applies the theme with the current style; the palette the surface now wears, if a wallpaper one. */
  restyled(): WalPalette | undefined
  /** Something to draw changed. */
  changed(): void
  /** The session's folder, whose git log the commits source reads. */
  cwd(): string | undefined
  /** Commit times (unix seconds) in `cwd`; default `git log`. */
  commits?(cwd: string): Promise<number[]>
  now?(): number
  /** The compiler; default the packaged adapter (program.ts). */
  glide?(): Promise<Glide>
  /** Puts the kit sheet on the surface if it is not there; called while widgets are drawn, so a recovered surface gets it back. */
  sheet?(css: string): void
}

/** Where the pane reports each mount's verdict for the tools (`<home>/glide/ui-status.json`). */
export const statusFile = (settings: string) => join(dirname(settings), 'ui-status.json')

const gitCommits = (cwd: string) => new Promise<number[]>(resolve => {
  execFile('git', ['-C', cwd, 'log', '--since=53 weeks ago', '--format=%ct'], { timeout: 5000, maxBuffer: 4 << 20 }, (error, stdout) => {
    resolve(error ? [] : stdout.split('\n').filter(Boolean).map(Number).filter(Number.isFinite))
  })
})

interface Compiled { readonly program: string; readonly view?: GlideView; readonly error?: string }

const SHEET_PROBLEMS = checkMarkup(UI_CSS, 'glide sheet')
const COMMITS_REFRESH_MS = 120_000

export class GlideWidgets {
  readonly #host: WidgetsHost
  #state: UiState = { rev: 0, widgets: [] }
  #compiled = new Map<string, Compiled>()
  #problems = new Map<string, string[]>()
  #glide: Glide | undefined
  #style = ''
  #commits: { cwd: string; times: number[]; at: number } | undefined
  #fetching = false
  #unwatch: (() => void) | undefined
  #tick: NodeJS.Timeout | undefined
  #closed = false

  constructor(host: WidgetsHost) {
    this.#host = host
  }

  /** The style the theme lays over its palette (glide_ui_style). */
  get style(): UiState['style'] {
    return this.#state.style
  }

  get mounted(): readonly WidgetMount[] {
    return this.#state.widgets
  }

  /** Reads `ui` now and follows the file. */
  start() {
    try { mkdirSync(dirname(this.#host.file), { recursive: true }) } catch { /* the watch then watches nothing */ }
    this.#unwatch = watchWal(this.#host.file, () => void this.reload())
    return this.reload()
  }

  async reload() {
    if (this.#closed) return
    const state = readUi(this.#host.file)
    this.#state = state
    const styleKey = JSON.stringify(state.style ?? {})
    const restyle = styleKey !== this.#style
    this.#style = styleKey
    const palette = restyle ? this.#host.restyled() : undefined
    try {
      this.#glide ??= await (this.#host.glide ?? glide)()
    } catch (error) {
      this.#report(state, palette, `The glide/v1 adapter did not load: ${String(error)}`)
      return
    }
    for (const w of state.widgets) {
      if (this.#compiled.get(w.id)?.program === w.program) continue
      try {
        this.#compiled.set(w.id, { program: w.program, view: this.#glide.compile(w.program, `ui:${w.id}`) })
      } catch (error) {
        this.#compiled.set(w.id, { program: w.program, error: error instanceof Error ? error.message : String(error) })
      }
    }
    for (const id of [...this.#compiled.keys()]) if (!state.widgets.some(w => w.id === id)) this.#compiled.delete(id)
    this.#problems = new Map(state.widgets.map(w => [w.id, this.#check(w)]))
    this.#report(state, palette)
    this.#schedule()
    this.#host.changed()
  }

  /** The widgets in `slot`, drawn with `r`; one that fails to bind or check is left out. */
  nodes(slot: WidgetSlot, r: UiRender): JSX.Element[] {
    const out: JSX.Element[] = []
    for (const w of this.#state.widgets) {
      if (w.slot !== slot || this.#problems.get(w.id)?.length) continue
      const tree = this.#tree(w)
      if (!tree) continue
      if (slot !== 'composer-ring' || tree.typeName !== 'Card') { out.push(node(tree, w.id, r)); continue }
      // The ring is a strip on the composer's edge: the card's parts without its shell.
      out.push(<row align="center" gap="md" key={w.id} role="glide.ring">{tree.props.children.map((c, i) => node(c, `p${i}`, r))}</row>)
    }
    if (out.length) this.#host.sheet?.(UI_CSS)
    return out
  }

  dispose() {
    this.#closed = true
    this.#unwatch?.()
    clearInterval(this.#tick)
  }

  #doc(w: WidgetMount): GlideDoc {
    const now = this.#host.now?.() ?? Date.now()
    if (w.source === 'clock.focus') return focusDoc(w.startedAt ?? now, w.minutes ?? 25, now)
    const cwd = this.#host.cwd()
    if (cwd && !this.#fetching && (this.#commits?.cwd !== cwd || now - (this.#commits?.at ?? 0) > COMMITS_REFRESH_MS)) void this.#fetch(cwd, now)
    const seen = this.#commits
    return commitsDoc(seen && seen.cwd === cwd ? seen.times : [], now, cwd ? basename(cwd) : 'no folder')
  }

  #tree(w: WidgetMount): UiNode | undefined {
    const view = this.#compiled.get(w.id)?.view
    if (!view || !this.#glide) return undefined
    try {
      return this.#glide.bind(view, this.#doc(w))
    } catch {
      return undefined
    }
  }

  #check(w: WidgetMount): string[] {
    const compiled = this.#compiled.get(w.id)
    if (compiled?.error) return [compiled.error]
    if (!compiled?.view || !this.#glide) return ['not compiled']
    let tree: UiNode
    try {
      tree = this.#glide.bind(compiled.view, this.#doc(w))
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)]
    }
    return [...SHEET_PROBLEMS, ...checkTree(tree, w.slot)]
  }

  async #fetch(cwd: string, now: number) {
    this.#fetching = true
    try {
      const times = await (this.#host.commits ?? gitCommits)(cwd)
      this.#commits = { cwd, times, at: now }
    } finally {
      this.#fetching = false
    }
    if (!this.#closed) this.#host.changed()
  }

  /** The focus clock ticks once a second while a focus widget is mounted. */
  #schedule() {
    const ticking = this.#state.widgets.some(w => w.source === 'clock.focus')
    if (ticking && !this.#tick) {
      this.#tick = setInterval(() => this.#host.changed(), 1000)
      this.#tick.unref()
    } else if (!ticking && this.#tick) {
      clearInterval(this.#tick)
      this.#tick = undefined
    }
  }

  #report(state: UiState, palette: WalPalette | undefined, fatal?: string) {
    const widgets = Object.fromEntries(state.widgets.map(w => {
      const problems = fatal ? [fatal] : this.#problems.get(w.id) ?? []
      return [w.id, problems.length ? { ok: false, problems } : { ok: true }]
    }))
    const style = palette ? checkPalette(palette) : []
    const status = { rev: state.rev, at: Date.now(), widgets, style: style.length ? { ok: false, problems: style } : { ok: true } }
    try {
      writeFileSync(statusFile(this.#host.file), `${JSON.stringify(status, null, 2)}\n`)
    } catch {
      // A read-only home: the pane still draws; the tool reports it could not confirm.
    }
  }
}
