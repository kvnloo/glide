// /glide focus host cards: one live focus card (Start -> ring -> ended), the held-asks digest and wind-down.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { glideCommand, type GlideFocus, type GlideHost } from '../commands/glide.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards, euiDir, euiStyles } from '../eui/cards.js'
import { HOST_APPROVE_ID } from '../eui/hostSnapshot.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'

import { must, ofKind, stub } from './fakes.js'

function setup(replies: Record<string, unknown> = {}) {
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

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('/glide focus', () => {
  const focus = (f: Partial<GlideFocus> = {}): GlideFocus => ({
    phase: 'PEAK', phase_source: 'circadian', flow: { flow: 0.72, confidence: 0.6 }, next_window: 'now, until 09:00–11:00',
    bedtime: '2026-11-12T02:30:00-06:00', block: null, guarded: true, queued: 0,
    learned: { days: 10, source: 'your Hermes sessions', stop: 23, windows: [{ start: 9, end: 11, days: 20 }] }, ...f
  })

  it('one focus card turns Start into the block ring into ended, and the digest collapses the held asks', async () => {
    const on = focus({ block: { until: '09:50', minutes_left: 50, minutes: 50 }, queued: 2 })
    const replies: Record<string, unknown> = { 'glide.focus': focus() }
    const { host, request, view, titles } = setup()
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
    const { host, request, view, titles, panels, eui } = setup({ 'glide.focus': on })
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
    const { host, request, titles, panels, view } = setup({
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
