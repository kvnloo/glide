// Run inside an isolated Tern pane: bun frontend/e2e/card-motion.ts.
// R replays entrance, D finishes, N shows the other native parts, Q exits.
import { connect, ui } from '@stencil-hq/tern'

import { motionCard } from '../src/__tests__/glideMotionFixtures.js'
import { MOTION_CSS, MOTION_SHEET } from '../src/glideui/motion.js'
import { node, UI_CSS, UI_SHEET } from '../src/glideui/render.js'
import { STYLES } from '../src/view/styles.js'

const session = await connect({ app: 'Glide motion verification' })
if (!session) throw new Error('Run this verifier in an isolated Tern pane')
const surface = session.open({ mode: 'screen' })
surface.stylesheet('glide', STYLES)
surface.stylesheet(UI_SHEET, UI_CSS)
surface.stylesheet(MOTION_SHEET, MOTION_CSS)
surface.stylesheet('motion-proof', `
[data-role='motion.proof']{--l1:#151515;--l2:#222;--l3:#38342d;--sf-accent:#b99b67;color:#e4ddd1;padding:16px;width:760px;max-width:100%;margin:0 auto}
[data-role='glide.card']{background:var(--l1);border:1px solid var(--l3);border-radius:8px;padding:14px;box-shadow:none}
[data-role='motion.hint']{font-size:11px;opacity:.7;margin-bottom:12px}
`)
let generation = 0, done = false, page = 0
const draw = (entrance = true) => surface.render([ui.col({ key: 'proof', role: 'motion.proof' }, [
  ui.text({ key: 'hint', role: 'motion.hint', text: 'GLIDE / NATIVE CARD MOTION · SYNTHETIC · R replay · D done · N next' }),
  node(motionCard(done, page), `card${generation}`, { entrance, send: intent => { if (intent.action === 'done') { done = true; draw(false) } }, svg: markup => session.blob(Buffer.from(markup), 'image/svg+xml') })
])])
draw()
try {
  for await (const input of session) {
    if (input.type !== 'key') continue
    if (input.key.name === 'q' || input.key.name === 'escape') break
    if (input.key.name === 'r') { generation++; done = false; draw() }
    if (input.key.name === 'd') { done = true; draw(false) }
    if (input.key.name === 'n') { page = 1 - page; generation++; done = false; draw() }
  }
} finally {
  await session.close()
}
