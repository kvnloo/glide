// Whole-app templates (GL-065, kvnloo/glide issue 346): one command-palette row ("Use Mono template", "Use Studio
// template") restyles the whole pane at once. A template is three things the pane already has a seam for:
//
// - a theme mode (theme.ts): Mono's greyscale or Studio's warm charcoal and gold, a palette plus the walCss sheet;
// - a transcript style: a surface stylesheet over the roles transcript.tsx draws (omp.user, omp.assistant), the
//   terminal one in mono type with a prompt mark, the bubble one as a messaging thread;
// - panels: Glide pages (pages.ts) docked beside the chat, Analytics or Whiteboard, written into settings.json's
//   `ui.pages` like an agent's glide_page_open so the Pages list, the theme and a relaunch all treat them alike.
//
// Default puts each back: Tern's theme, the standard transcript, no template panels. Everything here but the
// applier is pure.

import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { Entry } from '../../frontend/src/model.js'
import { shippedPage, type PageHow } from '../../frontend/src/glideui/pages.js'
import { mix, readableOn } from '../../frontend/src/hermes/theme.js'
import type { SettingsSource, ThemeMode } from '../../frontend/src/settings.js'
import { readStoredSettings } from '../../frontend/src/wire/files.js'
import { minifyCss } from './css.js'
import { tintFloor, wallSamples } from './glass.js'
import { MONO, MONO_INK, NIGHT_INKS, RADIUS, STUDIO, TYPE } from './tokens.js'
import { walPalette, walTernPalette, type TernPalette, type WalColors, type WalPalette } from './wal.js'

export const TEMPLATE_IDS = ['default', 'mono', 'studio'] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]
export const TRANSCRIPT_STYLES = ['standard', 'terminal', 'bubble'] as const
export type TranscriptStyle = (typeof TRANSCRIPT_STYLES)[number]
export const TEMPLATE_PANELS = ['analytics', 'whiteboard'] as const
export type TemplatePanel = (typeof TEMPLATE_PANELS)[number]

export interface Template {
  readonly id: TemplateId
  readonly label: string
  readonly detail: string
  readonly theme: ThemeMode
  readonly transcript: TranscriptStyle
  readonly panels: readonly { readonly page: TemplatePanel; readonly how: PageHow }[]
}

export const TEMPLATES: Readonly<Record<TemplateId, Template>> = {
  default: { id: 'default', label: 'Default', detail: "Tern's own theme, the standard transcript, no template panels", theme: 'tern', transcript: 'standard', panels: [] },
  mono: { id: 'mono', label: 'Mono', detail: 'Greyscale, a terminal transcript in mono type, Analytics docked beside', theme: 'mono', transcript: 'terminal', panels: [{ page: 'analytics', how: 'beside' }] },
  studio: { id: 'studio', label: 'Studio', detail: 'Warm charcoal and gold, a bubble transcript, the Whiteboard docked beside', theme: 'studio', transcript: 'bubble', panels: [{ page: 'whiteboard', how: 'beside' }] }
}

export const PANEL_TITLES: Readonly<Record<TemplatePanel, string>> = { analytics: 'Analytics', whiteboard: 'Whiteboard' }

export const isTemplateId = (v: string): v is TemplateId => (TEMPLATE_IDS as readonly string[]).includes(v)
export const isTemplatePanel = (v: string): v is TemplatePanel => (TEMPLATE_PANELS as readonly string[]).includes(v)

/** The page id a panel is listed under in `ui.pages`; only ids with this prefix are a template's to close. */
export const panelPageId = (panel: TemplatePanel) => `template-${panel}`
const TEMPLATE_PAGE = /^template-/

// ── Palettes ──────────────────────────────────────────────────────────────────────────────────

type Inks = typeof MONO_INK | typeof STUDIO

/** A template's inks in the wallpaper palette's shape, as dash.ts builds Dash's: one accent, the glass floor over the wallpaper when it reads. */
function inkPalette(t: Inks, source: string, wall?: WalColors): WalPalette {
  const p = walPalette({
    special: { background: t.bg, foreground: t.fg },
    colors: { color1: t.error, color2: t.success, color3: t.accent, color7: t.muted, color8: t.dim }
  }, source)
  const samples = [...new Set([...p.samples, ...(wall ? wallSamples(wall) : [])])]
  const inks = [p.fg, t.accent, p.muted, p.dim, p.error, p.success, p.warning, ...NIGHT_INKS]
  return { ...p, accent: t.accent, glow: t.accent, accentInk: readableOn(t.accent), selectedBg: mix(t.bg, t.accent, 0.18), samples, floor: tintFloor(inks, t.bg, samples) }
}

export const monoPalette = (wall?: WalColors) => inkPalette(MONO_INK, 'mono', wall)
export const studioPalette = (wall?: WalColors) => inkPalette(STUDIO, 'studio', wall)

/** Tern's palette for a template mode; named so `/theme` and the window can tell it apart. */
export function templateTernPalette(p: WalPalette): TernPalette {
  return { ...walTernPalette(p), name: { dark: `glide-${p.source}`, light: `glide-${p.source}` } }
}

// ── Transcript styles ─────────────────────────────────────────────────────────────────────────

/** The surface stylesheet a transcript style installs (and removes when another is picked). */
export const TRANSCRIPT_SHEET = 'glide-transcript-style'

// Tern draws a card's children inside .sf-card-body and an md node's paragraphs inside .sf-md (view/styles.ts).
const USER = ".sf-card[data-role='omp.user']"
const REPLY = ".sf-col[data-role='omp.assistant']"
const PROSE = ':is(.sf-md, .sf-text, .sf-md *)'

/** The sheet for `style`; null for the standard transcript (Tern's chat style alone). */
export function transcriptCss(style: TranscriptStyle): string | null {
  if (style === 'terminal') {
    return minifyCss(`
      ${USER}, ${REPLY} { font-family: ${MONO}; }
      ${USER} ${PROSE}, ${REPLY} ${PROSE} { font-family: ${MONO}; font-size: ${TYPE.body}px; }
      ${USER} { background: transparent !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; padding: 2px 0 2px 12px !important; border-left: 2px solid var(--accent) !important; }
      ${USER} .sf-md > :first-child::before { content: '❯ '; color: var(--accent); }
      ${REPLY} .sf-card { border-radius: ${RADIUS.chip}px !important; box-shadow: none !important; }
      [data-role='omp.turn.usage'] ${PROSE} { font-family: ${MONO}; }
    `)
  }
  if (style === 'bubble') {
    return minifyCss(`
      ${USER} { margin-left: auto !important; width: fit-content !important; max-width: 72% !important; background: var(--accent) !important; border: none !important; box-shadow: none !important; border-radius: ${RADIUS.card}px ${RADIUS.card}px ${RADIUS.chip}px ${RADIUS.card}px !important; padding: 8px 14px !important; }
      ${USER} ${PROSE} { color: var(--accent-ink, #000) !important; }
      ${USER} [data-role='omp.user.tools'], ${USER} [data-role='omp.user.tools'] * { color: var(--accent-ink, #000) !important; opacity: .75; }
      ${REPLY} { width: fit-content; max-width: 82%; margin-right: auto; background: var(--l1); border-radius: ${RADIUS.card}px ${RADIUS.card}px ${RADIUS.card}px ${RADIUS.chip}px; padding: 10px 14px; }
      ${REPLY} .sf-card { border-radius: ${RADIUS.block}px !important; }
    `)
  }
  return null
}

// ── Analytics data ────────────────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  readonly generatedAt: number
  readonly cwd: string
  readonly prompts: number
  readonly turns: number
  readonly failed: number
  readonly tokens: number
  /** Seconds the agent spent in finished turns. */
  readonly seconds: number
  readonly toolCalls: number
  /** One row per turn, oldest first. */
  readonly perTurn: readonly { readonly n: number; readonly tokens: number; readonly seconds: number; readonly tools: number }[]
  /** Calls per tool, most first; the ninth tool on folds into "Other". */
  readonly tools: readonly { readonly name: string; readonly count: number }[]
  /** Commits per day in `cwd`, the last 30 days, oldest first. */
  readonly commits: readonly { readonly day: string; readonly count: number }[]
}

const DAY = 86_400_000
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** The session's numbers, from the transcript as the pane holds it, and the folder's commit times (unix seconds). */
export function analyticsData(entries: readonly Entry[], now: number, cwd = '', commitTimes: readonly number[] = []): AnalyticsData {
  const perTurn: { n: number; tokens: number; seconds: number; tools: number }[] = []
  const byTool = new Map<string, number>()
  let prompts = 0, failed = 0
  for (const e of entries) {
    if (e.kind === 'user') prompts += 1
    if (e.kind !== 'turn') continue
    if (e.end.status === 'error') failed += 1
    let tools = 0
    for (const b of e.blocks) {
      if (b.kind !== 'tool') continue
      tools += 1
      byTool.set(b.call.name, (byTool.get(b.call.name) ?? 0) + 1)
    }
    const ended = e.end.status === 'live' ? undefined : e.end.endedAt
    const seconds = ended && ended > e.startedAt ? Math.round((ended - e.startedAt) / 1000) : 0
    const tokens = e.usage?.total ?? e.tickTokens ?? 0
    perTurn.push({ n: perTurn.length + 1, tokens, seconds, tools })
  }
  const ranked = [...byTool].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const tools = ranked.length > 8 ? [...ranked.slice(0, 7), { name: 'Other', count: ranked.slice(7).reduce((s, t) => s + t.count, 0) }] : ranked
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 30 }, (_, i) => dayKey(today.getTime() - (29 - i) * DAY))
  const perDay = new Map(days.map(d => [d, 0]))
  for (const t of commitTimes) {
    const k = dayKey(t * 1000)
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }
  return {
    generatedAt: now, cwd, prompts, turns: perTurn.length, failed,
    tokens: perTurn.reduce((s, t) => s + t.tokens, 0),
    seconds: perTurn.reduce((s, t) => s + t.seconds, 0),
    toolCalls: perTurn.reduce((s, t) => s + t.tools, 0),
    perTurn, tools, commits: days.map(day => ({ day, count: perDay.get(day) ?? 0 }))
  }
}

// ── Pages on disk ─────────────────────────────────────────────────────────────────────────────

const DATA = /(<script type="application\/json" id="glide-data">)[\s\S]*?(<\/script>)/

/** The shipped page with `data` in its glide-data script; `<` escaped so no value can close the script. */
export function pageWithData(html: string, data: unknown): string {
  const json = JSON.stringify(data ?? {}).replace(/</g, '\\u003c')
  return html.replace(DATA, (_m, open: string, close: string) => `${open}${json}${close}`)
}

/** Writes `file` whole or not at all. */
function writeAtomic(file: string, text: string) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, file)
}

interface StoredPage { id: string; title: string; path: string; how: PageHow; opened: number }

/**
 * settings.json's `ui.pages` with every template page dropped and `add` appended, rev bumped, every other
 * key kept (the agent's widgets, style and pages; ui.py's writes keep `pages` the same way).
 */
export function writeTemplatePages(file: string, add: readonly StoredPage[]) {
  const stored = readStoredSettings(file) as Record<string, unknown>
  const ui = typeof stored['ui'] === 'object' && stored['ui'] !== null ? stored['ui'] as Record<string, unknown> : {}
  const pages = (Array.isArray(ui['pages']) ? ui['pages'] : []).filter(p => !(typeof p === 'object' && p !== null && TEMPLATE_PAGE.test(String((p as { id?: unknown }).id))))
  const rev = (typeof ui['rev'] === 'number' ? ui['rev'] : 0) + 1
  writeAtomic(file, `${JSON.stringify({ ...stored, ui: { ...ui, pages: [...pages, ...add], rev } }, null, 2)}\n`)
}

/** The template panels settings.json lists now, each where it is docked. */
export function templatePanels(file: string): { page: TemplatePanel; how: PageHow }[] {
  const ui = (readStoredSettings(file) as { ui?: { pages?: unknown } }).ui
  return (Array.isArray(ui?.pages) ? ui.pages : []).flatMap(p => {
    const { id, how } = (typeof p === 'object' && p !== null ? p : {}) as { id?: unknown; how?: unknown }
    const page = String(id).replace(TEMPLATE_PAGE, '')
    return TEMPLATE_PAGE.test(String(id)) && isTemplatePanel(page) ? [{ page, how: how === 'over' || how === 'below' ? how : 'beside' as PageHow }] : []
  })
}

// ── The applier ───────────────────────────────────────────────────────────────────────────────

export interface TemplateHost {
  /** settings.json: the template, the transcript style, and `ui.pages`. */
  readonly file: string
  readonly settings: SettingsSource
  /** Switches the theme mode now and keeps it (theme.ts Theme.set). */
  setTheme(mode: ThemeMode): void
  /** Closes the open page `id` (pages.ts GlidePages.close). */
  closePage?(id: string): Promise<void>
  /** Reads settings.json's `ui` again now, which opens the pages it lists (widgets.ts reload). */
  reload(): Promise<void> | void
  /** Something to draw changed (the transcript sheet goes out with the next frame). */
  changed(): void
  entries(): readonly Entry[]
  cwd(): string | undefined
  /** Commit times (unix seconds) in `cwd`; default `git log`. */
  commits?(cwd: string): Promise<number[]>
  now?(): number
  /** Where a panel's page is read from; default pages.ts shippedPage. */
  shipped?(panel: TemplatePanel): string
}

const gitCommits = (cwd: string) => new Promise<number[]>(resolve => {
  execFile('git', ['-C', cwd, 'log', '--all', '--since=31 days ago', '--format=%ct'], { timeout: 5000, maxBuffer: 4 << 20 }, (error, stdout) => {
    resolve(error ? [] : stdout.split('\n').filter(Boolean).map(Number).filter(Number.isFinite))
  })
})

/** Applies templates and panels; the transcript style it keeps is drawn by the frame (frame.ts). */
export class Templates {
  readonly #host: TemplateHost

  constructor(host: TemplateHost) {
    this.#host = host
  }

  /** The template settings.json keeps; default when none. */
  get current(): TemplateId {
    return this.#host.settings.load().template ?? 'default'
  }

  /** The transcript style settings.json keeps. */
  get transcript(): TranscriptStyle {
    return this.#host.settings.load().transcript ?? 'standard'
  }

  /** The sheet the frame keeps on the surface; null for the standard transcript. */
  css(): string | null {
    return transcriptCss(this.transcript)
  }

  /** Applies template `id` live: theme, transcript style, panels. The line the transcript shows. */
  async use(id: TemplateId): Promise<string> {
    const t = TEMPLATES[id]
    this.#host.settings.save({ template: id, transcript: t.transcript })
    this.#host.setTheme(t.theme)
    await this.#pages(t.panels)
    this.#host.changed()
    const panels = t.panels.map(p => PANEL_TITLES[p.page])
    return `${t.label} template: ${t.theme === 'tern' ? "Tern's theme" : `the ${t.label} theme`}, the ${t.transcript} transcript${panels.length ? `, ${panels.join(' and ')} beside the chat` : ', no template panels'}.`
  }

  /** Opens one panel beside the chat, keeping the template's others. */
  async panel(panel: TemplatePanel, how: PageHow = 'beside'): Promise<string> {
    const keep = templatePanels(this.#host.file).filter(p => p.page !== panel)
    await this.#pages([...keep, { page: panel, how }])
    return `${PANEL_TITLES[panel]} opened ${how} the chat.`
  }

  /** Writes each panel's page (Analytics with this session's numbers) and lists exactly these; closes the rest. */
  async #pages(panels: readonly { page: TemplatePanel; how: PageHow }[]): Promise<void> {
    const now = this.#host.now?.() ?? Date.now()
    const wanted = new Set(panels.map(p => p.page))
    for (const p of templatePanels(this.#host.file)) if (!wanted.has(p.page)) await this.#host.closePage?.(panelPageId(p.page)).catch(() => undefined)
    const dir = join(dirname(this.#host.file), 'pages')
    const add: StoredPage[] = []
    for (const p of panels) {
      const html = readFileSync((this.#host.shipped ?? shippedPage)(p.page), 'utf8')
      const path = join(dir, `${p.page}.html`)
      writeAtomic(path, pageWithData(html, p.page === 'analytics' ? await this.#analytics(now) : {}))
      add.push({ id: panelPageId(p.page), title: PANEL_TITLES[p.page], path, how: p.how, opened: now })
    }
    writeTemplatePages(this.#host.file, add)
    await this.#host.reload()
  }

  async #analytics(now: number): Promise<AnalyticsData> {
    const cwd = this.#host.cwd() ?? ''
    const commits = cwd ? await (this.#host.commits ?? gitCommits)(cwd).catch(() => []) : []
    return analyticsData(this.#host.entries(), now, cwd, commits)
  }
}
