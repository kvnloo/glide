// Plays the launch splash in a Tern pane without a gateway: the same LaunchSplash the app mounts,
// over a stand-in session surface, with readiness arriving after SPLASH_DEMO_READY_MS (default 5000).
//
//   bun scripts/splash-demo.ts
//
// reuse-checked: Hermes ui-tsp/scripts/splash-demo.ts -- plays Hermes' cell designs, not this splash.
import { connect, ui } from '@stencil-hq/tern'

import { LaunchSplash } from '../src/splash/launch.js'

const session = await connect({ app: 'glide' })
if (!session) {
  console.error('This demo needs a Tern pane (the Tern Surface Protocol).')
  process.exit(75)
}

const chrome = session.open({ id: 'glide', mode: 'inline', role: 'glide.demo', title: 'glide' })
chrome.render(ui.text({ key: 't', text: 'session chrome: the splash hands off to this' }))

const splash = new LaunchSplash({
  tern: session,
  onDone: () => setTimeout(() => void session.close().then(() => process.exit(0)), 1500)
})
splash.start()
setTimeout(() => splash.ready(), Number(process.env['SPLASH_DEMO_READY_MS'] ?? 5000))
