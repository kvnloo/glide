import type { Subagent } from '../model.js'

import { isRunning } from './rows.js'
import { agentSteps } from './transcript.js'

export interface AgentBranch {
  agent: Subagent
  children: AgentBranch[]
}

/** Parent identity owns hierarchy. Orphans and malformed cycles remain reachable exactly once. */
export function agentForest(agents: readonly Subagent[]): AgentBranch[] {
  const nodes = new Map<string, AgentBranch>(agents.map(agent => [agent.id, { agent, children: [] }]))
  const roots: AgentBranch[] = []
  for (const node of nodes.values()) {
    const seen = new Set([node.agent.id])
    let parent = node.agent.parentId ? nodes.get(node.agent.parentId) : undefined
    const direct = parent
    while (parent && !seen.has(parent.agent.id)) {
      seen.add(parent.agent.id)
      parent = parent.agent.parentId ? nodes.get(parent.agent.parentId) : undefined
    }
    if (!direct || parent) roots.push(node)
    else direct.children.push(node)
  }
  return roots
}

/** A running tab retains ended ancestors that lead to running children. */
export function agentBranches(agents: readonly Subagent[], runningOnly: boolean): AgentBranch[] {
  const keep = (nodes: AgentBranch[]): AgentBranch[] => nodes.flatMap(node => {
    const children = keep(node.children)
    return !runningOnly || isRunning(node.agent) || children.length ? [{ ...node, children }] : []
  })
  return keep(agentForest(agents))
}

export function visibleAgents(nodes: readonly AgentBranch[], expanded: readonly string[]): Subagent[] {
  return nodes.flatMap(node => [node.agent, ...(expanded.includes(node.agent.id) ? visibleAgents(node.children, expanded) : [])])
}

const line = (text: string) => text.replace(/\s+/g, ' ').trim()
const short = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1)}…` : text

/** Only explicit file-tool arguments count as touched files. Commands and prose are not parsed as paths. */
export function agentContext(agent: Subagent) {
  const steps = agentSteps(agent)
  const tools = steps.filter(step => step.kind === 'tool')
  const files = new Set<string>()
  for (const tool of tools) {
    if (!['read_file', 'write_file', 'edit_file', 'patch', 'apply_patch'].includes(tool.name)) continue
    const call = tool.call
    const path = call?.['path'] ?? call?.['file_path'] ?? call?.['target_file']
    if (typeof path === 'string' && path.trim()) files.add(path)
    const patch = call?.['patch'] ?? call?.['patch_text']
    if (typeof patch === 'string') {
      for (const match of patch.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)) {
        if (match[1]) files.add(match[1].trim())
      }
    }
  }
  const latest = steps.at(-1)
  const thought = steps.findLast(step => step.kind === 'think')
  return {
    current: agent.tool ? line(`${agent.tool} ${agent.toolPreview ?? ''}`)
      : latest ? line(latest.kind === 'tool' ? `${latest.name} ${latest.args}` : latest.text)
        : agent.status === 'queued' ? 'Waiting for a slot' : agent.summary ?? 'No step reported yet',
    tools: tools.slice(-3).map(tool => line(`${tool.name} ${tool.args}`)),
    files: [...files],
    thinking: thought && thought.kind !== 'tool' ? short(line(thought.text), 180) : ''
  }
}
