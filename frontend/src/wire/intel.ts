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
