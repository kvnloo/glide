import { describe, expect, it } from 'vitest'

import { glideGlass } from '../commands/glide.js'
import { contrastRatio, mix, relativeLuminance } from '../hermes/theme.js'
import { NIGHT_INKS } from '../../../glide/frontend/tokens.js'
import { minifyCss } from '../../../glide/frontend/css.js'
import {
  GLASS_FORBIDDEN, GLASS_VIEWS, glassCss, glassPlayCss, hueAt, pickGlow, PLAY_SECONDS, playInks, playStops, restTint, SATURATE_STEPS, saturateHex, tintFloor, wallSamples
} from '../../../glide/frontend/glass.js'
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

/** `#rrggbb` as the sheet writes it at a tint stop's color (alpha left open). */
const rgba = (hex: string) => `rgba(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',')},`

/** The body of every top-level rule naming `sel` in its selector list (keyframes and media blocks left out). */
function decl(css: string, sel: string): string {
  return [...css.matchAll(/^(?![\s@])([^{\n]+)\{([^}]*)\}/gm)].filter(m => (m[1] ?? '').split(',').map(s => s.trim()).includes(sel)).map(m => m[2]).join(';')
}

describe('tintFloor', () => {
  const p = walPalette(FILM)
  // The council and lanes popups' night inks sit on the same glass.
  const inks = [p.fg, p.muted, p.dim, p.accent, p.glow, p.error, p.success, p.warning, ...NIGHT_INKS]

  it('samples the wallpaper from pywal color0..6, not the greys it derives', () => {
    expect(wallSamples(FILM)).toEqual(['#0d1a17', '#7db84a', '#d9b98a', '#d9c27e', '#5cc3c9', '#2f8f9a'])
    expect(p.samples).toEqual(wallSamples(FILM))
  })

  it('pushes colours through saturate() as the backdrop filter does', () => {
    expect(saturateHex('#7db84a', 1)).toBe('#7db84a')
    expect(saturateHex('#808080', 1.8)).toBe('#808080')
    const byte = (i: number) => parseInt(saturateHex('#7db84a', 1.8).slice(i, i + 2), 16)
    expect(byte(3) - byte(1)).toBeGreaterThan(0xb8 - 0x7d)
  })

  it('is the least tint from which every text token keeps 4.5:1 over every wallpaper pixel, saturated or not', () => {
    const under = (px: string, pct: number) => mix(px, p.bg, pct / 100)
    const worst = (pct: number) => Math.min(...p.samples.flatMap(c => SATURATE_STEPS.map(s => saturateHex(c, s)))
      .flatMap(px => inks.map(ink => contrastRatio(ink, under(px, pct)) ?? 0)))
    expect(p.floor).toBe(tintFloor(inks, p.bg, p.samples))
    expect(p.floor).toBeGreaterThan(40) // the film's bright moss would sink its 40% cards under AA
    expect(p.floor).toBeLessThan(100)
    for (let pct = p.floor; pct <= 100; pct++) expect(worst(pct)).toBeGreaterThanOrEqual(4.5)
    expect(worst(p.floor - 1)).toBeLessThan(4.5)
  })

  it('needs the opaque tint when no lesser one holds, and none over a backdrop as dark as the tint', () => {
    expect(tintFloor(['#707070'], '#000000', ['#ffffff'])).toBe(100)
    expect(tintFloor(['#ffffff'], '#101010', ['#101010', '#000000'])).toBe(0)
  })
})

describe('glassPlayCss', () => {
  const p = walPalette(FILM)
  const play = glassPlayCss(p)
  const stops = playStops(p)

  it('sweeps blur 2-44px, saturation 100-220%, a cyan then gold tint and a wide glow over 8-12 s, then settles where it started', () => {
    expect(PLAY_SECONDS).toBeGreaterThanOrEqual(8)
    expect(PLAY_SECONDS).toBeLessThanOrEqual(12)
    expect(Math.min(...stops.map(s => s.blur))).toBe(2)
    expect(Math.max(...stops.map(s => s.blur))).toBe(44)
    expect(Math.min(...stops.map(s => s.saturate))).toBe(100)
    expect(Math.max(...stops.map(s => s.saturate))).toBe(220)
    expect(Math.max(...stops.map(s => s.glow)) / Math.min(...stops.map(s => s.glow))).toBeGreaterThanOrEqual(10)
    expect(new Set(stops.map(s => s.hue)).size).toBe(3)
    for (const s of stops.slice(1, -1)) expect(play).toContain(rgba(s.hue))
    // The film's cool cyan and warm gold, each at the background's own luminance.
    expect(stops.map(s => s.hue)).toEqual(expect.arrayContaining([hueAt(p.bg, p.glow), hueAt(p.bg, p.accent)]))
    expect(Math.abs((relativeLuminance(hueAt(p.bg, p.accent)) ?? 0) - (relativeLuminance(p.bg) ?? 0))).toBeLessThan(0.001)
    expect(Math.max(...stops.map(s => s.motes))).toBeGreaterThan(2)
    expect(stops[0]).toEqual({ ...stops.at(-1), at: 0 })
    expect(play).toContain(`${PLAY_SECONDS}s`)
    expect(play).toMatch(/ 1\}/) // one cycle, no fill: the resting glass takes over again
    // The rest stops are left to the resting sheet, so the cycle starts and ends exactly on it.
    expect(play).not.toMatch(/\b(0|100)% ?\{/)
    expect(stops[0]).toMatchObject({ tint: restTint(p), blur: 22, saturate: 140 })
    expect(glassCss(p)).toContain('backdrop-filter: blur(22px) saturate(140%)')
  })

  it('keeps every ink at 4.5:1 on every keyframe, over every wallpaper sample through that keyframe\'s saturate()', () => {
    const inks = playInks(p)
    let worst = Infinity
    for (const s of stops) {
      const steps = [...SATURATE_STEPS.filter(x => x <= s.saturate / 100), s.saturate / 100]
      for (const px of p.samples.flatMap(c => steps.map(x => saturateHex(c, x)))) {
        const under = mix(px, s.hue, s.tint / 100)
        for (const ink of inks) worst = Math.min(worst, contrastRatio(ink, under) ?? 0)
      }
    }
    expect(worst).toBeGreaterThanOrEqual(4.5)
    // Linear between stops, each holding, so every frame does too; the sheet carries each stop's own tint.
    const bgs = [...play.matchAll(/background-color:rgba\(\d+,\d+,\d+,([\d.]+)\)/g)].map(m => Number(m[1]))
    expect(bgs.length).toBe((stops.length - 2) * 2)
    const tints = stops.slice(1, -1).flatMap(s => [s.tint / 100, s.tint / 100]).sort()
    expect([...bgs].sort()).toEqual(tints)
  })

  it('animates in CSS only, stills for reduced motion and stays opaque for reduced transparency', () => {
    for (const bad of GLASS_FORBIDDEN) expect(play).not.toContain(bad)
    expect(play.split('{').length).toBe(play.split('}').length)
    for (const sel of Object.values(GLASS_VIEWS)) expect(play).toContain(sel)
    for (const media of ['prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce']) {
      expect(play).toMatch(new RegExp(`@media \\(${media}\\)\\{[^{]+\\{animation:none\\}\\}`))
    }
  })

  it('/glide glass demo plays the cycle, or says the playground needs the wallpaper theme', () => {
    const notes: [string, string | undefined][] = []
    const transcript = { notice: (t: string, tone?: string) => void notes.push([t, tone]) }
    glideGlass({ transcript, glassDemo: () => 10 }, 'demo')
    glideGlass({ transcript, glassDemo: () => null }, 'demo')
    glideGlass({ transcript }, undefined)
    expect(notes[0]).toEqual([expect.stringContaining('cycle for 10 s'), undefined])
    expect(notes[1]).toEqual([expect.stringContaining('/glide theme auto'), 'warning'])
    expect(notes[2]).toEqual(['Usage: /glide glass demo', 'warning'])
  })
})

describe('glassCss', () => {
  const p = walPalette(FILM)
  const css = glassCss(p)
  const tint = (() => { const [r, g, b] = [1, 3, 5].map(i => parseInt(p.bg.slice(i, i + 2), 16)); return `rgba(${r},${g},${b},${restTint(p) / 100})` })()

  it("picks the film's gold accent and its cyan glow from the palette", () => {
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
    const hex = (rgb: string) => '#' + rgb.split(',').map(v => Number(v).toString(16).padStart(2, '0')).join('')
    const used = new Set([...css.match(/#[0-9a-f]{6}\b/gi) ?? [], ...[...css.matchAll(/rgba\((\d+,\d+,\d+),/g)].map(m => hex(m[1] ?? ''))])
    expect([...used].sort()).toEqual([p.accent, p.glow, p.bg, p.fg, mix(p.bg, '#000000', 0.7)].sort())
  })

  it('rims the council in the glow but leaves its 11px label on the theme text colour', () => {
    expect(css).toContain(`.ih-pip { border-color: ${p.glow}; }`)
    expect(css).not.toMatch(/\.ih-lrole b \{ color/)
  })

  it('frosts every Glide view on a tint at or over the floor, each with a 1px rim and an inner highlight', () => {
    for (const [view, sel] of Object.entries(GLASS_VIEWS)) {
      const body = decl(css, sel)
      expect(body, view).toMatch(/backdrop-filter: blur\(\d+px\) saturate\(\d+%\)/)
      expect(body, view).toMatch(/inset 0 1px 0 /)
      const rim = decl(css, `${sel}::after`)
      expect(rim || body, view).toMatch(/padding: 1px|inset 0 0 0 1px|0 -1px 0 /)
      for (const m of body.matchAll(new RegExp(`background: ${tint.slice(0, tint.lastIndexOf(',')).replace('(', '\\(')},([\\d.]+)\\)`, 'g'))) {
        expect(Number(m[1]) * 100, view).toBeGreaterThanOrEqual(p.floor)
      }
    }
    // Tern's own cards and popups take the tint through its variables.
    expect(decl(css, '.sf-overlay')).toContain(`--pop-bg: ${tint}`)
    expect(decl(css, '.sf')).toContain(`--sf-card-bg: ${tint}`)
    // Tern's fixed greys (the composer's path, transcript notices) fall to 3.6:1 on glass; they take the palette inks the floor covers.
    expect(decl(css, '.sf-place-dir')).toBe(' color: var(--t3); ')
    expect(decl(css, '.sf-t-muted')).toBe(' color: var(--t2); ')
  })

  it('stays well under the surface sheet cap', () => {
    expect(Buffer.byteLength(walCss(p))).toBeLessThan(12 * 1024)
    expect(Buffer.byteLength(glassPlayCss(p))).toBeLessThan(4 * 1024)
  })

  it('frosts cards and the composer, rims them, and lifts them on hover within 250ms', () => {
    expect(decl(css, GLASS_VIEWS.cards)).toMatch(/backdrop-filter: blur\(/)
    expect(decl(css, GLASS_VIEWS.composer)).toMatch(/backdrop-filter: blur\(/)
    expect(css).not.toContain('!important')
    // One light source: the rim is the text ink, brightest on top; no colored blur halo at rest or on hover.
    const fg = (() => { const [r, g, b] = [1, 3, 5].map(i => parseInt(p.fg.slice(i, i + 2), 16)); return `rgba(${r},${g},${b},` })()
    expect(decl(css, `${GLASS_VIEWS.cards}::after`)).toContain(`linear-gradient(180deg, ${fg}0.3)`)
    const glowRgb = [1, 3, 5].map(i => parseInt(p.glow.slice(i, i + 2), 16)).join(',')
    const accRgb = [1, 3, 5].map(i => parseInt(p.accent.slice(i, i + 2), 16)).join(',')
    for (const m of css.matchAll(/box-shadow:([^;}]*)/g)) {
      for (const sh of (m[1] ?? '').split(/,(?![^(]*\))/)) {
        if (/^\s*inset|^\s*-?[\d.]+(px)? -?[\d.]+(px)? 0 /.test(sh)) continue // insets and unblurred hairlines are edges, not glow
        expect(sh, 'colored blur halo').not.toMatch(new RegExp(`rgba\\((${glowRgb}|${accRgb}),`))
      }
    }
    for (const sel of ['.eu-card', '.ih-lane', '.ih-key', '.eu-chip', '.eu-btn']) {
      expect(css).toMatch(new RegExp(`${sel.replace('.', '\\.')}:hover[^{]*\\{[^}]*translateY\\(-1px\\)`))
    }
    expect(css).toMatch(/\.eu-btn:active[^{]*\{[^}]*scale\(\.97\)/)
    const durations = [...css.matchAll(/transition[^;]*/g)].flatMap(m => [...m[0].matchAll(/(\d*\.?\d+)s\b/g)].map(d => Number(d[1])))
    expect(durations.length).toBeGreaterThan(5)
    for (const d of durations) expect(d).toBeLessThanOrEqual(0.25)
  })

  it('shows no dust motes or sparks at rest or on hover, and stills motion when asked', () => {
    // Kevin read the drifting gold/cyan dots around the window as random particles. Only the /glide glass demo shows them.
    expect(css).toMatch(/:not\(\[data-eui-popup\]\)::before \{[^}]*radial-gradient[^}]*opacity: 0; \}/)
    expect(css).not.toContain('glide-drift')
    expect(css).not.toMatch(/:hover::before/)
    expect(glassPlayCss(p)).toContain('@keyframes glide-play-motes')
    const still = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(still).toMatch(/::before[^{]*\{ animation: none; \}/)
    expect(still).toMatch(/:hover[^{]*\{ transform: none; \}/)
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('puts the focus, digest and proof insets on the same dark glass as the intent cards, never a light layer', () => {
    // The film showed light insets (PHASE / FLOW / BEDTIME tiles, digest rows, the receipt chip) inside dark cards.
    const glassy = (sel: string) => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(m => (m[1] ?? '').split(',').some(s => s.trim().endsWith(sel)) && (m[2] ?? '').includes('background:'))?.[2] ?? ''
    for (const sel of ['.ah-hero', '.ah-fact', '.ah-ask', '.ah-tile', '.ah-note', '.ih-stamp', '.ih-repo']) {
      expect(glassy(sel), sel).toMatch(/background: [^;]*rgba\(13,26,23,0\.2[46]\)/)
    }
    // The note keeps its accent edge: only its fill turns to glass, never its border.
    expect(css).toContain('.ah-note { background: rgba(13,26,23,0.24); }')
  })

  it("puts each card's head row on a tab of the resting glass, so its title reads over a fully clear window", () => {
    // The head row sits above the card's box, on Tern's window glass; at zero window opacity that is bare wallpaper.
    const head = decl(css, '[data-eu][data-eui=card] .eui-host-head')
    expect(head).toContain(`background: ${rgba(p.bg)}${restTint(p) / 100})`)
    expect(head).toMatch(/backdrop-filter: blur/)
    expect(head).toContain('width: fit-content')
    const clear = css.slice(css.indexOf('@media (prefers-reduced-transparency: reduce)'))
    expect(clear).toContain('.eui-host-head')
  })

  it('rides on the auto theme sheet', () => {
    expect(walCss(p).endsWith(minifyCss(css))).toBe(true)
  })
})
