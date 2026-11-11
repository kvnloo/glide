// The agents hub (`/agents`, ⌥A, the agents pill): every subagent of the session in one
// `picker` sheet, as omp's hub draws them (a tree when orchestrators spawned workers, status
// dots, tool counts and timers), the selected one previewed as its live `agent` row, facts and
// latest activity. Enter opens the agent beside the chat (watch/: its full transcript, live,
// with a composer that steers it). T opens its timeline in this sheet instead (its stored
// transcript from the gateway, one row per step, following the newest). The agent the sheet shows
// is the one whose transcript the store reads. S steers a running agent (the
// search line becomes the message), X stops it. P pauses (or resumes) new spawns, gateway-wide.

import type { JSX, Key, PickerColumn, PickerItem } from '@stencil-hq/tern'

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
export type AgentsSheetHost = Pick<ChatPorts, 'agents' | 'changed' | 'close' | 'open' | 'openAgent' | 'transcript'>

const KEY = 'agents'
/** Timers and the timeline follow the clock while the sheet is open. */
const TICK_MS = 1000
const RECENT = 6

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
    // Ends with the sheet, however it closed (Esc, a session switch replacing the overlays).
    onClose: () => {
      stopTicking()
      host.agents.follow(undefined)
    },
    node: id => {
      const now = Date.now()
      const watched = state.view.kind === 'timeline' ? currentAgent(state, agents()) : undefined
      // The agent previewed or opened is the one whose transcript is read.
      host.agents.follow(currentAgent(state, agents()))

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
            { id: 'beside', keys: ['enter'], label: 'Open beside', primary: true },
            { id: 'pause', keys: ['p'], label: host.agents.paused ? 'Resume spawns' : 'Pause spawns' }
          ]),
      // A finished agent takes neither: the buttons go rather than sit disabled.
      ...(running
        ? [
            { ...optional('disabled', a?.steerable === false ? 'Not taking steering now' : undefined), id: 'steer', keys: ['s'], label: 'Steer' },
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
    const columns: PickerColumn[] = [
      { format: 'num', head: 'Tools', id: 'tools', priority: 3 },
      { format: 'elapsed', head: 'Time', id: 'time', priority: 5 }
    ]

    return (
      <picker
        actions={actions(a, false)}
        columns={columns}
        key={nativeOverlayKey(id)}
        {...optional('confirm', stopping() && a ? { act: 'confirm', label: 'Stop', text: `Stop ${agentName(a)}? Its partial work returns to Hermes.` } : undefined)}
        empty={state.tab === 'running' ? 'No agents running. Tab shows finished ones.' : 'No subagents in this session yet'}
        icon="agents"
        items={all.map(x => hubItem(x, now))}
        layout={all.some(x => x.depth) ? 'tree' : 'rows'}
        noun="agents"
        onAction={handlers}
        onActivate={ev => act({ id: ev.item, type: 'beside' })}
        onSelect={ev => click({ id: ev.item, type: 'select' })}
        order={list.map(x => x.id)}
        preview="side"
        {...optional('selected', state.selected)}
        size="lg"
        subtitle={[
          { s: 'muted', t: summary(all) },
          ...(host.agents.paused ? [{ s: 'warning', t: ' · spawns paused (gateway-wide)' }] : [])
        ]}
        tab={state.tab}
        tabs={[
          { count: running, id: 'running', label: 'Running' },
          { count: all.length, id: 'all', label: 'All' }
        ]}
        title="Agents"
        total={all.length}
        {...steerProps(a)}
      >
        {a ? hubPreview(a, now, briefFor(host, a)) : null}
      </picker>
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

function hubItem(a: Subagent, now: number): PickerItem {
  return {
    ...optional('chips', a.model ? [{ text: a.model.split('/').at(-1) ?? a.model }] : undefined),
    depth: a.depth ?? 0,
    detail: a.goal,
    dot: SUBAGENT_LOOK[a.status].tone,
    facts: { time: elapsed(a, now), tools: a.toolCount },
    id: a.id,
    label: agentName(a),
    title: a.goal
  }
}

/** The brief agent `a` was given with its goal, from the delegation that started it. */
function briefFor(host: AgentsSheetHost, a: Subagent): string | undefined {
  const call = host.transcript.delegations().find(c => c.subagents?.includes(a))

  return call ? briefOf(call, a.index) : undefined
}

function hubPreview(a: Subagent, now: number, brief?: string): JSX.Element[] {
  const recent = agentSteps(a).slice(-RECENT)
  const look = SUBAGENT_LOOK[a.status]

  return [
    // A new node each time the selection moves: its timers need their true ages.
    agentNode(a, now),
    <kv
      items={facts([
        ['Status', [{ s: look.tone, t: look.word }]],
        ['Model', a.model],
        ['Time', elapsed(a, now)],
        ['Tools', String(a.toolCount)],
        ['Ended', a.exitReason?.replace(/_/g, ' ')],
        ['Steering', isRunning(a) && a.steerable !== undefined ? (a.steerable ? 'open' : 'closed') : undefined],
        ['ID', [{ s: 'mono dim', t: a.id }]]
      ])}
      key="facts"
      role="omp.hub.kv"
    />,
    <section head="Task" key="task">
      <md key="goal" text={a.goal} />
    </section>,
    ...(brief
      ? [
          <section collapsed collapsible head="Brief" key="brief">
            <md key="text" text={brief} />
          </section>
        ]
      : []),
    ...(a.summary
      ? [
          <section head="Result" key="result">
            <md key="summary" text={a.summary} />
          </section>
        ]
      : []),
    ...(recent.length
      ? [
          <section head="Recent activity" key="recent" role="omp.hub.activity">
            {recent.map((e, i) => (
              <row gap="sm" key={`r${i}`} role="omp.hub.activity.row">
                <text key="at" spans={[{ s: 'dim mono', t: clock(e.at) }]} wrap="none" />
                <text grow={1} key="what" spans={stepSpans(e)} truncate="end" wrap="none" />
              </row>
            ))}
          </section>
        ]
      : [])
  ]
}

function stepItem(e: AgentStep, id: string, a: Subagent): PickerItem {
  if (e.kind === 'tool') {
    return {
      // The call's own command over the gateway's compact preview (`git log … + 1 command`).
      detail: typeof e.call?.command === 'string' ? compactCommand(e.call.command) : e.args,
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

function stepSpans(e: AgentStep): { s?: string; t: string }[] {
  switch (e.kind) {
    case 'tool':
      return [
        { s: 'mono', t: e.name },
        { s: 'muted', t: ` ${e.args}` }
      ]

    case 'think':
      return [{ s: 'muted', t: oneLine(e.text) }]

    case 'kickoff':
      return [{ s: 'dim', t: 'Task: ' }, { t: oneLine(e.text) }]

    case 'assistant':

    case 'note':
      return [{ t: oneLine(e.text) }]
  }
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
