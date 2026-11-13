// /council: the Socratic council instrument as a popup, drawn as a trusted ephemeral-ui card in
// the layer. It opens from the slash command or from the "Open the council" button of a council
// card in the transcript. With GLIDE_COUNCIL_URL set it reads that endpoint's run; otherwise, or when
// the endpoint fails, it shows the synthetic demo run under a visible "demo" tag. It never draws a
// live verdict it did not read. The frame clock runs only while a run plays.
import type { EuiApprovalContext, EuiHostCards } from '../../frontend/src/eui/host.js'
import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import { nativeOverlayKey } from '../../frontend/src/overlays/identity.js'
import type { Overlay, OverlayHost } from '../../frontend/src/overlays/overlay.js'
import type { Transcript } from '../../frontend/src/transcript/store.js'
import { euiPopupNode, type EuiRender } from '../../frontend/src/view/euiCard.js'

import {
  closedSeats, type CouncilRun, demoRun, type Frame, instrumentSvg, MINERAL, narration, parseCouncilRun, schedule, swatchSvg
} from './council.js'
import { GOLD, MONO, NIGHT, SERIF } from './tokens.js'

export const COUNCIL_URL_ENV = 'GLIDE_COUNCIL_URL'
const APP = 'glide'
const TICK_MS = 110
export const CONVENE_ID = 1
export const CLOSE_ID = 2

/** A run and where it came from: `live` only when it was read and parsed from the configured endpoint. */
export interface CouncilSource {
  readonly run: CouncilRun
  readonly live: boolean
  /** The endpoint's host for a live run; why the demo is shown otherwise. */
  readonly from: string
  /** Set when an endpoint was configured but could not be read. */
  readonly note?: string
}

export interface CouncilClock {
  now(): number
  /** Calls `tick` every `ms` until the returned cancel runs. */
  every(tick: () => void, ms: number): () => void
}
const realClock: CouncilClock = {
  now: () => performance.now(),
  every: (tick, ms) => { const id = setInterval(tick, ms); return () => { clearInterval(id) } }
}

export interface CouncilHost extends OverlayHost {
  readonly eui?: (EuiRender & { readonly host: Pick<EuiHostCards, 'publish'> }) | undefined
  readonly transcript: Pick<Transcript, 'notice'>
}

/** The configured endpoint's run, else the demo run (with a note when the endpoint failed). */
export async function loadCouncil(url = process.env[COUNCIL_URL_ENV], get: typeof fetch = fetch): Promise<CouncilSource> {
  const demo = (note?: string): CouncilSource => ({ run: demoRun(), live: false, from: 'synthetic seats and brief', ...(note ? { note } : {}) })
  if (!url?.trim()) return demo()
  let where: URL
  try {
    where = new URL(url)
    if (where.protocol !== 'http:' && where.protocol !== 'https:') throw new Error('expected an http(s) URL')
  } catch (e) {
    return demo(`${COUNCIL_URL_ENV} is not usable (${e instanceof Error ? e.message : String(e)}); showing the demo run`)
  }
  try {
    const res = await get(where, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const run = parseCouncilRun(await res.json())
    if ('error' in run) throw new Error(run.error)
    return { run, live: true, from: where.host }
  } catch (e) {
    return demo(`the council at ${where.host} could not be read (${e instanceof Error ? e.message : String(e)}); showing the demo run`)
  }
}

// ------------------------------------------------------------------ the card

const STANCE = { agree: { label: 'AGREE', color: NIGHT.agree }, dissent: { label: 'DISSENT', color: NIGHT.danger }, abstain: { label: 'ABSTAIN', color: NIGHT.text3 } }

/** The popup's card at one moment, as the same node data the ephemeral-ui sandbox produces. */
/** `sideHeader` moves the title and brief beside the instrument so the card is no taller than it (a popup in a short pane). */
export function councilCard(src: CouncilSource, frame: Frame, size = 480, sideHeader = false): EuiNode {
  let next = 10
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (tag: string, style: string, kids: readonly EuiNode[], opts: { id?: number; attrs?: Record<string, string> } = {}): EuiNode => ({
    t: 'el', tag, id: opts.id ?? next++, cls: '', style, attrs: opts.attrs ?? {}, click: opts.id !== undefined, kids
  })
  const svg = (markup: string, w: number, style = ''): EuiNode => ({ t: 'svg', svg: markup, w, h: w, cls: '', style })
  const micro = `font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${NIGHT.text3}`
  const { run } = src
  const done = frame.t !== null && frame.t >= schedule(run).total
  const playing = frame.t !== null && !done
  const shown = closedSeats(run, frame)
  const agree = run.verdicts.filter(v => v.stance === 'agree').length
  const dissent = run.verdicts.filter(v => v.stance === 'dissent').length
  const abstain = run.verdicts.filter(v => v.stance === 'abstain').length

  const header = el('div', 'display:flex;flex-direction:column;gap:4px', [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px', [
      el('span', micro, [text('COUNCIL · GLIDE · SOCRATIC')]),
      el('span', `font-family:${MONO};font-size:10px;letter-spacing:.16em;padding:2px 8px;border-radius:999px;` +
        (src.live ? `color:${NIGHT.agree};border:1px solid rgba(152,207,139,0.45)` : `color:${NIGHT.strong};border:1px solid ${NIGHT.muted}`),
      [text(src.live ? `LIVE · ${src.from.toUpperCase()}` : 'DEMO')], { attrs: { 'data-council-source': src.live ? 'live' : 'demo' } })
    ]),
    el('h3', `margin:0;font-family:${SERIF};font-weight:500;font-size:${sideHeader ? '24px;line-height:28px' : '30px;line-height:34px'};color:${NIGHT.text}`, [text('Socratic council')]),
    el('span', `${micro};margin-top:6px`, [text('THE BRIEF')]),
    el('p', `margin:0;padding-bottom:8px;border-bottom:1px solid ${NIGHT.borderStrong};font-size:13px;line-height:20px;color:${NIGHT.text}`, [text(run.brief)])
  ])

  // The verdict's tone is the majority's: a 3-1 agreement is a decision, its one dissent is in the line under it.
  const carried = agree > dissent
  const verdictBox = el('div', `padding:12px 14px;border-radius:12px;border:1px solid ${done ? (carried ? 'rgba(152,207,139,0.45)' : 'rgba(227,127,101,0.45)') : NIGHT.border};background-color:rgba(28,28,24,0.55)`, [
    el('div', 'display:flex;align-items:center;gap:8px', [
      el('span', `width:8px;height:8px;border-radius:4px;flex:none;background-color:${done ? (carried ? NIGHT.agree : NIGHT.danger) : NIGHT.muted}`, []),
      el('span', `font-family:${SERIF};font-size:20px;line-height:26px;color:${NIGHT.text}`, [text(done ? (run.outcome ?? 'The council has spoken') : frame.t === null ? 'The council is seated' : 'The council is sitting')])
    ]),
    el('span', `display:block;margin-top:4px;font-size:13px;line-height:18px;color:${NIGHT.text3}`, [text(done
      ? `${agree} of ${run.verdicts.length} agree · ${dissent} dissent${abstain ? ` · ${abstain} abstain` : ''}`
      : `${run.seats.length} seats · ${run.rounds} rounds · verdicts appear as each seat closes`)])
  ])

  const seats = el('div', sideHeader ? 'display:flex;flex-wrap:wrap;gap:6px' : 'display:flex;flex-direction:column;gap:2px', run.seats.map((seat, i) => {
    const v = run.verdicts.find(x => x.seat === i)
    const open = v !== undefined && shown.has(i)
    const stance = open ? [el('span', `${sideHeader ? '' : 'margin-left:auto;'}font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${STANCE[v.stance].color}`, [text(STANCE[v.stance].label)], { attrs: { 'data-council-stance': v.stance } })] : []
    // A short pane gets one line per seat; the verdict prose lives in the transcript card.
    if (sideHeader) return el('div', `display:flex;gap:6px;align-items:center;padding:3px 10px 3px 4px;border-radius:999px;border:1px solid ${NIGHT.border}`, [
      svg(swatchSvg(seat.mineral, 16), 16, 'flex:none'),
      el('span', `font-family:${SERIF};font-size:15px;color:${NIGHT.text}`, [text(seat.name)]),
      ...(open ? stance : [el('span', `font-size:12px;color:${NIGHT.text3}`, [text(v ? '…' : '—')])])
    ])
    return el('div', `display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid ${NIGHT.border}`, [
      svg(swatchSvg(seat.mineral, 30), 30, 'flex:none'),
      el('div', 'display:flex;flex-direction:column;gap:2px;flex:1;min-width:0', [
        el('div', 'display:flex;align-items:baseline;gap:8px', [
          el('span', `font-family:${SERIF};font-size:17px;color:${NIGHT.text}`, [text(seat.name)]),
          el('span', micro, [text(`${MINERAL[seat.mineral].label.toUpperCase()} · ${seat.family.toUpperCase()}`)]),
          ...stance
        ]),
        el('span', `font-size:13px;line-height:18px;color:${open ? NIGHT.text2 : NIGHT.text3}`, [text(open ? v.text : v ? '…' : 'no verdict recorded')])
      ])
    ])
  }))

  // The label is a span: the kit sheet's button rules outrank an inline rule on the button itself.
  const button = (id: number, label: string, gold: boolean) => el('button',
    gold ? `flex:1;padding:11px 16px;border-radius:12px;border:1px solid ${GOLD.rim};border-bottom-color:${GOLD.shade};background-color:${GOLD.fill}`
      : `padding:11px 16px;border-radius:12px;border:1px solid ${NIGHT.borderStrong};background-color:transparent`,
    [el('span', gold ? `color:${GOLD.ink};font-family:${SERIF};font-size:20px` : `color:${NIGHT.text2};font-size:13px`, [text(label)])],
    { id, attrs: { 'data-eui-action': id === CONVENE_ID ? 'convene' : 'close' } })
  // Again only replays the run it read: say so, rather than promise a fresh council.
  const convene = playing ? 'Convening…' : frame.t === null ? 'Convene council  →' : 'Replay the council  →'

  return el('div', '', [el('section', `display:flex;flex-direction:column;gap:14px;padding:${sideHeader ? 14 : 18}px;border-radius:16px;border:1px solid ${NIGHT.border};background-color:${NIGHT.canvas};color:${NIGHT.text}`, [
    ...(sideHeader ? [] : [header]),
    el('div', 'display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start', [
      el('div', `flex:1 1 ${Math.min(340, size)}px;display:flex;justify-content:center`, [svg(instrumentSvg(run, frame, size), size, 'max-width:100%;height:auto')]),
      el('div', `flex:1 1 280px;display:flex;flex-direction:column;gap:${sideHeader ? 8 : 12}px;min-width:0`, [
        ...(sideHeader ? [header] : []),
        verdictBox,
        el('p', `margin:0;font-family:${SERIF};font-style:italic;font-size:15px;line-height:20px;color:${NIGHT.text2}`, [text(narration(run, frame))]),
        el('div', 'display:flex;gap:8px', [button(CONVENE_ID, convene, true), button(CLOSE_ID, 'Close', false)]),
        seats
      ])
    ]),
    // The popup's title already says live or demo; a short pane has no row to spare for the provenance line.
    ...(sideHeader ? [] : [el('span', `font-family:${MONO};font-size:10px;color:${NIGHT.text3};text-align:center`, [text(src.live
      ? `live run read from ${src.from} · this card draws it and computes nothing`
      : `demo run · ${src.from} · set ${COUNCIL_URL_ENV} to read a live council`)])])
  ])])
}

// ------------------------------------------------------------------ the popup

/** Opens the council popup; Enter convenes (plays the run), Escape closes. */
export function openCouncilPopup(host: CouncilHost, src: CouncilSource, clock: CouncilClock = realClock): Overlay | undefined {
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('/council needs a pane with ephemeral-ui cards', 'warning')
    return undefined
  }
  const total = schedule(src.run).total
  let start: number | null = null
  let stop: (() => void) | undefined
  const frame = (): Frame => ({ t: start === null ? null : Math.min(total, clock.now() - start) })
  const halt = () => { stop?.(); stop = undefined }
  const convene = () => {
    halt()
    start = clock.now()
    stop = clock.every(() => {
      if (clock.now() - (start ?? 0) >= total) halt()
      host.changed()
    }, TICK_MS)
    host.changed()
  }
  const overlay: Overlay = {
    key: 'glide-council',
    modal: true,
    focus: () => null,
    node: id => {
      const f = frame()
      const view = {
        spec: { kind: 'council', app: APP }, app: APP, label: 'Socratic council', identity: 'council',
        node: councilCard(src, f, 320, true),
        activate: (n: number) => { if (n === CONVENE_ID && !stop) convene(); else if (n === CLOSE_ID) host.close(overlay) }
      }
      return euiPopupNode(nativeOverlayKey(id), src.live ? 'Council · live' : 'Council · demo', view, eui)
    },
    onKey: key => {
      if (key.name === 'escape') host.close(overlay)
      else if ((key.name === 'enter' || key.name === 'space') && !stop) convene()
      return true
    },
    onClose: halt
  }
  host.open(overlay)
  return overlay
}

/** A council card in the transcript; its button opens the popup and re-arms for the next tap. */
export function publishCouncilCard(host: CouncilHost, src: CouncilSource, clock?: CouncilClock): void {
  const cards = host.eui?.host
  if (!cards) {
    host.transcript.notice('/council card needs an attached session with ephemeral-ui cards', 'warning')
    return
  }
  const { run } = src
  const data = {
    kind: 'approve', app: APP, title: src.live ? 'Socratic council' : 'Socratic council · demo',
    summary: run.brief,
    rows: [
      { label: 'Seats', value: run.seats.map(s => `${s.name} (${MINERAL[s.mineral].label.toLowerCase()})`).join(', ') },
      { label: 'Rounds', value: run.rounds },
      ...(run.outcome ? [{ label: 'Outcome', value: run.outcome }] : []),
      { label: 'Source', value: src.live ? `live · ${src.from}` : 'demo run · synthetic seats and brief' }
    ],
    approval: { label: 'Open the council', description: 'Opens the council instrument in a popup. It only draws this run; nothing is sent or written.' }
  }
  const open = (_ctx: EuiApprovalContext) => {
    try { handle.update(data, open) } catch { /* the pane moved on; the popup still opens */ }
    openCouncilPopup(host, src, clock)
  }
  const handle = cards.publish(data, open)
}

/** `/council` opens the popup; `/council card` posts the card whose button opens it. */
export async function councilCommand(host: CouncilHost, arg: string, load: () => Promise<CouncilSource> = loadCouncil, clock?: CouncilClock): Promise<void> {
  const verb = arg.trim().toLowerCase()
  if (verb !== '' && verb !== 'card') {
    host.transcript.notice('Usage: /council [card]', 'warning')
    return
  }
  const src = await load()
  if (src.note) host.transcript.notice(`/council: ${src.note}`, 'warning')
  try {
    if (verb === 'card') publishCouncilCard(host, src, clock)
    else openCouncilPopup(host, src, clock)
  } catch (e) {
    host.transcript.notice(`/council: ${e instanceof Error ? e.message : String(e)}`, 'error')
  }
}
