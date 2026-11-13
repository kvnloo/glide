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
})
