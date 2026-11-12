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

import { fileBindings, LANES_GLASS, lanesCard, openLanesPopup, sortLanes } from '../../../glide/frontend/lanesPopup.js'
import { NIGHT_INKS } from '../../../glide/frontend/council.js'
import type { EuiNode } from '../eui/sandbox.js'
import { contrastRatio, mix } from '../hermes/theme.js'
import { PROVIDERS, ROLE_MODELS } from '../voice/catalog.js'
import { glideLanes } from '../commands/glide.js'

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

  it('opens from /glide lanes, the same popup as the card action', () => {
    const { host, overlays, feed, draw } = setup()
    glideLanes({ ...host, laneFeed: feed })
    expect(overlays).toHaveLength(1)
    expect(must(overlays[0]).modal).toBe(true)
    expect(draw()).toContain('eui.popup')
    expect(draw()).toContain('Helper lanes')
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

  it('says how to connect without a broker token', () => {
    const { host, bindings, draw } = setup()
    openLanesPopup(host, null, bindings)
    expect(draw()).toContain('Lane broker not connected: set the plugin setting lanes_token_file')
    expect(draw()).toContain('NOT CONNECTED')
    expect(draw()).toContain('"data-lanes-source":"none"')
  })

  it('lists the configured lanes while no call is open, dead ones dead, the bindings caveat only in a tooltip', () => {
    const { host, bindings, draw } = setup()
    const call = must(parseLaneStatus({ ...status, open: false }))
    openLanesPopup(host, { call, error: '' }, bindings)
    const out = draw()
    expect(out).toContain('"data-lanes-source":"configured"')
    expect(out).toContain('"text":"NO CALL OPEN"')
    expect(out).toContain('"title":"broker preset r7"')
    expect(out).toContain('3 of 4 lanes ready for the next call · 1 dead')
    expect(out).toContain('provider timed out')
    expect(out).toContain('"title":"Lane state comes from the lane broker; a model pick is saved on this device')
    // The bindings file's path never shows, not even in a tooltip: it would put the home folder on screen.
    expect(out).not.toContain(bindings.where)
    expect(out).not.toMatch(/\/home\/|\.config\/glide|\.cache/)
    expect(out).not.toMatch(/"text":"[^"]*binding endpoint/)
  })

  it('a picked model rebinds its lane and is saved locally', () => {
    const { host, feed, bindings, draw, changed } = setup()
    const overlay = must(openLanesPopup(host, feed, bindings))
    expect(draw()).toMatch(/"data-lane-pick":"fast=sample-fast"[^}]*"data-lane-bound":"true"/)
    expect(bindings.get()).toEqual({})
    click(overlay.node('layer.overlay-1'), 'fast=qwen3-1.7b')
    expect(bindings.get()).toEqual({ fast: 'qwen3-1.7b' })
    expect(readFileSync(bindings.where, 'utf8')).toContain('"fast": "qwen3-1.7b"')
    expect(fileBindings(bindings.where).get()).toEqual({ fast: 'qwen3-1.7b' })
    expect(changed).toHaveBeenCalled()
    expect(draw()).toMatch(/"data-lane-pick":"fast=qwen3-1.7b"[^}]*"data-lane-bound":"true"/)
    expect(draw()).not.toMatch(/"data-lane-pick":"fast=sample-fast"[^}]*"data-lane-bound"/)
    expect(draw()).toContain('"data-lane-model":"fast=qwen3-1.7b"')
    expect(draw()).toContain('"text":"Qwen3 1.7B"')
    expect(draw()).toContain('"data-lane-rebound":"fast"')
    expect(draw()).toContain('"data-lane-billing":"fast=free"')
  })

  it('offers each role only its realistic models, never another role\'s, and keeps ids in tooltips', () => {
    const real = must(parseLaneStatus({ session_id: 'c', open: false, revision: 'preset-D', lanes: [
      { role: 'fast', model: 'qwen3-0.6b-q8', resolved: null, state: 'idle' },
      { role: 'small', model: 'smol', resolved: null, state: 'idle' },
      { role: 'large', model: 'slow', resolved: null, state: 'idle' }
    ] }))
    const out = JSON.stringify(lanesCard({ call: real, error: '' }, {}, { smol: 'claude-haiku-4-5', slow: 'claude-opus-5-5' }))
    const picks = (role: string) => [...out.matchAll(new RegExp(`"data-lane-pick":"${role}=([^"]+)"`, 'g'))].map(m => m[1])
    for (const role of ['fast', 'small', 'large']) expect(picks(role)).toEqual(must(ROLE_MODELS[role]).map(x => x.id))
    expect(picks('fast')).not.toContain('slow')
    expect(picks('large')).not.toContain('qwen3-0.6b-q8')
    // Role aliases are named by the model they resolve to; the alias and id ride only in tooltips, never as text.
    expect(out).toContain('"text":"Claude Haiku 4.5"')
    expect(out).toContain('"text":"Claude Opus 5.5"')
    expect(out).toContain('"title":"smol → claude-haiku-4-5"')
    expect(out).toContain('"text":"VOICE PLAN"')
    expect(out).not.toMatch(/"text":"[^"]*\b(smol|slow)\b/)
    expect(out).toContain('"title":"qwen3-0.6b-q8"')
    // Every row is badged: provider, billing, effort, route.
    expect(out).toContain('"data-lane-provider":"fast=local"')
    expect(out).toContain('"data-lane-provider":"small=anthropic"')
    expect(out).toContain('"data-lane-billing":"small=subscription"')
    expect(out).toContain('"data-lane-effort":"large=high"')
    expect(out).toContain('"data-lane-route":"fast=local"')
    expect(out).toContain('"text":"ON DEVICE"')
    expect(out).toContain('"text":"CLOUD"')
    expect(out).toContain('"text":"Haiku 4.5"')
  })

  it('never shows the broker revision id as text, only in the status tooltip', () => {
    const { feed } = setup()
    const out = JSON.stringify(lanesCard(feed, {}, {}))
    expect(out).toContain('"text":"LIVE CALL"')
    expect(out).not.toMatch(/"text":"[^"]*\br7\b/i)
    expect(out).toContain('broker preset r7')
  })

  it('marks the lane picked on the orbit, and only that one', () => {
    const { host, feed, bindings, draw } = setup()
    expect(JSON.stringify(lanesCard(feed, {}, {}))).not.toContain('data-lane-focus')
    const role = sortLanes(feed.call?.lanes ?? [])[1]?.role ?? 'none'
    openLanesPopup(host, feed, bindings, 1)
    const out = draw()
    expect(out.match(/data-lane-focus/g)).toHaveLength(1)
    expect(out).toContain(`"data-lane-focus":"${role}"`)
    expect(out).toContain('"text":"SELECTED"')
    expect(JSON.stringify(lanesCard(feed, {}, {}, 1)).match(/order:-1/g)).toHaveLength(1) // it leads the list, so it opens in view
  })

  it('shows a legend: provider hues, effort pips and what the orbit means', () => {
    const { host, feed, bindings, draw } = setup()
    openLanesPopup(host, feed, bindings)
    expect(draw()).toContain('"data-lanes-legend":"true"')
    const out = JSON.stringify(lanesCard(feed, {}, {}))
    for (const p of ['local', 'anthropic', 'openai', 'opencode', 'groq'] as const) {
      expect(out).toContain(`"text":"${PROVIDERS[p].label}"`)
      expect(out).toContain(`background-color:${PROVIDERS[p].hue}`)
    }
    for (const e of ['Min', 'Standard', 'High', 'Max']) expect(out).toContain(`"text":"${e}"`)
    expect(out).toContain('"text":"fast 2.4 s"')
    expect(out).toContain('"text":"small 4.8 s"')
    expect(out).toContain('"text":"large 9.6 s"')
    expect(out).toContain('one dot per lane')
    expect(out).toContain('hue = provider · pips = effort · ring = role')
  })

  it('separates every pair of adjacent labels, so no two words run together even unstyled', () => {
    const { feed } = setup()
    for (const call of [feed.call, must(parseLaneStatus({ ...status, open: false }))]) {
      const card = lanesCard({ call, error: '' }, {}, {}, 1)
      // Each element's children: two elements never sit side by side without a text leaf between them.
      const walk = (n: EuiNode): void => {
        if (n.t !== 'el') return
        n.kids.forEach((k, i) => {
          if (i > 0 && k.t === 'el') expect(n.kids[i - 1]?.t, `${n.tag} child ${i}`).toBe('text')
          walk(k)
        })
      }
      walk(card)
      // Read flat, as a text extractor or an unstyled fallback does: the film's run-together strings are gone.
      const flat = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(flat).join('') : ''
      const words = flat(card).replace(/\s+/g, ' ')
      expect(words).toMatch(/LANE BROKER (LIVE CALL|NO CALL OPEN)/)
      for (const run of ['BROKERNO', 'BROKERLIVE', 'ANSWEREDLOCAL', 'SUBSCRIPTIONHIGH', 'HIGHCLOUD', 'READYSELECTED', 'SELECTEDREADY']) expect(words).not.toContain(run)
    }
  })

  it('gives each lane a role label, its model by name and a status pill, and badges only what it knows', () => {
    const { feed } = setup()
    const card = lanesCard(feed, {}, {})
    const out = JSON.stringify(card)
    expect(out).toContain('"data-lane-role":"fast"')
    expect(out).toContain('"text":"FAST"')
    const els = (n: EuiNode): Extract<EuiNode, { t: 'el' }>[] => n.t === 'el' ? [n, ...n.kids.flatMap(els)] : []
    const pill = els(card).find(e => e.kids.some(k => k.t === 'el' && k.attrs['data-lane-state'] === 'answered'))
    expect(pill?.style).toMatch(/border-radius:999px/)
    expect(pill?.style).toMatch(/border:1px solid/)
    // The sample models are not in the catalog: no UNSPECIFIED / UNKNOWN badge stands in for a fact.
    expect(out).not.toMatch(/"text":"(UNSPECIFIED|UNKNOWN)"/)
  })

  it('sits on dark glass where every NIGHT ink keeps 4.5:1, even over a white backdrop', () => {
    const { feed } = setup()
    const out = JSON.stringify(lanesCard(feed, {}, {}))
    expect(out).toContain(`background-color:${LANES_GLASS}`)
    expect(out).toContain('backdrop-filter:blur(')
    const alpha = Number(/,([\d.]+)\)$/.exec(LANES_GLASS)?.[1])
    for (const backdrop of ['#ffffff', '#808080', '#000000']) {
      const panel = mix(backdrop, '#0c0c0a', alpha) // the tint over the backdrop, as glass.test.ts composites it
      for (const ink of NIGHT_INKS) expect(contrastRatio(ink, panel), `${ink} on ${backdrop}`).toBeGreaterThanOrEqual(4.5)
    }
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
