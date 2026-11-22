// Council sessions (GL-103): a council started in Glide continues on another client. A session is
// the recorded run, the passages a reader speaks, and where the reading is; the plugin keeps it in
// the profile under a council id tied to the Hermes conversation, and serves it through
// `glide.council.start|load|list|position` (or `/glide json council.<verb>` on a stock core).
// The wire shape is glide/docs/council-session.md; this module only reads and writes it.
import { isUnsupportedFork } from '../../frontend/src/wire/fork.js'
import { factoryOutput } from '../../frontend/src/wire/factory.js'
import { record } from '../../frontend/src/wire/json.js'
import type { Requester } from '../../frontend/src/wire/rpc.js'

import { COUNCIL_SCHEMA, type CouncilRun, parseCouncilRun } from './council.js'
import { exchangeTiming, reportClauses } from './councilExchange.js'
import { speechSentences } from './councilSpeech.js'

export const COUNCIL_SESSION_SCHEMA = 'glide.council-session/v1'
export const CONFLICT = 4090
export const CLIENT = 'glide'

export interface CouncilPassage { readonly key: string; readonly label: string; readonly text: string; readonly seat: string | null }
export interface CouncilPosition {
  readonly elapsed_ms: number
  readonly passage: string | null
  readonly sentence: number
  readonly read_aloud: boolean
  readonly muted: boolean
}
export interface CouncilSessionState {
  readonly schema: typeof COUNCIL_SESSION_SCHEMA
  readonly council_id: string
  readonly stored_session_id: string | null
  readonly revision: number
  readonly created_at: string
  readonly updated_at: string
  readonly started_by: string
  readonly updated_by: string
  /** False for the synthetic demo run: every client keeps its DEMO tag. */
  readonly live: boolean
  /** Where the run was read from (an endpoint host), or why the demo is shown. */
  readonly from: string
  /** The run as recorded on the wire; `CouncilSession.run` is it parsed. */
  readonly run: unknown
  readonly passages: readonly CouncilPassage[]
  readonly position: CouncilPosition
}
export interface CouncilSession { readonly state: CouncilSessionState; readonly run: CouncilRun }
export interface CouncilSummary { readonly council_id: string; readonly brief: string; readonly updated_at: string; readonly updated_by: string; readonly revision: number }

export const START: CouncilPosition = Object.freeze({ elapsed_ms: 0, passage: null, sentence: 0, read_aloud: false, muted: false })

/** What a reader speaks, in order: the brief with its constraints, then each clause of the report. */
export function councilPassages(run: CouncilRun): CouncilPassage[] {
  return [
    { key: 'brief', label: 'The brief', text: [run.brief, ...(run.constraints ?? [])].join(' '), seat: null },
    ...reportClauses(run).map(c => ({ key: `report:${c.label.toLowerCase()}`, label: c.label, text: `${c.label}. ${c.text}`, seat: null }))
  ]
}

/** A parsed run back in its wire form (seats by id), so it round-trips through parseCouncilRun. */
export function councilRunWire(run: CouncilRun): Record<string, unknown> {
  const id = (i: number) => run.seats[i]?.id ?? ''
  return {
    schema: COUNCIL_SCHEMA, brief: run.brief, ...(run.constraints ? { constraints: [...run.constraints] } : {}), rounds: run.rounds,
    seats: run.seats.map(s => ({ id: s.id, name: s.name, family: s.family, mineral: s.mineral, crew: [...s.crew] })),
    events: run.events.map(e => e.type === 'spawn' ? { type: e.type, seat: id(e.seat) } : { type: e.type, seat: id(e.seat), round: e.round, cites: e.cites.map(id) }),
    verdicts: run.verdicts.map(v => ({ seat: id(v.seat), stance: v.stance, text: v.text })),
    ...(run.outcome === undefined ? {} : { outcome: run.outcome })
  }
}

/** The passages from `position` on: the rest of its passage from its sentence, then the passages after it. */
export function remaining(passages: readonly CouncilPassage[], position: Pick<CouncilPosition, 'passage' | 'sentence'>, through?: string): { key: string; sentence: number; text: string }[] {
  const from = position.passage === null ? 0 : Math.max(0, passages.findIndex(p => p.key === position.passage))
  const last = through === undefined ? passages.length - 1 : passages.findIndex(p => p.key === through)
  return passages.slice(from, last + 1).flatMap((p, i) => speechSentences(p.text)
    .map((text, sentence) => ({ key: p.key, sentence, text }))
    .filter(s => i > 0 || position.passage === null || s.sentence >= position.sentence))
}

const KEYS = ['schema', 'council_id', 'stored_session_id', 'revision', 'created_at', 'updated_at', 'started_by', 'updated_by', 'live', 'from', 'run', 'passages', 'position']
const POSITION = ['elapsed_ms', 'passage', 'sentence', 'read_aloud', 'muted']
const ID = /^council-[0-9a-f]{32}$/
const PASSAGE = /^(brief|verdict|report:[a-z0-9-]{1,24}|seat:[a-z0-9][a-z0-9._-]{0,39})$/
const nat = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max

/** A council session as another client stored it, or why it cannot be resumed here. */
export function parseCouncilSession(raw: unknown): CouncilSession | { error: string } {
  const bad = (why: string) => ({ error: `not a ${COUNCIL_SESSION_SCHEMA} session (${why})` })
  const d = record(raw)
  if (!d || typeof raw === 'string') return bad('expected an object')
  const extra = Object.keys(d).find(k => !KEYS.includes(k))
  if (extra !== undefined) return bad(`unknown field "${extra}"`)
  if (d['schema'] !== COUNCIL_SESSION_SCHEMA) return bad(`schema: expected "${COUNCIL_SESSION_SCHEMA}"`)
  if (typeof d['council_id'] !== 'string' || !ID.test(d['council_id'])) return bad('council_id')
  if (!nat(d['revision']) || d['revision'] < 1) return bad('revision')
  for (const k of ['created_at', 'updated_at', 'started_by', 'updated_by']) if (!text(d[k], 64)) return bad(k)
  if (d['stored_session_id'] !== null && !text(d['stored_session_id'], 200)) return bad('stored_session_id')
  if (typeof d['live'] !== 'boolean' || !text(d['from'], 200)) return bad('live/from')
  const run = parseCouncilRun(d['run'])
  if ('error' in run) return bad(`run: ${run.error}`)
  const seats = new Set(run.seats.map(s => s.id))
  const list = d['passages']
  if (!Array.isArray(list) || list.length < 1 || list.length > 16) return bad('passages: expected a list of 1-16')
  const passages: CouncilPassage[] = []
  for (const [i, v] of list.entries()) {
    const p = record(v)
    if (!p || Object.keys(p).some(k => !['key', 'label', 'text', 'seat'].includes(k))) return bad(`passages.${i}`)
    const { key, label, text: body, seat = null } = p
    if (typeof key !== 'string' || !PASSAGE.test(key) || passages.some(q => q.key === key)) return bad(`passages.${i}.key`)
    if (!text(label, 40) || !text(body, 4000)) return bad(`passages.${i}`)
    if (seat !== null && (typeof seat !== 'string' || !seats.has(seat))) return bad(`passages.${i}.seat`)
    passages.push(Object.freeze({ key, label, text: body, seat }))
  }
  if (passages[0]?.key !== 'brief') return bad('passages: the first passage is the brief')
  const at = record(d['position'])
  if (!at || Object.keys(at).some(k => !POSITION.includes(k))) return bad('position')
  const position = { ...START, ...at }
  if (!nat(position.elapsed_ms, 86_400_000) || !nat(position.sentence, 999) || typeof position.read_aloud !== 'boolean' || typeof position.muted !== 'boolean') return bad('position')
  if (position.passage !== null && !passages.some(p => p.key === position.passage)) return bad('position.passage')
  const state = Object.freeze({ ...d, passages: Object.freeze(passages), position: Object.freeze(position) }) as unknown as CouncilSessionState
  return { state, run }
}

/** The clock time a resumed popup starts at: the elapsed time, inside the run. */
export function resumeElapsed(session: CouncilSession, reduce = false): number {
  return Math.min(exchangeTiming(session.run, reduce).total, session.state.position.elapsed_ms)
}

// ------------------------------------------------------------------ the wire

/** The revision this client wrote from is stale: the council continued on another device. */
export class CouncilMovedOn extends Error {}

function failed(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  const code = error instanceof Error && 'code' in error ? error.code : undefined
  throw code === CONFLICT || /^the council moved on/.test(message) ? new CouncilMovedOn(message) : error
}

async function request(gw: Requester, sessionId: string, verb: string, params: Record<string, unknown>): Promise<unknown> {
  try {
    return await gw.request<unknown>(`glide.council.${verb}`, { session_id: sessionId, ...params })
  } catch (error) {
    if (!isUnsupportedFork(error)) failed(error)
  }
  // Stock Hermes: the same verb through the plugin's `/glide json` command.
  const reply = record(factoryOutput(await gw.request<unknown>('command.dispatch', {
    name: 'glide', arg: `json council.${verb} ${JSON.stringify(params)}`, session_id: sessionId
  })))
  if (!reply) throw new Error('/glide json did not answer with JSON')
  if (typeof reply['error'] === 'string') failed(Object.assign(new Error(reply['error']), { code: reply['code'] }))
  return reply
}

function session(raw: unknown): CouncilSession {
  const s = parseCouncilSession(raw)
  if ('error' in s) throw new Error(s.error)
  return s
}

export interface CouncilWire {
  readonly gw: Requester
  /** The live session this client is attached to. */
  readonly sessionId: string
  /** The Hermes conversation (the root of the session tree) the council hangs off. */
  readonly storedSessionId: string | null
}

export async function startCouncilSession(wire: CouncilWire, src: { readonly run: CouncilRun; readonly live: boolean; readonly from: string }, position: CouncilPosition = START): Promise<CouncilSession> {
  return session(await request(wire.gw, wire.sessionId, 'start', {
    stored_session_id: wire.storedSessionId, client: CLIENT, live: src.live, from: src.from,
    run: councilRunWire(src.run), passages: councilPassages(src.run), position
  }))
}

export async function loadCouncilSession(wire: CouncilWire, councilId: string): Promise<CouncilSession> {
  return session(await request(wire.gw, wire.sessionId, 'load', { council_id: councilId }))
}

export async function listCouncilSessions(wire: CouncilWire): Promise<CouncilSummary[]> {
  const reply = record(await request(wire.gw, wire.sessionId, 'list', { ...(wire.storedSessionId ? { stored_session_id: wire.storedSessionId } : {}) }))
  const rows = reply?.['councils']
  if (!Array.isArray(rows)) throw new Error('glide.council.list did not answer with councils')
  return rows.flatMap(row => {
    const r = record(row)
    return r && typeof r['council_id'] === 'string' && typeof r['brief'] === 'string' ? [r as unknown as CouncilSummary] : []
  })
}

/**
 * Publishes where this client is, one write in flight and the newest position queued behind it.
 * A refused stale write means another device took the council over: syncing stops there.
 */
export class CouncilSync {
  #revision: number
  #queued: CouncilPosition | undefined
  #flight: Promise<void> | undefined
  #movedOn: string | undefined
  constructor(readonly wire: CouncilWire, readonly councilId: string, revision: number, private readonly onMovedOn: (why: string) => void = () => undefined) {
    this.#revision = revision
  }
  get revision(): number { return this.#revision }
  get movedOn(): boolean { return this.#movedOn !== undefined }
  report(position: CouncilPosition): Promise<void> {
    if (this.#movedOn !== undefined) return Promise.resolve()
    this.#queued = position
    this.#flight ??= this.#drain().finally(() => { this.#flight = undefined })
    return this.#flight
  }
  async #drain(): Promise<void> {
    for (let next = this.#queued; next && this.#movedOn === undefined; next = this.#queued) {
      this.#queued = undefined
      try {
        const s = session(await request(this.wire.gw, this.wire.sessionId, 'position', {
          council_id: this.councilId, client: CLIENT, base_revision: this.#revision, position: next
        }))
        this.#revision = s.state.revision
      } catch (error) {
        if (!(error instanceof CouncilMovedOn)) throw error
        this.#movedOn = error.message
        this.onMovedOn(error.message)
      }
    }
  }
}
