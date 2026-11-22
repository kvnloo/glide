// Deep zoom journey (GL-104): a real headless Chrome opens a 1.2 gigapixel synthetic pyramid in the shipped viewer
// over the pane's tile origin, zooms in three levels with the mouse wheel and pans with a drag. Every request is
// the viewer, the descriptor or an in-bounds tile, every tile answers 200, and no decoded image is larger than a
// tile, so the full image is never decoded. Needs Chrome (CHROME=<binary>, or one on PATH); skipped without one.
// GLIDE_DEEP_ZOOM_OUT=<dir> keeps the screenshots and the network log.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as z from 'zod/mini'

import { deepZoomOrigin, type DeepZoomOrigin } from '../../../glide/frontend/deepZoom.js'
import { writePyramid, type Pyramid } from '../../../glide/tools/deepZoomPyramid.js'

import { parseJson, record } from '../wire/json.js'

const VIEWER = fileURLToPath(new URL('../../../glide/deepzoom/viewer.html', import.meta.url))

const CHROMES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome-headless-shell']
function findChrome(): string | undefined {
  if (process.env['CHROME']) return process.env['CHROME']
  for (const name of CHROMES) {
    try {
      return execFileSync('which', [name], { encoding: 'utf8' }).trim() || undefined
    } catch {
      // not on PATH
    }
  }
  return undefined
}
const chrome = findChrome()

/** What the viewer reports (glide/deepzoom/viewer.html, window.deepZoom.stats). */
const statsShape = z.object({
  ready: z.boolean(), idle: z.boolean(), error: z.nullable(z.string()), maxLevel: z.number(), homeLevel: z.number(),
  level: z.number(), scale: z.number(), center: z.tuple([z.number(), z.number()]), requested: z.number(),
  loaded: z.number(), failed: z.number(), maxDecoded: z.number(), complete: z.array(z.number())
})
type Stats = z.infer<typeof statsShape>
const response = z.object({ url: z.string(), status: z.number() })

/** One page target over the DevTools protocol. */
class Cdp {
  #ws: WebSocket
  #next = 0
  #waiting = new Map<number, (msg: Record<string, unknown>) => void>()
  readonly events: { method: string; params: Record<string, unknown> }[] = []
  constructor(ws: WebSocket) {
    this.#ws = ws
    ws.addEventListener('message', ev => {
      const msg = record(String(ev.data))
      const id = msg?.['id'], method = msg?.['method']
      if (typeof id === 'number') this.#waiting.get(id)?.(msg ?? {})
      else if (typeof method === 'string') this.events.push({ method, params: record(msg?.['params']) ?? {} })
    })
  }
  static async open(url: string) {
    const ws = new WebSocket(url)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    return new Cdp(ws)
  }
  send(method: string, params: Record<string, unknown> = {}) {
    const id = ++this.#next
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.#waiting.set(id, msg => (msg['error'] ? reject(new Error(`${method}: ${JSON.stringify(msg['error'])}`)) : resolve(record(msg['result']) ?? {})))
      this.#ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression: string): Promise<unknown> {
    const out = await this.send('Runtime.evaluate', { expression, returnByValue: true })
    return record(out['result'])?.['value']
  }
  close() { this.#ws.close() }
}

describe.skipIf(!chrome)('deep zoom journey in headless Chrome', () => {
  let dir: string
  let pyramid: Pyramid
  let origin: DeepZoomOrigin
  let proc: ChildProcess
  let cdp: Cdp
  const out = process.env['GLIDE_DEEP_ZOOM_OUT']
  const peek = async (): Promise<Stats | undefined> => {
    const parsed = statsShape.safeParse(await cdp.eval('window.deepZoom ? { ...window.deepZoom.stats } : null'))
    return parsed.success ? parsed.data : undefined
  }
  const stats = async (): Promise<Stats> => {
    const s = await peek()
    if (!s) throw new Error('the viewer reports no stats')
    return s
  }
  async function settled(what: string, ms = 30000): Promise<Stats> {
    const end = Date.now() + ms
    for (;;) {
      const s = await peek()
      if (s?.error) throw new Error(`viewer error: ${s.error}`)
      if (s?.ready && s.idle) {
        await sleep(120)
        const again = await stats()
        if (again.idle) return again
      }
      if (Date.now() > end) throw new Error(`${what}: not settled: ${JSON.stringify(s)}`)
      await sleep(50)
    }
  }
  async function shot(name: string) {
    if (!out) return
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
    if (typeof data === 'string') writeFileSync(join(out, `${name}.png`), Buffer.from(data, 'base64'))
  }
  const mouse = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
    cdp.send('Input.dispatchMouseEvent', { type, x, y, ...extra })

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'glide-dz-journey-'))
    if (out) mkdirSync(out, { recursive: true })
    pyramid = writePyramid(join(dir, 'pyramid'), 40000, 30000)
    origin = await deepZoomOrigin(pyramid.dzi, VIEWER)
    const profile = join(dir, 'profile')
    if (!chrome) throw new Error('no Chrome')
    proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' })
    let port: string | undefined
    for (let i = 0; i < 200 && !port; i++) {
      await sleep(50)
      try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0] } catch { /* not yet */ }
    }
    if (!port) throw new Error('Chrome did not open its DevTools port')
    const targets = parseJson(await (await fetch(`http://127.0.0.1:${port}/json/list`)).text())
    const page = (Array.isArray(targets) ? targets : []).map(t => record(t)).find(t => t?.['type'] === 'page')
    const socket = page?.['webSocketDebuggerUrl']
    if (typeof socket !== 'string') throw new Error('no page target')
    cdp = await Cdp.open(socket)
    await cdp.send('Network.enable')
    await cdp.send('Page.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  }, 60000)

  afterAll(async () => {
    cdp?.close()
    origin?.close()
    if (proc && proc.exitCode === null) {
      const gone = new Promise(resolve => proc.once('exit', resolve))
      proc.kill()
      await Promise.race([gone, sleep(5000)])
    }
    // Chrome may still be flushing its profile for a moment after it exits.
    if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  })

  it('opens the gigapixel image, zooms three levels, pans, and loads only 200 tiles', async () => {
    expect(pyramid.width * pyramid.height).toBeGreaterThanOrEqual(1e9)
    await cdp.send('Page.navigate', { url: origin.url })
    const home = await settled('open')
    expect(home).toMatchObject({ maxLevel: 16, failed: 0 })
    await shot('0-home')

    // Zoom at the middle of the pane, one wheel notch at a time, until three levels finer than home are drawn.
    const levels = [home.level]
    const last = () => levels[levels.length - 1] ?? -1
    for (let i = 0; i < 24 && last() < home.level + 3; i++) {
      await mouse('mouseWheel', 640, 400, { deltaX: 0, deltaY: -240 })
      const s = await settled(`zoom ${i}`)
      if (s.level !== last()) {
        levels.push(s.level)
        await shot(`${levels.length - 1}-level-${s.level}`)
      }
    }
    const zoomed = await stats()
    expect(levels).toEqual([home.level, home.level + 1, home.level + 2, home.level + 3])
    for (const l of levels) expect(zoomed.complete).toContain(l)
    expect(zoomed.scale / home.scale).toBeGreaterThan(4)

    // Drag 400 px left and 200 px up: the image moves with the pointer and the new tiles arrive.
    const before = zoomed.requested
    await mouse('mouseMoved', 900, 600)
    await mouse('mousePressed', 900, 600, { button: 'left', buttons: 1, clickCount: 1 })
    for (let k = 1; k <= 10; k++) await mouse('mouseMoved', 900 - 40 * k, 600 - 20 * k, { button: 'left', buttons: 1 })
    await mouse('mouseReleased', 500, 400, { button: 'left', buttons: 0, clickCount: 1 })
    const panned = await settled('pan')
    await shot('4-panned')
    expect(panned.center[0] - zoomed.center[0]).toBeCloseTo(400 / zoomed.scale, 0)
    expect(panned.center[1] - zoomed.center[1]).toBeCloseTo(200 / zoomed.scale, 0)
    expect(panned.level).toBe(zoomed.level)
    expect(panned.requested).toBeGreaterThan(before)

    // The network: only the viewer, the descriptor and tiles, each 200; no decode bigger than a tile.
    const responses = cdp.events.filter(e => e.method === 'Network.responseReceived')
      .flatMap(e => { const r = response.safeParse(e.params['response']); return r.success ? [r.data] : [] })
      .filter(r => r.url.startsWith(origin.url.replace(/viewer\.html$/, '')))
    const failed = cdp.events.filter(e => e.method === 'Network.loadingFailed')
    const tiles = responses.filter(r => /\/image_files\/\d+\/\d+_\d+\.png$/.test(r.url))
    const other = responses.filter(r => !tiles.includes(r) && !/\/(viewer\.html|image\.dzi)$/.test(r.url))
    if (out) writeFileSync(join(out, 'journey.json'), JSON.stringify({ pyramid, levels, home, zoomed, panned, served: origin.served,
      tileRequests: tiles.length, statuses: [...new Set(responses.map(r => r.status))], urls: responses.map(r => `${r.status} ${new URL(r.url).pathname.replace(/^\/[^/]+\//, '')}`) }, null, 2))
    expect(failed).toEqual([])
    expect(other).toEqual([])
    expect(tiles.length).toBe(panned.requested)
    expect(tiles.length).toBe(origin.served.tiles)
    expect(tiles.every(r => r.status === 200)).toBe(true)
    expect(new Set(tiles.map(r => r.url)).size).toBe(tiles.length)
    expect(panned).toMatchObject({ failed: 0, loaded: tiles.length })
    expect(panned.maxDecoded).toBeLessThanOrEqual(pyramid.tileSize)
    expect(origin.served.refused).toBe(0)
    // A tiny fraction of the pyramid's 6279 tiles: what was in view, at the levels shown.
    expect(tiles.length).toBeLessThan(400)
  }, 120000)
})
