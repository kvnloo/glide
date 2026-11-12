import type { ChatPorts } from '../app/ports.js'
import { storedSessionId } from '../core/ids.js'
import type { EuiKitContext, EuiKitHandle } from '../eui/host.js'
import { openUrl } from '../overlays/pullRequests.js'
import type { EuiKitDoc } from '../wire/euiKit.js'
import { decodeFleet, decodeFleetIntent, fleetAgent, fleetNode, fleetPod, fleetRequest, fleetTask, fleetText, type FleetView } from '../wire/fleet.js'

export type FleetHost = Pick<ChatPorts, 'session' | 'transcript' | 'eui' | 'resume' | 'control' | 'notice' | 'reveal'> & {
  readonly gw: Pick<ChatPorts['gw'], 'request'>
}
const title = { hosts: 'Hosts', portfolio: 'Portfolio', factory: 'Factory graph' }

function browse(url: string | undefined) {
  if (!url) throw new Error('No URL available in this snapshot')
  const parsed = new URL(url)
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsafe fleet URL')
  openUrl(parsed.href)
}

/** Called only by the publication's sandbox click route, never by assistant-authored fences. */
export async function fleetIntent(host: FleetHost, doc: EuiKitDoc, detail: unknown, context: EuiKitContext): Promise<void> {
  if (!context.isCurrent() || context.signal.aborted) return
  const warn = async (text: string) => {
    host.notice(text, 'warning')
    const entry = host.transcript.entries.at(-1)
    await new Promise<void>(resolve => setImmediate(resolve))
    if (entry && context.isCurrent() && !context.signal.aborted) host.reveal(`main.${entry.id}`)
  }
  try {
    const action = decodeFleetIntent(detail)
    switch (action.action) {
      case 'open-chat': {
        const { harness, agent } = fleetAgent(doc, action.entities)
        if (harness?.kind.toLowerCase() !== 'hermes' || agent.id.startsWith('process:') || /^\d+$/.test(agent.id)) {
          await warn('Not a Hermes session. Process ids cannot be resumed.')
          return
        }
        await host.resume(storedSessionId(agent.id))
        return
      }
      case 'nudge': {
        const { agent } = fleetAgent(doc, action.entities)
        host.control().draft(`Follow up with ${agent.name} on ${action.entities.host}: `)
        return
      }
      case 'open-pod': {
        const pod = fleetPod(doc, action.entities)
        const reply = await fleetRequest(host.gw, context.sessionId, pod)
        if (context.isCurrent() && !context.signal.aborted) host.control().panel(`${pod.ns}/${pod.name}`, fleetText(reply))
        return
      }
      case 'open-task': browse(fleetTask(doc, action.entities).url); return
      case 'set-next': {
        const task = fleetTask(doc, action.entities)
        host.control().draft(`Set next: ${task.label} (${action.entities.product}/${action.entities.feature}/${task.id}). `)
        return
      }
      case 'queue-fix': {
        const node = fleetNode(doc, action.entities)
        host.control().draft(`Investigate and prepare a fix for ${node.label} (${node.id}). `)
        return
      }
      case 'open-node': browse(fleetNode(doc, action.entities).url); return
      default: { const exhaustive: never = action; return exhaustive }
    }
  } catch (error) {
    if (context.isCurrent() && !context.signal.aborted) {
      await warn(`Fleet action: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export async function fleetCommand(host: FleetHost, view: FleetView, portfolio?: string): Promise<void> {
  const sessionId = host.session.ref.live
  const label = view === 'factory' ? '/factory graph' : `/${view}`
  if (!sessionId || !host.eui) { host.notice(`${label} needs an attached session and inline cards`, 'warning'); return }
  const eui = host.eui
  const ref = host.session.ref
  const owner = host.session.ownerTicket?.()
  const lifetime = host.transcript.lifetime
  const current = () => host.session.ref === ref && host.session.ref.live === sessionId &&
    owner?.isCurrent() !== false && !owner?.signal.aborted && host.transcript.lifetime === lifetime
  const params = { view, ...(portfolio ? { portfolio } : {}) }
  const read = async () => decodeFleet(await fleetRequest(host.gw, sessionId, params), view)
  let handle: EuiKitHandle
  const publish = (doc: EuiKitDoc, first: boolean) => {
    const intent = (detail: unknown, context: EuiKitContext) => fleetIntent(host, doc, detail, context)
    const refresh = async (context: EuiKitContext) => {
      const next = await read()
      if (!current() || !context.isCurrent() || context.signal.aborted) return
      publish(next, false)
    }
    const data = { ...doc, title: title[view] }
    if (first) handle = eui.host.publishKit(data, intent, refresh)
    else handle.update(data, intent, refresh)
  }
  try {
    const doc = await read()
    if (current()) publish(doc, true)
  } catch (error) {
    if (current()) host.notice(`${label}: ${error instanceof Error ? error.message : String(error)}`, 'warning')
  }
}
