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
    const rows: PrefsRow[] = (snapshot?.runs ?? []).flatMap(run => {
      if (run.state !== 'failed' && run.state !== 'done') return []
      return [{ id: `run:${run.run}`, label: run.run,
        hint: [run.state === 'failed' ? 'Failed' : 'Awaiting review', run.verdict, run.compare ?? run.output].filter(Boolean).join(' · ') }]
    })
    const generation = this.#generation
    const owner = this.#host.session.ownerTicket?.()
    const actionable = !this.#error && !this.#busy
    const suggestions = (snapshot?.suggestions ?? []).map(suggestion => ({
      id: suggestion.contract_id,
      label: `${suggestion.title} · ${suggestion.status}`,
      hint: `${suggestion.contract_id} · ${suggestion.review.reason}`,
      ...(actionable && suggestion.session_id === this.#sid && suggestion.status === 'approved' && suggestion.action === 'render'
        ? { control: { act: 'render', k: 'action' as const, label: 'Run approved intent' } }
        : { disabled: suggestion.status === 'pending' ? 'AODL review unavailable' : suggestion.review.reason })
    }))
    const sections = [
      { id: 'attention', title: 'Needs your attention', rows: rows.length ? rows : [{ id: 'quiet', label: snapshot ? 'No runs need your attention' : 'Reading factory…' }] },
      { id: 'suggestions', title: 'AODL suggestions', rows: suggestions.length ? suggestions : [{ id: 'no-suggestions', label: this.#error ? 'Suggestions blocked' : 'No suggestions' }] },
      { id: 'running', title: 'In progress', rows: [{ id: 'running-count', label: `${snapshot?.running_count ?? 0} jobs running` }] },
      ...(this.#error ? [{ id: 'error', title: 'Factory unavailable', rows: [{ id: 'failure', label: this.#error }] }] : [])
    ]
    return <prefs key="factory" title="Factory" lead="Only decisions. /factory closes this pane." page="factory"
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
