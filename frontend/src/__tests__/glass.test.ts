import { describe, expect, it } from 'vitest'

import { mix } from '../hermes/theme.js'
import { GLASS_FORBIDDEN, glassCss, pickGlow } from '../../../glide/frontend/glass.js'
import { walCss, walPalette, type WalColors } from '../../../glide/frontend/wal.js'

// The hackathon film's palette (sampled from its wallpaper), as a pywal colors.json would carry it.
const FILM_COLORS = ['#0d1a17', '#7db84a', '#7db84a', '#d9b98a', '#d9c27e', '#5cc3c9', '#2f8f9a', '#a8bbb2',
  '#8a9c94', '#7db84a', '#7db84a', '#d9b98a', '#d9c27e', '#5cc3c9', '#2f8f9a', '#eef3ec']
const FILM: WalColors = {
  special: { background: '#0d1a17', foreground: '#eef3ec' },
  colors: Object.fromEntries(FILM_COLORS.map((c, i) => [`color${i}`, c]))
}
const GREY: WalColors = {
  special: { background: '#101010', foreground: '#e0e0e0' },
  colors: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`color${i}`, i === 0 ? '#101010' : '#808080']))
}

describe('glassCss', () => {
  const p = walPalette(FILM)
  const css = glassCss(p)

  it("pairs the film's gold accent with its cyan for the rims and halos", () => {
    expect(p.accent).toBe('#d9c27e')
    expect(p.glow).toBe('#5cc3c9')
    // With nothing else colored, the glow is the accent itself.
    expect(pickGlow(GREY, '#808080')).toBe('#808080')
  })

  it('keeps to syntax Tern parses in a plugin sheet', () => {
    for (const bad of GLASS_FORBIDDEN) expect(css).not.toContain(bad)
    expect(css.split('{').length).toBe(css.split('}').length)
  })

  it('takes every color from the wallpaper palette', () => {
    const hexes = new Set(css.match(/#[0-9a-f]{6}\b/gi))
    expect([...hexes].sort()).toEqual([p.accent, p.glow, p.bg, mix(p.bg, '#000000', 0.7)].sort())
  })

  it('rims the council in the glow but leaves its 11px label on the theme text colour', () => {
    expect(css).toMatch(/\.ih-l-council, [^{]*\{ border-color: var\(--g-b\); \}/)
    expect(css).not.toMatch(/\.ih-lrole b \{ color/)
  })

  it('frosts cards and the composer, rims them, and lifts them on hover within 250ms', () => {
    expect(css).toMatch(/\.eu-card \{[^}]*backdrop-filter: blur\(/)
    expect(css).toMatch(/omp\.editor'\] \{[^}]*backdrop-filter: blur\(/)
    expect(css).toMatch(/\.eu-card::after \{[^}]*linear-gradient\(180deg, var\(--g-a\)[^}]*var\(--g-b\)\)/)
    for (const sel of ['.eu-card', '.ih-lane', '.ih-key', '.eu-chip', '.eu-btn']) {
      expect(css).toMatch(new RegExp(`${sel.replace('.', '\\.')}:hover[^{]*\\{[^}]*translateY\\(-1px\\)`))
    }
    expect(css).toMatch(/\.eu-btn:active[^{]*\{[^}]*scale\(\.97\)/)
    const durations = [...css.matchAll(/transition[^;]*/g)].flatMap(m => [...m[0].matchAll(/(\d*\.?\d+)s\b/g)].map(d => Number(d[1])))
    expect(durations.length).toBeGreaterThan(5)
    for (const d of durations) expect(d).toBeLessThanOrEqual(0.25)
  })

  it('drifts dust motes behind the cards and stills them for reduced motion', () => {
    expect(css).toMatch(/:not\(\[data-eui-popup\]\)::before \{[^}]*radial-gradient[^}]*animation: glide-drift/)
    expect(css).toContain('@keyframes glide-drift')
    const still = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(still).toMatch(/::before[^{]*\{ animation: none; \}/)
    expect(still).toMatch(/:hover[^{]*\{ transform: none; \}/)
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('rides on the auto theme sheet', () => {
    expect(walCss(p).endsWith(css)).toBe(true)
  })
})
