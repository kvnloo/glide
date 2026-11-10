// The fframestudio `factory` plugin's `/factory json <verb>` answers: decoded here, not trusted.
import * as z from 'zod/mini'

import { parseJson } from './json.js'

const run = z.object({
  run: z.string(),
  state: z.enum(['ready', 'running', 'done', 'failed']),
  output: z.nullable(z.string()),
  seconds: z.nullable(z.number()),
  verdict: z.nullable(z.string()),
  compare: z.nullable(z.string())
})
const scene = z.object({
  scene: z.string(), videos: z.number(), model: z.nullable(z.string()), duration: z.nullable(z.string()),
  direction: z.string(), takes: z.array(z.nullable(z.string()))
})

const suggestion = z.object({
  run: z.string().check(z.minLength(1)),
  action: z.enum(['render', 'review']),
  title: z.string(),
  contract_id: z.string().check(z.minLength(1)),
  session_id: z.string().check(z.minLength(1)),
  status: z.enum(['pending', 'approved', 'rejected']),
  review: z.object({ available: z.literal(false), reason: z.string() })
})

export const factoryAnswers = {
  status: z.object({
    comfy: z.object({ running: z.boolean(), free_vram_mb: z.optional(z.number()), error: z.optional(z.string()) }),
    runs: z.array(run),
    rendering: z.nullable(z.string())
  }),
  runs: z.object({ runs: z.array(run) }),
  scenes: z.object({ hits: z.array(scene) }),
  render: z.object({ run: z.string(), state: z.enum(['queued', 'running']) }),
  suggest: z.object({
    runs: z.array(run), suggestions: z.array(suggestion),
    running_count: z.number().check(z.int(), z.gte(0)),
    error: z.optional(z.string()), fail_closed: z.optional(z.boolean())
  })
}
export type FactoryStatus = z.infer<typeof factoryAnswers.status>
export type FactoryRun = z.infer<typeof run>
export type FactoryScene = z.infer<typeof scene>
export type FactorySuggestion = z.infer<typeof suggestion>
export type FactorySnapshot = z.infer<typeof factoryAnswers.suggest>

const dispatchAnswer = z.object({ output: z.string() })

export function factoryOutput(value: unknown): string {
  const answer = dispatchAnswer.safeParse(value)
  if (!answer.success) throw new Error('unexpected /factory dispatch answer')
  return answer.data.output
}

const failure = z.object({ error: z.string() })

/** One `/factory json` output: the verb's answer, or throws the plugin's error / a decode error. */
export function decodeFactory<S extends z.ZodMiniType>(schema: S, output: string): z.infer<S> {
  const value = parseJson(output)
  const ok = schema.safeParse(value)
  if (ok.success) return ok.data
  const err = failure.safeParse(value)
  if (err.success) throw new Error(err.data.error)
  throw new Error('unexpected /factory answer')
}
