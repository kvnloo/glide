import type { ChatPorts } from '../app/ports.js'
import { factoryOutput } from '../wire/factory.js'

export type FactoryHost = Pick<ChatPorts, 'gw' | 'session' | 'transcript' | 'operations' | 'toggleFactory'>
export type { FactoryRun, FactoryScene, FactoryStatus } from '../wire/factory.js'

/** Bare /factory toggles the aside; explicit commands retain the plugin's text interface. */
export async function factoryCommand(host: FactoryHost, arg: string): Promise<void> {
  const text = arg.trim()
  if (!text && host.toggleFactory()) return
  const sid = host.session.ref.live
  if (!sid) {
    host.transcript.notice('/factory needs an attached session', 'warning')
    return
  }
  const owner = host.session.ownerTicket?.()
  try {
    const result = await host.gw.request<unknown>('command.dispatch', {
      name: 'factory', arg: text === 'text' || text === 'status' ? '' : text, session_id: sid
    })
    if (host.session.ref.live !== sid || owner?.isCurrent() === false) return
    host.operations.showText('Content factory', factoryOutput(result))
  } catch (error) {
    if (host.session.ref.live === sid && owner?.isCurrent() !== false) {
      host.transcript.notice(`/factory: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }
}
