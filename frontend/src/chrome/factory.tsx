import type { JSX, PrefsRow } from '@stencil-hq/tern'

import type { ChatPorts } from '../app/ports.js'
import type { Ticket } from '../core/epoch.js'
import type { LiveSessionId } from '../core/ids.js'
import { Poller } from '../core/poller.js'
import { decodeFactory, factoryAnswers, factoryOutput, type FactorySnapshot, type FactorySuggestion } from '../wire/factory.js'

export type FactoryPaneHost = Pick<ChatPorts, 'changed'> & {
  readonly gw: Pick<ChatPorts['gw'], 'request'>
  readonly session: Pick<ChatPorts['session'], 'ref' | 'ownerTicket'>
}
const POLL_MS = 10_000

/** What a failed check means and the one thing to do next. */
export interface FactoryProblem { readonly label: string; readonly hint: string }
const RETRY = 'Retrying on the next check.'
// Gateway and plugin machine codes (`unsupported_command`, `gateway inaccessible: profile_parked`) are
// wire contract, never copy: each known one gets plain words, an unknown one a generic line.
const CODES: Readonly<Record<string, FactoryProblem>> = {
  unsupported_command: { label: 'Factory is not on this gateway', hint: 'Next: run /factory in the classic CLI (hermes --cli).' },
  profile_parked: { label: "Hermes paused this profile's gateway", hint: 'Next: run hermes gateway restart in a terminal.' },
  profile_mismatch: { label: 'This gateway serves another profile', hint: 'Next: restart Tern in this profile.' }
}
export function factoryProblem(error: unknown): FactoryProblem {
  const reason = error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' &&
    'reason' in error.data && typeof error.data.reason === 'string' ? error.data.reason : ''
  const line = ((error instanceof Error ? error.message : String(error)).split(/\r?\n/, 1)[0] ?? '')
    .replace(/^Error:\s*/, '').replace(/\s+/g, ' ').trim()
  const code = reason || /\b[a-z]+(?:_[a-z]+)+\b/.exec(line)?.[0] || ''
  if (CODES[code]) return CODES[code]
  if (/^gateway not (?:connected|running)\b/.test(line)) return { label: 'Hermes is reconnecting', hint: RETRY }
  if (/timed out/i.test(line)) return { label: 'Factory check timed out', hint: RETRY }
  // Prose from the plugin stays (first line only); a bare or unknown code does not.
  return { label: 'Last check failed', hint: !line || code || !/\s/.test(line) ? RETRY : line.slice(0, 96) }
}

/** A user-opened native aside. Poll failures stay here, never in routine chat notices. */
export class FactoryPane {
  readonly #host: FactoryPaneHost
  #open = false
  #snapshot: FactorySnapshot | undefined
  #snapshotOwner: Ticket | undefined
  #error: FactoryProblem | undefined
  #generation = 0
  #nextRead = 0
  #timer: NodeJS.Timeout | undefined
  #busy = false
  #operation: symbol | undefined
  #disposed = false
  #sid: LiveSessionId | null = null
  /** The live session whose gateway answered `unsupported_command`: /factory shows `#fallback` there instead. */
  #missing: LiveSessionId | undefined
  readonly #fallback: (() => void) | undefined
  readonly #poller: Poller

  /** `fallback`: the card to show when the gateway has no content factory, rather than a pane saying so. */
  constructor(host: FactoryPaneHost, fallback?: () => void) {
    this.#host = host
    this.#fallback = fallback
    this.#poller = new Poller({
      cadence: () => this.#open && this.#host.session.ref.live ? POLL_MS : 'off',
      run: ticket => this.#refresh(ticket),
      settled: () => this.#host.changed()
    })
  }

  get open(): boolean { return this.#open }

  toggle() {
    if (this.#disposed) return
    if (!this.#open && this.#fallback && this.#missing && this.#missing === this.#host.session.ref.live) {
      this.#fallback()
      return
    }
    this.#open = !this.#open
    this.#poller.adopt(++this.#generation)
    clearTimeout(this.#timer)
    if (this.#open) this.#poke()
    this.#host.changed()
  }

  adopt(sid: LiveSessionId | null) {
    this.#sid = sid
    this.#poller.adopt(++this.#generation)
    this.#snapshot = undefined
    this.#snapshotOwner = undefined
    this.#error = undefined
    this.#busy = false
    this.#operation = undefined
    clearTimeout(this.#timer)
    if (this.#open) this.#poke()
  }

  dispose() {
    this.#disposed = true
    this.#open = false
    clearTimeout(this.#timer)
    this.#poller.dispose()
  }

  #poke() {
    clearTimeout(this.#timer)
    if (!this.#open || this.#disposed || !this.#host.session.ref.live) return
    const delay = this.#nextRead - Date.now()
    if (delay > 0) this.#timer = setTimeout(() => this.#poke(), delay)
    else this.#poller.poke()
  }

  async #refresh(ticket: Ticket) {
    const sid = this.#host.session.ref.live
    if (!this.#open || !sid || this.#disposed) return
    if (Date.now() < this.#nextRead) { this.#poke(); return }
    this.#nextRead = Date.now() + POLL_MS
    const owner = this.#host.session.ownerTicket?.()
    try {
      const answer = await this.#host.gw.request<unknown>('command.dispatch', { name: 'factory', arg: 'json suggest {}', session_id: sid })
      const snapshot = decodeFactory(factoryAnswers.suggest, factoryOutput(answer))
      if (!ticket.isCurrent() || owner?.isCurrent() === false) return
      this.#snapshot = snapshot
      this.#snapshotOwner = owner
      this.#error = snapshot.error === undefined ? undefined : factoryProblem(snapshot.error)
    } catch (error) {
      if (!ticket.isCurrent() || owner?.isCurrent() === false) return
      this.#error = factoryProblem(error)
      if (this.#error === CODES['unsupported_command'] && !this.#snapshot && this.#fallback) {
        this.#missing = sid
        this.toggle()
        this.#fallback()
      }
    }
  }

  node(_id: string): JSX.Element | null {
    if (!this.#open) return null
    const snapshot = this.#snapshotOwner?.isCurrent() === false ? undefined : this.#snapshot
    const generation = this.#generation
    const owner = this.#host.session.ownerTicket?.()
    const actionable = !this.#error && !this.#busy

    // The first row answers "what is happening?" without a separate running section.
    const running = snapshot?.running_count ?? 0
    const held = (snapshot?.runs ?? []).filter(run => run.state === 'failed').length
    const done = (snapshot?.runs ?? []).filter(run => run.state === 'done').length
    const hasApprovedAction = actionable && !!snapshot?.suggestions.some(s =>
      s.status === 'approved' && s.action === 'render' && s.session_id === this.#sid)
    // Without a snapshot a failed check is the whole answer: settle on it instead of "Checking…".
    const down = !snapshot && this.#error
    const next = down ? down.hint
      : !snapshot ? 'Finding the next action.'
      : this.#error ? 'Last known state; actions are paused.'
      : this.#busy ? 'Rendering the approved suggestion.'
      : hasApprovedAction ? 'Run an approved suggestion below.'
      : held ? 'Inspect held runs with /factory runs.'
      : done ? 'Review completed runs with /factory runs.'
      : snapshot.suggestions.length ? 'Wait for review before rendering.'
      : running ? 'Work is underway; check back for results.'
      : 'No action needed.'
    const hero: PrefsRow = {
      id: 'factory-overview',
      label: snapshot
        ? running + ' ' + (running === 1 ? 'job' : 'jobs') + ' running, ' + held + ' held, ' + done + ' done.'
        : down ? down.label : 'Checking factory…',
      hint: next
    }

    // Each suggestion has at most one real action. Pending review never becomes approval.
    const suggestions: PrefsRow[] = (snapshot?.suggestions ?? []).map(suggestion => {
      const canRender = actionable && suggestion.session_id === this.#sid &&
        suggestion.status === 'approved' && suggestion.action === 'render'
      const hint = suggestion.status === 'pending' ? 'HELD · Review pending.'
        : suggestion.status === 'rejected' ? 'HELD · Suggestion declined.'
        : canRender ? 'APPROVED · Ready to render.'
        : 'HELD · Not available in this session.'
      return {
        id: suggestion.contract_id,
        label: suggestion.title || 'Suggested render',
        hint,
        ...(canRender
          ? { control: { act: 'render', k: 'action' as const, label: 'Run approved intent' } }
          : { disabled: suggestion.status === 'pending' ? 'AODL review unavailable'
            : suggestion.status === 'rejected' ? 'Suggestion declined'
            : this.#error ? 'Factory check paused' : 'Render unavailable' })
      }
    })

    // Only decisions need rows: active runs are already counted in the hero.
    const attention: PrefsRow[] = (snapshot?.runs ?? []).flatMap(run => {
      if (run.state !== 'failed' && run.state !== 'done') return []
      return [{
        id: 'run:' + run.run,
        label: run.run,
        hint: run.state === 'failed'
          ? 'FAILED · Inspect with /factory runs.'
          : 'DONE · Awaiting review in /factory runs.'
      }]
    })

    // A transport or snapshot error is one quiet line, never an exception stack or a machine code.
    const sections = [
      { id: 'status-line', title: 'Factory now', rows: [hero] },
      { id: 'suggestions', title: 'Suggested actions',
        rows: suggestions.length ? suggestions
          : [{ id: 'no-suggestions', label: down ? 'None while the factory is unavailable'
            : this.#error ? 'Paused until the check passes' : snapshot ? 'No suggestions yet' : 'Looking for suggestions…' }] },
      ...(attention.length ? [{ id: 'attention', title: 'Runs to review', rows: attention }] : []),
      ...(this.#error && !down ? [{ id: 'check', title: 'Factory check', rows: [{ id: 'poll-error', ...this.#error }] }] : [])
    ]
    return <prefs key="factory" title="Factory" lead="Current work and the next decision." page="factory"
      pages={[{ id: 'factory', label: 'Factory' }]} sections={sections}
      onAction={{
        close: (ev: { value?: unknown }) => { if (!ev.value && generation === this.#generation) this.toggle() },
        render: (ev: { value?: unknown }) => {
          if (generation !== this.#generation || owner?.isCurrent() === false || !actionable) return
          const suggestion = snapshot?.suggestions.find(s => s.contract_id === ev.value)
          if (suggestion?.status === 'approved' && suggestion.action === 'render' && suggestion.session_id === this.#sid) void this.#render(suggestion)
        }
      }} />
  }

  async #render(suggestion: FactorySuggestion) {
    if (this.#busy || this.#disposed || !this.#open || this.#error || this.#snapshotOwner?.isCurrent() === false) return
    const sid = this.#host.session.ref.live
    if (!sid || sid !== suggestion.session_id) return
    const current = this.#snapshot?.suggestions.find(s => s.contract_id === suggestion.contract_id)
    if (current?.status !== 'approved' || current.action !== 'render' || current.run !== suggestion.run || current.session_id !== sid) return
    const generation = this.#generation
    const owner = this.#host.session.ownerTicket?.()
    const operation = Symbol()
    this.#operation = operation
    this.#busy = true
    this.#host.changed()
    try {
      const reply = await this.#host.gw.request<unknown>('command.dispatch', {
        name: 'factory', arg: `json render ${JSON.stringify({ run: suggestion.run, contract_id: suggestion.contract_id })}`, session_id: sid
      })
      decodeFactory(factoryAnswers.render, factoryOutput(reply))
    } catch (error) {
      if (generation === this.#generation && owner?.isCurrent() !== false) this.#error = factoryProblem(error)
    } finally {
      if (this.#operation === operation) {
        this.#operation = undefined
        this.#busy = false
        if (owner?.isCurrent() !== false) this.#poke()
        if (!this.#disposed) this.#host.changed()
      }
    }
  }
}
