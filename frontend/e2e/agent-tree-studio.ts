// Bundle with the frontend's esbuild and tsconfig. Run only in an isolated Tern pane.
import { connect, ui } from '@stencil-hq/tern'

import { agentTreeFixture } from '../src/agents/fixture.js'
import { EuiCards } from '../src/eui/cards.js'
import { openAgents, type AgentsSheetHost } from '../src/overlays/agents.js'
import type { Overlay } from '../src/overlays/overlay.js'
import { STYLES } from '../src/view/styles.js'
import { dashPalette, dashTernPalette } from '../../glide/frontend/dash.js'
import { walCss } from '../../glide/frontend/wal.js'

const session = await connect({ app: 'glide-agent-tree-studio' })
if (!session) throw new Error('The fixture requires a real isolated Tern pane')
const surface = session.open({ title: 'Glide · synthetic agent tree' })
surface.palette(dashTernPalette())
surface.stylesheet('wal', walCss(dashPalette()))
surface.stylesheet('hermes', STYLES)
const all = agentTreeFixture()
let overlay: Overlay | undefined
let queued = false
const draw = () => {
  queued = false
  surface.render({
    main: [ui.text({ key: 'fixture', text: 'Glide · HEADLESS native Tern · synthetic agents' })],
    layer: overlay ? [overlay.node('layer.overlay-1')] : []
  })
  surface.focus(overlay?.focus?.('layer.overlay-1') ?? null)
}
const changed = () => {
  if (!queued) { queued = true; queueMicrotask(draw) }
}
const eui = new EuiCards(changed)
eui.attach({ blob: (bytes, mime) => session.blob(bytes, mime), stylesheet: (name, css) => surface.stylesheet(name, css) }, true)
const host: AgentsSheetHost = {
  agents: { all: () => all, follow: () => undefined, paused: false,
    pause: async value => { host.agents.paused = value; return value },
    steer: async () => true, stop: async a => { a.status = 'cancelled'; a.duration = Date.now() - a.startedAt; return true }
  },
  transcript: { delegations: () => [], notice: () => undefined },
  eui, changed, open: value => { overlay = value; changed() },
  close: value => { value.onClose?.(); overlay = undefined; changed() },
  openAgent: async () => undefined
}
openAgents(host, { id: 'planner' })
draw()
try {
  for await (const input of session) {
    if (input.type === 'key') {
      if (input.key.ctrl && input.key.name === 'c') break
      overlay?.onKey(input.key)
      changed()
    }
  }
} finally {
  overlay?.onClose?.()
  eui.close()
  await surface.close({ keep: false })
  await session.close()
}
