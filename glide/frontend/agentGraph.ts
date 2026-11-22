// Read-only projection of gateway telemetry. Separate from transcript ownership: a
// child can be observed before its delegate_task card exists, or in another session.
import type { AnyGatewayEvent } from '../../frontend/src/gateway/follow.js'
import { rpc, type Requester } from '../../frontend/src/wire/rpc.js'

type State = 'idle' | 'live' | 'queued' | 'done' | 'failed' | 'interrupted' | 'ended'
export interface AgentNode { id: string; label: string; state: State; parent?: string }
const MAX_NODES = 60

export class AgentGraph {
  readonly #nodes = new Map<string, AgentNode>()
  readonly #listeners = new Set<() => void>()

  observe(ev: AnyGatewayEvent) {
    const sid = ev.session_id
    if (!sid) return false
    const root = 'session:' + sid
    const seen = this.#nodes.get(root)
    if (ev.type === 'message.start' || ev.type === 'message.complete') {
      return this.#put({ id: root, label: seen?.label ?? 'Session ' + sid, state: ev.type === 'message.start' ? 'live' : 'idle' })
    } else if (ev.type === 'session.info' && ev.payload?.title) {
      return this.#put({ id: root, label: ev.payload.title, state: seen?.state ?? 'idle' })
    } else if (ev.type === 'subagent.spawn_requested' || ev.type === 'subagent.start' || ev.type === 'subagent.complete') {
      const child = ev.payload
      if (!child?.subagent_id) return false
      if (!seen) this.#nodes.set(root, { id: root, label: 'Session ' + sid, state: 'idle' })
      const key = (id: string) => JSON.stringify([sid, id])
      const id = key(child.subagent_id)
      const prior = this.#nodes.get(id)
      if (prior && !['queued', 'live'].includes(prior.state)) return false
      const status = child.status
      const state = ev.type === 'subagent.complete' ? status === 'completed' ? 'done'
        : status === 'interrupted' ? 'interrupted' : status ? 'failed' : 'ended'
        : ev.type === 'subagent.start' || prior?.state === 'live' ? 'live' : 'queued'
      return this.#put({ id, label: child.goal || prior?.label || 'Subagent', state,
        parent: child.parent_id ? key(child.parent_id) : prior?.parent ?? root })
    }
    return false
  }

  #put(node: AgentNode) {
    node.label = node.label.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) || 'Untitled'
    const prev = this.#nodes.get(node.id)
    if (prev?.state === node.state && prev.label === node.label && prev.parent === node.parent) return false
    this.#nodes.set(node.id, node)
    if (this.#nodes.size > MAX_NODES) {
      const oldest = [...this.#nodes.values()]
      const drop = oldest.find(n => n.parent && n.state !== 'live' && n.state !== 'queued') ?? oldest.find(n => n.parent) ?? oldest[0]
      if (drop) this.#nodes.delete(drop.id)
    }
    this.#notify()
    return true
  }

  nodes(sid: string): AgentNode[] {
    const root = 'session:' + sid
    const current = this.#nodes.get(root) ?? { id: root, label: 'Current session', state: 'idle' } as const
    return [current, ...[...this.#nodes.values()].filter(n => n.id !== root).slice(-(MAX_NODES - 1))]
  }

  /** Seed already-running children of the attached session. Events always win over this read. */
  async seed(gw: Requester, sid: string, current: () => boolean) {
    try {
      const result = await rpc(gw, 'subagent.list', { session_id: sid })
      if (!current()) return false
      let changed = false
      const root = 'session:' + sid
      for (const child of result?.subagents ?? []) {
        if (!child.subagent_id || (child.status !== 'running' && child.status !== 'queued')) continue
        const id = JSON.stringify([sid, child.subagent_id])
        if (this.#nodes.has(id)) continue
        changed = this.#put({ id, label: child.goal || 'Subagent', state: child.status === 'queued' ? 'queued' : 'live',
          parent: child.parent_id ? JSON.stringify([sid, child.parent_id]) : root }) || changed
      }
      return changed
    } catch {
      // A gateway without the roster can still stream lifecycle events.
      return false
    }
  }

  watch(listener: () => void, signal: AbortSignal) {
    if (signal.aborted) return undefined
    const stop = () => {
      this.#listeners.delete(listener)
      signal.removeEventListener('abort', stop)
    }
    this.#listeners.add(listener)
    signal.addEventListener('abort', stop, { once: true })
    return stop
  }

  reset() {
    this.#nodes.clear()
    this.#notify()
  }

  #notify() { for (const listener of this.#listeners) listener() }
}

/** Observed lineage only. Missing parents remain separate, and cycles cannot hang the pane. */
export function agentLineage(nodes: AgentNode[]) {
  const children = new Map<string | undefined, AgentNode[]>()
  const ids = new Set(nodes.map(n => n.id))
  for (const node of nodes) {
    const parent = node.parent && ids.has(node.parent) ? node.parent : undefined
    const siblings = children.get(parent) ?? []
    siblings.push(node)
    children.set(parent, siblings)
  }
  const rows: { node: AgentNode; depth: number; from?: number }[] = []
  const seen = new Set<string>()
  const walk = (node: AgentNode, depth: number, from?: number) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    const index = rows.length
    rows.push({ node, depth, ...(from === undefined ? {} : { from }) })
    for (const child of children.get(node.id) ?? []) walk(child, depth + 1, index)
  }
  for (const node of children.get(undefined) ?? []) walk(node, 0)
  for (const node of nodes) walk(node, 0)
  return rows
}
