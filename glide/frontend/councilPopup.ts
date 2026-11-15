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
  closedSeats, type CouncilRun, demoRun, type Frame, MINERAL, parseCouncilRun
} from './council.js'
import { councilOrbSvg, exchangeAt, exchangeTiming, reportClauses } from './councilExchange.js'
import { type CouncilSpeech, type SpeechAudio, platformSpeech, speechSentences } from './councilSpeech.js'
import { GOLD, MONO, NIGHT, TYPE } from './tokens.js'
import { STAGE_CAPTION, STAGE_ORB, STAGE_STYLE, STAGE_ZONE } from '../../frontend/src/voice/stage.js'

export const COUNCIL_URL_ENV = 'GLIDE_COUNCIL_URL'
const APP = 'glide'
const TICK_MS = 110
export const CONVENE_ID = 1
export const CLOSE_ID = 2
export const READ_ID = 3
export const MUTE_ID = 4
export const RETURN_ID = 5

export interface CouncilOptions {
  readonly reduceMotion?: boolean
  readonly speech?: CouncilSpeech
}
export interface CouncilReading {
  readonly readAloud?: boolean
  readonly muted?: boolean
  readonly reduceMotion?: boolean
  readonly voiceStatus?: string
  readonly opacity?: number
}

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
  readonly tern?: { readonly caps: { readonly reduceMotion?: boolean } }
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
/** The council's one picture, flat: seats on a hairline ring, lit as they speak, filled as they close. */
function seatRing(run: CouncilRun, exchange: ReturnType<typeof exchangeAt>, size: number): string {
  const c = size / 2, r = size * 0.3, dot = size * 0.045
  let s = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${NIGHT.border}" stroke-width="1"/>`
  run.seats.forEach((seat, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / run.seats.length
    const x = c + r * Math.cos(a), y = c + r * Math.sin(a)
    const state = exchange.seats[i]?.state ?? 'waiting'
    const busy = state === 'thinking' || state === 'drafting'
    s += `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${NIGHT.border}" stroke-width="1" stroke-opacity="${busy ? 1 : 0.4}"/>`
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dot}" fill="${state === 'done' ? NIGHT.text2 : NIGHT.canvas}" stroke="${busy ? NIGHT.text : NIGHT.text3}" stroke-width="1.2"/>`
    // Every label centres under (or over, for the top seat) its dot, so none can leave the square.
    const ly = y + (Math.sin(a) < -0.5 ? -dot - 6 : dot + 14)
    s += `<text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" fill="${NIGHT.text2}" font-size="11" font-family="${MONO}" text-anchor="middle">${seat.name.replace(/[<&]/g, '')}</text>`
  })
  s += `<circle cx="${c}" cy="${c}" r="${dot * 0.8}" fill="${exchange.phase === 'done' ? NIGHT.text : NIGHT.text3}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${s}</svg>`
}

/** `sideHeader` moves the title and brief beside the instrument so the card is no taller than it (a popup in a short pane). */
export function councilCard(src: CouncilSource, frame: Frame, size = 480, sideHeader = false, reading: CouncilReading = {}): EuiNode {
  let next = 10
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (tag: string, style: string, kids: readonly EuiNode[], opts: { id?: number; attrs?: Record<string, string> } = {}): EuiNode => ({
    t: 'el', tag, id: opts.id ?? next++, cls: '', style, attrs: opts.attrs ?? {}, click: opts.id !== undefined, kids
  })
  const { run } = src
  const exchange = exchangeAt(run, frame.t, reading.reduceMotion)
  const done = exchange.phase === 'done'
  const playing = frame.t !== null && !done
  const shown = closedSeats(run, exchange.frame)
  const agree = run.verdicts.filter(v => v.stance === 'agree').length
  const dissent = run.verdicts.filter(v => v.stance === 'dissent').length
  const abstain = run.verdicts.filter(v => v.stance === 'abstain').length
  const micro = `font-family:${MONO};font-size:${TYPE.meta}px;color:${NIGHT.text3}`
  const button = (id: number, label: string, primary = false) => el('button',
    `min-height:44px;padding:7px 16px;border-radius:8px;border:1px solid ${primary ? NIGHT.action : NIGHT.borderStrong};background-color:${primary ? NIGHT.action : 'transparent'};font-family:var(--sans);font-size:13px`,
    [el('span', `color:${primary ? GOLD.ink : NIGHT.text2}`, [text(label)])],
    { id, attrs: { 'data-eui-action': id === CONVENE_ID ? 'convene' : id === READ_ID ? 'read-aloud' : id === MUTE_ID ? 'mute' : 'close',
      ...((id === READ_ID || id === MUTE_ID) ? { 'aria-pressed': String(id === READ_ID ? Boolean(reading.readAloud) : Boolean(reading.muted)) } : {}),
      ...(id === CONVENE_ID && playing ? { disabled: 'true' } : {}) } })
  const iconSize = Math.min(size, 20)
  const table = Math.min(size, sideHeader ? 140 : 168)
  const orb: EuiNode = { t: 'svg', svg: councilOrbSvg(exchange.elapsed / 1000, .7, Boolean(reading.reduceMotion), NIGHT.text2), w: iconSize, h: iconSize, cls: '', style: 'flex:none' }
  const seats = run.seats.map((seat, i) => {
    const state = exchange.seats[i]
    const v = run.verdicts.find(v => v.seat === i)
    const open = v !== undefined && shown.has(i)
    return el('div', 'flex:1 1 152px;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:44px;padding:6px 0', [
      el('div', `display:flex;align-items:baseline;gap:8px;font-size:13px;color:${NIGHT.text}`, [
        text(seat.name), el('span', micro, [text(state?.state ?? 'waiting')]),
        ...(open ? [el('span', micro, [text(STANCE[v.stance].label)], { attrs: { 'data-council-stance': v.stance } })] : [])
      ]),
      ...(!sideHeader && open ? [el('span', `font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text(v.text)])] : [])
    ], { attrs: { 'data-council-seat': seat.id, 'data-council-state': state?.state ?? 'waiting', 'data-council-received': String(state?.received ?? false) } })
  })
  return el('div', '', [el('section', `display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:8px;border:1px solid ${NIGHT.border};background-color:var(--l1);font-family:var(--sans);color:${NIGHT.text};opacity:${reading.opacity ?? 1}`, [
    el('div', 'display:flex;align-items:center;gap:8px;min-height:24px', [orb,
      el('span', `font-size:13px;font-weight:500;color:${NIGHT.text}`, [text('Socratic council')]),
      el('span', micro, [text(src.live ? 'LIVE' : 'SAMPLE')], { attrs: { 'data-council-source': src.live ? 'live' : 'demo' } })
    ]),
    // The table stays: it is the council's one picture. Clean mode draws it in one stone and one gold.
    el('div', 'display:flex;flex-wrap:wrap;gap:14px;align-items:center', [
      { t: 'svg', svg: seatRing(run, exchange, table), w: table, h: table, cls: '', style: 'flex:none;max-width:100%;height:auto' },
      el('div', 'flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:8px', [
        el('p', `margin:0;font-size:13px;line-height:20px;color:${NIGHT.text}`, [text(exchange.brief || ' ')], { attrs: { 'data-council-brief': exchange.phase } }),
        ...(exchange.constraints.length ? [el('p', `margin:0;font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text(exchange.constraints.join(' · '))])] : []),
        el('div', 'display:flex;flex-direction:column;gap:3px', [
          el('span', `font-size:15px;font-weight:500;color:${NIGHT.text}`, [text(done ? run.outcome ?? 'The council has spoken' : playing ? 'The council is sitting' : 'The council is seated')]),
          el('span', micro, [text(done ? `${agree} of ${run.verdicts.length} agree · ${dissent} dissent${abstain ? ` · ${abstain} abstain` : ''}` : `${run.seats.length} seats · ${run.rounds} rounds`)])
        ])
      ])
    ]),
    el('div', `display:flex;flex-wrap:wrap;gap:0 14px;border-top:1px solid ${NIGHT.border};border-bottom:1px solid ${NIGHT.border}`, seats),
    ...(exchange.clauses.length ? [el('div', 'display:flex;flex-direction:column;gap:8px', exchange.clauses.map(clause => el('div', 'display:flex;flex-direction:column;gap:3px', [
      el('span', micro, [text(clause.label)]), el('p', `margin:0;font-size:13px;line-height:19px;color:${NIGHT.text2}`, [text(clause.text)])
    ])), { attrs: { 'data-council-report': exchange.phase, 'aria-live': 'polite' } })] : []),
    el('div', 'display:flex;flex-wrap:wrap;gap:8px', [
      button(CONVENE_ID, playing ? 'Convening…' : frame.t === null ? 'Convene council →' : 'Replay the council →', true),
      button(READ_ID, reading.readAloud ? 'Read aloud: on' : 'Read aloud'), button(MUTE_ID, reading.muted ? 'Unmute' : 'Mute'), button(CLOSE_ID, 'Close')
    ]),
    ...(reading.voiceStatus ? [el('p', `margin:0;font-size:12px;color:${NIGHT.text2}`, [text(reading.voiceStatus)], { attrs: { role: 'status' } })] : [])
  ])])
}

// ------------------------------------------------------------------ the popup

/** Opens the council popup; Enter convenes (plays the run), Escape closes. */
export function openCouncilPopup(host: CouncilHost, src: CouncilSource, clock: CouncilClock = realClock, options: CouncilOptions = {}): Overlay | undefined {
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('/council needs a pane with ephemeral-ui cards', 'warning')
    return undefined
  }
  const reduceMotion = options.reduceMotion ?? host.tern?.caps.reduceMotion ?? false
  const timing = exchangeTiming(src.run, reduceMotion)
  const speech = options.speech ?? platformSpeech
  let start: number | null = null
  let stop: (() => void) | undefined
  let readAloud = false
  let muted = false
  let closed = false
  let briefRead = false
  let reportRead = false
  let controller: AbortController | undefined
  let held: { elapsed: number; since: number } | undefined
  let speaking: { caption: string; audio: SpeechAudio; at: number } | undefined
  let voiceStatus = ''
  let voiceView = false
  let viewAt = clock.now()
  const elapsed = () => start === null ? null : held?.elapsed ?? Math.min(timing.total, clock.now() - start)
  const halt = () => { stop?.(); stop = undefined }
  const release = () => {
    if (held && start !== null) start += clock.now() - held.since
    held = undefined
  }
  const returnToCard = () => {
    controller?.abort()
    controller = undefined
    speaking = undefined
    voiceStatus = ''
    release()
    host.changed()
  }
  const read = (text: string) => {
    returnToCard()
    const current = new AbortController()
    controller = current
    held = { elapsed: elapsed() ?? 0, since: clock.now() }
    voiceStatus = 'Preparing local speech…'
    void (async () => {
      try {
        for (const caption of speechSentences(text)) {
          if (current.signal.aborted) break
          await speech.speak(caption, current.signal, audio => {
            if (closed || current.signal.aborted || controller !== current) return
            speaking = { caption, audio, at: clock.now() }
            voiceStatus = ''
            host.changed()
          })
        }
      } catch (error) {
        if (!closed && !current.signal.aborted && controller === current) {
          voiceStatus = error instanceof Error ? error.message : 'Read aloud failed. The council remains available as text.'
          readAloud = false
          host.transcript.notice(voiceStatus, 'warning')
        }
      } finally {
        if (controller === current) {
          controller = undefined
          speaking = undefined
          release()
          host.changed()
        }
      }
    })()
  }
  const tick = () => {
    const t = elapsed()
    if (readAloud && !muted && !controller && t !== null) {
      if (!briefRead && t >= timing.typing && t < timing.working) {
        briefRead = true
        read([src.run.brief, ...(src.run.constraints ?? [])].join(' '))
      } else if (!reportRead && t >= timing.total) {
        reportRead = true
        read(reportClauses(src.run).map(c => `${c.label}. ${c.text}`).join(' '))
      }
    }
    if (t !== null && t >= timing.total && !controller && clock.now() - viewAt >= 180) halt()
    host.changed()
  }
  const animate = () => { if (!stop) stop = clock.every(tick, TICK_MS) }
  const convene = () => {
    returnToCard()
    halt()
    briefRead = false
    reportRead = false
    start = clock.now()
    animate()
    if (reduceMotion && readAloud && !muted) {
      briefRead = true
      read([src.run.brief, ...(src.run.constraints ?? [])].join(' '))
    }
    host.changed()
  }
  const activate = (n: number) => {
    if (n === RETURN_ID) returnToCard()
    else if (n === CONVENE_ID && !stop) convene()
    else if (n === CLOSE_ID) host.close(overlay)
    else if (n === MUTE_ID) {
      muted = !muted
      if (muted) returnToCard()
    } else if (n === READ_ID) {
      readAloud = !readAloud
      if (!readAloud) returnToCard()
      else if (start !== null) { reportRead = false; animate(); tick() }
    }
    host.changed()
  }
  const overlay: Overlay = {
    key: 'glide-council', modal: true, focus: () => null,
    node: id => {
      const voice = speaking
      if (voiceView !== Boolean(voice)) { voiceView = Boolean(voice); viewAt = clock.now() }
      const opacity = reduceMotion ? 1 : Math.min(1, .45 + (clock.now() - viewAt) / 180 * .55)
      const view = {
        spec: { kind: 'council', app: APP }, app: APP, label: 'Socratic council', identity: 'council',
        node: voice ? councilSpeakingCard(voice.caption, councilOrbSvg((clock.now() - voice.at) / 1000, voice.audio.level(clock.now() - voice.at), reduceMotion, NIGHT.text2), reduceMotion, opacity)
          : councilCard(src, { t: elapsed() }, 320, true, { readAloud, muted, reduceMotion, voiceStatus, opacity }),
        activate
      }
      return euiPopupNode(nativeOverlayKey(id), src.live ? 'Council · live' : 'Council · demo', view, eui, voice ? 'full' : 'lg')
    },
    onKey: key => {
      if (controller) returnToCard()
      else if (key.name === 'escape') host.close(overlay)
      else if (key.name === 'm') activate(MUTE_ID)
      else if (key.name === 'r') activate(READ_ID)
      else if ((key.name === 'enter' || key.name === 'space') && !stop) convene()
      return true
    },
    onClose: () => { closed = true; halt(); returnToCard() }
  }
  host.open(overlay)
  return overlay
}

/** The shared stage while real council audio plays; exported for fixture capture. */
export function councilSpeakingCard(caption: string, orb: string, reduce: boolean, opacity: number): EuiNode {
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (id: number, tag: string, style: string, kids: readonly EuiNode[], attrs: Record<string, string> = {}, click = false): EuiNode => ({ t: 'el', id, tag, cls: '', style, kids, attrs, click })
  return el(20, 'div', '', [el(RETURN_ID, 'section', `${STAGE_STYLE};opacity:${opacity}`, [
    el(22, 'div', `display:flex;align-items:center;justify-content:center;width:${STAGE_ZONE}px;height:${STAGE_ZONE}px;flex:none`, [
      { t: 'svg', svg: orb, w: STAGE_ORB, h: STAGE_ORB, cls: '', style: 'max-width:100%;height:auto' }
    ]),
    el(21, 'p', `${STAGE_CAPTION};text-align:center`, [text(caption)], { 'data-council-caption': '', 'aria-live': 'polite' }),
    el(RETURN_ID, 'button', `min-height:44px;margin-top:8px;padding:7px 16px;font:400 12px var(--sans);color:${NIGHT.text2};background-color:${NIGHT.canvas};border:1px solid ${NIGHT.border};border-radius:8px`, [text('Return to card · any key')], { 'data-eui-action': 'return-to-card' }, true)
  ], { 'data-council-speaking': '', 'data-reduced-motion': String(reduce), role: 'button', 'aria-label': 'Return to council card' }, true)])
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
