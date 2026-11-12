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
