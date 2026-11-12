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

/** A user-opened native aside. Poll failures stay here, never in routine chat notices. */
export class FactoryPane {
  readonly #host: FactoryPaneHost
  #open = false
  #snapshot: FactorySnapshot | undefined
  #snapshotOwner: Ticket | undefined
  #error: string | undefined
  #generation = 0
  #nextRead = 0
  #timer: NodeJS.Timeout | undefined
  #busy = false
  #operation: symbol | undefined
  #disposed = false
  #sid: LiveSessionId | null = null
  readonly #poller: Poller

  constructor(host: FactoryPaneHost) {
    this.#host = host
    this.#poller = new Poller({
      cadence: () => this.#open && this.#host.session.ref.live ? POLL_MS : 'off',
      run: ticket => this.#refresh(ticket),
      settled: () => this.#host.changed()
    })
  }

  get open(): boolean { return this.#open }

  toggle() {
    if (this.#disposed) return
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
      this.#error = snapshot.error
    } catch (error) {
      if (ticket.isCurrent() && owner?.isCurrent() !== false) this.#error = error instanceof Error ? error.message : String(error)
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
    const next = !snapshot ? 'Finding the next action.'
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
        : 'Checking factory…',
      hint: next
    }

    // Each suggestion has at most one real action. Pending review never becomes approval.
    const suggestions: PrefsRow[] = (snapshot?.suggestions ?? []).map(suggestion => {
      const canRender = actionable && suggestion.session_id === this.#sid &&
        suggestion.status === 'approved' && suggestion.action === 'render'
      const hint = suggestion.status === 'pending' ? 'HELD · Review pending.'
        : suggestion.status === 'rejected' ? 'HELD · Suggestion declined.'
        : canRender ? 'DONE · Approved to render.'
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
        label: run.state === 'failed' ? 'FAILED · Held run' : 'DONE · Awaiting review',
        hint: run.state === 'failed'
          ? 'Inspect the failure with /factory runs.'
          : 'Review the result with /factory runs.'
      }]
    })

    // A transport or snapshot error is one quiet line, never an exception stack.
    const errorLine = this.#error?.split(/\r?\n/, 1)[0]?.replace(/^Error:\s*/, '')
      .replace(/\s+/g, ' ').trim().slice(0, 96)
    const sections = [
      { id: 'status-line', title: 'Factory now', rows: [hero] },
      { id: 'suggestions', title: 'Suggested actions',
        rows: suggestions.length ? suggestions
          : [{ id: 'no-suggestions', label: snapshot ? 'No suggestions yet' : 'Looking for suggestions…' }] },
      ...(attention.length ? [{ id: 'attention', title: 'Runs to review', rows: attention }] : []),
      ...(this.#error ? [{ id: 'check', title: 'Factory check',
        rows: [{ id: 'poll-error', label: 'Last check failed', hint: errorLine || 'Retrying on the next check.' }] }] : [])
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
      if (generation === this.#generation && owner?.isCurrent() !== false) this.#error = error instanceof Error ? error.message : String(error)
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
