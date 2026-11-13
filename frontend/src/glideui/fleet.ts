// /hosts, /portfolio and /factory graph as glide/v1 host documents, after the kit's fleet cards
// (ephemeral-ui fleet-hosts.js, fleet-pm.js, fleet-factory.js): the same views and controls, drawn
// natively. Every control sends the fleet.v0 intent the kit card sent, so commands/fleet.ts resolves
// it against the trusted publication exactly as before; ids stay in intents, never on the card.
import * as z from 'zod/mini'

import { STATUS } from '../../../glide/frontend/tokens.js'
import { kitNotes, type EuiKitDoc } from '../wire/euiKit.js'
import { fleetVisibleDoc, type FleetIntent, type FleetView } from '../wire/fleet.js'

import { type GlideDoc, type GlideSlot, slot, type UiIntent, type UiTone } from './library.js'

export const HOSTS_TABS = ['agents', 'machines', 'k3s'] as const
export type HostsTab = (typeof HOSTS_TABS)[number]
const HOSTS_TAB_LABELS: Record<HostsTab, string> = { agents: 'Agents', machines: 'Machines', k3s: 'k3s pods' }
export const isHostsTab = (value: unknown): value is HostsTab => HOSTS_TABS.some(t => t === value)
const localIntent = z.object({ action: z.string(), entities: z.optional(z.object({ tab: z.optional(z.string()) })) })
/** The card-local controls (tab switch, Refresh); anything else is a fleet.v0 intent. */
export function fleetLocalIntent(detail: unknown): { tab: HostsTab } | 'refresh' | undefined {
  const parsed = localIntent.safeParse(detail)
  if (!parsed.success) return undefined
  if (parsed.data.action === 'refresh') return 'refresh'
  const tab = parsed.data.entities?.tab
  return parsed.data.action === 'tab' && isHostsTab(tab) ? { tab } : undefined
}

/** The program name (fixtures/glide-programs.json) for a fleet view. */
export const fleetProgram = (view: FleetView, tab: HostsTab = 'agents') => view === 'hosts' ? `fleet.hosts.${tab}` : `fleet.${view}`
export const FLEET_TITLES: Record<FleetView, string> = { hosts: 'Hosts & k3s', portfolio: 'Product portfolio', factory: 'Factory graph' }

const text = z.string()
const agent = z.object({ id: text, name: text, state: text, line: z.optional(text), age: z.optional(text), model: z.optional(text) })
const host = z.object({
  id: text, label: text, role: z.optional(text), online: z.boolean(),
  gauges: z.optional(z.record(text, z.nullable(z.number()))),
  k3s: z.nullable(z.object({ node: z.optional(text), version: z.optional(text), pods: z.array(z.tuple([text, text, text, z.number(), text])) })),
  harnesses: z.array(z.object({ kind: text, agents: z.array(agent) }))
})
const task = z.object({ id: text, label: text, status: text, defect: z.optional(z.boolean()), url: z.optional(text) })
const portfolios = z.record(text, z.object({
  label: text, lead: z.optional(text),
  products: z.array(z.object({ id: text, label: text, horizon: z.optional(text),
    features: z.array(z.object({ id: text, label: text, horizon: z.optional(text), tasks: z.array(task) })) }))
}))
const factory = z.object({
  stats: z.optional(z.object({ queue: z.number(), depth: z.number(), sendsHour: z.number(), capHour: z.number(), posted: z.number(), verifyPass: z.number() })),
  nodes: z.array(z.object({ id: text, col: z.number(), label: text, kind: z.optional(text), state: text, reason: z.optional(text), action: z.optional(text), url: z.optional(text) })),
  edges: z.array(z.tuple([text, text, text, z.boolean()]))
})

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const intent = (i: FleetIntent): UiIntent => i
const refresh = slot('Buttons', { items: [{ label: 'Refresh', intent: { action: 'refresh', entities: {} } }] })
const vacant = (view: FleetView, source: string): GlideDoc => ({
  id: 'fleet', title: FLEET_TITLES[view], app: { hosts: 'k3s', portfolio: 'dash', factory: 'aodl' }[view], source,
  slots: { empty: slot('Text', { body: 'Fleet snapshot unavailable. Refresh to retry.', tone: 'muted' }), actions: refresh }
})

/** The glide/v1 document and the program that draws it; a snapshot that does not parse is the vacant card. */
export function fleetGlide(raw: EuiKitDoc, view: FleetView, tab: HostsTab = 'agents'): { program: string; doc: GlideDoc } {
  const doc = fleetVisibleDoc(raw)
  const source = kitNotes(doc)[0] ?? 'Source: read-only fleet collectors'
  const built = doc.kind !== 'fleet-' + view ? undefined : view === 'hosts' ? hosts(doc, tab) : view === 'portfolio' ? portfolio(doc) : graph(doc)
  if (!built) return { program: 'fleet.vacant', doc: vacant(view, source) }
  return { program: fleetProgram(view, tab), doc: { id: 'fleet', title: FLEET_TITLES[view], app: doc.app, source, slots: { actions: refresh, ...built } } }
}

const AGENT_STATE: Record<string, [string, UiTone]> = {
  working: ['working', 'success'], blocked: ['needs you', 'warning'], idle: ['idle', 'neutral'], offline: ['offline', 'error']
}
const POD_TONE = (phase: string): UiTone => phase === 'Running' || phase === 'Succeeded' ? 'success' : phase === 'Pending' ? 'warning' : 'error'

function hosts(doc: EuiKitDoc, tab: HostsTab): Record<string, GlideSlot> | undefined {
  const parsed = z.object({ hosts: z.array(host) }).safeParse(doc.data)
  if (!parsed.success) return undefined
  const list = parsed.data.hosts
  const agents = list.flatMap(h => h.harnesses.flatMap(g => g.agents))
  const pods = list.flatMap(h => h.k3s?.pods ?? [])
  const blocked = agents.filter(a => a.state === 'blocked').length
  const slots: Record<string, GlideSlot> = {}
  slots['tabs'] = slot('Tabs', {
    active: tab,
    items: HOSTS_TABS.map(t => ({ id: t, label: HOSTS_TAB_LABELS[t], count: t === 'agents' ? agents.length : t === 'machines' ? list.length : pods.length,
      intent: { action: 'tab', entities: { tab: t } } }))
  })
  slots['hosts.stats'] = slot('Stats', { items: [
    { label: 'Online', value: `${list.filter(h => h.online).length}/${list.length}`, tone: list.every(h => h.online) ? 'success' : 'warning' },
    { label: 'Agents', value: String(agents.length) },
    { label: 'Need you', value: String(blocked), tone: blocked ? 'warning' : 'success' },
    { label: 'Pods', value: String(pods.length) }
  ] })

  // Agents: one run per host, as the kit's host → harness → agent tree. Hosts with no agents are one line
  // (their rows are on Machines), so the tab row and every agent fit the pane at once.
  const rows = list.flatMap(h => h.harnesses.flatMap(g => g.agents.map(a => {
    const [badge, tone] = AGENT_STATE[a.state] ?? [a.state, 'neutral']
    const resumable = g.kind.toLowerCase() === 'hermes' && !a.id.startsWith('process:') && !/^\d+$/.test(a.id)
    const reachable = h.online && a.state !== 'offline'
    const act: FleetIntent = a.state === 'blocked' || !resumable
      ? { action: 'nudge', entities: { host: h.id, agent: a.id } }
      : { action: 'open-chat', entities: { host: h.id, agent: a.id } }
    return { id: `${h.id}/${a.id}`, label: a.name, detail: [g.kind, a.line].filter(Boolean).join(' · '), badge, tone,
      ...(a.age ? { value: a.age } : {}), group: [h.label, h.role].filter(Boolean).join(' · '), ...(reachable ? { intent: intent(act) } : {}) }
  })))
  const bare = list.filter(h => !h.harnesses.some(g => g.agents.length)).map(h => h.online ? h.label : `${h.label} (offline)`)
  slots['hosts.agents'] = slot('List', { items: rows, numbered: false })
  slots['hosts.quiet'] = slot('Text', { body: bare.length ? `No agents reported: ${bare.join(', ')}` : 'Every host reports agents.', tone: 'muted' })

  // Machines: the kit's gauge bars as meter cells; a host that reports no gauge shows a dash.
  const GAUGES = ['cpu', 'mem', 'disk', 'gpu'] as const
  slots['hosts.machines'] = slot('Table', {
    columns: [{ id: 'host', head: 'Host', grow: true }, { id: 'state', head: 'State' },
      ...GAUGES.map(g => ({ id: g, head: g.toUpperCase(), meter: true }))],
    rows: list.map(h => ({ id: h.id, cells: {
      host: [h.label, h.role].filter(Boolean).join(' · '),
      state: { text: h.online ? 'online' : 'offline', tone: h.online ? 'success' : 'error' },
      ...Object.fromEntries(GAUGES.map(g => { const v = h.gauges?.[g]; return [g, typeof v === 'number' ? v / 100 : '—'] }))
    } }))
  })

  // k3s pods: one run per node; a pod opens its describe output when its host is online.
  slots['hosts.pods'] = slot('List', { numbered: false, items: list.flatMap(h => (h.k3s?.pods ?? []).map(([ns, name, phase, restarts, note]) => ({
    id: `${h.id}/${ns}/${name}`, label: `${ns}/${name}`, badge: phase, tone: POD_TONE(phase), ...(restarts ? { value: plural(restarts, 'restart') } : {}),
    ...(note ? { detail: note } : {}),
    group: [h.label, h.k3s?.node, h.k3s?.version].filter(Boolean).join(' · '),
    ...(h.online ? { intent: intent({ action: 'open-pod', entities: { host: h.id, ns, name } }) } : {})
  }))) })
  const outside = list.filter(h => !h.k3s).map(h => h.label)
  slots['hosts.outside'] = slot('Text', { body: list.some(h => h.k3s) ? `Not in cluster: ${outside.join(', ') || 'none'}` : 'No k3s nodes in this snapshot.', tone: 'muted' })
  return slots
}

const TASK_STATE: Record<string, [string, UiTone]> = {
  active: ['working', 'success'], next: ['next', 'info'], blocked: ['blocked', 'warning'], done: ['done', 'neutral']
}

function portfolio(doc: EuiKitDoc): Record<string, GlideSlot> | undefined {
  const parsed = z.object({ portfolios }).safeParse(doc.data)
  if (!parsed.success) return undefined
  const [, pf] = Object.entries(parsed.data.portfolios)[0] ?? []
  if (!pf) return undefined
  // GitHub tasks are repository-wide: a task listed under several products is one row naming them all.
  type Task = z.infer<typeof task> & { product: string; feature: string; repo: string; products: string[] }
  const tasks = new Map<string, Task>()
  for (const p of pf.products) for (const f of p.features) for (const t of f.tasks) {
    const seen = tasks.get(f.label + '\0' + t.id)
    if (seen) { if (!seen.products.includes(p.label)) seen.products.push(p.label) }
    else tasks.set(f.label + '\0' + t.id, { ...t, product: p.id, feature: f.id, repo: f.label, products: [p.label] })
  }
  const all = [...tasks.values()]
  const blocked = all.filter(t => t.status === 'blocked').length
  const act = (t: Task): UiIntent => intent(t.url && t.status !== 'next'
    ? { action: 'open-task', entities: { product: t.product, feature: t.feature, task: t.id } }
    : { action: 'set-next', entities: { product: t.product, feature: t.feature, task: t.id } })
  const everywhere = (t: Task) => t.products.length === pf.products.length && pf.products.length > 1
  const row = (t: Task) => {
    const [badge, tone] = t === queue[0] ? ['next step', 'accent' as const] : TASK_STATE[t.status] ?? [t.status, 'neutral' as const]
    const where = everywhere(t) ? 'every product' : t.products.join(', ')
    return { id: t.id, label: t.label + (t.defect ? ' · defect' : ''), detail: `${t.id.replace(/^.*?(#\d+)$/, '$1')} · ${where}`, badge, tone, group: t.repo, intent: act(t) }
  }
  // The recommended next step leads, then what is blocked, queued, running and done.
  const order: Readonly<Record<string, number>> = { blocked: 1, next: 2, active: 3, done: 4 }
  const rank = (t: Task) => t === queue[0] ? 0 : Object.hasOwn(order, t.status) ? order[t.status] ?? 5 : 5
  const queue = all.filter(t => t.status === 'next')
  if (!queue.length) queue.push(...all.filter(t => t.status !== 'done').slice(0, 1))
  const features = pf.products.reduce((n, p) => n + p.features.length, 0)
  const HORIZONS = [['now', 'Now', 'accent'], ['next', 'Next', 'info'], ['later', 'Later', 'neutral']] as const
  return {
    'pf.stats': slot('Stats', { items: [
      { label: 'Products', value: String(pf.products.length) }, { label: 'Features', value: String(features) },
      { label: 'Tasks', value: String(all.length) }, { label: 'Blocked', value: String(blocked), tone: blocked ? 'warning' : 'success' }
    ] }),
    'pf.roadmap': slot('Flow', { stages: HORIZONS.map(([id, label, tone]) => {
      const here = pf.products.filter(p => (p.horizon ?? 'later') === id)
      return { id, label: `${label} · ${here.length}`, detail: here.map(p => p.label).join(', ') || '—', tone }
    }) }),
    'pf.tasks': slot('Section', { title: 'Tasks', aside: queue[0] ? `${pf.label} · next: ${queue[0].id.replace(/^.*?(#\d+)$/, '$1')}` : pf.label }),
    'pf.list': slot('List', { numbered: false, items: [...all].sort((a, b) => rank(a) - rank(b)).map(row) })
  }
}

const IDLE: [string, UiTone, string] = ['idle', 'neutral', 'var(--muted)']
const NODE_STATE: Record<string, [string, UiTone, string]> = {
  live: ['live', 'accent', 'var(--accent)'], 'needs-you': ['needs you', 'warning', STATUS.warn], failing: ['failing', 'error', STATUS.bad],
  done: ['done', 'success', STATUS.ok], idle: IDLE
}
const COLS = ['Brain', 'Lanes', 'Cards', 'Repos']
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The kit's spine layout: four columns, state-dotted pills, curves from right edge to left edge. */
export function factorySpine(nodes: z.infer<typeof factory>['nodes'], edges: z.infer<typeof factory>['edges'], W = 920) {
  const col = (n: { col: number }) => Math.max(0, Math.min(3, Math.floor(n.col)))
  const used = [0, 1, 2, 3].filter(c => nodes.some(n => col(n) === c))
  const slotOf = (c: number) => Math.max(0, used.indexOf(c))
  const colW = (W - 16) / Math.max(1, used.length), rowH = 38, top = 24, pw = Math.min(190, colW - 28)
  const rows = Math.max(1, ...used.map(c => nodes.filter(n => col(n) === c).length))
  const H = top + rows * rowH + 4
  const pos = new Map<string, { x: number; y: number }>()
  for (const c of used) {
    const here = nodes.filter(n => col(n) === c)
    const y0 = top + ((rows - here.length) * rowH) / 2 + rowH / 2
    here.forEach((n, i) => pos.set(n.id, { x: 8 + colW * slotOf(c) + colW / 2, y: y0 + i * rowH }))
  }
  const heads = used.map(c => `<text x="${8 + colW * slotOf(c) + colW / 2}" y="12" text-anchor="middle" font-size="10" letter-spacing="1" fill="var(--muted)" font-family="monospace">${(COLS[c] ?? '').toUpperCase()} · ${nodes.filter(n => col(n) === c).length}</text>`)
  const lines = edges.flatMap(([a, b, , active]) => {
    const p = pos.get(a), q = pos.get(b)
    if (!p || !q) return []
    const x1 = p.x + pw / 2, x2 = q.x - pw / 2, k = (x2 - x1) / 2
    const d = Math.abs(p.x - q.x) < 2 ? `M${p.x},${p.y + 13} L${q.x},${q.y - 13}` : `M${x1},${p.y} C${x1 + k},${p.y} ${x2 - k},${q.y} ${x2},${q.y}`
    return [`<path d="${d}" fill="none" stroke="${active ? 'var(--accent)' : 'var(--muted)'}" stroke-opacity="${active ? 0.9 : 0.35}" stroke-width="${active ? 1.6 : 1}"/>`]
  })
  const pills = nodes.flatMap(n => {
    const p = pos.get(n.id)
    if (!p) return []
    const [, , ink] = NODE_STATE[n.state] ?? IDLE
    const max = Math.floor((pw - 30) / 6.6)
    const label = n.label.length > max ? n.label.slice(0, max - 1) + '…' : n.label
    const loud = n.state === 'failing' || n.state === 'needs-you' || n.state === 'live'
    return [`<g transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><rect x="${-pw / 2}" y="-14" width="${pw}" height="28" rx="14" fill="${loud ? ink : 'var(--muted)'}" fill-opacity="${loud ? 0.14 : 0.06}" stroke="${loud ? ink : 'var(--muted)'}" stroke-opacity="${loud ? 0.7 : 0.3}"/>` +
      `<circle cx="${-pw / 2 + 14}" cy="0" r="4.5" fill="${ink}"/><text x="${-pw / 2 + 26}" y="4" font-size="12" fill="var(--text)" font-family="system-ui,sans-serif">${esc(label)}</text></g>`]
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${heads.join('')}${lines.join('')}${pills.join('')}</svg>`
  return { svg, w: W, h: H }
}

function graph(doc: EuiKitDoc): Record<string, GlideSlot> | undefined {
  const parsed = factory.safeParse(doc.data)
  if (!parsed.success) return undefined
  const { nodes, stats } = parsed.data
  const ids = new Set(nodes.map(n => n.id))
  const edges = parsed.data.edges.filter(([a, b]) => ids.has(a) && ids.has(b))
  const count = (s: string) => nodes.filter(n => n.state === s).length
  const open = nodes.filter(n => n.state === 'failing' || n.state === 'needs-you')
  const fix = open.find(n => n.action)
  const sends = stats && stats.capHour ? stats.sendsHour / stats.capHour : 0
  const spine = factorySpine(nodes, edges)
  return {
    'ff.tally': slot('Badges', { items: (['live', 'needs-you', 'failing', 'done'] as const).filter(s => count(s)).map(s => {
      const [label, tone] = NODE_STATE[s] ?? [s, 'neutral']
      return { text: `${count(s)} ${label}`, tone }
    }) }),
    'ff.stats': slot('Stats', { items: stats ? [
      { label: 'Queue', value: `${stats.queue}/${stats.depth}` },
      { label: 'Sends / hr', value: `${stats.sendsHour}/${stats.capHour}`, ...(sends >= 0.85 ? { tone: 'warning' as const } : {}) },
      { label: 'Posted today', value: String(stats.posted) },
      { label: 'Verify pass', value: Math.round(stats.verifyPass * 100) + '%', tone: stats.verifyPass >= 0.9 ? 'success' : 'warning' }
    ] : [{ label: 'Nodes', value: String(nodes.length) }] }),
    'ff.graph': slot('Graphic', { ...spine, alt: `Factory graph: ${plural(nodes.length, 'node')}, ${plural(edges.length, 'edge')}; brain delegates to lanes, lanes run cards, cards touch repos.` }),
    'ff.bottlenecks': slot('Section', { title: 'Bottlenecks', aside: `${open.length} open` }),
    'ff.open': slot('List', { items: open.length ? open.map(n => {
      const [badge, tone] = NODE_STATE[n.state] ?? [n.state, 'neutral']
      return { id: n.id, label: n.label, detail: n.reason ?? '', badge, tone, ...(n.action ? { value: n.action } : {}),
        ...(n.action ? { intent: intent({ action: 'queue-fix', entities: { node: n.id } }) } : n.url ? { intent: intent({ action: 'open-node', entities: { node: n.id } }) } : {}) }
    }) : [{ id: 'none', label: 'Nothing is blocked', tone: 'success' }] }),
    actions: slot('Buttons', { items: [
      ...(fix?.action ? [{ label: `${fix.action} · ${fix.label}`, primary: true, intent: intent({ action: 'queue-fix', entities: { node: fix.id } }) }] : []),
      { label: 'Refresh', intent: { action: 'refresh', entities: {} } }
    ] })
  }
}
