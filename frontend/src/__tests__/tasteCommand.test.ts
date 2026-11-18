import { execFile } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { glideCommand, type GlideHost } from '../commands/glide.js'
import { liveSessionId } from '../core/ids.js'
import type { EuiOperation } from '../eui/host.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { openTastePane, tasteBoard, tasteCard } from '../../../glide/frontend/taste.js'
import { must, stub } from './fakes.js'

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_file: string, _args: string[], _options: unknown,
    callback: (error: null, result: { stdout: string }) => void) => callback(null, { stdout: '{"ok":{"block":42}}' }))
}))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

function setupTaste() {
  vi.stubEnv('TERN_PANE', '17')
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('taste-session'), stored: null }
  const transcript = new Transcript()
  const request = vi.fn(async (method: string) => {
    if (method === 'glide.taste') throw new Error('unknown method glide.taste')
    return { output: JSON.stringify({ url: 'http://127.0.0.1:8789/s/launch-ab12/', title: 'Launch ideas' }) }
  })
  const publish = vi.fn((_card: unknown, _operation?: EuiOperation) => undefined)
  const host: GlideHost = { gw: stub({ request }), session, transcript, eui: stub({ host: { publish } }) }
  return { host, request, publish, session, transcript }
}

describe('/glide taste', () => {
  it('uses the card seam fallback and opens the real board beside chat only on request', async () => {
    const { host, request } = setupTaste()
    expect(execFile).not.toHaveBeenCalled()
    await glideCommand(host, 'taste')
    expect(request.mock.calls).toEqual([
      ['glide.taste', { session_id: 'taste-session' }],
      ['command.dispatch', { name: 'glide', arg: 'json taste {}', session_id: 'taste-session' }]
    ])
    expect(execFile).toHaveBeenCalledWith('tern', ['browser', JSON.stringify({
      op: 'open', owner: 17, url: 'http://127.0.0.1:8789/s/launch-ab12/', how: 'beside'
    }), '--timeout', '15'], { timeout: 20_000, shell: false }, expect.any(Function))
    expect(request.mock.calls.some((c: readonly unknown[]) => c[0] === 'glide.enable')).toBe(false)
  })

  it('emits the taste card for the confirmed block; Open board focuses exactly that block', async () => {
    const { host, publish } = setupTaste()
    await glideCommand(host, 'taste')
    expect(publish).toHaveBeenCalledOnce()
    const [card, open] = must(publish.mock.calls[0])
    expect(card).toEqual(tasteCard(tasteBoard({ url: 'http://127.0.0.1:8789/s/launch-ab12/', title: 'Launch ideas' }), 42))
    vi.mocked(execFile).mockClear()
    await must(open)(stub({ signal: new AbortController().signal }))
    expect(execFile).toHaveBeenCalledWith('tern', ['focus', '42', '--json'], { timeout: 20_000, shell: false }, expect.any(Function))
  })

  it('does not open a late reply after a session switch', async () => {
    const { host, session } = setupTaste()
    host.gw.request = stub(async () => {
      session.ref = { live: liveSessionId('different'), stored: null }
      return { url: 'http://127.0.0.1:8789/boards', title: 'Boards' }
    })
    await glideCommand(host, 'taste')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('reports a failed pane open, never a success receipt', async () => {
    const { host, publish, transcript } = setupTaste()
    vi.stubEnv('TERN_PANE', '')
    await glideCommand(host, 'taste')
    expect(publish).not.toHaveBeenCalled()
    expect(JSON.stringify(transcript.entries)).toContain('local Tern pane')
  })
})

const board = { url: 'http://127.0.0.1:8789/s/sketch-ab12/', title: 'Sketch' }

describe('Taste native pane adapter', () => {
  it('opens beside the exact current owner using argv, without a shell', async () => {
    vi.stubEnv('TERN_PANE', '17')
    expect(await openTastePane(tasteBoard(board))).toBe(42)
    expect(execFile).toHaveBeenCalledWith('tern', ['browser', JSON.stringify({
      op: 'open', owner: 17, url: board.url, how: 'beside'
    }), '--timeout', '15'], { timeout: 20_000, shell: false }, expect.any(Function))
  })

  it('cannot open on the desktop without a current pane', async () => {
    vi.stubEnv('TERN_PANE', '')
    await expect(openTastePane(board)).rejects.toThrow('local Tern pane')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('rejects an error response instead of inventing a pane receipt', async () => {
    vi.stubEnv('TERN_PANE', '17')
    vi.mocked(execFile).mockImplementationOnce(stub(stubReply))
    await expect(openTastePane(board)).rejects.toThrow('did not confirm')
  })

  it.each(['https://example.com/boards', 'file:///tmp/board', 'http://127.0.0.1:8789/private',
    'http://user:pass@127.0.0.1:8789/boards', 'http://localhost.evil/boards'])(
    'rejects unsafe board URL %s', (url: string) => {
      expect(() => tasteBoard({ ...board, url })).toThrow()
    })
})

function stubReply(...args: unknown[]) {
  const callback = args.at(-1)
  if (typeof callback === 'function') callback(null, { stdout: '{"error":{"message":"unavailable"}}' })
  return undefined
}

