// GL-103: a council started in Glide is serialized by the plugin and resumed in a fresh client.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

import { councilRunWire, demoRun, parseCouncilRun } from '../../../glide/frontend/council.js'
import { councilPassages, exchangeTiming } from '../../../glide/frontend/councilExchange.js'
import { type CouncilHost, councilCommand, openCouncilPopup } from '../../../glide/frontend/councilPopup.js'
import {
  CouncilMovedOn, CouncilSync, loadCouncilSession, parseCouncilSession, remaining,
  START, startCouncilSession
} from '../../../glide/frontend/councilSession.js'
import type { CouncilSpeech, SpeechAudio } from '../../../glide/frontend/councilSpeech.js'
import type { Overlay } from '../overlays/overlay.js'
import { rpcErrorCode } from '../core/errors.js'
import { record } from '../wire/json.js'
import type { Requester } from '../wire/rpc.js'
import { stub } from './fakes.js'

const GLIDE = resolve(__dirname, '../../../glide')
const must = <T>(v: T | undefined | null): T => { if (v === undefined || v === null) throw new Error(`expected a value in this step, got ${String(v)}`); return v }
const FIXTURE = must(record(readFileSync(join(GLIDE, 'tests/fixtures/council-session-v1.json'), 'utf8')))
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)) }

// ------------------------------------------------------------------ two stand-ins for the plugin's store

type Server = (verb: string, params: Record<string, unknown>) => unknown
const gatewayError = (message: string, code: number) => Object.assign(new Error(message), { code })

/** The plugin's own council_session.py, run per request against a disposable profile. */
function pythonServer(): Server | undefined {
  // The CI frontend job puts the Hermes venv (with pydantic) on PATH; without one the store tests skip.
  const python = ['python3', 'python'].find(bin => spawnSync(bin, ['-I', '-c', 'import pydantic, fcntl'], { stdio: 'ignore' }).status === 0)
  if (!python) return undefined
  const home = mkdtempSync(join(tmpdir(), 'glide-council-home-'))
  homes.push(home)
  const bridge = [
    'import importlib.util, json, sys',
    'from pathlib import Path',
    'spec = importlib.util.spec_from_file_location("council_session", sys.argv[1])',
    'cs = sys.modules["council_session"] = importlib.util.module_from_spec(spec); spec.loader.exec_module(cs)',
    'try: print(json.dumps({"ok": cs.call(Path(sys.argv[2]), sys.argv[3], json.loads(sys.stdin.read()))}))',
    'except (cs.Conflict, LookupError, ValueError) as e:',
    '    code, msg = cs.failure(e); print(json.dumps({"error": msg, "code": code}))'
  ].join('\n')
  return (verb, params) => {
    const out = must(record(execFileSync(python, ['-I', '-c', bridge, join(GLIDE, 'council_session.py'), home, verb], { input: JSON.stringify(params), encoding: 'utf8' })))
    if (typeof out['error'] === 'string') throw gatewayError(out['error'], typeof out['code'] === 'number' ? out['code'] : 0)
    return out['ok']
  }
}
const homes: string[] = []
afterAll(() => { for (const h of homes) rmSync(h, { recursive: true, force: true }) })

/** A gateway serving `glide.council.*` from `server`; `stock` answers only through `/glide json`. */
function gateway(server: Server, stock = false) {
  const calls: { method: string; params: Record<string, unknown> }[] = []
  const answer = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    calls.push({ method, params })
    await Promise.resolve()
    if (method.startsWith('glide.council.')) {
      if (stock) throw gatewayError(`unknown method: ${method}`, -32601)
      return server(method.slice('glide.council.'.length), params)
    }
    if (method === 'command.dispatch' && params['name'] === 'glide') {
      const [, verb = '', ...rest] = String(params['arg']).split(' ')
      try {
        return { output: JSON.stringify(server(verb.replace('council.', ''), { ...record(rest.join(' ')), session_id: params['session_id'] })) }
      } catch (e) {
        return { output: JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: rpcErrorCode(e) }) }
      }
    }
    throw new Error(`unexpected ${method}`)
  }
  // The stand-in answers untyped JSON, as the real gateway does.
  const request = stub<Requester['request']>(answer)
  return { request, calls }
}

// ------------------------------------------------------------------ one client: a pane with the council popup

function client(gw: ReturnType<typeof gateway>, live: string, stored: string) {
  let now = 0
  let tick: (() => void) | undefined
  let overlay: Overlay | undefined
  const spoken: { text: string; signal: AbortSignal; playing: (a: SpeechAudio) => void; finish: () => void }[] = []
  const speech: CouncilSpeech = { speak: (text, signal, playing) => new Promise<void>(finish => { spoken.push({ text, signal, playing, finish }) }) }
  const notice = vi.fn()
  const host: CouncilHost = {
    open: o => { overlay = o }, close: o => { o.onClose?.(); overlay = undefined }, changed: vi.fn(),
    transcript: { notice },
    eui: { host: { publish: () => { throw new Error('unexpected publication') } }, click: () => undefined, svg: () => 'svg', style: () => 'style' },
    gw, session: { ref: { live, stored } }
  }
  const clock = { now: () => now, every: (fn: () => void) => { tick = fn; return () => { tick = undefined } } }
  return {
    spoken, notice, host, clock,
    speech,
    json: () => JSON.stringify(must(overlay).node('layer.overlay-1')),
    key: (name: string) => must(overlay).onKey(stub({ name, ctrl: false, meta: false, shift: false, sequence: '' })),
    advance: (ms: number) => { now += ms; tick?.() },
    overlay: () => overlay
  }
}

const server = pythonServer()

// The store is the plugin's own council_session.py, so this is the Python and TypeScript halves of one wire.
describe.skipIf(!server)('council handoff through the plugin store', () => {
  it.skipIf(!server)('starts a council in Glide, serializes it, and resumes it at the same sentence in a fresh client', async () => {
    const srv = must(server)
    const demo = { run: demoRun(), live: false, from: 'synthetic seats and brief' }
    const timing = exchangeTiming(demo.run)
    // Client A: Glide on the desktop. /council starts a council session for the attached conversation.
    const gwA = gateway(srv)
    const a = client(gwA, 'glide-live-1', 'root-1')
    await councilCommand(a.host, '', async () => demo, a.clock, { speech: a.speech })
    const start = must(gwA.calls.find(c => c.method === 'glide.council.start'))
    expect(start.params).toMatchObject({ session_id: 'glide-live-1', stored_session_id: 'root-1', client: 'glide', live: false })
    // Read aloud, convene, and listen to the first sentence of the brief.
    a.key('r'); a.key('enter')
    a.advance(timing.typing + 1)
    const brief = remaining(councilPassages(demo.run), { passage: 'brief', sentence: 0 }, 'brief')
    expect(must(a.spoken[0]).text).toBe(must(brief[0]).text)
    must(a.spoken[0]).finish()
    await flush()
    // The second sentence starts; Kevin closes the pane and picks up the phone.
    expect(must(a.spoken[1]).text).toBe(must(brief[1]).text)
    a.key('escape'); a.key('escape')
    expect(a.overlay()).toBeUndefined()
    await flush()
    const id = String(must(gwA.calls.find(c => c.method === 'glide.council.position')).params['council_id'])

    // Serialized: the store's record is everything a fresh client needs.
    const stored = await loadCouncilSession({ gw: gateway(srv), sessionId: 'probe', storedSessionId: null }, id)
    expect(stored.state).toMatchObject({ council_id: id, stored_session_id: 'root-1', started_by: 'glide', updated_by: 'glide', live: false })
    expect(stored.state.position).toEqual({ elapsed_ms: timing.typing + 1, passage: 'brief', sentence: 1, read_aloud: true, muted: false })

    // Client B: a fresh client on another device resumes the conversation's newest council.
    const gwB = gateway(srv)
    const b = client(gwB, 'phone-live-7', 'root-1')
    await councilCommand(b.host, 'resume', async () => { throw new Error('a resume never reloads the endpoint') }, b.clock, { speech: b.speech })
    expect(gwB.calls.map(c => c.method).slice(0, 2)).toEqual(['glide.council.list', 'glide.council.load'])
    expect(b.notice).toHaveBeenCalledWith(`/council: continuing ${id}`, 'info')
    // It keeps listening from the sentence A was reading, then the rest of the brief, then the report.
    expect(b.spoken.map(x => x.text)).toEqual([must(brief[1]).text])
    expect(b.json()).toContain('"aria-pressed":"true"')
    expect(b.json()).toContain('"data-council-source":"demo"')
    for (let i = 1; i < brief.length; i++) { must(b.spoken[i - 1]).finish(); await flush() }
    expect(b.spoken.map(x => x.text)).toEqual(brief.slice(1).map(x => x.text))
    must(b.spoken.at(-1)).finish(); await flush()
    b.advance(timing.total)
    expect(must(b.spoken.at(-1)).text).toBe('Verdict.')
    await flush()
    const after = await loadCouncilSession({ gw: gateway(srv), sessionId: 'probe', storedSessionId: null }, id)
    expect(after.state).toMatchObject({ updated_by: 'glide', position: { passage: 'report:verdict', sentence: 0 } })
    expect(after.state.revision).toBeGreaterThan(stored.state.revision)
  })

  it.skipIf(!server)('resumes the reading mid-passage, and the device that was handed off stops writing', async () => {
    const srv = must(server)
    const run = demoRun()
    const wireA = { gw: gateway(srv), sessionId: 'glide-live-1', storedSessionId: 'root-2' }
    const started = await startCouncilSession(wireA, { run, live: false, from: 'synthetic seats and brief' })
    const movedOn = vi.fn()
    const syncA = new CouncilSync(wireA, started.state.council_id, started.state.revision, movedOn)
    const total = exchangeTiming(run).total
    await syncA.report({ elapsed_ms: total, passage: 'report:agreements', sentence: 2, read_aloud: true, muted: false })
    expect(syncA.revision).toBe(2)

    // A fresh client with its own speech engine opens the council where A left it.
    const wireB = { gw: gateway(srv), sessionId: 'phone-live-7', storedSessionId: 'root-2' }
    const b = client(wireB.gw, 'phone-live-7', 'root-2')
    const loaded = await loadCouncilSession(wireB, started.state.council_id)
    const positions: unknown[] = []
    const syncB = new CouncilSync(wireB, loaded.state.council_id, loaded.state.revision)
    openCouncilPopup(b.host, { run: loaded.run, live: loaded.state.live, from: loaded.state.from }, b.clock, {
      speech: b.speech, passages: loaded.state.passages, resume: loaded.state.position,
      onPosition: p => { positions.push(p); void syncB.report(p) }
    })
    const expected = remaining(loaded.state.passages, { passage: 'report:agreements', sentence: 2 })
    expect(must(b.spoken[0]).text).toBe(must(expected[0]).text)
    must(b.spoken[0]).playing({ duration: 500, level: () => .4 })
    expect(b.json()).toContain('data-council-caption')
    must(b.spoken[0]).finish()
    await flush()
    expect(must(b.spoken[1]).text).toBe(must(expected[1]).text)
    await flush()
    expect(positions).toContainEqual({ elapsed_ms: total, passage: expected[1]?.key, sentence: expected[1]?.sentence, read_aloud: true, muted: false })

    // A writes again from its old revision: refused, and A stops publishing.
    await syncA.report({ elapsed_ms: total, passage: 'report:dissent', sentence: 0, read_aloud: true, muted: false })
    expect(syncA.movedOn).toBe(true)
    expect(movedOn).toHaveBeenCalledWith(expect.stringMatching(/^the council moved on: revision \d+ is current$/))
    const latest = await loadCouncilSession(wireA, started.state.council_id)
    expect(latest.state.position.passage).toBe(expected[1]?.key)
    b.key('escape')
  })
})

describe('council session wire', () => {
  it('reads the shared fixture both apps follow, and derives the same passages from its run', () => {
    const s = parseCouncilSession(FIXTURE)
    if ('error' in s) throw new Error(s.error)
    expect(councilPassages(s.run)).toEqual(FIXTURE['passages'])
    expect(councilRunWire(s.run)).toEqual(FIXTURE['run'])
    expect(s.state.position).toEqual(START)
  })

  it('round-trips a parsed run through its wire form', () => {
    expect(parseCouncilRun(councilRunWire(demoRun()))).toEqual(demoRun())
  })

  it('refuses a session it could not resume', () => {
    const passages: unknown[] = Array.isArray(FIXTURE['passages']) ? FIXTURE['passages'] : []
    const bad: [Record<string, unknown>, RegExp][] = [
      [{ ...FIXTURE, extra: 1 }, /unknown field "extra"/],
      [{ ...FIXTURE, schema: 'glide.council-session/v0' }, /schema/],
      [{ ...FIXTURE, council_id: '../x' }, /council_id/],
      [{ ...FIXTURE, live: 'yes' }, /live/],
      [{ ...FIXTURE, run: { ...record(FIXTURE['run']), rounds: 0 } }, /run: /],
      [{ ...FIXTURE, passages: passages.slice(1) }, /first passage is the brief/],
      [{ ...FIXTURE, passages: [...passages, { key: 'seat:nobody', label: 'X', text: 'Y.', seat: 'nobody' }] }, /seat/],
      [{ ...FIXTURE, position: { ...START, passage: 'report:missing' } }, /position.passage/],
      [{ ...FIXTURE, position: { ...START, sentence: -1 } }, /position/]
    ]
    for (const [raw, why] of bad) expect(parseCouncilSession(raw)).toMatchObject({ error: expect.stringMatching(why) })
  })

  it('continues from a sentence, through one passage or to the end', () => {
    const passages = councilPassages(demoRun())
    const all = remaining(passages, { passage: null, sentence: 0 })
    expect(must(all[0]).text).toBe(demoRun().brief)
    expect(remaining(passages, { passage: 'brief', sentence: 0 }, 'brief').every(s => s.key === 'brief')).toBe(true)
    const mid = remaining(passages, { passage: 'report:verdict', sentence: 1 })
    expect(mid[0]).toEqual({ key: 'report:verdict', sentence: 1, text: 'Ship the plugin first' })
    expect(remaining(passages, { passage: 'report:receipts', sentence: 99 })).toEqual([])
  })

  it.skipIf(!server)('falls back to /glide json on a stock core, and maps a stale write to CouncilMovedOn', async () => {
    const gw = gateway(must(server), true)
    const wire = { gw, sessionId: 'live-1', storedSessionId: 'root-3' }
    const s = await startCouncilSession(wire, { run: demoRun(), live: false, from: 'demo' })
    expect(gw.calls.map(c => c.method)).toEqual(['glide.council.start', 'command.dispatch'])
    expect(String(must(gw.calls[1]).params['arg'])).toMatch(/^json council\.start \{/)
    expect((await loadCouncilSession(wire, s.state.council_id)).state).toEqual(s.state)
    const sync = new CouncilSync(wire, s.state.council_id, 5)
    await sync.report(START)
    expect(sync.movedOn).toBe(true)
    await expect(loadCouncilSession(wire, 'council-' + 'f'.repeat(32))).rejects.toThrow(/no council/)
    expect(new CouncilMovedOn('x')).toBeInstanceOf(Error)
  })
})
