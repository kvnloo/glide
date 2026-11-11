// The Socratic council as one instrument (ported from the AODL patterns-v3 prototype): a dark stone
// table with one engraved ring per round, each seat a mineral in a gold bezel (the mineral names the
// model family), its crew as small stones on an arc, the brief as a brass boss at the centre. This
// module only parses a council run and draws it; it never computes a verdict. Every stone shares one
// key light from the upper left; nothing moves unless an event is playing.
export type Mineral = 'citrine' | 'rose' | 'smoky' | 'clear' | 'malachite' | 'labradorite' | 'moonstone' | 'lapis'
export type Stance = 'agree' | 'dissent' | 'abstain'

interface Stone { label: string; cut: 'brilliant' | 'cabochon'; base: string; light: string; deep: string; glow: string }
export const MINERAL: Record<Mineral, Stone> = {
  citrine: { label: 'Citrine', cut: 'brilliant', base: '#dc9a32', light: '#ffe6a6', deep: '#5a3108', glow: '#ffb24a' },
  rose: { label: 'Rose quartz', cut: 'brilliant', base: '#d99a9c', light: '#ffe6e2', deep: '#5c2e36', glow: '#f7b4aa' },
  smoky: { label: 'Smoky quartz', cut: 'brilliant', base: '#8b735b', light: '#eadcc6', deep: '#231c15', glow: '#c99a5a' },
  clear: { label: 'Clear quartz', cut: 'brilliant', base: '#c9d2d0', light: '#ffffff', deep: '#3d4645', glow: '#e9f2ef' },
  malachite: { label: 'Malachite', cut: 'cabochon', base: '#2f8a5c', light: '#8fe0b4', deep: '#0b3322', glow: '#49b27c' },
  labradorite: { label: 'Labradorite', cut: 'cabochon', base: '#3a424b', light: '#9fb3c4', deep: '#14181d', glow: '#4fa8d8' },
  moonstone: { label: 'Moonstone', cut: 'cabochon', base: '#c4c8d0', light: '#f6f7fa', deep: '#5d6270', glow: '#8fb8ff' },
  lapis: { label: 'Lapis lazuli', cut: 'cabochon', base: '#25418f', light: '#7f9be0', deep: '#0b1647', glow: '#3d62c9' }
}
/** A family's minerals: Anthropic the quartz family, OpenAI feldspar and lapis, Google malachite, free lanes clear quartz. */
const FAMILY: Record<string, readonly Mineral[]> = {
  anthropic: ['citrine', 'rose', 'smoky'], openai: ['labradorite', 'moonstone', 'lapis'], google: ['malachite'], free: ['clear']
}

export const NIGHT = {
  canvas: '#0c0c0a', text: '#ECE8DF', text2: '#B4AFA3', text3: '#837F74', faint: '#5e5b52',
  action: '#d7b986', strong: '#eccd8c', muted: '#99835c', danger: '#e37f65', agree: '#98cf8b',
  border: 'rgba(236,232,223,0.10)', borderStrong: 'rgba(236,232,223,0.16)'
}
export const SERIF = "'Cormorant Garamond', 'Instrument Serif', 'EB Garamond', Georgia, serif"
export const MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace"

// ------------------------------------------------------------------ the payload

export const COUNCIL_SCHEMA = 'glide.council-run/v1'
const MINERALS = new Set<string>(Object.keys(MINERAL))
const SEAT_ID = /^[a-z0-9][a-z0-9._-]{0,39}$/
const KEYS = { run: ['schema', 'brief', 'rounds', 'seats', 'events', 'verdicts', 'outcome'], seat: ['id', 'name', 'family', 'mineral', 'crew'],
  turn: ['type', 'seat', 'round', 'cites'], spawn: ['type', 'seat'], verdict: ['seat', 'stance', 'text'] }

class Bad extends Error {}
const fail = (where: string, what: string): never => { throw new Bad(`${where}: ${what}`) }
function obj(v: unknown, where: string, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(where, 'expected an object')
  const extra = Object.keys(v).find(k => !keys.includes(k))
  return extra === undefined ? v as Record<string, unknown> : fail(where, `unknown field "${extra}"`)
}
function str(v: unknown, where: string, max: number): string {
  return typeof v === 'string' && v.trim() && v.length <= max ? v : fail(where, `expected text of 1-${max} characters`)
}
function int(v: unknown, where: string, min: number, max: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fail(where, `expected a whole number ${min}-${max}`)
}
function list(v: unknown, where: string, min: number, max: number): unknown[] {
  return Array.isArray(v) && v.length >= min && v.length <= max ? v : fail(where, `expected a list of ${min}-${max}`)
}
function mineral(v: unknown, where: string): Mineral {
  return typeof v === 'string' && MINERALS.has(v) ? v as Mineral : fail(where, 'not a known mineral')
}

export interface CouncilSeat { readonly id: string; readonly name: string; readonly family: string; readonly mineral: Mineral; readonly crew: readonly Mineral[] }
export type CouncilEvent =
  | { readonly type: 'turn'; readonly seat: number; readonly round: number; readonly cites: readonly number[] }
  | { readonly type: 'spawn'; readonly seat: number }
export interface CouncilVerdict { readonly seat: number; readonly stance: Stance; readonly text: string }
export interface CouncilRun {
  readonly brief: string
  readonly rounds: number
  readonly seats: readonly CouncilSeat[]
  readonly events: readonly CouncilEvent[]
  readonly verdicts: readonly CouncilVerdict[]
  readonly outcome?: string
}

/** A run as the council reported it, or why it is not one. Seats are referred to by index afterwards. */
export function parseCouncilRun(raw: unknown): CouncilRun | { error: string } {
  try {
    return readRun(raw)
  } catch (e) {
    if (e instanceof Bad) return { error: `not a ${COUNCIL_SCHEMA} run (${e.message})` }
    throw e
  }
}

function readRun(raw: unknown): CouncilRun {
  const d = obj(raw, 'run', KEYS.run)
  if (d['schema'] !== COUNCIL_SCHEMA) fail('schema', `expected "${COUNCIL_SCHEMA}"`)
  const rounds = int(d['rounds'], 'rounds', 1, 8)
  const used = new Map<string, number>()
  const index = new Map<string, number>()
  const seats = list(d['seats'], 'seats', 2, 6).map((v, i): CouncilSeat => {
    const s = obj(v, `seats.${i}`, KEYS.seat)
    const id = str(s['id'], `seats.${i}.id`, 40)
    if (!SEAT_ID.test(id)) fail(`seats.${i}.id`, 'expected a lowercase id')
    if (index.has(id)) fail(`seats.${i}.id`, 'two seats share an id')
    index.set(id, i)
    const family = str(s['family'], `seats.${i}.family`, 24)
    const key = family.trim().toLowerCase()
    const pool = FAMILY[key] ?? ['clear']
    const n = used.get(key) ?? 0
    used.set(key, n + 1)
    return Object.freeze({
      id, family, name: str(s['name'], `seats.${i}.name`, 24),
      mineral: s['mineral'] === undefined ? pool[n % pool.length] ?? 'clear' : mineral(s['mineral'], `seats.${i}.mineral`),
      crew: Object.freeze(s['crew'] === undefined ? [] : list(s['crew'], `seats.${i}.crew`, 0, 12).map((c, k) => mineral(c, `seats.${i}.crew.${k}`)))
    })
  })
  const seat = (v: unknown, where: string) => index.get(typeof v === 'string' ? v : '') ?? fail(where, 'names an unknown seat')
  const events = list(d['events'], 'events', 0, 400).map((v, i): CouncilEvent => {
    const type = v && typeof v === 'object' && 'type' in v ? v.type : undefined
    if (type === 'spawn') return Object.freeze({ type, seat: seat(obj(v, `events.${i}`, KEYS.spawn)['seat'], `events.${i}.seat`) })
    if (type !== 'turn') return fail(`events.${i}.type`, 'expected "turn" or "spawn"')
    const e = obj(v, `events.${i}`, KEYS.turn)
    const cites = e['cites'] === undefined ? [] : list(e['cites'], `events.${i}.cites`, 0, 6).map((c, k) => seat(c, `events.${i}.cites.${k}`))
    return Object.freeze({ type, seat: seat(e['seat'], `events.${i}.seat`), round: int(e['round'], `events.${i}.round`, 1, rounds), cites: Object.freeze(cites) })
  })
  const heard = new Set<number>()
  const verdicts = list(d['verdicts'], 'verdicts', 0, 6).map((v, i): CouncilVerdict => {
    const e = obj(v, `verdicts.${i}`, KEYS.verdict)
    const s = seat(e['seat'], `verdicts.${i}.seat`)
    if (heard.has(s)) fail(`verdicts.${i}.seat`, 'seat already has a verdict')
    heard.add(s)
    const stance = e['stance']
    if (stance !== 'agree' && stance !== 'dissent' && stance !== 'abstain') return fail(`verdicts.${i}.stance`, 'expected agree, dissent or abstain')
    return Object.freeze({ seat: s, stance, text: str(e['text'], `verdicts.${i}.text`, 240) })
  })
  return Object.freeze({
    brief: str(d['brief'], 'brief', 280), rounds, seats: Object.freeze(seats), events: Object.freeze(events), verdicts: Object.freeze(verdicts),
    ...(d['outcome'] === undefined ? {} : { outcome: str(d['outcome'], 'outcome', 160) })
  })
}

/** A synthetic run for the demo tag: invented seats and brief, no real council output. */
export function demoRun(): CouncilRun {
  const CREW = ['clear', 'clear', 'clear', 'clear', 'clear', 'moonstone', 'moonstone', 'smoky', 'smoky']
  const seats = [
    { id: 'argon', name: 'Argon', family: 'Google', crew: CREW },
    { id: 'astra', name: 'Astra', family: 'OpenAI', crew: CREW },
    { id: 'fable', name: 'Fable', family: 'Anthropic', mineral: 'rose', crew: CREW },
    { id: 'opus', name: 'Opus', family: 'Anthropic', mineral: 'citrine', crew: CREW }
  ]
  const ids = seats.map(s => s.id)
  const events: unknown[] = []
  for (const id of ids) for (let k = 0; k < 4; k++) events.push({ type: 'spawn', seat: id })
  for (let round = 1; round <= 4; round++) {
    ids.forEach((id, i) => {
      if (round === 2) for (let k = 0; k < 3; k++) events.push({ type: 'spawn', seat: id })
      const peers = ids.filter(p => p !== id)
      const cites = round === 1 ? [] : round === 4 ? [peers[i % 3]] : peers.slice(0, round === 2 ? 3 : 2)
      events.push({ type: 'turn', seat: id, round, cites })
    })
  }
  for (const id of ids) for (let k = 0; k < 2; k++) events.push({ type: 'spawn', seat: id })
  const run = parseCouncilRun({
    schema: COUNCIL_SCHEMA,
    brief: 'Should a small team ship a plugin before its launcher?',
    rounds: 4,
    seats,
    events,
    verdicts: [
      { seat: 'argon', stance: 'agree', text: 'Ship the plugin; the launcher only wraps what already works.' },
      { seat: 'astra', stance: 'dissent', text: 'Without the launcher nobody finds the plugin; ship both together.' },
      { seat: 'fable', stance: 'agree', text: 'Ship it, and measure who installs it by hand before building more.' },
      { seat: 'opus', stance: 'agree', text: 'Agree with Fable: the plugin first, the launcher once installs prove demand.' }
    ],
    outcome: 'Ship the plugin first'
  })
  if ('error' in run) throw new Error(`demo run: ${run.error}`)
  return run
}

// ------------------------------------------------------------------ the timeline

// Motion budget: a turn is one beat, a spawn a flick; no bounce.
export const TURN_MS = 520
export const SPAWN_MS = 90
const FLY_MS = 220
const THREAD_MS = 360
const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)

/** When each event starts (ms after convening) and when the run ends. */
export function schedule(run: CouncilRun): { at: number[]; total: number } {
  const at: number[] = []
  let t = 0
  for (const e of run.events) {
    at.push(t)
    t += e.type === 'spawn' ? SPAWN_MS : TURN_MS
  }
  return { at, total: t }
}

/** `t`: ms since convening; null before the council has sat. At or past the end, the run is complete. */
export interface Frame { readonly t: number | null }

interface Moment {
  idx: number; since: number; running: boolean; done: boolean; round: number; speaking: number
  lit: number[]; born: Map<string, number>; closed: Set<number>
}

function moment(run: CouncilRun, frame: Frame): Moment {
  const { at, total } = schedule(run)
  const t = frame.t
  const done = t !== null && t >= total
  let idx = -1
  if (t !== null) for (let i = 0; i < at.length; i++) if ((at[i] ?? Infinity) <= t) idx = i
  const running = t !== null && !done
  const lit = run.seats.map(() => 0)
  const born = new Map<string, number>()
  const lastTurn = run.seats.map(() => -1)
  run.events.forEach((e, i) => { if (e.type === 'turn') lastTurn[e.seat] = i })
  let round = 0
  for (let i = 0; i <= idx; i++) {
    const e = run.events[i]
    if (!e) continue
    if (e.type === 'spawn') {
      born.set(`${e.seat}.${lit[e.seat] ?? 0}`, at[i] ?? 0)
      lit[e.seat] = (lit[e.seat] ?? 0) + 1
    } else round = e.round
  }
  const cur = idx >= 0 ? run.events[idx] : undefined
  const since = t === null || idx < 0 ? 0 : t - (at[idx] ?? 0)
  const closed = new Set<number>()
  run.seats.forEach((_, s) => {
    const last = lastTurn[s] ?? -1
    if (done || (t !== null && last >= 0 && (idx > last || (idx === last && since >= TURN_MS)))) closed.add(s)
  })
  return { idx, since, running, done, round, speaking: running && cur?.type === 'turn' ? cur.seat : -1, lit, born, closed }
}

/** One line on what the council is doing now. */
export function narration(run: CouncilRun, frame: Frame): string {
  const m = moment(run, frame)
  const nm = (i: number) => run.seats[i]?.name ?? '?'
  const helpers = run.events.filter(e => e.type === 'spawn').length
  if (frame.t === null) return `${run.seats.length} seats · ${run.rounds} rounds · ${helpers} helpers. Convene to watch it sit.`
  if (m.done) return `Council complete · ${run.rounds} rounds · ${helpers} helpers`
  const cur = run.events[m.idx]
  if (!cur) return 'The council takes its seats'
  if (cur.type === 'spawn') return `${nm(cur.seat)} sends a helper out`
  if (cur.round === 1) return `Round 1 · ${nm(cur.seat)} answers the brief, alone`
  if (cur.round === run.rounds) return `Round ${cur.round} · ${nm(cur.seat)} closes`
  return `Round ${cur.round} · ${nm(cur.seat)} questions ${cur.cites.length} peer${cur.cites.length === 1 ? '' : 's'}`
}

/** Seats whose verdict may be shown: every seat once the run is complete, else each after its last turn. */
export function closedSeats(run: CouncilRun, frame: Frame): ReadonlySet<number> {
  return moment(run, frame).closed
}

// ------------------------------------------------------------------ SVG

type Attrs = Record<string, string | number | undefined>
const n2 = (v: number) => (Math.round(v * 10) / 10).toString()
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function tag(name: string, attrs: Attrs, kids = ''): string {
  let a = ''
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) a += ` ${k}="${typeof v === 'number' ? n2(v) : esc(v)}"`
  return kids ? `<${name}${a}>${kids}</${name}>` : `<${name}${a}/>`
}
const stop = (offset: number, color: string, opacity?: number) => tag('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b)
  return toHex(x.map((v, i) => v + ((y[i] ?? 0) - v) * Math.max(0, Math.min(1, t))))
}
const D = Math.PI / 180
const KEY = 225 * D // the key light: upper left, screen coordinates (y down)
/** Brightness of a facet with outward azimuth `phi` and tilt under the key light at azimuth `az`. */
function lit(phi: number, tilt: number, az: number) {
  const el = 52 * D
  return Math.max(0, Math.sin(tilt) * Math.cos(phi) * Math.sin(el) * Math.cos(az) + Math.sin(tilt) * Math.sin(phi) * Math.sin(el) * Math.sin(az) + Math.cos(tilt) * Math.cos(el))
}
const jitter = (k: number) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 - 0.5
type Pt = [number, number]
const at = (cx: number, cy: number, r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
const pts = (p: Pt[]) => p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(' ')

/** A round brilliant from above: table, 8 stars, 8 bezel kites, 16 upper-girdle triangles. */
function brilliant(cx: number, cy: number, r: number) {
  const f: { p: Pt[]; phi: number; tilt: number }[] = []
  const v = (k: number) => at(cx, cy, r * 0.5, (22.5 + 45 * k) * D)
  const s = (k: number) => at(cx, cy, r * 0.74, (45 + 45 * k) * D)
  const g = (deg: number) => at(cx, cy, r, deg * D)
  f.push({ p: Array.from({ length: 8 }, (_, k) => v(k)), phi: 0, tilt: 0 })
  for (let k = 0; k < 8; k++) {
    const a = 22.5 + 45 * k
    f.push({ p: [v(k), v(k + 1), s(k)], phi: (a + 22.5) * D, tilt: 0.42 })
    f.push({ p: [s(k - 1), v(k), s(k), g(a)], phi: a * D, tilt: 0.66 })
    f.push({ p: [s(k), g(a), g(a + 22.5)], phi: (a + 13) * D, tilt: 0.95 })
    f.push({ p: [s(k), g(a + 22.5), g(a + 45)], phi: (a + 32) * D, tilt: 0.95 })
  }
  return f
}

/**
 * One stone. `glint` (0..1) swings the light across it while its seat speaks; null when idle.
 * `low` is a crew token: material colour, one light, one specular, no facets.
 */
export function gem(id: string, kind: Mineral, cx: number, cy: number, r: number, opts: { glint?: number | null; dim?: boolean; low?: boolean } = {}): string {
  const m = MINERAL[kind]
  const glint = opts.glint ?? null
  const g = glint ?? 0.5
  const shine = glint === null ? 0 : Math.sin(Math.PI * Math.max(0, Math.min(1, glint)))
  const az = KEY + (g - 0.5) * 70 * D
  const hl = at(cx, cy, r * 0.42, az)
  const far = at(cx, cy, r * 0.38, az + Math.PI)
  const op = opts.dim ? 0.55 : undefined

  if (opts.low) {
    const body = kind === 'clear'
      ? tag('circle', { cx, cy, r: r * 0.86, fill: m.base, 'fill-opacity': 0.16, stroke: m.light, 'stroke-opacity': 0.85, 'stroke-width': r * 0.28 })
      : tag('circle', { cx, cy, r, fill: m.base }) + tag('circle', { cx, cy, r, fill: `url(#${id}b)` })
    return tag('g', { opacity: op },
      (kind === 'clear' ? '' : tag('defs', {}, tag('radialGradient', { id: `${id}b`, cx: '36%', cy: '32%', r: '72%' }, stop(0, m.light) + stop(0.45, m.base) + stop(1, m.deep)))) +
      body + tag('circle', { cx: cx - r * 0.35, cy: cy - r * 0.38, r: r * 0.26, fill: '#fff', 'fill-opacity': 0.8 }))
  }

  const user = { gradientUnits: 'userSpaceOnUse' }
  let defs = tag('clipPath', { id: `${id}c` }, tag('circle', { cx, cy, r })) +
    tag('radialGradient', { id: `${id}s`, cx: far[0], cy: far[1], r: r * 0.85, ...user }, stop(0, m.glow, 0.75 + 0.2 * shine) + stop(1, m.glow, 0)) +
    tag('radialGradient', { id: `${id}d`, cx: cx + (hl[0] - cx) * 0.6, cy: cy + (hl[1] - cy) * 0.6, r: r * 1.25, ...user }, stop(0, m.light) + stop(0.42, m.base) + stop(1, m.deep)) +
    tag('radialGradient', { id: `${id}r`, cx, cy, r, ...user }, stop(0.7, '#000', 0) + stop(1, '#000', 0.55)) +
    tag('linearGradient', { id: `${id}z`, x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, ...user }, stop(0, '#f3dcaa') + stop(0.5, '#a8854c') + stop(1, '#4a3818'))
  if (kind === 'labradorite') defs += tag('linearGradient', { id: `${id}f`, x1: 0, y1: 0, x2: 1, y2: 0.35 }, stop(0, '#2a6fb8', 0) + stop(0.3, '#3f8fe0') + stop(0.55, '#46cdb4') + stop(0.78, '#d8c05a') + stop(1, '#d8c05a', 0))
  if (kind === 'moonstone') defs += tag('radialGradient', { id: `${id}a`, cx: '50%', cy: '50%', r: '50%' }, stop(0, '#a9c8ff', 0.95) + stop(1, '#7fa6ff', 0))

  let body = tag('circle', { cx, cy, r, fill: m.base })
  if (m.cut === 'brilliant') {
    body += brilliant(cx, cy, r).map((f, k) => {
      const b = Math.min(1, lit(f.phi, f.tilt, az) * 1.15 + jitter(k + kind.length) * 0.32)
      let fill = mix(m.deep, m.base, b * 1.35)
      if (b > 0.72) fill = mix(fill, m.light, (b - 0.72) * 3 + shine * 0.25)
      return tag('path', { d: `M ${pts(f.p).replace(/ /g, ' L ')} Z`, fill, stroke: m.light, 'stroke-opacity': 0.22, 'stroke-width': 0.5 })
    }).join('')
    // inclusions stay inside the stone
    if (kind === 'smoky') body += [[-0.55, 0.15, 0.35, 0.55], [-0.2, -0.45, 0.5, 0.2], [0.05, 0.3, 0.6, -0.05]].map(([x1 = 0, y1 = 0, x2 = 0, y2 = 0]) =>
      tag('line', { x1: cx + x1 * r, y1: cy + y1 * r, x2: cx + x2 * r, y2: cy + y2 * r, stroke: '#e2bb63', 'stroke-opacity': 0.55, 'stroke-width': 0.6 })).join('')
    if (kind === 'citrine') body += tag('ellipse', { cx: cx + r * 0.18, cy: cy + r * 0.22, rx: r * 0.32, ry: r * 0.1, transform: `rotate(-28 ${n2(cx + r * 0.18)} ${n2(cy + r * 0.22)})`, fill: '#fff6dc', 'fill-opacity': 0.18 })
    if (kind === 'rose') body += tag('circle', { cx: cx + r * 0.1, cy: cy + r * 0.15, r: r * 0.55, fill: '#fff0ee', 'fill-opacity': 0.16 })
    if (kind === 'clear') body += tag('line', { x1: cx - r * 0.3, y1: cy + r * 0.45, x2: cx + r * 0.35, y2: cy - r * 0.2, stroke: '#ffffff', 'stroke-opacity': 0.35, 'stroke-width': 0.5 })
  } else {
    body += tag('circle', { cx, cy, r, fill: `url(#${id}d)` })
    if (kind === 'malachite') body += Array.from({ length: 9 }, (_, k) => {
      const bx = cx + r * 0.62, by = cy + r * 0.82, radius = r * (0.28 + k * 0.2)
      const distance = Math.hypot(bx - cx, by - cy)
      const angle = Math.atan2(cy - by, cx - bx)
      const half = Math.acos(Math.max(-1, Math.min(1, (distance * distance + radius * radius - r * r) / (2 * distance * radius))))
      const start = at(bx, by, radius, angle - half), end = at(bx, by, radius, angle + half)
      return tag('path', {
        d: `M ${pts([start])} A ${n2(radius)} ${n2(radius)} 0 0 1 ${pts([end])}`, fill: 'none',
        stroke: k % 2 ? '#0c3a26' : '#5cc893', 'stroke-opacity': k % 2 ? 0.75 : 0.45, 'stroke-width': r * (k % 3 === 0 ? 0.1 : 0.055)
      })
    }).join('')
    if (kind === 'labradorite') body += tag('ellipse', {
      cx: cx + r * (0.05 + (g - 0.5) * 0.35), cy: cy + r * 0.05, rx: r * 0.95, ry: r * 0.42,
      transform: `rotate(${n2(-32 + (g - 0.5) * 50)} ${n2(cx)} ${n2(cy)})`, fill: `url(#${id}f)`, 'fill-opacity': 0.5 + 0.45 * shine
    })
    if (kind === 'moonstone') body += tag('ellipse', { cx: cx - r * 0.05, cy: cy - r * (0.05 + (g - 0.5) * 0.5), rx: r * 0.62, ry: r * 0.4, fill: `url(#${id}a)`, 'fill-opacity': 0.55 + 0.4 * shine })
    if (kind === 'lapis') {
      body += tag('path', { d: `M ${n2(cx - r)} ${n2(cy + r * 0.35)} Q ${n2(cx - r * 0.1)} ${n2(cy + r * 0.05)} ${n2(cx + r)} ${n2(cy + r * 0.55)}`, stroke: '#d9dfee', 'stroke-opacity': 0.35, 'stroke-width': r * 0.09, fill: 'none' })
      for (let k = 0; k < 14; k++) {
        const [x, y] = at(cx, cy, r * Math.sqrt((k + 0.5) / 14) * 0.85, k * 2.399)
        body += tag('circle', { cx: x, cy: y, r: r * (0.035 + 0.02 * (k % 3)), fill: '#f0cd6e', 'fill-opacity': 0.55 + 0.45 * (shine * ((k % 4) / 3)) })
      }
    }
  }
  // transmitted light pools on the far side, the rim falls off, the specular sits on the lit side only
  body += tag('circle', { cx, cy, r, fill: `url(#${id}s)`, 'fill-opacity': m.cut === 'brilliant' ? 0.55 : kind === 'moonstone' ? 0.5 : 0.28 })
  body += tag('circle', { cx, cy, r, fill: `url(#${id}r)` })
  const [hx, hy] = hl
  body += m.cut === 'brilliant'
    ? tag('path', {
      d: [[0, -0.22], [0.05, -0.05], [0.22, 0], [0.05, 0.05], [0, 0.22], [-0.05, 0.05], [-0.22, 0], [-0.05, -0.05]]
        .map(([dx = 0, dy = 0], i) => `${i ? 'L' : 'M'} ${n2(hx + r * dx)} ${n2(hy + r * dy)}`).join(' ') + ' Z',
      fill: '#ffffff', 'fill-opacity': 0.55 + 0.45 * shine
    })
    : tag('ellipse', { cx: hx, cy: hy, rx: r * 0.34, ry: r * 0.16, transform: `rotate(${n2(az / D + 90)} ${n2(hx)} ${n2(hy)})`, fill: '#ffffff', 'fill-opacity': 0.32 + 0.35 * shine })

  return tag('g', { opacity: op },
    tag('defs', {}, defs) +
    tag('circle', { cx, cy, r: r + 2.2, fill: 'none', stroke: `url(#${id}z)`, 'stroke-width': 2.4 }) +
    tag('g', { 'clip-path': `url(#${id}c)` }, body))
}

/** A lone stone for a seat row or swatch. */
export function swatchSvg(kind: Mineral, size: number): string {
  return tag('svg', { xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: `0 0 ${size} ${size}` }, gem(`w${kind}`, kind, size / 2, size / 2, size / 2 - 3.5))
}

const STARS: [number, number, number, number][] = (() => {
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 46 }, () => [rnd(), rnd(), rnd() * 0.7 + 0.25, rnd() * 0.35 + 0.08])
})()

/** The instrument at one moment, `size` px square. */
export function instrumentSvg(run: CouncilRun, frame: Frame, size = 480): string {
  const m = moment(run, frame)
  const c = size / 2
  const orbit = size * 0.335
  const R = Math.max(18, size * 0.064)
  const table = orbit + R + size * 0.06
  const ringMin = size * 0.085
  const ringMax = orbit - R * 0.35
  const ringGap = (ringMax - ringMin - 10) / Math.max(run.rounds, 1)
  const ringR = (i: number) => ringMin + 10 + ringGap * (i + 0.5)
  const n = run.seats.length
  const pos = run.seats.map((_, i) => {
    const a = -Math.PI / 2 + Math.PI / n + (i * 2 * Math.PI) / n
    return { x: c + orbit * Math.cos(a), y: c + orbit * Math.sin(a), a }
  })
  const t = frame.t ?? 0
  const cur = m.idx >= 0 ? run.events[m.idx] : undefined
  const user = { gradientUnits: 'userSpaceOnUse' }
  let s = tag('defs', {},
    tag('radialGradient', { id: 'tb', cx: c - table * 0.35, cy: c - table * 0.4, r: table * 1.5, ...user }, stop(0, '#24231e') + stop(0.55, '#151511') + stop(1, '#0b0b09')) +
    tag('linearGradient', { id: 'br', x1: c - table, y1: c - table, x2: c + table, y2: c + table, ...user }, stop(0, '#f0d7a0') + stop(0.5, '#9c7a43') + stop(1, '#3d2e14')) +
    tag('radialGradient', { id: 'bf', cx: c - ringMin * 0.3, cy: c - ringMin * 0.35, r: ringMin * 1.1, ...user }, stop(0, '#f6dfa6') + stop(0.55, '#c49a55') + stop(1, '#5e4318')) +
    tag('radialGradient', { id: 'wm', cx: '50%', cy: '50%', r: '50%' }, stop(0, '#f2c66a', 0.28) + stop(1, '#f2c66a', 0)))

  s += tag('rect', { width: size, height: size, fill: NIGHT.canvas })
  // night sky outside the table, very quiet
  for (const [x, y, r, o] of STARS) if (Math.hypot(x * size - c, y * size - c) > table + 6) s += tag('circle', { cx: x * size, cy: y * size, r, fill: '#f3e6c8', 'fill-opacity': o })
  // the instrument bezel: brass hairline and ticks
  s += tag('circle', { cx: c, cy: c, r: c - 3, stroke: 'url(#br)', 'stroke-opacity': 0.7, 'stroke-width': 1, fill: 'none' })
  for (let i = 0; i < 72; i++) {
    const a = (i * Math.PI) / 36, r1 = c - 7, r2 = c - (i % 6 === 0 ? 16 : 11)
    s += tag('line', { x1: c + r1 * Math.cos(a), y1: c + r1 * Math.sin(a), x2: c + r2 * Math.cos(a), y2: c + r2 * Math.sin(a), stroke: NIGHT.muted, 'stroke-opacity': i % 6 === 0 ? 0.6 : 0.3, 'stroke-width': 0.6 })
  }
  // the council table: dark stone with engraved rings, one per round; the current one is lit
  s += tag('circle', { cx: c, cy: c, r: table, fill: 'url(#tb)', stroke: 'url(#br)', 'stroke-width': 1.2, 'stroke-opacity': 0.85 })
  s += tag('circle', { cx: c, cy: c, r: table - 5, fill: 'none', stroke: NIGHT.muted, 'stroke-opacity': 0.25, 'stroke-width': 0.5 })
  s += tag('circle', { cx: c, cy: c, r: orbit, fill: 'none', stroke: NIGHT.action, 'stroke-opacity': 0.18, 'stroke-width': 0.6, 'stroke-dasharray': '1 5' })
  for (let i = 0; i < run.rounds; i++) {
    const r = ringR(i)
    const now = m.running && m.round === i + 1
    const past = frame.t !== null && (m.round > i + 1 || m.done)
    s += tag('circle', { cx: c, cy: c, r, fill: 'none', stroke: now ? NIGHT.strong : NIGHT.action, 'stroke-opacity': now ? 0.95 : past ? 0.5 : 0.2, 'stroke-width': now ? 1.8 : 0.7 })
    if (ringGap >= 12 || i % 2 === 1 || now) {
      s += tag('rect', { x: c - 9, y: c - r - 6, width: 18, height: 11, fill: '#12120f' })
      s += tag('text', { x: c, y: c - r + 3, fill: now ? NIGHT.strong : NIGHT.text3, 'font-size': 8.5, 'font-family': MONO, 'text-anchor': 'middle' }, String(i + 1).padStart(2, '0'))
    }
  }
  // threads: round 1 answers the brief; later rounds answer the peers this turn cites
  if (m.speaking >= 0 && cur?.type === 'turn') {
    const p = pos[m.speaking]
    const k = ease(m.since / THREAD_MS)
    const targets = cur.cites.filter(j => j !== m.speaking)
    if (p && !targets.length) {
      s += tag('line', { x1: p.x, y1: p.y, x2: p.x + (c - p.x) * k, y2: p.y + (c - p.y) * k, stroke: NIGHT.strong, 'stroke-opacity': 0.55, 'stroke-width': 1 })
    }
    for (const j of targets) {
      const q = pos[j]
      if (!p || !q) continue
      const mx = c + ((p.x + q.x) / 2 - c) * 0.35, my = c + ((p.y + q.y) / 2 - c) * 0.35
      const len = Math.hypot(mx - p.x, my - p.y) + Math.hypot(q.x - mx, q.y - my)
      s += tag('path', { d: `M ${n2(p.x)} ${n2(p.y)} Q ${n2(mx)} ${n2(my)} ${n2(q.x)} ${n2(q.y)}`, stroke: NIGHT.strong, 'stroke-opacity': 0.75, 'stroke-width': 1, 'stroke-dasharray': `${n2(len)} ${n2(len)}`, 'stroke-dashoffset': len * (1 - k), fill: 'none' })
      if (k >= 1) s += tag('circle', { cx: q.x, cy: q.y, r: R + 6, fill: 'none', stroke: NIGHT.strong, 'stroke-opacity': 0.35, 'stroke-width': 0.8 })
    }
  }
  // the brief: a brass boss, warm only while the council sits
  if (m.running) s += tag('circle', { cx: c, cy: c, r: ringMin * 1.5, fill: 'url(#wm)' })
  s += tag('circle', { cx: c, cy: c, r: ringMin * 0.82, fill: '#c49a55' })
  s += tag('circle', { cx: c, cy: c, r: ringMin * 0.82, fill: 'url(#bf)', 'fill-opacity': 0.92 })
  s += tag('circle', { cx: c, cy: c, r: ringMin * 0.66, fill: 'none', stroke: '#3b2a0e', 'stroke-opacity': 0.45, 'stroke-width': 0.6 })
  s += tag('text', { x: c, y: c + 5, fill: '#2e1e06', 'font-size': Math.max(12, size * 0.03), 'font-style': 'italic', 'font-family': SERIF, 'text-anchor': 'middle' }, 'brief')

  // seats: a mineral in a gold bezel, crew stones on the outer arc, a plaque facing the centre
  run.seats.forEach((seat, i) => {
    const p = pos[i]
    if (!p) return
    const talk = m.speaking === i
    const crew = seat.crew
    const step = Math.min(0.17, 1.9 / Math.max(crew.length, 1))
    crew.forEach((stone, k) => {
      const ang = p.a + (k - (crew.length - 1) / 2) * step
      const on = frame.t === null || k < (m.lit[i] ?? 0)
      const born = m.running ? m.born.get(`${i}.${k}`) : undefined
      const d = R + 6 + 9 * (born === undefined ? 1 : ease((t - born) / FLY_MS))
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d
      s += on ? gem(`t${i}x${k}`, stone, x, y, 3.9, { low: true })
        : tag('circle', { cx: x, cy: y, r: 2.4, fill: 'none', stroke: NIGHT.text3, 'stroke-opacity': 0.5, 'stroke-width': 0.6 })
    })
    if (talk) s += tag('circle', { cx: p.x, cy: p.y, r: R + 6, fill: 'none', stroke: NIGHT.strong, 'stroke-opacity': 0.9, 'stroke-width': 1.4 })
    s += gem(`s${i}`, seat.mineral, p.x, p.y, R, { glint: talk ? Math.min(1, m.since / TURN_MS) : null, dim: m.running && !talk })
    const plaqueY = p.y > c ? p.y - R - 36 : p.y + R + 6
    s += tag('rect', { x: p.x - 34, y: plaqueY, width: 68, height: 30, rx: 6, fill: '#0f0f0c', 'fill-opacity': 0.82, stroke: NIGHT.border, 'stroke-width': 0.6 })
    s += tag('text', { x: p.x, y: plaqueY + 15, fill: NIGHT.text, 'font-size': 14, 'font-family': SERIF, 'text-anchor': 'middle' }, esc(seat.name))
    s += tag('text', { x: p.x, y: plaqueY + 25, fill: NIGHT.text3, 'font-size': 7, 'letter-spacing': 0.8, 'font-family': MONO, 'text-anchor': 'middle' }, esc(MINERAL[seat.mineral].label.toUpperCase()))
  })
  return tag('svg', { xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: `0 0 ${size} ${size}` }, s)
}
