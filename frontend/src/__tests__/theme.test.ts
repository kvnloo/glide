import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { SkinPayload } from '@hermes/shared/gateway-events'
import type { Palette } from '@stencil-hq/tern'
import { describe, expect, it } from 'vitest'

import { paletteFor } from '../chrome/palette.js'
import { Theme, ternWindowTheme } from '../chrome/theme.js'
import { contrastRatio } from '../hermes/theme.js'
import { loadSettings, saveSettings } from '../settings.js'
import { readJsonFile } from '../wire/files.js'
import { record } from '../wire/json.js'
import { STYLES } from '../view/styles.js'
import { DASH, dashTernPalette } from '../../../glide/frontend/dash.js'

import { stub } from './fakes.js'

describe('paletteFor', () => {
  it("sends nothing in Tern mode, so Tern's theme colors the surface", () => {
    expect(paletteFor('tern', stub({ name: 'default' }))).toMatchObject({ dark: {}, light: {} })
  })

  it('keeps a skin to its semantic colors: no muted, dim or path text', () => {
    const { dark } = paletteFor('skin', stub({ colors: { accent: '#3366ff' }, name: 'ocean' }))

    expect(Object.keys(dark ?? {}).sort()).toEqual(
      expect.arrayContaining(['accent', 'error', 'success', 'warning'])
    )
    expect(dark).not.toHaveProperty('muted')
    expect(dark).not.toHaveProperty('dim')
    expect(dark).not.toHaveProperty('statusLinePath')
  })
})

describe('Theme', () => {
  const skin: SkinPayload = { colors: { accent: '#3366ff' }, name: 'ocean' }

  /** A host that keeps each palette sent and each settings write. */
  function host() {
    const sent: Palette[] = []
    const saved: unknown[] = []

    return {
      palette: (p: Palette) => void sent.push(p),
      saved,
      sent,
      settings: { save: (patch: object) => (saved.push(patch), {}) }
    }
  }

  it('sends the palette of its mode and the skin, which only the skin mode wears', () => {
    const h = host()
    const theme = new Theme(h, 'tern')

    theme.apply()
    theme.skin(stub({ name: 'ocean' }))
    expect(h.sent).toEqual([paletteFor('tern', undefined), paletteFor('tern', skin)])

    theme.set('skin')
    expect(theme.mode).toBe('skin')
    expect(h.sent.at(-1)).toEqual(paletteFor('skin', skin))
    expect(h.sent.at(-1)?.name).toEqual({ dark: 'ocean', light: 'ocean' })
    expect(h.saved).toEqual([{ theme: 'skin' }])
  })

  it('keeps the last skin when the gateway reports none', () => {
    const h = host()
    const theme = new Theme(h, 'skin')

    theme.skin(skin)
    theme.skin(null)
    theme.skin(undefined)
    expect(h.sent).toHaveLength(1)

    theme.set('nous')
    expect(h.sent.at(-1)).toEqual(paletteFor('nous', skin))
    theme.set('skin')
    expect(h.sent.at(-1)).toEqual(paletteFor('skin', skin))
  })
})

describe('STYLES', () => {
  // The vars Tern derives from the user's omp theme (and its fonts): a color named any other way
  // stays put when the theme changes.
  const TERN = /^(t[1-4]|l[1-4]|accent|accent-ink|accent-fill|ok|warn|bad|ink[2-4]?|card|raise|panel|page|code-bg|chip-bg|well|well-line|pop-bg|sf-card-bg|sf-shade|sf-c-[a-z]+|sf-p-[a-zA-Z]+|sans|mono)$/

  it("paints only with Tern's theme vars, so a theme change repaints the plugin too", () => {
    expect(STYLES).not.toMatch(/#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(|(?<![\w-])(white|black)(?![\w-])/i)

    for (const [, name] of STYLES.matchAll(/var\(--([\w-]+)/g)) {
      expect(name).toMatch(TERN)
    }
  })
})

describe('settings', () => {
  it('reads defaults from a missing file and keeps what it saved', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'glide-settings-')), 'x', 'settings.json')

    expect(loadSettings(file)).toEqual({})
    saveSettings({ theme: 'nous' }, file)
    expect(loadSettings(file)).toEqual({ theme: 'nous' })
  })
})

describe('dash theme mode', () => {
  function host() {
    const sent: Palette[] = []
    const sheets: [string, string | null][] = []
    return {
      sent, sheets,
      palette: (p: Palette) => sent.push(p),
      stylesheet: (name: string, css: string | null) => sheets.push([name, css]),
      settings: { save: () => ({}) },
      walFile: '/nonexistent/colors.json'
    }
  }

  it("wears Dash's night and one gold, and takes its stylesheet away on leaving", () => {
    const h = host()
    const theme = new Theme(h, 'dash')

    theme.apply()
    expect(h.sent.at(-1)?.name).toEqual({ dark: 'dash', light: 'dash' })
    expect(h.sent.at(-1)?.dark).toMatchObject({ accent: '#d7b986', text: '#ECE8DF', statusLineModel: '#d7b986' })
    expect(h.sheets.at(-1)?.[1]).toMatch(/background: ?#0c0c0a/)
    expect(theme.wal?.accent).toBe('#d7b986')

    theme.set('tern')
    expect(h.sheets.at(-1)).toEqual([expect.any(String), null])
    expect(h.sent.at(-1)?.dark).toEqual({})
  })

  it("puts the window's stage in the Tern theme it names once, and gives the window's own back on leaving", () => {
    const worn: (string | null)[] = []
    const h = { ...host(), windowTheme: (name: string | null) => void worn.push(name) }
    const theme = new Theme(h, 'dash')

    theme.apply()
    theme.skin(stub({ name: 'ocean' }))
    expect(worn).toEqual([h.sent.at(-1)?.name?.dark])
    theme.set('auto')
    theme.set('tern')
    expect(worn).toEqual(['dash', null])
  })

  it('wears the window theme again when dash is asked for while already in it', () => {
    const worn: (string | null)[] = []
    const theme = new Theme({ ...host(), windowTheme: (name: string | null) => void worn.push(name) }, 'tern')

    theme.set('dash')
    theme.set('dash')
    expect(worn).toEqual(['dash', 'dash'])
  })

  it("names a theme whose stage (--tv-bg: its background) and every layer are Dash's hueless night", () => {
    // Tern paints .tn-body (var(--panel)) and .tn-veil (var(--tv-bg)) from its omp theme's background.
    const shipped = record(readJsonFile(fileURLToPath(new URL('../../../glide/themes/dash.json', import.meta.url))))
    const vars = record(shipped?.['vars']) ?? {}
    const hex = (key: string) => String(vars[key])
    expect(shipped?.['name']).toBe(dashTernPalette().name.dark)
    expect(hex('background')).toBe(DASH.bg)
    for (const layer of ['background', 'card', 'popover', 'muted', 'secondary', 'accent', 'border', 'userBubble']) {
      const [r = 0, , b = 255] = [1, 3, 5].map(i => parseInt(hex(layer).slice(i, i + 2), 16))
      expect(b, layer).toBeLessThanOrEqual(r)
    }
    expect(contrastRatio(hex('foreground'), hex('background'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('ternWindowTheme', () => {
  function ctl(state = { theme_dark: 'pywal', theme_light: 'light' }, ok = true) {
    const calls: string[] = []
    const run = async (args: readonly string[]) => {
      calls.push(args.join(' '))
      return JSON.stringify(args[0] === 'state' ? { ok: true, ...state } : { ok })
    }
    return { calls, run }
  }
  const pane = { TERN_PANE: '7' }
  const settle = () => new Promise(resolve => setTimeout(resolve, 0))

  function ending() {
    const synced: string[] = []
    const ends: (() => void)[] = []
    return { synced, ends, sync: (args: readonly string[]) => void synced.push(args.join(' ')), atEnd: (end: () => void) => void ends.push(end) }
  }

  it('is nothing outside a Tern pane', () => {
    const e = ending()
    expect(ternWindowTheme({}, ctl().run, e.sync, e.atEnd)).toBeUndefined()
    expect(e.ends).toEqual([])
    expect(e.synced).toEqual([])
  })

  it('wears the theme again on a window something reset, keeping the first one it gave up', async () => {
    const c = ctl()
    const wear = ternWindowTheme(pane, c.run, ending().sync, ending().atEnd)
    wear?.('dash')
    await settle()
    wear?.('dash')
    wear?.(null)
    await settle()
    expect(c.calls).toEqual([
      'state', 'theme dark dash', 'theme light dash',
      'state', 'theme dark dash', 'theme light dash',
      'theme dark pywal', 'theme light light'
    ])
  })

  it("gives the window's own theme back once as the process ends in dash", async () => {
    const c = ctl(), e = ending()
    const wear = ternWindowTheme(pane, c.run, e.sync, e.atEnd)
    wear?.('dash')
    wear?.('dash')
    await settle()
    expect(e.ends).toHaveLength(1)
    e.ends[0]?.()
    e.ends[0]?.()
    expect(e.synced).toEqual(['theme dark pywal', 'theme light light'])
  })

  it('has nothing to give back at the end once the window left dash', async () => {
    const c = ctl(), e = ending()
    const wear = ternWindowTheme(pane, c.run, e.sync, e.atEnd)
    wear?.('dash')
    wear?.(null)
    await settle()
    e.ends[0]?.()
    expect(e.synced).toEqual([])
  })

  it("wears the theme for both appearances, then the window's own again", async () => {
    const c = ctl()
    const wear = ternWindowTheme(pane, c.run, ending().sync, ending().atEnd)
    wear?.('dash')
    wear?.(null)
    await settle()
    expect(c.calls).toEqual(['state', 'theme dark dash', 'theme light dash', 'theme dark pywal', 'theme light light'])
  })

  it('gives nothing back for a window already in it, and swallows a theme Tern lacks', async () => {
    const c = ctl({ theme_dark: 'dash', theme_light: 'dash' }, false)
    const wear = ternWindowTheme(pane, c.run, ending().sync, ending().atEnd)
    wear?.('dash')
    wear?.(null)
    await settle()
    expect(c.calls).toEqual(['state', 'theme dark dash'])
  })
})
