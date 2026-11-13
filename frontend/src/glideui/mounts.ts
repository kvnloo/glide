// Widgets an agent mounts around the composer (glide_ui_mount, kvnloo/glide#326). A mount is a glide/v1
// program, a dock slot and a host data source: the program only picks and orders the source's slots, and
// the host re-binds it whenever the source refreshes (a commit lands, the focus clock ticks), so a mounted
// widget updates itself without the model writing it again. The documents here are pure; widgets.ts reads.

import { slot, type GlideDoc } from './library.js'

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
  readonly style?: { readonly warmth?: number | undefined; readonly accent?: string | undefined } | undefined
}

const DAY = 86_400_000
export const HEAT_WEEKS = 52
const CELL = 11
const GAP = 3

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

/** The heatmap: a week per column, Sunday on top; the accent's opacity steps with the day's commits. */
export function heatSvg(days: readonly number[]): { svg: string; w: number; h: number } {
  const peak = Math.max(1, ...days)
  const cols = Math.ceil(days.length / 7)
  const w = cols * (CELL + GAP) - GAP
  const h = 7 * (CELL + GAP) - GAP
  const cells = days.map((n, i) => {
    const x = Math.floor(i / 7) * (CELL + GAP)
    const y = (i % 7) * (CELL + GAP)
    const level = n === 0 ? 0 : Math.min(4, Math.ceil((n / peak) * 4))
    const paint = level === 0 ? 'fill="var(--muted)" fill-opacity="0.18"' : `fill="var(--accent)" fill-opacity="${[0, 0.4, 0.6, 0.8, 1][level]}"`
    return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ${paint}/>`
  })
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${cells.join('')}</svg>`, w, h }
}

/** The git.commits document: `heat`, `total`, `stats`, `trend` and `repo`. */
export function commitsDoc(times: readonly number[], now: number, repo: string): GlideDoc {
  const days = commitDays(times, now)
  const total = days.reduce((a, b) => a + b, 0)
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7).reduce((a, b) => a + b, 0))
  let streak = 0
  for (let i = days.length - 1; i >= 0 && (days[i] ?? 0) > 0; i--) streak++
  const heat = heatSvg(days)
  return {
    id: 'commits',
    title: 'Commits',
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
    slots: {
      left: slot('Hero', { value: left > 0 ? clock(left) : 'Done', label: `of ${minutes} min focus` }),
      meter: slot('Meter', { label: left > 0 ? `Focus · ${clock(left)} left` : 'Focus block done', value: 1 - done, total: `${minutes} min` }),
      state: slot('Badges', { items: [{ text: left > 0 ? 'In focus' : 'Break', tone: left > 0 ? 'accent' : 'success' }] }),
      ring: slot('Graphic', { svg: ring, w: 44, h: 44, alt: left > 0 ? `${clock(left)} left` : 'Focus block done' })
    }
  }
}
