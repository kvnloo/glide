// /factory: the content factory in chat. ComfyUI and GPU state, recent renders with their verdicts, the
// studied reference scenes, and a render that waits for a tap on a host-owned approve card (it pauses GPU
// services for a few minutes). Served by the fframestudio `factory` plugin through its `/factory json`
// command, the same seam as /glide.

import * as z from 'zod/mini'

import { decodeFactory, factoryAnswers as answers, type FactoryRun } from '../wire/factory.js'

import type { GlideHost } from './glide.js'

export type FactoryHost = GlideHost
export type { FactoryRun, FactoryScene, FactoryStatus } from '../wire/factory.js'

const APP = 'fframestudio'
const POLL_MS = 10_000
const POLL_LIMIT = 240 // 40 min, the runner's own timeout is 30

const runRows = (r: FactoryRun) => [
  { label: 'State', value: r.state },
  ...(r.seconds ? [{ label: 'Took', value: `${r.seconds} s` }] : []),
  ...(r.output ? [{ label: 'Video', value: r.output }] : []),
  ...(r.compare ? [{ label: 'Layout check', value: r.compare }] : [])
]

export async function factoryCommand(host: FactoryHost, arg: string, wait = (ms: number) => new Promise(r => setTimeout(r, ms))): Promise<void> {
  const sid = host.session.ref.live
  const cards = host.eui?.host
  if (!sid || !cards) {
    host.transcript.notice('/factory needs an attached session with ephemeral-ui cards', 'warning')
    return
  }
  const call = async <S extends z.ZodMiniType>(verb: keyof typeof answers, schema: S, params: Record<string, unknown> = {}) => {
    const { output } = await host.gw.request<{ output: string }>('command.dispatch', {
      name: 'factory', arg: `json ${verb} ${JSON.stringify(params)}`, session_id: sid
    })
    return decodeFactory(schema, output)
  }
  const fail = (error: unknown) => {
    host.transcript.notice(`/factory: ${error instanceof Error ? error.message : String(error)}`, 'error')
  }
  const [verb = '', ...rest] = arg.trim().split(/\s+/)

  const offerRender = (run: string) => cards.publish({
    kind: 'approve', app: APP, title: `Render ${run}`,
    rows: [{ label: 'Pauses', value: 'z0-farm-llama, d1-decision-server' }, { label: 'Typical', value: '~4 min on this GPU' }],
    approval: {
      label: 'Render',
      description: 'Runs this shot\'s ComfyUI workflow again. The local llama and decision services pause for the render and restart when it ends, even if it fails.'
    }
  }, async ({ signal }) => {
    try {
      await call('render', answers.render, { run })
      cards.publish({ kind: 'deploy', app: APP, title: `Rendering ${run}`, rows: [{ label: 'State', value: 'started' }] })
      for (let i = 0; i < POLL_LIMIT && !signal.aborted; i++) {
        await wait(POLL_MS)
        const r = (await call('runs', answers.runs)).runs.find(x => x.run === run)
        if (r && (r.state === 'done' || r.state === 'failed')) {
          cards.publish({ kind: r.state === 'done' ? 'intent-proof' : 'incident', app: APP,
            title: `${run} ${r.state === 'done' ? 'rendered' : 'failed'}`, rows: runRows(r) })
          return
        }
      }
    } catch (error) {
      fail(error)
    }
  })

  try {
    if (verb === 'scenes') {
      const query = rest.join(' ')
      if (!query) {
        host.transcript.notice('Usage: /factory scenes <words>', 'warning')
        return
      }
      const { hits } = await call('scenes', answers.scenes, { query })
      cards.publish({
        kind: 'search', app: APP, title: `Studied scenes for “${query.slice(0, 80)}”`,
        rows: hits.length
          ? hits.map(h => ({ label: `${h.scene} · ${h.videos} videos`, value: `${h.direction.slice(0, 400)}\n${h.takes[0] ?? ''}` }))
          : [{ label: 'No match', value: 'try other words' }]
      })
      return
    }
    if (verb === 'render') {
      if (!rest[0]) {
        host.transcript.notice('Usage: /factory render <run>', 'warning')
        return
      }
      offerRender(rest[0])
      return
    }

    const s = await call('status', answers.status)
    cards.publish({
      kind: 'infra-models', app: APP, title: 'Content factory',
      rows: [
        { label: 'ComfyUI', value: s.comfy.running ? 'up' : s.comfy.error ? `unknown: ${s.comfy.error}` : 'down (starts per render)' },
        { label: 'VRAM free', value: s.comfy.free_vram_mb === undefined ? 'unknown' : `${s.comfy.free_vram_mb} MB` },
        { label: 'Rendering', value: s.rendering ?? 'nothing' }
      ]
    })
    for (const r of s.runs.slice(0, 3)) {
      cards.publish({ kind: 'receipt', app: APP, title: r.run, ...(r.verdict ? { summary: r.verdict } : {}), rows: runRows(r) })
    }
    const latest = s.runs[0]
    if (latest && !s.rendering) offerRender(latest.run)
  } catch (error) {
    fail(error)
  }
}
