// The `auto` theme mode (`/glide theme auto`, or GLIDE_AUTO_THEME=1): the wallpaper's colors from
// pywal's colors.json, mapped onto the same palette tokens the other modes send (palette.ts) plus a
// stylesheet that rebinds the surface's CSS variables, so the chat and every ephemeral-ui card retint
// together. Text tokens are lifted to a 4.5:1 floor against the wallpaper background.

import { mkdirSync, readFileSync, watch, writeFileSync, type FSWatcher } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

import { contrastRatio, ensureContrast, mix, readableOn, relativeLuminance } from '../../frontend/src/hermes/theme.js'
import { parseJson, record } from '../../frontend/src/wire/json.js'

/** Tern's program palette (`t`), as @stencil-hq/tern's Palette. */
export interface TernPalette {
  dark: Record<string, string>
  light: Record<string, string>
  name: { dark: string; light: string }
}

/** WCAG AA for body text. */
export const TEXT_FLOOR = 4.5
/** The stylesheet the auto mode installs (and removes when it is left). */
export const WAL_SHEET = 'glide-auto-theme'

/** pywal's colors.json: `special` and `colors.color0`..`color15`. */
export interface WalColors {
  special: { background: string; foreground: string; cursor?: string }
  colors: Record<string, string>
}

/** The palette the wallpaper resolves to; `/glide theme export` writes this JSON. */
export interface WalPalette {
  source: string
  dark: boolean
  bg: string
  fg: string
  accent: string
  accentInk: string
  muted: string
  dim: string
  error: string
  success: string
  warning: string
  selectedBg: string
  layers: [string, string, string]
}

const HEX = /^#[0-9a-f]{6}$/i

/** pywal's colors.json, overridable with GLIDE_WAL_COLORS. */
export function walFile(env: NodeJS.ProcessEnv = process.env): string {
  return env['GLIDE_WAL_COLORS'] || join(env['XDG_CACHE_HOME'] || join(homedir(), '.cache'), 'wal', 'colors.json')
}

/** Where `/glide theme export` writes the resolved palette, overridable with GLIDE_THEME_EXPORT. */
export function exportFile(env: NodeJS.ProcessEnv = process.env): string {
  return env['GLIDE_THEME_EXPORT'] || join(env['XDG_CACHE_HOME'] || join(homedir(), '.cache'), 'glide', 'theme.json')
}

/** The parsed colors.json; undefined when it is missing or not pywal's shape. */
export function readWal(file: string): WalColors | undefined {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  const raw = record(parseJson(text))
  const special = record(raw?.['special'])
  const palette = record(raw?.['colors'])
  const background = special?.['background']
  const foreground = special?.['foreground']
  if (typeof background !== 'string' || typeof foreground !== 'string' || !HEX.test(background) || !HEX.test(foreground) || !palette) {
    return undefined
  }
  const colors: Record<string, string> = {}
  for (const [k, v] of Object.entries(palette)) {
    if (typeof v === 'string') colors[k] = v
  }
  return { special: { background, foreground }, colors }
}

/** HSL saturation of `#rrggbb` in [0,1]. */
export function saturation(hex: string): number {
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  const [r, g, b] = [channel(1), channel(3), channel(5)]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
}

/** The most saturated of color1..color6 (the first wins a tie); the foreground when none parses. */
export function pickAccent(wal: WalColors): string {
  let best = wal.special.foreground
  let top = -1
  for (let i = 1; i <= 6; i++) {
    const c = wal.colors[`color${i}`] ?? ''
    if (HEX.test(c) && saturation(c) > top) {
      best = c
      top = saturation(c)
    }
  }
  return best
}

/** The wallpaper's palette: every text token at least TEXT_FLOOR against the background. */
export function walPalette(wal: WalColors, source = ''): WalPalette {
  const bg = wal.special.background
  const text = (c: string | undefined, fallback: string) => {
    const lifted = ensureContrast(c && HEX.test(c) ? c : fallback, bg, TEXT_FLOOR, 0.05)
    // ensureContrast stops at the pole; a pole that still fails (mid-gray background) takes the better ink.
    return (contrastRatio(lifted, bg) ?? 0) >= TEXT_FLOOR ? lifted : readableOn(bg)
  }
  const fg = text(wal.special.foreground, wal.special.foreground)
  const accent = text(pickAccent(wal), fg)
  return {
    source,
    dark: (relativeLuminance(bg) ?? 0) < 0.5,
    bg,
    fg,
    accent,
    accentInk: readableOn(accent),
    muted: text(wal.colors['color7'], fg),
    dim: text(wal.colors['color8'], fg),
    error: text(wal.colors['color1'], fg),
    success: text(wal.colors['color2'], fg),
    warning: text(wal.colors['color3'], fg),
    selectedBg: mix(bg, accent, 0.18),
    layers: [mix(bg, fg, 0.06), mix(bg, fg, 0.12), mix(bg, fg, 0.2)]
  }
}

/** The Tern palette (`t`) the wallpaper sends, the same tokens for both polarities. */
export function walTernPalette(p: WalPalette): TernPalette {
  const tokens = {
    accent: p.accent, borderAccent: p.accent, dim: p.dim, error: p.error, mdLink: p.accent, mdListBullet: p.accent,
    muted: p.muted, selectedBg: p.selectedBg, statusLineModel: p.accent, statusLinePath: p.muted,
    success: p.success, text: p.fg, warning: p.warning
  }
  return { dark: tokens, light: tokens, name: { dark: 'auto', light: 'auto' } }
}

/** The stylesheet that rebinds the surface's variables (and the kit's, through them) to the wallpaper. */
export function walCss(p: WalPalette): string {
  const [l1, l2, l3] = p.layers
  const vars = [
    `--accent: ${p.accent}`, `--sf-p-accent: ${p.accent}`, `--accent-ink: ${p.accentInk}`,
    `--text: ${p.fg}`, `--muted: ${p.muted}`, `--t1: ${p.fg}`, `--t2: ${p.muted}`, `--t3: ${p.dim}`,
    `--l1: ${l1}`, `--l2: ${l2}`, `--l3: ${l3}`, `--card: ${l1}`, `--panel: ${p.bg}`, `--sf-c-error: ${p.error}`
  ]
  // The kit's primary buttons read --h-primary-ink, which its host binding leaves unset.
  return `[data-surface] { ${vars.join('; ')}; background: ${p.bg}; color: ${p.fg}; }\n[data-eui='card'] { --h-primary-ink: ${p.accentInk}; }\n`
}

/** Writes the resolved palette JSON for other tools (the fframes film); returns the path. */
export function exportPalette(p: WalPalette, file = exportFile()): string {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(p, null, 2)}\n`)
  return file
}

/**
 * Calls `changed` whenever `file` is rewritten. Watches the directory, since pywal replaces the
 * file; a missing directory watches nothing. Returns the stop function.
 */
export function watchWal(file: string, changed: () => void, debounceMs = 50): () => void {
  let timer: NodeJS.Timeout | undefined
  let watcher: FSWatcher | undefined
  try {
    watcher = watch(dirname(file), (_event, name) => {
      if (name && name.toString() !== basename(file)) return
      clearTimeout(timer)
      timer = setTimeout(changed, debounceMs)
    })
    watcher.on('error', () => watcher?.close())
  } catch {
    watcher = undefined
  }
  return () => {
    clearTimeout(timer)
    watcher?.close()
  }
}
