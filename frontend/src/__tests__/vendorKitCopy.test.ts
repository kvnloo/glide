import { describe, expect, it } from 'vitest'

// @ts-expect-error plain ESM build script without types
import { adaptFleetJs } from '../../scripts/vendor-ephemeral-ui.mjs'

describe('vendored kit copy', () => {
  it('labels the factory graph disabled fix button in plain words', () => {
    const kit = 'n.requested ? "Fix already requested, awaiting glide" : !n.action ? "No fix action supplied" : ""'
    expect(adaptFleetJs(kit)).toBe('n.requested ? "Fix requested" : !n.action ? "No fix available" : ""')
  })
})
