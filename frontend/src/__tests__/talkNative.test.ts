import { closedSeats, COUNCIL_SCHEMA, demoRun, instrumentSvg, narration, parseCouncilRun, schedule } from '../../../glide/frontend/council.js'
import { deliverySvg, exchangeAt, exchangeTiming, reportClauses } from '../../../glide/frontend/councilExchange.js'
import { pcmSpeech, type CouncilSpeech, type SpeechAudio } from '../../../glide/frontend/councilSpeech.js'
import { type CouncilHost, openCouncilPopup } from '../../../glide/frontend/councilPopup.js'
import type { Overlay } from '../overlays/overlay.js'
import { EventEmitter } from 'node:events'
import { Node, Session, Surface } from '@stencil-hq/tern'
import { describe, expect, it, vi } from 'vitest'
import { FakeGateway, given, key, must } from './fakes.js'
import { App } from './appSetup.js'

vi.mock('@hermes/shared/prompt-history', () => ({ append: () => undefined, load: () => [] }))
vi.mock('../../assets/logo.png', async () => {
  const { readFile } = await import('node:fs/promises')
  return { default: await readFile(new URL('../../assets/logo.png', import.meta.url)) }
})

describe('Ctrl+L through a connected native SDK session', () => {
  it('decodes the real chord, paints a listening orb, and hangs up with another chord', async () => {
    delete process.env['HERMES_TUI_SPLASH']
    delete process.env['HERMES_TERN_QUERY']
    delete process.env['HERMES_TERN_IMAGE']
    const input = new EventEmitter()
    const tern = new Session(input, { write() {} }, { exitHooks: false, record: '' })
    const connecting = tern.handshake()
    input.emit('data', `\x1b_tsp;r;${JSON.stringify({ ...tern.caps, r: 'hello', v: 1, term: 'fixture', ver: '0', features: ['blobs'], credits: 64, apc: 1048576 })}\x1b\\`)
    expect(await connecting).toBe(true)
    let active = false
    const gateway = new FakeGateway({ replies: { 'command.dispatch': p => {
      const [action, id] = String(p['arg']).split(' ')
      if (action === 'start') active = true
      if (action === 'stop') active = false
      return { type: 'plugin', output: JSON.stringify({ live_id: id, phase: active ? 'listening' : 'idle', active, error: '' }) }
    } } })
    const renders = vi.spyOn(Surface.prototype, 'render')
    const app = new App(tern, gateway.client, '1.0.0')
    const running = app.run()
    given.session(app, 's1')
    app.stores.composer.set('native draft', { cursor: 3 })
    try {
      await vi.waitFor(() => expect(renders).toHaveBeenCalled())
      input.emit('data', '\x1b[108;5u')
      await vi.waitFor(() => expect(app.liveVoice.phase).toBe('listening'))
      await vi.waitFor(() => expect(JSON.stringify(renders.mock.calls.at(-1))).toContain('Hermes agent: listening'))
      expect(app.stores.composer.text).toBe('native draft')
      expect(app.stores.composer.cursor).toBe(3)
      input.emit('data', '\x0c')
      await vi.waitFor(() => expect(app.liveVoice.blocked).toBe(false))
      expect(gateway.sent('command.dispatch').map(p => String(p['arg']).split(' ')[0]).filter(action => action !== 'status')).toEqual(['start', 'stop'])
      expect(gateway.sent('prompt.submit')).toHaveLength(0)
    } finally {
      app.quit()
      await running
      tern.close()
      renders.mockRestore()
    }
  })
})

describe('council exchange', () => {
  it('types the brief, delivers one envelope per seat, then starts the recorded run', () => {
    const run = demoRun()
    const timing = exchangeTiming(run)
    expect(exchangeAt(run, null).phase).toBe('seated')
    expect(exchangeAt(run, 0).brief).toBe('')
    expect(exchangeAt(run, timing.typing / 4).brief.length).toBeGreaterThan(0)
    expect(exchangeAt(run, timing.typing / 4).brief.length).toBeLessThan(run.brief.length)
    expect(exchangeAt(run, timing.typing).constraints).toEqual(run.constraints)
    const sending = exchangeAt(run, timing.typing + 150)
    expect(sending.phase).toBe('sending')
    expect(deliverySvg(run, sending, 320).match(/data-envelope=/g)).toHaveLength(run.seats.length)
    const working = exchangeAt(run, timing.working)
    expect(working.seats.map(s => s.received)).toEqual(run.seats.map(() => true))
    expect(working.frame.t).toBe(0)
    expect(working.seats.every(s => s.state === 'thinking')).toBe(true)
  })

  it('derives drafting and done from recorded turns, then assembles an honest report clause by clause', () => {
    const run = demoRun()
    const timing = exchangeTiming(run)
    const first = run.events.findIndex(e => e.type === 'turn')
    const drafting = exchangeAt(run, timing.working + (schedule(run).at[first] ?? 0) + 10)
    expect(drafting.seats[0]?.state).toBe('drafting')
    const report = exchangeAt(run, timing.report + 1)
    expect(report.phase).toBe('report')
    expect(report.clauses).toHaveLength(1)
    const done = exchangeAt(run, timing.total)
    expect(done.phase).toBe('done')
    expect(done.clauses).toEqual(reportClauses(run))
    expect(done.clauses.map(c => c.label)).toEqual(expect.arrayContaining(['Verdict', 'Agreements', 'Dissent', 'Receipts']))
    expect(done.seats.every(s => s.state === 'done')).toBe(true)
    const empty = { brief: run.brief, rounds: run.rounds, seats: run.seats, verdicts: [], events: [] }
    expect(reportClauses(empty).map(c => c.text).join(' ')).toContain('No verdict recorded')
    expect(reportClauses(empty).map(c => c.text).join(' ')).not.toContain(run.verdicts[0]?.text)
  })

  it('keeps received/status semantics without typing, flight or pulse under reduced motion', () => {
    const run = demoRun()
    const view = exchangeAt(run, 1, true)
    expect(view.brief).toBe(run.brief)
    expect(view.seats.every(s => s.received)).toBe(true)
    expect(deliverySvg(run, view, 320)).not.toContain('data-envelope=')
    expect(exchangeAt(run, exchangeTiming(run, true).total, true).phase).toBe('done')
  })

  it('accepts optional explicit constraints without breaking v1 snapshots', () => {
    const raw = { schema: COUNCIL_SCHEMA, brief: 'Ship?', rounds: 1, seats: [
      { id: 'a', name: 'A', family: 'free' }, { id: 'b', name: 'B', family: 'free' }
    ], events: [], verdicts: [], constraints: ['No paid calls', 'Keep receipts'] }
    expect(parseCouncilRun(raw)).toMatchObject({ constraints: raw.constraints })
    expect(parseCouncilRun({ ...raw, constraints: [42] })).toHaveProperty('error')
  })
})

describe('speech amplitude', () => {
  it('reads actual PCM amplitude and silence from a WAV, with bounded sample access', () => {
    const wav = Buffer.alloc(44 + 400)
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
    wav.writeUInt32LE(1000, 24); wav.writeUInt32LE(2000, 28); wav.writeUInt16LE(2, 32)
    wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(400, 40)
    for (let i = 100; i < 200; i++) wav.writeInt16LE(16000, 44 + i * 2)
    const pcm = pcmSpeech(wav)
    expect(pcm.duration).toBe(200)
    expect(pcm.level(0)).toBe(0)
    expect(pcm.level(120)).toBeGreaterThan(0.4)
    expect(pcm.level(9999)).toBe(0)
    expect(() => pcmSpeech(Buffer.from('not wave'))).toThrow(/WAV/)
  })
})

function voiceSetup(reduceMotion = false) {
  let now = 0
  let tick: (() => void) | undefined
  let overlay: Overlay | undefined
  const calls: { text: string; signal: AbortSignal; playing: (audio: SpeechAudio) => void; finish: () => void; fail: (e: Error) => void }[] = []
  const speech: CouncilSpeech = {
    speak: (text, signal, playing) => new Promise<void>((finish, fail) => { calls.push({ text, signal, playing, finish, fail }) })
  }
  const notice = vi.fn()
  const changed = vi.fn()
  const host: CouncilHost = {
    open: o => { overlay = o }, close: o => { o.onClose?.(); overlay = undefined }, changed,
    transcript: { notice },
    eui: { host: { publish: () => { throw new Error('unexpected publication') } }, click: () => undefined, svg: () => 'orb', style: () => 'style' }
  }
  openCouncilPopup(host, { run: demoRun(), live: false, from: 'synthetic' }, {
    now: () => now, every: fn => { tick = fn; return () => { tick = undefined } }
  }, { speech, reduceMotion })
  const draw = () => must(overlay).node('layer.overlay-1')
  const json = () => JSON.stringify(draw())
  const press = (name: string) => must(overlay).onKey(key(name))
  const advance = (ms: number) => { now += ms; tick?.() }
  const click = async (action: string) => {
    const find = (n: Node): Node | undefined => {
      const attrs = n.props['attrs']
      if (attrs && typeof attrs === 'object' && 'data-eui-action' in attrs && attrs['data-eui-action'] === action) return n
      for (const child of n.children) { const found = find(child); if (found) return found }
      return undefined
    }
    const tree = draw()
    if (!(tree instanceof Node)) throw new Error('expected native node')
    const target = must(find(tree))
    // Native action handlers need no payload for council actions.
    await must(target.handlers?.onClick)({ ev: 'action', sf: 'council', id: 'council-test', act: 'click', raw: {} })
  }
  return { calls, notice, changed, draw, json, press, advance, click, running: () => tick !== undefined, current: () => overlay }
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

describe('council read aloud lifecycle', () => {
  it('speaks the brief then report, shows only a real playback caption and full-screen orb, and returns on any key', async () => {
    const s = voiceSetup()
    await s.click('read-aloud')
    s.press('enter')
    s.advance(exchangeTiming(demoRun()).typing + 1)
    expect(s.calls[0]?.text).toBe(demoRun().brief)
    expect(s.json()).not.toContain('data-council-speaking')
    must(s.calls[0]).playing({ duration: 1000, level: () => .6 })
    expect(s.json()).toContain('"size":"full"')
    expect(s.json()).toContain('data-council-caption')
    expect(s.json()).toContain(demoRun().brief)
    s.press('escape')
    expect(s.current()).toBeDefined()
    expect(s.json()).not.toContain('data-council-speaking')
    expect(s.calls[0]?.signal.aborted).toBe(true)
    s.advance(exchangeTiming(demoRun()).total)
    expect(s.calls[1]?.text).toBe('Verdict.')
    must(s.calls[1]).playing({ duration: 200, level: () => 0 })
    await s.click('return-to-card')
    expect(s.json()).toContain('data-council-report')
    expect(s.calls[1]?.signal.aborted).toBe(true)
    s.press('escape')
    expect(s.current()).toBeUndefined()
    expect(s.running()).toBe(false)
  })

  it('mute aborts speech, suppresses the report reader, and cannot be undone by a late callback', async () => {
    const s = voiceSetup()
    s.press('r'); s.press('enter'); s.advance(exchangeTiming(demoRun()).typing + 1)
    const brief = must(s.calls[0])
    brief.playing({ duration: 1000, level: () => .5 })
    s.press('x')
    await s.click('mute')
    brief.finish(); await flush()
    brief.playing({ duration: 1000, level: () => .5 })
    s.advance(exchangeTiming(demoRun()).total)
    expect(s.calls).toHaveLength(1)
    expect(s.json()).not.toContain('data-council-speaking')
    expect(s.json()).toContain('Unmute')
    expect(s.running()).toBe(false)
  })

  it('reports platform speech refusal and continues the text exchange', async () => {
    const s = voiceSetup()
    s.press('r'); s.press('enter'); s.advance(exchangeTiming(demoRun()).typing + 1)
    must(s.calls[0]).fail(new Error('No platform speech engine'))
    await flush()
    expect(s.notice).toHaveBeenCalledWith('No platform speech engine', 'warning')
    expect(s.json()).toContain('No platform speech engine')
    s.advance(exchangeTiming(demoRun()).total)
    expect(s.json()).toContain('data-council-report')
    expect(s.running()).toBe(false)
  })

  it('reduced motion still reads the brief, and close cancels playback and all ticks', async () => {
    const s = voiceSetup(true)
    s.press('r'); s.press('enter')
    const brief = must(s.calls[0])
    brief.playing({ duration: 1000, level: () => .5 })
    must(s.current()).onClose?.()
    const changes = s.changed.mock.calls.length
    brief.playing({ duration: 1000, level: () => .5 })
    brief.finish(); await flush()
    expect(brief.signal.aborted).toBe(true)
    expect(s.running()).toBe(false)
    expect(s.changed.mock.calls).toHaveLength(changes)
  })
})

describe('recorded council instrument', () => {
  it('parses a council run and refuses one that names a seat it does not seat', () => {
    const run = demoRun()
    expect(run.seats.map(s => [s.name, s.mineral])).toEqual([['Argon', 'malachite'], ['Astra', 'labradorite'], ['Fable', 'rose'], ['Opus', 'citrine']])
    expect(run.events.filter(e => e.type === 'turn')).toHaveLength(16)
    const raw = {
      schema: COUNCIL_SCHEMA, brief: 'b', rounds: 2,
      seats: [{ id: 'a', name: 'A', family: 'OpenAI' }, { id: 'b', name: 'B', family: 'OpenAI' }, { id: 'c', name: 'C', family: 'mystery' }],
      events: [{ type: 'turn', seat: 'a', round: 1 }, { type: 'spawn', seat: 'b' }, { type: 'turn', seat: 'b', round: 2, cites: ['a'] }],
      verdicts: [{ seat: 'a', stance: 'dissent', text: 'no' }]
    }
    const ok = parseCouncilRun(raw)
    expect('error' in ok ? ok.error : ok.seats.map(s => s.mineral)).toEqual(['labradorite', 'moonstone', 'clear'])
    expect('error' in ok ? [] : ok.events[2]).toEqual({ type: 'turn', seat: 1, round: 2, cites: [0] })
    for (const [bad, why] of [
      [{ ...raw, schema: 'other' }, 'schema'],
      [{ ...raw, extra: 1 }, 'unknown field "extra"'],
      [{ ...raw, events: [{ type: 'turn', seat: 'z', round: 1 }] }, 'unknown seat'],
      [{ ...raw, events: [{ type: 'turn', seat: 'a', round: 3 }] }, 'events.0.round'],
      [{ ...raw, verdicts: [{ seat: 'a', stance: 'maybe', text: 'x' }] }, 'stance'],
      [{ ...raw, seats: [raw.seats[0], raw.seats[0]] }, 'share an id'],
      [{ ...raw, seats: [{ id: 'a', name: 'A', family: 'x', mineral: 'ruby' }, raw.seats[1]] }, 'mineral'],
      [null, 'expected an object']
    ] as const) {
      const r = parseCouncilRun(bad)
      expect('error' in r ? r.error : 'parsed').toContain(why)
    }
  })

  it('moves only while a run plays: idle, mid-run and complete draw differently and verdicts open seat by seat', () => {
    const run = demoRun()
    const { at, total } = schedule(run)
    const lastTurn = run.events.map(e => e.type).lastIndexOf('turn')
    const idle = instrumentSvg(run, { t: null })
    expect(idle).not.toContain('url(#wm)')
    expect(instrumentSvg(run, { t: null })).toBe(idle)
    const mid = instrumentSvg(run, { t: total / 2 })
    expect(mid).toContain('url(#wm)')
    expect(narration(run, { t: total / 2 })).toMatch(/^Round \d · \w+/)
    expect(closedSeats(run, { t: null }).size).toBe(0)
    expect(closedSeats(run, { t: must(at[lastTurn]) + 10 }).size).toBe(3)
    expect([...closedSeats(run, { t: total })]).toEqual([0, 1, 2, 3])
    expect(instrumentSvg(run, { t: total })).not.toContain('url(#wm)')
    expect(narration(run, { t: total })).toBe('Council complete · 4 rounds · 36 helpers')
  })

})
