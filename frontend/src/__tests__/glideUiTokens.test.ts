// Restyle is tokens-only: the native glide/v1 sheet carries no colour of its own, so an agent palette
// change (glide/frontend/tokens.ts, chrome/theme.ts) retints every card and future dock widget.
import { describe, expect, it } from 'vitest'

import { DASH, NIGHT } from '../../../glide/frontend/tokens.js'
import { UI_CSS } from '../glideui/render.js'

describe('glide/v1 sheet', () => {
  it('names no colour literal outside a themed var() fallback taken from the tokens', () => {
    const bare = UI_CSS.replace(/var\(--[\w-]+,([^()]|\([^()]*\))*\)/g, '')
    expect(bare.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi) ?? []).toEqual([])
    expect(UI_CSS).toContain(`var(--sf-accent,${DASH.gold})`)
    expect(UI_CSS).toContain(`var(--sf-border,${NIGHT.border})`)
  })
})
