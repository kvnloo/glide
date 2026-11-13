// The contrast floors, pair by pair: every text ink of the Dash surfaces against every layer it can sit on,
// every 1 px border against the layer it is drawn on, and disabled text, which keeps its ink (the label
// carries the state, not a fade). Synthetic skins only.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { paletteFor } from '../chrome/palette.js'
import { FLEET_DESIGN_CSS } from '../commands/fleet.js'
import { euiStyles } from '../eui/cards.js'
import { contrastRatio, mix, relativeLuminance, skinBackground } from '../hermes/theme.js'
import { parseJson, record } from '../wire/json.js'
import { dashPalette } from '../../../glide/frontend/dash.js'
import { DASH, NIGHT, NIGHT_INKS } from '../../../glide/frontend/tokens.js'
import { TEXT_FLOOR } from '../../../glide/frontend/wal.js'

const BORDER_FLOOR = 1.5
const SECONDARY_FLOOR = 7

const p = dashPalette()
const [l1, l2, l3] = p.layers
/** What text sits on: the canvas, Tern's pane layers, the card (walCss binds --card to l1), the selected row,
 * and the warm row fill a real Tern layout dump measured under fleet rows. */
const LAYERS = { bg: p.bg, l1, l2, l3, card: l1, selected: p.selectedBg, ternRow: '#211f1b' }
const TEXT = {
  fg: p.fg, accent: p.accent, muted: p.muted, dim: p.dim, error: p.error, success: p.success, warning: p.warning,
  ...Object.fromEntries(Object.entries(NIGHT).filter(([, v]) => NIGHT_INKS.some(i => i === v)).map(([k, v]) => [`night.${k}`, v]))
}
const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0

/** An rgba() ink laid over `under`, as the browser paints it. */
const over = (ink: string, under: string) => {
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(ink)
  if (!m) return ink
  const hex = `#${[m[1], m[2], m[3]].map(c => Number(c).toString(16).padStart(2, '0')).join('')}`
  return mix(under, hex, Number(m[4]))
}

const theme = record(parseJson(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../glide/themes/dash.json'), 'utf8')))
const strings = (v: unknown): Record<string, string> =>
  Object.fromEntries(Object.entries(record(v) ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'))
const tv = strings(theme?.['vars'])
const refs = strings(theme?.['colors'])
const omp = (key: string) => tv[refs[key] ?? ''] ?? ''

describe('text floors: every ink on every layer', () => {
  const rows = Object.entries(TEXT).flatMap(([ink, c]) => Object.entries(LAYERS).map(([layer, u]) => [ink, layer, c, u] as const))
  it.each(rows)('%s on %s', (_ink, _layer, c, u) => {
    expect(ratio(c, u)).toBeGreaterThanOrEqual(TEXT_FLOOR)
  })

  it('the Dash greys pass as authored, so the lift never reorders them', () => {
    expect([p.muted, p.dim]).toEqual([DASH.muted, DASH.dim])
  })

  it('muted and dim read 7:1 on the canvas yet stay below the ink, muted above dim', () => {
    for (const ink of [p.muted, p.dim]) {
      expect(ratio(ink, p.bg)).toBeGreaterThanOrEqual(SECONDARY_FLOOR)
      expect(ratio(ink, p.fg)).toBeGreaterThanOrEqual(1.5)
    }
    expect(relativeLuminance(p.muted) ?? 0).toBeGreaterThan(relativeLuminance(p.dim) ?? 1)
  })
})

describe('border floors: a 1 px line against the layer it is drawn on', () => {
  const rows: [string, string, string][] = [
    ['l3 on bg', l3, p.bg], ['l3 on l1', l3, l1], ['l3 on card', l3, LAYERS.card],
    ...(['background', 'card', 'popover', 'muted'] as const).map((k): [string, string, string] => [`dash.json border on ${k}`, omp('border'), tv[k] ?? '']),
    ...(['border', 'borderStrong'] as const).flatMap(k => [p.bg, l1].map((u): [string, string, string] => [`night.${k} on ${u}`, over(NIGHT[k], u), u]))
  ]
  it.each(rows)('%s', (_name, line, u) => {
    expect(ratio(line, u)).toBeGreaterThanOrEqual(BORDER_FLOOR)
  })
})

describe('disabled text keeps a readable ink', () => {
  it("the kit's disabled controls drop every fade, and its plain buttons wear the dim ink, which clears every layer", () => {
    const css = euiStyles()
    expect(css.match(/\[data-eui-a-disabled\]\{[^}]*opacity:\.\d/g) ?? []).toEqual([])
    expect(css).toContain(',.eu-btn[data-eui-a-disabled]:not(.primary)){color:var(--h-mutedFg)}')
  })
  it("fleet's faded action label still clears 4.5:1 on its row and tile", () => {
    const fade = Number(/\.fl-design-action:disabled\{opacity:([\d.]+)/.exec(FLEET_DESIGN_CSS)?.[1] ?? 1)
    for (const u of [l1, l2]) expect(ratio(mix(u, p.fg, fade), u)).toBeGreaterThanOrEqual(TEXT_FLOOR)
  })
})

describe('the omp/Tern dash theme file', () => {
  const surfaces = ['background', 'card', 'popover', 'muted', 'userBubble'] as const
  const rows = (['text', 'muted', 'dim', 'accent', 'success', 'warning', 'toolOutput', 'statusLinePath'] as const)
    .flatMap(k => surfaces.map(s => [k, s] as const))
  it.each(rows)('%s on %s', (k, s) => {
    expect(ratio(omp(k), tv[s] ?? '')).toBeGreaterThanOrEqual(TEXT_FLOOR)
  })
  it('matches the Dash tokens', () => {
    expect([tv['mutedForeground'], tv['faint'], tv['border']]).toEqual([DASH.muted, DASH.dim, l3])
  })
})

describe('skin mode lifts its semantic colors to 4.5:1', () => {
  // A dim navy skin (colors that fail as authored), a light skin and the Hermes defaults.
  const skins = [
    { name: 'dim', colors: { background: '#101820', ui_accent: '#1f3a5f', ui_error: '#5a1010', ui_ok: '#123312', ui_warn: '#4a3300' } },
    { name: 'paper', colors: { background: '#fbf8f0', ui_accent: '#f0d080', ui_error: '#ff9090', ui_ok: '#a0e0a0', ui_warn: '#ffd070' } },
    { name: 'default', colors: {} }
  ]
  it.each(skins.flatMap(s => (['dark', 'light'] as const).map(pol => [s.name, pol, s] as const)))('%s, %s', (_n, pol, skin) => {
    const tokens = paletteFor('skin', skin)[pol] ?? {}
    const bg = skinBackground(skin.colors, pol)
    for (const key of ['accent', 'error', 'success', 'warning']) expect(ratio(tokens[key] ?? '', bg)).toBeGreaterThanOrEqual(TEXT_FLOOR)
  })
})
