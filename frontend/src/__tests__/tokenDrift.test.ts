import { describe, expect, it } from 'vitest'

import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

describe('tokenDrift', () => {
  it('passes CSS written on the token scale', () => {
    expect(tokenDrift("a{border-radius:8px;font:500 13px/24px var(--sans);letter-spacing:.08em;color:var(--h-fg)}")).toEqual(NO_DRIFT)
  })
  it('names every off-scale radius, size, tracking and hex', () => {
    expect(tokenDrift("a{border-radius:7px;font-size:8.5px;letter-spacing:.2em;color:#ff00aa;background:#000}")).toEqual({
      radii: ['7px'], sizes: ['8.5px'], tracking: ['.2em'], hexes: ['#ff00aa']
    })
  })
  it('reads issue numbers in comments as issues, not colours', () => {
    expect(tokenDrift("// Widgets (kvnloo/glide#326).\n/** `#123` links the issue. */\nconst u = 'https://x.test/#abc' // see #556\n")).toEqual({ ...NO_DRIFT, hexes: ['#abc'] })
    expect(tokenDrift("a{/* was #ff00aa */color:#00ff00}")).toEqual({ ...NO_DRIFT, hexes: ['#00ff00'] })
  })
})
