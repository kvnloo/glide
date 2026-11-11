import { describe, expect, it, vi } from 'vitest'

import { clauseRuns, criterion, INTENT_CSS, waveform } from '../../../glide/frontend/intentCards.js'
import { euiHostPort } from '../app/eui-host.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards, euiStyles } from '../eui/cards.js'
import { HOST_APPROVE_ID, hostSnapshot } from '../eui/hostSnapshot.js'
import type { EuiNode } from '../eui/sandbox.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { decodeEuiHostCard } from '../wire/euiHostCard.js'

import { intentCommand } from '../commands/glide.js'
import type { Lane } from '../voice/lanes.js'

import { must, ofKind } from './fakes.js'
import { DEMO_ASK, intentCards } from './intentFixtures.js'

const KINDS = ['approve', 'intent-declare', 'intent-contract', 'intent-work', 'intent-proof']
const snap = (raw: unknown, status: 'pending' | 'running' | 'done' | 'failed' = 'pending') => hostSnapshot(decodeEuiHostCard(raw, KINDS), status)

/** The contract card /glide intent publishes for an ask, read off the real host registry. */
function contractOf(ask: string, lanes?: readonly Lane[]): unknown {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('fixture-session'), stored: null }
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript: new Transcript() }, () => true))
  const publish = vi.spyOn(eui.host, 'publish')
  intentCommand(eui.host, ask, lanes)
  eui.close()
  return publish.mock.calls.map(c => c[0]).find(d => typeof d === 'object' && d !== null && 'kind' in d && d.kind === 'intent-contract')
}

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

  it('says the ask once: no repeat paragraph or row list under the hero, and a whole-ask clause keys by kind', () => {
    const ask = 'Make the voice orb feel alive'
    const node = snap({ kind: 'intent-declare', app: 'ripple', title: 'One ask. Exact words.', summary: ask, rows: [{ label: 'acceptance', value: ask }] })
    expect(words(node).split(ask)).toHaveLength(2)
    expect(find(node, 'eui-host-rows')).toHaveLength(0)
    expect(find(node, 'ih-key').map(words)).toEqual(['acceptance'])
  })

  it('leaves unmatched clauses out of the text rather than inventing a phrase', () => {
    expect(clauseRuns('ship it', [{ label: 'deadline', value: 'Friday' }])).toEqual([{ text: 'ship it' }])
  })
})

describe('intent-contract hero', () => {
  it('lists every requirement with its kind, source phrase, the evidence it needs and its state', () => {
    const node = snap(contractOf(DEMO_ASK))
    expect(find(node, 'ih-kind').slice(0, 4).map(words)).toEqual(['acceptance', 'scope', 'deadline', 'proof'])
    expect(find(node, 'ih-phrase').map(words)).toEqual(['“Make the voice orb feel alive”', '“plugin”', '“Friday”', '“real-turn receipt”'])
    expect(find(node, 'ih-needs').map(words)[0]).toBe('needs a real-turn recording that shows it')
    expect(find(node, 'ih-mark').map(words)).toEqual(Array(4).fill(' missing'))
    expect(find(node, 'ih-missing').every(s => find(s, 'ih-dot').length === 1)).toBe(true)
    expect(words(node)).toContain('0/4 evidenced · 4 missing')
    expect(find(node, 'eui-host-rows')).toHaveLength(0)
    const gate = must(find(node, 'ih-hold')[0])
    expect(gate.t === 'el' && gate.id).toBe(HOST_APPROVE_ID)
    expect(find(gate, 'ih-holdfill')).toHaveLength(1)
    expect(INTENT_CSS).toMatch(/\.ih-hold:active \.ih-holdfill \{ width: 100%; transition: width 1s linear/)
    const mixed = snap(intentCards.contract)
    expect(find(mixed, 'ih-mark').map(words)).toEqual(['✓ evidenced', '✓ evidenced', ' missing'])
    expect(find(mixed, 'ih-needs').map(words)[0]).toBe('evidence · 4e1b09c2')
    expect(find(mixed, 'ih-met').flatMap(s => find(s, 'ih-dot'))).toHaveLength(0)
  })

  it('keeps every requirement one height, with phrase and need on one ellipsised line each', () => {
    expect(criterion('acceptance: Make the voice orb feel alive')).toEqual({ kind: 'acceptance', phrase: 'Make the voice orb feel alive' })
    expect(criterion('real-turn receipt')).toEqual({ kind: 'criterion', phrase: 'real-turn receipt' })
    expect(INTENT_CSS).toMatch(/\.ih-slot \{[^}]*height: 46px/)
    for (const c of ['ih-phrase', 'ih-needs']) expect(INTENT_CSS).toMatch(new RegExp(`\\.${c} \\{[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis`))
    expect(INTENT_CSS).toMatch(/\.ih-dot \{[^}]*animation: ih-pulse/)
  })

  it('draws the orchestration as fast -> fan-out(small, large) -> council, with live lane state when the broker has a call', () => {
    const node = snap(contractOf(DEMO_ASK))
    const flow = must(find(node, 'ih-flow')[0])
    const order = flow.t === 'el' ? flow.kids.map(k => k.t === 'el' ? k.cls.split(' ')[0] : '').filter(c => c !== 'ih-flowlink') : []
    expect(order).toEqual(['ih-term', 'ih-lane', 'ih-fan', 'ih-lane', 'ih-term'])
    expect(find(must(find(node, 'ih-fan')[0]), 'ih-lane').map(l => l.t === 'el' ? l.cls : '')).toEqual(['ih-lane ih-l-small', 'ih-lane ih-l-large'])
    expect(find(node, 'ih-sample')).toHaveLength(2)
    expect(words(must(find(node, 'ih-budget')[0]))).toContain('budget · sample')
    const lanes = [{ role: 'large', model: 'opus', resolved: 'claude-opus', state: 'thinking', researching: null, error: null, entry: null }] as const
    const live = snap(contractOf(DEMO_ASK, lanes))
    const large = must(find(live, 'ih-l-large')[0])
    expect(large.t === 'el' && large.attrs['data-state']).toBe('thinking')
    expect(words(large)).toContain('claude-opus')
    expect(find(live, 'ih-sample')).toHaveLength(1)
  })

  it('shows where each slice runs with a status dot, plus the council gate and the budget', () => {
    const node = snap(contractOf(DEMO_ASK))
    const hosts = find(node, 'ih-host')
    expect(hosts.map(h => words(find(h, 'ih-lrole')[0] ?? h))).toEqual(['groot', 'MBP', 'phone', 'k3s'])
    expect(hosts.map(h => find(h, 'ih-led').map(l => l.t === 'el' ? l.cls : '')[0])).toEqual(['ih-led ih-ok', 'ih-led ih-ok', 'ih-led ih-idle', 'ih-led ih-ok'])
    expect(find(must(find(node, 'ih-gate')[0]), 'ih-pip')).toHaveLength(4)
    expect(words(must(find(node, 'ih-budget')[0]))).toContain('61% of weekly quota left')
    expect(find(node, 'ih-w6')).toHaveLength(1)
  })

  it('reads approved, not completed, while any receipt is missing', () => {
    expect(words(snap(intentCards.contract, 'done'))).toContain('Approved — awaiting receipts')
    expect(words(snap(intentCards.contract, 'done'))).not.toContain('Completed')
    const all = { ...intentCards.contract, rows: intentCards.contract.rows.slice(0, 2) }
    expect(words(snap(all, 'done'))).toContain('Approved · all criteria evidenced')
    expect(words(snap({ kind: 'approve', app: 'x', title: 't', rows: [], approval: intentCards.contract.approval }, 'done'))).toContain('Completed')
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
