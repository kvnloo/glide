// Headless shots of the /glide taste card over a synthetic board: before (the receipt glide.ts published
// until GLD-TASTECARD) and after (tasteCard, now emitted by /glide taste). Both go through
// decodeEuiHostCard, hostSnapshot and euiCardNode, the path Tern mounts, then the Dash theme sheet (`/glide theme dash`) and one headless Chromium per frame, at
// 1060x596 and 412x915 (2x). Each frame also prints its measured layout and contrast. Usage, from the repo root:
//   bun glide/tools/taste-shots.mts OUT_DIR
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Theme } from '../../frontend/src/chrome/theme.js'
import { euiStyles } from '../../frontend/src/eui/cards.js'
import { hostSnapshot } from '../../frontend/src/eui/hostSnapshot.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import { euiCardNode, type EuiRender } from '../../frontend/src/view/euiCard.js'
import { decodeEuiHostCard } from '../../frontend/src/wire/euiHostCard.js'
import { tasteBoard, tasteCard } from '../frontend/taste.js'
import { DASH, MONO, NIGHT, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'taste-shots')
const work = mkdtempSync(join(tmpdir(), 'taste-shots-'))
mkdirSync(out, { recursive: true })

// Synthetic board; block 7 stands in for the pane id Tern confirms.
const board = tasteBoard({ title: 'Neighborhood food atlas', url: 'http://127.0.0.1:8765/s/sample-atlas/' })
const cards = {
  before: { kind: 'receipt', app: 'glide', title: board.title, rows: [{ label: 'Taste pane', value: 7 },
    { label: 'Board', value: board.url }, { label: 'Close', value: 'Close the browser pane to return to chat' }] },
  after: tasteCard(board, 7)
}

interface Node { k?: string; p?: Record<string, unknown>; c?: Node[] }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const rules = new Map<string, string>()
const render: EuiRender = {
  click: () => undefined, svg: () => undefined,
  style: css => { const key = `s${rules.size + 1}`; rules.set(key, `[data-eui-s='${key}']{${ternBody(css.replace(/[{}<]/g, ''))}}`); return key }
}
const draw = (n: Node | string | null): string => {
  if (n === null) return ''
  if (typeof n === 'string') return esc(n)
  const p = n.p ?? {}
  const kids = (n.c ?? []).map(draw).join('')
  if (n.k !== 'el') throw new Error(`unexpected node kind ${String(n.k)}`)
  const tag = String(p['tag'])
  const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
  const cls = p['class'] ? ` class="${esc(String(p['class']))}"` : ''
  return `<${tag}${attrs}${cls}${p['disabled'] ? ' disabled' : ''}>${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
}
const card = (raw: unknown) => {
  const data = decodeEuiHostCard(raw, ['approve', 'receipt'])
  const view = { spec: { kind: data.kind, app: data.app } as never, app: data.app, label: data.title, node: hostSnapshot(data, 'pending') }
  return draw(JSON.parse(JSON.stringify(euiCardNode(data.title, view, render))) as Node)
}

const sheets = new Map<string, string>()
const theme = new Theme({ palette: () => undefined, stylesheet: (n, css) => void (css === null ? sheets.delete(n) : sheets.set(n, css)),
  settings: { save: () => ({}) }, walFile: join(work, 'no-wal.json') }, 'dash')
theme.apply()
theme.dispose()

// Reports each text run's box and its contrast against the nearest painted background.
const MEASURE = `<script>
const lum = c => { const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }); return .2126 * r + .7152 * g + .0722 * b }
const under = e => { for (let n = e; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (!/rgba\\(.*, 0\\)$|transparent/.test(b)) return b } return getComputedStyle(document.body).backgroundColor }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + .05) / (y + .05)).toFixed(2) }
const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), radius: c.borderRadius, border: c.borderTopWidth + ' ' + c.borderTopColor, shadow: c.boxShadow, pad: c.paddingTop, bg: c.backgroundColor } }
const texts = [...document.querySelectorAll('[data-eui] *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  .map(e => { const c = getComputedStyle(e); return { text: e.textContent.trim().slice(0, 40), font: c.fontSize + ' ' + c.fontWeight, ink: c.color, on: under(e), ratio: ratio(c.color, under(e)), clipped: e.scrollWidth > e.clientWidth + 1 } })
document.body.dataset.m = JSON.stringify({ column: box('main'), head: box('.eui-host-head'), box: box('.eu-card.eui-host'), button: box('.eui-host-approve'), card: box('[data-eui]'), overflow: [...document.querySelectorAll('[data-eui], [data-eui] *')].some(e => e.getBoundingClientRect().right > document.documentElement.clientWidth), texts })
</script>`
const page = (body: string) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root { --l1:${DASH.bg}; --l2:color-mix(in srgb, ${DASH.fg} 6%, transparent); --l3:${NIGHT.borderStrong}; --t1:${DASH.fg}; --t2:${NIGHT.text2}; --t3:${DASH.muted}; --accent:${DASH.gold}; --card:${DASH.bg}; --sans:'Hanken Grotesk',system-ui,sans-serif; --mono:${MONO}; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 0; background: ${DASH.bg}; color: ${DASH.fg}; font: ${TYPE.body}px/1.45 var(--sans); }
main { width: min(880px, calc(100vw - 24px)); margin: 0 auto; }
${euiStyles()}
${[...sheets.values()].join('\n')}
${[...rules.values()].join('\n')}
</style><main>${body}</main>`

const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b], { stdio: 'ignore' }); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
const chrome = (args: string[]) => execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--user-data-dir=${join(work, 'chromium')}`, ...args], { timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
for (const [name, raw] of Object.entries(cards)) {
  for (const [size, w, h, scale] of [['desktop', 1060, 596, 1], ['phone', 412, 915, 2]] as const) {
    const file = join(work, `${name}-${size}.html`)
    writeFileSync(file, page(card(raw)))
    const shot = join(out, `${name}-${size}.png`)
    chrome([`--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`, `--screenshot=${shot}`, `file://${file}`])
    // Measured in an iframe the frame's width: a headless window is at least 500 px wide, wider than the phone.
    const probe = join(work, `${name}-${size}-probe.html`)
    writeFileSync(join(work, `${name}-${size}-m.html`), page(card(raw)) + MEASURE + `<script>parent.postMessage(document.body.dataset.m, '*')</script>`)
    writeFileSync(probe, `<body><iframe src="file://${join(work, `${name}-${size}-m.html`)}" width="${w}" height="${h}" style="border:0"></iframe><script>addEventListener('message', e => document.body.dataset.m = e.data)</script>`)
    const m = /data-m="([^"]*)"/.exec(chrome(['--virtual-time-budget=5000', '--allow-file-access-from-files', '--dump-dom', `file://${probe}`]))?.[1]
    console.log(JSON.stringify({ shot, measured: m ? JSON.parse(m.replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as unknown : null }))
  }
}
