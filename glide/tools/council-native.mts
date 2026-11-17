// Build with council-native-build.mjs, then run its output in an isolated native Tern pane.
// Exercises the production popup, SDK event routing, stylesheet filtering, and platform speech.
import { connect, ui } from '@stencil-hq/tern'
import { EuiCards, euiStyles } from '../../frontend/src/eui/cards.js'
import { STYLES } from '../../frontend/src/view/styles.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import { demoRun } from '../frontend/council.js'
import { openCouncilPopup, type CouncilHost } from '../frontend/councilPopup.js'

const session = await connect({ app: 'Council verification', features: ['edit'] })
if (!session) throw new Error('Native Tern Surface Protocol is required')
const surface = session.open({ mode: 'inline', title: 'Council · synthetic verification', role: 'omp.session' })
let overlay: Overlay | undefined
let ready = false
const paint = () => {
  if (!ready) return
  surface.render({ main: ui.text({ text: 'Glide · atlas · synthetic council verification' }), layer: overlay?.node('layer.overlay-1') ?? [] })
  surface.focus(null)
}
const eui = new EuiCards(paint)
eui.attach({ blob: (bytes, mime) => session.blob(bytes, mime), stylesheet: (name, css) => surface.stylesheet(name, css) }, true)
surface.stylesheet('glide', STYLES)
surface.stylesheet('ephemeral-ui', euiStyles())
surface.stylesheet('council-proof', `:root{--l1:#161614;--l2:#22221f;--l3:#34332f;--t1:#e8e4da;--t2:#b4afa3;--t3:#aca79d;--accent:#d7b986;--sans:system-ui;--mono:monospace} [data-surface='omp.session']{background:#0c0c0a}`)
const host: CouncilHost = {
  eui, tern: session, open: o => { overlay = o; paint() },
  close: o => { o.onClose?.(); overlay = undefined; paint() }, changed: paint,
  transcript: { notice: text => { process.stderr.write(`Council notice: ${text}\n`) } }
}
ready = true
openCouncilPopup(host, { run: demoRun(), live: false, from: 'synthetic seats and brief' })
paint()
try {
  for await (const input of session) {
    if (input.type === 'key') {
      if (!overlay) break
      overlay.onKey(input.key)
      paint()
      if (!overlay) break
    }
  }
} finally {
  overlay?.onClose?.()
  eui.close()
  await session.close()
}
