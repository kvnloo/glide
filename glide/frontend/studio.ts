import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { EuiNativeCard } from '../../frontend/src/eui/host.js'
import type { UiNode, UiParts } from '../../frontend/src/glideui/library.js'
import { record } from '../../frontend/src/wire/json.js'
import type { StudioSnapshot } from '../../frontend/src/wire/studio.js'
export { studioSnapshot, type StudioSnapshot } from '../../frontend/src/wire/studio.js'
import { STUDIO_RUNTIME } from './studioRuntime.js'

/** Scene membership comes from the canonical app document, not a guessed layer format. */
export function studioTree(project: StudioSnapshot['project']): UiParts['List']['items'] {
  const items: UiParts['List']['items'][number][] = []
  let omitted = 0
  const add = (item: UiParts['List']['items'][number]) => items.length < 80 ? items.push(item) : omitted++
  for (const video of project?.videos ?? []) {
    const grouped = new Set(video.scenes.flatMap(scene => scene.clipIds))
    const scenes = [...video.scenes, ...video.clips.filter(clip => !grouped.has(clip.id)).map(clip => ({ id: clip.id, name: clip.name, clipIds: [clip.id] }))]
    const clips = new Map(video.clips.map(clip => [clip.id, clip]))
    for (const scene of scenes) {
      const group = `${video.name} / ${scene.name}`
      if (!scene.clipIds.length) add({ id: `${video.id}/${scene.id}`, group, label: scene.name, detail: 'No layers' })
      for (const id of scene.clipIds) {
        const clip = clips.get(id)
        if (!clip) continue
        const key = `${video.id}/${scene.id}/${clip.id}`
        if (clip.mediaId) add({ id: `${key}/media`, group, label: clip.name, detail: 'Media layer' })
        for (const layer of clip.attached) add({ id: `${key}/${layer.id}`, group, label: layer.field ?? layer.kind, detail: `${clip.name} / ${layer.kind}` })
        if (!clip.mediaId && !clip.attached.length) add({ id: `${video.id}/${clip.id}`, group, label: clip.name, detail: 'No layers' })
      }
    }
  }
  if (omitted) items.push({ id: 'omitted', label: `${omitted} more layers`, detail: 'Open the studio for the full project' })
  return items
}

export type StudioState = { phase: 'starting' } | { phase: 'open'; snapshot: StudioSnapshot } |
  { phase: 'error'; message: string; snapshot?: StudioSnapshot }

/** The native bound glide/v1 tree uses the same Card/List grammar as fleet and intel. */
export function studioCard(state: StudioState): EuiNativeCard {
  const snapshot = 'snapshot' in state ? state.snapshot : undefined
  const rows = studioTree(snapshot?.project ?? null)
  return {
    kind: 'studio', app: 'glide', title: 'fframestudio',
    ui: { type: 'element', typeName: 'Card', props: {
      title: snapshot?.project?.title ?? 'fframestudio', app: 'glide',
      status: state.phase === 'starting' ? 'running' : state.phase === 'error' ? 'error' : 'done',
      source: 'Local studio',
      children: [
        { type: 'element', typeName: 'Text', props: { body: state.phase === 'starting' ? 'Opening studio…' : state.phase === 'error' ? state.message : snapshot?.mode === 'native' ? 'Native studio open beside chat' : 'Web editor open in a Tern browser pane' } },
        ...(snapshot ? [{ type: 'element', typeName: 'Kv', props: { items: [{ k: 'Editor', v: snapshot.url }, { k: 'Preview', v: 'Read-only · scenes → layers' }] } } satisfies UiNode] : []),
        { type: 'element', typeName: 'Section', props: { title: 'Project layers', aside: 'Read-only', children: rows.length ? [
          { type: 'element', typeName: 'List', props: { items: rows } }
        ] : [{ type: 'element', typeName: 'Text', props: { body: snapshot?.project ? 'This project has no scenes or layers.' : 'Select a project with /glide studio <project-id>.' } }] } }
      ]
    } }
  }
}

/** Child output is parsed at this boundary. The runtime never returns its bridge token. */
export async function studioRuntime(action: 'snapshot' | 'native' | 'web', project = ''): Promise<unknown> {
  if (project && !/^[\w-][\w.-]*$/.test(project)) throw new Error('Usage: /glide studio [project-id]')
  let stdout: string
  try {
    stdout = (await promisify(execFile)(process.execPath, ['--input-type=module', '-e', STUDIO_RUNTIME, '--', action, project], {
      timeout: 45_000, maxBuffer: 4 * 1024 * 1024, shell: false
    })).stdout
  } catch (error) {
    const reply = record(record(error)?.['stdout'])
    throw new Error(typeof reply?.['error'] === 'string' ? reply['error'] : 'Studio could not start. Check GLIDE_STUDIO_DIR and the existing app dependencies.')
  }
  const reply = record(stdout)
  if (typeof reply?.['error'] === 'string') throw new Error(reply['error'])
  if (action !== 'snapshot' && reply?.['opened'] !== true) throw new Error('Tern did not confirm opening the studio')
  return reply
}
