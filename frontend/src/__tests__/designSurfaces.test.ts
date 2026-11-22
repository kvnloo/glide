// The drift gate over every Glide surface at once (#306). Each surface used to opt in from its own test, so a
// file nobody opted in (the chat chrome sheet, the native glide/v1 renderer, the voice orb) could drift
// unseen. This walks every source file under frontend/src and glide/frontend and holds each one to the token
// scale in glide/frontend/tokens.ts (docs/DESIGN-LANGUAGE.md §3, §8).
// Two kinds of file are exempt, each named with its reason. A palette defines colours (it is where the hexes
// live), so it may write hex literals, but its sizes, radii and tracking stay on the scale. A foreign skin
// reproduces another app's look on purpose and is exempt in full. Both lists may only shrink: an entry that no
// longer exists, or no longer needs its exemption, fails.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { euiStyles } from '../eui/cards.js'
import { TYPE } from '../../../glide/frontend/tokens.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const DIRS = ['frontend/src', 'glide/frontend']
const SKIP = new Set(['__tests__', 'node_modules', 'vendor'])

/** Files that define colours. Hex literals are their job; everything else stays on the scale. */
const PALETTES: Readonly<Record<string, string>> = {
  'glide/frontend/tokens.ts': 'the token module itself',
  'glide/frontend/orbitTokens.ts': 'the FOCUS orbit role tint ramp (#309)',
  'glide/frontend/council.ts': 'the council seats\' gemstone art',
  'glide/frontend/style.ts': 'the warm and cool targets a wallpaper is pulled toward',
  'frontend/src/chrome/palette.ts': 'the named Tern theme palettes',
  'frontend/src/chrome/orb.ts': 'the voice orb\'s light-theme inks, which have no Dash token',
  'frontend/src/hermes/theme.ts': 'Hermes skin defaults under the contrast math',
  'frontend/src/voice/catalog.ts': 'model-family identity hues on the lane chips',
  'frontend/src/glideui/pages.ts': 'the page theme used when Tern sends no palette',
  'frontend/src/eui/cards.ts': 'the SVG inks used when Tern withholds its palette',
  'frontend/src/splash/art.ts': 'the launch splash inks for light and dark'
}

/** Files that reproduce another app's look on purpose. */
const FOREIGN: Readonly<Record<string, string>> = {
  'frontend/src/gev/skin.ts': 'God\'s Eye View\'s own HUD, scoped to its own cards'
}

const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name)
  if (statSync(path).isDirectory()) return SKIP.has(name) ? [] : walk(path)
  return /\.(tsx?|mts)$/.test(name) && !name.endsWith('.d.ts') ? [relative(root, path)] : []
})
const files = DIRS.flatMap(d => walk(join(root, d))).sort()
const drift = (file: string) => tokenDrift(readFileSync(join(root, file), 'utf8'))

describe('every Glide surface is on the token scale', () => {
  it('finds the surfaces', () => {
    expect(files.length).toBeGreaterThan(100)
    for (const file of ['frontend/src/view/styles.ts', 'frontend/src/glideui/render.tsx', 'glide/frontend/glass.ts']) expect(files).toContain(file)
  })

  it.each(files.filter(f => !(f in PALETTES) && !(f in FOREIGN)))('%s', file => {
    expect(drift(file)).toEqual(NO_DRIFT)
  })

  it.each(Object.keys(PALETTES))('palette %s keeps its sizes, radii and tracking on the scale', file => {
    expect({ ...drift(file), hexes: [] }).toEqual(NO_DRIFT)
  })

  it.each(Object.keys({ ...PALETTES, ...FOREIGN }))('exemption for %s is still needed', file => {
    expect(files).toContain(file)
    const d = drift(file)
    expect(file in FOREIGN ? d : { ...NO_DRIFT, hexes: d.hexes }, 'drop the exemption: the file is on the scale').not.toEqual(NO_DRIFT)
  })

  // The kit sizes its icon glyph as 0.4 of the icon, so Glide's 20 px card icon painted an 8 px letter: under the
  // 10 px floor, and invisible to a source scan. The card sheet sets it back on the ramp.
  it('the card icon glyph is not under the type floor', () => {
    const css = euiStyles()
    const at = css.lastIndexOf('.eu .eu-card .eu-ico{')
    expect(css.slice(at, css.indexOf('}', at))).toMatch(new RegExp(`font-size:${TYPE.label}px`))
  })
})
