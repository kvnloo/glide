// The token drift gate as a helper, so any surface can opt in from its own test file without editing a
// shared list: `expect(tokenDrift(readFileSync(path, 'utf8'))).toEqual(NO_DRIFT)`. Same rules as
// designTokens.test.ts: every radius, font size, letter-spacing and colour literal comes from
// glide/frontend/tokens.ts. See docs/DESIGN-LANGUAGE.md.
import { RADIUS, TRACK, TYPE } from '../../../../glide/frontend/tokens.js'

export interface Drift { radii: string[]; sizes: string[]; tracking: string[]; hexes: string[] }
export const NO_DRIFT: Drift = { radii: [], sizes: [], tracking: [], hexes: [] }

const literal = /^-?[\d.]+(px|em)$|^\d+%$/
const values = (s: string, prop: RegExp) => [...s.matchAll(prop)].map(m => m[1]!.trim()).filter(v => literal.test(v))

export function tokenDrift(src: string): Drift {
  const radii = new Set([...Object.values(RADIUS).map(r => `${r}px`), '50%', '0'])
  const sizes = new Set(Object.values(TYPE).map(t => `${t}px`))
  const tracking = new Set<string>(Object.values(TRACK))
  return {
    radii: values(src, /border-radius:\s*([^;'"`]+?)\s*[;'"`]/g).filter(v => !radii.has(v)),
    sizes: [...values(src, /font-size:\s*([^;'"`]+?)\s*[;'"`]/g), ...values(src, /font:\s*(?:\d{3}\s+)?([\d.]+px)/g)].filter(v => !sizes.has(v)),
    tracking: values(src, /letter-spacing:\s*([^;'"`]+?)\s*[;'"`]/g).filter(v => !tracking.has(v)),
    hexes: (src.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).filter(h => !/^#0{3}(0{3})?$/.test(h))
  }
}
