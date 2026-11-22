// Widgets an agent mounts around the composer (glide_ui_mount, kvnloo/glide#326). A mount is a glide/v1
// program, a dock slot and a host data source: the program only picks and orders the source's slots, and
// the host re-binds it whenever the source refreshes (a commit lands, the focus clock ticks), so a mounted
// widget updates itself without the model writing it again. The documents here are pure; widgets.ts reads.

import { slot, type GlideDoc } from './library.js'
import type { PageMount } from './pages.js'

export const WIDGET_SLOTS = ['above-composer', 'below-composer', 'composer-ring', 'sidebar'] as const
export type WidgetSlot = (typeof WIDGET_SLOTS)[number]
export const WIDGET_SOURCES = ['git.commits', 'clock.focus'] as const
export type WidgetSource = (typeof WIDGET_SOURCES)[number]

export interface WidgetMount {
  readonly id: string
  readonly slot: WidgetSlot
  readonly source: WidgetSource
  readonly program: string
  /** clock.focus: the block's length. */
  readonly minutes?: number | undefined
  /** clock.focus: when the block started (ms), so a relaunch keeps counting. */
  readonly startedAt?: number | undefined
  /** composer-ring: a soft glow on the ring, only when asked for; nothing glows by default. */
  readonly glow?: boolean | undefined
}

export interface UiState {
  readonly rev: number
  readonly widgets: readonly WidgetMount[]
  /** Whole apps the agent opened as pages (glide_page_open). */
  readonly pages?: readonly PageMount[] | undefined
  readonly style?: { readonly warmth?: number | undefined; readonly accent?: string | undefined; readonly composer?: 'center' | 'bottom' | undefined } | undefined
}

const DAY = 86_400_000
export const HEAT_WEEKS = 52
/** 53 columns at this pitch, with the day gutter, fill the composer's 712 px measure. */
const CELL = 10
const GAP = 2.9

/** Local midnight of `t`. */
const midnight = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/** Commits per day for the last `weeks` weeks, oldest first, ending on today's weekday column. */
export function commitDays(times: readonly number[], now: number, weeks = HEAT_WEEKS): number[] {
  const today = midnight(now)
  const first = today - ((weeks - 1) * 7 + new Date(today).getDay()) * DAY
  const days = new Array<number>(Math.round((today - first) / DAY) + 1).fill(0)
  for (const t of times) {
    const i = Math.round((midnight(t * 1000) - first) / DAY)
    if (i >= 0 && i < days.length) days[i] = (days[i] ?? 0) + 1
  }
  return days
}

/** Day-label gutter, the legend and month rows above the grid, and the grid's own pitch (px). */
const GUTTER = 30
const LEGEND_H = 16
const MONTH_H = 18
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const LEVEL_OPACITY = [0, 0.32, 0.55, 0.78, 1] as const

/** Busy-day levels 1-4 by the quartiles of the days that had commits, so one huge day doesn't wash the rest out. */
export function heatLevels(days: readonly number[]): number[] {
  const busy = days.filter(n => n > 0).sort((a, b) => a - b)
  const q = (p: number) => busy[Math.min(busy.length - 1, Math.floor(p * busy.length))] ?? 0
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)]
  return days.map(n => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4))
}

const label = (x: number, y: number, t: string, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-size="11" font-family="Inter, system-ui, sans-serif" fill="var(--muted)" text-anchor="${anchor}">${t}</text>`
const cellRect = (x: number, y: number, level: number) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CELL}" height="${CELL}" rx="3" ${level === 0 ? 'fill="var(--muted)" fill-opacity="0.16"' : `fill="var(--accent)" fill-opacity="${LEVEL_OPACITY[level]}"`}/>`

/**
 * The heatmap, as GitHub's contribution graph: a week per column (Sunday on top), month names over the columns
 * where a month starts, Mon/Wed/Fri down the side and a Less-More legend at the top right. `first` is the first
 * day's local midnight (ms). The accent's opacity steps with the day's level (heatLevels).
 */
export function heatSvg(days: readonly number[], first?: number): { svg: string; w: number; h: number } {
  const cols = Math.ceil(days.length / 7)
  const pitch = CELL + GAP
  const top = LEGEND_H + MONTH_H
  const w = GUTTER + cols * pitch - GAP
  const h = top + 7 * pitch - GAP
  const levels = heatLevels(days)
  const cells = days.map((_, i) => cellRect(GUTTER + Math.floor(i / 7) * pitch, top + (i % 7) * pitch, levels[i] ?? 0))
  const marks: string[] = []
  if (first !== undefined) {
    // A month is named over its first column, unless that sits within three columns of the last name (a part-month
    // at the left edge).
    let last = new Date(first).getMonth()
    let named = new Date(first).getDate() <= 7 ? 0 : -3
    if (named === 0) marks.push(label(GUTTER, LEGEND_H + 12, MONTHS[last] ?? ''))
    for (let c = 1; c < cols; c++) {
      const m = new Date(first + c * 7 * DAY).getMonth()
      if (m !== last && c - named >= 3) {
        marks.push(label(GUTTER + c * pitch, LEGEND_H + 12, MONTHS[m] ?? ''))
        named = c
      }
      last = m
    }
  }
  const days3 = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']] as const
  const side = days3.map(([row, t]) => label(0, top + row * pitch + CELL - 1, t))
  // Legend: "Less", the five levels, "More", flush right on the top row.
  const lx = w - 30 - 5 * pitch
  const legend = [label(lx - 6, 11, 'Less', 'end'), ...LEVEL_OPACITY.map((_, l) => cellRect(lx + l * pitch, 1, l)), label(w, 11, 'More', 'end')]
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${[...legend, ...marks, ...side, ...cells].join('')}</svg>`, w, h }
}

/** The git.commits document: `heat`, `total`, `stats`, `trend` and `repo`. */
export function commitsDoc(times: readonly number[], now: number, repo: string): GlideDoc {
  const days = commitDays(times, now)
  const total = days.reduce((a, b) => a + b, 0)
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7).reduce((a, b) => a + b, 0))
  let streak = 0
  for (let i = days.length - 1; i >= 0 && (days[i] ?? 0) > 0; i--) streak++
  const today = midnight(now)
  const heat = heatSvg(days, today - (days.length - 1) * DAY)
  return {
    id: 'commits',
    // The card's head reads as the graph's caption, as GitHub's does.
    title: `${total.toLocaleString('en-US')} ${total === 1 ? 'commit' : 'commits'} in the last year`,
    source: `git log · ${repo}`,
    slots: {
      heat: slot('Graphic', { ...heat, alt: `${total} commits in ${HEAT_WEEKS} weeks` }),
      total: slot('Hero', { value: String(total), label: `commits · ${HEAT_WEEKS} weeks` }),
      stats: slot('Stats', { items: [
        { label: 'This week', value: String(weeks.at(-1) ?? 0) },
        { label: 'Streak', value: `${streak} d` },
        { label: 'Best day', value: String(Math.max(0, ...days)) }
      ] }),
      trend: slot('Spark', { points: weeks, summary: `${weeks.at(-1) ?? 0} this week, ${Math.round(total / Math.max(1, weeks.length))} a week on average` }),
      repo: slot('Text', { body: repo, tone: 'muted' })
    }
  }
}

const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/** The clock.focus document: `left`, `meter`, `state`, `ring`. */
export function focusDoc(startedAt: number, minutes: number, now: number): GlideDoc {
  const total = minutes * 60_000
  const done = Math.max(0, Math.min(1, (now - startedAt) / total))
  const left = total - (now - startedAt)
  const R = 18
  const C = 2 * Math.PI * R
  const ring = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" stroke="var(--muted)" stroke-opacity="0.25" stroke-width="4"/><circle cx="22" cy="22" r="${R}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * (1 - done)).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 22 22)"/></svg>`
  return {
    id: 'focus',
    title: 'Focus',
    status: left > 0 ? 'running' : 'done',
    slots: {
      left: slot('Hero', { value: left > 0 ? clock(left) : 'Done', label: `of ${minutes} min focus` }),
      meter: slot('Meter', { label: left > 0 ? `Focus · ${clock(left)} left` : 'Focus block done', value: 1 - done, total: `${minutes} min` }),
      state: slot('Badges', { items: [{ text: left > 0 ? 'In focus' : 'Break', tone: left > 0 ? 'accent' : 'success' }] }),
      ring: slot('Graphic', { svg: ring, w: 44, h: 44, alt: left > 0 ? `${clock(left)} left` : 'Focus block done' })
    }
  }
}
