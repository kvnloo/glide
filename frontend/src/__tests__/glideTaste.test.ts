import { afterEach, describe, expect, it, vi } from 'vitest'

import { glideCommand, type GlideHost } from '../commands/glide.js'
import { liveSessionId } from '../core/ids.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { stub } from './fakes.js'

vi.mock('../wire/taste.js', async (importOriginal: <T>() => Promise<T>) => ({
  ...await importOriginal<typeof import('../wire/taste.js')>(), openTastePane: vi.fn(async () => 42)
}))
import { openTastePane } from '../wire/taste.js'

function setup() {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('taste-session'), stored: null }
  const transcript = new Transcript()
  const request = vi.fn(async (method: string) => {
    if (method === 'glide.taste') throw new Error('unknown method glide.taste')
    return { output: JSON.stringify({ url: 'http://127.0.0.1:8789/s/launch-ab12/', title: 'Launch ideas' }) }
  })
  const publish = vi.fn()
  const host: GlideHost = { gw: stub({ request }), session, transcript, eui: stub({ host: { publish } }) }
  return { host, request, publish, session, transcript }
}

afterEach(() => vi.clearAllMocks())

describe('/glide taste', () => {
  it('uses the card seam fallback and opens the real board beside chat only on request', async () => {
    const { host, request, publish } = setup()
    expect(openTastePane).not.toHaveBeenCalled()
    await glideCommand(host, 'taste')
    expect(request.mock.calls).toEqual([
      ['glide.taste', { session_id: 'taste-session' }],
      ['command.dispatch', { name: 'glide', arg: 'json taste {}', session_id: 'taste-session' }]
    ])
    expect(openTastePane).toHaveBeenCalledWith({ url: 'http://127.0.0.1:8789/s/launch-ab12/', title: 'Launch ideas' })
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ title: 'Launch ideas', kind: 'receipt' }))
    expect(request.mock.calls.some((c: readonly unknown[]) => c[0] === 'glide.enable')).toBe(false)
  })

  it('does not open a late reply after a session switch', async () => {
    const { host, session } = setup()
    host.gw.request = stub(async () => {
      session.ref = { live: liveSessionId('different'), stored: null }
      return { url: 'http://127.0.0.1:8789/boards', title: 'Boards' }
    })
    await glideCommand(host, 'taste')
    expect(openTastePane).not.toHaveBeenCalled()
  })

  it('reports a failed pane open, never a success receipt', async () => {
    const { host, publish, transcript } = setup()
    vi.mocked(openTastePane).mockRejectedValueOnce(new Error('not in a Tern pane'))
    await glideCommand(host, 'taste')
    expect(publish).not.toHaveBeenCalled()
    expect(JSON.stringify(transcript.entries)).toContain('not in a Tern pane')
  })
})
