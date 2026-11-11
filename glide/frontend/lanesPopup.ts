// The voice lanes popup: opened from the subagents card, drawn as a trusted ephemeral-ui card in the
// layer (the council popup's pattern). One row per lane of the newest lane call (fast / small / large /
// council): role, model, live state dot and newest blackboard line, all read from the lane broker's
// GET /v1/lanes/status. A dead lane renders dead, never hidden. The lane broker exposes no binding
// endpoint, so a model pick is saved to a local bindings file and the popup says so.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import { nativeOverlayKey } from '../../frontend/src/overlays/identity.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import type { Lane, LaneCall, LaneFeed, LaneState } from '../../frontend/src/voice/lanes.js'
import { euiPopupNode } from '../../frontend/src/view/euiCard.js'

import type { CouncilHost } from './councilPopup.js'
import { MONO, NIGHT, SERIF } from './council.js'

export const BINDINGS_ENV = 'GLIDE_LANES_BINDINGS_FILE'
export const MODELS_ENV = 'GLIDE_LANE_MODELS'
export const CLOSE_ID = 2
const PICK_BASE = 100
const PICK_STRIDE = 32
const APP = 'glide'
const ROLE_ORDER = ['fast', 'small', 'large', 'council']

/** Where a lane's model binding lives: role → model, persisted locally. */
export interface LaneBindings {
  readonly where: string
  get(): Record<string, string>
  set(role: string, model: string): void
}

/** The local bindings file ($GLIDE_LANES_BINDINGS_FILE, else ~/.config/glide/lane-bindings.json). */
export function fileBindings(path = process.env[BINDINGS_ENV] || join(homedir(), '.config/glide/lane-bindings.json')): LaneBindings {
  const get = (): Record<string, string> => {
    try {
      const v: unknown = JSON.parse(readFileSync(path, 'utf8'))
      if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
      return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'))
    } catch {
      return {}
    }
  }
  return {
    where: path,
    get,
    set: (role, model) => {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify({ ...get(), [role]: model }, null, 2) + '\n')
    }
  }
}

/** What the popup reads: the broker's newest call, or why there is none. */
export interface LaneSource {
  readonly call: LaneCall | null
  readonly error: string
}

const DOT: Readonly<Record<LaneState, string>> = {
  idle: NIGHT.text3, thinking: NIGHT.strong, answered: NIGHT.action, verified: NIGHT.agree, corrected: NIGHT.muted, dead: NIGHT.danger
}

export const sortLanes = (lanes: readonly Lane[]): Lane[] =>
  [...lanes].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

/** Picker choices: every model the call names, plus $GLIDE_LANE_MODELS (comma separated). */
export function modelChoices(lanes: readonly Lane[], bound: Record<string, string>, extra = process.env[MODELS_ENV] ?? ''): string[] {
  const all = [...lanes.flatMap(l => [l.model, l.resolved ?? '']), ...Object.values(bound), ...extra.split(',')].map(s => s.trim()).filter(Boolean)
  return [...new Set(all)].slice(0, PICK_STRIDE)
}

export const pickId = (lane: number, choice: number) => PICK_BASE + lane * PICK_STRIDE + choice

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** The popup's card, as the same node data the ephemeral-ui sandbox produces. */
export function lanesCard(src: LaneSource, bound: Record<string, string>, where: string, extra?: string): EuiNode {
  let next = 10
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (tag: string, style: string, kids: readonly EuiNode[], opts: { id?: number; attrs?: Record<string, string> } = {}): EuiNode => ({
    t: 'el', tag, id: opts.id ?? next++, cls: '', style, attrs: opts.attrs ?? {}, click: opts.id !== undefined, kids
  })
  const micro = `font-family:${MONO};font-size:9px;letter-spacing:1.4px;color:${NIGHT.text3}`
  const lanes = src.call?.open ? sortLanes(src.call.lanes) : []
  const choices = modelChoices(lanes, bound, extra)
  const dead = lanes.filter(l => l.state === 'dead').length

  const header = el('div', 'display:flex;flex-direction:column;gap:4px', [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px', [
      el('span', `${micro};letter-spacing:2px`, [text('VOICE LANES · GLIDE')]),
      el('span', `font-family:${MONO};font-size:9px;letter-spacing:1.6px;padding:2px 8px;border-radius:999px;` +
        (lanes.length ? `color:${NIGHT.agree};border:1px solid rgba(152,207,139,0.45)` : `color:${NIGHT.strong};border:1px solid ${NIGHT.muted}`),
      [text(lanes.length ? `LIVE · ${(src.call?.revision || 'CALL').toUpperCase()}` : 'NO CALL')], { attrs: { 'data-lanes-source': lanes.length ? 'live' : 'none' } })
    ]),
    el('h3', `margin:0;font-family:${SERIF};font-weight:500;font-size:28px;line-height:32px;color:${NIGHT.text}`, [text('Helper lanes')]),
    el('span', `font-size:12.5px;line-height:18px;color:${NIGHT.text3}`, [text(lanes.length
      ? `${lanes.length} lanes · ${dead ? `${dead} dead · ` : ''}pick a model to rebind a lane`
      : src.error || 'no open lane call (the lane broker runs the Hermes app Live path)')])
  ])

  const rows = lanes.map((lane, i) => {
    const binding = bound[lane.role]
    const isDead = lane.state === 'dead'
    const model = lane.resolved && lane.resolved !== lane.model ? `${lane.model} → ${lane.resolved}` : lane.model
    const line = isDead ? `dead${lane.error ? ` · ${clip(lane.error, 80)}` : ''}`
      : lane.entry ? `“${clip(lane.entry.text, 110)}”` : lane.researching ? `researching: ${clip(lane.researching, 100)}` : 'no blackboard entry yet'
    return el('div', `display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid ${NIGHT.border}` + (isDead ? ';opacity:0.85' : ''), [
      el('div', 'display:flex;align-items:center;gap:8px', [
        el('span', `width:8px;height:8px;border-radius:4px;flex:none;background-color:${DOT[lane.state]}` +
          (lane.state === 'thinking' ? `;box-shadow:0 0 6px ${NIGHT.strong}` : ''), [], { attrs: { 'data-lane-state': lane.state } }),
        el('span', `font-family:${SERIF};font-size:18px;color:${isDead ? NIGHT.danger : NIGHT.text}`, [text(lane.role)]),
        el('span', `${micro};font-size:9px`, [text(model.toUpperCase())]),
        ...(binding && binding !== lane.model ? [el('span', `font-family:${MONO};font-size:9px;letter-spacing:1.2px;color:${NIGHT.strong}`, [text(`BOUND LOCALLY → ${binding.toUpperCase()}`)], { attrs: { 'data-lane-rebound': lane.role } })] : []),
        el('span', `margin-left:auto;font-family:${MONO};font-size:9px;letter-spacing:1.2px;color:${DOT[lane.state]}`, [text(lane.state.toUpperCase())])
      ]),
      el('span', `font-size:12.5px;line-height:18px;color:${isDead ? NIGHT.danger : NIGHT.text2}`, [text(line)], { attrs: { 'data-lane-line': lane.role } }),
      el('div', 'display:flex;flex-wrap:wrap;gap:6px', choices.map((m, j) => {
        const on = (binding ?? lane.model) === m
        return el('button', `padding:3px 10px;border-radius:999px;border:1px solid ${on ? '#f0d7a0' : NIGHT.borderStrong};background-color:${on ? '#cfae74' : 'transparent'}`,
          [el('span', `font-family:${MONO};font-size:10px;color:${on ? '#1d160b' : NIGHT.text2}`, [text(m)])],
          { id: pickId(i, j), attrs: { 'data-lane-pick': `${lane.role}=${m}`, ...(on ? { 'data-lane-bound': 'true' } : {}) } })
      }))
    ])
  })

  const close = el('button', `padding:9px 16px;border-radius:14px;border:1px solid ${NIGHT.borderStrong};background-color:transparent`,
    [el('span', `color:${NIGHT.text2};font-size:13px`, [text('Close')])], { id: CLOSE_ID, attrs: { 'data-eui-action': 'close' } })

  return el('div', '', [el('section', `display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:18px;border:1px solid ${NIGHT.border};background-color:${NIGHT.canvas};color:${NIGHT.text}`, [
    header,
    el('div', 'display:flex;flex-direction:column', rows),
    el('div', 'display:flex;justify-content:flex-end', [close]),
    el('span', `font-family:${MONO};font-size:9px;color:${NIGHT.faint};text-align:center`,
      [text(`state read from the lane broker · bindings saved locally to ${where.split('/').pop() ?? where} (the broker has no binding endpoint)`)])
  ])])
}

/** Opens the lanes popup over `feed` (null: no broker token); Escape closes, a model chip rebinds its lane. */
export function openLanesPopup(host: CouncilHost, feed: Pick<LaneFeed, 'call' | 'error'> | null | undefined, bindings: LaneBindings = fileBindings()): Overlay | undefined {
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('The lanes popup needs a pane with ephemeral-ui cards', 'warning')
    return undefined
  }
  const source = (): LaneSource => feed
    ? { call: feed.call, error: feed.error }
    : { call: null, error: 'no lane broker token (set GLIDE_LANES_TOKEN_FILE)' }
  const overlay: Overlay = {
    key: 'glide-lanes',
    modal: true,
    focus: () => null,
    node: id => {
      const src = source()
      const bound = bindings.get()
      const lanes = src.call?.open ? sortLanes(src.call.lanes) : []
      const choices = modelChoices(lanes, bound)
      const view = {
        spec: { kind: 'lanes', app: APP }, app: APP, label: 'Voice lanes', identity: 'lanes',
        node: lanesCard(src, bound, bindings.where),
        activate: (n: number) => {
          if (n === CLOSE_ID) return host.close(overlay)
          const lane = lanes[Math.floor((n - PICK_BASE) / PICK_STRIDE)]
          const model = choices[(n - PICK_BASE) % PICK_STRIDE]
          if (n < PICK_BASE || !lane || !model) return
          try {
            bindings.set(lane.role, model)
          } catch (e) {
            host.transcript.notice(`lanes: could not save the binding (${e instanceof Error ? e.message : String(e)})`, 'error')
          }
          host.changed()
        }
      }
      return euiPopupNode(nativeOverlayKey(id), 'Voice lanes', view, eui)
    },
    onKey: key => {
      if (key.name === 'escape') host.close(overlay)
      return true
    }
  }
  host.open(overlay)
  return overlay
}
