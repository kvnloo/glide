import type { EuiCards } from '../../frontend/src/eui/cards.js'
import { record } from '../../frontend/src/wire/json.js'

type Call = (verb: string) => Promise<unknown>

const models = (ids: unknown) => Array.isArray(ids) ? ids.filter(id => typeof id === 'string').join(', ').slice(0, 500) : ''

function setupReply(raw: unknown) {
  const reply = record(raw)
  const status = reply?.['status']
  if (!reply || typeof status !== 'string') throw new Error('Invalid z0intelligence setup reply')
  return { reply, status }
}

export async function z0Onboarding(
  cards: EuiCards['host'], call: Call, current: () => boolean, fail: (error: unknown) => void
): Promise<void> {
  const { reply, status } = setupReply(await call('z0_onboard_plan'))
  if (!current()) return
  if (status !== 'plan') {
    cards.publish({
      kind: 'intel-health', app: 'glide', title: 'z0intelligence setup unavailable',
      rows: [{ label: 'Status', value: status }],
      summary: status === 'not installed'
        ? 'z0intelligence is optional. Use /glide for corrections memory without it.'
        : 'Check your installed CLI with z0int models plan --json, then retry /glide onboard.'
    })
    return
  }
  cards.publish({
    kind: 'approve', app: 'glide', title: 'Review z0intelligence setup',
    rows: [
      { label: 'Resident models', value: models(reply['resident']) || 'none recommended' },
      { label: 'On-demand models', value: models(reply['on_demand']) || 'none recommended' }
    ],
    approval: {
      label: 'Run or resume setup',
      description: 'Runs z0int onboard. Writes local setup and source discovery, may install Evolution Lab and link OMP extensions. Does not request model downloads or enable Glide recall.'
    }
  }, async ({ signal }) => {
    if (signal.aborted || !current()) return
    try {
      const result = setupReply(await call('z0_onboard_apply'))
      if (signal.aborted || !current()) return
      cards.publish({
        kind: 'receipt', app: 'glide',
        title: result.status === 'done' ? 'z0intelligence setup complete' : 'z0intelligence setup not complete',
        summary: result.status === 'done' ? 'Review the completed and skipped steps below.'
          : 'After any running setup has stopped, fix steps needing attention and retry /glide onboard. For a long install, resume in a terminal with z0int onboard --json.',
        rows: [
          { label: 'Status', value: result.status },
          ...Object.entries(record(result.reply['steps']) ?? {}).flatMap(([label, value]) =>
            typeof value === 'string' ? [{ label, value }] : [])
        ]
      })
    } catch (error) {
      if (!signal.aborted && current()) fail(error)
    }
  })
}
