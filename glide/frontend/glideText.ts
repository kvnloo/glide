// `/glide VERB ...` for a verb the Tern interceptor draws no card for (build, on, setup, skill-router,
// hill-climb, offload, json, help, ...): the plugin's own text command, its reply shown as the output.
import type { GlideHost } from '../../frontend/src/commands/glide.js'

export async function glideText(host: Pick<GlideHost, 'gw' | 'session' | 'transcript'>, sid: string, arg: string, verb: string): Promise<void> {
  const ref = host.session.ref
  const reply = await host.gw.request<{ output?: unknown }>('command.dispatch', { name: 'glide', arg, session_id: sid })
  if (host.session.ref !== ref) return
  const output = typeof reply?.output === 'string' ? reply.output.trim() : ''
  host.transcript.panel(`/glide ${verb}`, output || '(no output)')
}
