// A deep-research case: an event GEV reconstructs while an agent keeps pulling sources. Every part carries
// `t`, the minutes since the research began, so `at(case, t)` is the run as it stood at that moment.

export type Platform = 'x' | 'reddit' | 'youtube' | 'tiktok' | 'news' | 'official' | 'data' | 'imagery'
export type Tier = 'seen' | 'reported' | 'derived' | 'inferred'

export const PLATFORMS: readonly Platform[] = ['x', 'reddit', 'youtube', 'tiktok', 'news', 'official', 'data', 'imagery']
export const PLATFORM_LABEL: Readonly<Record<Platform, string>> = {
  x: 'X', reddit: 'Reddit', youtube: 'YouTube', tiktok: 'TikTok', news: 'News', official: 'Official', data: 'Data', imagery: 'Imagery'
}

/** One pulled source worth a line in the feed. */
export interface Pull { readonly t: number; readonly platform: Platform; readonly label: string; readonly detail?: string; readonly media?: 'video' | 'photo' | 'audio' | 'data' | 'text' }
/** What the run knows, and how: seen in data, reported by someone, or derived by the run. */
export interface Finding { readonly t: number; readonly text: string; readonly tier: Tier }
/** A stage of the simulation GEV builds; done at `t`, active from `start`. */
export interface SimStage { readonly id: string; readonly label: string; readonly start: number; readonly t: number; readonly layer?: string }
/** Running source totals per platform at moment `t` (cumulative). */
export interface Tally { readonly t: number; readonly by: Readonly<Partial<Record<Platform, number>>> }

export interface ResearchCase {
  readonly id: string
  readonly title: string
  /** The question typed to the agent. */
  readonly ask: string
  readonly place: string
  readonly eventUtc: string
  /** kb: replayed from a real collector's knowledge base; authored: a written example modelled on public reports. */
  readonly basis: 'kb' | 'authored'
  /** The public video this case is modelled on. */
  readonly inspiredBy: { readonly title: string; readonly url: string }
  /** GEV view hash for the globe and the open button. */
  readonly view: string
  readonly span: number
  readonly tallies: readonly Tally[]
  readonly pulls: readonly Pull[]
  readonly findings: readonly Finding[]
  readonly sim: readonly SimStage[]
}

export interface ResearchState {
  readonly c: ResearchCase
  readonly t: number
  readonly total: number
  readonly by: Readonly<Record<Platform, number>>
  /** Cumulative totals sampled at even steps up to `t`, for the growth line. */
  readonly growth: readonly number[]
  readonly pulls: readonly Pull[]
  readonly findings: readonly Finding[]
  readonly sim: readonly (SimStage & { readonly status: 'pending' | 'active' | 'done' })[]
  readonly done: boolean
}

const zero = (): Record<Platform, number> => ({ x: 0, reddit: 0, youtube: 0, tiktok: 0, news: 0, official: 0, data: 0, imagery: 0 })

/** Totals at `t`: the last tally at or before it, never fewer than the feed lines already shown. */
function totals(c: ResearchCase, t: number): Record<Platform, number> {
  const by = zero()
  let last: Tally | undefined
  for (const s of c.tallies) if (s.t <= t) last = s
  for (const p of PLATFORMS) by[p] = last?.by[p] ?? 0
  const seen = zero()
  for (const p of c.pulls) if (p.t <= t) seen[p.platform]++
  for (const p of PLATFORMS) by[p] = Math.max(by[p], seen[p])
  return by
}

const sum = (by: Readonly<Record<Platform, number>>) => PLATFORMS.reduce((n, p) => n + by[p], 0)

/** The run at minute `t` (clamped to the case's span). */
export function at(c: ResearchCase, t: number): ResearchState {
  const now = Math.max(0, Math.min(c.span, t))
  const by = totals(c, now)
  const steps = 24
  const growth = Array.from({ length: steps }, (_, i) => sum(totals(c, (now * (i + 1)) / steps)))
  return {
    c, t: now, by, growth, total: sum(by),
    pulls: c.pulls.filter(p => p.t <= now).sort((a, b) => b.t - a.t),
    findings: c.findings.filter(f => f.t <= now),
    sim: c.sim.map(s => ({ ...s, status: s.t <= now ? 'done' : s.start <= now ? 'active' : 'pending' })),
    done: now >= c.span
  }
}

/** "4 min", "2 h 10 min", "3 d 4 h": research time at a glance. */
export function elapsed(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  if (m < 1440) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
  const h = Math.floor((m % 1440) / 60)
  return `${Math.floor(m / 1440)} d${h ? ` ${h} h` : ''}`
}
