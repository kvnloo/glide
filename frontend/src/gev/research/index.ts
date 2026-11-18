// `/research [case]`: a deep-research run replayed as a live GEV card. Days of pulling sources
// play back in ~40 s on a log clock, so the first minutes (the sim being built) stay readable and the
// long tail of sources still lands. Without a case: the list of cases.

import type { EuiKitIntent, EuiNativeCard, EuiNativeHandle } from '../../eui/host.js'
import type { Transcript } from '../../transcript/store.js'
import { record } from '../../wire/json.js'
import { embedUrl } from '../../wire/gev.js'

import { type Browser, captureGlobe, openGlobe, paneBlock, ternBrowser } from '../globe.js'
import { at, type ResearchCase } from './case.js'
import { researchCard, type ResearchCardState } from './card.js'
import { AUTHORED } from './cases/authored.js'
import { LEARJET } from './cases/learjet.js'

export const CASES: readonly ResearchCase[] = [LEARJET, ...AUTHORED]
const GEV = process.env['GEV_URL'] ?? 'http://127.0.0.1:4191/'

/** Case minute at replay fraction `x` (0..1): log-spaced, so minute 1 and day 10 both get screen time. */
export function clock(span: number, x: number): number {
  if (x >= 1) return span
  return Math.min(span, Math.expm1(Math.log1p(span) * Math.max(0, x)))
}

export function findCase(arg: string): ResearchCase | undefined {
  const q = arg.trim().toLowerCase()
  if (!q) return undefined
  return CASES.find(c => c.id === q) ?? CASES.find(c => c.id.includes(q) || c.title.toLowerCase().includes(q))
}

export interface ResearchHost {
  /** Inline cards: only publishing a native card and updating it are used. */
  readonly eui?: { readonly host: { publishNative(card: EuiNativeCard, intent: EuiKitIntent): Pick<EuiNativeHandle, 'update'> } } | undefined
  readonly transcript: Pick<Transcript, 'notice' | 'panel'>
}

export interface ReplayOptions { readonly seconds?: number; readonly fps?: number; readonly browser?: Browser; readonly owner?: number | undefined }

export async function researchCommand(host: ResearchHost, arg: string, o: ReplayOptions = {}): Promise<void> {
  const c = findCase(arg)
  if (!c) {
    host.transcript.panel('/research <case>', CASES.map(x => `${x.id.padEnd(18)} ${x.title}  (${x.basis === 'kb' ? 'real sources' : 'authored example'}; after "${x.inspiredBy.title}")`).join('\n'))
    return
  }
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('/research needs inline cards', 'warning')
    return
  }
  const browser = o.browser ?? ternBrowser
  const owner = 'owner' in o ? o.owner : paneBlock()
  const url = new URL(c.view, GEV).toString()
  const seconds = o.seconds ?? 40
  const fps = o.fps ?? 4
  let view: ResearchCardState = {}
  let x = 0
  let handle: Pick<EuiNativeHandle, 'update'> | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  const card = () => ({ kind: 'gev-research', app: "God's Eye View", title: `Deep research · ${c.title}`, ui: researchCard(at(c, clock(c.span, x)), view) })
  const push = () => { try { handle?.update(card(), intent) } catch { stop() } }
  const stop = () => { if (timer) clearInterval(timer); timer = undefined }
  const play = () => {
    stop()
    timer = setInterval(() => {
      x = Math.min(1, x + 1 / (seconds * fps))
      push()
      if (x >= 1) stop()
    }, 1000 / fps)
  }
  const intent = async (detail: unknown) => {
    const action = record(detail)?.['action']
    if (action === 'pause') { stop(); view = { ...view, paused: true }; push() }
    if (action === 'resume') { view = { ...view, paused: false }; play() }
    if (action === 'open' && owner !== undefined) {
      await openGlobe(url, owner, browser).catch(e => host.transcript.notice(`God's Eye View: ${e instanceof Error ? e.message : String(e)}`, 'warning'))
    }
  }

  if (owner !== undefined) view = { ...view, capturing: true }
  handle = eui.host.publishNative(card(), intent)
  if (owner !== undefined) {
    void captureGlobe(embedUrl(url), owner, browser, 60000).then(
      shot => { view = { ...view, capturing: false, png: shot.png, size: { w: shot.w, h: shot.h } } },
      (e: unknown) => { view = { ...view, capturing: false, failed: e instanceof Error ? e.message : String(e) } }
    ).then(push)
  }
  play()
}
