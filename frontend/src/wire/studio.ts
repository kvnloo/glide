import * as z from 'zod/mini'

const title = z.string().check(z.minLength(1), z.maxLength(200))
const projectSchema = z.object({
  schema: z.literal('fframestudio.project/1'), id: title, title,
  videos: z.array(z.object({
    id: title, name: title,
    scenes: z.array(z.object({ id: title, name: title, clipIds: z.array(title) })),
    clips: z.array(z.object({ id: title, name: title, mediaId: z.nullable(z.string()),
      attached: z.array(z.object({ id: title, kind: title, field: z.optional(title) })) }))
  }))
})
const snapshotSchema = z.object({ mode: z.enum(['native', 'web']), url: z.string(), project: z.nullable(projectSchema) })
export type StudioSnapshot = z.infer<typeof snapshotSchema>

export function studioSnapshot(raw: unknown): StudioSnapshot {
  const result = snapshotSchema.parse(raw)
  const url = new URL(result.url)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search ||
      url.pathname !== '/' || (url.hash && !/^#\/p\/[\w-][\w.-]*$/.test(url.hash))) {
    throw new Error('Studio requires a credential-free HTTP loopback URL')
  }
  return result
}

