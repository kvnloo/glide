// Pages: whole apps an agent writes (a game, a music player, a whiteboard) and opens with
// glide_page_open (kvnloo/glide#326). The pane opens each in its own Tern browser block, over the chat by
// default, and themes it: the --glide-* CSS variables and a `glide-theme` window event carry the palette the
// surface wears, again on every restyle, so "make it warmer" or a day/night switch reaches the page too.

import { existsSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { dashPalette } from '../../../glide/frontend/dash.js'

import type { Browser } from '../gev/globe.js'

import { pageOrigin, type PageOrigin } from '../../../glide/frontend/pageAssets.js'

export const PAGE_HOWS = ['over', 'beside', 'below'] as const
export type PageHow = (typeof PAGE_HOWS)[number]

export interface PageMount {
  readonly id: string
  readonly title: string
  /** The page's .html file (absolute). */
  readonly path: string
  readonly assets?: readonly string[] | undefined
  readonly how: PageHow
  /** When glide_page_open last asked for it (ms); a newer value opens it again. */
  readonly opened: number
}

/** What a page wears: the surface's colors. */
export interface PageTheme {
  readonly dark: boolean
  readonly bg: string
  readonly surface: string
  readonly fg: string
  readonly muted: string
  readonly accent: string
  readonly accentInk: string
}

export type PageVerdict = { readonly ok: true; readonly block: number } | { readonly ok: false; readonly problems: readonly string[] }

export const pageUrl = (path: string) => pathToFileURL(path).href

/** A page the plugin ships (glide/pages/<name>.html, the templates' panels): beside the bundle (frontend/dist) or the source. */
export function shippedPage(name: string, from: string = import.meta.url): string {
  const bundled = fileURLToPath(new URL(`../../glide/pages/${name}.html`, from))
  return existsSync(bundled) ? bundled : fileURLToPath(new URL(`../../../glide/pages/${name}.html`, from))
}

type Tokens = Readonly<Record<string, string>>
const hex = (v: string | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined)
const luma = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }

/** The colors a page wears: the wallpaper (or dash) palette when the surface wears one, else Tern's palette tokens. */
type WallColors = { dark: boolean; bg: string; fg: string; muted: string; accent: string; accentInk: string; layers: readonly string[] }
const fromWall = (p: WallColors): PageTheme => ({
  dark: p.dark, bg: p.bg, surface: p.layers[0] ?? p.bg, fg: p.fg,
  muted: p.muted, accent: p.accent, accentInk: p.accentInk
})
const FALLBACK = fromWall(dashPalette())

export function pageThemeOf(wal: WallColors | undefined,
  palette: { readonly dark?: Tokens | undefined; readonly light?: Tokens | undefined } | undefined): PageTheme {
  if (wal) return fromWall(wal)
  const t = palette?.dark ?? palette?.light
  const fg = hex(t?.['text'])
  const accent = hex(t?.['accent']) ?? FALLBACK.accent
  if (!fg) return { ...FALLBACK, accent, accentInk: luma(accent) > 0.55 ? '#111111' : '#ffffff' }
  const dark = luma(fg) > 0.5
  return { dark, bg: dark ? '#0e0c14' : '#f5f1ea', surface: dark ? '#17141f' : '#ece6dc', fg, muted: hex(t?.['muted']) ?? fg, accent, accentInk: luma(accent) > 0.55 ? '#111111' : '#ffffff' }
}

/**
 * The function a page block evaluates: sets the variables on <html> and tells the page's own code. The event's
 * detail carries the phase too (day on a light surface, night on a dark one), so a game can draw its sky.
 */
export function themeFunction(theme: PageTheme, url?: string): string {
  const t = { ...theme, phase: theme.dark ? 'night' : 'day' }
  const vars: Record<string, string> = {
    '--glide-bg': t.bg, '--glide-surface': t.surface, '--glide-fg': t.fg, '--glide-muted': t.muted,
    '--glide-accent': t.accent, '--glide-accent-ink': t.accentInk
  }
  return `function () {
  ${url ? `if (location.href.split('#')[0] !== ${JSON.stringify(url)}) return false` : ''}
  const t = ${JSON.stringify(t)}, v = ${JSON.stringify(vars)}, s = document.documentElement.style
  for (const k in v) s.setProperty(k, v[k])
  s.colorScheme = t.dark ? 'dark' : 'light'
  document.documentElement.dataset.glideTheme = t.dark ? 'dark' : 'light'
  document.documentElement.dataset.glidePhase = t.phase
  window.__glideTheme = t
  window.dispatchEvent(new CustomEvent('glide-theme', { detail: t }))
  return true
}`
}

interface OpenPage { block: number; url: string; origin?: PageOrigin | undefined }

/** Opens saved pages and keeps each page's local origin alive for its native block. */
export class GlidePages {
  readonly #browser: Browser
  readonly #owner: () => number | undefined
  readonly #focus: ((block: number) => Promise<void>) | undefined
  readonly #open = new Map<string, OpenPage>()
  readonly #handled = new Map<string, number>()
  #theme: PageTheme | undefined
  #queue = Promise.resolve<unknown>(undefined)
  #closed = false

  constructor(browser: Browser, owner: () => number | undefined, focus?: (block: number) => Promise<void>) {
    this.#browser = browser
    this.#owner = owner
    this.#focus = focus
  }

  #serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.#queue.then(run, run)
    this.#queue = next
    return next
  }

  sync(pages: readonly PageMount[]): Promise<Record<string, PageVerdict>> {
    return this.#serial(async () => {
      const out: Record<string, PageVerdict> = Object.create(null)
      for (const id of this.#handled.keys()) {
        if (pages.some(p => p.id === id)) continue
        this.#handled.delete(id)
        const old = this.#open.get(id)
        this.#open.delete(id)
        old?.origin?.close()
        if (old) await this.#closeBlock(old.block)
      }
      for (const p of pages) {
        if (this.#handled.get(p.id) === p.opened) continue
        this.#handled.set(p.id, p.opened)
        out[p.id] = await this.#openOne(p)
      }
      return out
    })
  }

  reopen(page: PageMount): Promise<PageVerdict> {
    return this.#serial(async () => {
      const old = this.#open.get(page.id)
      if (old && this.#focus) {
        try {
          await this.#focus(old.block)
          return { ok: true, block: old.block }
        } catch {
          old.origin?.close()
          this.#open.delete(page.id)
        }
      }
      return this.#openOne(page)
    })
  }

  async restyle(theme: PageTheme | undefined) {
    this.#theme = theme
    if (!theme) return
    await Promise.allSettled([...this.#open.values()].map(p => this.#apply(p)))
  }

  dispose() {
    this.#closed = true
    for (const page of this.#open.values()) page.origin?.close()
    this.#open.clear()
  }

  /** Closes a template's panel and releases its origin; none open is a no-op. */
  close(id: string): Promise<void> {
    return this.#serial(async () => {
      const known = this.#open.get(id)
      this.#handled.delete(id)
      this.#open.delete(id)
      known?.origin?.close()
      if (known) await this.#closeBlock(known.block)
    })
  }

  async #closeBlock(block: number) {
    try {
      await this.#browser({ op: 'close', block })
    } catch (error) {
      // The native block may already be closed. Never print its URL or browser reply.
      const reason = error instanceof Error ? 'browser rejected close' : 'unknown close failure'
      process.stderr.write(`Glide page ${block}: ${reason}\n`)
    }
  }

  async #openOne(p: PageMount): Promise<PageVerdict> {
    const owner = this.#owner()
    if (this.#closed || owner === undefined) return { ok: false, problems: ['not inside a Tern pane'] }
    const known = this.#open.get(p.id)
    let origin: PageOrigin | undefined
    try {
      origin = p.assets?.length ? await pageOrigin(p.path, p.assets) : undefined
      const url = origin?.url ?? pageUrl(p.path)
      let block = known
        ? await this.#browser({ op: 'goto', block: known.block, url }).then(() => known.block, () => undefined)
        : undefined
      if (block === undefined) {
        const opened = await this.#browser({ op: 'open', owner, url, how: p.how })
        block = typeof opened['block'] === 'number' ? opened['block'] : undefined
      }
      if (block === undefined) throw new Error('tern browser opened no block')
      if (this.#closed) throw new Error('Glide pane closed')
      const page = { block, url, origin }
      this.#open.set(p.id, page)
      known?.origin?.close()
      void this.#themeWhenReady(p.id, page)
      return { ok: true, block }
    } catch (error) {
      origin?.close()
      return { ok: false, problems: [error instanceof Error ? error.message : String(error)] }
    }
  }

  async #themeWhenReady(id: string, page: OpenPage) {
    let failure: unknown
    for (const ms of [0, 100, 300, 800, 1600]) {
      if (ms) await delay(ms, undefined, { ref: false })
      if (!this.#theme || this.#open.get(id) !== page) return
      try {
        if (await this.#apply(page)) return
      } catch (error) {
        failure = error
      }
    }
    if (failure !== undefined && this.#open.get(id) === page) {
      const reason = failure instanceof Error ? 'browser rejected theme evaluation' : 'unknown theme failure'
      process.stderr.write(`Glide page ${page.block}: ${reason}\n`)
    }
  }

  async #apply(p: OpenPage) {
    if (!this.#theme) return false
    const reply = await this.#browser({ op: 'eval', block: p.block, world: 'page', function: themeFunction(this.#theme, p.url) })
    return reply['value'] === true
  }
}
