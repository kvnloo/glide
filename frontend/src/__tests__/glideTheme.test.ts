import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Palette } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Theme } from '../chrome/theme.js'
import { glideTheme } from '../commands/glide.js'
import { contrastRatio } from '../hermes/theme.js'
import { parseJson, record } from '../wire/json.js'
import { PLAY_SECONDS, PLAY_SHEET } from '../../../glide/frontend/glass.js'
import { pickAccent, TEXT_FLOOR, WAL_SHEET, walCss, walPalette, type WalColors } from '../../../glide/frontend/wal.js'

// The auto theme (pywal): synthetic colors.json fixtures in a temp dir only, never the real ~/.cache/wal.
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

// ---- auto theme (/glide theme auto|default|export) ----
const colors = (bg: string, fg: string, c: Record<number, string>): WalColors => ({
  special: { background: bg, foreground: fg, cursor: fg },
  colors: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`color${i}`, c[i] ?? '#808080']))
})
// A: dark navy wallpaper, saturated orange in color3. B: light paper wallpaper, a pale low-contrast foreground.
// A's orange (#ff7a00) is the accent pick; the palette lifts it to #ff810d, 4.5:1 on the lightest layer too.
const A = colors('#0f1420', '#c8d0e0', { 1: '#a05050', 2: '#5a8a5a', 3: '#ff7a00', 4: '#5070a0', 5: '#806080', 6: '#508080', 7: '#9aa4b8', 8: '#4a5468' })
const B = colors('#f4efe6', '#d8d0c0', { 1: '#c03030', 2: '#40a040', 3: '#c8a040', 4: '#3060c0', 5: '#e020a0', 6: '#30a0a0', 7: '#e0d8c8', 8: '#eae4d8' })
// The film's wallpaper: its muted and dim greys sat under 4.5:1 on Tern's lifted pane layer.
const FILM = colors('#0d1a17', '#eef3ec', { 1: '#7db84a', 2: '#7db84a', 3: '#d9b98a', 4: '#d9c27e', 5: '#5cc3c9', 6: '#2f8f9a', 7: '#a8bbb2', 8: '#8a9c94' })

const dirs: string[] = []
const themes: Theme[] = []
afterEach(async () => {
  themes.splice(0).forEach(t => t.dispose())
  await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true })))
})

async function fixture(wal: WalColors) {
  const dir = await mkdtemp(join(tmpdir(), 'glide-wal-'))
  dirs.push(dir)
  const file = join(dir, 'colors.json')
  await writeFile(file, JSON.stringify(wal))
  return { dir, file }
}

function host(walFile: string) {
  const sent: Palette[] = []
  const sheets = new Map<string, string>()
  const saved: unknown[] = []
  return {
    palette: (p: Palette) => void sent.push(p),
    stylesheet: (name: string, css: string | null) => void (css === null ? sheets.delete(name) : sheets.set(name, css)),
    settings: { save: (patch: object) => (saved.push(patch), {}) },
    walFile, sent, sheets, saved
  }
}

describe('walPalette', () => {
  it('picks the most saturated of color1..6 as the accent', () => {
    expect(pickAccent(A)).toBe('#ff7a00')
    expect(pickAccent(B)).toBe('#e020a0')
  })

  it('lifts every text token to the 4.5:1 floor against the wallpaper background and its lifted layers', () => {
    for (const wal of [A, B, FILM]) {
      const p = walPalette(wal)
      for (const token of [p.fg, p.accent, p.muted, p.dim, p.error, p.success, p.warning]) {
        for (const under of [p.bg, ...p.layers]) expect(contrastRatio(token, under)).toBeGreaterThanOrEqual(TEXT_FLOOR)
      }
      // Button labels on the accent fill read too.
      expect(contrastRatio(p.accentInk, p.accent)).toBeGreaterThanOrEqual(TEXT_FLOOR)
    }
    // B's foreground fails as given, so it is darkened rather than kept.
    expect(contrastRatio(B.special.foreground, B.special.background)).toBeLessThan(TEXT_FLOOR)
    expect(walPalette(B).fg).not.toBe(B.special.foreground)
    expect(walPalette(A).dark).toBe(true)
    expect(walPalette(B).dark).toBe(false)
  })

  it('rebinds the surface and kit variables in its stylesheet', () => {
    const css = walCss(walPalette(A))
    expect(css).toContain('[data-surface]')
    // A program pane (hermes tern) has no [data-surface]: the bare region and each card rebind too.
    expect(css).toMatch(/^\.sf-region, \[data-surface\], \.sf, \[data-eui='card'\] \{[^}]*--t1: [^}]*--card: /)
    expect(css).toContain('--accent: #ff810d')
    expect(css).toContain('background: #0f1420')
    expect(css).toContain('--h-primary-ink: #000000')
  })
})

describe('Theme auto mode', () => {
  it('is opt-in: the default mode sends no wallpaper colors and no sheet', async () => {
    const { file } = await fixture(A)
    const h = host(file)
    const t = new Theme(h, 'tern')
    themes.push(t)
    t.apply()
    expect(h.sent.at(-1)).toMatchObject({ dark: {}, light: {} })
    expect(h.sheets.size).toBe(0)
  })

  it('toggles on and back off, removing its stylesheet', async () => {
    const { file } = await fixture(A)
    const h = host(file)
    const t = new Theme(h, 'tern')
    themes.push(t)
    t.set('auto')
    expect(h.sent.at(-1)?.dark).toMatchObject({ accent: '#ff810d' })
    expect(h.sheets.get(WAL_SHEET)).toContain('#ff810d')
    expect(t.wal?.bg).toBe('#0f1420')
    t.set('tern')
    expect(h.sheets.has(WAL_SHEET)).toBe(false)
    expect(h.sent.at(-1)).toMatchObject({ dark: {}, light: {} })
    expect(t.wal).toBeUndefined()
    expect(h.saved).toEqual([{ theme: 'auto' }, { theme: 'tern' }])
  })

  it('retints live when colors.json changes, without a restart', async () => {
    const { file } = await fixture(A)
    const h = host(file)
    const t = new Theme(h, 'auto')
    themes.push(t)
    t.apply()
    expect(h.sheets.get(WAL_SHEET)).toContain('#ff810d')
    await writeFile(file, JSON.stringify(B))
    await vi.waitFor(() => expect(h.sheets.get(WAL_SHEET)).toContain('background: #f4efe6'), { timeout: 3000 })
    expect(t.wal?.dark).toBe(false)
  })

  it('plays the glass playground for one cycle, then takes its sheet away; nothing outside the auto mode', async () => {
    const { file } = await fixture(A)
    const h = host(file)
    const t = new Theme(h, 'tern')
    themes.push(t)
    t.apply()
    expect(t.playGlass()).toBeNull()
    expect(h.sheets.has(PLAY_SHEET)).toBe(false)
    vi.useFakeTimers()
    try {
      t.set('auto')
      expect(t.playGlass()).toBe(PLAY_SECONDS)
      expect(h.sheets.get(PLAY_SHEET)).toContain('@keyframes glide-play')
      vi.advanceTimersByTime(PLAY_SECONDS * 1000)
      expect(h.sheets.has(PLAY_SHEET)).toBe(true)
      vi.advanceTimersByTime(1000)
      expect(h.sheets.has(PLAY_SHEET)).toBe(false)
      expect(h.sheets.has(WAL_SHEET)).toBe(true)
      // Leaving the wallpaper theme mid-cycle takes the playground with it.
      t.playGlass()
      t.set('tern')
      expect(h.sheets.size).toBe(0)
      // So does a teardown mid-cycle: no timer outlives the theme to strand the sheet.
      t.set('auto')
      t.playGlass()
      t.dispose()
      expect(h.sheets.has(PLAY_SHEET)).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back to the default palette while colors.json is missing', async () => {
    const { dir } = await fixture(A)
    const h = host(join(dir, 'absent.json'))
    const t = new Theme(h, 'auto')
    themes.push(t)
    t.apply()
    expect(h.sheets.size).toBe(0)
    expect(h.sent.at(-1)).toMatchObject({ dark: {}, light: {} })
  })
})

describe('/glide theme', () => {
  it('switches auto and default, and exports the resolved palette JSON', async () => {
    const { dir, file } = await fixture(A)
    const out = join(dir, 'export', 'theme.json')
    vi.stubEnv('GLIDE_WAL_COLORS', file)
    vi.stubEnv('GLIDE_THEME_EXPORT', out)
    const setTheme = vi.fn()
    const notice = vi.fn()
    const h = { setTheme, transcript: { notice } }
    glideTheme(h, 'auto')
    glideTheme(h, 'default')
    expect(setTheme.mock.calls).toEqual([['auto'], ['tern']])
    glideTheme(h, 'export')
    expect(record(parseJson(await readFile(out, 'utf8')))).toMatchObject({ accent: '#ff810d', bg: '#0f1420' })
    expect(String(notice.mock.calls.at(-1)?.[0])).toContain(out)
    glideTheme(h, 'nope')
    expect(notice.mock.calls.at(-1)?.[1]).toBe('warning')
  })
})
