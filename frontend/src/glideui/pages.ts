// Pages: whole apps an agent writes (a game, a music player, a whiteboard) as one HTML file and opens with
// glide_page_open (kvnloo/glide#326). The pane opens each in its own Tern browser block, over the chat by
// default, and themes it: the --glide-* CSS variables and a `glide-theme` window event carry the palette the
// surface wears, again on every restyle, so "make it warmer" or a day/night switch reaches the page too.

import { pathToFileURL } from 'node:url'

import type { Browser } from '../gev/globe.js'

export const PAGE_HOWS = ['over', 'beside', 'below'] as const
export type PageHow = (typeof PAGE_HOWS)[number]

export interface PageMount {
  readonly id: string
  readonly title: string
  /** The page's .html file (absolute). */
  readonly path: string
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

type Tokens = Readonly<Record<string, string>>
const hex = (v: string | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined)
const luma = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }

/** The colors a page wears: the wallpaper (or dash) palette when the surface wears one, else Tern's palette tokens. */
export function pageThemeOf(wal: { dark: boolean; bg: string; fg: string; muted: string; accent: string; accentInk: string; layers: readonly string[] } | undefined,
  palette: { readonly dark?: Tokens | undefined; readonly light?: Tokens | undefined } | undefined): PageTheme | undefined {
  if (wal) return { dark: wal.dark, bg: wal.bg, surface: wal.layers[0] ?? wal.bg, fg: wal.fg, muted: wal.muted, accent: wal.accent, accentInk: wal.accentInk }
  const t = palette?.dark ?? palette?.light
  const fg = hex(t?.['text'])
  const accent = hex(t?.['accent'])
  if (!t || !fg || !accent) return undefined
  const dark = luma(fg) > 0.5
  return { dark, bg: dark ? '#0e0c14' : '#f5f1ea', surface: dark ? '#17141f' : '#ece6dc', fg, muted: hex(t['muted']) ?? fg, accent, accentInk: luma(accent) > 0.55 ? '#111111' : '#ffffff' }
}

/** The function a page block evaluates: sets the variables on <html> and tells the page's own code. */
export function themeFunction(t: PageTheme): string {
  const vars: Record<string, string> = {
    '--glide-bg': t.bg, '--glide-surface': t.surface, '--glide-fg': t.fg, '--glide-muted': t.muted,
    '--glide-accent': t.accent, '--glide-accent-ink': t.accentInk
  }
  return `function () {
  const t = ${JSON.stringify(t)}, v = ${JSON.stringify(vars)}, s = document.documentElement.style
  for (const k in v) s.setProperty(k, v[k])
  s.colorScheme = t.dark ? 'dark' : 'light'
  document.documentElement.dataset.glideTheme = t.dark ? 'dark' : 'light'
  window.__glideTheme = t
  window.dispatchEvent(new CustomEvent('glide-theme', { detail: t }))
  return true
}`
}

/** Opens and themes the pages settings.json lists; remembers each one's block so a restyle reaches it. */
export class GlidePages {
  readonly #browser: Browser
  readonly #owner: () => number | undefined
  /** id → the `opened` stamp handled and the block it opened in. */
  readonly #open = new Map<string, { opened: number; block: number }>()
  #theme: PageTheme | undefined

  constructor(browser: Browser, owner: () => number | undefined) {
    this.#browser = browser
    this.#owner = owner
  }

  /** Opens every page asked for since it was last handled; the verdict per page handled now. */
  async sync(pages: readonly PageMount[]): Promise<Record<string, PageVerdict>> {
    const out: Record<string, PageVerdict> = {}
    for (const p of pages) {
      if (this.#open.get(p.id)?.opened === p.opened) continue
      out[p.id] = await this.#openOne(p)
    }
    for (const id of [...this.#open.keys()]) if (!pages.some(p => p.id === id)) this.#open.delete(id)
    return out
  }

  /** The surface's colors changed: every open page wears them. A page whose block is gone is forgotten. */
  async restyle(theme: PageTheme | undefined) {
    this.#theme = theme
    if (!theme) return
    for (const [id, o] of this.#open) {
      await this.#apply(o.block).catch(() => this.#open.delete(id))
    }
  }

  async #openOne(p: PageMount): Promise<PageVerdict> {
    const owner = this.#owner()
    if (owner === undefined) return { ok: false, problems: ['not inside a Tern pane'] }
    const known = this.#open.get(p.id)
    try {
      let block: number | undefined
      if (known) {
        // The same id again: reload it where it is, unless its block has gone.
        block = await this.#browser({ op: 'goto', block: known.block, url: pageUrl(p.path) }).then(() => known.block, () => undefined)
      }
      if (block === undefined) {
        const opened = await this.#browser({ op: 'open', owner, url: pageUrl(p.path), how: p.how })
        if (typeof opened['block'] !== 'number') return { ok: false, problems: ['tern browser opened no block'] }
        block = opened['block']
      }
      this.#open.set(p.id, { opened: p.opened, block })
      await this.#apply(block).catch(() => undefined)
      // Again once the document has surely loaded: the first may land on the page it replaced.
      setTimeout(() => void this.#apply(block).catch(() => undefined), 800).unref?.()
      return { ok: true, block }
    } catch (error) {
      return { ok: false, problems: [error instanceof Error ? error.message : String(error)] }
    }
  }

  async #apply(block: number) {
    if (this.#theme) await this.#browser({ op: 'eval', block, world: 'page', function: themeFunction(this.#theme) })
  }
}
