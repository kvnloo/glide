// The drift gate for glide/frontend/tokens.ts: every radius, font size, letter-spacing and colour literal in
// the cards, popups and glass must come from the token module, so a new component cannot reintroduce the
// 8.5 px labels, 7 px corners and one-off golds the design-system pass removed.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { dashPalette } from '../../../glide/frontend/dash.js'
import { restTint, saturateHex, SATURATE_STEPS, wallSamples } from '../../../glide/frontend/glass.js'
import { walPalette, type WalPalette } from '../../../glide/frontend/wal.js'
import { contrastRatio, mix } from '../hermes/theme.js'
import { COUNCIL_HUE, DASH, GOLD, NIGHT, NIGHT_INKS, RADIUS, STATUS, TRACK, TYPE } from '../../../glide/frontend/tokens.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../glide/frontend')
const COMPONENTS = ['attentionCards', 'intentCards', 'councilPopup', 'lanesPopup', 'glass']
const src = (name: string) => readFileSync(join(root, `${name}.ts`), 'utf8')
const literal = /^-?[\d.]+(px|em)$|^\d+%$/

const values = (s: string, prop: RegExp) =>
  [...s.matchAll(prop)].map(m => (m[1] ?? '').trim()).filter(v => literal.test(v))

describe('design tokens', () => {
  for (const name of COMPONENTS) {
    const s = src(name)
    it(`${name}: radii are on the scale`, () => {
      const ok = new Set([...Object.values(RADIUS).map(r => `${r}px`), '50%', '0'])
      expect(values(s, /border-radius:\s*([^;'"`]+?)\s*[;'"`]/g).filter(v => !ok.has(v))).toEqual([])
    })
    it(`${name}: font sizes are on the ramp`, () => {
      const ok = new Set(Object.values(TYPE).map(t => `${t}px`))
      const sizes = [...values(s, /font-size:\s*([^;'"`]+?)\s*[;'"`]/g), ...values(s, /font:\s*(?:\d{3}\s+)?([\d.]+px)/g)]
      expect(sizes.filter(v => !ok.has(v))).toEqual([])
    })
    it(`${name}: letter-spacing is a token`, () => {
      const ok = new Set<string>(Object.values(TRACK))
      expect(values(s, /letter-spacing:\s*([^;'"`]+?)\s*[;'"`]/g).filter(v => !ok.has(v))).toEqual([])
    })
    it(`${name}: no colour literals outside tokens.ts (black is arithmetic)`, () => {
      expect((s.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).filter(h => !/^#0{3}(0{3})?$/.test(h))).toEqual([])
    })
  }

  it('the night inks clear 4.5:1 on the Dash canvas', () => {
    for (const ink of NIGHT_INKS) expect(contrastRatio(ink, NIGHT.canvas) ?? 0).toBeGreaterThanOrEqual(4.5)
  })
  it('the gold call to action reads on its own fill', () => {
    expect(contrastRatio(GOLD.ink, GOLD.fill) ?? 0).toBeGreaterThanOrEqual(7)
  })
  it('the ramp starts at the phone-legible floor and every token is a valid hex', () => {
    expect(Math.min(...Object.values(TYPE))).toBe(10)
    for (const hex of [...Object.values(DASH), ...Object.values(GOLD), ...Object.values(STATUS), COUNCIL_HUE]) expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  // A black-and-white live wallpaper (white armour on black, the shape pywal gives a stormtrooper scene): synthetic greys.
  const ARMOUR = {
    special: { background: '#0a0a09', foreground: '#e5e6e7' },
    colors: { color0: '#0a0a09', color1: '#8f9092', color2: '#9d9fa3', color3: '#abadb0', color4: '#babdc2', color5: '#bec1c4', color6: '#cdced1', color7: '#e5e6e7', color8: '#a0a1a1' }
  }
  const worst = (p: WalPalette) => Math.min(...[...p.samples, ...wallSamples(ARMOUR)].flatMap(s => SATURATE_STEPS.map(k => mix(saturateHex(s, k), p.bg, restTint(p) / 100)))
    .flatMap(under => [p.fg, p.accent, p.muted, p.dim, p.error, p.success, p.warning, ...NIGHT_INKS].map(ink => contrastRatio(ink, under) ?? 0)))

  it('dash glass over a bright wallpaper keeps every ink 4.5:1 at rest', () => {
    expect(worst(dashPalette(ARMOUR))).toBeGreaterThanOrEqual(4.5)
  })
  it('a hueless wallpaper keeps an error red and a success green', () => {
    const p = walPalette(ARMOUR, 'armour')
    const hue = (hex: string) => {
      const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
      return r > g && r > b ? 'red' : g > r && g > b ? 'green' : 'grey'
    }
    expect([hue(p.error), hue(p.success)]).toEqual(['red', 'green'])
  })
})
