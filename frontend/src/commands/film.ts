// `/film [project]`: fframes films from the fframestudio library, inside Glide. With a project, a native card
// (length, shots, renders) and the real fframestudio editor opened in a Tern browser block under the pane.
// Without one, the library. Needs a running bridge (`npm run bridge` in fframestudio); says so otherwise.

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { EuiKitIntent, EuiNativeCard, EuiNativeHandle } from '../eui/host.js'
import { type Browser, paneBlock, ternBrowser } from '../gev/globe.js'
import type { UiNode } from '../glideui/library.js'
import type { Transcript } from '../transcript/store.js'
import { editorUrl, type FilmBridge, filmBridge, filmLibrary, type FilmProject, filmProject, filmId, filmTakes, type FilmTake, takeUrl } from '../wire/fframestudio.js'
import { record } from '../wire/json.js'

export interface FilmHost {
  readonly eui?: { readonly host: { publishNative(card: EuiNativeCard, intent: EuiKitIntent): Pick<EuiNativeHandle, 'update'> } } | undefined
  readonly transcript: Pick<Transcript, 'notice' | 'panel'>
}
export interface FilmDeps { readonly read?: (path: string) => Promise<string>; readonly browser?: Browser; readonly owner?: number | undefined; readonly bridgeFile?: string; readonly loadTakes?: (bridge: FilmBridge, id: string) => Promise<FilmTake[] | undefined> }

const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

async function loadTakes(b: FilmBridge, id: string) {
  const r = await fetch(`${b.url}/render?project=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${b.token}` }, redirect: 'error', signal: AbortSignal.timeout(1000)
  })
  return r.ok ? filmTakes(await r.text()) : undefined
}

export function filmCard(p: FilmProject, opened: boolean, takes: readonly FilmTake[] = []): UiNode {
  const len = p.duration_s ?? p.shots.at(-1)?.t1 ?? 0
  return { type: 'element', typeName: 'Card', props: { title: p.title, app: 'FFRAMESTUDIO', status: opened ? 'done' : 'running', children: [
    { type: 'element', typeName: 'Stats', props: { items: [
      { label: 'Length', value: `${len.toFixed(1)} s`, tone: 'accent' },
      { label: 'Shots', value: String(p.shots.length) },
      { label: 'Renders', value: String(p.renders?.length ?? 0) },
      { label: 'Kind', value: p.kind ?? 'fframes' }
    ] } },
    { type: 'element', typeName: 'Section', props: { title: 'Shots', aside: `${p.shots.length}`, children: [
      { type: 'element', typeName: 'List', props: { numbered: true, items: p.shots.slice(0, 8).map(s => ({ id: s.id, label: s.name, value: `${clock(s.t0)}–${clock(s.t1)}` })) } }
    ] } },
    { type: 'element', typeName: 'Buttons', props: { items: [{ label: opened ? 'Open again in fframestudio' : 'Opening fframestudio…', intent: { action: 'open', entities: { project: p.id } }, primary: true }, ...(takes[0] ? [{ label: `Play latest export take · ${takes[0].seconds.toFixed(1)} s`, intent: { action: 'play-take' } }] : [])] } }
  ] } }
}

export async function filmCommand(host: FilmHost, arg: string, d: FilmDeps = {}): Promise<void> {
  const read = d.read ?? (path => readFile(path, 'utf8'))
  const file = d.bridgeFile ?? process.env['FFRAMESTUDIO_BRIDGE'] ?? join(homedir(), '.config', 'fframestudio', 'bridge.json')
  const b: FilmBridge | undefined = filmBridge(await read(file).catch(() => ''))
  if (!b) {
    host.transcript.notice('/film needs fframestudio: run `npm run bridge` in its checkout', 'warning')
    return
  }
  const id = arg.trim()
  if (!id) {
    const lib = filmLibrary(await read(join(b.root, 'projects', 'library.json')).catch(() => ''))
    host.transcript.panel('/film <project>', lib ? lib.projects.map(p => `${p.id.padEnd(30)} ${p.title}`).join('\n') : 'The fframestudio library is empty.')
    return
  }
  const p = filmId(id) ? filmProject(await read(join(b.root, 'projects', id, 'project.json')).catch(() => '')) : undefined
  if (!p || p.id !== id) {
    host.transcript.notice(`/film: no fframestudio project "${id}"`, 'warning')
    return
  }
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('/film needs inline cards', 'warning')
    return
  }
  const browser = d.browser ?? ternBrowser
  const owner = 'owner' in d ? d.owner : paneBlock()
  const takes = await (d.loadTakes ?? loadTakes)(b, id).catch(() => undefined) ?? []
  let handle: Pick<EuiNativeHandle, 'update'> | undefined
  const open = async (url: string) => {
    if (owner === undefined) throw new Error('not inside a Tern pane')
    await browser({ op: 'open', owner, url, how: 'below' })
  }
  const card = (opened: boolean) => ({ kind: 'fframes-film', app: 'fframestudio', title: p.title, ui: filmCard(p, opened, takes) })
  const intent = async (detail: unknown) => {
    const action = record(detail)?.['action']
    const take = takes[0]
    const url = action === 'open' ? editorUrl(b, id) : action === 'play-take' && take && filmId(take.id) ? takeUrl(b, id, take.id) : undefined
    if (url) await open(url).catch(e => host.transcript.notice(`fframestudio: ${e instanceof Error ? e.message : String(e)}`, 'warning'))
  }
  handle = eui.host.publishNative(card(false), intent)
  await open(editorUrl(b, id)).then(() => handle?.update(card(true), intent), (e: unknown) => host.transcript.notice(`fframestudio: ${e instanceof Error ? e.message : String(e)}`, 'warning'))
}
