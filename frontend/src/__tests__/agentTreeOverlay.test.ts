import { afterEach, describe, expect, it, vi } from 'vitest'

import { agentTreeFixture } from '../agents/fixture.js'
import { EuiCards } from '../eui/cards.js'
import { openAgents, type AgentsSheetHost } from '../overlays/agents.js'
import type { Overlay } from '../overlays/overlay.js'
import { STYLES } from '../view/styles.js'
import { record } from '../wire/json.js'

import { key, must } from './fakes.js'

function setup() {
  vi.useFakeTimers()
  vi.setSystemTime(50000)
  const all = agentTreeFixture(50000)
  const overlays: Overlay[] = []
  const follow = vi.fn()
  const changed = vi.fn()
  const sheets = vi.fn()
  const eui = new EuiCards(changed)
  eui.attach({ blob: () => undefined, stylesheet: sheets }, true)
  const host: AgentsSheetHost = {
    agents: { all: () => all, follow, paused: false, pause: async value => value, steer: async () => true, stop: async () => true },
    changed, close: o => { o.onClose?.(); overlays.splice(overlays.indexOf(o), 1) }, open: o => { overlays.push(o) },
    openAgent: vi.fn(async () => undefined), eui,
    transcript: { delegations: () => [], notice: vi.fn() }
  }
  openAgents(host)
  const overlay = must(overlays[0])
  const node = () => overlay.node('layer.overlay-1')
  const text = () => JSON.stringify(node())
  return { all, host, overlay, node, text, follow, changed, sheets }
}

/** Invoke the real rendered native button handler, not a second implementation of the action. */
function clickNode(node: unknown, id: string) {
  const walk = (value: unknown): (() => void) | undefined => {
    const data = record(value)
    if (!data) return undefined
    const props = record(data['props'])
    const handler = record(data['handlers'])?.['onClick']
    if (record(props?.['attrs'])?.['data-agent-toggle'] === id && typeof handler === 'function') return () => { handler() }
    for (const child of Object.values(data)) {
      const found = Array.isArray(child) ? child.map(walk).find(Boolean) : walk(child)
      if (found) return found
    }
    return undefined
  }
  must(walk(node))()
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

describe('agents tree overlay', () => {
  it('renders state, task, elapsed, and stable collapsed context nodes', () => {
    const { text } = setup()
    const out = text()
    expect(out).toContain('Build an accessible agent tree')
    expect(out).toContain('Running')
    expect(out).toContain('42s')
    expect(out).toContain('aria-expanded')
    expect(out).toContain('Files touched')
    expect(out).toContain('Thinking')
    expect(STYLES).toContain('transition:height 200ms ease,opacity 160ms ease')
    expect(STYLES).toContain('prefers-reduced-motion: reduce')
  })

  it('shares expansion between native clicks and keys, polling only exposed contexts', () => {
    const { overlay, node, follow, all, changed } = setup()
    node()
    expect(follow).toHaveBeenLastCalledWith([])
    clickNode(node(), 'planner')
    expect(changed).toHaveBeenCalled()
    node()
    expect(follow).toHaveBeenLastCalledWith([all[0]])
    overlay.onKey(key('right'))
    overlay.onKey(key('enter'))
    node()
    expect(follow).toHaveBeenLastCalledWith([all[0], all[1]])
    expect(overlay.focus?.('layer.overlay-1')).toBe('layer.overlay-1.hub.tree.planner.body.children.ui.head')
    overlay.onKey(key('left'))
    node()
    expect(follow).toHaveBeenLastCalledWith([all[0]])
    overlay.onKey(key('left'))
    overlay.onKey(key('enter'))
    node()
    expect(follow).toHaveBeenLastCalledWith([])
    overlay.onClose?.()
    expect(follow).toHaveBeenLastCalledWith(undefined)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ticks live elapsed but keeps completed durations fixed', () => {
    const { overlay, text } = setup()
    overlay.onKey(key('tab'))
    expect(text()).toContain('8.0s')
    vi.advanceTimersByTime(2000)
    expect(text()).toContain('44s')
    expect(text()).toContain('8.0s')
  })
})
