import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { glideCommand, type GlideDetect, type GlideFocus, type GlideHost, type GlideMemory } from '../commands/glide.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards, euiDir, euiStyles } from '../eui/cards.js'
import { HOST_APPROVE_ID } from '../eui/hostSnapshot.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { closedSeats, COUNCIL_SCHEMA, demoRun, instrumentSvg, narration, parseCouncilRun, schedule } from '../../../glide/frontend/council.js'
import { councilCard, councilCommand, type CouncilSource, loadCouncil } from '../../../glide/frontend/councilPopup.js'
import type { EuiNode } from '../eui/sandbox.js'
import type { Overlay } from '../overlays/overlay.js'

import { key, must, ofKind, stub } from './fakes.js'

import { openTastePane, tasteBoard } from '../../../glide/frontend/taste.js'

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_file: string, _args: string[], _options: unknown,
    callback: (error: null, result: { stdout: string }) => void) => callback(null, { stdout: '{"ok":{"block":42}}' }))
}))

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

const memory = (m: Partial<GlideMemory> = {}): GlideMemory => ({ sessions: 0, corrections: 0, complete: false, on: false, ...m })
const detected: GlideDetect = {
  os: 'Linux x86_64', cpus: 16, ram_gib: 62.7, gpus: ['RTX 4090 (23 GiB)'], runtimes: ['ollama'],
  z0int: { installed: false, hint: 'pip install z0intelligence' }, memory: memory()
}

function setup(answers: Record<string, unknown> = {}) {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('glide-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  const replies: Record<string, unknown> = {
    'glide.detect': detected,
    'glide.sync': memory({ sessions: 42, corrections: 7, complete: true, scanned: 310 }),
    'glide.enable': memory({ sessions: 42, corrections: 7, complete: true, on: true }),
    ...answers
  }
  const request = vi.fn(async (method: string, _params: Record<string, unknown>) => {
    if (!(method in replies)) throw new Error(`unknown method ${method}`)
    return replies[method]
  })
  const host = { gw: stub<GlideHost['gw']>({ request }), session, transcript, eui }
  const panels = () => transcript.entries.filter(e => e.kind === 'panel').map(e => ofKind(e, 'panel'))
  const view = (index: number) => must(eui.hostView(must(panels()[index])))
  const titles = () => panels().map(p => p.title)
  return { host, request, transcript, eui, panels, view, titles }
}

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('/glide intent', () => {
  it('declares the ask, drafts an unevidenced contract, and advances to work only on approve', async () => {
    const { host, request, view, titles } = setup()
    await glideCommand(host, 'intent Make the voice orb feel alive, and ship it in the plugin by Friday.')
    expect(request).not.toHaveBeenCalled()
    expect(titles()).toEqual(['One ask. Exact words.', 'Review before execution'])
    const declare = JSON.stringify(view(0))
    for (const clause of ['acceptance · Make the voice orb feel alive', 'scope · plugin', 'deadline · Friday']) expect(declare).toContain(clause)
    expect(JSON.stringify(view(1))).toContain('0/4 evidenced · 4 missing')
    must(view(1).activate)(HOST_APPROVE_ID)
    await settle()
    expect(titles()).toEqual(['One ask. Exact words.', 'Review before execution', 'Implementation is not acceptance'])
    // Product copy with a plain sample label, never a debug sentence.
    const rail = JSON.stringify(view(2))
    expect(rail).toContain('Sample plan · tasks wait in this rail until you approve the contract.')
    expect(rail).not.toMatch(/\(synthetic\)|dispatched/)
    expect(JSON.stringify(view(1))).toContain('Approved — awaiting receipts')
    expect(JSON.stringify(view(1))).not.toContain('Completed')
  })

  it('shows the proof card for the last ask, labelled sample, and asks for an ask first', async () => {
    const { host, titles, view, transcript } = setup()
    await glideCommand(host, 'intent proof')
    expect(titles()).toEqual([])
    expect(JSON.stringify(transcript.entries)).toContain('Usage: /glide intent <ask>, then /glide intent proof')
    await glideCommand(host, 'intent Make the voice orb feel alive, and ship it in the plugin by Friday.')
    await glideCommand(host, 'intent proof')
    expect(titles()[2]).toBe('Show me the real-turn receipt')
    const proof = JSON.stringify(view(2))
    expect(proof).toContain('Sample receipt · no real turn has run yet.')
    expect(proof).not.toContain('(synthetic)')
    expect(proof).toMatch(/"ih-stamp"|ih-stamp/)
    expect(proof).not.toContain('no receipt yet')
  })

  it('asks for the ask when it is missing', async () => {
    const { host, titles, transcript } = setup()
    await glideCommand(host, 'intent')
    expect(titles()).toEqual([])
    expect(JSON.stringify(transcript.entries)).toContain('Usage: /glide intent <ask>')
  })
})

describe('/glide', () => {
  it('is a listed local command', () => {
    expect(localCommand('glide')?.help).toContain('local intelligence')
  })

  it('detects, then builds memory and turns recall on only after two taps', async () => {
    const { host, request, view, titles } = setup()
    await glideCommand(host, '')
    expect(titles()).toEqual(['This machine', 'z0intelligence', 'Build your local memory'])
    expect(request.mock.calls.map(c => c[0])).toEqual(['glide.detect'])
    expect(request.mock.calls[0]?.[1]).toEqual({ session_id: 'glide-session' })

    must(view(2).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.sync', { session_id: 'glide-session', limit: 100 }])
    expect(titles().slice(3)).toEqual(['Local memory built', 'Quote them into matching turns'])
    expect(request.mock.calls.some(c => c[0] === 'glide.enable')).toBe(false)

    must(view(4).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.enable', { session_id: 'glide-session', on: true }])
    expect(titles().slice(5)).toEqual(['Glide memory is on', 'Install the skill router'])
  })

  it('chains router, hill climb and savings, one tap each, with the numbers the plugin returns', async () => {
    const { host, request, view, titles } = setup({
      'glide.skill_router': { installed: true, fresh: true, categories: 5, skills: 19, top: [{ category: 'debugging', rule: 'root cause first', skills: ['systematic-debugging'] }] },
      'glide.hill_climb': { target: 'CPU benchmark', metric: 'score', baseline: { mean: 5977.04 }, candidate: { mean: 5669.54 }, delta: -307.5, noise: 0.076, verdict: 'REVERT', reason: 'no improvement (rel=-0.051)' },
      'glide.offload': { local_models: ['llama3.2:1b'], tasks: 1, tokens_offloaded: 118, est_cost_saved_usd: 0.00118, assumptions: ['Estimate: $0.01 per 1k'] }
    })
    await glideCommand(host, 'router')
    expect(titles()).toEqual(['Install the skill router'])
    expect(request).not.toHaveBeenCalled()

    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.skill_router', { session_id: 'glide-session' }])
    expect(titles().slice(1)).toEqual(['Skill router installed', 'Run your first hill climb'])

    must(view(2).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.hill_climb', { session_id: 'glide-session', run: true }])
    expect(titles().slice(3)).toEqual(['Hill climb: REVERT', 'Offload a small task to a local model'])

    must(view(4).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.offload', { session_id: 'glide-session', run: true }])
    expect(titles().at(-1)).toBe('Offload savings')
    expect(JSON.stringify(view(5))).toContain('llama3.2:1b')
  })

  it('shows a failed step as an error notice', async () => {
    const { host, transcript, view, titles } = setup({})
    await glideCommand(host, 'climb')
    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(titles()).toEqual(['Run your first hill climb'])
    expect(JSON.stringify(transcript.entries.at(-1))).toContain('unknown method')
  })

  it('recalls and turns off on request', async () => {
    const { host, request, titles } = setup({
      'glide.recall': { hits: [{ text: 'never push to main untested', score: 2.1 }] },
      'glide.enable': memory({ on: false })
    })
    await glideCommand(host, 'recall push main')
    expect(request.mock.calls[0]).toEqual(['glide.recall', { session_id: 'glide-session', query: 'push main' }])
    await glideCommand(host, 'off')
    expect(titles()).toEqual(['Your corrections about “push main”', 'Glide memory is off'])
  })

  it('says so when the backend is missing instead of drawing cards', async () => {
    const { host, transcript, titles } = setup({})
    host.gw = stub<GlideHost['gw']>({ request: vi.fn(async () => { throw new Error('method not found') }) })
    await glideCommand(host, '')
    expect(titles()).toEqual([])
    expect(JSON.stringify(transcript.entries.at(-1))).toContain('method not found')
  })

  it('falls back to the plugin command on cores without plugin gateway methods', async () => {
    const dispatched: string[] = []
    const { host, titles } = setup({
      'glide.detect': undefined, 'glide.sync': undefined, 'glide.enable': undefined
    })
    const request = vi.fn(async (method: string, params: Record<string, unknown>) => {
      if (method !== 'command.dispatch') throw new Error(`unknown method: ${method}`)
      dispatched.push(String(params['arg']))
      expect(params).toMatchObject({ name: 'glide', session_id: 'glide-session' })
      return { type: 'plugin', output: JSON.stringify(detected) }
    })
    host.gw = stub<GlideHost['gw']>({ request })
    await glideCommand(host, '')
    expect(dispatched).toEqual(['json detect {}'])
    expect(titles()[0]).toBe('This machine')
  })

  it('shows the plugin command error instead of a card', async () => {
    const { host, transcript, panels } = setup()
    host.gw = stub<GlideHost['gw']>({
      request: vi.fn(async (method: string) => {
        if (method !== 'command.dispatch') throw new Error(`unknown method: ${method}`)
        return { output: JSON.stringify({ error: 'Build your memory first: /glide build' }) }
      })
    })
    await glideCommand(host, 'recall staging')
    expect(panels()).toEqual([])
    expect(JSON.stringify(transcript.entries)).toContain('Build your memory first')
  })
})

describe('/council', () => {
  const clock = () => {
    let now = 0
    let tick: (() => void) | undefined
    return {
      now: () => now,
      every: (fn: () => void) => { tick = fn; return () => { tick = undefined } },
      advance(ms: number) { for (let t = 0; t < ms; t += 110) { now += 110; tick?.() } },
      get running() { return tick !== undefined }
    }
  }
  function council() {
    const { host, transcript, eui, panels, view } = setup()
    const blobs: string[] = []
    eui.attach({ blob: bytes => { blobs.push(new TextDecoder().decode(bytes)); return `b${blobs.length}` }, stylesheet: vi.fn() }, true)
    const overlays: Overlay[] = []
    const changed = vi.fn()
    const popup = { ...host, open: (o: Overlay) => { overlays.push(o) }, close: (o: Overlay) => { overlays.splice(overlays.indexOf(o), 1); o.onClose?.() }, changed }
    const draw = () => JSON.stringify(must(overlays.at(-1)).node('layer.overlay-1'))
    const card = () => councilCard({ run: demoRun(), live: false, from: 'test' }, { t: null })
    return { popup, overlays, changed, transcript, panels, view, blobs, draw, card }
  }
  const demo = (): CouncilSource => ({ run: demoRun(), live: false, from: 'synthetic seats and brief' })
  const press = (o: Overlay | undefined, name: string) => must(o).onKey(key(name))

  it('is a listed local command', () => {
    expect(localCommand('council')?.help).toContain('Socratic council')
  })

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

  it('reads a configured live endpoint, and falls back to the tagged demo when it cannot', async () => {
    const live = { schema: COUNCIL_SCHEMA, brief: 'live brief', rounds: 1, seats: [{ id: 'a', name: 'A', family: 'Google' }, { id: 'b', name: 'B', family: 'free' }], events: [], verdicts: [] }
    const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }))
    expect(await loadCouncil(undefined)).toMatchObject({ live: false })
    expect((await loadCouncil(undefined)).note).toBeUndefined()
    const got = await loadCouncil('http://council.test/run', answer(live))
    expect(got).toMatchObject({ live: true, from: 'council.test' })
    expect(got.run.brief).toBe('live brief')
    for (const [url, get, why] of [
      ['http://council.test/run', answer({ ...live, rounds: 0 }), 'rounds'],
      ['http://council.test/run', answer({}, 503), 'HTTP 503'],
      ['http://council.test/run', vi.fn(async () => { throw new Error('refused') }), 'refused'],
      ['file:///etc/passwd', answer(live), 'http(s)']
    ] as const) {
      const r = await loadCouncil(url, get)
      expect(r.live).toBe(false)
      expect(r.run.brief).toBe(demoRun().brief)
      expect(r.note).toContain(why)
    }
  })

  it('opens as a popup card tagged demo, plays on Enter with a clock that stops at the end, and closes on Escape', async () => {
    const { popup, overlays, changed, blobs, draw } = council()
    const c = clock()
    await councilCommand(popup, '', async () => demo(), c)
    expect(overlays).toHaveLength(1)
    expect(must(overlays[0]).modal).toBe(true)
    const idle = draw()
    expect(idle).toContain('eui.popup')
    expect(idle).toContain('"data-council-source":"demo"')
    expect(idle).toContain('Convene council')
    expect(idle).not.toContain('data-council-stance')
    // Fits a short pane: the header rides in the side column, so nothing stacks above the instrument.
    expect(idle.indexOf('COUNCIL · GLIDE · SOCRATIC')).toBeGreaterThan(idle.indexOf('"w":320,"h":320'))
    expect(idle).not.toContain('read a live council') // the popup title already says demo
    expect(idle.match(/"w":16,"h":16/g)).toHaveLength(4) // seats ride as small chips, not four stacked 30px rows
    await settle()
    expect(blobs.some(b => b.includes('url(#tb)'))).toBe(true)
    expect(c.running).toBe(false)

    press(overlays[0], 'enter')
    expect(c.running).toBe(true)
    c.advance(schedule(demoRun()).total / 2)
    expect(draw()).toContain('Convening…')
    expect(changed.mock.calls.length).toBeGreaterThan(10)
    c.advance(schedule(demoRun()).total)
    expect(c.running).toBe(false)
    const done = draw()
    expect(done).toContain('"data-council-stance":"dissent"')
    expect(done.match(/data-council-stance/g)).toHaveLength(4)
    // Still fits once every seat has closed: seats are one line each, and the verdict prose stays in the transcript card.
    for (const v of demoRun().verdicts) expect(done).not.toContain(JSON.stringify(v.text))
    expect(done).toContain('Convene again')

    press(overlays[0], 'enter')
    expect(c.running).toBe(true)
    press(overlays[0], 'escape')
    expect(overlays).toHaveLength(0)
    expect(c.running).toBe(false)
  })

  it('says so instead of opening in a pane without cards, and rejects unknown arguments', async () => {
    const { popup, overlays, transcript } = council()
    await councilCommand({ ...popup, eui: undefined }, '', async () => demo())
    await councilCommand(popup, 'bogus', async () => demo())
    expect(overlays).toHaveLength(0)
    expect(JSON.stringify(transcript.entries)).toContain('ephemeral-ui cards')
    expect(JSON.stringify(transcript.entries)).toContain('Usage: /council [card]')
  })

  it('warns when a configured endpoint failed and still shows the demo, never a live tag', async () => {
    const { popup, overlays, transcript, draw } = council()
    await councilCommand(popup, '', async () => ({ ...demo(), note: 'the council at x could not be read (HTTP 500); showing the demo run' }))
    expect(JSON.stringify(transcript.entries)).toContain('HTTP 500')
    expect(overlays).toHaveLength(1)
    expect(draw()).toContain('"data-council-source":"demo"')
    expect(draw()).not.toContain('LIVE')
  })

  it('posts a council card whose button opens the popup, and re-arms for the next tap', async () => {
    const { popup, overlays, panels, view } = council()
    await councilCommand(popup, 'card', async () => demo())
    expect(panels().map(p => p.title)).toEqual(['Socratic council · demo'])
    expect(JSON.stringify(view(0).node)).toContain('Open the council')
    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(overlays).toHaveLength(1)
    expect(JSON.stringify(view(0).node)).toContain('Open the council')
    must(view(0).activate)(HOST_APPROVE_ID)
    expect(overlays).toHaveLength(2)
  })

  it('counts abstentions separately instead of reporting them as agreement', () => {
    const run = demoRun()
    const verdicts = run.verdicts.map((v, i) => i === 0 ? { ...v, stance: 'abstain' as const } : v)
    const mixed = { ...run, verdicts }
    const done = JSON.stringify(councilCard({ ...demo(), run: mixed }, { t: schedule(mixed).total }))
    expect(done).toContain('2 of 4 agree · 1 dissent · 1 abstain')
    expect(done).not.toContain('3 of 4 agree')
  })

  it('rejects two verdicts from the same seat', () => {
    const raw = {
      schema: COUNCIL_SCHEMA, brief: 'A synthetic review', rounds: 1,
      seats: [{ id: 'a', name: 'A', family: 'free' }, { id: 'b', name: 'B', family: 'free' }],
      events: [], verdicts: [
        { seat: 'a', stance: 'agree', text: 'Yes' },
        { seat: 'a', stance: 'dissent', text: 'No' }
      ]
    }
    const run = parseCouncilRun(raw)
    expect('error' in run ? run.error : 'parsed').toContain('already has a verdict')
  })

  it('draws the card from node data only: the instrument and every seat stone are SVG images', () => {
    const { card } = council()
    const svgs: string[] = []
    const walk = (n: EuiNode) => { if (n.t === 'svg') svgs.push(n.svg); else if (n.t === 'el') n.kids.forEach(walk) }
    walk(card())
    expect(svgs).toHaveLength(5)
    expect(svgs.slice(1).map(s => /<g clip-path/.test(s))).toEqual([true, true, true, true])
  })
})

function setupTaste() {
  vi.stubEnv('TERN_PANE', '17')
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

describe('/glide taste', () => {
  it('uses the card seam fallback and opens the real board beside chat only on request', async () => {
    const { host, request, publish } = setupTaste()
    expect(execFile).not.toHaveBeenCalled()
    await glideCommand(host, 'taste')
    expect(request.mock.calls).toEqual([
      ['glide.taste', { session_id: 'taste-session' }],
      ['command.dispatch', { name: 'glide', arg: 'json taste {}', session_id: 'taste-session' }]
    ])
    expect(execFile).toHaveBeenCalledWith('tern', ['browser', JSON.stringify({
      op: 'open', owner: 17, url: 'http://127.0.0.1:8789/s/launch-ab12/', how: 'beside'
    }), '--timeout', '15'], { timeout: 20_000, shell: false }, expect.any(Function))
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ title: 'Launch ideas', kind: 'receipt' }))
    expect(request.mock.calls.some((c: readonly unknown[]) => c[0] === 'glide.enable')).toBe(false)
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

// /glide focus host cards: one live focus card (Start -> ring -> ended), the held-asks digest and wind-down.
function focusSetup(replies: Record<string, unknown> = {}) {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('glide-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  const request = vi.fn(async (method: string, _params: Record<string, unknown>) => {
    if (!(method in replies)) throw new Error(`unknown method ${method}`)
    return replies[method]
  })
  const host = { gw: stub<GlideHost['gw']>({ request }), session, transcript, eui }
  const panels = () => transcript.entries.filter(e => e.kind === 'panel').map(e => ofKind(e, 'panel'))
  const view = (index: number) => must(eui.hostView(must(panels()[index])))
  const titles = () => panels().map(p => p.title)
  return { host, request, eui, panels, view, titles }
}


describe('/glide focus', () => {
  const focus = (f: Partial<GlideFocus> = {}): GlideFocus => ({
    phase: 'PEAK', phase_source: 'circadian', flow: { flow: 0.72, confidence: 0.6 }, next_window: 'now, until 09:00–11:00',
    bedtime: '2026-11-12T02:30:00-06:00', block: null, guarded: true, queued: 0,
    learned: { days: 10, source: 'your Hermes sessions', stop: 23, windows: [{ start: 9, end: 11, days: 20 }] }, ...f
  })

  it('one focus card turns Start into the block ring into ended, and the digest collapses the held asks', async () => {
    const on = focus({ block: { until: '09:50', minutes_left: 50, minutes: 50 }, queued: 2 })
    const replies: Record<string, unknown> = { 'glide.focus': focus() }
    const { host, request, view, titles } = focusSetup()
    request.mockImplementation(async (method: string, params: Record<string, unknown>) => {
      if (method !== 'glide.focus') throw new Error(`unknown method ${method}`)
      if (params['action'] === 'start') return on
      if (params['action'] === 'stop') return { ...focus(), digest: [{ title: 'PR #12 ready for review', cls: 'decision' }, { title: 'nightly eval done', cls: 'report' }] }
      return replies['glide.focus']
    })
    await glideCommand(host, 'focus')
    expect(titles()).toEqual(['Your attention'])
    const idle = JSON.stringify(view(0))
    for (const s of ['ah-ring', 'Peak', '72% est.', '02:30', 'min block', 'Start block']) expect(idle).toContain(s)
    expect(idle).not.toContain('eui-host-rows')
    expect(request.mock.calls.map(c => c[1])).toEqual([{ session_id: 'glide-session' }])

    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.focus', { session_id: 'glide-session', action: 'start', minutes: 50 }])
    // The same card is now the running block: no second card, no second End block.
    expect(titles()).toEqual(['Deep-work block on until 09:50'])
    const running = JSON.stringify(view(0))
    for (const s of ['ah-live', 'min left', 'Deep work until 09:50', '2 asks held for the digest', 'End block', 'ih-hold']) expect(running).toContain(s)

    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(request.mock.calls.at(-1)).toEqual(['glide.focus', { session_id: 'glide-session', action: 'stop' }])
    expect(titles()).toEqual(['Deep-work block ended', 'While you were in deep work: 2 held'])
    expect(JSON.stringify(view(0))).not.toContain('End block')
    const digest = JSON.stringify(view(1))
    for (const s of ['ah-stack', 'ah-tile', '"text":"2"', 'held asks', '1 digest', 'PR #12 ready for review', 'nightly eval done']) expect(digest).toContain(s)
  })

  it('never leaves two live End block cards', async () => {
    const on = focus({ block: { until: '09:50', minutes_left: 30, minutes: 50 }, queued: 1 })
    const { host, request, view, titles, panels, eui } = focusSetup({ 'glide.focus': on })
    const ends = () => panels().filter(p => JSON.stringify(eui.hostView(p) ?? null).includes('End block'))
    await glideCommand(host, 'focus 50')
    await glideCommand(host, 'focus')
    expect(ends()).toHaveLength(1)
    expect(JSON.stringify(view(panels().length - 1))).toContain('End block')
    request.mockResolvedValueOnce({ ...focus(), digest: [] })
    await glideCommand(host, 'focus stop')
    expect(ends()).toHaveLength(0)
    expect(titles().slice(-2)).toEqual(['Deep-work block ended', 'Block ended, nothing held'])
    expect(JSON.stringify(view(panels().length - 1))).toContain('nothing held')
  })

  it('wind-down draws the day band and the note tomorrow starts from; hours shows learned windows', async () => {
    const { host, request, titles, panels, view } = focusSetup({
      'glide.focus': focus({ phase: 'WIND_DOWN', wind_down: { nudge: true, resume: { title: 'parser', last_asks: ['fix the tokenizer'] } } })
    })
    await glideCommand(host, 'focus wind-down')
    expect(request.mock.calls[0]?.[1]).toEqual({ session_id: 'glide-session', action: 'wind_down' })
    expect(titles()).toEqual(["Time to wrap: here's where you left off"])
    const wind = JSON.stringify(view(0))
    for (const s of ['ah-daysvg', 'Tomorrow starts here', '“fix the tokenizer”', 'bed 02:30', 'best hours', 'next deep work now, until 09:00–11:00']) expect(wind).toContain(s)
    await glideCommand(host, 'focus hours')
    expect(titles().at(-1)).toBe('Your best deep-work hours')
    expect(JSON.stringify(view(panels().length - 1))).toContain('09:00–11:00')
  })

  it('styles its heroes with ah- classes no kit stylesheet uses', () => {
    expect(euiStyles()).toContain('.ah-ring')
    expect(readFileSync(join(euiDir(), 'kit.css'), 'utf8')).not.toMatch(/\.ah-/)
  })
})
