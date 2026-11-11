import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { agentWaitNode } from '../agents/tiles.js'
import { euiHostPort } from '../app/eui-host.js'
import { liveSessionId, subagentKey } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import type { Subagent } from '../model.js'
import type { Overlay } from '../overlays/overlay.js'
import { SessionState } from '../session/state.js'
import { type ActionCx, onTernEvent } from '../surface/actions.js'
import { Transcript } from '../transcript/store.js'
import { parseLaneStatus } from '../voice/lanes.js'
import { record } from '../wire/json.js'

import { must, tree } from './fakes.js'

import { fileBindings, openLanesPopup } from '../../../glide/frontend/lanesPopup.js'

// Synthetic lane call: the broker's /v1/lanes/status shape with sample models.
const status = {
  session_id: 'call-1', open: true, revision: 'r7',
  lanes: [
    { role: 'large', model: 'sample-large', resolved: null, state: 'thinking', researching: 'compare two plans', error: null, entry: null },
    { role: 'fast', model: 'sample-fast', resolved: null, state: 'answered', researching: null, error: null, entry: { text: 'the meeting moved to Friday', confidence: 0.82, status: 'draft', kind: 'answer' } },
    { role: 'council', model: 'sample-council', resolved: null, state: 'dead', researching: null, error: 'provider timed out', entry: null },
    { role: 'small', model: 'sample-small', resolved: 'sample-small-q4', state: 'verified', researching: null, error: null, entry: null }
  ]
}

function setup() {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('lanes-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  eui.attach({ blob: () => 'b1', stylesheet: vi.fn() }, true)
  const overlays: Overlay[] = []
  const changed = vi.fn()
  const host = { transcript, eui, changed, open: (o: Overlay) => { overlays.push(o) }, close: (o: Overlay) => { overlays.splice(overlays.indexOf(o), 1) } }
  const feed = { call: must(parseLaneStatus(status)), error: '' }
  const bindings = fileBindings(join(mkdtempSync(join(tmpdir(), 'lanes-')), 'bindings.json'))
  const draw = () => JSON.stringify(must(overlays.at(-1)).node('layer.overlay-1'))
  return { host, overlays, feed, bindings, draw, changed, transcript, eui }
}

const agent: Subagent = { calls: 0, goal: 'probe', id: 'a1', index: 0, key: subagentKey('a1'), name: 'Worker a1', startedAt: 0, status: 'running', tokens: 0, toolCount: 0 }

describe('voice lanes popup', () => {
  it('opens from the subagents card', () => {
    const { host, overlays, feed, bindings, draw } = setup()
    expect(JSON.stringify(tree(must(agentWaitNode([agent], 1000, 'lanes-test'))))).toContain('open-lanes=all')
    const none = () => undefined
    const cx: ActionCx = {
      attachNativeImage: none, connect: { approve: none, continue: none, open: none, retry: none, skip: none },
      focusComposer: none, modal: () => false, openAgent: none, openAgents: none, openProcess: none, openUrl: none,
      openLanes: () => { openLanesPopup(host, feed, bindings) }
    }
    onTernEvent({ ev: 'action', act: 'open-lanes', value: 'all', id: 'lanes', raw: {}, sf: 'hermes' }, cx)
    expect(overlays).toHaveLength(1)
    expect(must(overlays[0]).modal).toBe(true)
    const out = draw()
    expect(out).toContain('eui.popup')
    expect(out).toContain('Helper lanes')
    expect(out).toContain('the meeting moved to Friday')
  })

  it('renders every lane in role order, and a dead lane as dead', () => {
    const { host, feed, bindings, draw } = setup()
    openLanesPopup(host, feed, bindings)
    const out = draw()
    const order = ['"data-lane-line":"fast"', '"data-lane-line":"small"', '"data-lane-line":"large"', '"data-lane-line":"council"'].map(s => out.indexOf(s))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(out).toContain('"data-lane-state":"dead"')
    expect(out).toContain('provider timed out')
    expect(out).toContain('1 dead')
  })

  it('says why there are no lanes without a broker token', () => {
    const { host, bindings, draw } = setup()
    openLanesPopup(host, null, bindings)
    expect(draw()).toContain('no lane broker token')
    expect(draw()).toContain('"data-lanes-source":"none"')
  })

  it('a picked model rebinds its lane and is saved locally', () => {
    const { host, feed, bindings, draw, changed } = setup()
    const overlay = must(openLanesPopup(host, feed, bindings))
    expect(draw()).toContain('"data-lane-pick":"fast=sample-fast","data-lane-bound":"true"')
    expect(bindings.get()).toEqual({})
    click(overlay.node('layer.overlay-1'), 'fast=sample-large')
    expect(bindings.get()).toEqual({ fast: 'sample-large' })
    expect(readFileSync(bindings.where, 'utf8')).toContain('"fast": "sample-large"')
    expect(fileBindings(bindings.where).get()).toEqual({ fast: 'sample-large' })
    expect(changed).toHaveBeenCalled()
    expect(draw()).toContain('"data-lane-pick":"fast=sample-large","data-lane-bound":"true"')
    expect(draw()).not.toContain('"data-lane-pick":"fast=sample-fast","data-lane-bound":"true"')
    expect(draw()).toContain('BOUND LOCALLY → SAMPLE-LARGE')
  })
})

/** Presses the popup's model chip `pick` (role=model) through its rendered onClick. */
function click(tree: unknown, pick: string) {
  const seen = new Set<unknown>()
  const walk = (n: unknown): (() => void) | undefined => {
    if (!n || typeof n !== 'object' || seen.has(n)) return undefined
    seen.add(n)
    const o = record(n)
    const onClick = record(o?.['handlers'])?.['onClick']
    if (record(record(o?.['props'])?.['attrs'])?.['data-lane-pick'] === pick && typeof onClick === 'function') return () => { onClick() }
    for (const v of Object.values(o ?? {})) {
      const hit = Array.isArray(v) ? v.map(walk).find(Boolean) : walk(v)
      if (hit) return hit
    }
    return undefined
  }
  must(walk(tree))()
}
