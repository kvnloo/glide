// The live call's helper lanes (fast / small / large / council) beside the thinking orb: each lane's
// role, bound model, real state, what it is working on and its newest blackboard entry. Everything shown
// comes from the lane broker's GET /v1/lanes/status (z0live); no lane activity is ever inferred here, and
// a dead lane renders as dead.
import { readFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import type { JSX, Session, Surface } from '@stencil-hq/tern'

import { type OrbState, ThinkingOrb } from '../chrome/orb.js'
import { laneSwatch, orbitScene, orbitSvg } from './orbit.js'

export const LANE_STATES = ['idle', 'thinking', 'answered', 'verified', 'corrected', 'dead'] as const
export type LaneState = (typeof LANE_STATES)[number]

export interface LaneEntry { text: string; confidence: number; status: string; kind: string }
export interface Lane {
  role: string
  model: string
  resolved: string | null
  state: LaneState
  researching: string | null
  error: string | null
  entry: LaneEntry | null
}
export interface LaneCall { sessionId: string; open: boolean; revision: string; lanes: Lane[] }

const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** The broker's status, or null when it is not a well-formed lane call. Unknown states are refused. */
export function parseLaneStatus(v: unknown): LaneCall | null {
  if (!obj(v) || !Array.isArray(v['lanes'])) return null
  if (v['session_id'] === null && !v['lanes'].length) return { sessionId: '', open: false, revision: '', lanes: [] } // no call yet
  if (!str(v['session_id'])) return null
  const lanes: Lane[] = []
  for (const l of v['lanes']) {
    if (!obj(l) || !str(l['role']) || !str(l['model'])) return null
    const state = LANE_STATES.find(s => s === l['state'])
    if (!state) return null
    const e = l['entry']
    lanes.push({
      role: String(l['role']),
      model: String(l['model']),
      resolved: str(l['resolved']),
      state,
      researching: str(l['researching']),
      error: str(l['error']),
      entry: obj(e) && str(e['text'])
        ? { text: String(e['text']), confidence: Number(e['confidence']) || 0, status: String(e['status'] ?? 'draft'), kind: String(e['kind'] ?? '') }
        : null
    })
  }
  return { sessionId: String(v['session_id']), open: v['open'] === true, revision: str(v['revision']) ?? '', lanes }
}

type Fetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface LaneFeedOptions {
  url: string
  token: string
  changed(): void
  fetch?: Fetch
  /** Poll period while a call is open or live voice runs; slower otherwise, only to notice a new call. */
  fastMs?: number
  slowMs?: number
}

/** Polls the lane broker. `call` is the newest call's real lane state; `error` says why there is none. */
export class LaneFeed {
  call: LaneCall | null = null
  error = ''
  active = false
  readonly #o: Required<Omit<LaneFeedOptions, 'fetch'>> & { fetch: Fetch }
  #timer: NodeJS.Timeout | undefined
  #last = ''
  #stopped = false

  constructor(o: LaneFeedOptions) {
    this.#o = { fastMs: 1000, slowMs: 5000, ...o, fetch: o.fetch ?? ((url, init) => globalThis.fetch(url, init)) }
  }

  start() {
    this.#stopped = false
    if (!this.#timer) void this.poll()
  }

  stop() {
    this.#stopped = true
    clearTimeout(this.#timer)
    this.#timer = undefined
  }

  async poll(): Promise<void> {
    clearTimeout(this.#timer)
    this.#timer = undefined
    let call: LaneCall | null = null
    let error = ''
    try {
      const res = await this.#o.fetch(this.#o.url.replace(/\/$/, '') + '/v1/lanes/status', {
        headers: { Authorization: 'Bearer ' + this.#o.token },
        signal: AbortSignal.timeout(2500)
      })
      if (!res.ok) error = `lane broker answered ${res.status}`
      else {
        call = parseLaneStatus(await res.json())
        if (!call) error = 'lane broker sent no lane call'
      }
    } catch (e) {
      error = 'lane broker unreachable' + (e instanceof Error && e.name !== 'Error' ? ` (${e.name})` : '')
    }
    const key = JSON.stringify([call, error])
    if (key !== this.#last) {
      this.#last = key
      this.call = call
      this.error = error
      this.#o.changed()
    }
    if (!this.#stopped) {
      this.#timer = setTimeout(() => void this.poll(), this.active || call?.open ? this.#o.fastMs : this.#o.slowMs)
      this.#timer.unref()
    }
  }
}

const TOKEN_PATH = '.config/z0live/hermes-mobile-relay.token'

/** The relay token: $GLIDE_LANES_TOKEN_FILE, else ~/.config/z0live (the real user's home too, under a private $HOME). */
export function laneToken(env = process.env): string {
  const real = (() => { try { return userInfo().homedir } catch { return '' } })()
  const files = env['GLIDE_LANES_TOKEN_FILE'] ? [env['GLIDE_LANES_TOKEN_FILE']] : [...new Set([homedir(), real].filter(Boolean))].map(h => join(h, TOKEN_PATH))
  for (const file of files) {
    try {
      const token = readFileSync(file, 'utf8').trim()
      if (token) return token
    } catch { /* next */ }
  }
  return ''
}

/** The feed for this machine's lane broker; null (no strip at all) without its relay token. */
export function laneFeedFromEnv(changed: () => void, env = process.env): LaneFeed | null {
  if (env['GLIDE_LANES'] === 'off' || env['VITEST']) return null
  const token = laneToken(env)
  if (!token) return null
  return new LaneFeed({ url: env['GLIDE_LANES_URL'] || 'http://127.0.0.1:8791', token, changed })
}

/** Lane orb animation: only a lane with a job in flight moves; every other state is the still frame. */
export const LANE_ORB: Readonly<Record<LaneState, OrbState>> = {
  thinking: 'thinking',
  idle: 'idle',
  answered: 'idle',
  verified: 'idle',
  corrected: 'idle',
  dead: 'error'
}

const ROLE_ORDER = ['fast', 'small', 'large', 'council']
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function entryLine(e: LaneEntry): string {
  const what = e.kind === 'intent' ? 'intent' : e.status === 'draft' ? `draft ${e.confidence.toFixed(2)}` : e.status
  return `${what} · “${clip(e.text, 90)}”`
}

/** The lane strip under the live controls, with one small orb per lane. */
export class LaneStrip {
  readonly #feed: LaneFeed
  readonly #tern: Session
  #surface: Surface
  #orbs: ThinkingOrb[] = []
  #env: { dark?: boolean; reduce?: boolean; visible?: boolean } = {}
  #live = false
  #orbit: ThinkingOrb | undefined
  readonly #swatches = new Map<string, string>()

  constructor(feed: LaneFeed, tern: Session, surface: Surface) {
    this.#feed = feed
    this.#tern = tern
    this.#surface = surface
  }

  /** A recovered surface gets fresh animators. */
  surface(surface: Surface) {
    this.close()
    this.#surface = surface
  }

  environment(options: { dark?: boolean; reduce?: boolean; visible?: boolean }) {
    this.#env = { ...this.#env, ...options }
    for (const orb of this.#orbs) orb.environment(options)
    this.#orbit?.environment(options)
  }

  close() {
    for (const orb of this.#orbs) orb.close()
    this.#orbs = []
    this.#orbit?.close()
    this.#orbit = undefined
  }

  /** True while the lanes orbit the voice orb (focus block + live voice + a lane), not the strip. */
  get orbiting(): boolean {
    return this.#orbit !== undefined
  }

  /** The newest call's lanes while it is open, or while this pane's live voice runs (their real health, call closed or not). */
  lanes(): Lane[] {
    const lanes = this.#feed.call?.open || this.#live ? this.#feed.call?.lanes ?? [] : []
    return [...lanes].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
  }

  /** Per frame: lane orb states follow the newest status. In a focus block with live voice, one scene orbits them around `main`. */
  update(liveVoice: boolean, paused = false, main: OrbState = 'idle', focus = false) {
    this.#live = liveVoice
    this.#feed.active = liveVoice
    const lanes = this.lanes()
    if (focus && liveVoice && lanes.length) {
      for (const orb of this.#orbs) orb.close()
      this.#orbs = []
      if (!this.#orbit) {
        const current = () => this.lanes()
        this.#orbit = new ThinkingOrb(this.#tern, this.#surface, {
          node: 'dock.live-lanes.orbit', label: 'Voice and lanes', scene: {
            get w() { return orbitScene(current()).w },
            get h() { return orbitScene(current()).h },
            key: () => this.lanes().map(l => `${l.role}=${l.state}`).join(','),
            svg: (state, seconds, dark, reduce) => orbitSvg(state, this.lanes(), seconds, dark, reduce)
          }
        })
        this.#orbit.environment(this.#env)
      }
      this.#orbit.update(main, paused)
      return
    }
    this.#orbit?.close()
    this.#orbit = undefined
    for (const orb of this.#orbs.splice(lanes.length)) orb.close()
    while (this.#orbs.length < lanes.length) {
      const i = this.#orbs.length
      const orb = new ThinkingOrb(this.#tern, this.#surface, { node: `dock.live-lanes.l${i}.orb`, size: 14, label: 'Lane' })
      orb.environment(this.#env)
      this.#orbs.push(orb)
    }
    lanes.forEach((lane, i) => this.#orbs[i]?.update(LANE_ORB[lane.state], paused))
  }

  #swatch(lane: Lane) {
    const dark = Boolean(this.#env.dark ?? this.#tern.caps.dark)
    const key = `${lane.role}:${lane.state === 'dead'}:${dark}`
    let blob = this.#swatches.get(key)
    if (!blob) {
      blob = this.#tern.blob(Buffer.from(laneSwatch(lane, dark)), 'image/svg+xml')
      this.#swatches.set(key, blob)
    }
    return { blob, alt: `${lane.role} lane${lane.state === 'dead' ? ', dead' : ''}`, w: 14, h: 14 }
  }

  /** Shown while the lane broker has an open call, or while this pane's live voice runs (then it says why it is empty). */
  node(): JSX.Element | null {
    const call = this.#feed.call
    const lanes = this.lanes()
    if (!lanes.length && !this.#live) return null
    const head = lanes.length
      ? `Lanes · ${call?.revision ?? ''}${call?.open ? '' : ' · no open call'}`
      : this.#feed.error
        ? `Lanes · ${this.#feed.error}`
        : 'Lanes · no open lane call (the lane broker runs the Hermes app Live path)'
    const rows = lanes.map((lane, i) => (
      <row align="start" gap="sm" key={`l${i}`} role="omp.live.lane">
        {this.#orbit
          ? <image key="key" role="omp.live.lane.key" {...this.#swatch(lane)} />
          : this.#orbs[i] ? <image key="orb" role="omp.live.lane.orb" {...this.#orbs[i].props()} /> : null}
        <col key="text">
          <text key="who" spans={[
            { s: 'strong', t: lane.role },
            { s: 'muted', t: ' · ' + (lane.resolved && lane.resolved !== lane.model ? `${lane.model}→${lane.resolved}` : lane.model) + ' · ' },
            lane.state === 'dead'
              ? { s: 'error', t: 'dead' + (lane.error ? ` (${clip(lane.error, 60)})` : '') }
              : lane.state === 'corrected' ? { s: 'warning', t: 'corrected' }
                : lane.state === 'verified' ? { s: 'success', t: 'verified' }
                  : { t: lane.state }
          ]} wrap="none" />
          {lane.researching ? <text key="doing" spans={[{ s: 'dim', t: (lane.state === 'thinking' ? 'researching: ' : 'last: ') + clip(lane.researching, 100) }]} wrap="none" /> : null}
          {lane.entry ? <text key="entry" spans={[{ s: 'muted', t: entryLine(lane.entry) }]} wrap="none" /> : null}
        </col>
      </row>
    ))
    return (
      <col gap={this.#orbit ? 'sm' : 'none'} key="live-lanes" role="omp.live.lanes">
        <text key="head" spans={[{ s: 'muted', t: head }]} wrap="none" />
        {this.#orbit
          // The orbit stands beside the lane list, which spreads to its height: top and bottom aligned, then a gap above the composer.
          ? <row key="orbit" align="stretch" gap="md" role="omp.live.lanes.orbit">
            <image key="scene" {...this.#orbit.props()} />
            <col grow={1} justify="between" key="rows" min={{ w: 0 }}>{rows}</col>
          </row>
          : rows}
        {this.#orbit ? <spacer key="gap" size="lg" /> : null}
      </col>
    )
  }
}
