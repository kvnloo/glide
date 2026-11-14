import { orbSvg } from '../../frontend/src/chrome/orb.js'
import { closedSeats, type CouncilRun, type Frame, MINERAL, schedule, TURN_MS } from './council.js'
import { NIGHT } from './tokens.js'

const DELIVERY_MS = 900
const CLAUSE_MS = 650
export interface ReportClause { readonly label: string; readonly text: string }
export interface ExchangeSeat { readonly received: boolean; readonly state: 'waiting' | 'received' | 'thinking' | 'drafting' | 'done' }
export interface CouncilExchange {
  readonly phase: 'seated' | 'brief' | 'sending' | 'working' | 'report' | 'done'
  readonly brief: string
  readonly constraints: readonly string[]
  readonly delivery: number
  readonly frame: Frame
  readonly seats: readonly ExchangeSeat[]
  readonly clauses: readonly ReportClause[]
  readonly reduce: boolean
  readonly elapsed: number
}

/** A report quotes the snapshot. It never invents a recommendation or a receipt. */
export function reportClauses(run: CouncilRun): ReportClause[] {
  const clauses = [{ label: 'Verdict', text: run.outcome ?? (run.verdicts.length ? 'Recorded seat replies' : 'No verdict recorded') }]
  for (const stance of ['agree', 'dissent', 'abstain'] as const) {
    const replies = run.verdicts.filter(v => v.stance === stance)
    const label = stance === 'agree' ? 'Agreements' : stance === 'dissent' ? 'Dissent' : 'Abstentions'
    clauses.push({ label, text: replies.length ? replies.map(v => `${run.seats[v.seat]?.name ?? 'Seat'}: ${v.text}`).join(' ') : 'None recorded.' })
  }
  const receipts = run.seats.flatMap((seat, i) => {
    const turn = run.events.findLast(e => e.type === 'turn' && e.seat === i && e.cites.length > 0)
    return turn?.type === 'turn' ? [`Round ${turn.round}: ${seat.name} cited ${turn.cites.map(s => run.seats[s]?.name ?? 'Seat').join(', ')}.`] : []
  })
  clauses.push({ label: 'Receipts', text: receipts.length ? receipts.join(' ') : 'No citation receipts recorded.' })
  return clauses
}

export function exchangeTiming(run: CouncilRun, reduce = false) {
  const typing = reduce ? 0 : Math.min(3200, Math.max(900, (run.brief.length + (run.constraints ?? []).join('').length) * 24))
  const working = typing + (reduce ? 0 : DELIVERY_MS)
  const report = working + schedule(run).total
  return { typing, working, report, total: report + (reduce ? 0 : reportClauses(run).length * CLAUSE_MS) }
}

/** One seekable clock drives the existing instrument and the new exchange. */
export function exchangeAt(run: CouncilRun, t: number | null, reduce = false): CouncilExchange {
  const elapsed = Math.max(0, t ?? 0)
  const timing = exchangeTiming(run, reduce)
  const phase = t === null ? 'seated' : elapsed < timing.typing ? 'brief' : elapsed < timing.working ? 'sending'
    : elapsed < timing.report ? 'working' : elapsed < timing.total ? 'report' : 'done'
  const frame = { t: t === null || elapsed < timing.working ? null : Math.min(schedule(run).total, elapsed - timing.working) }
  const closed = closedSeats(run, frame)
  const { at } = schedule(run)
  const delivery = phase === 'sending' ? (elapsed - timing.typing) / DELIVERY_MS : phase === 'brief' || phase === 'seated' ? 0 : 1
  const characters = run.brief.length + (run.constraints ?? []).join('').length
  let typed = phase === 'brief' ? Math.floor(characters * elapsed / timing.typing) : characters
  const brief = run.brief.slice(0, typed)
  typed -= run.brief.length
  const constraints = (run.constraints ?? []).map(text => { const line = text.slice(0, Math.max(0, typed)); typed -= text.length; return line })
  return {
    phase, elapsed, reduce, frame, delivery, brief, constraints,
    seats: run.seats.map((_, i) => {
      const received = t !== null && delivery >= (i + 1) / run.seats.length
      const drafting = run.events.some((e, k) => e.type === 'turn' && e.seat === i && frame.t !== null && frame.t >= (at[k] ?? 0) && frame.t < (at[k] ?? 0) + TURN_MS)
      return { received, state: closed.has(i) ? 'done' : frame.t !== null ? drafting ? 'drafting' : 'thinking' : received ? 'received' : 'waiting' }
    }),
    clauses: phase === 'done' ? reportClauses(run) : phase === 'report' ? reportClauses(run).slice(0, 1 + Math.floor((elapsed - timing.report) / CLAUSE_MS)) : []
  }
}

/** Envelopes leave the brass brief boss for the same seat angles as the instrument. */
export function deliverySvg(run: CouncilRun, view: CouncilExchange, size: number): string {
  if ((view.phase !== 'sending' && view.phase !== 'report') || view.reduce) return ''
  const center = size / 2
  const converge = view.phase === 'report'
  const marks = run.seats.map((seat, i) => {
    const progress = converge ? Math.min(1, (view.elapsed - exchangeTiming(run).report) / CLAUSE_MS) : Math.max(0, Math.min(1, view.delivery * run.seats.length - i))
    if (progress >= 1) return ''
    const angle = -Math.PI / 2 + Math.PI / run.seats.length + i * Math.PI * 2 / run.seats.length
    const radius = size * .335 * (converge ? 1 - progress : progress)
    const x = center + Math.cos(angle) * radius
    const y = center + Math.sin(angle) * radius
    return `<g data-envelope="${seat.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" stroke="${MINERAL[seat.mineral].base}" fill="${NIGHT.canvas}" stroke-width="1.5"><rect x="-13" y="-9" width="26" height="18" rx="2"/><path d="M-13-9L0 1L13-9" fill="none"/></g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${marks}</svg>`
}

/** The shared thinking-orbs engine, tinted with literal inks for Tern SVG images. */
export function councilOrbSvg(seconds: number, amplitude: number, reduce: boolean, ink = '#d7b986'): string {
  const level = Math.max(0, Math.min(1, amplitude))
  const source = orbSvg('speaking', reduce ? .6 : seconds, true)
  const scale = reduce ? 1 : .9 + level * .14
  const hue = reduce ? ink : `#${[1, 3, 5].map(at => Math.round(parseInt(ink.slice(at, at + 2), 16) * (1 - level * .25) + 255 * level * .25).toString(16).padStart(2, '0')).join('')}`
  return source.replace(/width="68" height="68"/, 'width="320" height="320"')
    .replace(/#[0-9a-f]{6}/gi, hue)
    .replace('viewBox="0 0 64 64">', `viewBox="0 0 64 64"><g transform="translate(32 32) scale(${scale.toFixed(3)}) translate(-32 -32)">`)
    .replace('</svg>', '</g></svg>')
}
