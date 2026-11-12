// The live call's helper lanes (fast / small / large / council) beside the thinking orb: each lane's
// role, bound model, real state, what it is working on and its newest blackboard entry. Everything shown
// comes from the lane broker's GET /v1/lanes/status (z0live); no lane activity is ever inferred here, and
// a dead lane renders as dead.
import { readFileSync } from 'node:fs'
import { isIP } from 'node:net'
import { html, type JSX, type Session, type Surface } from '@stencil-hq/tern'

import { type OrbState, ThinkingOrb } from '../chrome/orb.js'
import { laneModel, providerHue } from './catalog.js'
import { laneSwatch, type OrbitLane, orbitBackdrop, orbitScene } from './orbit.js'
import { badgeSvg, HIT, ORBIT_CLASS, ORBIT_SHEET, orbitCss, orbitSeats, planetSvg, tailSvg } from './orbitTargets.js'

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
      researching: speech(str(l['researching'])),
      error: str(l['error']),
      entry: obj(e) && str(e['text'])
        ? { text: speech(String(e['text'])) ?? '', confidence: Number(e['confidence']) || 0, status: String(e['status'] ?? 'draft'), kind: String(e['kind'] ?? '') }
        : null
    })
  }
  return { sessionId: String(v['session_id']), open: v['open'] === true, revision: str(v['revision']) ?? '', lanes }
}

/** Lane text as a person reads it: drops a model's leading 'answer:' style label and trailing [key=value] router tags. */
export function speech(s: string | null): string | null {
  if (s === null) return null
  return s.replace(/\s*\[[a-z_]+=[^\]]*\]/gi, '').replace(/^\s*(answer|intent|reply|draft)\s*:\s*/i, '').trim()
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
      if (!res.ok) error = res.status === 401 || res.status === 403 ? 'lane broker refused this device' : 'lane broker is not answering'
      else {
        call = parseLaneStatus(await res.json())
        if (!call) error = 'waiting for a voice call'
      }
    } catch (e) {
      error = 'lane broker is offline'
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

/**
 * The relay token, read only from the file the user named: the plugin setting `lanes_token_file`
 * (the launcher passes it as $GLIDE_LANES_TOKEN_FILE) or that variable set explicitly. No default path.
 */
export function laneToken(env = process.env): string {
  const file = env['GLIDE_LANES_TOKEN_FILE']
  if (!file) return ''
  try {
    return readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
}

/** An http(s) URL on this machine: 127.0.0.0/8, ::1 or localhost. The bearer token goes nowhere else. */
export function loopbackUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost') return true
  return isIP(host) === 4 ? host.startsWith('127.') : host === '::1'
}

/** The feed for this machine's lane broker; null (no strip at all) without its relay token. */
export function laneFeedFromEnv(changed: () => void, env = process.env): LaneFeed | null {
  if (env['GLIDE_LANES'] === 'off' || env['VITEST']) return null
  const url = env['GLIDE_LANES_URL'] || 'http://127.0.0.1:8791'
  if (!loopbackUrl(url)) return null
  const token = laneToken(env)
  if (!token) return null
  return new LaneFeed({ url, token, changed })
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

/** The dock column holding the live-voice lines and the lanes, keyed without a role. */
const LIVE_DOCK = 'dock.live'
/** The lanes' node id inside it; the animators address their images under it. */
export const LANES_ID = `${LIVE_DOCK}.lanes`

/** The head's human summary, `3 fast · 2 small · 1 large`: the broker's revision id is never shown. */
export function laneCounts(lanes: readonly { role: string }[]): string {
  const n = new Map<string, number>()
  for (const l of lanes) n.set(l.role, (n.get(l.role) ?? 0) + 1)
  const order = [...ROLE_ORDER, ...[...n.keys()].filter(r => !ROLE_ORDER.includes(r))]
  return order.flatMap(r => (n.get(r) ? [`${n.get(r)} ${r}`] : [])).join(' · ')
}

/**
 * The live-voice lines and the lanes as one role-less dock column. Tern's chat reader centres a role-less
 * dock column's children on the composer's own track (\`.sf-dock > .sf-col:not([data-role]) > *\`: centred,
 * 100% - 32px, at most 720px), so they share the composer's left edge and width without any pixel numbers here.
 */
export function liveDock(voice: JSX.Element | null, lanes: JSX.Element | null): JSX.Element | null {
  if (!voice && !lanes) return null
  return <col gap="sm" key={LIVE_DOCK.slice('dock.'.length)}>{voice}{lanes}</col>
}

/** A lane as the orbit draws it: its planet wears its provider's hue. */
export const orbitLane = (lane: Lane, dark: boolean): OrbitLane => ({ role: lane.role, state: lane.state, hue: providerHue(laneModel(lane.model, lane.resolved).provider, dark) })
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/**
 * The one short quote a lane line carries: its blackboard entry, else what it researches, as speech (never a
 * router tag such as [kind=simple]). Null for a dead lane, or when an earlier lane already said it.
 */
export function laneQuote(lane: Pick<Lane, 'state' | 'entry' | 'researching'>, said: Set<string>): string | null {
  if (lane.state === 'dead') return null
  const quote = speech(lane.entry?.text ?? lane.researching)
  if (!quote || said.has(quote.toLowerCase())) return null
  said.add(quote.toLowerCase())
  return quote
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
  readonly #select: ((index: number, lane: Lane) => void) | undefined
  #sheet = ''

  /** `select` runs when a planet is clicked: the lane's index in lanes() (the popup's row order) and the lane. */
  constructor(feed: LaneFeed, tern: Session, surface: Surface, select?: (index: number, lane: Lane) => void) {
    this.#feed = feed
    this.#tern = tern
    this.#surface = surface
    this.#select = select
  }

  /** A recovered surface gets fresh animators (and the orbit's stylesheet again). */
  surface(surface: Surface) {
    this.close()
    this.#surface = surface
    this.#sheet = ''
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
          // The planets are pointer targets animated by the orbit's stylesheet; this image is the tracks and the orb.
          node: `${LANES_ID}.orbit.scene.bg`, label: 'Voice and lanes', scene: {
            get w() { return orbitScene(current()).w },
            get h() { return orbitScene(current()).h },
            moves: false,
            key: () => this.lanes().map(l => `${l.role}=${l.state === 'dead'}`).join(','),
            svg: (state, seconds, dark, reduce) => orbitBackdrop(state, this.lanes().map(l => orbitLane(l, dark)), seconds, dark, reduce)
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
      const orb = new ThinkingOrb(this.#tern, this.#surface, { node: `${LANES_ID}.l${i}.orb`, size: 14, label: 'Lane' })
      orb.environment(this.#env)
      this.#orbs.push(orb)
    }
    lanes.forEach((lane, i) => this.#orbs[i]?.update(LANE_ORB[lane.state], paused))
  }

  #image(key: string, svg: () => string) {
    let blob = this.#swatches.get(key)
    if (!blob) {
      blob = this.#tern.blob(Buffer.from(svg()), 'image/svg+xml')
      this.#swatches.set(key, blob)
    }
    return blob
  }

  /**
   * The orbit: the tracks-and-orb image with one native button per lane riding a CSS arm over it. Tern sends
   * no hover events, so hovering is the stylesheet's (orbitTargets.ts): the arms stop, the planets wobble,
   * and the one under the pointer names its lane. A click selects the lane (its row in the lanes popup).
   */
  #orbitNode(lanes: readonly Lane[]): JSX.Element | null {
    if (!this.#orbit) return null
    const dark = Boolean(this.#env.dark ?? this.#tern.caps.dark)
    const reduce = Boolean(this.#env.reduce ?? this.#tern.caps.reduceMotion)
    const drawn = lanes.map(l => orbitLane(l, dark))
    const css = orbitCss(drawn, reduce)
    if (css !== this.#sheet) {
      this.#sheet = css
      this.#surface.stylesheet(ORBIT_SHEET, css)
    }
    const seats = orbitSeats(drawn, reduce)
    const badge = this.#image(`badge:${dark}`, () => badgeSvg(dark))
    return (
      <html.div class={ORBIT_CLASS + (reduce ? ` ${ORBIT_CLASS}-still` : '')} key="scene" role="glide.orbit">
        <image key="bg" role="glide.orbit.bg" {...this.#orbit.props()} />
        {lanes.map((lane, i) => {
          const d = drawn[i]
          const seat = seats[i]
          if (!d || !seat) return null
          const name = `${laneModel(lane.model, lane.resolved).label} · ${lane.role}`
          const face = this.#image(`planet:${d.role}:${d.hue}:${d.state === 'thinking' ? 't' : d.state === 'dead' ? 'd' : 'i'}:${dark}`, () => planetSvg(d, dark))
          const tail = seat.moving ? this.#image(`tail:${d.role}:${d.hue}:${Math.round(seat.arm)}:${dark}`, () => tailSvg(d, seat, dark)) : null
          return (
            <html.div class={`glide-orbit-arm glide-orbit-s${i}`} key={`p${i}`}>
              <html.div class="glide-orbit-brake" key="b">
                {tail ? <html.div class="glide-orbit-tail" key="tail"><image key="img" blob={tail} alt="" w={Math.round(seat.arm)} h={Math.round(seat.arm)} /></html.div> : null}
                <html.button
                  aria={`${name}${lane.state === 'dead' ? ', dead' : ''}: select this lane`}
                  attrs={{ 'data-lane': lane.role, 'data-lane-index': i }}
                  class="glide-orbit-planet"
                  key="hit"
                  onClick={() => this.#select?.(i, lane)}
                  role="glide.orbit.planet"
                >
                  <html.div class="glide-orbit-face" key="f">
                    <html.div class="glide-orbit-unbrake" key="u">
                      <html.div class="glide-orbit-jiggle" key="j">
                        <image alt={`${lane.role} lane`} blob={face} h={HIT} key="img" role="glide.orbit.face" w={HIT} />
                        <html.span class="glide-orbit-ring" key="ring" />
                        <html.div class="glide-orbit-badge" key="badge"><image alt="" blob={badge} h={11} key="img" w={11} /></html.div>
                      </html.div>
                      {/* The label is the hover name: no `title`, or Tern adds its own tooltip under it. */}
                      <html.span class="glide-orbit-label" key="label" text={name} />
                    </html.div>
                  </html.div>
                </html.button>
              </html.div>
            </html.div>
          )
        })}
      </html.div>
    )
  }

  #swatch(lane: Lane) {
    const dark = Boolean(this.#env.dark ?? this.#tern.caps.dark)
    const drawn = orbitLane(lane, dark)
    const key = `${lane.role}:${drawn.hue}:${lane.state === 'dead'}:${dark}`
    let blob = this.#swatches.get(key)
    if (!blob) {
      blob = this.#tern.blob(Buffer.from(laneSwatch(drawn, dark)), 'image/svg+xml')
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
      ? `Lanes · ${laneCounts(lanes)}${call?.open ? '' : ' · no open call'}`
      : this.#feed.error
        ? `Lanes · ${this.#feed.error}`
        : 'Lanes · waiting for a voice call'
    // One compact line per lane: its dot, role, model, state and one short quote. A quote already said by an
    // earlier lane (the same question every lane researches) is not repeated.
    const said = new Set<string>()
    const rows = lanes.map((lane, i) => {
      const quote = laneQuote(lane, said)
      return (
        <row align="center" gap="sm" key={`l${i}`} role="omp.live.lane">
          {this.#orbit
            ? <image key="key" role="omp.live.lane.key" {...this.#swatch(lane)} />
            : this.#orbs[i] ? <image key="orb" role="omp.live.lane.orb" {...this.#orbs[i].props()} /> : null}
          <text key="who" spans={[
            { s: 'strong', t: lane.role },
            { s: 'muted', t: ' · ' + laneModel(lane.model, lane.resolved).label + ' · ' },
            lane.state === 'dead'
              ? { s: 'error', t: 'dead' + (lane.error ? ` (${clip(lane.error, 60)})` : '') }
              : lane.state === 'corrected' ? { s: 'warning', t: 'corrected' }
                : lane.state === 'verified' ? { s: 'success', t: 'verified' }
                  : { t: lane.state },
            ...(quote ? [{ s: 'muted', t: ` · “${clip(quote, 72)}”` }] : [])
          ]} wrap="none" />
        </row>
      )
    })
    return (
      <col gap={this.#orbit ? 'sm' : 'none'} key="lanes" role="omp.live.lanes">
        <text key="head" spans={[{ s: 'muted', t: head }]} wrap="none" />
        {this.#orbit
          // The orbit stands beside the lane list, centred on it: rows packed together, never spread to the orbit's height.
          ? <row key="orbit" align="center" gap="sm" role="omp.live.lanes.orbit">
            {this.#orbitNode(lanes)}
            <col gap="xs" grow={1} key="rows" min={{ w: 0 }}>{rows}</col>
          </row>
          : rows}
      </col>
    )
  }
}
