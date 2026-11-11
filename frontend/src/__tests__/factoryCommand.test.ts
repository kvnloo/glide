import { describe, expect, it, vi } from 'vitest'

import { factoryCommand, type FactoryHost } from '../commands/factory.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { stub } from './fakes.js'

function setup(aside = true) {
  const session = new SessionState(vi.fn())
  session.ref = { live: liveSessionId('factory-session'), stored: null }
  const request = vi.fn(async () => ({ output: 'Factory text output' }))
  const showText = vi.fn()
  const transcript = new Transcript()
  const toggleFactory = vi.fn(() => aside)
  const host: FactoryHost = stub<FactoryHost>({ gw: { request }, session, transcript, operations: { showText }, toggleFactory })
  return { host, session, request, showText, transcript, toggleFactory }
}

describe('/factory', () => {
  it('is listed as an optional pane', () => {
    expect(localCommand('factory')?.help).toContain('Content factory')
    expect(localCommand('factory')?.help).toContain('pane')
  })

  it('toggles the optional pane without publishing transcript cards or needing EUI', async () => {
    const { host, request, transcript, toggleFactory } = setup()
    await factoryCommand(host, '')
    expect(toggleFactory).toHaveBeenCalledOnce()
    expect(request).not.toHaveBeenCalled()
    expect(transcript.entries).toEqual([])
  })

  it.each(['', 'text', 'status', 'runs', 'scenes snow standoff', 'suggest', 'render shot-a contract-1'])('keeps text output for %s', async (arg: string) => {
    const { host, request, showText } = setup(false)
    await factoryCommand(host, arg)
    expect(request).toHaveBeenCalledWith('command.dispatch', {
      name: 'factory', arg: arg === 'text' || arg === 'status' ? '' : arg, session_id: 'factory-session'
    })
    expect(showText).toHaveBeenCalledWith('Content factory', 'Factory text output')
  })

  it('does not treat a render command or chat assent as an approval', async () => {
    const { host, request, transcript } = setup()
    await factoryCommand(host, 'render shot-a')
    expect(request).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledWith('command.dispatch', expect.objectContaining({ arg: 'render shot-a' }))
    expect(transcript.entries).toEqual([])
  })

  it('drops a response across a session change', async () => {
    const { host, session, request, showText } = setup(false)
    const pending = Promise.withResolvers<{ output: string }>()
    request.mockImplementation(() => pending.promise)
    const command = factoryCommand(host, 'status')
    session.ref = { live: liveSessionId('next'), stored: null }
    pending.resolve({ output: 'old session' })
    await command
    expect(showText).not.toHaveBeenCalled()
  })

  it('reports malformed dispatch envelopes without publishing cards', async () => {
    const { host, request, transcript } = setup(false)
    request.mockResolvedValue(stub<{ output: string }>({ output: 10 }))
    await factoryCommand(host, 'runs')
    expect(JSON.stringify(transcript.entries)).toContain('unexpected /factory dispatch answer')
  })
})
