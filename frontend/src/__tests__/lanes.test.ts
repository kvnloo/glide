import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { type JSX, Node, type Session, type Surface, Tree } from '@stencil-hq/tern'
import { describe, expect, it, vi } from 'vitest'

import { LANE_ORB, LANES_ID, LaneFeed, laneFeedFromEnv, LaneStrip, laneToken, liveDock, parseLaneStatus, speech } from '../voice/lanes.js'

import { stub } from './fakes.js'

// The broker's real shape (z0live GET /v1/lanes/status), as captured from a live call.
const STATUS = {
  session_id: 'sid1', open: true, revision: 'preset-D-smol2000-router06b', epoch: 0,
  lanes: [
    { id: 'large:slow', role: 'large', model: 'slow', resolved: 'claude-opus-5-5', route: 'voice_plan', state: 'thinking',
      error: null, researching: 'answer: what is 17 times 23', entry: null },
    { id: 'fast:qwen3-1.7b', role: 'fast', model: 'qwen3-1.7b', resolved: null, route: 'local', state: 'dead',
      error: 'URLError', researching: null, entry: null },
    { id: 'small:smol', role: 'small', model: 'smol', resolved: 'claude-haiku-4-5', route: 'voice_plan', state: 'answered',
      error: null, researching: 'answer: what is 17 times 23',
      entry: { id: 75, text: '17 times 23 is 391', confidence: 0.9, status: 'draft', kind: 'answer' } }
  ]
}

function texts(root: JSX.Element | null): { text: string; styles: string[] }[] {
  const walk = (node: JSX.Element): Node[] => (node instanceof Node ? [node, ...node.children.flatMap(walk)] : [])
  return (root ? walk(root) : [])
    .flatMap(n => {
      const spans: unknown = n.props['spans']
      if (!Array.isArray(spans)) return []
      const parts = spans.map((s: { s?: string; t: string }) => s)
      return [{ text: parts.map(s => s.t).join(''), styles: parts.map(s => s.s ?? '') }]
    })
}

function feedWith(body: unknown, ok = true) {
  const fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 401, json: async () => body }))
  const changed = vi.fn()
  return { feed: new LaneFeed({ url: 'http://broker/', token: 't0k', changed, fetch }), fetch, changed }
}

const sheets = new Map<string, string | null>()
const strip = (feed: LaneFeed, select?: (i: number) => void) => {
  const blob = vi.fn((_b: Uint8Array) => 'blob')
  const s = new LaneStrip(feed, stub<Session>({ blob, caps: { dark: false, reduceMotion: true } }),
    stub<Surface>({ closed: false, blocked: false, send: vi.fn(), stylesheet: (n: string, css: string | null) => void sheets.set(n, css) }), select)
  return s
}

describe('live lane strip', () => {
  it('accepts the broker status and refuses an unknown lane state', () => {
    expect(parseLaneStatus(STATUS)?.lanes.map(l => l.state)).toEqual(['thinking', 'dead', 'answered'])
    expect(parseLaneStatus({ ...STATUS, lanes: [{ ...STATUS.lanes[0], state: 'busy' }] })).toBeNull()
    expect(parseLaneStatus({ lanes: [] })).toBeNull()
    expect(parseLaneStatus({ session_id: null, open: false, lanes: [] })?.open).toBe(false) // device has no call yet
  })

  it('polls the broker with its token and re-renders only on change', async () => {
    const { feed, fetch, changed } = feedWith(STATUS)
    await feed.poll()
    await feed.poll()
    feed.stop()
    expect(fetch).toHaveBeenCalledWith('http://broker/v1/lanes/status', expect.objectContaining({ headers: { Authorization: 'Bearer t0k' } }))
    expect(changed).toHaveBeenCalledTimes(1)
    expect(feed.call?.sessionId).toBe('sid1')
  })

  it('says why there is no lane call instead of inventing one', async () => {
    const { feed } = feedWith({}, false)
    await feed.poll()
    feed.stop()
    const s = strip(feed)
    s.update(false)
    expect(s.node()).toBeNull() // no live voice and no open call: nothing drawn
    s.update(true)
    expect(texts(s.node()).map(t => t.text)).toEqual(['Lanes · lane broker answered 401'])
  })

  it('orbits lanes around the voice orb only in a focus block with live voice; otherwise the strip is unchanged', async () => {
    const { feed } = feedWith(STATUS)
    await feed.poll()
    feed.stop()
    const s = strip(feed)
    s.update(true, false, 'listening', false)
    expect(s.orbiting).toBe(false)
    s.update(false, false, 'idle', true)
    expect(s.orbiting).toBe(false) // focus without live voice
    s.update(true, false, 'listening', true)
    expect(s.orbiting).toBe(true)
    expect(JSON.stringify(s.node())).toContain('omp.live.lanes.orbit')
    // The animator's per-frame 'set' must address the scene image's real id in the dock, or frames only land on full renders.
    const dock = liveDock(null, s.node())
    if (!(dock instanceof Node)) throw new Error('no dock column')
    const ids = (t: Tree): string[] => [t.id, ...t.children.flatMap(ids)]
    const images = (t: Tree): string[] => [...(t.kind === 'image' ? [t.id] : []), ...t.children.flatMap(images)]
    const tree = new Tree('dock', new Node('col', {}, [dock]))
    expect(images(tree)).toContain(`${LANES_ID}.orbit.scene.bg`)
    // Each lane is a planet button over the scene; the orbit's stylesheet animates and pauses them.
    const buttons = (t: Tree): Tree[] => [...(t.props['class'] === 'glide-orbit-planet' ? [t] : []), ...t.children.flatMap(buttons)]
    expect(buttons(tree).map(b => JSON.stringify(b.props['attrs']))).toEqual(s.lanes().map((l, i) => JSON.stringify({ 'data-lane': l.role, 'data-lane-index': i })))
    expect(sheets.get('glide-orbit')).toContain('animation-play-state:paused')
    expect(buttons(tree).every(b => b.props['title'] === undefined)).toBe(true) // the CSS label names it; a title would add Tern's tooltip
    expect(ids(tree)).toContain(LANES_ID)
    // Role-less, so Tern's chat reader centres its children on the composer's track.
    expect(dock.props['role']).toBeUndefined()
    s.update(true, false, 'listening', false)
    expect(s.orbiting).toBe(false)
    expect(JSON.stringify(s.node())).not.toContain('omp.live.lanes.orbit')
    s.close()
  })

  it('draws each lane with role, model, real state, ticker and blackboard entry; dead renders dead', async () => {
    const { feed } = feedWith(STATUS)
    await feed.poll()
    feed.stop()
    const s = strip(feed)
    s.update(false)
    const lines = texts(s.node())
    expect(lines.map(t => t.text)).toEqual([
      'Lanes · 1 fast · 1 small · 1 large', // a human summary: the broker's revision id never shows
      'fast · Qwen3 1.7B · dead (URLError)',
      'small · Claude Haiku 4.5 · answered',
      'last: what is 17 times 23',
      'draft 0.90 · “17 times 23 is 391”',
      'large · Claude Opus 5.5 · thinking',
      'researching: what is 17 times 23'
    ])
    expect(lines[1]?.styles).toContain('error')
  })

  it('animates only a lane with a job in flight', () => {
    expect(Object.entries(LANE_ORB).filter(([, orb]) => orb === 'thinking').map(([s]) => s)).toEqual(['thinking'])
    expect(LANE_ORB.dead).toBe('error')
  })

  it('reads the relay token from $GLIDE_LANES_TOKEN_FILE', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'lane-token-')), 'token')
    writeFileSync(file, ' secret\n')
    expect(laneToken({ GLIDE_LANES_TOKEN_FILE: file })).toBe('secret')
    expect(laneToken({ GLIDE_LANES_TOKEN_FILE: '/nonexistent/token' })).toBe('')
  })

  it('stays off without a relay token and under tests', () => {
    expect(laneFeedFromEnv(() => undefined, { GLIDE_LANES_TOKEN_FILE: '/nonexistent/token' })).toBeNull()
    expect(laneFeedFromEnv(() => undefined, { VITEST: 'true' })).toBeNull()
  })

  it('hides a closed call', async () => {
    const { feed } = feedWith({ ...STATUS, open: false })
    await feed.poll()
    feed.stop()
    const s = strip(feed)
    s.update(false)
    expect(s.node()).toBeNull()
    // With this pane's live voice on, the broker's lanes still show their real health, marked as no open call.
    s.update(true)
    expect(texts(s.node()).map(t => t.text)[0]).toBe('Lanes · 1 fast · 1 small · 1 large · no open call')
    s.close()
  })
})

describe('lane text reads as speech', () => {
  it('drops a leading answer label and trailing router tags', () => {
    expect(speech('answer: What color do you get mixing blue and yellow paint? [kind=simple]')).toBe('What color do you get mixing blue and yellow paint?')
    expect(speech('Intent: book a table [kind=plan] [conf=0.8]')).toBe('book a table')
    expect(speech('You get green.')).toBe('You get green.')
    expect(speech(null)).toBeNull()
  })
  it('cleans broker entries and research lines on parse', () => {
    const c = parseLaneStatus({ session_id: 's', open: true, lanes: [{ role: 'fast', model: 'm', state: 'answered', researching: 'answer: x [kind=simple]', entry: { text: 'answer: green [kind=simple]', status: 'verified' } }] })
    expect(c?.lanes[0]?.entry?.text).toBe('green')
    expect(c?.lanes[0]?.researching).toBe('x')
  })
})
