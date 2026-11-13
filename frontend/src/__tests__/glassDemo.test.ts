import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import type { CouncilHost } from '../../../glide/frontend/councilPopup.js'
import { dashPalette } from '../../../glide/frontend/dash.js'
import {
  GLASS_STRENGTHS, GLASS_TRANSITION_MS, glassDemoCard, glassDemoTint,
  measureGlassDemo, openGlassDemo
} from '../../../glide/frontend/glassDemo.js'
import { DASH, GOLD } from '../../../glide/frontend/tokens.js'
import { contrastRatio } from '../hermes/theme.js'
import type { Overlay } from '../overlays/overlay.js'
import { record } from '../wire/json.js'

import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const styled = [
  join(root, 'glide/frontend/glassDemo.ts'),
  join(root, 'frontend/src/__tests__/glassDemo.test.ts'),
  join(root, 'glide/tools/glass-demo-shots.mts')
]

// All wallpaper colours are synthetic, built only from Dash's palette tokens.
const wall = {
  special: { background: DASH.fg, foreground: DASH.bg },
  colors: {
    color0: DASH.fg, color1: DASH.gold, color2: DASH.success,
    color3: DASH.error, color4: DASH.muted, color5: DASH.dim,
    color6: DASH.bg, color7: DASH.fg
  }
}
const palette = dashPalette(wall)

function setup() {
  const overlays: Overlay[] = []
  const changed = vi.fn()
  const notice = vi.fn()
  const onUse = vi.fn()
  const host: CouncilHost = {
    open: o => { overlays.push(o) },
    close: o => { const i = overlays.indexOf(o); if (i >= 0) overlays.splice(i, 1) },
    changed,
    transcript: { notice },
    eui: {
      host: { publish: vi.fn() },
      click: vi.fn(),
      svg: vi.fn(),
      style: vi.fn(() => 'glass-demo-style')
    }
  }
  return { host, overlays, changed, notice, onUse }
}

/** Invoke a Tern-rendered button, not a private state setter. */
function click(tree: unknown, attr: string, value: string): void {
  const seen = new Set<unknown>()
  const walk = (node: unknown): (() => void) | undefined => {
    if (!node || typeof node !== 'object' || seen.has(node)) return undefined
    seen.add(node)
    const obj = record(node)
    const attrs = record(record(obj?.['props'])?.['attrs'])
    const handler = record(obj?.['handlers'])?.['onClick']
    if (attrs?.[attr] === value && typeof handler === 'function') return () => { handler() }
    for (const v of Object.values(obj ?? {})) {
      const found = Array.isArray(v) ? v.map(walk).find(Boolean) : walk(v)
      if (found) return found
    }
    return undefined
  }
  const action = walk(tree)
  expect(action, `${attr}=${value} button`).toBeTypeOf('function')
  action?.()
}

describe('glass playground', () => {
  it('opts every styled file into the design-token drift gate', () => {
    for (const file of styled) expect(tokenDrift(readFileSync(file, 'utf8')), file).toEqual(NO_DRIFT)
  })

  it('shows one synthetic sample, one DEMO pill and a single apply action', () => {
    const card = JSON.stringify(glassDemoCard(palette, 40, { reducedMotion: true }))
    expect(card).toContain('Glass at a glance')
    expect(card).toContain('One clear next step')
    expect(card).toContain('Glide')
    expect(card).toContain('DEMO')
    expect(card.match(/"data-glass-demo":"true"/g)).toHaveLength(1)
    expect(card.match(/"data-glass-sample":"true"/g)).toHaveLength(1)
    expect(card.match(/"data-glass-use":"40"/g)).toHaveLength(1)
    expect(card).toContain('Use this strength')
    expect(card).toContain('transition:none')
    expect(card).toContain('min-height:44px')
    for (const strength of GLASS_STRENGTHS) expect(card).toContain(`"data-glass-strength":"${strength}"`)
    expect(card).not.toContain('max-width:760px')
  })

  it('measures the WORST text contrast of every strength, including bright wallpaper', () => {
    const tint = glassDemoTint(palette)
    expect(tint).toBeGreaterThanOrEqual(82)
    for (const strength of GLASS_STRENGTHS) {
      const m = measureGlassDemo(palette, strength)
      // Opaque at 0%, thinning to the contrast-safe floor at 100%: strength is visible, AA is not traded away.
      expect(m.tint).toBe(Math.round(100 - (100 - tint) * strength / 100))
      expect(m.tint).toBeGreaterThanOrEqual(tint)
      expect(m.worstContrast).toBeGreaterThanOrEqual(4.5)
      expect(m.blur).toBe(Math.round(22 * strength / 100))
      expect(m.saturate).toBe(Math.round(100 + 0.4 * strength))
      const card = JSON.stringify(glassDemoCard(palette, strength))
      expect(card).toContain(`"data-glass-contrast":"${m.worstContrast.toFixed(2)}"`)
      expect(card).toContain(`${m.worstContrast.toFixed(2)}:1 · AA`)
    }
    expect(contrastRatio(GOLD.ink, GOLD.fill)).toBeGreaterThanOrEqual(4.5)
    expect(measureGlassDemo(palette, 0).tint).toBe(100)
  })

  it('frosts a transcript-like swatch so each strength reads differently', () => {
    const card = (strength: (typeof GLASS_STRENGTHS)[number]) => JSON.stringify(glassDemoCard(palette, strength, { reducedMotion: true }))
    expect(card(0)).toContain('"data-glass-swatch":"true"')
    expect(card(0)).toContain('radial-gradient')
    expect(new Set(GLASS_STRENGTHS.map(card)).size).toBe(GLASS_STRENGTHS.length)
    expect(card(0)).not.toContain('0 0 0px')
    expect(card(100)).toMatch(/0 0 30px 3px rgba\(/)
  })

  it('a reduced-transparency reader sees opaque dark glass and a fixed contrast readout', () => {
    const card = JSON.stringify(glassDemoCard(palette, 100, {
      reducedMotion: true, reducedTransparency: true
    }))
    expect(card).toContain('backdrop-filter:none')
    expect(card).toContain('transition:none')
    expect(card).toContain('background-color:rgba(')
    expect(measureGlassDemo(palette, 100, true).tint).toBe(100)
    expect(card).toContain(`${measureGlassDemo(palette, 100, true).worstContrast.toFixed(2)}:1`)
  })

  it('previews four stops quietly in 240 ms; only Use applies a choice', () => {
    const { host, overlays, changed, onUse } = setup()
    const popup = openGlassDemo(host, palette, onUse, { startStrength: 0, reducedMotion: false })
    expect(popup).toBeDefined()
    expect(overlays).toHaveLength(1)
    const draw = () => popup?.node('layer.overlay-1')
    expect(JSON.stringify(draw())).toContain('eui.popup')
    expect(JSON.stringify(glassDemoCard(palette, 40, { reducedMotion: false }))).toContain(`${GLASS_TRANSITION_MS}ms`)
    click(draw(), 'data-glass-strength', '80')
    expect(changed).toHaveBeenCalled()
    expect(onUse).not.toHaveBeenCalled()
    expect(JSON.stringify(draw())).toContain('"data-glass-active":"80"')
    click(draw(), 'data-glass-use', '80')
    expect(onUse).toHaveBeenCalledOnce()
    expect(onUse).toHaveBeenCalledWith(80)
    expect(overlays).toHaveLength(0)
  })

  it('supports keyboard preview, Apply, and Escape without writing settings on cancel', () => {
    const { host, overlays, onUse } = setup()
    const key = (name: string) => ({ name, ctrl: false, alt: false, shift: false, meta: false })
    const popup = openGlassDemo(host, palette, onUse, { startStrength: 40 })
    expect(popup).toBeDefined()
    popup?.onKey(key('right'))
    popup?.onKey(key('enter'))
    expect(onUse).toHaveBeenCalledWith(80)
    expect(overlays).toHaveLength(0)
    const dismissed = openGlassDemo(host, palette, onUse)
    dismissed?.onKey(key('escape'))
    expect(onUse).toHaveBeenCalledOnce()
    expect(overlays).toHaveLength(0)
  })

  it('does not pretend to open without an ephemeral-ui host', () => {
    const { host, notice, onUse } = setup()
    const missing: CouncilHost = { ...host, eui: undefined }
    expect(openGlassDemo(missing, palette, onUse)).toBeUndefined()
    expect(notice).toHaveBeenCalledWith(expect.stringContaining('ephemeral-ui'), 'warning')
    expect(onUse).not.toHaveBeenCalled()
  })
})
