import { describe, expect, it } from 'vitest'

import { hubKey, initialHub, reduceHub, shownAgents } from '../agents/hub.js'
import { agentContext, agentForest } from '../agents/tree.js'
import { subagentKey } from '../core/ids.js'
import type { Subagent } from '../model.js'

import { key, must } from './fakes.js'

function agent(id: string, parentId?: string): Subagent {
  return { calls: 0, goal: `Task ${id}`, id, index: 0, key: subagentKey(id), startedAt: 0, status: 'running', tokens: 0, toolCount: 0, ...(parentId ? { parentId } : {}) }
}

const root = agent('root')
const child = agent('child', 'root')
const leaf = agent('leaf', 'child')
const peer = agent('peer')
const all = [leaf, root, peer, child]

describe('expandable agent tree', () => {
  it('orders by parent identity, not reported depth or arrival order', () => {
    const forest = agentForest(all)
    expect(forest.map(n => n.agent.id)).toEqual(['root', 'peer'])
    expect(forest[0]?.children[0]?.children[0]?.agent.id).toBe('leaf')
    expect(shownAgents(initialHub(all), all).map(a => a.id)).toEqual(['root', 'peer'])
  })

  it('uses Enter and arrows to expand, visit children, and return to parents', () => {
    let state = { ...initialHub(all), selected: 'root' }
    const press = (name: string) => {
      const action = hubKey(state, key(name), all)
      const step = reduceHub(state, must(action), all)
      expect(step.effect).toBeUndefined()
      state = { ...step.state, selected: step.state.selected ?? '' }
    }
    press('enter')
    expect(shownAgents(state, all).map(a => a.id)).toEqual(['root', 'child', 'peer'])
    press('right')
    expect(state.selected).toBe('child')
    press('right')
    press('right')
    expect(state.selected).toBe('leaf')
    press('left')
    expect(state.selected).toBe('child')
    press('left')
    expect(shownAgents(state, all).map(a => a.id)).toEqual(['root', 'child', 'peer'])
    press('left')
    expect(state.selected).toBe('root')
    press('enter')
    expect(shownAgents(state, all).map(a => a.id)).toEqual(['root', 'peer'])
  })

  it('keeps running children reachable beneath an ended parent', () => {
    const agents = [{ ...root, status: 'done' as const }, child]
    const state = initialHub(agents)
    expect(shownAgents(state, agents).map(a => a.id)).toEqual(['root'])
    expect(state.selected).toBe('root')
  })

  it('surfaces orphans and cycles once without recursion loops', () => {
    const nodes = agentForest([agent('a', 'b'), agent('b', 'a'), agent('lost', 'missing'), agent('self', 'self')])
    const ids = (list: typeof nodes): string[] => list.flatMap(n => [n.agent.id, ...ids(n.children)])
    expect(ids(nodes).sort()).toEqual(['a', 'b', 'lost', 'self'])
  })

  it('extracts recent tools, explicit file paths, and a short thinking excerpt', () => {
    const a = { ...root, tool: 'read_file', toolPreview: 'src/view.ts', toolCount: 3, steps: [
      { kind: 'think' as const, at: 1, text: 'Check the keyboard route. '.repeat(30) },
      { kind: 'tool' as const, at: 2, name: 'write_file', args: 'src/tree.ts', running: false, call: { path: 'src/tree.ts' } },
      { kind: 'tool' as const, at: 3, name: 'patch', args: 'tests/tree.test.ts', running: false, call: { patch: '*** Begin Patch\n*** Update File: tests/tree.test.ts\n@@\n-old\n+new\n*** End Patch' } }
    ] }
    const context = agentContext(a)
    expect(context.current).toContain('read_file')
    expect(context.tools).toHaveLength(3)
    expect(context.files).toEqual(['src/tree.ts', 'tests/tree.test.ts'])
    expect(context.thinking.length).toBeLessThanOrEqual(180)
    expect(context.thinking).toContain('Check the keyboard route.')
    expect(agentContext(root)).toMatchObject({ files: [], thinking: '', tools: [] })
  })
})
