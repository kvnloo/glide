// GL-102: Glide's tokens come from the shared theme file (kvnloo/ephemeral-ui theme/glide.json, the pinned copy in
// glide/themes/shared), and a token changed in that file shows in what Glide draws: Dash's palette, the glass
// sheet and its sweep, and the radius and type scales the cards are held to.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import shared from '../../../glide/themes/shared/glide.json'
import { DASH, GOLD, NIGHT, RADIUS, TRACK, TYPE } from '../../../glide/frontend/tokens.js'

const THEME = '../../../glide/themes/shared/glide.json'
const pin = JSON.parse(readFileSync(fileURLToPath(new URL('../../../glide/themes/shared/PIN.json', import.meta.url)), 'utf8')) as { theme: { version: string } }

/** The shared file with `edit` applied, mounted in place of the pinned copy for the modules imported after. */
async function wearing(edit: (t: typeof shared) => void) {
  const t = structuredClone(shared)
  edit(t)
  vi.resetModules()
  vi.doMock(THEME, () => ({ default: t }))
  const [tokens, dash, glass, theme] = await Promise.all([
    import('../../../glide/frontend/tokens.js'),
    import('../../../glide/frontend/dash.js'),
    import('../../../glide/frontend/glass.js'),
    import('../../../glide/frontend/sharedTheme.js')
  ])
  return { tokens, dash, glass, theme }
}

afterEach(() => {
  vi.doUnmock(THEME)
  vi.resetModules()
})

describe('the shared theme file', () => {
  it('is the pinned v0 Glide theme', () => {
    expect(shared.v).toBe(0)
    expect(shared.brand.name).toBe('Glide')
    expect(shared.version).toBe(pin.theme.version)
  })

  it("gives Dash's night, the gold, the radii, the type ramp and the tracking", () => {
    const night = shared.color.dark
    expect(DASH).toEqual({ bg: night.bg, fg: night.fg, gold: shared.brand.accent, muted: night.mutedFg, dim: night.faint, error: night.danger, success: night.success })
    expect(NIGHT.canvas).toBe(night.bg)
    expect(GOLD).toEqual(shared.brand.cta)
    expect(RADIUS).toEqual({ chip: shared.radius.chip, tile: shared.radius.tile, block: shared.radius.block, card: shared.radius.card, pill: shared.radius.pill })
    expect(TYPE).toEqual(shared.type.size)
    expect(TRACK).toEqual(shared.type.tracking)
  })

  it("the landing page's tokens.css carries the same values", () => {
    const css = readFileSync(fileURLToPath(new URL('../../../glide/site/tokens.css', import.meta.url)), 'utf8')
    const kebab = (k: string) => k.replace(/(?<=[a-z0-9])([A-Z])/g, '-$1').toLowerCase()
    const want = [
      ...Object.entries(DASH).map(([k, v]) => `--dash-${kebab(k)}: ${v};`),
      ...Object.entries(GOLD).map(([k, v]) => `--gold-${kebab(k)}: ${v};`),
      ...Object.entries(RADIUS).map(([k, v]) => `--r-${kebab(k)}: ${v}px;`),
      ...Object.entries(TYPE).map(([k, v]) => `--t-${kebab(k)}: ${v}px;`),
      ...Object.entries(TRACK).map(([k, v]) => `--track-${kebab(k)}: ${v};`)
    ]
    expect(want.filter(line => !css.includes(line))).toEqual([])
  })

  it('a changed night, gold and radius show in the tokens and the dash palette', async () => {
    const { tokens, dash } = await wearing(t => {
      t.color.dark.bg = '#101820'
      t.brand.accent = '#40c0a0'
      t.radius.card = 20
      t.type.size.body = 14
    })
    expect(tokens.DASH.bg).toBe('#101820')
    expect(tokens.NIGHT.canvas).toBe('#101820')
    expect(tokens.RADIUS.card).toBe(20)
    expect(tokens.TYPE.body).toBe(14)
    const p = dash.dashPalette()
    expect(p.bg).toBe('#101820')
    expect(p.accent).toBe('#40c0a0')
  })

  it("a changed glass level and easing show in the glass sheet and the playground's sweep", async () => {
    const before = (await wearing(() => undefined)).glass
    const rest = before.glassCss((await import('../../../glide/frontend/dash.js')).dashPalette())
    expect(rest).toContain('blur(22px) saturate(140%)')
    const { glass, dash } = await wearing(t => {
      t.glass.card = { blur: 30, saturate: 150 }
      t.glass.max = { blur: 50, saturate: 240 }
      t.motion.easing.glass = 'cubic-bezier(.1, .8, .2, 1)'
    })
    const p = dash.dashPalette()
    const css = glass.glassCss(p)
    expect(css).toContain('blur(30px) saturate(150%)')
    expect(css).not.toContain('blur(22px)')
    expect(css).toContain('--g-ease: cubic-bezier(.1, .8, .2, 1)')
    const stops = glass.playStops(p)
    expect([stops[0]?.blur, stops[0]?.saturate]).toEqual([30, 150])
    expect(Math.max(...stops.map(s => s.blur))).toBe(50)
    expect(Math.max(...stops.map(s => s.saturate))).toBe(240)
  })

  it('refuses a theme file of another shape version', async () => {
    await expect(wearing(t => { t.v = 1 as 0 })).rejects.toThrow(/Glide reads v 0/)
  })
})
