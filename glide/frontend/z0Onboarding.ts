import * as z from 'zod/mini'

import type { EuiCards } from '../../frontend/src/eui/cards.js'

const reply = z.object({
  status: z.string(),
  resident: z.optional(z.array(z.string())),
  on_demand: z.optional(z.array(z.string())),
  steps: z.optional(z.record(z.string(), z.string()))
})

type Call = (verb: string) => Promise<unknown>

export async function z0Onboarding(
  cards: EuiCards['host'], call: Call, current: () => boolean, fail: (error: unknown) => void
): Promise<void> {
  const preview = reply.parse(await call('z0_onboard_plan'))
  if (!current()) return
  if (preview.status !== 'plan') {
    cards.publish({
      kind: 'intel-health', app: 'glide', title: 'z0intelligence setup unavailable',
      rows: [{ label: 'Status', value: preview.status }],
      summary: preview.status === 'not installed'
        ? 'z0intelligence is optional. Use /glide for corrections memory without it.'
        : 'Check your installed CLI with z0int models plan --json, then retry /glide onboard.'
    })
    return
  }
  cards.publish({
    kind: 'approve', app: 'glide', title: 'Review z0intelligence setup',
    rows: [
      { label: 'Resident models', value: preview.resident?.join(', ').slice(0, 500) || 'none recommended' },
      { label: 'On-demand models', value: preview.on_demand?.join(', ').slice(0, 500) || 'none recommended' }
    ],
    approval: {
      label: 'Run or resume setup',
      description: 'Runs z0int onboard. Writes local setup and source discovery, may install Evolution Lab and link OMP extensions. Does not request model downloads or enable Glide recall.'
    }
  }, async ({ signal }) => {
    if (signal.aborted || !current()) return
    try {
      const result = reply.parse(await call('z0_onboard_apply'))
      if (signal.aborted || !current()) return
      cards.publish({
        kind: 'receipt', app: 'glide',
        title: result.status === 'done' ? 'z0intelligence setup complete' : 'z0intelligence setup not complete',
        summary: result.status === 'done' ? 'Review the completed and skipped steps below.'
          : 'After any running setup has stopped, fix steps needing attention and retry /glide onboard. For a long install, resume in a terminal with z0int onboard --json.',
        rows: [
          { label: 'Status', value: result.status },
          ...Object.entries(result.steps ?? {}).map(([label, value]) => ({ label, value }))
        ]
      })
    } catch (error) {
      if (!signal.aborted && current()) fail(error)
    }
  })
}
