import type { ChatPorts } from '../app/ports.js'
import type { EuiKitContext, EuiKitHandle } from '../eui/host.js'
import { decodeIntel, decodeIntelIntent, INTEL_TABS, intelDetailBody, intelEntity, intelReadableTitle, intelTab, intelText, presentIntel, type IntelDoc, type IntelTab } from '../wire/intel.js'

export type IntelHost = Pick<ChatPorts, 'session' | 'transcript' | 'eui' | 'control'> & {
  readonly gw: Pick<ChatPorts['gw'], 'request'>
}

export async function intelCommand(host: IntelHost, arg: string): Promise<void> {
  const initialTab = intelTab(arg)
  if (initialTab === undefined) {
    host.transcript.notice('Usage: /intel [--json] [hill|skills|memory|failures|trace]', 'warning')
    return
  }
  const sessionId = host.session.ref.live
  const eui = host.eui
  if (!sessionId || !eui) {
    host.transcript.notice('/intel needs an attached session and inline cards', 'warning')
    return
  }
  const ref = host.session.ref
  const owner = host.session.ownerTicket?.()
  const lifetime = host.transcript.lifetime
  const current = () => host.session.ref === ref && host.session.ref.live === sessionId &&
    owner?.isCurrent() !== false && !owner?.signal.aborted && host.transcript.lifetime === lifetime
  const active = (context: EuiKitContext) => current() && context.sessionId === sessionId && context.isCurrent() && !context.signal.aborted
  const request = (arg: string) => host.gw.request<unknown>('command.dispatch', { name: 'intel', arg: `--json ${arg}`, session_id: sessionId })
  const read = async (tab: IntelTab) => {
    const doc = decodeIntel(await request(INTEL_TABS[tab]))
    return { ...doc, data: { ...doc.data, tab } }
  }
  let handle: EuiKitHandle | undefined
  const publish = (doc: IntelDoc) => {
    const presentation = presentIntel(doc)
    const refresh = async (context: EuiKitContext) => {
      if (!active(context)) return
      try {
        const next = await read(doc.data.tab ?? initialTab)
        if (active(context)) publish(next)
      } catch (error) {
        if (active(context)) host.transcript.notice(`/intel: ${error instanceof Error ? error.message : String(error)}`, 'warning')
      }
    }
    const intent = async (detail: unknown, context: EuiKitContext) => {
      if (!active(context)) return
      try {
        const action = decodeIntelIntent(detail)
        let command: string
        let entity: string
        let title: string
        let showDetail: (text: string) => string = text => text
        switch (action.action) {
          case 'tab':
            publish({ ...doc, data: { ...doc.data, tab: action.entities.tab } })
            return
          case 'refresh':
            await refresh(context)
            return
          case 'open-climb': {
            const row = doc.data.climbs.find(row => row.id === action.entities.id)
            if (!row) throw new Error('Climb unavailable in this snapshot')
            command = 'climb'; entity = row.id; title = intelReadableTitle(row.label)
            showDetail = text => intelDetailBody('climb', text, row)
            break
          }
          case 'open-skill': {
            const original = presentation.skills.get(action.entities.skill) ?? action.entities.skill
            const row = doc.data.routes.find(row => row.skill === original)
            if (!row) throw new Error('Skill unavailable in this snapshot')
            command = 'skill'; entity = row.skill; title = intelReadableTitle(row.skill)
            showDetail = text => intelDetailBody('skill', text, row)
            break
          }
          case 'open-failure': {
            const original = presentation.failures.get(action.entities.sig) ?? action.entities.sig
            const row = doc.data.failures.find(row => row.sig === original)
            if (!row) throw new Error('Failure unavailable in this snapshot')
            command = 'failure'; entity = row.sig
            title = presentation.card.data.failures.find(f => f.sig === action.entities.sig)?.sig ?? 'Failure details'
            showDetail = text => intelDetailBody('failure', text, row)
            break
          }
          default: { const exhaustive: never = action; return exhaustive }
        }
        const reply = await request(`${command} ${intelEntity(entity)}`)
        if (active(context)) host.control().panel(title, showDetail(intelText(reply)))
      } catch (error) {
        if (active(context)) host.transcript.notice(`Intel action: ${error instanceof Error ? error.message : String(error)}`, 'warning')
      }
    }
    const data = { ...presentation.card, title: 'Local intelligence' }
    if (handle) handle.update(data, intent, refresh)
    else handle = eui.host.publishKit(data, intent, refresh)
  }
  try {
    const doc = await read(initialTab)
    if (current()) publish(doc)
  } catch (error) {
    if (current()) host.transcript.notice(`/intel: ${error instanceof Error ? error.message : String(error)}`, 'warning')
  }
}
