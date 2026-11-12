import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { liveSessionId } from '../core/ids.js'
import { EuiHostCards, MAX_HOST_CARDS, type EuiKitContext } from '../eui/host.js'
import type { EuiMounted, EuiSandbox } from '../eui/sandbox.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { must, ofKind } from './fakes.js'

const hosts: EuiHostCards[] = []
afterEach(() => hosts.splice(0).forEach(host => host.close()))
const doc = { kind: 'fleet-hosts', app: 'k3s', data: { hosts: [], notes: ['Missing synthetic source'] } }
function setup(pending?: Promise<EuiSandbox>) {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('fixture-session'), stored: null }
  const transcript = new Transcript()
  const gate = { active: true }
  const dispose = vi.fn()
  let intent: ((detail: unknown) => void) | undefined
  const mounted: EuiMounted = { app: 'k3s', label: 'Hosts', snapshot: () => ({ t: 'text', text: 'Kit content' }),
    click: () => { intent?.({ action: 'nudge', entities: { host: 'sample', agent: 'sample-agent' } }); return true }, dispose }
  const mount = vi.fn<EuiSandbox['mount']>((_kind, _app, _changed, _doc, onIntent) => { intent = onIntent; return mounted })
  const sb: EuiSandbox = { kinds: ['fleet-hosts'], apps: () => [], mount }
  const host = new EuiHostCards(['fleet-hosts'], vi.fn(), euiHostPort({ session, transcript }, () => gate.active), () => pending ?? Promise.resolve(sb))
  hosts.push(host)
  const view = () => must(host.view(ofKind(transcript.entries.at(-1), 'panel')))
  return { host, session, transcript, gate, mount, dispose, view, sb, emit: (detail: unknown) => intent?.(detail) }
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('trusted kit publications', () => {
  it('passes an immutable full doc, draws notes and requires a native click for intents', async () => {
    const f = setup()
    const run = vi.fn()
    f.host.publishKit(doc, run)
    await flush()
    expect(f.mount.mock.calls[0]?.[3]).toEqual({ ...doc, data: { hosts: [] } })
    expect(Object.isFrozen(f.mount.mock.calls[0]?.[3])).toBe(true)
    expect(JSON.stringify(f.view().node)).toContain('Kit content')
    expect(JSON.stringify(f.view().node)).toContain('Missing synthetic source')
    f.emit({ action: 'nudge' })
    expect(run).not.toHaveBeenCalled()
    must(f.view().activate)(7)
    expect(run).toHaveBeenCalledTimes(1)
    expect(f.host.view({ ...ofKind(f.transcript.entries.at(-1), 'panel') })).toBeUndefined()
  })

  it('retires old taps and aborts operations on replacement, removal, owner loss and close', async () => {
    const f = setup()
    const run = vi.fn((_detail: unknown, _context: EuiKitContext) => undefined)
    const handle = f.host.publishKit(doc, run)
    await flush()
    const old = f.view()
    must(old.activate)(7)
    const context = must(run.mock.calls[0]?.[1])
    handle.update(doc, run)
    expect(context.signal.aborted).toBe(true)
    must(old.activate)(7)
    expect(run).toHaveBeenCalledTimes(1)
    await flush()
    f.gate.active = false
    must(f.view().activate)(7)
    expect(run).toHaveBeenCalledTimes(1)
    f.gate.active = true
    const previous = f.view()
    f.session.ref = { live: liveSessionId('fixture-session'), stored: null }
    must(previous.activate)(7)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it.each(['revoke', 'transcript', 'owner', 'close'])('disposes and aborts on %s', async reason => {
    const f = setup()
    const run = vi.fn((_detail: unknown, _context: EuiKitContext) => undefined)
    const handle = f.host.publishKit(doc, run)
    await flush()
    const old = f.view()
    must(old.activate)(7)
    const context = must(run.mock.calls[0]?.[1])
    if (reason === 'revoke') handle.revoke()
    if (reason === 'transcript') { f.transcript.load([]); f.host.sync() }
    if (reason === 'owner') f.session.ref = { live: liveSessionId('other-session'), stored: null }
    if (reason === 'close') f.host.close()
    must(old.activate)(7)
    expect(context.signal.aborted).toBe(true)
    expect(context.isCurrent()).toBe(false)
    expect(f.dispose).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(f.host.size).toBe(0)
  })

  it('remounts on theme changes and rejects saved native taps and contexts', async () => {
    const f = setup()
    const run = vi.fn((_detail: unknown, _context: EuiKitContext) => undefined)
    f.host.publishKit(doc, run)
    await flush()
    const old = f.view()
    must(old.activate)(7)
    const context = must(run.mock.calls[0]?.[1])
    f.host.remountKit()
    await flush()
    expect(f.dispose).toHaveBeenCalledTimes(1)
    expect(f.mount).toHaveBeenCalledTimes(2)
    expect(f.view().identity).not.toBe(old.identity)
    expect(context.isCurrent()).toBe(false)
    must(old.activate)(7)
    expect(run).toHaveBeenCalledTimes(1)
    must(f.view().activate)(7)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('coalesces refresh taps and shows failure without losing the snapshot', async () => {
    const f = setup()
    const pending = Promise.withResolvers<void>()
    const refresh = vi.fn(() => pending.promise)
    f.host.publishKit(doc, vi.fn(), refresh)
    await flush()
    const view = f.view()
    must(view.activate)(-1)
    must(view.activate)(-1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(f.view().node)).toContain('Refreshing')
    pending.reject(new Error('Synthetic source failed'))
    await flush()
    expect(JSON.stringify(f.view().node)).toContain('Synthetic source failed')
    expect(JSON.stringify(f.view().node)).toContain('Kit content')
    expect(JSON.stringify(f.view().node)).not.toContain('Refreshing')
  })

  it('shows a missing kit kind as an unavailable state with notes and refresh', async () => {
    const f = setup()
    f.mount.mockImplementation(() => { throw new Error('ephemeral-ui has no kind fleet-hosts') })
    f.host.publishKit(doc, vi.fn(), vi.fn())
    await flush()
    const view = JSON.stringify(f.view().node)
    expect(view).toContain('Fleet card unavailable')
    expect(view).toContain('ephemeral-ui has no kind fleet-hosts')
    expect(view).toContain('Missing synthetic source')
    expect(view).toContain('Refresh')
  })

  it('does not mount after a late sandbox load or revive an evicted slot', async () => {
    const pending = Promise.withResolvers<EuiSandbox>()
    const f = setup(pending.promise)
    const first = f.host.publishKit(doc, vi.fn())
    for (let i = 0; i < MAX_HOST_CARDS; i++) f.host.publishKit(doc, vi.fn())
    expect(() => first.update(doc, vi.fn())).toThrow('no longer current')
    f.host.close()
    pending.resolve(f.sb)
    await flush()
    expect(f.mount).not.toHaveBeenCalled()
  })
})
