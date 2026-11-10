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

export const factoryAnswers = {
  status: z.object({
    comfy: z.object({ running: z.boolean(), free_vram_mb: z.optional(z.number()), error: z.optional(z.string()) }),
    runs: z.array(run),
    rendering: z.nullable(z.string())
  }),
  runs: z.object({ runs: z.array(run) }),
  scenes: z.object({ hits: z.array(scene) }),
  render: z.object({ run: z.string(), state: z.string() })
}
export type FactoryStatus = z.infer<typeof factoryAnswers.status>
export type FactoryRun = z.infer<typeof run>
export type FactoryScene = z.infer<typeof scene>

const failure = z.object({ error: z.string() })

/** One `/factory json` output: the verb's answer, or throws the plugin's error / a decode error. */
export function decodeFactory<S extends z.ZodMiniType>(schema: S, output: string): z.infer<S> {
  const value = parseJson(output)
  const err = failure.safeParse(value)
  if (err.success) throw new Error(err.data.error)
  const ok = schema.safeParse(value)
  if (!ok.success) throw new Error('unexpected /factory answer')
  return ok.data
}
