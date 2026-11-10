import * as z from 'zod/mini'

export const glideMemory = z.object({
  sessions: z.number(), corrections: z.number(), complete: z.boolean(), on: z.boolean(), scanned: z.optional(z.number())
})
export const glideDetect = z.object({
  os: z.string(), cpus: z.number(), ram_gib: z.nullable(z.number()), gpus: z.array(z.string()), runtimes: z.array(z.string()),
  z0int: z.object({
    installed: z.boolean(), ok: z.optional(z.boolean()), failed: z.optional(z.array(z.string())),
    hint: z.optional(z.string()), unchecked: z.optional(z.boolean())
  }),
  memory: glideMemory
})
export const glideRecall = z.object({ hits: z.array(z.object({ text: z.string(), score: z.number() })) })
export type GlideMemory = z.infer<typeof glideMemory>
export type GlideDetect = z.infer<typeof glideDetect>
