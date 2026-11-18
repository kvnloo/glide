import type { GlideHost } from '../../frontend/src/commands/glide.js'
import type { EuiNativeHandle } from '../../frontend/src/eui/host.js'
import { studioCard, studioRuntime, studioSnapshot, type StudioSnapshot } from './studio.js'

export async function studioCommand(host: GlideHost, project: string): Promise<void> {
  const ref = host.session.ref
  const cards = host.eui?.host
  if (!ref.live || !cards) return
  const current = () => host.session.ref === ref && host.session.ref.live === ref.live
  const ignore = () => undefined // This card is a read-only preview, not an editor.
  let handle: EuiNativeHandle | undefined
  let snapshot: StudioSnapshot | undefined
  try {
    handle = cards.publishNative(studioCard({ phase: 'starting' }), ignore)
    snapshot = studioSnapshot(await studioRuntime('snapshot', project))
    if (!current()) { handle.revoke(); return }
    await studioRuntime(snapshot.mode, project)
    if (!current()) { handle.revoke(); return }
    handle.update(studioCard({ phase: 'open', snapshot }), ignore)
  } catch (error) {
    if (!current()) { handle?.revoke(); return }
    const message = error instanceof Error ? error.message : 'Studio unavailable'
    handle?.update(studioCard({ phase: 'error', message, ...(snapshot ? { snapshot } : {}) }), ignore)
    host.transcript.notice(`/glide studio: ${message}`, 'error')
  }
}
