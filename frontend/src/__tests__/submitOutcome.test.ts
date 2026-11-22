// #70: a failed prompt.submit says what it proves and returns the text to its own session only.
// The gateway's error frame is a refusal; a local timeout leaves admission unknown, so it is never
// reported as "Not sent" and never resent. A failure that lands after a switch waits for its
// session (A→B→A); a turn start from any viewer is not taken as this submission's admission.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JsonRpcGatewayError } from '@hermes/shared/json-rpc-channel'
import { describe, expect, it, vi } from 'vitest'

import { type LiveSessionId, liveSessionId, storedSessionId } from '../core/ids.js'
import { sessionTicket } from '../session/state.js'
import type { Prompt } from '../turn/prompt.js'
import { PromptQueue, type QueueHost } from '../turn/queue.js'
import { submitFailureNotice } from '../turn/submitOutcome.js'

import { FakeGateway, fakeTern, given, key, type Reply, settle } from './fakes.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))

process.env['HERMES_HOME'] = mkdtempSync(join(tmpdir(), 'glide-submit-outcome-'))

const { App } = await import('../app/chat.js')

const UNKNOWN = /^Unknown whether Hermes received your message \(request timed out after 30s: prompt\.submit\)\. It was not resent/
const timeout = () => new Error('request timed out after 30s: prompt.submit')
const refusal = () => new JsonRpcGatewayError('session_busy', { code: 4009 })

function held() {
  const { promise, reject, resolve } = Promise.withResolvers<unknown>()
  const reply: Reply = () => promise

  return { reject, reply, resolve }
}

/** The app on a fake Tern and gateway, session s1 (stored a) shown; session.resume adopts s1 or s2. */
function setup(replies: Record<string, Reply> = {}) {
  const gw = new FakeGateway({
    replies: {
      'session.resume': p => {
        const a = p['session_id'] === 'stored-a'

        return { info: { stored_session_id: a ? 'stored-a' : 'stored-b' }, messages: [], session_id: a ? 's1' : 's2', subscription_id: a ? 'sub-a' : 'sub-b' }
      },
      ...replies
    }
  })
  const tern = fakeTern({ cols: 100, draws: true })
  const app = new App(tern.session, gw.client, '1.0.0')
  void app.run()
  given.session(app, 's1')
  app.session.ref = { live: liveSessionId('s1'), stored: storedSessionId('stored-a') }

  const press = async (k: string | ReturnType<typeof key>) => {
    await vi.waitFor(() => expect(tern.reading).toBe(true))
    tern.press(k)
    await settle(gw)
  }
  const enter = async (text: string) => {
    for (const ch of text) await press(key(ch, { text: ch }))
    await press('enter')
  }
  const emit = async (type: string, payload: Record<string, unknown> = {}, session = 's1') => {
    gw.event({ payload, session_id: session, type })
    await settle(gw)
  }
  const notices = () => app.transcript.entries.flatMap(e => (e.kind === 'notice' ? [e.text] : []))

  return { app, emit, enter, gw, notices }
}

describe('what a failed prompt.submit proves', () => {
  it('classifies only a gateway error frame or an unwritten request as a refusal', () => {
    const tone = (error: unknown) => submitFailureNotice(error, 'sent').tone
    expect(tone(refusal())).toBe('error')
    expect(tone(new Error('gateway not connected: prompt.submit'))).toBe('error')
    expect(tone(timeout())).toBe('warning')
    expect(tone(new Error('websocket closed'))).toBe('warning')
    expect(tone('boom')).toBe('warning')
    expect(submitFailureNotice(refusal(), 'sent')).toEqual({ text: 'Not sent: session_busy. Your message is back in the composer.', tone: 'error' })
    expect(submitFailureNotice(timeout(), 'queued').tone).toBe('warning')
    expect(submitFailureNotice(timeout(), 'queued').text).not.toMatch(/Not (sent|queued)/)
  })
})

describe('same-session submission outcomes', () => {
  it('a confirmed refusal restores the text with "Not sent" and is never resent', async () => {
    const submit = held()
    const { app, enter, gw, notices } = setup({ 'prompt.submit': submit.reply })
    await enter('hello')
    submit.reject(refusal())
    await vi.waitFor(() => expect(notices().at(-1)).toBe('Not sent: session_busy. Your message is back in the composer.'))

    expect(app.stores.composer.text).toBe('hello')
    expect(app.stores.activity.busy).toBeNull()
    expect(gw.sent('prompt.submit')).toHaveLength(1)
  })

  it('a timeout reports an unknown outcome, keeps the text in this session and does not resend', async () => {
    const submit = held()
    const { app, enter, gw, notices } = setup({ 'prompt.submit': submit.reply })
    await enter('hello')
    submit.reject(timeout())
    await vi.waitFor(() => expect(notices().at(-1)).toMatch(UNKNOWN))

    expect(notices().join('\n')).not.toContain('Not sent')
    expect(app.stores.composer.text).toBe('hello')
    expect(gw.sent('prompt.submit')).toHaveLength(1)
  })

  it("another viewer's turn start is not taken as admission: the reply still decides, and the turn's row stays", async () => {
    const first = held()
    const { app, emit, enter, notices } = setup({ 'prompt.submit': first.reply })
    await enter('mine')
    await emit('message.start')
    const row = app.stores.activity.busy
    first.reject(refusal())
    await vi.waitFor(() => expect(notices().at(-1)).toBe('Not sent: session_busy. Your message is back in the composer.'))
    expect(app.stores.activity.busy).toBe(row)
    expect(app.stores.composer.text).toBe('mine')

    const second = held()
    const t = setup({ 'prompt.submit': second.reply })
    await t.enter('mine')
    await t.emit('message.start')
    second.reject(timeout())
    await vi.waitFor(() => expect(t.notices().at(-1)).toMatch(UNKNOWN))
    expect(t.app.stores.composer.text).toBe('mine')
  })

  it('out of order: a late refusal of the first prompt leaves a later queued admission where it is', async () => {
    const first = held()
    const { app, enter, gw, notices } = setup({
      'prompt.submit': p => (p['queued'] ? { admission_id: 'q2', status: 'queued' } : first.reply(p))
    })
    await enter('one')
    await enter('two')
    expect(gw.sent('prompt.submit')).toMatchObject([{ text: 'one' }, { queued: true, text: 'two' }])

    first.reject(refusal())
    await vi.waitFor(() => expect(notices().at(-1)).toBe('Not sent: session_busy. Your message is back in the composer.'))
    expect(app.stores.composer.text).toBe('one')
    expect(app.stores.queue.rows().map(r => r.text)).toEqual(['two'])
    expect(gw.sent('prompt.submit')).toHaveLength(2)
  })
})

describe('a failure that lands after the view left its session', () => {
  it.each([
    ['timeout', timeout, UNKNOWN],
    ['refusal', refusal, /^Not sent: session_busy\./]
  ] as const)('A→B→A %s: nothing reaches B, and the text returns to A only', async (_name, error, said) => {
    const submit = held()
    const { app, emit, enter, gw, notices } = setup({ 'prompt.submit': submit.reply })
    await enter('for A')
    // A's turn runs and ends, so the view may switch while the reply is still outstanding.
    await emit('message.start')
    await emit('message.complete', { text: 'done' })
    expect(app.stores.activity.busy).toBeNull()

    await app.resume(storedSessionId('stored-b'))
    expect(app.session.ref.live).toBe('s2')
    submit.reject(error())
    await settle(gw)

    expect(app.stores.composer.text).toBe('')
    expect(notices().some(n => said.test(n))).toBe(false)

    await app.resume(storedSessionId('stored-a'))
    expect(app.session.ref.live).toBe('s1')
    await vi.waitFor(() => expect(app.stores.composer.text).toBe('for A'))
    expect(notices().filter(n => said.test(n))).toHaveLength(1)
    expect(gw.sent('prompt.submit')).toHaveLength(1)
  })
})

describe("queued admissions (the busy path's prompt.submit)", () => {
  const typed = (text: string): Prompt => ({ images: [], kind: 'typed', pasted: [], text })

  function queueSetup(reply: Reply) {
    const gw = new FakeGateway({ replies: { 'prompt.submit': reply } })
    const log: string[] = []
    const state: { sid: LiveSessionId | null } = { sid: liveSessionId('s1') }
    const host: QueueHost = {
      allowImages: () => true,
      busy: () => true,
      canDrain: () => false,
      changed: () => undefined,
      expanded: (_sid, prompt) => Promise.resolve(prompt),
      gw: gw.client,
      restore: prompt => log.push(`restore ${prompt.text}`),
      send: prompt => log.push(`send ${prompt.text}`),
      ticket: () => sessionTicket(() => state.sid, new AbortController().signal),
      transcript: { notice: (text, tone) => log.push(`${tone ?? 'info'}: ${text}`), steer: text => log.push(`steer ${text}`) }
    }

    return { gw, log, queue: new PromptQueue(host), state }
  }

  it('a timed-out admission is unknown, not "Not queued", and is not resubmitted', async () => {
    const t = queueSetup(() => Promise.reject(timeout()))
    await t.queue.admit(liveSessionId('s1'), typed('later'))

    expect(t.log).toHaveLength(2)
    expect(t.log[0]).toMatch(/^warning: Unknown whether Hermes received your message/)
    expect(t.log[1]).toBe('restore later')
    expect(t.gw.sent('prompt.submit')).toHaveLength(1)
  })

  it('an admission refused after a switch waits for A, and is never restored into B', async () => {
    const submit = held()
    const t = queueSetup(submit.reply)
    const admitting = t.queue.admit(liveSessionId('s1'), typed('for A'))
    await settle(t.gw)
    t.state.sid = liveSessionId('s2')
    submit.reject(refusal())
    await admitting

    expect(t.log).toEqual([])
    t.queue.drain()
    expect(t.log).toEqual([])

    t.state.sid = liveSessionId('s1')
    t.queue.drain()
    expect(t.log).toEqual(['error: Not queued: session_busy. Your message is back in the composer.', 'restore for A'])
    t.queue.drain()
    expect(t.log).toHaveLength(2)
  })
})
