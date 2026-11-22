// The launch splash's shell: it owns the clock, the skip, the cap and the hand-off, and nothing about
// the picture (art.ts). It draws on its own `screen` surface above the session chrome and closes it
// when done. Ported from Hermes ui-tsp's LaunchSplash (same lifecycle rules), drawn as one image.
import type { JSX, Session, Surface, TspEvent } from '@stencil-hq/tern'
import type { GatewayClient } from '@hermes/shared/gateway-client'
import type { AnyGatewayEvent } from '@hermes/shared/gateway-types'

import { ART_H, ART_W, artInk, HOLD_CYCLE_MS, SPLASH_EXIT_MS, SPLASH_INTRO_MS, splashSvg } from './art.js'

/** Never hold the app hostage: past this the splash hands over whatever the gateway is doing. */
export const SPLASH_MAX_MS = 15_000
export const SPLASH_ROLE = 'glide.splash'
const FPS = 30
const FRAME_MS = 1000 / FPS

/** `GLIDE_SPLASH=0|off|false|no` disables it; a launch with a first prompt or a restored pane skips it. */
export function splashEnabled(env: Readonly<Record<string, string | undefined>>, launch: { query: string; restored: boolean }): boolean {
  return !/^(?:0|false|no|off)$/i.test((env['GLIDE_SPLASH'] ?? '').trim()) && !launch.query && !launch.restored
}

/** What the splash needs from the Tern session. */
export interface SplashTern {
  open(options: { id: string; mode: 'screen'; role: string; title: string }): Pick<Surface, 'closed' | 'blocked' | 'render' | 'stylesheet' | 'close'>
  blob(bytes: Uint8Array, mime?: string): string
  readonly caps: { readonly cols: number; readonly dark?: boolean; readonly reduceMotion?: boolean }
}

type Timer = ReturnType<typeof setInterval> | number

export interface LaunchSplashOptions {
  tern: SplashTern
  /** Called once, after the splash's surface is closed. */
  onDone: () => void
  now?: () => number
  setInterval?: (fn: () => void, ms: number) => Timer
  clearInterval?: (handle: Timer) => void
}

const STYLES = [
  `[data-role='${SPLASH_ROLE}'] { position: absolute; inset: 0; align-items: center; justify-content: center; }`,
  `[data-role='${SPLASH_ROLE}'] img { max-width: 100%; height: auto; }`
].join('\n')

/** Plays the intro until the app is ready (or a key, or the cap), then fades and hands off. */
export class LaunchSplash {
  readonly #o: LaunchSplashOptions
  readonly #now: () => number
  readonly #frames = new Map<string, string>()
  #surface: ReturnType<SplashTern['open']> | undefined
  #timer: Timer | undefined
  #startedAt = 0
  #exitAt: number | null = null
  #ready = false
  #done = false
  #dark: boolean
  #reduce: boolean
  #visible = true

  constructor(options: LaunchSplashOptions) {
    this.#o = options
    this.#now = options.now ?? (() => performance.now())
    this.#dark = Boolean(options.tern.caps.dark)
    this.#reduce = Boolean(options.tern.caps.reduceMotion)
  }

  /** Whether the splash still owns the pane (and the keys). */
  get active(): boolean {
    return this.#surface !== undefined && !this.#done
  }

  start() {
    if (this.#surface || this.#done) return
    this.#surface = this.#o.tern.open({ id: 'splash', mode: 'screen', role: SPLASH_ROLE, title: 'glide' })
    this.#surface.stylesheet('splash', STYLES)
    this.#startedAt = this.#now()
    this.tick()
    this.#schedule()
  }

  /** Startup work is finished: play out the intro, then leave. */
  ready() {
    this.#ready = true
    if (this.active && !this.#timer) this.tick()
  }

  /** Any key: leave now (the key is spent). */
  skip() {
    if (this.active && this.#exitAt === null) this.#exitAt = this.#elapsed()
    if (this.active && !this.#timer) this.tick()
  }

  /** Consume the key used to skip; it must not reach the composer. */
  consumeKey(): boolean {
    if (!this.active) return false
    this.skip()
    return true
  }

  /** Process splash surface events before the app filters them by surface owner. */
  event(ev: TspEvent): boolean {
    if (!this.active) return false
    if (ev.ev === 'gone' && ev.ids.includes('splash')) {
      this.dismiss()
      return true
    }
    const mine = 'sf' in ev && ev.sf === 'splash'
    if (!('sf' in ev) || !ev.sf || mine) {
      if (ev.ev === 'theme') this.environment({ dark: ev.dark })
      if (ev.ev === 'motion') this.environment({ reduce: ev.reduce })
      if ((ev.ev === 'visible' || ev.ev === 'resize') && ev.visible !== undefined) {
        this.environment({ visible: ev.visible })
      }
    }
    return mine
  }

  /** A modal or a request needs the pane immediately, without waiting for the fade. */
  dismiss() {
    if (this.active) this.#finish()
  }

  /** Pane-local policy: frames stop while hidden or under Reduce Motion; the cap and the hand-off do not. */
  environment(options: { dark?: boolean; reduce?: boolean; visible?: boolean }) {
    if (!this.active) return
    this.#dark = options.dark ?? this.#dark
    this.#reduce = options.reduce ?? this.#reduce
    this.#visible = options.visible ?? this.#visible
    this.tick()
    this.#schedule()
  }

  /** Draws the current frame and advances the hand-off. Public for deterministic tests. */
  tick() {
    const surface = this.#surface
    if (!surface || this.#done) return
    const ms = this.#elapsed()
    if (this.#exitAt === null && ((this.#ready && (ms >= SPLASH_INTRO_MS || this.#reduce)) || ms >= SPLASH_MAX_MS)) {
      this.#exitAt = ms
    }
    if (this.#exitAt !== null && (ms - this.#exitAt >= SPLASH_EXIT_MS || this.#reduce || !this.#visible)) {
      this.#finish()
      return
    }
    if (surface.closed) {
      this.#finish()
      return
    }
    if (this.#visible && !surface.blocked) surface.render(this.#node(ms))
  }

  #elapsed() {
    return this.#now() - this.#startedAt
  }

  #schedule() {
    const run = this.active && this.#visible && !this.#reduce
    if (!run) {
      this.#stop()
    } else if (!this.#timer) {
      const every = this.#o.setInterval ?? ((fn, ms) => setInterval(fn, ms).unref())
      this.#timer = every(() => this.tick(), FRAME_MS)
    }
  }

  #stop() {
    if (this.#timer !== undefined) (this.#o.clearInterval ?? clearInterval)(this.#timer)
    this.#timer = undefined
  }

  #finish() {
    if (this.#done) return
    this.#done = true
    this.#stop()
    void this.#surface?.close()
    this.#o.onDone()
  }

  #node(ms: number): JSX.Element {
    // Intro frames are unique; hold frames repeat on the art's cycle, so blobs stay bounded.
    const intro = SPLASH_INTRO_MS
    const frame = Math.round((ms < intro ? ms : intro + ((ms - intro) % HOLD_CYCLE_MS)) / FRAME_MS)
    const exit = this.#exitAt === null ? null : Math.round((ms - this.#exitAt) / FRAME_MS)
    const key = `${this.#dark}:${this.#reduce}:${frame}:${exit}`
    let blob = this.#frames.get(key)
    if (!blob) {
      const at = frame * FRAME_MS
      const svg = splashSvg(at, artInk(this.#dark), exit === null ? null : at - exit * FRAME_MS, this.#reduce)
      blob = this.#o.tern.blob(Buffer.from(svg), 'image/svg+xml')
      // Exit frames are one-offs: do not keep them.
      if (exit === null) this.#frames.set(key, blob)
    }
    const w = Math.max(240, Math.min(620, this.#o.tern.caps.cols * 8 - 48))
    return (
      <col key="splash" role={SPLASH_ROLE} gap="none">
        <image key="art" blob={blob} alt="glide" w={w} h={Math.round((w * ART_H) / ART_W)} />
      </col>
    )
  }
}


export function startSplash(tern: Session, gateway: GatewayClient, launch: Parameters<typeof splashEnabled>[1], onDone: () => void): LaunchSplash | undefined {
  if (!tern.caps.features.includes('blobs') || !splashEnabled(process.env, launch)) return undefined
  const splash = new LaunchSplash({
    tern,
    onDone: () => {
      gateway.off('event', onEvent)
      gateway.off('exit', onExit)
      onDone()
    }
  })
  const onEvent = (event: AnyGatewayEvent) => {
    if (event.type === 'gateway.ready') splash.ready()
  }
  const onExit = () => splash.ready()
  gateway.on('event', onEvent)
  gateway.on('exit', onExit)
  splash.start()
  return splash.active ? splash : undefined
}
