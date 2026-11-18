import type { Session, Surface } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CLEAN_CSS, CLEAN_SHEET, CleanView, cleanFocus, cleanInk, cleanOrbSvg, cleanPalette, cleanPulse, cleanRingSvg, DASH_CLEAN, STATE_HUE } from '../voice/cleanFocus.js'
import { focusBlock } from '../voice/orbit.js'

import { stub } from './fakes.js'

const T0 = 1_000_000
const block = (minutes_left: number, minutes = 50) => focusBlock.note({ block: { minutes_left, minutes } }, T0)
const flat = (node: unknown): string => JSON.stringify(node)

afterEach(() => {
  cleanFocus.exit()
  focusBlock.note({ block: null }, T0)
  vi.useRealTimers()
})

describe('clean focus state', () => {
  it('only comes up over a running block and leaves when the block ends', () => {
    focusBlock.note({ block: null }, T0)
    expect(cleanFocus.enter(T0)).toBe(false)
    block(25)
    expect(cleanFocus.enter(T0)).toBe(true)
    expect(cleanFocus.shown(T0 + 24 * 60_000)).toBe(true)
    // End block: the plugin answers with no block, and the next frame shows the normal view.
    focusBlock.note({ block: null }, T0 + 60_000)
    expect(cleanFocus.shown(T0 + 60_000)).toBe(false)
    expect(cleanFocus.on).toBe(false)
  })

  it('times out with the block', () => {
    block(1)
    cleanFocus.enter(T0)
    expect(cleanFocus.shown(T0 + 61_000)).toBe(false)
  })

  it('counts whole minutes left and keeps the block length', () => {
    block(25, 50)
    expect(focusBlock.left(T0)).toBe(25)
    expect(focusBlock.left(T0 + 30_000)).toBe(25)
    expect(focusBlock.minutes).toBe(50)
  })
})

describe('clean orb ink', () => {
  it('rests on the accent, runs tools at the partner hue and thinks between', () => {
    expect(cleanInk(DASH_CLEAN, 'idle', 0, true)).toBe(DASH_CLEAN.accent.toLowerCase())
    expect(cleanInk(DASH_CLEAN, 'working', 0, true)).toBe(DASH_CLEAN.alt.toLowerCase())
    const thinking = cleanInk(DASH_CLEAN, 'thinking', 0, true)
    expect(thinking).not.toBe(DASH_CLEAN.accent.toLowerCase())
    expect(thinking).not.toBe(DASH_CLEAN.alt.toLowerCase())
    expect(cleanInk(DASH_CLEAN, 'error', 3)).toBe(DASH_CLEAN.error)
    expect(STATE_HUE.idle).toBeLessThan(STATE_HUE.thinking)
    expect(STATE_HUE.thinking).toBeLessThan(STATE_HUE.working)
  })

  it('drifts over time, never past the ramp, and holds still under reduced motion', () => {
    const inks = new Set([0, 1.2, 2.4, 3.6, 4.8].map(t => cleanInk(DASH_CLEAN, 'thinking', t)))
    expect(inks.size).toBeGreaterThan(2)
    expect(cleanInk(DASH_CLEAN, 'idle', 2.4)).not.toBe(DASH_CLEAN.accent.toLowerCase())
    expect(new Set([0, 2.4, 7].map(t => cleanInk(DASH_CLEAN, 'thinking', t, true))).size).toBe(1)
    expect(cleanPulse(1.2)).toBeGreaterThan(1)
    expect(cleanPulse(3.6)).toBeLessThan(1)
    expect(cleanPulse(1.2, true)).toBe(1)
  })

  it('follows the theme palette, falling back to Dash black and gold', () => {
    expect(cleanPalette(undefined)).toBe(DASH_CLEAN)
    const layers: [string, string, string] = ['#99A362', '#4FA5B3', '#181f23']
    const wal = { accent: '#C8BE72', glow: '#d6cc85', error: '#ff0000', bg: '#181f23', success: '#6D8F57', layers, samples: ['#929b98'] }
    // The glow is the accent's near twin; the drift goes to the palette's teal, the hue farthest from gold.
    expect(cleanPalette(wal)).toEqual({ accent: '#C8BE72', alt: '#4FA5B3', error: '#ff0000', bg: '#181f23' })
    expect(cleanPalette({ ...wal, layers: ['#c8be70', '#c0b670', '#181f23'], success: '#cfc070', samples: [] }).alt).toBe(DASH_CLEAN.alt)
  })
})

describe('clean frames', () => {
  it('draws the library orb, breathing, with no glow or filter in the orb', () => {
    const a = cleanOrbSvg(DASH_CLEAN, 'thinking', 0)
    const b = cleanOrbSvg(DASH_CLEAN, 'thinking', 1.2)
    expect(a).toMatch(/^<svg /)
    expect(a).not.toBe(b)
    expect(a).toMatch(/<(circle|line) /)
    expect(a + b).not.toMatch(/filter|blur|glow/i)
    expect(cleanOrbSvg(DASH_CLEAN, 'idle', 0, true)).toBe(cleanOrbSvg(DASH_CLEAN, 'idle', 5, true))
  })

  it("draws the ring's arc for the share left, its glow under the arc only", () => {
    const half = cleanRingSvg(DASH_CLEAN, 25, 50, DASH_CLEAN.accent)
    const [, on, len] = /stroke-dasharray="([\d.]+) ([\d.]+)"/.exec(half) ?? []
    expect(Number(on) / Number(len)).toBeCloseTo(0.5, 2)
    expect(half.match(/stroke-dasharray/g)).toHaveLength(4)
    expect(cleanRingSvg(DASH_CLEAN, 0, 50, DASH_CLEAN.accent)).not.toMatch(/stroke-dasharray/)
  })
})

describe('CleanView', () => {
  const view = () => {
    const stylesheet = vi.fn<Surface['stylesheet']>()
    const send = vi.fn<Surface['send']>()
    const blob = vi.fn((bytes: Uint8Array) => `blob:${bytes.length}:${Buffer.from(bytes).toString('base64').slice(-12)}`)
    const changed = vi.fn()
    const surface = stub<Surface>({ stylesheet, send, blocked: false, closed: false })
    const v = new CleanView(stub<Session>({ blob, caps: { dark: true, reduceMotion: false } }), surface, () => DASH_CLEAN, changed)
    return { v, stylesheet, send, changed }
  }

  it('draws the ring, the orb and the minutes with its sheet', () => {
    vi.useFakeTimers({ now: T0 })
    const { v, stylesheet, send } = view()
    expect(v.node()).toBeNull()
    block(25)
    cleanFocus.enter()
    v.update('thinking')
    const node = v.node()
    const text = flat(node)
    expect(text).toContain('glide.clean.orb')
    expect(text).toContain('glide.clean.ring')
    expect(text).toContain('25 min left')
    expect(stylesheet).toHaveBeenLastCalledWith(CLEAN_SHEET, CLEAN_CSS)
    vi.advanceTimersByTime(100)
    expect(send).toHaveBeenCalledWith([['set', 'layer.clean.ring.orb.img', expect.objectContaining({ blob: expect.any(String) })]])
    v.close()
  })

  it('restores the pane and stops animating once the clean view leaves', () => {
    vi.useFakeTimers({ now: T0 })
    const { v, stylesheet, send } = view()
    block(25)
    cleanFocus.enter()
    v.node()
    cleanFocus.exit()
    expect(v.node()).toBeNull()
    expect(stylesheet).toHaveBeenLastCalledWith(CLEAN_SHEET, '')
    send.mockClear()
    vi.advanceTimersByTime(20_000)
    expect(send).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stays still under reduced motion', () => {
    vi.useFakeTimers({ now: T0 })
    const send = vi.fn<Surface['send']>()
    const v = new CleanView(
      stub<Session>({ blob: (b: Uint8Array) => Buffer.from(b).toString('base64'), caps: { dark: true, reduceMotion: true } }),
      stub<Surface>({ stylesheet: vi.fn(), send, blocked: false, closed: false }), () => DASH_CLEAN, vi.fn())
    block(25)
    cleanFocus.enter()
    v.update('thinking')
    v.node()
    vi.advanceTimersByTime(2000)
    expect(send).not.toHaveBeenCalled()
    v.close()
  })
})
