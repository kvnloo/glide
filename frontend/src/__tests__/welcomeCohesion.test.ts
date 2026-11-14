import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { welcomeNode } from '../view/welcome.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

describe('compact welcome lockup', () => {
  it('uses an unboxed column and keeps the optional mark at 32 px', () => {
    const node = JSON.parse(JSON.stringify(welcomeNode('welcome', { logo: 'sample-mark', version: 'v0.2.0' })))
    expect(node).toMatchObject({ k: 'col', p: { role: 'omp.welcome' } })
    const out = JSON.stringify(node)
    expect(out).not.toContain('"k":"card"')
    expect(out).toContain('"w":32')
    expect(out).toContain('"h":32')
    expect(out).toContain('Ask anything, or type / for commands.')
  })

  it('keeps the wordmark and tip without a logo or version', () => {
    const out = JSON.stringify(welcomeNode('welcome', { version: '' }))
    expect(out).toContain('hermes')
    expect(out).not.toContain('"k":"image"')
    expect(out).not.toContain('omp.welcome.version')
    expect(out).toContain('omp.welcome.tip')
  })

  it('uses design tokens for the welcome styles', () => {
    expect(tokenDrift(readFileSync(new URL('../view/welcome.tsx', import.meta.url), 'utf8'))).toEqual(NO_DRIFT)
  })
})
