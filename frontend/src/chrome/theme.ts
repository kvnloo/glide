// Whose colors the surface wears (`/theme`): the mode settings.json keeps, and the skin the gateway
// last reported, which only the `skin` mode wears. palette.ts maps the pair to Tern's palette; the
// `auto` mode (wal.ts) wears the wallpaper's pywal colors and follows the file live.

import type { SkinPayload } from '@hermes/shared/gateway-events'
import type { Palette } from '@stencil-hq/tern'

import type { SettingsSource, ThemeMode } from '../settings.js'

import { paletteFor } from './palette.js'
import { readWal, WAL_SHEET, walCss, walFile, walPalette, walTernPalette, watchWal, type WalPalette } from './wal.js'

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

  /** `mode` is the one settings.json kept. */
  constructor(host: ThemeHost, mode: ThemeMode) {
    this.#host = host
    this.#mode = mode
  }

  /** Whose colors the surface wears. */
  get mode(): ThemeMode {
    return this.#mode
  }

  /** The wallpaper palette in the auto mode; undefined in the others or without a readable colors.json. */
  get wal(): WalPalette | undefined {
    return this.#mode === 'auto' ? this.#wal : undefined
  }

  /** Sends the palette of the mode and skin now. */
  apply() {
    if (this.#mode === 'auto') {
      this.#applyWal()
      return
    }
    this.#leaveWal()
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
    this.apply()
  }

  /** Stops following the wallpaper file. */
  dispose() {
    this.#unwatch?.()
    this.#unwatch = undefined
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
    this.#wal = walPalette(wal, file)
    this.#host.palette(walTernPalette(this.#wal))
    this.#host.stylesheet?.(WAL_SHEET, walCss(this.#wal))
  }

  #leaveWal() {
    if (this.#unwatch || this.#wal) {
      this.dispose()
      this.#wal = undefined
      this.#host.stylesheet?.(WAL_SHEET, null)
    }
  }
}
