import * as z from 'zod/mini'

import { parseJson } from './json.js'

export const INTEL_TABS = ['hill', 'skills', 'memory', 'failures', 'trace'] as const
const tab = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
export type IntelTab = z.infer<typeof tab>
const text = z.string().check(z.maxLength(200))
const id = z.string().check(z.minLength(1), z.maxLength(200))
const count = z.number().check(z.int(), z.gte(0))
const span = z.tuple([z.number().check(z.gte(0)), z.number().check(z.gte(0)), z.enum(['m', 't', 'e'])])
  .check(z.refine(value => value[1] >= value[0]))
const document = z.object({
  kind: z.literal('intel-suite'), app: z.literal('glide'),
  data: z.object({
    at: z.iso.datetime({ offset: true }).check(z.maxLength(200)), tab: z.optional(tab),
    climbs: z.array(z.object({ id, label: text, metric: text, points: z.array(z.number()).check(z.maxLength(64)), best: z.number(), unit: z.optional(text) })),
    routes: z.array(z.object({ skill: id, hits: count, corrected: count })).check(z.maxLength(12)),
    memory: z.array(z.object({ level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']), name: text, size: text, fresh: text, stale: z.boolean() })),
    failures: z.array(z.object({ sig: id, source: text, spark: z.string().check(z.regex(/^[01]{0,14}$/)), count, status: z.enum(['open', 'fixed', 'law']) })).check(z.maxLength(12)),
    trace: z.array(z.object({ lane: text, spans: z.array(span) })).check(z.refine(tracks => tracks.reduce((n, track) => n + track.spans.length, 0) <= 200)),
    notes: z.array(text)
  })
})
export type IntelDoc = z.infer<typeof document>

// Stock command.dispatch returns {output: string}, just like factoryOutput.
const dispatchAnswer = z.object({ output: z.string() })
const failure = z.object({ error: text })
function commandJson(raw: unknown): unknown {
  const answer = dispatchAnswer.safeParse(raw)
  if (!answer.success || Buffer.byteLength(answer.data.output) > 1024 * 1024) throw new Error('Invalid /intel dispatch answer')
  const value = parseJson(answer.data.output)
  const error = failure.safeParse(value)
  if (error.success) throw new Error(error.data.error)
  return value
}

/** Parse at the stock transport boundary, never trust a kit demo or a bare document. */
export function decodeIntel(raw: unknown): IntelDoc {
  const parsed = document.safeParse(commandJson(raw))
  if (!parsed.success) throw new Error('Invalid /intel data. Run /intel to request a current snapshot.')
  return parsed.data
}

export function intelText(raw: unknown): string {
  const parsed = z.object({ text: z.string().check(z.maxLength(65536)) }).safeParse(commandJson(raw))
  if (!parsed.success) throw new Error('Invalid /intel detail answer')
  return parsed.data.text
}


/** A view of the strict intel.v0 data: identifiers stay on the trusted side of actions. */
export type IntelClimb = IntelDoc['data']['climbs'][number]
export type IntelSkill = IntelDoc['data']['routes'][number]
export type IntelFailure = IntelDoc['data']['failures'][number]
export type IntelSource = 'climb' | 'skill' | 'failure'

const numberText = (n: number) => Number(n.toPrecision(4)).toString()
const signed = (n: number) => (n > 0 ? '+' : '') + numberText(n)

/** Human labels are for display only. Never use them to look up a path or a local file. */
export function intelReadableTitle(raw: string, fallback = 'Local observation'): string {
  const leaf = (raw.trim().replace(/\\/g, '/').split('/').at(-1) ?? '').trim()
  const clean = leaf.replace(/\.(?:jsonl?|sqlite3|md|py|ts|mts)\b/gi, '')
    .replace(/\b(?:climb|failure|session)-[a-f0-9]{12,}\b/gi, '')
    .replace(/\b[a-f0-9]{24,}\b/gi, '')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const label = clean || fallback
  return (label.charAt(0).toUpperCase() + label.slice(1)).slice(0, 80)
}

function safeProse(raw: string): string {
  return raw.replace(/(?:[A-Za-z]:\\|\/)[^\s,;)}\]]+/g, 'local source')
    .replace(/\[[^\]]*=[^\]]+\]/g, '').replace(/\s+/g, ' ').trim()
}
function metricName(metric: string): string {
  if (/own@3|recall@3/i.test(metric)) return 'Recall at three'
  if (/acc|validation/i.test(metric)) return 'Validation accuracy'
  if (/fitness/i.test(metric)) return 'Fitness score'
  return intelReadableTitle(metric, 'Score')
}
function relativeTime(at: string, value: string): string {
  const time = Date.parse(value), now = Date.parse(at)
  if (!Number.isFinite(time) || !Number.isFinite(now)) return safeProse(value)
  const minutes = Math.max(0, Math.floor((now - time) / 60_000))
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return 'Updated ' + minutes + ' min ago'
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return 'Updated ' + hours + ' h ago'
  return 'Updated ' + Math.floor(hours / 24) + ' d ago'
}
function uniqueLabel(label: string, used: Map<string, number>): string {
  const count = (used.get(label) ?? 0) + 1
  used.set(label, count)
  return count === 1 ? label : label + ' · item ' + count
}

/**
 * The pinned intel-suite renderer accepts only intel.v0 fields. Build truthful, human-facing
 * labels inside that schema; keep reversible maps for actions and never display opaque IDs.
 * The kit owns layout, so this does not pretend to change its tab markup or CSS.
 */
export function presentIntel(doc: IntelDoc): {
  readonly card: IntelDoc
  readonly skills: ReadonlyMap<string, string>
  readonly failures: ReadonlyMap<string, string>
} {
  const source = doc.data
  const skills = new Map<string, string>()
  const failures = new Map<string, string>()
  const skillLabels = new Map<string, number>()
  const failureLabels = new Map<string, number>()
  const climbs = [...source.climbs]
    .sort((a, b) => b.points.length - a.points.length)
    .map(row => {
      const first = row.points[0], current = row.points.at(-1)
      const delta = first === undefined || current === undefined ? null : current - first
      const direction = delta === null ? 'No score yet' : delta > 0 ? 'Rising ' + signed(delta)
        : delta < 0 ? 'Falling ' + numberText(Math.abs(delta)) : 'Steady'
      const name = intelReadableTitle(row.label, 'Hill climb')
      return { ...row,
        label: (current === undefined ? 'No score yet' : 'Now ' + numberText(current) + ' · ' + direction) + ' · ' + name,
        metric: metricName(row.metric),
        ...(row.unit === undefined ? {} : { unit: intelReadableTitle(row.unit, 'unit') })
      }
    })
  const routes = source.routes.map(row => {
    const label = uniqueLabel(intelReadableTitle(row.skill, 'Skill'), skillLabels)
    skills.set(label, row.skill)
    return { ...row, skill: label }
  })
  const memory = source.memory.map(row => ({
    ...row,
    name: (row.stale ? 'Review ' : '') + intelReadableTitle(row.name, 'Memory store'),
    size: safeProse(row.size),
    fresh: relativeTime(source.at, row.fresh)
  }))
  const orderedFailures = [...source.failures].sort((a, b) =>
    (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.count - a.count)
  const failureRows = orderedFailures.map(row => {
    const name = intelReadableTitle(row.source, 'Recorded check')
    const label = uniqueLabel((row.status === 'open' ? 'Open · ' : row.status === 'fixed' ? 'Passed · ' : 'Covered · ') + name, failureLabels)
    failures.set(label, row.sig)
    return { ...row, sig: label,
      source: row.status === 'open' ? 'Next: review the failed check'
        : row.status === 'fixed' ? 'Last check passed · verify the fix'
          : 'Rule linked · review the coverage' }
  })
  const trace = source.trace.map((row, i) => ({ ...row, lane: 'Session ' + (i + 1) }))
  const notes = source.notes.map(note => safeProse(note)
    .replace(/^climbs:/i, 'Hill climbs:').replace(/^routes:/i, 'Skill routing:')
    .replace(/^failures:/i, 'Failed checks:').replace(/^trace:/i, 'Sessions:'))
  return {
    card: { ...doc, data: { ...source, climbs, routes, memory, failures: failureRows, trace, notes } },
    skills, failures
  }
}

/** Detail panels never repeat private paths, opaque IDs or raw ledger JSON. */
export function intelDetailBody(kind: IntelSource, raw: string, row?: IntelClimb | IntelSkill | IntelFailure): string {
  if (kind === 'climb' && row && 'points' in row && raw.includes('Last 10 points:')) {
    const points = row.points
    const first = points[0], current = points.at(-1)
    return [
      'Hill climb · ' + intelReadableTitle(row.label),
      current === undefined ? 'Current score unavailable' : 'Current score: ' + numberText(current),
      first === undefined || current === undefined ? 'Trend unavailable' : 'Since first score: ' + signed(current - first),
      'Best observed: ' + numberText(row.best),
      points.length ? 'Recent scores: ' + points.slice(-10).map(numberText).join(', ') : 'No scored iterations'
    ].join('\n')
  }
  if (kind === 'skill' && row && 'skill' in row && raw.startsWith(row.skill + '\n')) {
    return safeProse(raw.slice(row.skill.length + 1)) || 'No skill description available.'
  }
  if (kind === 'failure' && row && 'sig' in row) {
    const start = raw.indexOf('\n{'), end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        const record: unknown = JSON.parse(raw.slice(start + 1, end + 1))
        if (record && typeof record === 'object' && !Array.isArray(record)) {
          const details = record as Record<string, unknown>
          const what = typeof details['what'] === 'string' ? safeProse(details['what']) : 'Repeated failed check'
          const next = row.status === 'open' ? 'Next: inspect the failed check and confirm a fix.'
            : row.status === 'fixed' ? 'Next: verify the passing check still holds.'
              : 'Next: verify the registered rule still covers this case.'
          return [what, 'Failed checks: ' + row.count,
            row.status === 'open' ? 'Status: needs review' : row.status === 'fixed' ? 'Status: last check passed' : 'Status: rule coverage linked',
            next].join('\n')
        }
      } catch { /* Invalid local detail stays hidden rather than exposing raw ledger keys. */ }
    }
  }
  return /(?:[A-Za-z]:\\|\/)[^\s]+|\b(?:session|climb|failure)-[a-f0-9]{12,}\b|\n\s*\{/.test(raw)
    ? 'This detail is available in the current local snapshot. Review its source before acting.'
    : raw
}

const intent = z.discriminatedUnion('action', [
  z.object({ action: z.literal('tab'), entities: z.object({ tab }) }),
  z.object({ action: z.literal('refresh'), entities: z.object({}) }),
  z.object({ action: z.literal('open-climb'), entities: z.object({ id }) }),
  z.object({ action: z.literal('open-skill'), entities: z.object({ skill: id }) }),
  z.object({ action: z.literal('open-failure'), entities: z.object({ sig: id }) })
])
export function decodeIntelIntent(raw: unknown): z.infer<typeof intent> {
  const parsed = intent.safeParse(raw)
  if (!parsed.success) throw new Error('Unhandled or invalid intel action')
  return parsed.data
}

export function intelTab(arg: string): IntelTab | undefined {
  const words = arg.trim().split(/\s+/).filter(Boolean)
  if (words[0] === '--json') words.shift()
  if (!words.length) return 0
  if (words.length !== 1) return undefined
  const index = tab.safeParse(INTEL_TABS.findIndex(name => name === words[0]))
  return index.success ? index.data : undefined
}

/** One opaque entity for the backend's shlex parser, never a shell invocation. */
export function intelEntity(entity: string): string {
  return /^[a-zA-Z0-9_./:-]+$/.test(entity) ? entity : `'${entity.replace(/'/g, "'\\''")}'`
}
