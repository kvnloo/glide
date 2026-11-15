// The stylesheet as one hash: the CSS cascade depends on rule order, so a move that splits
// view/styles.ts must keep STYLES byte for byte. A deliberate style change updates the hash
// (`bun run test -u`) in the same commit.
import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { STYLES } from '../view/styles.js'

describe('STYLES', () => {
  it('stays byte for byte what it was', () => {
    expect({ bytes: Buffer.byteLength(STYLES), sha256: createHash('sha256').update(STYLES).digest('hex') }).toMatchInlineSnapshot(`
      {
        "bytes": 21762,
        "sha256": "323f64609c13dbb2fa12f3ae38577df8cbeed82ac33a5e5facf5d0245abee2d4",
      }
    `)
  })
})
