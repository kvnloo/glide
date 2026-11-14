// Run in an owned headless studio under flock /tmp/glide-studio-heavy.lock.
// GLIDE_STUDIO_DIR=/path/to/fframestudio node BUNDLED_FILE OUT_DIR
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { connect, ui } from '@stencil-hq/tern'

import { glideCommand, type GlideHost } from '../src/commands/glide.js'
import { euiHostPort } from '../src/app/eui-host.js'
import { liveSessionId } from '../src/core/ids.js'
import { EuiCards } from '../src/eui/cards.js'
import { UI_CSS } from '../src/glideui/render.js'
import { SessionState } from '../src/session/state.js'
import { Transcript } from '../src/transcript/store.js'
import { euiCardNode } from '../src/view/euiCard.js'
import { record } from '../src/wire/json.js'
import { studioSnapshot, studioTree } from '../../glide/frontend/studio.js'
import { STUDIO_RUNTIME } from '../../glide/frontend/studioRuntime.js'

const exec = promisify(execFile)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const node = process.execPath

if (process.argv[2] === '--pane') {
  const session = await connect({ app: 'Glide studio verification' })
  if (!session) throw new Error('TSP unavailable')
  const surface = session.open({ mode: 'flow' })
  surface.stylesheet('glide-ui', UI_CSS)
  const state = new SessionState(() => undefined)
  state.ref = { live: liveSessionId('studio-proof'), stored: null }
  const transcript = new Transcript()
  let input = ''
  let ask = ''
  const cards = new EuiCards(() => paint(), undefined, euiHostPort({ session: state, transcript }, () => true))
  const paint = () => {
    const panels = transcript.entries.flatMap(entry => {
      if (entry.kind !== 'panel') return []
      const view = cards.hostView(entry)
      return view ? [euiCardNode(entry.id, view, cards)] : []
    })
    surface.render(ui.col({ key: 'proof', gap: 'md' },
      ui.text({ key: 'head', text: 'Glide / Studio', tone: 'accent' }),
      ui.text({ key: 'ask', text: ask || 'Type /glide studio atlas to open the editor' }),
      ...panels, ui.text({ key: 'input', text: '› ' + input })))
  }
  paint()
  await writeFile(join(process.env['GLIDE_STUDIO_PROOF'] ?? '', 'ready'), 'ready')
  const host: GlideHost = { session: state, transcript, eui: cards, gw: { request: async () => { throw new Error('Unexpected gateway call') } } }
  for await (const inputEvent of session) {
    if (inputEvent.type !== 'key') continue
    const key = inputEvent.key
    if (key.name === 'escape') break
    if (key.name === 'enter' && input.startsWith('/glide ')) {
      ask = input
      const arg = input.slice(7)
      input = ''
      paint()
      await glideCommand(host, arg)
      paint()
      await writeFile(join(process.env['GLIDE_STUDIO_PROOF'] ?? '', 'result.json'), JSON.stringify(transcript.entries))
    } else if (key.name === 'backspace') input = input.slice(0, -1)
    else if (key.text) input += key.text
    paint()
  }
  await session.close()
} else {
  const app = process.env['GLIDE_STUDIO_DIR']
  const control = process.env['GLIDE_STUDIO_CONTROL']
  if (!app || !control || !process.env['TERN_DAEMON_SOCKET'] || !process.env['WAYLAND_DISPLAY']) throw new Error('Set the app and isolated studio environment first')
  const available = /MemAvailable:\s+(\d+)/.exec(await readFile('/proc/meminfo', 'utf8'))
  assert(Number(available?.[1]) > 6 * 1024 * 1024, 'Wait for MemAvailable > 6 GiB')
  const out = resolve(process.argv[2] ?? 'studio-proof')
  await mkdir(out, { recursive: true })
  const work = await mkdtemp(join(tmpdir(), 'glide-studio-proof-'))
  const home = join(work, 'home')
  const projectDir = join(home, 'fframestudio/projects/atlas')
  await mkdir(projectDir, { recursive: true })
  const project = { schema: 'fframestudio.project/0', id: 'atlas', title: 'Atlas launch', kind: 'studio-spec', canvas: { width: 1280, height: 720, fps: 30 },
    shots: [{ id: 'hero', name: 'Hero', chapter: 'Opening', t0: 0, t1: 4, text: { headline: 'Built on atlas' }, media: [] }], edits: {}, renders: [], notes: [] }
  const file = join(projectDir, 'project.json')
  await writeFile(file, JSON.stringify(project))
  await writeFile(join(dirname(projectDir), 'library.json'), JSON.stringify({ projects: [{ id: 'atlas', title: 'Atlas launch', kind: 'studio-spec', duration_s: 4, shots: 1 }] }))
  const checksum = async () => createHash('sha256').update(await readFile(file)).digest('hex')
  const before = await checksum()
  const reserve = createServer()
  await new Promise<void>(resolve => reserve.listen(0, '127.0.0.1', resolve))
  const address = reserve.address()
  assert(address && typeof address !== 'string')
  const port = address.port
  await new Promise<void>(resolve => reserve.close(() => resolve()))
  const discovery = join(home, '.config/fframestudio/bridge.json')
  const env = { ...process.env, HOME: home, FFS_BRIDGE_FILE: discovery, GLIDE_STUDIO_PROOF: work }
  const bridge = spawn(node, [join(app, 'bridge/bridge.mjs'), '--quiet', '--port', String(port), '--root', join(home, 'fframestudio'), '--theme-home', home], { env, stdio: 'ignore' })
  let recorder: ReturnType<typeof spawn> | undefined
  let tab: string | undefined
  const ctl = (...args: string[]) => exec('tern', ['ctl', '--control', control, ...args], { timeout: 30_000 })
  try {
    for (let n = 0; n < 100; n++) {
      try { await readFile(discovery); break } catch { await delay(100) }
    }
    const run = (action: string, selected: string) => exec(node, ['--input-type=module', '-e', STUDIO_RUNTIME, '--', action, selected], { env, timeout: 45_000 })
    const inspected = studioSnapshot(JSON.parse((await run('inspect', 'atlas')).stdout))
    assert.equal(inspected.project?.title, 'Atlas launch')
    assert.equal(studioTree(inspected.project)[0]?.label, 'headline')
    assert(!JSON.stringify(inspected).includes('token'))
    await assert.rejects(run('inspect', '../escape'))
    const launched = record((await exec('tern', ['new', 'tab', '--json', '--cwd', process.cwd(), '--', 'env', `HOME=${home}`, `FFS_BRIDGE_FILE=${discovery}`, `GLIDE_STUDIO_DIR=${app}`, `GLIDE_STUDIO_PROOF=${work}`, node, fileURLToPath(import.meta.url), '--pane'], { timeout: 30_000 })).stdout)
    // Keep only this owned tab's id for cleanup. The native daemon response contains no credentials.
    await writeFile(join(out, 'launch.json'), JSON.stringify(launched, null, 2))
    tab = typeof launched?.['block'] === 'number' ? String(launched['block']) : undefined
    for (let n = 0; n < 100; n++) {
      try { await readFile(join(work, 'ready')); break } catch { await delay(100) }
    }
    await readFile(join(work, 'ready'))
    await delay(500)
    await ctl('shot', join(out, 'before'))
    const geometry = process.env['GLIDE_STUDIO_GEOMETRY']
    recorder = spawn('wf-recorder', ['--no-dmabuf', '-o', 'HEADLESS-1', ...(geometry ? ['-g', geometry] : []), '-r', '15', '-c', 'libx264', '-p', 'preset=ultrafast', '-p', 'crf=18', '-f', join(out, 'raw.mp4'), '-y'], { stdio: 'ignore' })
    await delay(600)
    for (const char of '/glide studio atlas') { await ctl('type', JSON.stringify(char)); await delay(40) }
    await ctl('key', 'Enter')
    for (let n = 0; n < 120; n++) {
      try { await readFile(join(work, 'result.json')); break } catch { await delay(250) }
    }
    const result = await readFile(join(work, 'result.json'), 'utf8')
    assert(!result.includes('Studio launch failed') && !result.includes('Studio could not start'), result)
    const tree = (await ctl('tree')).stdout
    // Check the user-facing native card, not a self-reported receipt alone.
    assert(tree.includes('Atlas launch') && tree.includes('headline'), 'Project layer card missing from native Tern tree')
    assert(tree.includes('Web editor open') || tree.includes('Native studio open'), 'Studio launch did not reach the open state')
    await delay(2000) // /open has redirected before any web pixel capture.
    await exec('grim', ['-o', 'HEADLESS-1', ...(geometry ? ['-g', geometry] : []), join(out, 'after.png')])
    await writeFile(join(out, 'tree.json'), tree)
    assert.equal(await checksum(), before, 'Read-only preview changed project.json')
    await writeFile(join(out, 'verification.json'), JSON.stringify({ realTern: true, projectUnchanged: true, v0Migration: true, mode: inspected.mode, credentialFree: true }, null, 2))
    console.log(JSON.stringify({ out, mode: inspected.mode, checks: 'bridge auth, v0 migration, real command, native layer tree, project unchanged' }))
  } finally {
    if (recorder) { recorder.kill('SIGINT'); await new Promise(resolve => recorder?.once('exit', resolve)) }
    if (tab) await exec('tern', ['close', tab, '--json']).catch(() => undefined)
    bridge.kill('SIGTERM')
    await new Promise(resolve => bridge.once('exit', resolve))
    await rm(work, { recursive: true, force: true })
  }
}
