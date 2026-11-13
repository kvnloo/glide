import { DASH, GOLD, MONO, NIGHT, RADIUS, STATUS, TRACK, TYPE } from '../../../glide/frontend/tokens.js'
import type { ChatPorts } from '../app/ports.js'
import { storedSessionId } from '../core/ids.js'
import type { EuiKitContext, EuiKitHandle } from '../eui/host.js'
import { openUrl } from '../overlays/pullRequests.js'
import type { EuiKitDoc } from '../wire/euiKit.js'
import { decodeFleet, decodeFleetIntent, fleetAgent, fleetDesign, fleetHost, fleetVisibleDoc, fleetNode, fleetPod, fleetRequest, fleetTask, fleetText, type FleetDesign, type FleetDesignRow, type FleetTone, type FleetView } from '../wire/fleet.js'

export type FleetHost = Pick<ChatPorts, 'session' | 'transcript' | 'eui' | 'resume' | 'control' | 'notice' | 'reveal'> & {
  readonly gw: Pick<ChatPorts['gw'], 'request'>
}
const title = { hosts: 'Hosts', portfolio: 'Portfolio', factory: 'Factory graph' }

function browse(url: string | undefined) {
  if (!url) throw new Error('No URL available in this snapshot')
  const parsed = new URL(url)
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsafe fleet URL')
  openUrl(parsed.href)
}

/** Called only by the publication's sandbox click route, never by assistant-authored fences. */
export async function fleetIntent(host: FleetHost, doc: EuiKitDoc, detail: unknown, context: EuiKitContext): Promise<void> {
  if (!context.isCurrent() || context.signal.aborted) return
  const warn = async (text: string) => {
    host.notice(text, 'warning')
    const entry = host.transcript.entries.at(-1)
    await new Promise<void>(resolve => setImmediate(resolve))
    if (entry && context.isCurrent() && !context.signal.aborted) host.reveal(`main.${entry.id}`)
  }
  try {
    const action = decodeFleetIntent(detail)
    switch (action.action) {
      case 'open-chat': {
        const { harness, agent } = fleetAgent(doc, action.entities)
        if (harness?.kind.toLowerCase() !== 'hermes' || agent.id.startsWith('process:') || /^\d+$/.test(agent.id)) {
          await warn('Not a Hermes session. Process ids cannot be resumed.')
          return
        }
        await host.resume(storedSessionId(agent.id))
        return
      }
      case 'check-host': {
        const found = fleetHost(doc, action.entities)
        host.control().draft(`Check the connection for ${found.id} and recommend one next step. `)
        return
      }
      case 'nudge': {
        const { agent } = fleetAgent(doc, action.entities)
        host.control().draft(`Follow up with ${agent.name} on ${action.entities.host}: `)
        return
      }
      case 'open-pod': {
        const pod = fleetPod(doc, action.entities)
        const reply = await fleetRequest(host.gw, context.sessionId, pod)
        if (context.isCurrent() && !context.signal.aborted) host.control().panel(`${pod.ns}/${pod.name}`, fleetText(reply))
        return
      }
      case 'open-task': browse(fleetTask(doc, action.entities).url); return
      case 'set-next': {
        const task = fleetTask(doc, action.entities)
        host.control().draft(`Set next: ${task.label} (${action.entities.product}/${action.entities.feature}/${task.id}). `)
        return
      }
      case 'queue-fix': {
        const node = fleetNode(doc, action.entities)
        host.control().draft(`Investigate and prepare a fix for ${node.label} (${node.id}). `)
        return
      }
      case 'open-node': browse(fleetNode(doc, action.entities).url); return
      default: { const exhaustive: never = action; return exhaustive }
    }
  } catch (error) {
    if (context.isCurrent() && !context.signal.aborted) {
      await warn(`Fleet action: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export async function fleetCommand(host: FleetHost, view: FleetView, portfolio?: string): Promise<void> {
  const sessionId = host.session.ref.live
  const label = view === 'factory' ? '/factory graph' : `/${view}`
  if (!sessionId || !host.eui) { host.notice(`${label} needs an attached session and inline cards`, 'warning'); return }
  const eui = host.eui
  const ref = host.session.ref
  const owner = host.session.ownerTicket?.()
  const lifetime = host.transcript.lifetime
  const current = () => host.session.ref === ref && host.session.ref.live === sessionId &&
    owner?.isCurrent() !== false && !owner?.signal.aborted && host.transcript.lifetime === lifetime
  const params = { view, ...(portfolio ? { portfolio } : {}) }
  const read = async () => decodeFleet(await fleetRequest(host.gw, sessionId, params), view)
  let handle: EuiKitHandle
  const publish = (doc: EuiKitDoc, first: boolean) => {
    const intent = (detail: unknown, context: EuiKitContext) => fleetIntent(host, doc, detail, context)
    const refresh = async (context: EuiKitContext) => {
      const next = await read()
      if (!current() || !context.isCurrent() || context.signal.aborted) return
      publish(next, false)
    }
    const data = { ...fleetVisibleDoc(doc), title: (title[view] + ' · ' + fleetDesign(doc, view).hero).slice(0, 200) }
    if (first) handle = eui.host.publishKit(data, intent, refresh)
    else handle.update(data, intent, refresh)
  }
  try {
    const doc = await read()
    if (current()) publish(doc, true)
  } catch (error) {
    if (current()) host.notice(`${label}: ${error instanceof Error ? error.message : String(error)}`, 'warning')
  }
}


/** The token-only Fleet presentation. The kit adapter may reuse this in Tern; shots render it directly. */
export const FLEET_DESIGN_CSS = [
  '.fl-design{width:100%;min-width:0;color:var(--t1,' + DASH.fg + ');font:400 ' + TYPE.body + 'px/1.4 var(--sans,system-ui,sans-serif)}',
  '.fl-design *{box-sizing:border-box}',
  '.fl-design-head{height:24px;display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;white-space:nowrap;font-size:' + TYPE.body + 'px}',
  '.fl-design-head b{color:var(--t2,' + DASH.muted + ');font-weight:500}',
  '.fl-design-head span{overflow:hidden;text-overflow:ellipsis;font-weight:400}',
  '.fl-design-box{background:var(--l1,' + DASH.bg + ');border:1px solid var(--l3,' + NIGHT.border + ');border-radius:' + RADIUS.tile + 'px;padding:14px;box-shadow:none}',
  '.fl-design-hero{max-width:72ch;font-size:' + TYPE.lead + 'px;font-weight:500;line-height:1.4}',
  '.fl-design-verdict{max-width:72ch;color:var(--t2,' + NIGHT.text2 + ');font-size:' + TYPE.small + 'px;margin:4px 0 10px}',
  '.fl-design-row{height:52px;max-height:52px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--l3,' + NIGHT.border + ');min-width:0}',
  '.fl-design-name{font-size:' + TYPE.body + 'px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.fl-design-status{font:' + TYPE.label + 'px/1.2 ' + MONO + ';letter-spacing:' + TRACK.caps + ';border-radius:' + RADIUS.pill + 'px;flex:none;white-space:nowrap;padding:5px 8px;border:1px solid color-mix(in srgb,var(--fleet-status) 25%,transparent);background:color-mix(in srgb,var(--fleet-status) 9%,transparent);color:var(--fleet-status)}',
  '.fl-design-status[data-tone=running],.fl-design-status[data-tone=done]{--fleet-status:var(--h-success,' + STATUS.ok + ')}',
  '.fl-design-status[data-tone=held]{--fleet-status:var(--h-warning,' + STATUS.warn + ')}',
  '.fl-design-status[data-tone=failed]{--fleet-status:var(--h-danger,' + STATUS.bad + ')}',
  '.fl-design-status[data-tone=idle]{--fleet-status:var(--t2,' + NIGHT.text2 + ')}',
  '.fl-design-status[data-tone=running]::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;animation:fl-breathe 2.8s ease-in-out infinite}',
  '@keyframes fl-breathe{50%{opacity:.35}}',
  '.fl-design-fact{font-size:' + TYPE.meta + 'px;color:var(--t2,' + NIGHT.text2 + ');background:var(--l2,' + DASH.bg + ');border-radius:' + RADIUS.chip + 'px;padding:4px 6px;flex:none;white-space:nowrap}',
  '.fl-design-action{flex:0 0 auto;min-width:160px;max-width:180px;min-height:44px;padding:7px 16px;border:1px solid var(--l3,' + NIGHT.borderStrong + ');border-radius:' + RADIUS.chip + 'px;background:transparent;color:var(--t1,' + DASH.fg + ');font-size:' + TYPE.body + 'px;cursor:pointer;text-align:center}',
  '.fl-design-action[data-next=true]{background:' + GOLD.fill + ';border-color:' + GOLD.rim + ';color:' + GOLD.ink + '}',
  '.fl-design-action:disabled{opacity:.55;cursor:default}',
  '.fl-design-action:focus-visible{outline:2px solid var(--h-primary,' + DASH.gold + ');outline-offset:2px}',
  '.fl-design-map{position:relative;margin-top:8px;max-width:100%}',
  '.fl-design-map svg{position:absolute;inset:0;pointer-events:none;overflow:visible}',
  '.fl-design-map path{stroke:var(--l3,' + NIGHT.borderStrong + ');stroke-width:1;fill:none}',
  '.fl-design-tile{position:absolute;width:152px;height:112px;padding:8px;border:1px solid var(--l3,' + NIGHT.borderStrong + ');border-radius:' + RADIUS.tile + 'px;background:var(--l2,' + DASH.bg + ');display:flex;flex-direction:column;align-items:start;gap:4px}',
  '.fl-design-tile .fl-design-name{flex:0 0 auto;max-width:100%;font-size:' + TYPE.small + 'px}',
  '.fl-design-tile .fl-design-status{align-self:start}',
  '.fl-design-tile .fl-design-action{min-width:0;max-width:100%;width:auto;min-height:44px;padding:4px 8px;font-size:' + TYPE.small + 'px;margin-top:auto}',
  '.fl-design-map-phone{display:none}',
  '@media(max-width:600px){.fl-design-row{gap:6px}.fl-design-name{font-size:' + TYPE.small + 'px}.fl-design-fact{display:none}.fl-design-action{min-width:0;max-width:112px;padding:7px 10px}.fl-design-map-desktop{display:none}.fl-design-map-phone{display:block}}',
  '@media(prefers-reduced-motion:reduce){.fl-design-status[data-tone=running]::before{animation:none;opacity:1}}'
].join('\n')

const fleetEscape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const fleetStatus = (state: FleetTone, view: FleetView): string => state === 'failed' && view === 'hosts'
  ? 'OFFLINE' : ({ running: 'RUNNING', held: 'HELD', failed: 'FAILED', done: 'DONE', idle: 'READY' })[state]

function fleetRows(rows: readonly FleetDesignRow[], view: FleetView): string {
  return rows.map(row => '<div class="fl-design-row" data-row="' + fleetEscape(row.key) + '">' +
    '<span class="fl-design-name" title="' + fleetEscape(row.name) + '">' + fleetEscape(row.name) + '</span>' +
    '<span class="fl-design-status" data-tone="' + row.state + '">' + fleetStatus(row.state, view) + '</span>' +
    (row.fact ? '<span class="fl-design-fact">' + fleetEscape(row.fact) + '</span>' : '') +
    '<button type="button" class="fl-design-action" data-next="' + row.recommended +
      '"' + (row.intent ? '' : ' disabled') + '>' + fleetEscape(row.action) + '</button></div>').join('')
}

/** A hairline-edge graph using exact source edges and 152px node tiles, reflowed on phones. */
function fleetGraph(model: FleetDesign, phone: boolean): string {
  const cols = phone ? 2 : 4
  const width = cols * 152 + (cols - 1) * 12
  const positions = new Map<string, {x:number;y:number}>()
  const count = Array.from({ length: cols }, () => 0)
  for (const [index, tile] of model.tiles.entries()) {
    const column = phone ? index % 2 : tile.column
    const row = count[column] ?? 0
    positions.set(tile.key, {x:column * 164, y: row * 124})
    count[column] = row + 1
  }
  const height = Math.max(1, ...count) * 124 - 12
  const paths = model.edges.map(([a, b]) => {
    const start = positions.get(a), end = positions.get(b)
    if (!start || !end) return ''
    // Edge to edge, never centre to centre: a hairline must not cross the tiles it joins.
    const [x1, y1, x2, y2] = start.y === end.y
      ? (start.x < end.x ? [start.x + 152, start.y + 56, end.x, end.y + 56] : [start.x, start.y + 56, end.x + 152, end.y + 56])
      : (start.y < end.y ? [start.x + 76, start.y + 112, end.x + 76, end.y] : [start.x + 76, start.y, end.x + 76, end.y + 112])
    return '<path d="M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 + '"/>'
  }).join('')
  const tiles = model.tiles.map(tile => {
    const point = positions.get(tile.key) ?? { x: 0, y: 0 }
    return '<article class="fl-design-tile" data-next="' + tile.recommended +
      '" style="left:' + point.x + 'px;top:' + point.y + 'px">' +
      '<span class="fl-design-name" title="' + fleetEscape(tile.name) + '">' + fleetEscape(tile.name) + '</span>' +
      '<span class="fl-design-status" data-tone="' + tile.state + '">' + fleetStatus(tile.state, model.view) + '</span>' +
      (tile.recommended ? '<button type="button" class="fl-design-action" data-next="true">' +
        fleetEscape(tile.action) + '</button>' : '') + '</article>'
  }).join('')
  return '<div class="fl-design-map fl-design-map-' + (phone ? 'phone' : 'desktop') +
    '" style="width:' + width + 'px;height:' + height + 'px">' +
    '<svg viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">' + paths + '</svg>' + tiles + '</div>'
}

/** Read-only HTML preview used by the headless shots. Runtime intents remain trusted EUI callbacks. */
export function fleetCardHtml(model: FleetDesign): string {
  const label = { hosts: 'Hosts', portfolio: 'Portfolio', factory: 'Factory graph' }[model.view]
  return '<section class="fl-design" aria-label="' + label + '">' +
    '<header class="fl-design-head"><b>Glide</b><span>' + label + '</span></header>' +
    '<div class="fl-design-box"><div class="fl-design-hero">' + fleetEscape(model.hero) + '</div>' +
    '<p class="fl-design-verdict">' + fleetEscape(model.verdict) + '</p>' +
    (model.view === 'factory' ? fleetGraph(model, false) + fleetGraph(model, true) : fleetRows(model.rows, model.view)) +
    '</div></section>'
}
