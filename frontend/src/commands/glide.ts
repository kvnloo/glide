// /glide: onboard to local intelligence. Detect this machine and z0intelligence, then build an
// opt-in local corrections memory that Hermes quotes into matching turns (the plugin's
// pre_llm_call hook). Every step that writes waits for a tap on a host-owned approve card.

import { createHash } from 'node:crypto'

import type { EuiCards } from '../eui/cards.js'
import type { EuiApprovalContext, EuiHostHandle, EuiOperation } from '../eui/host.js'
import { MAX_HOST_ROWS } from '../wire/euiHostCard.js'
import { DIGEST_APP, FOCUS_APP, WIND_APP } from '../../../glide/frontend/attentionCards.js'
import type { GatewayClient } from '@hermes/shared/gateway-client'

import type { SessionView } from '../app/ports.js'
import type { Transcript } from '../transcript/store.js'
import { commandReply } from '../wire/json.js'
import { exportPalette, readWal, walFile, walPalette } from '../../../glide/frontend/wal.js'
import type { ThemeMode } from '../settings.js'
import { openTastePane, tasteBoard } from '../../../glide/frontend/taste.js'
import * as z from 'zod/mini'
import { focusBlock } from '../voice/orbit.js'
import type { Lane, LaneFeed } from '../voice/lanes.js'
import type { CouncilHost } from '../../../glide/frontend/councilPopup.js'
import { openLanesPopup } from '../../../glide/frontend/lanesPopup.js'

/** `/glide lanes`: the voice lanes popup, the same call as the subagents card's open-lanes action. */
export function glideLanes(host: CouncilHost & { readonly laneFeed?: Pick<LaneFeed, 'call' | 'error'> | null | undefined }): void {
  openLanesPopup(host, host.laneFeed)
}

export interface GlideHost {
  readonly gw: Pick<GatewayClient, 'request'>
  readonly session: Pick<SessionView, 'ref'>
  readonly transcript: Pick<Transcript, 'notice'>
  readonly eui?: Pick<EuiCards, 'host'> | undefined
  /** The lane broker feed, when voice lanes are configured: the contract shows their live state. */
  readonly laneFeed?: Pick<LaneFeed, 'call'> | null | undefined
  /** `/glide theme auto|default`: the same switch as `/theme`. */
  setTheme?(mode: ThemeMode): void
}

/** `/glide theme auto|default|export`: wear the wallpaper's pywal colors, go back, or write them out. */
export function glideTheme(host: Pick<GlideHost, 'setTheme' | 'transcript'>, sub: string | undefined): void {
  if (sub === 'auto' || sub === 'default') {
    host.setTheme?.(sub === 'auto' ? 'auto' : 'tern')
    host.transcript.notice(sub === 'auto' ? `Glide theme follows the wallpaper: ${walFile()}` : 'Glide theme is back to the default')
    return
  }
  if (sub === 'export') {
    const wal = readWal(walFile())
    if (!wal) {
      host.transcript.notice(`/glide theme export: no pywal colors at ${walFile()} (run wal, or set GLIDE_WAL_COLORS)`, 'warning')
      return
    }
    const palette = walPalette(wal, walFile())
    host.transcript.notice(`Glide palette written to ${exportPalette(palette)}\n${JSON.stringify(palette)}`)
    return
  }
  host.transcript.notice('Usage: /glide theme auto|default|export', 'warning')
}

const glideMemory = z.object({
  sessions: z.number(), corrections: z.number(), complete: z.boolean(), on: z.boolean(), scanned: z.optional(z.number())
})
const glideDetect = z.object({
  os: z.string(), cpus: z.number(), ram_gib: z.nullable(z.number()), gpus: z.array(z.string()), runtimes: z.array(z.string()),
  z0int: z.object({
    installed: z.boolean(), ok: z.optional(z.boolean()), failed: z.optional(z.array(z.string())),
    hint: z.optional(z.string()), unchecked: z.optional(z.boolean())
  }),
  memory: glideMemory
})
const glideRecall = z.object({ hits: z.array(z.object({ text: z.string(), score: z.number() })) })
export type GlideMemory = z.infer<typeof glideMemory>
export type GlideDetect = z.infer<typeof glideDetect>
const glideRouter = z.object({
  installed: z.boolean(), fresh: z.boolean(), categories: z.number(), skills: z.number(),
  top: z.array(z.object({ category: z.string(), rule: z.string(), skills: z.array(z.string()) }))
})
const glideClimb = z.object({
  target: z.string(), metric: z.string(),
  baseline: z.nullable(z.object({ mean: z.number() })), candidate: z.nullable(z.object({ mean: z.number() })),
  delta: z.nullable(z.number()), noise: z.nullable(z.number()),
  verdict: z.nullable(z.string()), reason: z.nullable(z.string())
})
const glideSavings = z.object({
  local_models: z.array(z.string()), tasks: z.number(), tokens_offloaded: z.number(),
  est_cost_saved_usd: z.number(), assumptions: z.array(z.string())
})

const glideFocus = z.object({
  phase: z.string(), phase_source: z.string(),
  flow: z.nullable(z.object({ flow: z.number(), confidence: z.number() })),
  next_window: z.nullable(z.string()), bedtime: z.nullable(z.string()),
  block: z.nullable(z.object({ until: z.string(), minutes_left: z.number(), minutes: z.optional(z.nullable(z.number())) })),
  guarded: z.boolean(), queued: z.number(),
  learned: z.object({
    days: z.number(), source: z.string(), stop: z.nullable(z.number()),
    windows: z.array(z.object({ start: z.number(), end: z.number(), days: z.number() }))
  }),
  digest: z.optional(z.array(z.object({ title: z.string(), cls: z.string() }))),
  wind_down: z.optional(z.object({
    nudge: z.boolean(),
    resume: z.optional(z.object({ title: z.optional(z.string()), last_asks: z.optional(z.array(z.string())) }))
  }))
})
export type GlideFocus = z.infer<typeof glideFocus>

// Served by the memory plugin in this repository's glide/ folder.
const NS = 'glide'
const APP = 'glide'
const SESSIONS = 100

const memoryRows = (m: GlideMemory) => [
  { label: 'Sessions read', value: m.sessions },
  { label: 'Corrections kept', value: m.corrections },
  { label: 'Quoted into turns', value: m.on ? 'on' : 'off' }
]

/** One glide plugin verb. Cores without plugin gateway methods answer "unknown method"; the same call
 * then goes through the plugin's `/glide json` command, which every core dispatches. */
export function glideCall(gw: Pick<GatewayClient, 'request'>, sid: string) {
  return async (verb: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    try {
      return await gw.request<unknown>(`${NS}.${verb}`, { session_id: sid, ...params })
    } catch (error) {
      if (!/unknown method/i.test(error instanceof Error ? error.message : String(error))) throw error
    }
    const { output } = await gw.request<{ output: string }>('command.dispatch', {
      name: 'glide', arg: `json ${verb} ${JSON.stringify(params)}`, session_id: sid
    })
    return commandReply<unknown>(output)
  }
}

/** Reads the block from the plugin, whichever pane started it: the focus block lives in the Hermes home. */
export async function refreshFocusBlock(gw: Pick<GatewayClient, 'request'>, sid: string): Promise<void> {
  focusBlock.note(glideFocus.parse(await glideCall(gw, sid)('focus', { action: 'show' })))
}

export async function glideCommand(host: GlideHost, arg: string): Promise<void> {
  const [first, second] = arg.trim().split(/\s+/)
  if (first === 'theme') {
    glideTheme(host, second)
    return
  }
  const ref = host.session.ref
  const sid = ref.live
  const cards = host.eui?.host
  if (!sid || !cards) {
    host.transcript.notice('/glide needs an attached session with ephemeral-ui cards', 'warning')
    return
  }
  const call = glideCall(host.gw, sid)
  const fail = (error: unknown) => {
    host.transcript.notice(`/glide: ${error instanceof Error ? error.message : String(error)}`, 'error')
  }
  const [verb, ...rest] = arg.trim().split(/\s+/)

  try {
    if (verb === 'taste') {
      const board = tasteBoard(await call('taste'))
      if (host.session.ref !== ref || host.session.ref.live !== sid) return
      const block = await openTastePane(board)
      if (host.session.ref !== ref || host.session.ref.live !== sid) return
      cards.publish({
        kind: 'receipt', app: APP, title: board.title,
        rows: [{ label: 'Taste pane', value: block }, { label: 'Board', value: board.url },
          { label: 'Close', value: 'Close the browser pane to return to chat' }]
      })
      return
    }
    if (verb === 'focus') {
      await focusCommand(cards, async (params) => {
        const f = glideFocus.parse(await call('focus', params))
        focusBlock.note(f) // live voice lanes orbit the orb while a block runs
        return f
      }, rest[0] ?? '', fail)
      return
    }
    if (verb === 'intent') {
      const ask = rest.join(' ')
      if (ask === 'proof') intentProof(cards, host.transcript)
      else if (!ask) host.transcript.notice('Usage: /glide intent <ask>', 'warning')
      else intentCommand(cards, ask, host.laneFeed?.call?.lanes)
      return
    }
    if (verb === 'off') {
      const m = glideMemory.parse(await call('enable', { on: false }))
      cards.publish({ kind: 'receipt', app: APP, title: 'Glide memory is off', rows: memoryRows(m) })
      return
    }
    if (verb === 'recall') {
      const query = rest.join(' ')
      if (!query) {
        host.transcript.notice('Usage: /glide recall <words>', 'warning')
        return
      }
      const { hits } = glideRecall.parse(await call('recall', { query }))
      cards.publish({
        kind: 'search', app: APP, title: `Your corrections about “${query.slice(0, 80)}”`,
        rows: hits.length ? hits.map(h => ({ label: `score ${h.score}`, value: h.text })) : [{ label: 'No match', value: 'nothing quoted' }]
      })
      return
    }

    // Steps 4-6 each wait for a tap and chain to the next: skill router -> one hill climb -> savings.
    const guarded = (run: (ctx: EuiApprovalContext) => Promise<void>) => async (ctx: EuiApprovalContext) => {
      try { await run(ctx) } catch (error) { fail(error) }
    }
    const fmt = (n: number | null | undefined) => n === null || n === undefined ? '—' : Number(n.toFixed(2))
    const savings = () => cards.publish({
      kind: 'approve', app: APP, title: 'Offload a small task to a local model',
      rows: [{ label: 'Task', value: 'a two-sentence summary' }, { label: 'Runs on', value: 'your smallest local model' }],
      approval: { label: 'Offload it', description: 'Sends one sample task to a local model through ollama, then shows the frontier tokens it kept out of your paid context.' }
    }, guarded(async ({ signal }) => {
      const r = glideSavings.parse(await call('offload', { run: true }))
      if (signal.aborted) return
      cards.publish({
        kind: 'intel-value', app: APP, title: 'Offload savings',
        summary: r.assumptions.join(' '),
        rows: [
          { label: 'Local model', value: r.local_models[0] ?? 'none found' },
          { label: 'Tasks offloaded', value: r.tasks },
          { label: 'Tokens kept local', value: r.tokens_offloaded },
          { label: 'Est. saved', value: `$${r.est_cost_saved_usd.toFixed(4)}` }
        ]
      })
    }))
    const climb = () => cards.publish({
      kind: 'approve', app: APP, title: 'Run your first hill climb',
      rows: [{ label: 'Target', value: 'CPU benchmark' }, { label: 'Referee', value: 'paired samples, noise floor' }],
      approval: { label: 'Run one round', description: 'Benchmarks a baseline and one candidate on this machine and keeps the candidate only if it beats the noise floor.' }
    }, guarded(async ({ signal }) => {
      const r = glideClimb.parse(await call('hill_climb', { run: true }))
      if (signal.aborted) return
      cards.publish({
        kind: 'metric', app: APP, title: r.verdict ? `Hill climb: ${r.verdict}` : 'Hill climb',
        summary: r.reason ?? '',
        rows: [
          { label: 'Baseline', value: fmt(r.baseline?.mean) },
          { label: 'Candidate', value: fmt(r.candidate?.mean) },
          { label: 'Delta', value: fmt(r.delta) },
          { label: 'Noise floor', value: fmt(r.noise) },
          { label: 'Verdict', value: r.verdict ?? 'no round yet' }
        ]
      })
      savings()
    }))
    const router = () => cards.publish({
      kind: 'approve', app: APP, title: 'Install the skill router',
      rows: [{ label: 'Picks', value: 'skills by task category' }, { label: 'Writes', value: "your profile's glide folder" }],
      approval: { label: 'Install', description: 'Installs a small category -> skills catalog so each turn loads the skills that fit the task.' }
    }, guarded(async ({ signal }) => {
      const r = glideRouter.parse(await call('skill_router'))
      if (signal.aborted) return
      cards.publish({
        kind: 'receipt', app: APP, title: r.fresh ? 'Skill router installed' : 'Skill router is installed',
        rows: [
          { label: 'Categories', value: r.categories },
          { label: 'Skills', value: r.skills },
          ...r.top.slice(0, 3).map(c => ({ label: c.category, value: c.skills.slice(0, 3).join(', ') || c.rule }))
        ]
      })
      climb()
    }))
    const steps: Record<string, () => void> = { router, climb, savings }
    const step = verb ? steps[verb] : undefined
    if (step) {
      step()
      return
    }

    const found = glideDetect.parse(await call('detect'))
    cards.publish({
      kind: 'infra-models', app: APP, title: 'This machine',
      rows: [
        { label: 'System', value: found.os },
        { label: 'CPU threads', value: found.cpus },
        { label: 'RAM', value: found.ram_gib === null ? 'unknown' : `${found.ram_gib} GiB` },
        { label: 'GPU', value: found.gpus.join(', ') || 'none found' },
        { label: 'Local runtimes', value: found.runtimes.join(', ') || 'none on PATH' }
      ]
    })
    const z0 = found.z0int
    cards.publish({
      kind: 'intel-health', app: APP, title: 'z0intelligence',
      summary: !z0.installed ? 'Optional. Adds local training loops, hill climbs and model management.'
        : z0.ok ? 'Ready for training loops and hill climbs.'
          : z0.unchecked || !z0.failed?.length ? 'Installed. Run `z0int doctor` for details.'
            : `Needs: ${z0.failed.join(', ')}`,
      rows: z0.installed ? [{ label: 'doctor', value: z0.ok ? 'ok' : z0.unchecked ? 'not checked' : 'attention' }]
        : [{ label: 'Install', value: z0.hint ?? 'pip install z0intelligence' }]
    })

    const enable = () => cards.publish({
      kind: 'approve', app: APP, title: 'Quote them into matching turns',
      rows: [{ label: 'Per turn', value: 'top 3 matching corrections' }, { label: 'Turn off', value: '/glide off' }],
      approval: {
        label: 'Turn on',
        description: 'Before each turn, Hermes searches your local corrections and quotes up to three that match. Current instructions still win.'
      }
    }, async ({ signal }) => {
      const m = glideMemory.parse(await call('enable', { on: true }))
      if (signal.aborted) return
      cards.publish({ kind: 'receipt', app: APP, title: 'Glide memory is on', rows: memoryRows(m) })
      router()
    })

    cards.publish({
      kind: 'approve', app: APP, title: found.memory.complete ? 'Refresh your local memory' : 'Build your local memory',
      rows: memoryRows(found.memory),
      approval: {
        label: found.memory.complete ? 'Refresh' : 'Build memory',
        description: `Reads your last ${SESSIONS} local Hermes sessions on this machine and keeps the corrections you gave ("no, …", "actually, …", "correction: …") under your profile's glide folder. Nothing leaves this machine.`
      }
    }, async ({ signal }) => {
      try {
        const m = glideMemory.parse(await call('sync', { limit: SESSIONS }))
        if (signal.aborted) return
        cards.publish({ kind: 'intent-proof', app: APP, title: 'Local memory built', rows: [...memoryRows(m), { label: 'Messages scanned', value: m.scanned ?? 0 }] })
        if (m.on) router()
        else enable()
      } catch (error) {
        fail(error)
      }
    })
  } catch (error) {
    fail(error)
  }
}

type Cards = NonNullable<GlideHost['eui']>['host']

/** Clauses named verbatim in the ask: acceptance (first clause), scope ("in the X"), deadline ("by X"). */
export function askClauses(ask: string): { label: string; value: string }[] {
  const acceptance = ask.split(/,|\band\b|\bby\b/)[0]?.trim().slice(0, 80)
  const scope = /\bin (?:the |my )?([\w-]+)/i.exec(ask)?.[1]
  const deadline = /\bby ([\w-]+)/i.exec(ask)?.[1]
  return [
    ...(acceptance ? [{ label: 'acceptance', value: acceptance }] : []),
    ...(scope ? [{ label: 'scope', value: scope }] : []),
    ...(deadline ? [{ label: 'deadline', value: deadline }] : [])
  ]
}

// What each clause needs before it counts: the receipt a real turn must produce.
const NEEDS: Record<string, string> = {
  acceptance: 'needs a real-turn recording that shows it',
  scope: 'needs a build + install receipt',
  deadline: 'needs the merge to land before then',
  proof: 'needs a receipt hash from a real turn'
}
// The plan's lanes in the order they run (Glide's lane broker roles): fast triages, small and large
// fan out, the council reviews. Without a live broker call these are labelled sample data.
const PLAN: readonly { role: string; job: string; model: string; host: string }[] = [
  { role: 'fast', job: 'triage', model: 'haiku', host: 'MBP' },
  { role: 'small', job: 'T2, T3', model: 'kimi', host: 'k3s' },
  { role: 'large', job: 'T1', model: 'opus', host: 'groot' },
  { role: 'council', job: 'review', model: '4 seats', host: 'groot' }
]
const SAMPLE_HOSTS = [
  { name: 'groot', value: 'online · large, council' },
  { name: 'MBP', value: 'online · fast lane' },
  { name: 'phone', value: 'idle · voice in' },
  { name: 'k3s', value: '3/3 ready · small, CI' }
]

const lastAsk = new WeakMap<Cards, string>()

// /glide intent proof: the receipt card for the last ask. Nothing has run, so it is a labelled sample:
// the stamp is the ask's own hash, standing in for the hash a real turn would leave.
function intentProof(cards: Cards, transcript: Pick<Transcript, 'notice'>): void {
  const ask = lastAsk.get(cards)
  if (!ask) {
    transcript.notice('Usage: /glide intent <ask>, then /glide intent proof', 'warning')
    return
  }
  cards.publish({
    kind: 'intent-proof', app: 'aodl', title: 'Show me the real-turn receipt',
    summary: 'Sample receipt (synthetic): no real turn has run; the stamp is the hash of the ask.',
    rows: [{ label: 'receipts', value: 1 }, { label: 'hash', value: createHash('sha256').update(ask).digest('hex').slice(0, 16) }]
  })
}

// /glide intent <ask>: the AODL loop on host cards. Declare quotes the ask; the contract drafts one
// criterion per clause (none evidenced yet) plus the orchestration, hosts, gate and budget that would
// run it; holding approve advances to a sample work rail. Nothing runs. Live lane state is used when
// the lane broker has a call; hosts and budget are sample data until Glide reads them.
export function intentCommand(cards: Cards, ask: string, live?: readonly Lane[] | null): void {
  lastAsk.set(cards, ask)
  const clauses = askClauses(ask)
  cards.publish({ kind: 'intent-declare', app: 'ripple', title: 'One ask. Exact words.', summary: ask.slice(0, 2048), rows: clauses })
  const lane = (p: typeof PLAN[number]) => {
    const l = live?.find(x => x.role === p.role)
    return { label: `lane: ${p.role}`, value: `${p.job} · ${l ? (l.resolved ?? l.model) : p.model} · ${l ? l.state : 'standby'}` }
  }
  cards.publish({
    kind: 'intent-contract', app: 'aodl', title: 'Review before execution',
    summary: 'Nothing counts until a real turn leaves its receipt.',
    rows: [
      ...[...clauses, { label: 'proof', value: 'real-turn receipt' }].map(c => ({ label: `${c.label}: ${c.value}`.slice(0, 80), value: `missing · ${NEEDS[c.label] ?? 'needs a receipt'}` })),
      { label: 'pattern', value: 'fan-out → council review' },
      ...PLAN.map(lane),
      ...SAMPLE_HOSTS.map(h => ({ label: `host: ${h.name}`, value: h.value })),
      { label: 'gate', value: 'council review · 3 of 4 seats must pass' },
      { label: 'budget', value: '≤ 40k tokens · 61% of weekly quota left' },
      { label: 'sample', value: live?.length ? 'hosts, budget' : 'lanes, hosts, budget' }
    ],
    approval: { label: 'Hold to approve', description: 'Approve this contract revision for execution. Nothing runs until approved.' }
  }, async ({ signal }) => {
    if (signal.aborted) return
    cards.publish({
      kind: 'intent-work', app: 'aodl', title: 'Implementation is not acceptance',
      summary: 'Sample work rail (synthetic): no agent has been dispatched.',
      rows: clauses.map((c, i) => ({ label: `T${i + 1}`, value: `${i === 0 ? 'running' : 'queued'} · ${c.label}` }))
    })
  })
}
type FocusCall = (params: Record<string, unknown>) => Promise<GlideFocus>

const PHASE: Record<string, string> = {
  PEAK: 'Peak', DIP: 'Afternoon dip', SECOND: 'Second wind', WIND_DOWN: 'Wind-down', PRE_SLEEP: 'Before sleep',
  SLEEP: 'Sleep', WAKE: 'Awake', TROUGH: 'Trough'
}
const phaseName = (p: string) => PHASE[p] ?? p.replace(/_/g, ' ').toLowerCase()
// Circadian gives ISO times; learned history gives HH:MM. Cards show the clock time only.
const clock = (t: string | null) => t ? (/T(\d\d:\d\d)/.exec(t)?.[1] ?? t) : 'unknown'
const hours = (f: GlideFocus) => f.learned.windows.map(w => `${String(w.start).padStart(2, '0')}:00–${String(w.end).padStart(2, '0')}:00`)

// /glide focus [MINUTES|start|stop|wind-down|hours]: the attention half. The card reads circadian and Flowkit
// when they are installed, else hours learned from your own sessions. A block holds non-critical asks
// and releases them as one digest when it ends. One focus card is live per pane: it turns from Start
// into the running ring into ended in place, and a newer /glide focus retires the older card, so the
// End block button never shows twice.
const liveFocus = new WeakMap<Cards, EuiHostHandle>()
const BLOCK = 50

const focusRows = (f: GlideFocus) => [
  { label: 'phase', value: phaseName(f.phase) },
  { label: 'flow', value: f.flow ? `${Math.round(f.flow.flow * 100)}% est.` : 'no signal' },
  { label: 'next', value: f.next_window ?? '' },
  { label: 'bedtime', value: clock(f.bedtime) },
  { label: 'block', value: f.block ? 'on' : 'off' },
  ...(f.block
    ? [{ label: 'left', value: f.block.minutes_left }, { label: 'length', value: f.block.minutes ?? f.block.minutes_left }, { label: 'until', value: f.block.until }]
    : [{ label: 'length', value: BLOCK }]),
  { label: 'held', value: f.queued }
]
const source = (f: GlideFocus) => f.phase_source === 'circadian' ? 'From your circadian schedule.' : `From ${f.learned.source}.`

export async function focusCommand(cards: Cards, call: FocusCall, sub: string, fail: (e: unknown) => void): Promise<void> {
  const guarded = (run: (ctx: EuiApprovalContext) => Promise<void>) => async (ctx: EuiApprovalContext) => {
    try { await run(ctx) } catch (error) { fail(error) }
  }
  const digest = (f: GlideFocus) => {
    const held = f.digest ?? []
    cards.publish({
      kind: 'receipt', app: DIGEST_APP, title: held.length ? `While you were in deep work: ${held.length} held` : 'Block ended, nothing held',
      rows: [{ label: 'count', value: held.length }, ...held.slice(0, MAX_HOST_ROWS - 1).map(i => ({ label: i.cls.slice(0, 80) || 'ask', value: i.title.slice(0, 2048) }))]
    })
  }
  const ended = (f: GlideFocus) => ({
    kind: 'receipt', app: FOCUS_APP, title: 'Deep-work block ended', summary: source(f), rows: focusRows({ ...f, block: null, queued: 0 })
  })
  // An ended card keeps its receipt: only a card that still has a button is retired by a newer one.
  const settle = (f: GlideFocus) => {
    const live = liveFocus.get(cards)
    liveFocus.delete(cards)
    live?.update(ended(f))
  }
  const card = (f: GlideFocus): [unknown, EuiOperation] => f.block
    ? [{
        kind: 'approve', app: FOCUS_APP, title: `Deep-work block on until ${f.block.until}`, summary: 'Agent asks are held for one digest. Critical alerts still pass.',
        rows: focusRows(f),
        approval: { label: 'End block', description: 'Ends the block and hands back everything Glide held as one digest.' }
      }, guarded(async ({ signal }) => {
        const done = await call({ action: 'stop' })
        if (signal.aborted) return
        settle(done)
        digest(done)
      })]
    : [{
        kind: 'approve', app: FOCUS_APP, title: 'Your attention', summary: source(f), rows: focusRows(f),
        approval: { label: 'Start block', description: `For the next ${BLOCK} minutes Hermes keeps replies short and holds non-critical questions and notifications for one digest at the end. Critical alerts still pass.` }
      }, guarded(async ({ signal }) => {
        const on = await call({ action: 'start', minutes: BLOCK })
        if (signal.aborted) return
        liveFocus.get(cards)?.update(...card(on))
      })]
  const show = (f: GlideFocus) => {
    liveFocus.get(cards)?.revoke()
    liveFocus.set(cards, cards.publish(...card(f)))
  }

  if (sub === 'stop') {
    // The typed command is the consent: end now, settle the live card, hand back the digest.
    const done = await call({ action: 'stop' })
    try { settle(done) } catch { /* that card already left the pane */ }
    digest(done)
    return
  }
  if (/^\d+$/.test(sub)) {
    // `/glide focus 25`: the typed command is the consent, so the block starts at once.
    show(await call({ action: 'start', minutes: Math.max(5, Math.min(240, Number(sub))) }))
    return
  }
  if (sub === 'wind-down') {
    const f = await call({ action: 'wind_down' })
    const asks = f.wind_down?.resume?.last_asks ?? []
    const now = new Date()
    cards.publish({
      kind: 'receipt', app: WIND_APP, title: "Time to wrap: here's where you left off",
      rows: [
        { label: 'now', value: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` },
        { label: 'bedtime', value: clock(f.bedtime) },
        { label: 'stop', value: f.learned.stop ?? '' },
        { label: 'best', value: f.learned.windows.map(w => `${w.start}-${w.end}`).join(', ') },
        { label: 'next', value: f.next_window ?? '' },
        ...asks.slice(0, 5).map(a => ({ label: 'ask', value: a.slice(0, 2048) }))
      ]
    })
    return
  }
  const f = await call(sub === 'start' ? { action: 'start' } : {})
  if (sub === 'hours') {
    cards.publish({
      kind: 'metric', app: APP, title: 'Your best deep-work hours',
      summary: `Learned from ${f.learned.days} days of ${f.learned.source}. An hour counts when you sent three or more messages in it.`,
      rows: [
        ...hours(f).map((h, i) => ({ label: i ? 'Also good' : 'Best', value: h })),
        { label: 'Usual stop', value: f.learned.stop === null ? 'unknown' : `${String(f.learned.stop).padStart(2, '0')}:00` }
      ]
    })
    return
  }
  show(f)
}
