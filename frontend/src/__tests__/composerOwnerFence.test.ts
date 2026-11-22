// Native composer events (edit, undo, send) carry a surface, a node id and text, but no session.
// These regressions drive the pinned real @stencil-hq/tern Session/Surface over the TSP wire.
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { type EditEvent, type SendEvent, Session, type Surface } from '@stencil-hq/tern'
import { describe, expect, it, vi } from 'vitest'

import { App } from '../app/chat.js'
import { readLaunchEnv } from '../config/env.js'
import { INPUT_ID } from '../surface/host.js'

import { FakeGateway, given } from './fakes.js'
import { Peer } from './surfacePeer.js'

vi.mock('../../assets/logo.png', () => ({ default: new Uint8Array([137, 80, 78, 71]) }))

async function painted() {
  for (let i = 0; i < 8; i++) await new Promise<void>(resolve => setImmediate(resolve))
}

interface Harness {
  readonly app: App
  readonly gw: FakeGateway
  readonly tern: Session
  readonly peer: Peer
  surface(): Surface
  /** Tern sends `body` over the wire (an event, or an ack). */
  event(body: object): Promise<void>
  /** Tern applied every frame sent so far. */
  applied(): Promise<void>
  /** Shows session `live` and paints it; Tern has not acked that paint yet. */
  show(live: string): Promise<void>
  submits(): unknown[]
}

async function withApp(check: (h: Harness) => Promise<void>, credits = 64) {
  const home = mkdtempSync(join(tmpdir(), 'hermes-composer-owner-'))
  const previous = process.env['HERMES_HOME']
  process.env['HERMES_HOME'] = home
  const input = new EventEmitter()
  const peer = new Peer()
  const tern = new Session(input, { write: bytes => peer.write(bytes) }, { exitHooks: false, record: '' })
  const hello = tern.handshake()
  input.emit('data', '\x1b_tsp;r;' + JSON.stringify({
    ...tern.caps, r: 'hello', v: 1, term: 'strict-peer', ver: '0', features: ['settle'], credits, apc: 1048576
  }) + '\x1b\\')
  let app: App | undefined
  let running: Promise<number> | undefined
  try {
    expect(await hello).toBe(true)
    const gw = new FakeGateway({ replies: {
      'setup.status': () => ({ provider_configured: true }),
      'session.create': () => ({ session_id: 's1', subscription_id: 'sub1' }),
      'prompt.submit': () => ({ ok: true })
    } })
    app = new App(tern, gw.client, 'test', { launch: readLaunchEnv({ HOME: home, HERMES_HOME: home }, home) })
    running = app.run()
    gw.event({ type: 'gateway.ready', payload: {} })
    await painted()
    const own = app
    const send = async (body: object) => {
      input.emit('data', '\x1b_tsp;e;' + JSON.stringify(body) + '\x1b\\')
      await painted()
    }
    const surface = () => {
      const s = tern.surfaces[0]
      if (!s) throw new Error('expected one open SDK surface')
      return s
    }
    await check({
      app: own, gw, tern, peer, surface,
      event: send,
      applied: async () => {
        for (let i = 0; i < 4; i++) await send({ ev: 'ack', sf: surface().id, s: surface().seq })
      },
      show: async live => {
        given.session(own, live)
        own.changed()
        await painted()
      },
      submits: () => gw.sent('prompt.submit').map(p => ({ session_id: p['session_id'], text: p['text'] }))
    })
  } finally {
    app?.quit()
    if (running) await running
    else await tern.close()
    if (previous === undefined) delete process.env['HERMES_HOME']
    else process.env['HERMES_HOME'] = previous
    rmSync(home, { recursive: true, force: true })
  }
}

const sendEv = (sf: string, text: string): SendEvent => ({ ev: 'send', sf, id: INPUT_ID, text, raw: {} })
const typed = (sf: string, text: string, len: number): EditEvent =>
  ({ ev: 'edit', sf, id: INPUT_ID, from: len, to: len, text, cursor: len + text.length, len, raw: {} })

describe('native composer owner fence across session changes', () => {
  it('never routes an old send or edit to B after B paints, until Tern acks that paint', async () => {
    await withApp(async h => {
      await h.applied()
      const sf = h.surface().id
      await h.event(typed(sf, 'draft', 0))
      expect(h.app.stores.composer.text).toBe('draft')
      await h.show('s2')
      // Selected against A's editor (same node id), dispatched after B's render: B must not take it.
      await h.event(sendEv(sf, 'draft'))
      await h.event(typed(sf, '!', 5))
      await h.event({ ev: 'undo', sf, id: INPUT_ID })
      expect(h.submits()).toEqual([])
      expect(h.app.stores.composer.text).toBe('draft')
      expect(h.app.stores.composer.cursor).toBe(5)
      await h.applied()
      await h.event(typed(sf, ' for B', 5))
      await h.event(sendEv(sf, 'draft for B'))
      await vi.waitFor(() => expect(h.submits()).toEqual([{ session_id: 's2', text: 'draft for B' }]))
    })
  })

  it('rejects a composer handler selected before the switch when it runs after it', async () => {
    await withApp(async h => {
      await h.applied()
      const surface = h.surface()
      await h.event(typed(surface.id, 'for A', 0))
      const selected = surface.dispatch(sendEv(surface.id, 'for A'))
      const edit = surface.dispatch(typed(surface.id, '?', 5))
      expect(selected).toBeTypeOf('function')
      expect(edit).toBeTypeOf('function')
      given.session(h.app, 's2')
      await selected?.()
      await edit?.()
      await painted()
      expect(h.submits()).toEqual([])
      expect(h.app.stores.composer.text).toBe('for A')
    })
  })

  it('treats A→B→A as two owner changes and keeps the draft and focus for the returning owner', async () => {
    await withApp(async h => {
      await h.applied()
      const surface = h.surface()
      await h.event(typed(surface.id, 'keep', 0))
      const fromFirstA = surface.dispatch(sendEv(surface.id, 'keep'))
      await h.show('s2')
      await h.applied()
      await h.show('s1')
      await fromFirstA?.()
      await h.event(sendEv(surface.id, 'keep'))
      expect(h.submits()).toEqual([])
      expect(h.app.stores.composer.text).toBe('keep')
      await h.applied()
      const focus = h.peer.frames.flatMap(f => f.ops).filter(op => Array.isArray(op) && op[0] === 'focus').at(-1)
      expect(focus).toEqual(['focus', INPUT_ID])
      await h.event(sendEv(surface.id, 'keep'))
      await vi.waitFor(() => expect(h.submits()).toEqual([{ session_id: 's1', text: 'keep' }]))
    })
  })

  it('waits for a credit-blocked paint of B, then for its ack', async () => {
    await withApp(async h => {
      await h.applied()
      const surface = h.surface()
      await h.event(typed(surface.id, 'x', 0))
      expect(surface.blocked).toBe(true) // The edit's frame holds the one credit.
      const before = surface.seq
      await h.show('s2')
      expect(surface.seq).toBe(before) // B is not painted yet.
      await h.event(sendEv(surface.id, 'x'))
      expect(h.submits()).toEqual([])
      await h.event({ ev: 'ack', sf: surface.id, s: before }) // Credit returns; B's frame goes out.
      expect(surface.seq).toBeGreaterThan(before)
      await h.event(sendEv(surface.id, 'x'))
      expect(h.submits()).toEqual([])
      await h.applied()
      await h.event(sendEv(surface.id, 'x'))
      await vi.waitFor(() => expect(h.submits()).toEqual([{ session_id: 's2', text: 'x' }]))
    }, 1)
  })

  it('accepts input on a recovered document once its own paint landed, never on the old one', async () => {
    await withApp(async h => {
      await h.applied()
      const old = h.surface()
      await h.show('s2')
      h.peer.remove(old.id, old.id)
      await h.event({ ev: 'gone', sf: old.id, ids: [old.id] })
      const current = h.surface()
      expect(current.id).not.toBe(old.id)
      await h.applied()
      await h.event(sendEv(old.id, 'old document'))
      await h.event(typed(current.id, 'new', 0))
      await h.event(sendEv(current.id, 'new'))
      await vi.waitFor(() => expect(h.submits()).toEqual([{ session_id: 's2', text: 'new' }]))
    })
  })

  it('leaves ordinary same-owner native input immediate, without waiting for an ack', async () => {
    await withApp(async h => {
      await h.applied()
      const sf = h.surface().id
      await h.event(typed(sf, 'one', 0))
      await h.event(typed(sf, ' two', 3))
      await h.event(sendEv(sf, 'one two'))
      await vi.waitFor(() => expect(h.submits()).toEqual([{ session_id: 's1', text: 'one two' }]))
    })
  })
})
