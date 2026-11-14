// A God's Eye View answer as a native glide card: the real app's globe, its count, summary and rows.

import type { UiNode } from '../glideui/library.js'
import type { GevAnswer } from '../wire/gev.js'


const TITLES: Readonly<Record<string, string>> = {
  get_earthquakes: 'Earthquakes', get_active_fires: 'Active fires', get_recent_launches: 'Launches',
  aircraft_in_area: 'Aircraft', find_aircraft: 'Aircraft', vessels_in_area: 'Vessels', find_vessel: 'Vessels',
  next_satellite_pass: 'Satellite pass', satellites_overhead: 'Satellites overhead', get_weather: 'Weather',
  get_cyclones: 'Cyclones', situation_brief: 'Situation brief', find_submarine_cables: 'Submarine cables',
  get_regional_brief: 'Regional brief'
}
export const gevTitle = (tool: string) => TITLES[tool] ?? tool.replace(/^(get|find)_/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

/** Columns worth a glance: never ids or raw coordinates, at most four. */
const SKIP = /^(id|lat|lon|latitude|longitude|icao24|mmsi|imo|url|stream_url|geometry|path|track)$/i
const HEADS: Readonly<Record<string, string>> = { magnitude: 'MAG', depth_km: 'DEPTH', altitude_m: 'ALT', speed_kts: 'SPEED', distance_km: 'DIST' }

function cellText(key: string, v: unknown): string {
  if (typeof v === 'number') {
    if (key === 'magnitude') return 'M' + v.toFixed(1)
    if (key.endsWith('_km')) return `${Math.round(v)} km`
    if (key.endsWith('_m')) return `${Math.round(v).toLocaleString('en-US')} m`
    return Number(v.toPrecision(4)).toString()
  }
  if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) {
    const mins = Math.round((Date.now() - Date.parse(v)) / 60000)
    return mins < 0 ? new Date(v).toISOString().slice(5, 16).replace('T', ' ') + 'Z'
      : mins < 60 ? `${mins}m ago` : mins < 2880 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`
  }
  return typeof v === 'string' ? v : typeof v === 'boolean' ? (v ? 'yes' : 'no') : ''
}

export function columns(rows: GevAnswer['rows']): string[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first).filter(k => !SKIP.test(k) && ['string', 'number', 'boolean'].includes(typeof first[k])).slice(0, 4)
}

export interface GevCardState { readonly png?: string | undefined; readonly size?: { readonly w: number; readonly h: number } | undefined; readonly capturing: boolean; readonly failed?: string | undefined }

/** The card: the real app's globe at this answer's view, its count, summary and leading rows. */
export function gevCard(a: GevAnswer, s: GevCardState): UiNode {
  const cols = columns(a.rows)
  const kids: UiNode[] = []
  kids.push(s.png
    ? { type: 'element', typeName: 'Picture', props: { png: s.png, w: s.size?.w ?? 1280, h: s.size?.h ?? 800, alt: `God's Eye View: ${a.summary}` } }
    : { type: 'element', typeName: 'Text', props: { body: s.failed ? `Globe unavailable: ${s.failed}` : 'Rendering the globe in God\'s Eye View…', tone: 'muted' } })
  const summary: UiNode = { type: 'element', typeName: 'Text', props: { body: a.summary } }
  // A count only when the app gave one: a pass time or a brief has none, and a dash is not a number.
  kids.push(a.total === undefined ? summary : { type: 'element', typeName: 'Row', props: { children: [
    { type: 'element', typeName: 'Hero', props: { value: String(a.total), label: a.layers.length ? a.layers.join(' · ') : gevTitle(a.tool) } },
    summary
  ] } })
  if (cols.length && a.rows.length) {
    kids.push({ type: 'element', typeName: 'Table', props: {
      columns: cols.map((c, i) => ({ id: c, head: HEADS[c] ?? c.replace(/_/g, ' ').toUpperCase(), ...(c === 'place' || c === 'name' ? { grow: true } : {}) })),
      rows: a.rows.slice(0, 6).map((r, i) => ({ id: String(r['id'] ?? i), cells: Object.fromEntries(cols.map(c => [c, cellText(c, r[c])])) }))
    } })
  }
  kids.push({ type: 'element', typeName: 'Buttons', props: { items: [{ label: 'Open in God\'s Eye View', intent: { action: 'open', entities: {} }, primary: true }] } })
  return { type: 'element', typeName: 'Card', props: { title: gevTitle(a.tool), app: "GOD'S EYE VIEW", source: a.url, skin: 'gev', status: s.capturing ? 'running' : 'done', children: kids } }
}
