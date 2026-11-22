#!/usr/bin/env node
// Records a take of a page that ships with Glide (glide/pages/<id>.html) in headless Chrome, the way the Glide pane
// shows it: opened from its file:// URL, themed by the pane's own theme function (frontend/src/glideui/pages.ts),
// driven with real mouse and key input. The page's audio is tapped where it reaches the speakers and recorded with
// MediaRecorder, the screen with a CDP screencast, and ffmpeg muxes both into <out>/<id>.webm. The scene a page
// plays is glide/tools/page-takes/<id>.mjs; what it measured on the way (the analyser's live bins, notes on screen)
// lands in <out>/<id>.json.
//
//   node glide/tools/page-take.mjs <id> <out-dir>      (CHROME=<binary> to pick the browser; needs ffmpeg)
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const [id, outArg] = process.argv.slice(2)
if (!id || !outArg) {
  console.error('usage: node glide/tools/page-take.mjs <id> <out-dir>')
  process.exit(2)
}
const page = resolve(here, '../pages', `${id}.html`)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const { scene, viewport = { width: 960, height: 640 } } = await import(pathToFileURL(join(here, 'page-takes', `${id}.mjs`)).href)
const { themeFunction } = await import(pathToFileURL(resolve(here, '../../frontend/src/glideui/pages.ts')).href)

// Taps every connection to the speakers into a MediaRecorder, so the take carries what the page played.
const AUDIO_TAP = `(() => {
  const connect = AudioNode.prototype.connect
  let recorder, sink, chunks = [], startedAt = 0
  AudioNode.prototype.connect = function (target, ...rest) {
    const result = connect.call(this, target, ...rest)
    if (target instanceof AudioDestinationNode) {
      if (!sink) {
        sink = this.context.createMediaStreamDestination()
        recorder = new MediaRecorder(sink.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 })
        recorder.ondataavailable = e => chunks.push(e.data)
        recorder.start(250)
        startedAt = Date.now()
      }
      connect.call(this, sink)
    }
    return result
  }
  window.__take = {
    startedAt: () => startedAt,
    stop: () => new Promise(done => {
      if (!recorder) return done(null)
      recorder.onstop = async () => {
        const bytes = new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer())
        let s = ''
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        done(btoa(s))
      }
      recorder.stop()
    })
  }
})()`

const chrome = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find(b => {
  try { execFileSync('which', [b], { stdio: 'ignore' }); return true } catch { return false }
})
if (!chrome) throw new Error('no Chrome found; set CHROME')
const profile = mkdtempSync(join(tmpdir(), 'glide-take-'))
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--allow-file-access-from-files', `--window-size=${viewport.width},${viewport.height}`, 'about:blank'],
{ stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))
let port
for (let i = 0; i < 100 && !port; i++) {
  await sleep(100)
  const f = join(profile, 'DevToolsActivePort')
  if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0]
}
if (!port) throw new Error('Chrome did not open a debugging port')
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
let seq = 0
const pending = new Map()
const listeners = []
ws.onmessage = m => {
  const msg = JSON.parse(String(m.data))
  if (msg.id && pending.has(msg.id)) {
    const { ok, fail } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? fail(new Error(msg.error.message)) : ok(msg.result)
  } else if (msg.method) for (const l of listeners) l(msg)
}
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++seq; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(`${expression}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false })
await send('Page.addScriptToEvaluateOnNewDocument', { source: AUDIO_TAP })
const loaded = new Promise(ok => listeners.push(m => { if (m.method === 'Page.loadEventFired') ok() }))
await send('Page.navigate', { url: pathToFileURL(page).href })
await loaded

const framesDir = mkdtempSync(join(tmpdir(), 'glide-take-frames-'))
const frames = []
listeners.push(m => {
  if (m.method !== 'Page.screencastFrame') return
  const file = join(framesDir, `f${String(frames.length).padStart(5, '0')}.jpg`)
  writeFileSync(file, Buffer.from(m.params.data, 'base64'))
  frames.push({ file, at: Date.now() })
  void send('Page.screencastFrameAck', { sessionId: m.params.sessionId })
})
await send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: viewport.width, maxHeight: viewport.height, everyNthFrame: 1 })
const began = Date.now()

const log = []
const at = () => Math.round((Date.now() - began) / 100) / 10
const box = async selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
const take = {
  page: id,
  wait: sleep,
  eval: evaluate,
  async click(selector) {
    const { x, y } = await box(selector)
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
  },
  async pointer(selector, holdMs = 160) {
    const { x, y } = await box(selector)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await sleep(holdMs)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  },
  async key(key, code, holdMs = 0) {
    const text = key.length === 1 ? key : undefined
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text, windowsVirtualKeyCode: key === ' ' ? 32 : key.toUpperCase().charCodeAt(0) })
    if (holdMs) await sleep(holdMs)
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code })
  },
  async theme(t) { await evaluate(`(${themeFunction(t)})()`) },
  async note(label, expression) {
    const value = expression ? await evaluate(expression) : undefined
    log.push({ t: at(), label, ...(value !== undefined ? { value } : {}) })
    console.log(`${at().toFixed(1)}s ${label}${value !== undefined ? ` ${JSON.stringify(value)}` : ''}`)
    return value
  }
}

let failed
try {
  await scene(take)
} catch (error) {
  failed = error
}
const seconds = at()
await send('Page.stopScreencast')
const audio = await evaluate('window.__take ? window.__take.stop() : null')
const audioStart = await evaluate('window.__take ? window.__take.startedAt() : 0')
ws.close()
browser.kill()

const list = frames.map((f, i) => `file '${f.file}'\nduration ${(((frames[i + 1]?.at ?? f.at + 40) - f.at) / 1000).toFixed(3)}`).join('\n')
writeFileSync(join(framesDir, 'list.txt'), `${list}\nfile '${frames.at(-1)?.file}'\n`)
const video = join(out, `${id}.webm`)
const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(framesDir, 'list.txt')]
if (audio) {
  const a = join(framesDir, 'audio.webm')
  writeFileSync(a, Buffer.from(audio, 'base64'))
  args.push('-itsoffset', ((audioStart - (frames[0]?.at ?? began)) / 1000).toFixed(3), '-i', a, '-map', '0:v', '-map', '1:a', '-c:a', 'libopus', '-b:a', '128k')
}
args.push('-c:v', 'libvpx-vp9', '-b:v', '1800k', '-pix_fmt', 'yuv420p', '-r', '30', '-fps_mode', 'cfr', video)
execFileSync('ffmpeg', args, { stdio: 'inherit' })
writeFileSync(join(out, `${id}.json`), `${JSON.stringify({ page: `glide/pages/${id}.html`, chrome: (await (async () => {
  try { return execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim() } catch { return chrome }
})()), frames: frames.length, seconds, audio: Boolean(audio), log, ...(failed ? { failed: String(failed) } : {}) }, null, 2)}\n`)
rmSync(framesDir, { recursive: true, force: true })
rmSync(profile, { recursive: true, force: true })
console.log(`${id}.webm: ${frames.length} frames, ${seconds} s, audio ${audio ? 'yes' : 'no'}`)
if (failed) { console.error(failed); process.exit(1) }
