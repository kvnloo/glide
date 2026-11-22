// Whose colors the surface wears (`/theme`): the mode settings.json keeps, and the skin the gateway
// last reported, which only the `skin` mode wears. palette.ts maps the pair to Tern's palette; the
// `auto` mode (wal.ts) wears the wallpaper's pywal colors and follows the file live.

import { execFile, spawnSync } from 'node:child_process'

import type { SkinPayload } from '@hermes/shared/gateway-events'
import type { Palette } from '@stencil-hq/tern'

import type { SettingsSource, ThemeMode } from '../settings.js'
import { record } from '../wire/json.js'

import { paletteFor } from './palette.js'
import { glassPlayCss, PLAY_SECONDS, PLAY_SHEET } from '../../../glide/frontend/glass.js'
import { dashPalette, dashTernPalette } from '../../../glide/frontend/dash.js'
import { readWal, WAL_SHEET, walCss, walFile, walPalette, walTernPalette, watchWal, type WalPalette } from '../../../glide/frontend/wal.js'
import { styleAccent, styleWal, type UiStyle } from '../../../glide/frontend/style.js'
import { isGlideTheme, themePalette, themeTernPalette } from '../../../glide/frontend/themes.js'

import { monoPalette, studioPalette, templateTernPalette } from '../../../glide/frontend/templates.js'

/** The wallpaper-derived palettes; Dash also sets a Tern window theme. */
type OwnMode = 'dash' | 'mono' | 'studio'
const ownMode = (mode: ThemeMode): mode is OwnMode => mode === 'dash' || mode === 'mono' || mode === 'studio'

/** What the theme reaches of the app. */
export interface ThemeHost {
  /** Sends the palette to the surface (the `t` verb). */
  palette(palette: Palette): void
  /** Installs (or with null removes) a surface stylesheet: the auto mode's variables. */
  stylesheet?(name: string, css: string | null): void
  /** Where the mode is kept for the next launch. */
  readonly settings: Pick<SettingsSource, 'save'>
  /** pywal's colors.json for the auto mode (default: wal.ts walFile()). */
  readonly walFile?: string | undefined
  /** Puts the window showing the pane in Tern's own theme `name`, or (null) back in the one it wore before (ternWindowTheme). */
  windowTheme?(name: string | null): void
  /** The agent's restyle (glide_ui_style), laid over the wallpaper and dash palettes; read at each apply. */
  style?(): UiStyle | undefined
}

/** What `tern ctl` answers (`run` takes its arguments). */
export type TernCtl = (args: readonly string[]) => Promise<string>

const ternCtl: TernCtl = args => new Promise((resolve, reject) => {
  execFile('tern', ['ctl', ...args], { timeout: 5000 }, (error, stdout) => (error ? reject(error) : resolve(stdout)))
})

/** `tern ctl` run to completion: an exiting process has no event loop left for the async one. */
export type TernCtlSync = (args: readonly string[]) => void

const ternCtlSync: TernCtlSync = args => void spawnSync('tern', ['ctl', ...args], { timeout: 2000, stdio: 'ignore' })

/** Runs `end` as the process ends: on exit, or on a signal that ends it, which is then re-raised. */
export type AtProcessEnd = (end: () => void) => void

const atProcessEnd: AtProcessEnd = end => {
  process.once('exit', end)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    const on = () => {
      process.off(signal, on)
      end()
      // Only this hook listened: the signal's default (ending the process) is what was asked for.
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal)
    }
    process.on(signal, on)
  }
}

/**
 * The dash mode's window theme. Tern paints its stage, panes and chrome (.tn-body is var(--panel) over
 * --tv-bg, .tn-veil --tv-bg) from its own omp theme, theme_dark/theme_light; a program's palette only
 * colours its text tokens and Tern scopes its stylesheets inside its region, so in the dash mode a
 * pywal window kept a slate stage round the black cards. `tern ctl` in a pane drives the window
 * showing it, and the launcher installs glide/themes/dash.json where Tern lists it. Each call wears
 * the theme again (a wallpaper hook may have put the window back in pywal), and a Glide that ends
 * still wearing it gives the window's own back through `sync` once. Undefined outside a Tern pane.
 */
export function ternWindowTheme(
  env: NodeJS.ProcessEnv = process.env,
  run: TernCtl = ternCtl,
  sync: TernCtlSync = ternCtlSync,
  atEnd: AtProcessEnd = atProcessEnd
): ((name: string | null) => void) | undefined {
  if (!env['TERN_PANE']) return undefined
  let before: { dark: string; light: string } | undefined
  let hooked = false
  let queue = Promise.resolve()
  const wear = async (dark: string, light: string) => {
    for (const [side, name] of [['dark', dark], ['light', light]] as const) {
      if (record(await run(['theme', side, name]))?.['ok'] !== true) throw new Error(`tern has no theme ${name}`)
    }
  }
  const restore = () => {
    const own = before
    before = undefined
    if (own) for (const [side, name] of [['dark', own.dark], ['light', own.light]] as const) sync(['theme', side, name])
  }
  return name => {
    if (name !== null && !hooked) {
      hooked = true
      atEnd(restore)
    }
    queue = queue.then(async () => {
      if (name === null) {
        const own = before
        before = undefined
        if (own) await wear(own.dark, own.light)
        return
      }
      const state = record(await run(['state']))
      const dark = state?.['theme_dark'], light = state?.['theme_light']
      if (typeof dark !== 'string' || typeof light !== 'string') return
      // A window already in it (a relaunch in the mode) has nothing of its own to give back.
      if (dark !== name) before ??= { dark, light }
      await wear(name, name)
    }).catch(() => undefined)
  }
}

/** The theme mode and the gateway's skin, sent to the surface as one palette. */
export class Theme {
  readonly #host: ThemeHost
  #mode: ThemeMode
  /** The skin the gateway last reported; only the `skin` theme mode wears it. */
  #skin: SkinPayload | undefined
  /** The wallpaper palette the auto mode last sent. */
  #wal: WalPalette | undefined
  #unwatch: (() => void) | undefined
  /** Whether the dash mode's stylesheet is installed (the next mode takes it away). */
  #sheet = false
  /** The Tern theme the window wears for the dash mode or a whole theme (a mode without one gives its own back). */
  #window: string | undefined
  /** Takes the glass playground's sheet away once its cycle ends. */
  #play: NodeJS.Timeout | undefined

  /** `mode` is the one settings.json kept. */
  constructor(host: ThemeHost, mode: ThemeMode) {
    this.#host = host
    this.#mode = mode
  }

  /** Whose colors the surface wears. */
  get mode(): ThemeMode {
    return this.#mode
  }

  /** The palette for auto, Dash, Mono, Studio or a whole theme; undefined for other modes or unreadable wallpaper. */
  get wal(): WalPalette | undefined {
    if (ownMode(this.#mode)) return this.#own(this.#mode)
    if (isGlideTheme(this.#mode)) return themePalette(this.#mode, this.#host.style?.())
    return this.#mode === 'auto' ? this.#wal : undefined
  }

  /** Sends the palette of the mode and skin now. */
  apply() {
    const mode = this.#mode
    if (mode !== 'dash' && !isGlideTheme(mode) && this.#window !== undefined) {
      this.#window = undefined
      this.#host.windowTheme?.(null)
    }
    if (this.#mode === 'auto') {
      this.#applyWal()
      return
    }
    this.#leaveWal()
    if (mode === 'mono' || mode === 'studio') {
      const flat = this.#own(mode)
      this.#host.palette(templateTernPalette(flat))
      this.#host.stylesheet?.(WAL_SHEET, walCss(flat))
      this.#sheet = true
      return
    }
    if (mode === 'dash' || isGlideTheme(mode)) {
      // Dash and the whole themes: one fixed palette, its card stylesheet and its Tern window theme.
      const flat = mode === 'dash' ? this.#own(mode) : themePalette(mode, this.#host.style?.())
      const palette = mode === 'dash' ? dashTernPalette(flat) : themeTernPalette(mode, flat)
      this.#host.palette(palette)
      this.#host.stylesheet?.(WAL_SHEET, walCss(flat))
      this.#sheet = true
      if (this.#window !== palette.name.dark) {
        this.#window = palette.name.dark
        this.#host.windowTheme?.(this.#window)
      }
      return
    }
    if (this.#sheet) {
      this.#sheet = false
      this.#host.stylesheet?.(WAL_SHEET, null)
    }
    this.#host.palette(paletteFor(this.#mode, this.#skin))
  }

  /** The gateway's skin (gateway.ready, skin.changed); none keeps the last one. */
  skin(skin: SkinPayload | null | undefined) {
    if (skin) {
      this.#skin = skin
      this.apply()
    }
  }

  /** Switches the mode now and keeps it for the next launch. */
  set(mode: ThemeMode) {
    this.#mode = mode
    this.#host.settings.save({ theme: mode })
    // Asking for dash (or a whole theme) again wears its window theme again: something may have reset the window since.
    if (mode === 'dash' || isGlideTheme(mode)) this.#window = undefined
    this.apply()
  }

  /**
   * Wears `mode`, which settings.json already keeps (glide_theme wrote it, or another pane's picker): nothing
   * to save. Whether it changed anything.
   */
  wear(mode: ThemeMode): boolean {
    if (mode === this.#mode) return false
    this.#mode = mode
    this.apply()
    return true
  }

  /**
   * `/glide glass demo`: one CSS keyframe cycle of the glass (glass.ts glassPlayCss), then the sheet goes and
   * the glass settles. Its seconds, or null outside the auto mode, where there is no glass to play.
   */
  playGlass(): number | null {
    const wal = this.wal
    if (!wal || !this.#host.stylesheet) return null
    this.#stopPlay()
    this.#host.stylesheet(PLAY_SHEET, glassPlayCss(wal))
    this.#play = setTimeout(() => this.#stopPlay(), PLAY_SECONDS * 1000 + 500)
    this.#play.unref()
    return PLAY_SECONDS
  }

  /** Stops following the wallpaper file, and takes a playing glass cycle's sheet away with its timer. */
  dispose() {
    this.#stopPlay()
    this.#unwatch?.()
    this.#unwatch = undefined
  }

  #stopPlay() {
    if (this.#play === undefined) return
    clearTimeout(this.#play)
    this.#play = undefined
    this.#host.stylesheet?.(PLAY_SHEET, null)
  }

  #applyWal() {
    const file = this.#host.walFile ?? walFile()
    this.#unwatch ??= watchWal(file, () => {
      if (this.#mode === 'auto') this.#applyWal()
    })
    const wal = readWal(file)
    if (!wal) {
      // No wallpaper colors (yet): Tern's own theme until the file appears.
      this.#wal = undefined
      this.#host.stylesheet?.(WAL_SHEET, null)
      this.#host.palette(paletteFor('tern', this.#skin))
      return
    }
    const style = this.#host.style?.()
    this.#wal = styleAccent(walPalette(styleWal(wal, style), file), style)
    this.#host.palette(walTernPalette(this.#wal))
    this.#host.stylesheet?.(WAL_SHEET, walCss(this.#wal))
  }

  /** Dash's (or a template's) palette, its glass floor taken over the wallpaper when its colors.json reads. */
  #own(mode: OwnMode) {
    const wall = readWal(this.#host.walFile ?? walFile())
    const p = mode === 'dash' ? dashPalette(wall) : mode === 'mono' ? monoPalette(wall) : studioPalette(wall)
    return styleAccent(p, this.#host.style?.())
  }

  #leaveWal() {
    if (this.#unwatch || this.#wal) {
      this.dispose()
      this.#wal = undefined
      this.#host.stylesheet?.(WAL_SHEET, null)
    }
  }
}
