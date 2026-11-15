// fframestudio's own files, decoded at the boundary: the bridge writes `~/.config/fframestudio/bridge.json`
// ({url, token, root}) when it starts, and every imported film is `<root>/projects/<id>/project.json`.
import * as z from 'zod/mini'

import { parseJson } from './json.js'

const bridge = z.object({ url: z.string().check(z.regex(/^http:\/\/127\.0\.0\.1:\d+$/)), token: z.string().check(z.regex(/^[\w.-]+$/)), root: z.string() })
const shot = z.object({ id: z.string(), name: z.string(), t0: z.number(), t1: z.number() })
const project = z.object({
  id: z.string().check(z.regex(/^[\w.-]+$/)), title: z.string(), kind: z.optional(z.string()),
  duration_s: z.optional(z.nullable(z.number())), shots: z.array(shot), renders: z.optional(z.array(z.unknown()))
})
const library = z.object({ projects: z.array(z.object({ id: z.string(), title: z.string(), duration_s: z.optional(z.nullable(z.number())), shots: z.optional(z.number()) })) })

export type FilmBridge = z.infer<typeof bridge>
export type FilmProject = z.infer<typeof project>
export type FilmLibrary = z.infer<typeof library>

const decode = <T>(schema: z.ZodMiniType<T>, text: string): T | undefined => {
  const r = schema.safeParse(parseJson(text))
  return r.success ? r.data : undefined
}
export const filmBridge = (text: string): FilmBridge | undefined => decode(bridge, text)
export const filmProject = (text: string): FilmProject | undefined => decode(project, text)
export const filmLibrary = (text: string): FilmLibrary | undefined => decode(library, text)

/** The editor deep link: `/open` trades the token for a same-site cookie, then routes to the project. */
export const editorUrl = (b: FilmBridge, id: string): string => `${b.url}/open?token=${encodeURIComponent(b.token)}&to=${encodeURIComponent(`#/p/${id}`)}`
