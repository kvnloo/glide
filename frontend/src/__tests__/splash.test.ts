import { describe, expect, it } from 'vitest'

import { artInk, HOLD_CYCLE_MS, SPLASH_EXIT_MS, SPLASH_INTRO_MS, splashSvg } from '../splash/art.js'
import { LaunchSplash, SPLASH_MAX_MS, splashEnabled, type SplashTern } from '../splash/launch.js'

function harness(caps: Partial<SplashTern['caps']> = {}) {
  let now = 0
  let interval: (() => void) | undefined
  const renders: unknown[] = []
  const blobs: string[] = []
  const surface = { closed: false, blocked: false, render: (v: unknown) => renders.push(v), stylesheet: () => {}, close: async () => { surface.closed = true } }
  const tern: SplashTern = {
    caps: { cols: 120, dark: true, ...caps },
    open: () => surface,
    blob: bytes => { blobs.push(Buffer.from(bytes).toString()); return `b${blobs.length}` }
  }
  let done = 0
  const splash = new LaunchSplash({
    tern,
    onDone: () => { done++ },
    now: () => now,
    setInterval: fn => { interval = fn; return 1 },
    clearInterval: () => { interval = undefined }
  })
  const advance = (ms: number) => {
    for (let t = 0; t < ms; t += 10) { now += 10; interval?.() }
  }
  return { splash, surface, renders, blobs, advance, done: () => done, ticking: () => interval !== undefined }
}

describe('splash art', () => {
  it('starts with the orb alone and ends with the word written', () => {
    const early = splashSvg(500, artInk(true))
    const late = splashSvg(SPLASH_INTRO_MS, artInk(true))
    expect(early).not.toContain('<path')
    expect(late).toContain('<path')
    expect(late).toContain('<circle')
  })

  it('repeats hold frames on its cycle and fades out on exit', () => {
    const t = SPLASH_INTRO_MS + 400
    expect(splashSvg(t, artInk(false))).toBe(splashSvg(t + HOLD_CYCLE_MS, artInk(false)))
    expect(splashSvg(t + SPLASH_EXIT_MS, artInk(true), t)).toContain('opacity="0.000"')
  })
})

describe('splashEnabled', () => {
  it('honours GLIDE_SPLASH and skips prompted or restored launches', () => {
    expect(splashEnabled({}, { query: '', restored: false })).toBe(true)
    expect(splashEnabled({ GLIDE_SPLASH: 'off' }, { query: '', restored: false })).toBe(false)
    expect(splashEnabled({}, { query: 'hi', restored: false })).toBe(false)
    expect(splashEnabled({}, { query: '', restored: true })).toBe(false)
  })
})

describe('LaunchSplash', () => {
  it('plays the whole intro even when the gateway is ready at once, then hands off', () => {
    const h = harness()
    h.splash.start()
    h.splash.ready()
    h.advance(SPLASH_INTRO_MS - 50)
    expect(h.splash.active).toBe(true)
    h.advance(SPLASH_EXIT_MS + 200)
    expect(h.splash.active).toBe(false)
    expect(h.surface.closed).toBe(true)
    expect(h.done()).toBe(1)
    expect(h.ticking()).toBe(false)
  })

  it('holds until ready, with a bounded set of frame blobs', () => {
    const h = harness()
    h.splash.start()
    // Stay under SPLASH_MAX_MS: the cap's exit frames are one-offs by design.
    h.advance(SPLASH_INTRO_MS + HOLD_CYCLE_MS + 100)
    expect(h.splash.active).toBe(true)
    const distinct = h.blobs.length
    h.advance(HOLD_CYCLE_MS - 200)
    expect(h.blobs.length).toBe(distinct)
    h.splash.ready()
    h.advance(SPLASH_EXIT_MS + 100)
    expect(h.done()).toBe(1)
  })

  it('leaves at the cap without readiness', () => {
    const h = harness()
    h.splash.start()
    h.advance(SPLASH_MAX_MS + SPLASH_EXIT_MS + 100)
    expect(h.done()).toBe(1)
  })

  it('a key fades it out at once; dismiss closes without the fade', () => {
    const h = harness()
    h.splash.start()
    h.advance(300)
    h.splash.skip()
    h.advance(SPLASH_EXIT_MS + 50)
    expect(h.done()).toBe(1)

    const m = harness()
    m.splash.start()
    m.splash.dismiss()
    expect(m.splash.active).toBe(false)
    expect(m.surface.closed).toBe(true)
    expect(m.done()).toBe(1)
  })

  it('draws one still frame under Reduce Motion and leaves as soon as ready', () => {
    const h = harness({ reduceMotion: true })
    h.splash.start()
    expect(h.ticking()).toBe(false)
    expect(h.renders.length).toBe(1)
    h.splash.ready()
    expect(h.done()).toBe(1)
  })
})
