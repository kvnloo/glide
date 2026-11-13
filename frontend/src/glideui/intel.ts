// /intel as a glide/v1 host document: every value a program can show, keyed by slot. Labels come
// from presentIntel, so the intents controls send are the same ones the kit card sent and
// commands/intel.ts resolves them through the same reversible maps.
import { INTEL_TABS, intelReadableTitle, presentIntel, type IntelDoc, type IntelTab } from '../wire/intel.js'

import { type GlideDoc, type GlideSlot, slot, type UiIntent } from './library.js'

const TAB_LABELS: readonly (readonly [IntelTab, string])[] = [[0, 'Hill climbs'], [1, 'Skills'], [2, 'Memory'], [3, 'Failures'], [4, 'Trace']]
/** The note prefix per tab, as presentIntel names glide/intel.py's sources (climbs:, routes:, …) and tab guidance. */
const NOTE_PREFIX = ['hill climbs:', 'skill routing:', 'memory:', 'failed checks:', 'sessions:'] as const
const num = (n: number) => Number(n.toPrecision(4)).toString()
const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n))
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** The program name (fixtures/glide-programs.json) for a tab. */
export const intelProgram = (tab: IntelTab) => `intel.${INTEL_TABS[tab]}`

export function intelGlide(doc: IntelDoc, tab: IntelTab): GlideDoc {
  const { card } = presentIntel(doc)
  const d = doc.data
  const slots: Record<string, GlideSlot> = {}
  const tabIntent = (i: IntelTab): UiIntent => ({ action: 'tab', entities: { tab: i } })
  const openFailures = d.failures.filter(f => f.status === 'open').length
  const counts = [d.climbs.length, d.routes.length, d.memory.length, openFailures, d.trace.length]
  slots['tabs'] = slot('Tabs', {
    active: String(tab),
    items: TAB_LABELS.map(([i, label]) => ({ id: String(i), label, count: counts[i] ?? 0, intent: tabIntent(i) }))
  })
  slots['actions'] = slot('Buttons', { items: [{ label: 'Refresh', intent: { action: 'refresh', entities: {} } }] })

  // Hill climbs: the longest-running climb is the hero; every climb is a row that opens its detail.
  const climbs = [...d.climbs].sort((a, b) => b.points.length - a.points.length)
  const lead = climbs[0]
  const gain = (c: (typeof climbs)[number]) => (c.points.at(-1) ?? 0) - (c.points[0] ?? 0)
  if (lead && lead.points.length > 0) {
    const now = lead.points.at(-1) ?? 0
    slots['hill.trend'] = slot('Spark', {
      points: lead.points,
      summary: `best ${num(lead.best)} · ${plural(lead.points.length, 'iteration')} · ${signed(gain(lead))} since baseline`
    })
    slots['hill.best'] = slot('Hero', { value: num(now), label: intelReadableTitle(lead.label, 'Hill climb'), detail: `${signed(gain(lead))} since first score`, tone: gain(lead) >= 0 ? 'accent' : 'warning' })
  } else {
    slots['hill.trend'] = slot('Text', { body: 'No scored iterations yet.', tone: 'muted' })
    slots['hill.best'] = slot('Hero', { value: '—', label: 'No climbs' })
  }
  slots['hill.climbs'] = slot('List', {
    items: climbs.map(c => ({
      id: c.id, label: intelReadableTitle(c.label, 'Hill climb'),
      detail: `${plural(c.points.length, 'run')} · best ${num(c.best)}${c.unit ? ' ' + c.unit : ''}`,
      value: c.points.length ? `${num(c.points.at(-1) ?? 0)}  ${signed(gain(c))}` : '—',
      intent: { action: 'open-climb', entities: { id: c.id } }
    }))
  })

  // Skills: routing volume, then the busiest skills.
  const routes = card.data.routes
  const hits = routes.reduce((n, r) => n + r.hits, 0)
  const corrected = routes.reduce((n, r) => n + r.corrected, 0)
  slots['skills.stats'] = slot('Stats', { items: [
    { label: 'Skills routed', value: String(routes.length) },
    { label: 'Hits', value: String(hits) },
    { label: 'Corrected', value: hits ? Math.round(100 * corrected / hits) + '%' : '0%', tone: corrected ? 'warning' : 'success' }
  ] })
  const busiest = [...routes].sort((a, b) => b.hits - a.hits).slice(0, 6)
  slots['skills.bars'] = slot('Bars', { values: busiest.map(r => r.hits), labels: busiest.map(r => r.skill.slice(0, 12)), summary: busiest[0] ? `${busiest[0].skill} leads with ${plural(busiest[0].hits, 'hit')}` : 'No routed skills' })
  slots['skills.routes'] = slot('List', {
    items: routes.map(r => ({ id: r.skill, label: r.skill, detail: `${plural(r.hits, 'hit')} · ${r.corrected} corrected`, value: String(r.hits), intent: { action: 'open-skill', entities: { skill: r.skill } } }))
  })

  // Memory: one row per store, stale ones flagged.
  const memory = card.data.memory
  const stale = memory.filter(m => m.stale).length
  slots['memory.stats'] = slot('Stats', { items: [
    { label: 'Stores', value: String(memory.length) },
    { label: 'Levels', value: String(new Set(memory.map(m => m.level)).size) },
    { label: 'Need review', value: String(stale), tone: stale ? 'warning' : 'success' }
  ] })
  slots['memory.stores'] = slot('Table', {
    columns: [{ id: 'level', head: 'Level' }, { id: 'name', head: 'Store', grow: true }, { id: 'size', head: 'Size', align: 'end' }, { id: 'fresh', head: 'Fresh', align: 'end' }],
    rows: memory.map((m, i) => ({ id: `m${i}`, cells: { level: m.level, name: m.stale ? { text: m.name, tone: 'warning' } : m.name, size: m.size, fresh: m.fresh } }))
  })

  // Failures: open first (presentIntel orders them), each opens its record.
  const failures = card.data.failures
  slots['failures.stats'] = slot('Stats', { items: [
    { label: 'Open', value: String(openFailures), tone: openFailures ? 'error' : 'success' },
    { label: 'Passed', value: String(d.failures.filter(f => f.status === 'fixed').length) },
    { label: 'Rule linked', value: String(d.failures.filter(f => f.status === 'law').length) }
  ] })
  slots['failures.list'] = slot('List', {
    items: failures.map(f => ({
      id: f.sig, label: f.sig.replace(/^(Open|Passed|Covered) · /, ''), detail: f.source, value: '×' + f.count,
      badge: f.status === 'open' ? 'open' : f.status === 'fixed' ? 'passed' : 'rule',
      tone: f.status === 'open' ? 'error' : f.status === 'fixed' ? 'success' : 'info',
      intent: { action: 'open-failure', entities: { sig: f.sig } }
    }))
  })

  // Trace: spans per session by kind (m model, t tool, e error).
  const spans = d.trace.flatMap(t => t.spans)
  const kind = (k: 'm' | 't' | 'e', list = spans) => list.filter(s => s[2] === k).length
  slots['trace.stats'] = slot('Stats', { items: [
    { label: 'Sessions', value: String(d.trace.length) },
    { label: 'Spans', value: String(spans.length) },
    { label: 'Errors', value: String(kind('e')), tone: kind('e') ? 'error' : 'success' }
  ] })
  slots['trace.lanes'] = slot('Table', {
    columns: [{ id: 'lane', head: 'Session', grow: true }, { id: 'm', head: 'Model', align: 'end' }, { id: 't', head: 'Tool', align: 'end' }, { id: 'e', head: 'Errors', align: 'end' }],
    rows: card.data.trace.map((t, i) => ({ id: `t${i}`, cells: { lane: t.lane, m: kind('m', t.spans), t: kind('t', t.spans), e: kind('e', t.spans) ? { text: String(kind('e', t.spans)), tone: 'error' } : '0' } }))
  })

  // Methodology notes ride on the source line: general notes plus this tab's (`<source>: …`); other tabs' notes show on their tab.
  const other = NOTE_PREFIX.filter((_, i) => i !== tab)
  const picked = card.data.notes.filter(n => !other.some(p => n.toLowerCase().startsWith(p)))
  const notes = picked.length ? picked.join(' · ') : 'local snapshot'
  return { id: 'intel', title: 'Local intelligence', app: 'glide', source: 'Source: /intel · ' + notes, slots }
}
