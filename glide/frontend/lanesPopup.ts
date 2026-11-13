// The voice lanes popup: opened from the subagents card, drawn as a trusted ephemeral-ui card in the
// layer (the council popup's pattern). One row per lane of the newest lane call (fast / small / large /
// council): role, the bound model by name with provider, billing, effort and route badges, the live state
// and newest blackboard line, all read from the lane broker's GET /v1/lanes/status (a voice-plan role alias
// such as smol is named by the model it resolves to). A dead lane renders dead, never hidden. Rebinding offers
// only that role's realistic models (catalog.ts); the broker exposes no binding endpoint, so a pick is saved to
// a local bindings file (said in the subtitle's tooltip). A key card decodes the hues, effort pips and orbit.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import { nativeOverlayKey } from '../../frontend/src/overlays/identity.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import { BILLING, EFFORTS, type EffortId, laneModel, PROVIDERS, type ProviderId, roleChoices } from '../../frontend/src/voice/catalog.js'
import type { Lane, LaneCall, LaneFeed, LaneState } from '../../frontend/src/voice/lanes.js'
import { lanePeriod, tint } from '../../frontend/src/voice/orbit.js'
import { euiPopupNode } from '../../frontend/src/view/euiCard.js'

import type { CouncilHost } from './councilPopup.js'
import { MONO, NIGHT, SERIF } from './tokens.js'

export const BINDINGS_ENV = 'GLIDE_LANES_BINDINGS_FILE'
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

/** Picker choices for a lane: its role's realistic models, plus what it is bound to now. */
export const laneChoices = (lane: Lane, bound: Record<string, string>): string[] =>
  roleChoices(lane.role, [lane.model, bound[lane.role] ?? '']).slice(0, PICK_STRIDE)

export const pickId = (lane: number, choice: number) => PICK_BASE + lane * PICK_STRIDE + choice

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/**
 * The popup's panel: the dark glass of the other Glide cards, a near-opaque night tint so every NIGHT ink keeps
 * 4.5:1 even over a white backdrop (lanesPopup.test.ts proves it), frosted where Tern blurs.
 */
export const LANES_GLASS = 'rgba(12,12,10,0.88)'

const SPACE: EuiNode = { t: 'text', text: ' ' }
/** `kids` with a plain space between each pair of adjacent elements (see `el` in lanesCard). */
export const spaced = (kids: readonly EuiNode[]): EuiNode[] =>
  kids.flatMap((k, i): EuiNode[] => (i > 0 && k.t === 'el' && kids[i - 1]?.t === 'el' ? [SPACE, k] : [k]))

const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',')},${a})`
const ROLES_SHOWN = ['fast', 'small', 'large', 'council']
const PROVIDERS_SHOWN: readonly ProviderId[] = ['local', 'anthropic', 'openai', 'opencode', 'groq', 'multi']
const EFFORTS_SHOWN: readonly EffortId[] = ['min', 'standard', 'high', 'max']
const BILL_SHORT = { free: 'FREE', subscription: 'SUB', paid: 'PAID', unknown: '?' } as const
const BILL_TONE = { free: NIGHT.agree, subscription: NIGHT.text2, paid: NIGHT.danger, unknown: NIGHT.text3 } as const

/** The popup's card, as the same node data the ephemeral-ui sandbox produces. */
/** `focus` is the lane picked on the orbit (its index in sortLanes order): its row is marked selected. */
export function lanesCard(src: LaneSource, bound: Record<string, string>, roles?: Record<string, string>, focus?: number): EuiNode {
  let next = 10
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  // Sibling elements get a plain space between them as well as the flex gap: a row whose stylesheet has not
  // landed (or a reader that flattens text) still reads 'LANE BROKER NO CALL OPEN', never 'LANE BROKERNO CALL OPEN'.
  // Inside a flex box a whitespace-only text node draws nothing, so the styled popup is unchanged.
  const el = (tag: string, style: string, kids: readonly EuiNode[], opts: { id?: number; attrs?: Record<string, string> } = {}): EuiNode => ({
    t: 'el', tag, id: opts.id ?? next++, cls: '', style, attrs: opts.attrs ?? {}, click: opts.id !== undefined, kids: spaced(kids)
  })
  const micro = `font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${NIGHT.text2}`
  const dot = (hue: string, size = 8) => el('span', `width:${size}px;height:${size}px;border-radius:50%;flex:none;background-color:${hue}`, [])
  // The orbit's own key: a planet in its provider's hue inside a ring of its role's tint.
  const swatch = (role: string, hue: string) => el('span', `width:14px;height:14px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px solid ${tint(role, true)}`, [dot(hue, 7)])
  const pips = (effort: EffortId) => el('span', 'display:flex;align-items:center;gap:2px', [0, 1, 2, 3].map(i =>
    el('span', `width:3px;height:9px;border-radius:999px;background-color:${i < EFFORTS[effort].orbits ? EFFORTS[effort].accent : NIGHT.faint}`, [])))
  const badge = (kids: readonly EuiNode[], color: string, border: string, attrs: Record<string, string> = {}) =>
    el('span', `display:flex;align-items:center;gap:5px;padding:2px 7px;border-radius:999px;border:1px solid ${border};font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${color}`, kids, { attrs })
  const lanes = sortLanes(src.call?.lanes ?? [])
  const live = Boolean(src.call?.open && lanes.length)
  const dead = lanes.filter(l => l.state === 'dead').length
  // The preset id is the broker's, not the reader's: it only ever rides in the badge's tooltip.
  const status = live ? 'LIVE CALL' : lanes.length ? 'NO CALL OPEN' : 'NOT CONNECTED'
  const ready = lanes.length - dead
  const summary = lanes.length
    ? live
      ? `${lanes.length} lanes · ${dead ? `${dead} dead · ` : ''}pick a model to rebind a lane`
      : `${ready} of ${lanes.length} lanes ready for the next call${dead ? ` · ${dead} dead` : ''} · pick a model to rebind a lane`
    : src.error || 'the lane broker has no lanes configured'

  const header = el('div', 'display:flex;flex-direction:column;gap:4px', [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px', [
      el('span', micro, [text('LANE BROKER')]),
      el('span', `font-family:${MONO};font-size:10px;letter-spacing:.16em;padding:2px 8px;border-radius:999px;` +
        (live ? `color:${NIGHT.agree};border:1px solid rgba(152,207,139,0.45)` : `color:${NIGHT.text2};border:1px solid ${NIGHT.borderStrong}`),
      [text(status)], { attrs: { 'data-lanes-source': live ? 'live' : lanes.length ? 'configured' : 'none', ...(src.call?.revision ? { title: `broker preset ${src.call.revision}` } : {}) } })
    ]),
    el('h3', `margin:0;font-family:${SERIF};font-weight:500;font-size:28px;line-height:32px;color:${NIGHT.text}`, [text('Helper lanes')]),
    el('span', `font-size:13px;line-height:18px;color:${NIGHT.text2}`, [text(summary)],
      { attrs: { title: 'Lane state comes from the lane broker; a model pick is saved on this device (the broker has no binding endpoint)' } })
  ])

  const rows = lanes.map((lane, i) => {
    const binding = bound[lane.role]
    const current = binding ?? lane.model
    const info = laneModel(current, binding ? null : lane.resolved, roles)
    const hue = PROVIDERS[info.provider].hue
    const isDead = lane.state === 'dead'
    const waiting = !live && lane.state === 'idle'
    const tone = waiting ? NIGHT.agree : DOT[lane.state]
    const id = info.via ? `${info.via} → ${info.target ?? 'unresolved'}` : info.id
    // The pill already says DEAD: the line says why in words and what to do about it.
    const line = isDead ? `Not answering${lane.error ? ` (${clip(lane.error, 80)})` : ''}. Pick another model below.`
      : lane.entry ? `“${clip(lane.entry.text, 110)}”` : lane.researching ? `Working on “${clip(lane.researching, 100)}”`
        : live ? 'no blackboard entry yet' : ''
    // A fact the catalog does not know is left out rather than badged UNSPECIFIED / UNKNOWN.
    const badges = [
      ...(info.provider === 'unknown' ? [] : [badge([dot(hue, 6), text(PROVIDERS[info.provider].label.toUpperCase())], hue, rgba(hue, 0.45), { 'data-lane-provider': `${lane.role}=${info.provider}` })]),
      ...(info.billing === 'unknown' ? [] : [badge([text(BILLING[info.billing].toUpperCase())], BILL_TONE[info.billing], NIGHT.borderStrong, { 'data-lane-billing': `${lane.role}=${info.billing}` })]),
      ...(info.effort === 'unknown' ? [] : [badge([pips(info.effort), text(EFFORTS[info.effort].label.toUpperCase())], NIGHT.text2, NIGHT.borderStrong, { 'data-lane-effort': `${lane.role}=${info.effort}`, title: 'effort: orbit pips, as in the zerOS agent-core key' })]),
      // A local model's provider badge already says it runs here; only a remote route needs its own badge.
      ...(info.provider === 'local' ? [] : [badge([text(info.route === 'local' ? 'ON DEVICE' : 'CLOUD')], NIGHT.text2, NIGHT.border, { 'data-lane-route': `${lane.role}=${info.route}` })]),
      ...(info.via ? [badge([text('VOICE PLAN')], NIGHT.text2, NIGHT.border)] : []),
      ...(binding && binding !== lane.model ? [badge([text('YOUR PICK')], NIGHT.strong, rgba(NIGHT.strong, 0.4), { 'data-lane-rebound': lane.role })] : [])
    ]
    // The lane picked on the orbit: its row lifts in its role's ring tint, says so, and leads the list
    // (flex order only, so it opens in view and every picker keeps its id).
    const picked = i === focus
    const lift = picked ? `;padding:9px 10px;margin:2px -10px;border-radius:12px;border:1px solid ${rgba(tint(lane.role, true), 0.55)};background-color:${rgba(tint(lane.role, true), 0.08)};order:-1` : ''
    return el('div', `display:flex;flex-direction:column;gap:6px;padding:9px 0;border-top:1px solid ${NIGHT.border}` + (isDead ? ';opacity:0.85' : '') + lift, [
      // Role label, model name, then the status pill: three weights, never one run of caps.
      // The row wraps rather than squeezes: a long model name drops to its own line whole, never cut or split.
      el('div', 'display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px', [
        swatch(lane.role, hue),
        el('span', `width:58px;flex:none;font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${isDead ? NIGHT.danger : NIGHT.text2}`, [text(lane.role.toUpperCase())], { attrs: { 'data-lane-role': lane.role } }),
        el('span', `flex:1 1 auto;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:${SERIF};font-size:20px;line-height:24px;color:${isDead ? NIGHT.danger : NIGHT.text}`, [text(info.label)], { attrs: { title: [id, info.note].filter(Boolean).join(' · '), 'data-lane-model': `${lane.role}=${current}` } }),
        ...(picked ? [el('span', `${micro};color:${tint(lane.role, true)}`, [text('SELECTED')], { attrs: { 'data-lane-focus': lane.role } })] : []),
        el('span', `flex:none;display:flex;align-items:center;gap:6px;padding:2px 9px;border-radius:999px;border:1px solid ${rgba(tone, 0.45)};background-color:${rgba(tone, 0.1)};font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${tone}`, [
          el('span', `width:7px;height:7px;border-radius:4px;flex:none;background-color:${tone}` + (lane.state === 'thinking' ? `;box-shadow:0 0 6px ${NIGHT.strong}` : ''), [], { attrs: { 'data-lane-state': lane.state } }),
          text(waiting ? 'READY' : lane.state.toUpperCase())
        ])
      ]),
      el('div', 'display:flex;flex-wrap:wrap;gap:5px;padding-left:24px', badges),
      ...(line ? [el('span', `padding-left:24px;font-size:13px;line-height:18px;color:${isDead ? NIGHT.danger : NIGHT.text2}`, [text(line)], { attrs: { 'data-lane-line': lane.role } })] : []),
      el('div', 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding-left:24px', [
        el('span', micro, [text('REBIND')]),
        ...laneChoices(lane, bound).map((m, j) => {
          const on = current === m
          const c = laneModel(m, null, roles)
          // The dot already names the vendor, so a chip drops it: "Haiku 4.5", "Sonnet 5", "Sol".
          const short = c.label.replace(/^(Claude|GPT(-[\d.]+)?) /, '')
          // A role alias shows its model (the alias rides in the tooltip); "plan" only tells it from the same model bound directly.
          const twin = c.via && laneChoices(lane, bound).some(o => o !== m && laneModel(o, null, roles).label === c.label)
          const label = twin ? `${short} · plan` : short
          return el('button', `display:flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;border:1px solid ${on ? 'rgba(236,232,223,0.62)' : NIGHT.borderStrong};background-color:${on ? 'rgba(236,232,223,0.16)' : 'transparent'}`,
            [dot(PROVIDERS[c.provider].hue, 6), el('span', `font-size:12px;color:${on ? NIGHT.text : NIGHT.text2}`, [text(label)]),
              el('span', `font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${BILL_TONE[c.billing]}`, [text(BILL_SHORT[c.billing])])],
            { id: pickId(i, j), attrs: { 'data-lane-pick': `${lane.role}=${m}`, title: [c.via ? `${c.via} → ${c.target ?? 'unresolved'}` : m, PROVIDERS[c.provider].label, BILLING[c.billing], `${EFFORTS[c.effort].label} effort`, c.note].filter(Boolean).join(' · '), ...(on ? { 'data-lane-bound': 'true' } : {}) } })
        })
      ])
    ])
  })

  // The key, after zerOS's agent-core legend: hue is provider only, pips are effort, the orbit maps the rest.
  const keyRow = (title: string, items: readonly EuiNode[]) => el('div', 'display:flex;flex-wrap:wrap;align-items:center;gap:5px 14px', [
    el('span', `${micro};width:62px;flex:none`, [text(title)]), ...items
  ])
  const item = (mark: EuiNode, label: string) => el('span', `display:flex;align-items:center;gap:6px;font-size:12px;color:${NIGHT.text2}`, [mark, text(label)])
  const ringMark = (role: string) => el('span', `width:11px;height:11px;border-radius:50%;flex:none;border:1.5px solid ${tint(role, true)}`, [])
  const legend = el('div', `display:flex;flex-direction:column;gap:5px;padding:8px 12px;border-radius:12px;border:1px solid ${NIGHT.border};background-color:rgba(236,232,223,0.03)`, [
    el('div', 'display:flex;align-items:center;justify-content:space-between;gap:12px', [
      el('span', micro, [text('KEY')]),
      el('span', `font-size:11px;color:${NIGHT.text2}`, [text('hue = provider · pips = effort · ring = role')])
    ]),
    keyRow('PROVIDER', PROVIDERS_SHOWN.map(p => item(dot(PROVIDERS[p].hue), PROVIDERS[p].label))),
    keyRow('EFFORT', EFFORTS_SHOWN.map(e => item(pips(e), EFFORTS[e].label))),
    // FREE / SUB / PAID are words on every chip, so billing needs no key row.
    keyRow('ORBIT', [...ROLES_SHOWN.map(r => item(ringMark(r), `${r} ${lanePeriod(r)} s`)), item(dot(NIGHT.text2, 7), 'one dot per lane')])
  ], { attrs: { 'data-lanes-legend': 'true' } })

  const close = el('button', `padding:9px 16px;border-radius:12px;border:1px solid ${NIGHT.borderStrong};background-color:transparent`,
    [el('span', `color:${NIGHT.text2};font-size:13px`, [text('Close')])], { id: CLOSE_ID, attrs: { 'data-eui-action': 'close' } })

  return el('div', '', [el('section', `display:flex;flex-direction:column;gap:12px;padding:18px 20px;border-radius:16px;border:1px solid ${NIGHT.borderStrong};background-color:${LANES_GLASS};-webkit-backdrop-filter:blur(22px) saturate(140%);backdrop-filter:blur(22px) saturate(140%);box-shadow:inset 0 1px 0 rgba(236,232,223,0.08), 0 22px 48px -26px rgba(0,0,0,0.9);color:${NIGHT.text}`, [
    header,
    el('div', 'display:flex;flex-direction:column', rows),
    legend,
    el('div', 'display:flex;justify-content:flex-end', [close])
  ])])
}

/** Opens the lanes popup over `feed` (null: no broker token); Escape closes, a model chip rebinds its lane. */
export function openLanesPopup(host: CouncilHost, feed: Pick<LaneFeed, 'call' | 'error'> | null | undefined, bindings: LaneBindings = fileBindings(), focus?: number): Overlay | undefined {
  const eui = host.eui
  if (!eui) {
    host.transcript.notice('The lanes popup needs a pane with ephemeral-ui cards', 'warning')
    return undefined
  }
  const source = (): LaneSource => feed
    ? { call: feed.call, error: feed.error }
    : { call: null, error: 'Lane broker not connected: set the plugin setting lanes_token_file (or GLIDE_LANES_TOKEN_FILE) to the relay token file; GLIDE_LANES_URL must be loopback.' }
  const overlay: Overlay = {
    key: 'glide-lanes',
    modal: true,
    focus: () => null,
    node: id => {
      const src = source()
      const bound = bindings.get()
      const lanes = sortLanes(src.call?.lanes ?? [])
      const view = {
        spec: { kind: 'lanes', app: APP }, app: APP, label: 'Voice lanes', identity: 'lanes',
        node: lanesCard(src, bound, undefined, focus),
        activate: (n: number) => {
          if (n === CLOSE_ID) return host.close(overlay)
          const lane = lanes[Math.floor((n - PICK_BASE) / PICK_STRIDE)]
          const model = lane && laneChoices(lane, bound)[(n - PICK_BASE) % PICK_STRIDE]
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
