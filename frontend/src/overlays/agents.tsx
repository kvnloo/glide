// The existing agents hub with inline context and nested children. Enter and clicks toggle
// expansion, arrows navigate visible nodes, O opens beside, and T retains the timeline picker.
// S steers, X confirms a stop, and P pauses or resumes new spawns gateway-wide.

import { html, type JSX, type Key, type PickerItem } from '@stencil-hq/tern'

import { agentNode } from '../agents/agentRow.js'
import {
  currentAgent,
  HUB_CLICKS,
  type HubAction,
  type HubEffect,
  hubKey,
  type HubState,
  initialHub,
  reduceHub,
  shownAgents,
  stepIds
} from '../agents/hub.js'
import { SUBAGENT_LOOK } from '../agents/look.js'
import { agentBranches } from '../agents/tree.js'
import { agentTreeFocus, agentTreeNodes } from '../agents/treeView.js'
import { actionsRow, button } from '../view/ui/button.js'
import { agentName, isRunning } from '../agents/rows.js'
import { type AgentStep, agentSteps } from '../agents/transcript.js'
import type { ChatPorts } from '../app/ports.js'
import { optional } from '../core/assert.js'
import type { Subagent } from '../model.js'
import { duration } from '../view/format.js'
import { briefOf } from '../view/tools/cards/task.js'
import { hubIconOf } from '../view/tools/registry.js'
import { facts } from '../view/ui/facts.js'

import { nativeOverlayKey } from './identity.js'
import type { Overlay } from './overlay.js'
import { countSummary, reportError, tickWhileOpen } from './sheet.js'

/** What the agents hub reaches of the app. */
export type AgentsSheetHost = Pick<ChatPorts, 'changed' | 'close' | 'eui' | 'open' | 'openAgent'> & {
  agents: Pick<ChatPorts['agents'], 'all' | 'follow' | 'pause' | 'paused' | 'steer' | 'stop'>
  transcript: Pick<ChatPorts['transcript'], 'delegations' | 'notice'>
}

const KEY = 'agents'
/** Timers and the timeline follow the clock while the sheet is open. */
const TICK_MS = 1000

/** Opens the hub, on agent `focus` when given (its timeline when `watch`). */
export function openAgents(host: AgentsSheetHost, focus?: { id: string; watch?: boolean }) {
  const agents = () => host.agents.all()
  let state: HubState = initialHub(agents(), focus?.id)

  const stopTicking = tickWhileOpen(host, TICK_MS)
  const close = () => host.close(overlay)

  const sendSteer = async (a: Subagent, text: string) => {
    await reportError(host.transcript, async () => {
      const queued = await host.agents.steer(a, text)
      host.transcript.notice(
        queued ? `Steering queued for ${agentName(a)}.` : `${agentName(a)} is not taking steering now.`,
        queued ? 'info' : 'warning'
      )
    })

    host.changed()
  }

  const stop = async (a: Subagent) => {
    await reportError(host.transcript, async () => {
      if (!(await host.agents.stop(a))) {
        host.transcript.notice(`${agentName(a)} already finished.`, 'warning')
      }
    })

    host.changed()
  }

  /** Blocks or unblocks new spawns (`delegation.pause`, every chat on the gateway); running agents keep going. */
  const togglePause = async () => {
    await reportError(host.transcript, async () => {
      const paused = await host.agents.pause(!host.agents.paused)
      host.transcript.notice(paused ? 'Subagent spawning paused for every chat on this gateway.' : 'Subagent spawning resumed.')
    })

    host.changed()
  }

  const run = (effect: HubEffect) => {
    switch (effect.kind) {
      case 'close':
        return close()

      case 'beside':
        // Opens the agent in a split beside the chat and closes the hub; its timeline here when no split can open.
        close()

        return void host.openAgent(effect.id)

      case 'steer':
        return void sendSteer(effect.agent, effect.text)

      case 'stop':
        return void stop(effect.agent)

      case 'pause':
        return void togglePause()
    }
  }

  /** Applies `action` and runs its effect; a click also re-renders (a key's render follows the key). */
  const act = (action: HubAction | undefined) => {
    if (!action) {
      return
    }

    const step = reduceHub(state, action, agents())
    state = step.state

    if (step.effect) {
      run(step.effect)
    }
  }

  const click = (action: HubAction) => {
    act(action)
    host.changed()
  }

  const handlers = Object.fromEntries(
    Object.entries(HUB_CLICKS).map(([id, action]) => [id, (ev: { value?: string }) => click(action(ev))])
  )

  const overlay: Overlay = {
    key: KEY,
    modal: true,
    cancel: close,
    focus: id => state.view.kind === 'list' && state.ask.kind === 'none'
      ? agentTreeFocus(agentBranches(agents(), state.tab === 'running'), state.selected, `${id}.hub.tree`)
      : null,
    // Ends with the sheet, however it closed (Esc, a session switch replacing the overlays).
    onClose: () => {
      stopTicking()
      host.agents.follow(undefined)
    },
    node: id => {
      const now = Date.now()
      const watched = state.view.kind === 'timeline' ? currentAgent(state, agents()) : undefined
      // Poll only context the tree exposes, or the selected timeline.
      host.agents.follow(watched ?? shownAgents(state, agents()).filter(a => state.expanded.includes(a.id)))

      return watched ? timelineNode(watched, now, id) : hubNode(now, id)
    },
    onKey: (k: Key) => {
      act(hubKey(state, k, agents()))

      return true
    }
  }

  const steerProps = (a: Subagent | undefined) =>
    state.ask.kind === 'steering' && a
      ? { placeholder: `Steer ${agentName(a)}: type, then Enter (Esc cancels)`, query: state.ask.text }
      : {}

  const actions = (a: Subagent | undefined, inTimeline: boolean) => {
    const running = Boolean(a && isRunning(a))

    if (state.ask.kind === 'confirmStop') {
      return [
        { id: 'cancel', keys: ['esc'], label: 'Cancel' },
        { id: 'confirm', keys: ['enter'], label: 'Stop', danger: true }
      ]
    }

    if (state.ask.kind === 'steering') {
      return [
        { end: true, id: 'steer-cancel', keys: ['esc'], label: 'Cancel' },
        { id: 'steer-send', keys: ['enter'], label: 'Send', primary: true }
      ]
    }

    return [
      ...(inTimeline
        ? []
        : [
            { id: 'watch', keys: ['t'], label: 'Timeline' },
            { id: 'toggle', keys: ['enter'], label: 'Toggle' },
            { id: 'beside', keys: ['o'], label: 'Beside' },
            { id: 'pause', keys: ['p'], label: host.agents.paused ? 'Resume spawns' : 'Pause spawns' }
          ]),
      // A finished agent takes neither: the buttons go rather than sit disabled.
      ...(running
        ? [
            ...(a?.steerable === false ? [] : [{ id: 'steer', keys: ['s'], label: 'Steer' }]),
            { danger: true, id: 'stop', keys: ['x'], label: 'Stop' }
          ]
        : []),
      { end: true, id: 'close', keys: ['esc'], label: inTimeline ? 'Back' : 'Close' }
    ]
  }

  const stopping = () => state.ask.kind === 'confirmStop'

  function hubNode(now: number, id: string): JSX.Element {
    const all = agents()
    const list = shownAgents(state, all)
    const running = all.filter(isRunning).length

    act({ ids: list.map(x => x.id), type: 'listed' })

    const a = list.find(x => x.id === state.selected)
    return (
      <overlay anchor="center" aria="Agents" head="Agents" key={nativeOverlayKey(id)} modal role="hermes.agents" size="lg">
        <col gap="sm" key="hub">
          <text key="summary" text={`${summary(all)}${host.agents.paused ? ' · spawns paused (gateway-wide)' : ''}`} tone="muted" />
          <row gap="sm" key="tabs">
            {button({ key: 'running', label: `Running · ${running}${state.tab === 'running' ? ' · selected' : ''}`, onClick: () => click({ type: 'tab', tab: 'running' }) })}
            {button({ key: 'all', label: `All · ${all.length}${state.tab === 'all' ? ' · selected' : ''}`, onClick: () => click({ type: 'tab', tab: 'all' }) })}
          </row>
          <html.div key="tree" attrs={{ 'data-agent-tree': '', role: 'tree', 'aria-label': 'Subagents' }}>
            {agentTreeNodes(agentBranches(all, state.tab === 'running'), state, now, agent => click({ type: 'toggle', id: agent }), host.eui ? css => host.eui?.style(css) ?? '' : undefined)}
          </html.div>
          {list.length ? null : <text key="empty" text={state.tab === 'running' ? 'No agents running. Tab shows finished ones.' : 'No subagents in this session yet'} tone="muted" />}
          {state.ask.kind === 'steering' ? <text key="steering" text={`Steer ${a ? agentName(a) : 'agent'}: ${state.ask.text}▏`} /> : null}
          {stopping() && a ? <text key="confirm" text={`Stop ${agentName(a)}? Its partial work returns to Hermes.`} tone="warning" /> : null}
          <text key="hint" text="↑ ↓ select · → expand / child · ← collapse / parent · Enter toggle" tone="muted" />
          {actionsRow(actions(a, false).map(action => ({
            key: action.id, label: action.label, keys: action.keys,
            ...optional('kind', 'danger' in action && action.danger ? 'danger' as const : 'primary' in action && action.primary ? 'primary' as const : undefined),
            onClick: () => handlers[action.id]?.({})
          })))}
        </col>
      </overlay>
    )
  }

  function timelineNode(a: Subagent, now: number, id: string): JSX.Element {
    const entries = agentSteps(a)
    const ids = stepIds(a)
    const step = state.view.kind === 'timeline' ? state.view.step : undefined
    const sel = step && ids.includes(step) ? step : ids.at(-1)
    const at = sel ? ids.indexOf(sel) : -1
    const shown = entries[at]

    return (
      <picker
        actions={actions(a, true)}
        columns={[{ format: 'dim', head: 'At', id: 'at', min: 8, priority: 2 }]}
        key={nativeOverlayKey(id)}
        {...optional('confirm', stopping() ? { act: 'confirm', label: 'Stop', text: `Stop ${agentName(a)}? Its partial work returns to Hermes.` } : undefined)}
        empty={a.steps ? 'Nothing stored yet' : 'Reading the transcript…'}
        icon="agent"
        items={entries.map((e, i) => stepItem(e, `e${i}`, a))}
        layout="timeline"
        noun="steps"
        onAction={handlers}
        onSelect={ev => click({ id: ev.item, type: 'step' })}
        preview="side"
        {...optional('selected', sel)}
        size="lg"
        subtitle={[{ s: SUBAGENT_LOOK[a.status].tone, t: SUBAGENT_LOOK[a.status].word }, { s: 'muted', t: agentLine(a, now) }]}
        title={agentName(a)}
        total={entries.length}
        {...steerProps(a)}
      >
        {shown ? stepPreview(shown, a, now, entries[at - 1]?.at, briefFor(host, a)) : [agentNode(a, now)]}
      </picker>
    )
  }

  host.open(overlay)

  if (focus?.watch) {
    act({ type: 'watch' })
  }
}

function summary(all: Subagent[]): string {
  return countSummary(all, [
    [a => a.status === 'running' || a.status === 'queued', 'running'],
    [a => a.status === 'done', 'done'],
    [a => a.status === 'failed', 'failed'],
    [a => a.status === 'cancelled', 'stopped']
  ])
}

/** The timeline's facts line: model, time so far (ticking while it runs), tools and tokens. */
function agentLine(a: Subagent, now: number): string {
  return [
    a.model?.split('/').at(-1),
    elapsed(a, now),
    `${a.toolCount} ${a.toolCount === 1 ? 'tool' : 'tools'}`,
    a.tokens ? `${a.tokens >= 1000 ? `${(a.tokens / 1000).toFixed(1)}k` : a.tokens} tokens` : undefined
  ].filter(Boolean).map(s => ` · ${s}`).join('')
}

/** Characters of one argument the preview shows. */
const ARG_CHARS = 600

function elapsed(a: Subagent, now: number): string {
  return duration(isRunning(a) ? now - a.startedAt : (a.duration ?? 0))
}

/** The brief agent `a` was given with its goal, from the delegation that started it. */
function briefFor(host: AgentsSheetHost, a: Subagent): string | undefined {
  const call = host.transcript.delegations().find(c => c.subagents?.includes(a))

  return call ? briefOf(call, a.index) : undefined
}

function stepItem(e: AgentStep, id: string, a: Subagent): PickerItem {
  if (e.kind === 'tool') {
    return {
      // The call's own command over the gateway's compact preview (`git log … + 1 command`).
      detail: typeof e.call?.['command'] === 'string' ? compactCommand(e.call['command']) : e.args,
      ...optional('dot', e.running && isRunning(a) ? 'accent' : undefined),
      facts: { at: clock(e.at) },
      icon: hubIconOf(e.name),
      id,
      label: e.name,
      mono: true,
      node: 'tool'
    }
  }

  if (e.kind === 'kickoff' || e.kind === 'assistant') {
    return { detail: plain(e.text), facts: { at: clock(e.at) }, id, label: e.kind === 'kickoff' ? 'Task' : 'Answer', node: e.kind === 'kickoff' ? 'user' : 'assistant' }
  }

  return {
    facts: { at: clock(e.at) },
    id,
    label: plain(e.kind === 'think' ? `Thinking: ${e.text}` : e.text),
    node: 'assistant',
    ...optional('tone', e.kind === 'think' || e.kind === 'note' ? 'muted' : undefined)
  }
}

/**
 * One step of `a`'s timeline. Its kickoff is the whole prompt the agent got, from the delegation
 * (the goal, then its `brief`).
 */
function stepPreview(e: AgentStep, a: Subagent, now: number, prevAt: number | undefined, brief?: string): JSX.Element[] {
  if (e.kind !== 'tool') {
    const head = { assistant: 'Answer', kickoff: 'Task', note: 'Note', think: 'Thinking' }[e.kind]

    if (e.kind === 'kickoff' && a.goal) {
      return [
        <text key="title" role="omp.hub.title" text={head} />,
        <section head="Goal" key="goal">
          <md key="text" text={a.goal} />
        </section>,
        ...(brief
          ? [
              <section head="Brief" key="brief">
                <md key="text" text={brief} />
              </section>
            ]
          : [])
      ]
    }

    return [
      <text key="title" role="omp.hub.title" text={head} />,
      <md key="body" text={e.text} {...optional('tone', e.kind === 'think' ? 'muted' : undefined)} />
    ]
  }

  return [
    <text key="title" role="omp.hub.title" spans={[{ s: 'mono strong', t: e.name }]} />,
    <kv
      items={facts([
        ['Status', e.running ? [{ s: 'accent', t: 'running' }] : [{ s: 'success', t: 'done' }]],
        ['Started', clock(e.at) || undefined],
        ['Running for', e.running && e.at !== undefined ? duration(now - e.at) : undefined]
      ])}
      key="facts"
      role="omp.hub.kv"
    />,
    ...callNodes(e)
  ]
}

/** A step's time as the clock read it (`14:05:09`); '' for a row with no time. */
function clock(at: number | undefined): string {
  return at === undefined ? '' : new Date(at).toTimeString().slice(0, 8)
}

/** A tool step's whole call, one block per argument; its one-line preview when the row has no arguments. */
function callNodes(e: Extract<AgentStep, { kind: 'tool' }>): JSX.Element[] {
  const args = Object.entries(e.call ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')

  if (!args.length) {
    return e.args ? [<section head="Call" key="call"><code key="code" text={e.args} wrap /></section>] : []
  }

  return [
    <section head="Call" key="call">
      {args.map(([k, v]) => {
        const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2)

        return (
          <section head={k} key={`a-${k}`}>
            <code key="code" text={s.length > ARG_CHARS ? `${s.slice(0, ARG_CHARS - 1)}…` : s} wrap />
          </section>
        )
      })}
    </section>
  ]
}

/**
 * A command as its timeline row shows it: on one line, with a leading `cd <dir> &&` dropped and each
 * long absolute path cut to its last two parts, so the row ends on what was run, not on the worktree.
 * The preview keeps the command whole.
 */
export function compactCommand(command: string): string {
  return oneLine(command)
    .replace(/^cd\s+\S+\s*&&\s*/, '')
    .replace(/(?:\/[^\s/'"]+){3,}(\/[^\s/'"]+\/[^\s/'"]+)/g, '…$1')
}

/** `text` on one line without inline markdown marks, for a row label. */
function plain(text: string): string {
  return oneLine(text.replace(/[`*_]+/g, ''))
}

/** `text` on one line, for a row that does not wrap. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
