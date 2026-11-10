// /glide: onboard to local intelligence. Detect this machine and z0intelligence, then build an
// opt-in local corrections memory that Hermes quotes into matching turns (the plugin's
// pre_llm_call hook). Every step that writes waits for a tap on a host-owned approve card.

import type { EuiCards } from '../eui/cards.js'
import type { GatewayClient } from '@hermes/shared/gateway-client'

import type { SessionView } from '../app/ports.js'
import type { Transcript } from '../transcript/store.js'
import { commandReply } from '../wire/json.js'

export interface GlideHost {
  readonly gw: Pick<GatewayClient, 'request'>
  readonly session: Pick<SessionView, 'ref'>
  readonly transcript: Pick<Transcript, 'notice'>
  readonly eui?: Pick<EuiCards, 'host'> | undefined
}

export interface GlideMemory { sessions: number; corrections: number; complete: boolean; on: boolean; scanned?: number }
export interface GlideDetect {
  os: string
  cpus: number
  ram_gib: number | null
  gpus: string[]
  runtimes: string[]
  z0int: { installed: boolean; ok?: boolean; failed?: string[]; hint?: string; unchecked?: boolean }
  memory: GlideMemory
}

// Served by the standalone glide plugin (github.com/kvnloo/glide).
const NS = 'glide'
const APP = 'glide'
const SESSIONS = 100

const memoryRows = (m: GlideMemory) => [
  { label: 'Sessions read', value: m.sessions },
  { label: 'Corrections kept', value: m.corrections },
  { label: 'Quoted into turns', value: m.on ? 'on' : 'off' }
]

export async function glideCommand(host: GlideHost, arg: string): Promise<void> {
  const sid = host.session.ref.live
  const cards = host.eui?.host
  if (!sid || !cards) {
    host.transcript.notice('/glide needs an attached session with ephemeral-ui cards', 'warning')
    return
  }
  // Cores without plugin gateway methods answer "unknown method"; the same call then goes
  // through the plugin's `/glide json` command, which every core dispatches.
  const call = async <T>(verb: string, params: Record<string, unknown> = {}): Promise<T> => {
    try {
      return await host.gw.request<T>(`${NS}.${verb}`, { session_id: sid, ...params })
    } catch (error) {
      if (!/unknown method/i.test(error instanceof Error ? error.message : String(error))) throw error
    }
    const { output } = await host.gw.request<{ output: string }>('command.dispatch', {
      name: 'glide', arg: `json ${verb} ${JSON.stringify(params)}`, session_id: sid
    })
    return commandReply<T>(output)
  }
  const fail = (error: unknown) => {
    host.transcript.notice(`/glide: ${error instanceof Error ? error.message : String(error)}`, 'error')
  }
  const [verb, ...rest] = arg.trim().split(/\\s+/)

  try {
    if (verb === 'off') {
      const m = await call<GlideMemory>('enable', { on: false })
      cards.publish({ kind: 'receipt', app: APP, title: 'Glide memory is off', rows: memoryRows(m) })
      return
    }
    if (verb === 'recall') {
      const query = rest.join(' ')
      if (!query) {
        host.transcript.notice('Usage: /glide recall <words>', 'warning')
        return
      }
      const { hits } = await call<{ hits: { text: string; score: number }[] }>('recall', { query })
      cards.publish({
        kind: 'search', app: APP, title: `Your corrections about "${query.slice(0, 80)}"`,
        rows: hits.length ? hits.map(h => ({ label: `score ${h.score}`, value: h.text })) : [{ label: 'No match', value: 'nothing quoted' }]
      })
      return
    }
    // ---- Steps 4-6: new glide cards ----

    // Step 4: Skill router install card
    const skillRouterCard = () => cards.publish({
      kind: 'approve',
      app: APP,
      title: 'Skill Router',
      rows: [
        { label: 'Categories', value: 'See detail' },
        { label: 'Skills', value: 'See detail' },
      ],
      approval: {
        label: 'Install',
        description: 'Install the skill router catalog with tiered category rule skill ranking.',
      },
    }, async ({ signal }) => {
      try {
        const result = await call<{ installed: boolean; categories: number; skills: number; top: any[] }>('skill_router')
        if (!signal.aborted) {
          cards.publish({
            kind: 'receipt',
            app: APP,
            title: 'Skill Router installed',
            rows: [
              { label: 'Installed', value: result.installed ? 'yes' : 'no' },
              { label: 'Categories', value: result.categories },
              { label: 'Skills', value: result.skills },
              ...(result.top?.length > 0
                ? result.top.map(cat => [{ label: cat.category, value: cat.rule }])
                : []),
            ],
          })
        }
      } catch (error) {
        if (!signal.aborted) fail(error)
      }
    })

    // Step 5: Hill climb card
    const hillClimbCard = () => cards.publish({
      kind: 'approve',
      app: APP,
      title: 'Hill Climb',
      rows: [
        { label: 'Target', value: 'CPU benchmark' },
        { label: 'Metric', value: 'score' },
        { label: 'Verdict', value: '—' },
      ],
      approval: {
        label: 'Run Round',
        description: 'Run one hill-climb round with KEEP/REVERT verdict.',
      },
    }, async ({ signal }) => {
      try {
        const result = await call<{
          target: string; metric: string; baseline: { mean: number; scores: number[] } | null;
          candidate: { mean: number; scores: number[] } | null; delta: number | null;
          noise: number | null; verdict: string | null; reason: string | null
        }>('hill_climb')
        if (!signal.aborted) {
          const v = result.verdict ?? 'INCONCLUSIVE'
          cards.publish({
            kind: 'receipt',
            app: APP,
            title: 'Hill Climb Round',
            rows: [
              { label: 'Baseline mean', value: result.baseline?.mean ?? '—' },
              { label: 'Candidate mean', value: result.candidate?.mean ?? '—' },
              { label: 'Delta', value: result.delta ?? 0 },
              { label: 'Noise floor', value: result.noise ?? 0 },
              { label: 'Verdict', value: v },
              { label: 'Reason', value: result.reason ?? '—' },
            ],
          })
        }
      } catch (error) {
        if (!signal.aborted) fail(error)
      }
    })

    // Step 6: Offload savings card
    const offloadSavingsCard = () => cards.publish({
      kind: 'approve',
      app: APP,
      title: 'Offload Savings',
      rows: [
        { label: 'Local model', value: '—' },
        { label: 'Tasks', value: '—' },
        { label: 'Tokens offloaded', value: '—' },
      ],
      approval: {
        label: 'Refresh',
        description: 'Show the offload savings card with token counts and cost estimate.',
      },
    }, async ({ signal }) => {
      try {
        const result = await call<{
          local_model: string | null; tasks: number; tokens_offloaded: number;
          est_cost_saved_usd: number; assumptions: string[]
        }>('offload')
        if (!signal.aborted) {
          cards.publish({
            kind: 'receipt',
            app: APP,
            title: 'Offload Savings Card',
            rows: [
              { label: 'Local model', value: result.local_model ?? 'none' },
              { label: 'Tasks', value: result.tasks },
              { label: 'Tokens offloaded', value: result.tokens_offloaded },
              { label: 'Est. cost saved', value: `$${result.est_cost_saved_usd?.toFixed(4) ?? '0.0000'}` },
              ...(result.assumptions?.length > 0
                ? [{ label: 'Assumptions', value: result.assumptions.join('; ') }]
                : []),
            ],
          })
        }
      } catch (error) {
        if (!signal.aborted) fail(error)
      }
    })

    // Publish all new cards
    skillRouterCard()
    hillClimbCard()
    offloadSavingsCard()

    const found = await call<GlideDetect>('detect')
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
      const m = await call<GlideMemory>('enable', { on: true })
      if (!signal.aborted) cards.publish({ kind: 'receipt', app: APP, title: 'Glide memory is on', rows: memoryRows(m) })
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
        const m = await call<GlideMemory>('sync', { limit: SESSIONS })
        if (signal.aborted) return
        cards.publish({ kind: 'intent-proof', app: APP, title: 'Local memory built', rows: [...memoryRows(m), { label: 'Messages scanned', value: m.scanned ?? 0 }] })
        if (!m.on) enable()
      } catch (error) {
        fail(error)
      }
    })
  } catch (error) {
    fail(error)
  }
}