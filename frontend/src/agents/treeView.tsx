import { html, type JSX } from '@stencil-hq/tern'

import type { EuiCards } from '../eui/cards.js'
import { duration } from '../view/format.js'

import type { HubState } from './hub.js'
import { SUBAGENT_LOOK } from './look.js'
import { agentName, isRunning } from './rows.js'
import { type AgentBranch, agentContext } from './tree.js'

const HEADER = 64
const CONTEXT = 112

/** Native button identity for focus and automatic scrolling of keyboard selection. */
export function agentTreeFocus(nodes: readonly AgentBranch[], selected: string | undefined, prefix: string): string | null {
  for (const node of nodes) {
    const path = `${prefix}.${node.agent.key}`
    if (node.agent.id === selected) return `${path}.head`
    const child = agentTreeFocus(node.children, selected, `${path}.body.children`)
    if (child) return child
  }
  return null
}

/** Fixed line boxes make native height transitions exact without DOM measurement or extra polling. */
export function agentTreeNodes(nodes: readonly AgentBranch[], state: HubState, now: number, toggle: (id: string) => void, style?: EuiCards['style']): JSX.Element[] {
  const height = (node: AgentBranch): number => HEADER + (state.expanded.includes(node.agent.id) ? CONTEXT + node.children.reduce((sum, child) => sum + height(child), 0) : 0)
  const draw = (node: AgentBranch, depth: number, visible: boolean): JSX.Element => {
    const a = node.agent
    const open = state.expanded.includes(a.id)
    const selected = state.selected === a.id
    const context = agentContext(a)
    const look = SUBAGENT_LOOK[a.status]
    const bodyHeight = open ? CONTEXT + node.children.reduce((sum, child) => sum + height(child), 0) : 0
    const detail = (label: string, text: string) => (
      <html.div class="agent-context-line" key={label}>
        <html.span class="agent-context-label" key="label">{label}</html.span>
        <html.span class="agent-context-text" key="value" title={text}>{text}</html.span>
      </html.div>
    )
    return (
      <html.div key={a.key} attrs={{ role: 'treeitem', 'aria-level': String(depth + 1), 'aria-expanded': String(open), 'aria-selected': String(selected), 'data-agent-id': a.id }}>
        <el tag="button"
          aria={`${open ? 'Collapse' : 'Expand'} ${agentName(a)}: ${a.goal}`}
          attrs={{ 'data-agent-toggle': a.id, 'data-selected': String(selected) }}
          class="agent-tree-head"
          disabled={!visible}
          key="head"
          onClick={() => toggle(a.id)}
        >
          <row align="center" gap="sm" key="name">
            <text key="chevron" text={open ? '⌄' : '›'} tone="muted" />
            <text grow={1} key="name" text={agentName(a)} truncate="end" wrap="none" />
            <badge key="state" text={look.word} tone={look.tone} />
            <text key="time" role="hermes.agent-tree.time" text={duration(Math.max(0, isRunning(a) ? now - a.startedAt : a.duration ?? 0))} />
          </row>
          <text key="task" role="hermes.agent-tree.task" text={a.goal} truncate="end" wrap="none" />
        </el>
        <html.div key="body" class="agent-tree-body" attrs={{
          'aria-hidden': String(!open), 'data-open': String(open),
          ...(style ? { 'data-eui-s': style(`height:${bodyHeight}px`) } : {})
        }}>
          <html.div class="agent-context" key="context">
            {detail('Current step', context.current)}
            {detail('Last tools', context.tools.join(' · ') || 'No tool calls reported')}
            {detail('Files touched', context.files.join(' · ') || 'No file paths reported')}
            {detail('Thinking', context.thinking || (a.steps ? 'No thinking excerpt reported' : 'Reading the transcript…'))}
          </html.div>
          <html.div key="children" class="agent-tree-children" attrs={{ role: 'group' }}>
            {node.children.map(child => draw(child, depth + 1, visible && open))}
          </html.div>
        </html.div>
      </html.div>
    )
  }
  return nodes.map(node => draw(node, 0, true))
}

export const AGENT_TREE_CSS = `
[data-role='hermes.agents'] [data-role='omp.actions'] { flex-wrap:wrap; }
[data-agent-tree] { font-size:13px; min-width:0; max-height:60vh; overflow:auto; }
[data-agent-tree] * { box-sizing:border-box; }
[data-agent-tree] .sf-badge { font-size:11px; }
[data-agent-tree] .agent-tree-head { display:flex; flex-direction:column; justify-content:center; gap:4px; width:100%; height:${HEADER}px; min-height:${HEADER}px; padding:10px 12px; text-align:left; border:none; border-bottom:1px solid var(--l2); border-radius:0; background:transparent; color:var(--t1); cursor:pointer; }
[data-agent-tree] .agent-tree-head[data-selected='true'] { background:var(--l2); border-left:2px solid var(--sf-p-accent,var(--accent)); }
[data-agent-tree] .agent-tree-head:focus-visible { outline:1px solid var(--sf-p-accent,var(--accent)); outline-offset:-2px; }
[data-agent-tree] [data-role='hermes.agent-tree.task'] { font-size:12px; color:var(--t2); }
[data-agent-tree] [data-role='hermes.agent-tree.time'] { font-size:11px; font-variant-numeric:tabular-nums; color:var(--t2); }
[data-agent-tree] .agent-tree-body { overflow:hidden; opacity:1; transition:height 200ms ease,opacity 160ms ease; }
[data-agent-tree] .agent-tree-body[data-open='false'] { height:0; opacity:0; pointer-events:none; }
[data-agent-tree] .agent-context { height:${CONTEXT}px; padding:8px 12px; }
[data-agent-tree] .agent-context-line { display:flex; align-items:center; height:24px; min-height:24px; gap:12px; }
[data-agent-tree] .agent-context-label { width:92px; flex-shrink:0; font-size:11px; color:var(--t2); }
[data-agent-tree] .agent-context-text { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:12px; color:var(--t1); }
[data-agent-tree] .agent-tree-children { margin-left:16px; border-left:1px solid var(--l3); }
@media (prefers-reduced-motion: reduce) { [data-agent-tree] .agent-tree-body { transition:none; } }
`
