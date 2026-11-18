import { execFile } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { glideCommand, type GlideHost } from '../commands/glide.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { must, ofKind, stub } from './fakes.js'

vi.mock('node:child_process', () => ({ execFile: vi.fn() }))
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })

const snapshot = { mode: 'web', url: 'http://127.0.0.1:7878/', project: null }
function setup() {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('studio-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  const request = vi.fn()
  const host: GlideHost = { session, transcript, eui, gw: stub({ request }) }
  const panels = () => transcript.entries.filter(e => e.kind === 'panel').map(e => ofKind(e, 'panel'))
  const view = () => eui.hostView(must(panels()[0]))
  vi.mocked(execFile).mockImplementation(stub((_file: string, args: string[], _options: unknown, callback: (error: null, value: { stdout: string }) => void) => {
    callback(null, { stdout: JSON.stringify(args.at(-2) === 'snapshot' ? snapshot : { opened: true }) })
  }))
  return { host, session, transcript, request, panels, view }
}

describe('/glide studio', () => {
  it('builds one native card on request, then updates it after the web fallback opens', async () => {
    const f = setup()
    expect(execFile).not.toHaveBeenCalled()
    const pending = glideCommand(f.host, 'studio')
    expect(JSON.stringify(f.view()?.ui)).toContain('Opening studio')
    await pending
    expect(f.panels()).toHaveLength(1)
    expect(f.view()?.node).toBeNull()
    expect(JSON.stringify(f.view()?.ui)).toContain('Web editor open')
    expect(f.request).not.toHaveBeenCalled()
    // The action must not be Node's reserved "inspect" subcommand, even after --.
    expect(vi.mocked(execFile).mock.calls[0]?.[1]?.slice(-3)).toEqual(['--', 'snapshot', ''])
    expect(vi.mocked(execFile).mock.calls.map(call => call[1]?.slice(-2))).toEqual([['snapshot', ''], ['web', '']])
  })

  it('opens the native add-on for a selected project when discovery confirms it', async () => {
    const f = setup()
    vi.mocked(execFile).mockImplementationOnce(stub((_file: string, _args: string[], _options: unknown, callback: (error: null, value: { stdout: string }) => void) => {
      callback(null, { stdout: JSON.stringify({ ...snapshot, mode: 'native' }) })
    }))
    await glideCommand(f.host, 'studio atlas')
    expect(vi.mocked(execFile).mock.calls.map(call => call[1]?.slice(-2))).toEqual([['snapshot', 'atlas'], ['native', 'atlas']])
    expect(JSON.stringify(f.view()?.ui)).toContain('Native studio open')
  })

  it('does not open a late discovery result in a replacement session', async () => {
    const f = setup()
    vi.mocked(execFile).mockImplementationOnce(stub((_file: string, _args: string[], _options: unknown, callback: (error: null, value: { stdout: string }) => void) => {
      f.session.ref = { live: liveSessionId('other-session'), stored: null }
      callback(null, { stdout: JSON.stringify(snapshot) })
    }))
    await glideCommand(f.host, 'studio')
    expect(execFile).toHaveBeenCalledOnce()
    expect(f.view()).toBeUndefined()
  })

  it('keeps the safe URL but never claims success on a failed open', async () => {
    const f = setup()
    vi.mocked(execFile).mockImplementationOnce(stub((_file: string, _args: string[], _options: unknown, callback: (error: null, value: { stdout: string }) => void) => callback(null, { stdout: JSON.stringify(snapshot) })))
      .mockImplementationOnce(stub((_file: string, _args: string[], _options: unknown, callback: (error: Error & { stdout: string }) => void) => callback(Object.assign(new Error('private child details'), { stdout: JSON.stringify({ error: 'Local Tern pane unavailable' }) }))))
    await glideCommand(f.host, 'studio')
    const shown = JSON.stringify(f.view()?.ui)
    expect(shown).toContain(snapshot.url)
    expect(shown).toContain('Local Tern pane unavailable')
    expect(shown).not.toContain('Web editor open')
    expect(shown).not.toContain('private child details')
  })

  it.each(['studio ../escape', 'studio atlas extra', 'studio atlas;pwd'])('refuses invalid project arguments: %s', async arg => {
    const f = setup()
    await glideCommand(f.host, arg)
    expect(execFile).not.toHaveBeenCalled()
    expect(JSON.stringify(f.transcript.entries)).toContain('Usage: /glide studio')
  })
})
