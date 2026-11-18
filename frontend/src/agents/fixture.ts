import { subagentKey } from '../core/ids.js'
import type { Subagent } from '../model.js'

/** Synthetic session data for the isolated studio. Never imported by the app entry. */
export function agentTreeFixture(now = Date.now()): Subagent[] {
  const make = (id: string, name: string, goal: string, ago: number, extra: Partial<Subagent> = {}): Subagent => ({
    calls: 2, goal, id, index: 0, key: subagentKey(id), name, startedAt: now - ago,
    status: 'running', tokens: 840, toolCount: 2, ...extra
  })
  return [
    make('planner', 'Planner', 'Build an accessible agent tree', 42000, {
      model: 'sample-planner', tool: 'delegate_task', toolPreview: 'UI and keyboard checks',
      steps: [
        { kind: 'think', at: now - 35000, text: 'Keep the existing gateway data. Expand context where each agent is working.' },
        { kind: 'tool', at: now - 30000, name: 'read_file', args: 'src/agents/hub.ts', running: false, call: { path: 'src/agents/hub.ts' } }
      ]
    }),
    make('ui', 'UI worker', 'Add tree rows and smooth expansion', 28000, {
      parentId: 'planner', depth: 1, model: 'sample-ui', tool: 'write_file', toolPreview: 'src/agents/tree.tsx', toolCount: 3,
      steps: [
        { kind: 'think', at: now - 24000, text: 'Stable keys preserve the transition. Hidden children must not receive focus.' },
        { kind: 'tool', at: now - 20000, name: 'read_file', args: 'src/agents/rows.ts', running: false, call: { path: 'src/agents/rows.ts' } },
        { kind: 'tool', at: now - 15000, name: 'write_file', args: 'src/agents/tree.tsx', running: false, call: { path: 'src/agents/tree.tsx' } }
      ]
    }),
    make('keyboard', 'Keyboard checks', 'Verify arrows, Enter, and mouse parity', 16000, {
      parentId: 'ui', depth: 2, status: 'done', duration: 12000, model: 'sample-checks', summary: 'Tree navigation checks pass.',
      steps: [
        { kind: 'tool', at: now - 12000, name: 'write_file', args: 'tests/tree.test.ts', running: false, call: { path: 'tests/tree.test.ts' } },
        { kind: 'assistant', at: now - 4000, text: 'All visible nodes remain reachable.' }
      ]
    }),
    make('review', 'Review worker', 'Check the atlas layout and reduced motion', 21000, {
      tool: 'read_file', toolPreview: 'src/agents/tree.css', model: 'sample-review',
      steps: [{ kind: 'think', at: now - 16000, text: 'Check narrow layouts and the reduced-motion preference before approval.' }]
    }),
    make('queued', 'Receipt worker', 'Summarize the verified changes', 3000, { status: 'queued', calls: 0, toolCount: 0, tokens: 0 }),
    make('failed', 'Snapshot worker', 'Capture the phone layout', 25000, { status: 'failed', duration: 8000, exitReason: 'sample timeout', summary: 'The synthetic capture timed out.' })
  ]
}
