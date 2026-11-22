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
import { LaneFeed, parseLaneStatus } from '../voice/lanes.js'
import { record } from '../wire/json.js'

import { must, tree } from './fakes.js'

import { LANES_GLASS, lanesCard, openLanesPopup, sortLanes } from '../../../glide/frontend/lanesPopup.js'
import { launchChoice } from '../../../glide/frontend/laneTopology.js'
import { NIGHT_INKS } from '../../../glide/frontend/tokens.js'
import type { EuiNode } from '../eui/sandbox.js'
import { contrastRatio, mix } from '../hermes/theme.js'
import { PROVIDERS } from '../voice/catalog.js'
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
  const draw = () => JSON.stringify(must(overlays.at(-1)).node('layer.overlay-1'))
  return { host, overlays, feed, draw, changed, transcript, eui }
}

const agent: Subagent = { calls: 0, goal: 'probe', id: 'a1', index: 0, key: subagentKey('a1'), name: 'Worker a1', startedAt: 0, status: 'running', tokens: 0, toolCount: 0 }

describe('voice lanes popup', () => {
  it('opens from the subagents card', () => {
    const { host, overlays, feed, draw } = setup()
    expect(JSON.stringify(tree(must(agentWaitNode([agent], 1000, 'lanes-test'))))).toContain('open-lanes=all')
    const none = () => undefined
    const cx: ActionCx = {
      attachNativeImage: none, connect: { approve: none, continue: none, open: none, retry: none, skip: none },
      focusComposer: none, modal: () => false, openAgent: none, openAgents: none, openProcess: none, openUrl: none,
      openLanes: () => { openLanesPopup(host, feed) }
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
    const { host, feed, draw } = setup()
    openLanesPopup(host, feed)
    const out = draw()
    const order = ['"data-lane-line":"fast"', '"data-lane-line":"small"', '"data-lane-line":"large"', '"data-lane-line":"council"'].map(s => out.indexOf(s))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(out).toContain('"data-lane-state":"dead"')
    expect(out).toContain('provider timed out')
    expect(out).toContain('1 dead')
  })

  it('says how to connect without a broker token', () => {
    const { host, draw } = setup()
    openLanesPopup(host, null)
    expect(draw()).toContain('Lane broker not connected: set the plugin setting lanes_token_file')
    expect(draw()).toContain('NOT CONNECTED')
    expect(draw()).toContain('"data-lanes-source":"none"')
  })

  it('lists the last call but does not edit a closed call', () => {
    const { host, draw } = setup()
    const call = must(parseLaneStatus({ ...status, open: false }))
    openLanesPopup(host, { call, error: '', launch: vi.fn() })
    const out = draw()
    expect(out).toContain('NO CALL OPEN')
    expect(out).toContain('Start a voice call to edit lanes')
    expect(out).toContain('provider timed out')
    expect(out).not.toContain('data-lane-remove')
    expect(out).not.toContain('data-lane-add')
  })

  it('adds, edits and removes through the rendered controls, reading broker status after each write', async () => {
    const { host, draw } = setup()
    const row = (role: string, model: string) => ({ role, model, state: 'idle' })
    const base = [row('fast', 'qwen3-0.6b-q8'), row('fast', 'qwen3-1.7b'), row('small', 'smol'), row('large', 'slow')]
    let snapshot = { session_id: 'call-1', open: true, revision: 'initial', lanes: base }
    const changes = [
      ['0 council, 2 fast, 2 small, 1 large', [...base, row('small', 'qwen3.5-4b')]],
      ['0 council, 2 fast, 2 small, set large lanes to sonnet', [...base.filter(l => l.role !== 'large'), row('small', 'qwen3.5-4b'), row('large', 'claude-sonnet-5')]],
    ] as const
    let step = 0
    const fetch = vi.fn<NonNullable<ConstructorParameters<typeof LaneFeed>[0]['fetch']>>(async (url, init) => {
      if (url.endsWith('/launch')) {
        expect(init.method).toBe('POST')
        expect(init.redirect).toBe('error')
        expect(init.headers.Authorization).toBe('Bearer fixture')
        // Finish by removing the added small lane, keeping both fast lanes and the new large model.
        expect(init.body).toBe(JSON.stringify({
          session_id: 'call-1', choice: step === 2 ? '0 council, 2 fast, 1 small, set large lanes to sonnet' : changes[step]?.[0]
        }))
        const lanes = step === 2 ? snapshot.lanes.filter(l => l.model !== 'qwen3.5-4b') : [...must(changes[step])[1]]
        snapshot = { ...snapshot, revision: `edit-${++step}`, lanes }
        return { ok: true, status: 200, json: async () => ({ ok: true, revision: snapshot.revision }) }
      }
      return { ok: true, status: 200, json: async () => snapshot }
    })
    const feed = new LaneFeed({ url: 'http://localhost:8791', token: 'fixture', fetch, changed: host.changed })
    try {
      await feed.poll()
      const overlay = must(openLanesPopup(host, feed))
      const press = (name: string, value: string) => click(overlay.node('layer.overlay-1'), value, name)
      press('data-lane-add', 'small')
      expect(draw()).toContain('Applying lane edit')
      await vi.waitFor(() => expect(draw()).toContain('"data-lane-model":"small=qwen3.5-4b"'))
      press('data-lane-pick', 'large=claude-sonnet-5')
      await vi.waitFor(() => expect(draw()).toContain('"data-lane-model":"large=claude-sonnet-5"'))
      press('data-lane-remove', 'small=qwen3.5-4b')
      await vi.waitFor(() => expect(draw()).not.toContain('"data-lane-model":"small=qwen3.5-4b"'))
      expect(draw()).toContain('Lane topology confirmed by the broker')
      expect(step).toBe(3)
    } finally {
      feed.stop()
    }
  })

  it('declines unsupported edits instead of resetting another tier or removing a required driver', () => {
    expect(launchChoice([
      { role: 'small', model: 'qwen3.5-4b' }, { role: 'large', model: 'claude-sonnet-5' }
    ])).toBeNull()
    expect(launchChoice([{ role: 'small', model: 'smol' }])).toBeNull()
  })

  it('shows broker refusal without pretending the selected model changed', async () => {
    const { host, draw } = setup()
    const call = must(parseLaneStatus({ ...status, lanes: [
      { role: 'small', model: 'smol', state: 'idle' }, { role: 'large', model: 'slow', state: 'idle' }
    ] }))
    const overlay = must(openLanesPopup(host, { call, error: '', launch: vi.fn().mockRejectedValue(new Error('Lane broker refused the edit.')) }))
    click(overlay.node('layer.overlay-1'), 'large=claude-sonnet-5')
    await vi.waitFor(() => expect(draw()).toContain('Lane broker refused the edit.'))
    expect(draw()).toContain('"data-lane-model":"large=slow"')
  })

  it('labels broker-resolved aliases and badges without inventing billing or route', () => {
    const call = must(parseLaneStatus({ ...status, lanes: [
      { role: 'fast', model: 'qwen3-0.6b-q8', state: 'idle' },
      { role: 'small', model: 'smol', state: 'idle' },
      { role: 'large', model: 'slow', state: 'idle' }
    ] }))
    const out = JSON.stringify(lanesCard({ call, error: '' }, { smol: 'claude-haiku-4-5', slow: 'claude-opus-5-5' }))
    expect(out).toContain('"text":"Claude Haiku 4.5"')
    expect(out).toContain('"text":"Claude Opus 5.5"')
    expect(out).toContain('"data-lane-provider":"fast=local"')
    expect(out).toContain('"data-lane-provider":"small=anthropic"')
    expect(out).toContain('"data-lane-billing":"small=subscription"')
    expect(out).toContain('"data-lane-effort":"large=high"')
    expect(out).not.toContain('"data-lane-route":"fast=')
  })

  it('never shows the broker revision id as text, only in the status tooltip', () => {
    const { feed } = setup()
    const out = JSON.stringify(lanesCard(feed, {}))
    expect(out).toContain('"text":"LIVE CALL"')
    expect(out).not.toMatch(/"text":"[^"]*\br7\b/i)
    expect(out).toContain('broker preset r7')
  })

  it('marks the lane picked on the orbit, and only that one', () => {
    const { host, feed, draw } = setup()
    expect(JSON.stringify(lanesCard(feed, {}))).not.toContain('data-lane-focus')
    const role = sortLanes(feed.call?.lanes ?? [])[1]?.role ?? 'none'
    openLanesPopup(host, feed, 1)
    const out = draw()
    expect(out.match(/data-lane-focus/g)).toHaveLength(1)
    expect(out).toContain(`"data-lane-focus":"${role}"`)
    expect(out).toContain('"text":"SELECTED"')
    expect(JSON.stringify(lanesCard(feed, {}, 1)).match(/order:-1/g)).toHaveLength(1) // it leads the list, so it opens in view
  })

  it('shows a legend: provider hues, effort pips and what the orbit means', () => {
    const { host, feed, draw } = setup()
    openLanesPopup(host, feed)
    expect(draw()).toContain('"data-lanes-legend":"true"')
    const out = JSON.stringify(lanesCard(feed, {}))
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
      const card = lanesCard({ call, error: '' }, {}, 1)
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
    const card = lanesCard(feed, {})
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
    const out = JSON.stringify(lanesCard(feed, {}))
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
function click(tree: unknown, pick: string, attr = 'data-lane-pick') {
  const seen = new Set<unknown>()
  const walk = (n: unknown): (() => void) | undefined => {
    if (!n || typeof n !== 'object' || seen.has(n)) return undefined
    seen.add(n)
    const o = record(n)
    const onClick = record(o?.['handlers'])?.['onClick']
    if (record(record(o?.['props'])?.['attrs'])?.[attr] === pick && typeof onClick === 'function') return () => { onClick() }
    for (const v of Object.values(o ?? {})) {
      const hit = Array.isArray(v) ? v.map(walk).find(Boolean) : walk(v)
      if (hit) return hit
    }
    return undefined
  }
  must(walk(tree))()
}
