import { describe, expect, it, vi } from 'vitest'

import { clauseRuns, INTENT_CSS, waveform } from '../../../glide/frontend/intentCards.js'
import { euiHostPort } from '../app/eui-host.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards, euiStyles } from '../eui/cards.js'
import { HOST_APPROVE_ID, hostSnapshot } from '../eui/hostSnapshot.js'
import type { EuiNode } from '../eui/sandbox.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { decodeEuiHostCard } from '../wire/euiHostCard.js'

import { must, ofKind } from './fakes.js'
import { DEMO_ASK, intentCards } from './intentFixtures.js'

const KINDS = ['approve', 'intent-declare', 'intent-contract', 'intent-work', 'intent-proof']
const snap = (raw: unknown, status: 'pending' | 'running' | 'done' | 'failed' = 'pending') => hostSnapshot(decodeEuiHostCard(raw, KINDS), status)

function find(n: EuiNode, cls: string): EuiNode[] {
  if (n.t !== 'el') return []
  const self = n.cls.split(' ').includes(cls) ? [n] : []
  return [...self, ...n.kids.flatMap(k => find(k, cls))]
}
const words = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(words).join('') : ''

describe('intent-declare hero', () => {
  it('sets the exact ask over a waveform and underlines each phrase in its clause colour', () => {
    const node = snap(intentCards.declare)
    const ask = must(find(node, 'ih-ask')[0])
    expect(words(ask)).toBe(DEMO_ASK)
    const underlined = find(node, 'ih-u').map(n => [words(n), n.t === 'el' ? n.attrs['data-clause'] : ''])
    expect(underlined).toEqual([['feel alive', 'acceptance'], ['plugin', 'scope'], ['Friday', 'deadline']])
    expect(JSON.stringify(node)).toContain('"t":"svg"')
    expect(waveform(DEMO_ASK)).toHaveLength(64)
    expect(waveform(DEMO_ASK)).toEqual(waveform(DEMO_ASK))
  })

  it('leaves unmatched clauses out of the text rather than inventing a phrase', () => {
    expect(clauseRuns('ship it', [{ label: 'deadline', value: 'Friday' }])).toEqual([{ text: 'ship it' }])
  })
})

describe('intent-contract hero', () => {
  it('draws one bar per criterion, pulses missing evidence and makes the approve button a hold gate', () => {
    const node = snap(intentCards.contract)
    expect(find(node, 'ih-bar')).toHaveLength(3)
    expect(find(node, 'ih-missing').map(words)).toEqual(['real-turn receipt'])
    const gate = must(find(node, 'ih-hold')[0])
    expect(gate.t === 'el' && gate.id).toBe(HOST_APPROVE_ID)
    expect(find(gate, 'ih-holdfill')).toHaveLength(1)
    expect(INTENT_CSS).toMatch(/\.ih-hold:active \.ih-holdfill \{ width: 100%; transition: width 1s linear/)
    expect(words(snap(intentCards.contract, 'done'))).toContain('Completed')
  })

  it('emits the existing host approve exactly once however often the gate fires', () => {
    const session = new SessionState(() => undefined)
    session.ref = { live: liveSessionId('fixture-session'), stored: null }
    const transcript = new Transcript()
    const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
    const run = vi.fn()
    eui.host.publish(intentCards.contract, run)
    const view = () => must(eui.hostView(ofKind(transcript.entries.at(-1), 'panel')))
    must(view().activate)(HOST_APPROVE_ID)
    must(view().activate)(HOST_APPROVE_ID)
    expect(run).toHaveBeenCalledTimes(1)
    expect(() => decodeEuiHostCard({ ...intentCards.proof, approval: intentCards.contract.approval }, KINDS)).toThrow()
    eui.close()
  })
})

describe('intent-work hero', () => {
  it('rails H1 -> T1 -> P1 with states, repo chips and the built != accepted seam after the built run', () => {
    const node = snap(intentCards.work)
    const rail = must(find(node, 'ih-rail')[0])
    const order = rail.t === 'el' ? rail.kids.map(k => k.t === 'el' ? k.cls.split(' ')[0] : '') : []
    expect(order).toEqual(['ih-stop', 'ih-seam', 'ih-stop', 'ih-link', 'ih-stop'])
    expect(find(node, 'ih-node').map(words)).toEqual(['H1', 'T1', 'P1'])
    expect(find(node, 'ih-state').map(words)).toEqual(['built', 'running', 'blocked'])
    expect(find(node, 'ih-repo').map(words)).toEqual(['glide', 'thinking-orbs', 'glide'])
    expect(words(must(find(node, 'ih-seam')[0]))).toBe('built ≠ accepted')
  })
})

describe('intent-proof hero', () => {
  it('counts 0 -> 1 and stamps the receipt hash only when a receipt exists', () => {
    const node = snap(intentCards.proof)
    expect(find(node, 'ih-n').map(words)).toEqual(['0', '1'])
    expect(words(must(find(node, 'ih-stamp')[0]))).toBe('9f3c2a7be01d')
    const none = snap({ ...intentCards.proof, rows: [{ label: 'receipts', value: 0 }] })
    expect(find(none, 'ih-n').map(words)).toEqual(['0'])
    expect(words(must(find(none, 'ih-stamp')[0]))).toBe('no receipt yet')
  })
})

describe('intent hero styles', () => {
  it('ship in the kit sheet, bind to theme tokens and stand still under reduced motion', () => {
    expect(euiStyles()).toContain('.ih-hero')
    expect(INTENT_CSS).toContain('var(--h-primary)')
    expect(INTENT_CSS).toMatch(/prefers-reduced-motion: reduce\) \{\s*\[data-eui='card'\] \.ih-hero \*[^{]*\{ animation: none; transition: none; \}/)
    expect(INTENT_CSS).not.toMatch(/!important|forwards/)
  })
})
