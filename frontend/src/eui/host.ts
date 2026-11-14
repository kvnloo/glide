// Object-owned publications. Model fences cannot register or look up host operations.
import type { Ticket } from '../core/epoch.js'
import type { EntryId } from '../core/ids.js'
import type { PanelEntry } from '../model.js'
import { decodeEuiHostCard, type EuiHostCardData } from '../wire/euiHostCard.js'
import { decodeEuiKit, kitInput, kitNotes, type EuiKitDoc } from '../wire/euiKit.js'

import type { UiIntent, UiNode } from '../glideui/library.js'

import type { EuiCardView } from './cards.js'
import { HOST_APPROVE_ID, HOST_ASIDE_ID, hostSnapshot, type HostCardStatus } from './hostSnapshot.js'
import { type FleetFit, fleetFit } from './fleetFit.js'
import { kitSnapshot } from './kitSnapshot.js'
import type { EuiMounted, EuiSandbox } from './sandbox.js'

export const MAX_HOST_CARDS = 48
export interface EuiHostOwner extends Ticket { readonly sessionId: string }
export interface EuiHostPort {
  owner(): EuiHostOwner | undefined
  active(): boolean
  append(title: string): PanelEntry
  contains(entry: PanelEntry): boolean
}
export interface EuiApprovalContext {
  readonly sessionId: string
  readonly revision: number
  readonly data: EuiHostCardData
  readonly signal: AbortSignal
}
export type EuiOperation = (context: EuiApprovalContext) => void | Promise<void>
/** A host-owned side button beside the approval: never model-supplied, repeatable, consumes nothing. */
export interface EuiAside { readonly label: string; readonly run: () => void }
export interface EuiHostHandle {
  readonly id: EntryId
  readonly revision: number
  update(data: unknown, operation?: EuiOperation, aside?: EuiAside): void
  revoke(): void
}
export interface EuiKitContext extends Ticket {
  readonly sessionId: string
  readonly revision: number
}
export type EuiKitIntent = (detail: unknown, context: EuiKitContext) => void | Promise<void>
export type EuiKitRefresh = (context: EuiKitContext) => void | Promise<void>
export interface EuiKitHandle {
  readonly id: EntryId
  readonly revision: number
  update(doc: unknown, intent: EuiKitIntent, refresh?: EuiKitRefresh): void
  revoke(): void
}
/** A host-bound glide/v1 tree (glideui/program.ts): drawn with native Tern kinds, never mounted as kit HTML. */
export interface EuiNativeCard { readonly kind: string; readonly app: string; readonly title: string; readonly ui: UiNode }
export interface EuiNativeHandle {
  readonly id: EntryId
  readonly revision: number
  update(card: EuiNativeCard, intent: EuiKitIntent): void
  revoke(): void
}
type Content = {
  readonly kind: 'native'
  readonly data: EuiNativeCard
  readonly intent: EuiKitIntent
  error?: string
} | {
  readonly kind: 'rows'
  readonly data: EuiHostCardData
  operation: EuiOperation | undefined
  readonly aside: EuiAside | undefined
  status: HostCardStatus
} | {
  readonly kind: 'kit'
  readonly data: EuiKitDoc
  readonly intent: EuiKitIntent
  readonly refresh: EuiKitRefresh | undefined
  mounted?: EuiMounted
  /** The fleet kinds' snapshot rewrite, fresh per mount (fleetFit.ts). */
  fit?: FleetFit | undefined
  mounting?: symbol
  error?: string
  refreshing: boolean
  accepting: boolean
}
interface Slot {
  readonly entry: PanelEntry
  readonly key: string
  revision: number
  readonly content: Content
  readonly owner: EuiHostOwner
  readonly controller: AbortController
  readonly onAbort: () => void
}

/** The mounted kit's snapshot as Tern first paints it: already fitted, never reshaped after mount. */
function kitNode(content: Extract<Content, { kind: 'kit' }>) {
  const node = content.mounted?.snapshot() ?? null
  return node && content.fit ? content.fit(node) : node
}

export class EuiHostCards {
  readonly #slots = new Map<PanelEntry, Slot>()
  readonly #kinds: readonly string[]
  readonly #changed: (key: string) => void
  readonly #port: EuiHostPort | undefined
  readonly #sandbox: (() => Promise<EuiSandbox>) | undefined
  #revision = 0
  #closed = false
  #revoking = false

  constructor(kinds: readonly string[], changed: (key: string) => void, port?: EuiHostPort, sandbox?: () => Promise<EuiSandbox>) {
    this.#kinds = kinds
    this.#changed = changed
    this.#port = port
    this.#sandbox = sandbox
  }
  get size(): number { return this.#slots.size }

  publish(raw: unknown, operation?: EuiOperation, aside?: EuiAside): EuiHostHandle {
    const handle = this.#publish(this.#rows(raw, operation, aside))
    return { ...handle, get revision() { return handle.revision }, update: (raw, run, aside) => handle.update(this.#rows(raw, run, aside)) }
  }

  /** Only a trusted caller receives this publication's intent callback and abort lifetime. */
  publishKit(raw: unknown, intent: EuiKitIntent, refresh?: EuiKitRefresh): EuiKitHandle {
    const handle = this.#publish(this.#kit(raw, intent, refresh))
    return { ...handle, get revision() { return handle.revision }, update: (raw, run, refresh) => handle.update(this.#kit(raw, run, refresh)) }
  }

  /** A native card: its controls send intents to `intent` under this revision's context only. */
  publishNative(card: EuiNativeCard, intent: EuiKitIntent): EuiNativeHandle {
    const handle = this.#publish({ kind: 'native', data: card, intent })
    return { ...handle, get revision() { return handle.revision }, update: (card, run) => handle.update({ kind: 'native', data: card, intent: run }) }
  }

  #publish(content: Content) {
    const port = this.#port
    const owner = port?.owner()
    if (this.#closed || this.#revoking || !port || !owner || !owner.sessionId ||
      owner.signal.aborted || !owner.isCurrent() || !port.active()) throw new Error('Host card needs an active session')
    this.sync()
    if (owner.signal.aborted || !owner.isCurrent() || !port.active()) throw new Error('Host card owner changed')
    const title = content.data.title ?? content.data.kind
    const entry = port.append(title)
    if (this.#closed || owner.signal.aborted || !owner.isCurrent() || !port.contains(entry) || !port.active()) {
      throw new Error('Host card owner changed while publishing')
    }
    let slot = this.#install(entry, content, owner)
    while (this.#slots.size > MAX_HOST_CARDS) {
      const oldest = this.#slots.values().next().value
      if (!oldest) break
      this.#drop(oldest)
      this.#changed(oldest.key)
    }
    this.#changed(slot.key)
    return {
      id: entry.id,
      get revision() { return slot.revision },
      update: (content: Content) => {
        if (!this.#current(slot) || !port.active() || this.#revoking) throw new Error('Host card is no longer current')
        const owner = slot.owner
        this.#drop(slot)
        if (this.#closed || !owner.isCurrent() || owner.signal.aborted || !port.contains(entry) || !port.active()) {
          this.#changed(slot.key)
          throw new Error('Host card owner changed')
        }
        entry.title = content.data.title ?? content.data.kind
        slot = this.#install(entry, content, owner)
        this.#changed(slot.key)
      },
      revoke: () => {
        if (this.#slots.get(entry) === slot) {
          this.#drop(slot)
          this.#changed(slot.key)
        }
      }
    }
  }

  view(entry: PanelEntry): EuiCardView | undefined {
    this.sync()
    const slot = this.#slots.get(entry)
    if (!slot) return undefined
    const content = slot.content
    const revision = slot.revision
    if (content.kind === 'native') {
      return {
        spec: content.data, app: content.data.app, label: content.data.title, identity: 'host-' + revision,
        node: null, ui: content.data.ui, ...(content.error === undefined ? {} : { error: content.error }),
        send: (intent: UiIntent) => {
          if (slot.revision !== revision || !this.#current(slot) || !this.#port?.active()) return
          void this.#runKit(slot, () => content.intent(intent, this.#context(slot)))
        }
      }
    }
    return {
      spec: content.data, app: content.data.app, label: content.data.title ?? content.data.kind,
      identity: 'host-' + revision,
      node: content.kind === 'rows' ? hostSnapshot(content.data, content.status, content.aside?.label)
        : kitSnapshot(kitNode(content), kitNotes(content.data), content.refresh !== undefined, content.refreshing, content.error),
      activate: id => {
        if (slot.revision !== revision) return
        if (content.kind === 'rows') this.#approve(slot, id)
        else this.#clickKit(slot, id)
      }
    }
  }

  sync() {
    for (const slot of this.#slots.values()) {
      if (!this.#current(slot)) { this.#drop(slot); this.#changed(slot.key) }
    }
  }
  invalidate() {
    const slots = [...this.#slots.values()]
    for (const slot of slots) this.#drop(slot)
    for (const slot of slots) this.#changed(slot.key)
  }
  close() { this.#closed = true; this.invalidate() }

  /** Theme changes retire native ids and pending mounts, but keep the publication and owner. */
  remountKit() {
    for (const slot of this.#slots.values()) {
      if (slot.content.kind !== 'kit') continue
      slot.content.mounted?.dispose()
      delete slot.content.mounted
      slot.revision = ++this.#revision
      this.#mountKit(slot)
      this.#changed(slot.key)
    }
  }

  #rows(raw: unknown, operation: EuiOperation | undefined, aside?: EuiAside): Content {
    const data = decodeEuiHostCard(raw, this.#kinds)
    if (Boolean(data.approval) !== (typeof operation === 'function')) {
      throw new TypeError('An approval needs its separate host operation; read-only cards have none')
    }
    return { kind: 'rows', data, operation, aside, status: 'pending' }
  }
  #kit(raw: unknown, intent: EuiKitIntent, refresh: EuiKitRefresh | undefined): Content {
    return { kind: 'kit', data: decodeEuiKit(raw), intent, refresh, refreshing: false, accepting: false }
  }
  #install(entry: PanelEntry, content: Content, owner: EuiHostOwner): Slot {
    const slot: Slot = {
      entry, key: 'main.' + entry.id + '.host', revision: ++this.#revision,
      content, owner, controller: new AbortController(),
      onAbort: () => {
        if (this.#slots.get(entry) === slot) { this.#drop(slot); this.#changed(slot.key) }
      }
    }
    this.#slots.set(entry, slot)
    owner.signal.addEventListener('abort', slot.onAbort, { once: true })
    this.#mountKit(slot)
    return slot
  }
  #current(slot: Slot): boolean {
    return !this.#closed && this.#slots.get(slot.entry) === slot &&
      !slot.owner.signal.aborted && slot.owner.isCurrent() && this.#port?.contains(slot.entry) === true
  }
  #drop(slot: Slot) {
    this.#slots.delete(slot.entry)
    const content = slot.content
    if (content.kind === 'rows') content.operation = undefined
    else if (content.kind === 'kit') { content.accepting = false; content.mounted?.dispose(); delete content.mounting }
    slot.owner.signal.removeEventListener('abort', slot.onAbort)
    const wasRevoking = this.#revoking
    this.#revoking = true
    try { slot.controller.abort() } finally { this.#revoking = wasRevoking }
  }
  #context(slot: Slot): EuiKitContext {
    const revision = slot.revision
    return { sessionId: slot.owner.sessionId, revision, signal: slot.controller.signal,
      isCurrent: () => this.#current(slot) && slot.revision === revision && this.#port?.active() === true }
  }
  #mountKit(slot: Slot) {
    const content = slot.content
    if (content.kind !== 'kit' || !this.#sandbox) return
    const token = content.mounting = Symbol()
    delete content.error
    this.#sandbox().then(sb => {
      if (!this.#current(slot) || content.mounting !== token) return
      content.fit = fleetFit(content.data.kind)
      content.mounted = sb.mount(content.data.kind, content.data.app, () => {
        if (this.#current(slot) && content.mounting === token) this.#changed(slot.key)
      }, kitInput(content.data), detail => {
        if (!content.accepting || !this.#current(slot) || content.mounting !== token || !this.#port?.active()) return
        content.accepting = false
        void this.#runKit(slot, () => content.intent(detail, this.#context(slot)))
      })
      this.#changed(slot.key)
    }).catch((error: unknown) => {
      if (!this.#current(slot) || content.mounting !== token) return
      content.error = error instanceof Error ? error.message : String(error)
      this.#changed(slot.key)
    })
  }
  #clickKit(slot: Slot, id: number) {
    const content = slot.content
    if (content.kind !== 'kit' || !this.#current(slot) || !this.#port?.active()) return
    if (id === -1 && content.refresh && !content.refreshing) {
      content.refreshing = true
      this.#changed(slot.key)
      void this.#runKit(slot, () => content.refresh?.(this.#context(slot))).finally(() => {
        if (!this.#current(slot)) return
        content.refreshing = false
        this.#changed(slot.key)
      })
    } else if (content.fit?.click(id)) {
      this.#changed(slot.key)
    } else if (id > 0) {
      content.accepting = true
      try { content.mounted?.click(id) } finally { content.accepting = false }
      if (this.#current(slot)) this.#changed(slot.key)
    }
  }
  async #runKit(slot: Slot, run: () => void | Promise<void>) {
    const revision = slot.revision
    try { await run() } catch (error) {
      if (!this.#current(slot) || slot.revision !== revision || slot.content.kind === 'rows') return
      slot.content.error = error instanceof Error ? error.message : String(error)
    } finally {
      if (this.#current(slot) && slot.revision === revision) this.#changed(slot.key)
    }
  }
  #approve(slot: Slot, id: number) {
    const content = slot.content
    if (content.kind === 'rows' && id === HOST_ASIDE_ID && content.aside && content.status === 'pending' &&
      this.#current(slot) && this.#port?.active()) {
      content.aside.run()
      this.#changed(slot.key)
      return
    }
    if (content.kind !== 'rows' || id !== HOST_APPROVE_ID || !this.#current(slot) || !this.#port?.active() ||
      content.status !== 'pending' || !content.operation) return
    const run = content.operation
    content.operation = undefined
    content.status = 'running'
    try {
      const result = run(Object.freeze({ sessionId: slot.owner.sessionId, revision: slot.revision,
        data: content.data, signal: slot.controller.signal }))
      void Promise.resolve(result).then(() => this.#finish(slot, 'done'), () => this.#finish(slot, 'failed'))
      if (this.#current(slot)) this.#changed(slot.key)
    } catch { this.#finish(slot, 'failed') }
  }
  #finish(slot: Slot, status: 'done' | 'failed') {
    if (!this.#current(slot) || slot.content.kind !== 'rows') return
    slot.content.status = status
    this.#changed(slot.key)
  }
}
