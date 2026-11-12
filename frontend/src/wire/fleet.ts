import * as z from 'zod/mini'

import { decodeEuiKit, type EuiKitDoc } from './euiKit.js'
import { factoryOutput } from './factory.js'
import { isUnsupportedFork } from './fork.js'
import { commandReply } from './json.js'
import type { Requester } from './rpc.js'

/** The same validated producer, through stock commands when optional plugin methods are absent. */
export async function fleetRequest(gw: Requester, sessionId: string, request:
  | { view: FleetView; portfolio?: string }
  | { host: string; ns: string; name: string }
): Promise<unknown> {
  const method = 'view' in request ? 'glide.fleet' : 'glide.fleet_pod'
  try {
    return await gw.request<unknown>(method, { session_id: sessionId, ...request })
  } catch (error) {
    if (!isUnsupportedFork(error)) throw error
  }
  const { view, ...params } = 'view' in request ? request : { view: 'pod', ...request }
  const reply = await gw.request<unknown>('command.dispatch', {
    name: 'fleet', arg: `${view} ${JSON.stringify(params)}`, session_id: sessionId
  })
  return commandReply<unknown>(factoryOutput(reply))
}

export type FleetView = 'hosts' | 'portfolio' | 'factory'
const apps = { hosts: 'k3s', portfolio: 'dash', factory: 'aodl' }
export function decodeFleet(raw: unknown, view: FleetView): EuiKitDoc {
  const doc = decodeEuiKit(raw)
  if (doc.kind !== `fleet-${view}` || doc.app !== apps[view]) throw new TypeError('Unexpected fleet document')
  return doc
}

const id = z.string().check(z.minLength(1), z.maxLength(200))
const agentEntities = z.object({ host: id, agent: id })
const taskEntities = z.object({ product: id, feature: id, task: id })
const nodeEntities = z.object({ node: id })
const intent = z.discriminatedUnion('action', [
  z.object({ action: z.literal('open-chat'), entities: agentEntities }),
  z.object({ action: z.literal('check-host'), entities: z.object({ host: id }) }),
  z.object({ action: z.literal('nudge'), entities: agentEntities }),
  z.object({ action: z.literal('open-pod'), entities: z.object({ host: id, ns: id, name: id }) }),
  z.object({ action: z.literal('open-task'), entities: taskEntities }),
  z.object({ action: z.literal('set-next'), entities: taskEntities }),
  z.object({ action: z.literal('queue-fix'), entities: nodeEntities }),
  z.object({ action: z.literal('open-node'), entities: nodeEntities })
])
export type FleetIntent = z.infer<typeof intent>

/** Intent entities must name a row in the trusted publication, never a model fence or event URL. */
export function decodeFleetIntent(raw: unknown): FleetIntent {
  const parsed = intent.safeParse(raw)
  if (!parsed.success) throw new Error('Unhandled or invalid fleet action')
  return parsed.data
}
const hosts = z.object({ hosts: z.array(z.object({
  id, online: z.boolean(), harnesses: z.array(z.object({ kind: id, agents: z.array(z.object({ id, name: z.string(), state: z.string() })) })),
  k3s: z.nullable(z.object({ pods: z.array(z.tuple([z.string(), z.string(), z.string(), z.number(), z.string()])) }))
})) })
const portfolios = z.object({ portfolios: z.record(z.string(), z.object({ products: z.array(z.object({
  id, features: z.array(z.object({ id, tasks: z.array(z.object({ id, label: z.string(), url: z.optional(z.string()) })) }))
})) })) })
const factory = z.object({ nodes: z.array(z.object({ id, label: z.string(), url: z.optional(z.string()) })) })

export function fleetAgent(doc: EuiKitDoc, entity: z.infer<typeof agentEntities>) {
  if (doc.kind !== 'fleet-hosts') throw new Error('Action does not belong to this fleet card')
  const host = hosts.parse(doc.data).hosts.find(h => h.id === entity.host)
  const harness = host?.harnesses.find(h => h.agents.some(a => a.id === entity.agent))
  const agent = harness?.agents.find(a => a.id === entity.agent)
  if (!host?.online || !agent || agent.state === 'offline') throw new Error('Agent unavailable in this snapshot')
  return { host, harness, agent }
}
export function fleetHost(doc: EuiKitDoc, entity: { host: string }) {
  if (doc.kind !== 'fleet-hosts') throw new Error('Action does not belong to this fleet card')
  const host = hosts.parse(doc.data).hosts.find(h => h.id === entity.host)
  if (!host) throw new Error('Host unavailable in this snapshot')
  return host
}
export function fleetPod(doc: EuiKitDoc, entity: { host: string; ns: string; name: string }) {
  if (doc.kind !== 'fleet-hosts') throw new Error('Action does not belong to this fleet card')
  const host = hosts.parse(doc.data).hosts.find(h => h.id === entity.host)
  if (!host?.online || !host.k3s?.pods.some(p => p[0] === entity.ns && p[1] === entity.name)) {
    throw new Error('Pod unavailable in this snapshot')
  }
  return entity
}
export function fleetTask(doc: EuiKitDoc, entity: z.infer<typeof taskEntities>) {
  if (doc.kind !== 'fleet-portfolio') throw new Error('Action does not belong to this fleet card')
  const task = Object.values(portfolios.parse(doc.data).portfolios).flatMap(p => p.products)
    .find(p => p.id === entity.product)?.features.find(f => f.id === entity.feature)?.tasks.find(t => t.id === entity.task)
  if (!task) throw new Error('Task unavailable in this snapshot')
  return task
}
export function fleetNode(doc: EuiKitDoc, entity: z.infer<typeof nodeEntities>) {
  if (doc.kind !== 'fleet-factory') throw new Error('Action does not belong to this fleet card')
  const node = factory.parse(doc.data).nodes.find(n => n.id === entity.node)
  if (!node) throw new Error('Node unavailable in this snapshot')
  return node
}
export function fleetText(raw: unknown): string { return z.object({ text: z.string() }).parse(raw).text }


/** Display-only projection. IDs remain in validated intents, never on the card. */
export type FleetTone = 'running' | 'held' | 'failed' | 'done' | 'idle'
export interface FleetDesignRow {
  key: string
  name: string
  state: FleetTone
  fact?: string
  action: string
  intent: FleetIntent | null
  recommended: boolean
}
export interface FleetDesignTile extends FleetDesignRow { column: number }
export interface FleetDesign {
  view: FleetView
  hero: string
  verdict: string
  rows: FleetDesignRow[]
  tiles: FleetDesignTile[]
  edges: [string, string][]
}
const agentShape = z.object({ id, name: z.string(), state: z.string() })
const hostShape = z.object({
  id, label: z.string(), online: z.boolean(),
  harnesses: z.array(z.object({ kind: z.string(), agents: z.array(agentShape) })),
  k3s: z.nullable(z.object({ node: z.optional(z.string()), pods: z.array(z.array(z.unknown())) }))
})
const portfolioShape = z.object({ portfolios: z.record(z.string(), z.object({
  products: z.array(z.object({ id, label: z.string(), features: z.array(z.object({
    id, label: z.string(), tasks: z.array(z.object({ id, label: z.string(), status: z.string(), url: z.optional(z.string()) }))
  })) }))
})) })
const graphShape = z.object({
  nodes: z.array(z.object({ id, label: z.string(), col: z.number(), state: z.string(), action: z.optional(z.string()), url: z.optional(z.string()) })),
  edges: z.array(z.tuple([id, id, z.string(), z.boolean()]))
})
const severity = (state: FleetTone) => ({ failed: 5, held: 4, running: 2, idle: 1, done: 0 })[state]
const plural = (n: number, noun: string) => n + ' ' + noun + (n === 1 ? '' : 's')
const friendly = (text: string, fallback: string) => {
  const safe = text.replace(/[\u0000-\u001f]/g, ' ').trim()
  return !safe || /(?:Traceback|Exception:|error code|provider.+(?:timeout|failed)|^\/|^[a-f0-9]{24,}$)/i.test(safe)
    ? fallback : safe.slice(0, 96)
}
const vacant = (view: FleetView): FleetDesign => ({
  view, hero: 'Fleet snapshot unavailable · Refresh to retry', verdict: 'No current data', rows: [], tiles: [], edges: []
})

/** One host or repository per row. The factory retains real edges, not invented topology. */
export function fleetDesign(doc: EuiKitDoc, view: FleetView): FleetDesign {
  if (doc.kind !== 'fleet-' + view) return vacant(view)
  if (view === 'hosts') {
    const parsed = z.object({ hosts: z.array(hostShape) }).safeParse(doc.data)
    if (!parsed.success) return vacant(view)
    const rows: FleetDesignRow[] = parsed.data.hosts.map(host => {
      const agents = host.harnesses.flatMap(h => h.agents.map(a => ({ ...a, harness: h.kind })))
      const blocked = agents.find(a => a.state === 'blocked')
      const chosen = blocked ?? agents.find(a => a.state !== 'offline')
      const state: FleetTone = !host.online ? 'failed'
        : blocked || host.k3s?.node === 'NotReady' ? 'held'
          : agents.some(a => a.state === 'working') ? 'running' : 'idle'
      const canResume = chosen?.harness.toLowerCase() === 'hermes' && !chosen.id.startsWith('process:') && !/^\d+$/.test(chosen.id)
      const intent: FleetIntent = host.online && chosen
        ? { action: blocked || !canResume ? 'nudge' : 'open-chat', entities: { host: host.id, agent: chosen.id } }
        : { action: 'check-host', entities: { host: host.id } }
      const action = !host.online || !chosen ? 'Check host' : blocked ? 'Answer' : canResume ? 'Open chat' : 'Follow up'
      const fact = agents.length ? plural(agents.length, 'agent')
        : host.k3s?.pods.length ? plural(host.k3s.pods.length, 'pod') : undefined
      return { key: host.id, name: friendly(host.label, 'Unnamed host'), state, ...(fact ? { fact } : {}),
        action, intent, recommended: false }
    })
    const next = [...rows].sort((a, b) => severity(b.state) - severity(a.state))[0]
    return {
      view, hero: plural(rows.length, 'host') + ' · ' + (next?.state ?? 'idle') + ' · ' +
        (next ? next.action + ' on ' + next.name : 'No hosts to review'),
      verdict: next?.state === 'failed' ? 'A host is offline' : next?.state === 'held'
        ? 'A host needs attention' : 'Host status at a glance',
      rows: rows.map(r => ({ ...r, recommended: r.key === next?.key })), tiles: [], edges: []
    }
  }
  if (view === 'portfolio') {
    const parsed = portfolioShape.safeParse(doc.data)
    if (!parsed.success) return vacant(view)
    const byRepo = new Map<string, FleetDesignRow>()
    for (const board of Object.values(parsed.data.portfolios))
      for (const product of board.products) for (const feature of product.features) {
        if (!feature.tasks.length && feature.label.startsWith('Also in ')) continue
        const name = friendly(feature.label, product.label)
        const priority = (s: string) => s === 'blocked' ? 4 : s === 'next' ? 3 : s === 'active' ? 2 : 1
        const best = [...feature.tasks].sort((a,b) => priority(b.status) - priority(a.status))[0]
        const state: FleetTone = best?.status === 'blocked' ? 'held' : best?.status === 'active'
          ? 'running' : best?.status === 'done' ? 'done' : 'idle'
        const intent: FleetIntent | null = best ? { action: best.url && best.status !== 'next' ? 'open-task' : 'set-next',
          entities: { product: product.id, feature: feature.id, task: best.id } } : null
        const row: FleetDesignRow = { key: feature.id, name, state,
          ...(best ? { fact: plural(feature.tasks.length, 'task') } : {}),
          action: !best ? 'No open tasks' : best.status === 'next' ? 'Set next' : best.url ? 'Open task' : 'Set next',
          intent, recommended: false }
        const previous = byRepo.get(name)
        if (!previous || severity(row.state) > severity(previous.state)) byRepo.set(name, row)
      }
    const rows = [...byRepo.values()]
    const next = [...rows].filter(r => r.intent).sort((a,b) => severity(b.state)-severity(a.state))[0]
    return { view, hero: plural(rows.length, 'repository') + ' · ' + (next?.state ?? 'idle') + ' · ' +
      (next ? next.action + ' in ' + next.name : 'No next action'),
      verdict: next ? 'One next step per repository' : 'No open tasks',
      rows: rows.map(r => ({...r, recommended: r === next})), tiles: [], edges: [] }
  }
  const parsed = graphShape.safeParse(doc.data)
  if (!parsed.success) return vacant(view)
  const ids = new Set(parsed.data.nodes.map(n => n.id))
  const nodes: FleetDesignTile[] = parsed.data.nodes.map(node => {
    const state: FleetTone = node.state === 'failing' ? 'failed' : node.state === 'needs-you' ? 'held'
      : node.state === 'live' ? 'running' : node.state === 'done' ? 'done' : 'idle'
    return { key: node.id, name: friendly(node.label, 'Factory node'),
      column: Math.max(0, Math.min(3, Math.floor(node.col))), state,
      action: state === 'failed' || state === 'held' ? 'Prepare fix' : 'Review node',
      intent: { action: 'queue-fix', entities: { node: node.id } }, recommended: false }
  })
  const next = [...nodes].sort((a,b) => severity(b.state)-severity(a.state))[0]
  return { view, hero: plural(nodes.length, 'node') + ' · ' + (next?.state ?? 'idle') + ' · ' +
    (next ? next.action + ' for ' + next.name : 'No next action'),
    verdict: next?.state === 'failed' ? 'A factory step failed' : next?.state === 'held' ? 'A step needs attention' : 'Factory flow',
    rows: [], tiles: nodes.map(n => ({...n, recommended: n.key === next?.key})),
    edges: parsed.data.edges.filter(([a,b]) => ids.has(a) && ids.has(b)).map(([a,b]) => [a,b]) }
}
