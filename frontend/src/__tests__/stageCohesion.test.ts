import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLEAN_CSS } from '../voice/cleanFocus.js'

const council = readFileSync(new URL('../../../glide/frontend/councilPopup.ts', import.meta.url), 'utf8')

describe('one quiet full-screen stage', () => {
  it('keeps the focus canvas opaque and its caption readable', () => {
    expect(CLEAN_CSS).toContain('background-color:#0c0c0a')
    expect(CLEAN_CSS).toContain('font:400 13px/20px var(--sans)')
    expect(CLEAN_CSS).not.toContain('opacity: .72')
  })
  it('uses the same stage, orb zone, and caption for council playback', () => {
    expect(council).toContain('STAGE_STYLE')
    expect(council).toContain('STAGE_CAPTION')
    expect(council).toContain('w: STAGE_ORB, h: STAGE_ORB')
  })
})
