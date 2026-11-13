import type { ChatPorts } from '../app/ports.js'
import { storedSessionId } from '../core/ids.js'
import type { EuiKitContext, EuiNativeHandle } from '../eui/host.js'
import { fleetGlide, fleetLocalIntent, FLEET_TITLES, type HostsTab } from '../glideui/fleet.js'
import { glide, type Glide } from '../glideui/program.js'
import { openUrl } from '../overlays/pullRequests.js'
import type { EuiKitDoc } from '../wire/euiKit.js'
import { decodeFleet, decodeFleetIntent, fleetAgent, fleetHost, fleetNode, fleetPod, fleetRequest, fleetTask, fleetText, type FleetView } from '../wire/fleet.js'

export type FleetHost = Pick<ChatPorts, 'session' | 'transcript' | 'eui' | 'resume' | 'control' | 'notice' | 'reveal'> & {
  readonly gw: Pick<ChatPorts['gw'], 'request'>
}

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
      case 'check-host': {
        const found = fleetHost(doc, action.entities)
        host.control().draft(`Check the connection for ${found.id} and recommend one next step. `)
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
  let handle: EuiNativeHandle | undefined
  let g: Glide | undefined
  const publish = (doc: EuiKitDoc, tab: HostsTab) => {
    // Tabs and Refresh are card-local; every other control is a fleet.v0 intent checked against this snapshot.
    const intent = async (detail: unknown, context: EuiKitContext) => {
      if (!current() || !context.isCurrent() || context.signal.aborted) return
      const local = fleetLocalIntent(detail)
      if (local && local !== 'refresh') { publish(doc, local.tab); return }
      if (local === 'refresh') {
        try {
          const next = await read()
          if (current() && context.isCurrent() && !context.signal.aborted) publish(next, tab)
        } catch (error) {
          if (current()) host.notice(`${label}: ${error instanceof Error ? error.message : String(error)}`, 'warning')
        }
        return
      }
      await fleetIntent(host, doc, detail, context)
    }
    if (!g) throw new Error('OpenUI glide library is not loaded')
    const { program, doc: bound } = fleetGlide(doc, view, tab)
    const card = { kind: 'fleet-' + view, app: doc.app, title: FLEET_TITLES[view], ui: g.bind(g.program(program, sessionId), bound) }
    if (handle) handle.update(card, intent)
    else handle = eui.host.publishNative(card, intent)
  }
  try {
    // The snapshot read goes out at once; the OpenUI library loads alongside it.
    const [lib, doc] = await Promise.all([glide(), read()])
    g = lib
    if (current()) publish(doc, 'agents')
  } catch (error) {
    if (current()) host.notice(`${label}: ${error instanceof Error ? error.message : String(error)}`, 'warning')
  }
}
