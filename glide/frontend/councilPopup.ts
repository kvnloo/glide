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
  closedSeats, type CouncilRun, demoRun, type Frame, instrumentSvg, MINERAL, narration, parseCouncilRun, swatchSvg
} from './council.js'
import { councilOrbSvg, deliverySvg, exchangeAt, exchangeTiming, reportClauses } from './councilExchange.js'
import { type CouncilSpeech, type SpeechAudio, platformSpeech, speechSentences } from './councilSpeech.js'
import { GOLD, MONO, NIGHT, SERIF } from './tokens.js'

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
/** `sideHeader` moves the title and brief beside the instrument so the card is no taller than it (a popup in a short pane). */
export function councilCard(src: CouncilSource, frame: Frame, size = 480, sideHeader = false, reading: CouncilReading = {}): EuiNode {
  let next = 10
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (tag: string, style: string, kids: readonly EuiNode[], opts: { id?: number; attrs?: Record<string, string> } = {}): EuiNode => ({
    t: 'el', tag, id: opts.id ?? next++, cls: '', style, attrs: opts.attrs ?? {}, click: opts.id !== undefined, kids
  })
  const svg = (markup: string, w: number, style = ''): EuiNode => ({ t: 'svg', svg: markup, w, h: w, cls: '', style })
  const micro = `font-family:${MONO};font-size:11px;letter-spacing:.12em;color:${NIGHT.text3}`
  const { run } = src
  const exchange = exchangeAt(run, frame.t, reading.reduceMotion)
  const done = exchange.phase === 'done'
  const playing = frame.t !== null && !done
  const shown = closedSeats(run, exchange.frame)
  const agree = run.verdicts.filter(v => v.stance === 'agree').length
  const dissent = run.verdicts.filter(v => v.stance === 'dissent').length
  const abstain = run.verdicts.filter(v => v.stance === 'abstain').length

  const header = el('div', 'display:flex;flex-direction:column;gap:4px', [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px', [
      el('span', micro, [text('COUNCIL · GLIDE · SOCRATIC')]),
      el('span', `font-family:${MONO};font-size:11px;letter-spacing:.12em;padding:2px 8px;border-radius:999px;` +
        (src.live ? `color:${NIGHT.agree};border:1px solid rgba(152,207,139,0.45)` : `color:${NIGHT.strong};border:1px solid ${NIGHT.muted}`),
      [text(src.live ? `LIVE · ${src.from.toUpperCase()}` : 'DEMO')], { attrs: { 'data-council-source': src.live ? 'live' : 'demo' } })
    ]),
    el('h3', `margin:0;font-family:${SERIF};font-weight:500;font-size:${sideHeader ? '24px;line-height:28px' : '30px;line-height:34px'};color:${NIGHT.text}`, [text('Socratic council')]),
    el('span', `${micro};margin-top:6px`, [text('THE BRIEF')]),
    el('p', `margin:0;padding-bottom:8px;border-bottom:1px solid ${NIGHT.borderStrong};font-size:13px;line-height:20px;color:${NIGHT.text};min-height:40px`, [text(exchange.brief || ' ')], { attrs: { 'data-council-brief': exchange.phase } }),
    ...exchange.constraints.map(constraint => el('p', `margin:0;font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text(`· ${constraint}`)]))
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
    const state = exchange.seats[i]
    const received = state?.received ?? false
    const stateText = `${received ? 'RECEIVED · ' : ''}${state?.state.toUpperCase() ?? 'WAITING'}`
    const ink = received ? MINERAL[seat.mineral].base : NIGHT.text3
    const pulse = reading.reduceMotion || state?.state === 'done' || state?.state === 'waiting' ? 1 : .7 + .3 * Math.sin(exchange.elapsed / 220 + i) ** 2
    const stance = open ? [el('span', `${sideHeader ? '' : 'margin-left:auto;'}font-family:${MONO};font-size:11px;letter-spacing:.12em;color:${STANCE[v.stance].color}`, [text(STANCE[v.stance].label)], { attrs: { 'data-council-stance': v.stance } })] : []
    // A short pane gets one line per seat; the verdict prose lives in the transcript card.
    if (sideHeader) return el('div', `display:flex;gap:6px;align-items:center;padding:4px 10px 4px 4px;border-radius:999px;border:1px solid ${received ? ink : NIGHT.border}`, [
      svg(state?.state === 'thinking' || state?.state === 'drafting' ? councilOrbSvg(exchange.elapsed / 1000, pulse, Boolean(reading.reduceMotion), MINERAL[seat.mineral].base).replace('width="320" height="320"', 'width="16" height="16"') : swatchSvg(seat.mineral, 16), 16, `flex:none;opacity:${pulse.toFixed(2)}`),
      el('span', `font-family:${SERIF};font-size:15px;color:${NIGHT.text}`, [text(seat.name)]),
      el('span', `font-family:${MONO};font-size:11px;color:${ink}`, [text(stateText)]),
      ...stance
    ], { attrs: { 'data-council-seat': seat.id, 'data-council-state': state?.state ?? 'waiting', 'data-council-received': String(received) } })
    return el('div', `display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid ${NIGHT.border}`, [
      svg(swatchSvg(seat.mineral, 30), 30, 'flex:none'),
      el('div', 'display:flex;flex-direction:column;gap:2px;flex:1;min-width:0', [
        el('div', 'display:flex;align-items:baseline;gap:8px', [
          el('span', `font-family:${SERIF};font-size:17px;color:${NIGHT.text}`, [text(seat.name)]),
          el('span', micro, [text(`${MINERAL[seat.mineral].label.toUpperCase()} · ${seat.family.toUpperCase()}`)]),
          el('span', `font-family:${MONO};font-size:11px;color:${ink}`, [text(stateText)]),
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
    { id, attrs: { 'data-eui-action': id === CONVENE_ID ? 'convene' : id === READ_ID ? 'read-aloud' : id === MUTE_ID ? 'mute' : 'close', ...((id === READ_ID || id === MUTE_ID) ? { 'aria-pressed': String(id === READ_ID ? Boolean(reading.readAloud) : Boolean(reading.muted)) } : {}), ...(id === CONVENE_ID && playing ? { disabled: 'true' } : {}) } })
  // Again only replays the run it read: say so, rather than promise a fresh council.
  const convene = playing ? 'Convening…' : frame.t === null ? 'Convene council  →' : 'Replay the council  →'

  return el('div', '', [el('section', `display:flex;flex-direction:column;gap:14px;padding:${sideHeader ? 14 : 18}px;border-radius:16px;border:1px solid ${NIGHT.border};background-color:${NIGHT.canvas};color:${NIGHT.text};opacity:${reading.opacity ?? 1}`, [
    ...(sideHeader ? [] : [header]),
    el('div', 'display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start', [
      el('div', `flex:1 1 ${Math.min(340, size)}px;display:flex;justify-content:center`, [svg(instrumentSvg(run, exchange.frame, size, { reduce: reading.reduceMotion, clean: true }).replace('</svg>', `${deliverySvg(run, exchange, size)}</svg>`), size, 'max-width:100%;height:auto')]),
      el('div', `flex:1 1 280px;display:flex;flex-direction:column;gap:${sideHeader ? 8 : 12}px;min-width:0`, [
        ...(sideHeader ? [header] : []),
        verdictBox,
        el('p', `margin:0;font-family:${SERIF};font-style:italic;font-size:15px;line-height:20px;color:${NIGHT.text2}`, [text(exchange.phase === 'brief' ? 'Writing the brief…' : exchange.phase === 'sending' ? 'Sending the brief to each seat…' : narration(run, exchange.frame))]),
        el('div', 'display:flex;gap:8px', [button(CONVENE_ID, convene, true), button(CLOSE_ID, 'Close', false)]),
        el('div', 'display:flex;gap:8px;align-items:center', [button(READ_ID, reading.readAloud ? 'Read aloud: on' : 'Read aloud', false), button(MUTE_ID, reading.muted ? 'Unmute' : 'Mute', false)]),
        ...(reading.voiceStatus ? [el('p', `margin:0;font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text(reading.voiceStatus)], { attrs: { role: 'status' } })] : []),
        seats,
        ...(exchange.clauses.length ? [el('div', `display:flex;flex-direction:column;gap:8px;max-height:220px;overflow:auto;padding:12px;border-top:1px solid ${NIGHT.borderStrong}`, exchange.clauses.map(clause => el('div', 'display:flex;flex-direction:column;gap:3px', [
          el('span', `${micro};color:${NIGHT.strong}`, [text(clause.label.toUpperCase())]),
          el('p', `margin:0;font-size:13px;line-height:19px;color:${NIGHT.text2}`, [text(clause.text)])
        ])), { attrs: { 'data-council-report': exchange.phase, 'aria-live': 'polite' } })] : [])
      ])
    ]),
    // The popup's title already says live or demo; a short pane has no row to spare for the provenance line.
    ...(sideHeader ? [] : [el('span', `font-family:${MONO};font-size:11px;color:${NIGHT.text3};text-align:center`, [text(src.live
      ? `live run read from ${src.from} · this card draws it and computes nothing`
      : `demo run · ${src.from} · set ${COUNCIL_URL_ENV} to read a live council`)])])
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
        node: voice ? councilSpeakingCard(voice.caption, councilOrbSvg((clock.now() - voice.at) / 1000, voice.audio.level(clock.now() - voice.at), reduceMotion), reduceMotion, opacity)
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

function councilSpeakingCard(caption: string, orb: string, reduce: boolean, opacity: number): EuiNode {
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (id: number, tag: string, style: string, kids: readonly EuiNode[], attrs: Record<string, string> = {}, click = false): EuiNode => ({ t: 'el', id, tag, cls: '', style, kids, attrs, click })
  return el(20, 'div', '', [el(RETURN_ID, 'section', `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;min-height:440px;padding:32px;background-color:${NIGHT.canvas};color:${NIGHT.text};opacity:${opacity}`, [
    { t: 'svg', svg: orb, w: 320, h: 320, cls: '', style: 'max-width:100%;height:auto' },
    el(21, 'p', `margin:0;font-size:16px;line-height:24px;text-align:center;max-width:720px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, [text(caption)], { 'data-council-caption': '', 'aria-live': 'polite' }),
    el(RETURN_ID, 'button', `padding:10px 16px;font-size:12px;color:${NIGHT.text2};border:1px solid ${NIGHT.border}`, [text('Return to card · any key')], { 'data-eui-action': 'return-to-card' }, true)
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
