// /glide: onboard to local intelligence. Detect this machine and z0intelligence, then build an
// opt-in local corrections memory that Hermes quotes into matching turns (the plugin's
// pre_llm_call hook). Every step that writes waits for a tap on a host-owned approve card.

import type { EuiCards } from '../eui/cards.js'
import type { EuiApprovalContext } from '../eui/host.js'
import type { GatewayClient } from '@hermes/shared/gateway-client'

import type { SessionView } from '../app/ports.js'
import type { Transcript } from '../transcript/store.js'
import { commandReply } from '../wire/json.js'
import { openTastePane, tasteBoard } from '../../../glide/frontend/taste.js'
import * as z from 'zod/mini'

export interface GlideHost {
  readonly gw: Pick<GatewayClient, 'request'>
  readonly session: Pick<SessionView, 'ref'>
  readonly transcript: Pick<Transcript, 'notice'>
  readonly eui?: Pick<EuiCards, 'host'> | undefined
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

// Served by the memory plugin in this repository's glide/ folder.
const NS = 'glide'
const APP = 'glide'
const SESSIONS = 100

const memoryRows = (m: GlideMemory) => [
  { label: 'Sessions read', value: m.sessions },
  { label: 'Corrections kept', value: m.corrections },
  { label: 'Quoted into turns', value: m.on ? 'on' : 'off' }
]

export async function glideCommand(host: GlideHost, arg: string): Promise<void> {
  const ref = host.session.ref
  const sid = ref.live
  const cards = host.eui?.host
  if (!sid || !cards) {
    host.transcript.notice('/glide needs an attached session with ephemeral-ui cards', 'warning')
    return
  }
  // Cores without plugin gateway methods answer "unknown method"; the same call then goes
  // through the plugin's `/glide json` command, which every core dispatches.
  const call = async (verb: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    try {
      return await host.gw.request<unknown>(`${NS}.${verb}`, { session_id: sid, ...params })
    } catch (error) {
      if (!/unknown method/i.test(error instanceof Error ? error.message : String(error))) throw error
    }
    const { output } = await host.gw.request<{ output: string }>('command.dispatch', {
      name: 'glide', arg: `json ${verb} ${JSON.stringify(params)}`, session_id: sid
    })
    return commandReply<unknown>(output)
  }
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
