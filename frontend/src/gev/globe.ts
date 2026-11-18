// The real God's Eye View, rendered by Tern's own browser: a parked (never shown) block opens the
// app's embed at the answer's view, waits for the startup cover to lift and the globe's tiles to
// settle, captures one PNG and closes. `open` docks the live, interactive app below the pane.

import { execFile } from 'node:child_process'

import { browserAnswer } from '../wire/gev.js'

type Op = Record<string, unknown>
export type Browser = (op: Op, timeoutMs?: number) => Promise<Record<string, unknown>>

/** `tern browser JSON`: the window's browser automation, answering {ok} or {error}. */
export const ternBrowser: Browser = (op, timeoutMs = 15000) => new Promise((resolve, reject) => {
  execFile('tern', ['browser', JSON.stringify(op)], { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
    const answer = browserAnswer(stdout)
    if (answer && 'ok' in answer) resolve(answer.ok)
    else reject(new Error(answer?.error ?? (err ? err.message : 'tern browser gave no answer')))
  })
})

/** The pane's block: what a browser block floats over or docks by. */
export function paneBlock(env: NodeJS.ProcessEnv = process.env): number | undefined {
  const n = Number(env['TERN_PANE'])
  return Number.isInteger(n) && n > 0 ? n : undefined
}

const READY = `function () {
  const cover = document.getElementById('loading-screen')
  const g = window.__godsEyeView
  const covered = cover && !(cover.classList.contains('hidden') && getComputedStyle(cover).opacity === '0')
  return Boolean(!covered && g && g.viewer && g.viewer.scene.globe.tilesLoaded)
}`

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** One PNG (base64, with its pixel size) of the real app at `url` (an embed URL), once two settled reads agree. */
export async function captureGlobe(url: string, owner: number, browser: Browser = ternBrowser, budgetMs = 30000): Promise<{ png: string; w: number; h: number }> {
  const opened = await browser({ op: 'open', owner, show: false, url })
  const block = opened['block']
  if (typeof block !== 'number') throw new Error('tern browser opened no block')
  try {
    const end = Date.now() + budgetMs
    let settled = 0
    while (settled < 2) {
      if (Date.now() > end) throw new Error('the globe did not settle in time')
      const r = await browser({ op: 'eval', block, world: 'page', function: READY })
      settled = r['value'] === true ? settled + 1 : 0
      await sleep(settled ? 1200 : 700)
    }
    const shot = await browser({ op: 'capture', block, format: 'png' }, 30000)
    if (typeof shot['data'] !== 'string') throw new Error('capture returned no image')
    const w = typeof shot['width'] === 'number' ? shot['width'] : 1280
    const h = typeof shot['height'] === 'number' ? shot['height'] : 800
    return { png: shot['data'], w, h }
  } finally {
    await browser({ op: 'close', block }).catch(() => undefined)
  }
}

/** The live app, docked below the pane: the user's to pan, zoom and explore. */
export async function openGlobe(url: string, owner: number, browser: Browser = ternBrowser): Promise<void> {
  await browser({ op: 'open', owner, url, how: 'below' })
}
