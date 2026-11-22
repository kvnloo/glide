// fframestudio's own files, decoded at the boundary: the bridge writes `~/.config/fframestudio/bridge.json`
// ({url, token, root}) when it starts, and every imported film is `<root>/projects/<id>/project.json`.
import * as z from 'zod/mini'

import { parseJson } from './json.js'

export const filmId = (id: string): boolean => /^[\w.-]+$/.test(id) && id !== '.' && id !== '..'
const bridge = z.object({ url: z.string().check(z.regex(/^http:\/\/127\.0\.0\.1:\d+$/)), token: z.string().check(z.regex(/^[\w.-]+$/)), root: z.string() })
const shot = z.object({ id: z.string(), name: z.string(), t0: z.number(), t1: z.number() })
const project = z.object({
  id: z.string().check(z.regex(/^[\w.-]+$/)), title: z.string(), kind: z.optional(z.string()),
  duration_s: z.optional(z.nullable(z.number())), shots: z.array(shot), renders: z.optional(z.array(z.unknown()))
})
const frames = z.number().check(z.int(), z.nonnegative())
const canonical = z.object({
  schema: z.literal('fframestudio.project/1'), id: z.string(), title: z.string(),
  fps: z.object({ num: z.number().check(z.positive()), den: z.number().check(z.positive()) }),
  videos: z.array(z.object({ clips: z.array(z.object({ id: z.string(), name: z.string(), start: frames, duration: frames })) })),
  metadata: z.optional(z.object({ kind: z.optional(z.string()), renders: z.optional(z.array(z.unknown())) }))
})
const takes = z.object({ takes: z.array(z.object({ id: z.string(), revision: frames, seconds: z.number().check(z.positive()) })).check(z.maxLength(20)) })
const library = z.object({ projects: z.array(z.object({ id: z.string(), title: z.string(), duration_s: z.optional(z.nullable(z.number())), shots: z.optional(z.number()) })) })

export type FilmBridge = z.infer<typeof bridge>
export type FilmProject = z.infer<typeof project>
export type FilmLibrary = z.infer<typeof library>

const decode = <T>(schema: z.ZodMiniType<T>, text: string): T | undefined => {
  const r = schema.safeParse(parseJson(text))
  return r.success ? r.data : undefined
}
export const filmBridge = (text: string): FilmBridge | undefined => decode(bridge, text)
export function filmProject(text: string): FilmProject | undefined {
  const saved = decode(canonical, text)
  if (!saved) return decode(project, text)
  const seconds = (n: number) => n * saved.fps.den / saved.fps.num
  const shots = saved.videos[0]?.clips.map(c => ({ id: c.id, name: c.name, t0: seconds(c.start), t1: seconds(c.start + c.duration) })) ?? []
  return { id: saved.id, title: saved.title, shots, kind: saved.metadata?.kind, renders: saved.metadata?.renders }
}
export const filmTakes = (text: string) => decode(takes, text)?.takes.filter(take => filmId(take.id))
export type FilmTake = NonNullable<ReturnType<typeof filmTakes>>[number]

export function takeUrl(b: FilmBridge, projectId: string, takeId: string): string {
  // Build the route ourselves; never navigate to an arbitrary URL from a receipt.
  const to = `lib/${encodeURIComponent(projectId)}/renders/${encodeURIComponent(takeId)}.mp4`
  return `${b.url}/open?token=${encodeURIComponent(b.token)}&to=${encodeURIComponent(to)}`
}

export const filmLibrary = (text: string): FilmLibrary | undefined => decode(library, text)

/** The editor deep link: `/open` trades the token for a same-site cookie, then routes to the project. */
export const editorUrl = (b: FilmBridge, id: string): string => `${b.url}/open?token=${encodeURIComponent(b.token)}&to=${encodeURIComponent(`#/p/${id}`)}`
