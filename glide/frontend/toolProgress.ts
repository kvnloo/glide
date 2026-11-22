// GL-108: a turn's tool calls as a live ephemeral-ui card in the transcript. One step per call (its
// present-tense label while it runs, its result once done), the running call's `tool.progress` as a
// meter, and the files the turn touched as a tree. toolProgressCard is a pure projection of the
// transcript's turn plus the progress the gateway reported; ToolProgressCards publishes it through
// the eui host (eui/host.ts) on tool.start, updates it on tool.progress and tool.complete, and
// settles it into its receipt at message.complete.
import type { ToolProgressPayload } from '@hermes/shared/gateway-events'

import type { EuiKitIntent, EuiNativeCard, EuiNativeHandle } from '../../frontend/src/eui/host.js'
import type { Entry, ToolCall, TurnEntry } from '../../frontend/src/model.js'
import type { Transcript } from '../../frontend/src/transcript/store.js'
import type { UiNode, UiParts, UiStatus } from '../../frontend/src/glideui/library.js'
import { fileRows, projectWorkTree } from '../../frontend/src/glideui/workTree.js'

/** How the card words a call: the transcript's step label, present tense while `running`. */
export type CallLabel = (call: ToolCall, running: boolean) => string
/** The last `tool.progress` each running call reported, by tool id. */
export type ProgressReport = Pick<ToolProgressPayload, 'progress' | 'total' | 'percent' | 'message'>
export type ProgressByCall = ReadonlyMap<string, ProgressReport>

export const TOOL_PROGRESS_KIND = 'tool-progress'
/** Long turns keep their newest steps; the receipt still counts all of them. */
export const MAX_STEPS = 12

type Step = UiParts['Steps']['items'][number]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const seconds = (ms: number) => ms < 1000 ? `${Math.max(0, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`

/** 0..1 from a progress report: its percent, else progress over total; undefined when neither says. */
export function progressFraction(p: ProgressReport): number | undefined {
  if (typeof p.percent === 'number' && Number.isFinite(p.percent)) return Math.max(0, Math.min(1, p.percent / 100))
  if (typeof p.total === 'number' && p.total > 0 && Number.isFinite(p.progress)) return Math.max(0, Math.min(1, p.progress / p.total))
  return undefined
}

function step(call: ToolCall, label: CallLabel, progress: ProgressByCall): Step {
  const o = call.outcome
  if (o.kind === 'running') {
    const p = progress.get(call.id)
    const fraction = p ? progressFraction(p) : undefined
    const note = [p?.message?.trim(), fraction === undefined ? undefined : `${Math.round(fraction * 100)}%`].filter(Boolean).join(' · ')
    return { id: call.id, text: label(call, true), status: 'active', ...(note ? { note } : {}) }
  }
  const note = [o.summary?.trim(), o.kind === 'cancelled' ? 'stopped' : undefined, seconds(o.duration)].filter(Boolean).join(' · ')
  return { id: call.id, text: label(call, false), status: o.kind === 'done' ? 'done' : 'blocked', note }
}

/** The card for `turn` as it stands: live while the turn streams, its receipt once it ended. */
export function toolProgressCard(entries: readonly Entry[], turn: TurnEntry, cwd: string, label: CallLabel, progress: ProgressByCall): EuiNativeCard {
  const calls = turn.blocks.flatMap(b => b.kind === 'tool' ? [b.call] : [])
  const live = turn.end.status === 'live'
  const running = calls.filter(c => c.outcome.kind === 'running')
  const failed = calls.filter(c => c.outcome.kind === 'error').length
  const files = projectWorkTree(entries, turn, cwd).files
  const changed = files.filter(f => f.action !== 'read').length
  const children: UiNode[] = []

  const shown = calls.slice(-MAX_STEPS)
  const hidden = calls.length - shown.length
  children.push({ type: 'element', typeName: 'Steps', props: { items: shown.map(c => step(c, label, progress)) } })
  if (hidden > 0) children.push({ type: 'element', typeName: 'Text', props: { body: `${plural(hidden, 'earlier step')} not shown`, tone: 'muted' } })

  // The running call that reported how far it is: the newest one, as a meter.
  const metered = live ? running.findLast(c => { const p = progress.get(c.id); return p !== undefined && progressFraction(p) !== undefined }) : undefined
  const report = metered ? progress.get(metered.id) : undefined
  const fraction = report ? progressFraction(report) : undefined
  if (metered && report && fraction !== undefined) {
    const total = typeof report.total === 'number' && report.total > 0 ? `${report.progress}/${report.total}` : `${Math.round(fraction * 100)}%`
    children.push({ type: 'element', typeName: 'Meter', props: { label: report.message?.trim() || label(metered, true), value: fraction, total, tone: 'accent' } })
  }

  if (files.length) {
    children.push({ type: 'element', typeName: 'Section', props: { title: 'Files', aside: changed ? `${changed} changed` : plural(files.length, 'read'), children: [
      { type: 'element', typeName: 'List', props: { items: fileRows(files) } }
    ] } })
  }

  const done = calls.length - running.length
  const state = live ? 'Working' : { done: 'Done', error: 'Turn failed', interrupted: 'Interrupted', live: 'Working' }[turn.end.status]
  const ended = turn.end.status !== 'live' ? turn.end.endedAt : undefined
  const receipt = [state, live ? `${done} of ${plural(calls.length, 'tool')} done` : plural(calls.length, 'tool'),
    ...(files.length ? [plural(files.length, 'file')] : []), ...(failed ? [`${failed} failed`] : []),
    ...(ended !== undefined ? [seconds(ended - turn.startedAt)] : [])].join(' · ')
  children.push({ type: 'element', typeName: 'Text', props: { body: receipt, tone: 'muted' } })

  const status: UiStatus = live ? 'running' : turn.end.status === 'error' || failed ? 'error' : 'done'
  return { kind: TOOL_PROGRESS_KIND, app: live ? 'LIVE' : 'SETTLED', title: 'Tool progress',
    ui: { type: 'element', typeName: 'Card', props: { title: 'Tool progress', app: live ? 'LIVE' : 'SETTLED', status, children } } }
}

/** The eui host's one door this card uses: a trusted native publication. */
export interface ProgressPublisher {
  readonly host: { publishNative(card: EuiNativeCard, intent: EuiKitIntent): Pick<EuiNativeHandle, 'update'> }
}

export interface ToolProgressDeps {
  readonly eui: () => ProgressPublisher | undefined
  /** Read late: the composition root builds its transcript after this card's owner. */
  readonly transcript: () => Pick<Transcript, 'entries' | 'live'>
  readonly cwd: () => string
  readonly label: CallLabel
}

/** The card has no controls: an intent from it does nothing. */
const NO_INTENT: EuiKitIntent = () => undefined
/** The tools that write files: one such call is progress worth a card. */
const EDITS = new Set(['patch', 'write_file'])

/**
 * A card only when it adds to the transcript's rows: two or more calls, a call that reported how far
 * it is, or a file edit. A turn with a single read or command keeps just its row.
 */
function worthACard(turn: TurnEntry, progress: ReadonlyMap<string, unknown>): boolean {
  const calls = turn.blocks.flatMap(b => b.kind === 'tool' ? [b.call] : [])
  return calls.length >= 2 || calls.some(c => progress.has(c.id) || EDITS.has(c.name))
}

export class ToolProgressCards {
  readonly #deps: ToolProgressDeps
  #turn: TurnEntry | undefined
  #handle: Pick<EuiNativeHandle, 'update'> | undefined
  readonly #progress = new Map<string, ProgressReport>()

  constructor(deps: ToolProgressDeps) { this.#deps = deps }

  /** The turn the card follows now, if one is up. */
  get turn(): TurnEntry | undefined { return this.#turn }

  /** After the transcript took a tool.start or tool.complete: publishes the live turn's card, or updates it. */
  track(): void {
    const turn = this.#deps.transcript().live
    if (!turn || (turn !== this.#turn && !worthACard(turn, this.#progress))) return
    if (turn !== this.#turn) {
      // A turn that ended without a message.complete reaching us (a lost gateway) settles as it stands.
      if (this.#turn) this.#update(this.#turn)
      const ids = new Set<string>(turn.blocks.flatMap(b => b.kind === 'tool' ? [b.call.id] : []))
      for (const id of this.#progress.keys()) if (!ids.has(id)) this.#progress.delete(id)
      this.#turn = turn
      try {
        this.#handle = this.#deps.eui()?.host.publishNative(this.#card(turn), NO_INTENT)
      } catch {
        this.#handle = undefined // No active session or surface: no card, the transcript rows still show.
      }
      return
    }
    this.#update(turn)
  }

  /** A running call's tool.progress: its meter and note move. Reports for a call the turn lacks wait for its tool.start. */
  progress(p: ToolProgressPayload): void {
    this.#progress.set(p.tool_id, { progress: p.progress, total: p.total ?? null, percent: p.percent ?? null, message: p.message ?? null })
    const turn = this.#turn
    if (turn && turn === this.#deps.transcript().live) this.#update(turn)
    else this.track()
  }

  /** The turn ended (message.complete, an interrupt): the card's last update is its receipt. */
  settle(): void {
    const turn = this.#turn
    if (turn) this.#update(turn)
    this.#turn = undefined
    this.#handle = undefined
    this.#progress.clear()
  }

  #card(turn: TurnEntry): EuiNativeCard {
    return toolProgressCard(this.#deps.transcript().entries, turn, this.#deps.cwd(), this.#deps.label, this.#progress)
  }

  #update(turn: TurnEntry) {
    if (!this.#handle) return
    try {
      this.#handle.update(this.#card(turn), NO_INTENT)
    } catch {
      this.#handle = undefined // The session or surface moved on; the host shows the panel's fallback.
    }
  }
}
