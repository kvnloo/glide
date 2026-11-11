// Headless shots of the /council popup. Opens the real popup (glide/frontend/councilPopup.ts) on a
// fake clock, takes its Tern node tree, and writes it as HTML: `el` nodes keep their tags and
// attributes, inline styles become the same filtered `[data-eui-s]` rules Tern receives, SVG blobs
// become images, and the overlay is a centred panel over a dimmed pane. Then one headless Chromium
// at a time screenshots each page (desktop 1440x900, phone 412x915 at 2x), waiting while the host
// has under 3000 MiB available. Usage, from the repo root:
//   bun glide/tools/council-shots.mts OUT_DIR [V3_SHOTS_DIR]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { euiStyles } from '../../frontend/src/eui/cards.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import { demoRun, schedule } from '../frontend/council.js'
import { type CouncilHost, openCouncilPopup } from '../frontend/councilPopup.js'

const out = resolve(process.argv[2] ?? 'council-shots')
const v3 = process.argv[3]
mkdirSync(join(out, 'html'), { recursive: true })

// `el` nodes are { k, p, c }; JSX kinds (the overlay) are { type, props: { children } }.
interface Node { k?: string; p?: Record<string, unknown>; c?: Node[]; type?: string; props?: Record<string, unknown> & { children?: Node | Node[] } }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(frameAt: number | null): string {
  const blobs = new Map<string, string>()
  const rules = new Map<string, string>()
  let now = 0
  let overlay: Overlay | undefined
  const host: CouncilHost = {
    open: o => { overlay = o }, close: () => { overlay = undefined }, changed: () => undefined,
    transcript: { notice: (text: string) => { throw new Error(text) } },
    eui: {
      host: { publish: () => { throw new Error('no cards here') } },
      click: () => undefined,
      svg: markup => { const id = `b${blobs.size + 1}`; blobs.set(id, markup); return id },
      style: css => { const key = `s${rules.size + 1}`; rules.set(key, `[data-eui-s='${key}']{${ternBody(css.replace(/[{}<]/g, ''))}}`); return key }
    }
  }
  const src = { run: demoRun(), live: false, from: 'synthetic seats and brief' }
  openCouncilPopup(host, src, { now: () => now, every: () => () => undefined })
  if (!overlay) throw new Error('the popup did not open')
  if (frameAt !== null) {
    overlay.onKey({ name: 'enter', ctrl: false, alt: false, shift: false, meta: false })
    now = frameAt
  }
  const tree = JSON.parse(JSON.stringify(overlay.node('layer.overlay-1'))) as Node
  const draw = (n: Node): string => {
    const p = n.p ?? n.props ?? {}
    const children = n.c ?? n.props?.children ?? []
    const kids = (Array.isArray(children) ? children : [children]).map(draw).join('')
    if ((n.k ?? n.type) === 'overlay') return `<div class="tern-overlay" role="dialog"><div class="tern-head">${esc(String(p['head'] ?? ''))}</div><div class="tern-body">${kids}</div></div>`
    if (n.k === 'image') {
      const svg = blobs.get(String(p['blob']))
      return svg ? `<img width="${String(p['w'])}" height="${String(p['h'])}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">` : ''
    }
    if (n.k !== 'el') throw new Error(`unexpected node kind ${n.k}`)
    const tag = String(p['tag'])
    const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
    const cls = p['class'] ? ` class="${esc(String(p['class']))}"` : ''
    return `<${tag}${attrs}${cls}${p['disabled'] ? ' disabled' : ''}>${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
  }
  const body = draw(tree)
  return `<!doctype html><meta charset="utf-8"><style>
:root { --l1:#161614; --l2:#22221f; --l3:#34332f; --t1:#e8e4da; --t2:#b4afa3; --t3:#837f74; --accent:#d7b986; --sans:'Hanken Grotesk',system-ui,sans-serif; --mono:'IBM Plex Mono',ui-monospace,monospace; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #111110; color: var(--t1); font: 14px/1.45 var(--sans); }
.pane { position: fixed; inset: 0; padding: 24px; color: #6b675e; font: 13px/1.6 var(--mono); }
.dim { position: fixed; inset: 0; background: rgba(0,0,0,0.55); }
.tern-overlay { position: absolute; left: 50%; top: 24px; transform: translateX(-50%); width: min(960px, calc(100vw - 24px)); max-height: calc(100vh - 48px); overflow: auto; background: var(--l1); border: 1px solid var(--l3); border-radius: 12px; box-shadow: 0 18px 48px rgba(0,0,0,0.6); }
.tern-head { padding: 10px 16px; border-bottom: 1px solid var(--l3); color: var(--t2); font-size: 13px; }
.tern-body { padding: 12px; }
[data-eui-svg] img { display: block; max-width: 100%; height: auto; }
button { cursor: pointer; }
${euiStyles()}
${[...rules.values()].join('\n')}
</style><div class="pane">hermes tern · /council<br>› the transcript sits under the popup</div><div class="dim"></div>${body}`
}

function waitForMemory() {
  for (let i = 0; i < 60; i++) {
    const line = execFileSync('free', ['-m'], { encoding: 'utf8' }).split('\n').find(l => l.startsWith('Mem:')) ?? ''
    const available = Number(line.trim().split(/\s+/)[6])
    if (available >= 3000) return
    console.log(`waiting: ${available} MiB available (< 3000)`)
    execFileSync('sleep', ['10'])
  }
  throw new Error('memory stayed under 3000 MiB for ten minutes')
}

function shoot(html: string, name: string, w: number, h: number, scale: number) {
  const file = join(out, 'html', `${name}.html`)
  writeFileSync(file, html)
  waitForMemory()
  const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b]); return true } catch { return false } })
  if (!browser) throw new Error('no headless Chromium')
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(tmpdir(), 'council-shots-chromium')}`,
    `--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`, `--screenshot=${join(out, `${name}.png`)}`, `file://${file}`], { stdio: 'ignore', timeout: 60_000 })
  console.log(`${name}.png`)
}

const { at, total } = schedule(demoRun())
const run = demoRun()
const midTurn = run.events.findIndex((e, i) => e.type === 'turn' && e.round === 2 && i > 0 && e.cites.length > 0)
const frames: [string, number | null][] = [['open', null], ['mid', (at[midTurn] ?? total / 2) + 300], ['done', total]]
for (const [state, t] of frames) {
  const html = page(t)
  shoot(html, `desktop-${state}`, 1440, 900, 1)
  shoot(html, `phone-${state}`, 412, 915, 2)
}

if (v3 && existsSync(v3)) {
  // side by side: the approved v3 shot on the left, the popup on the right
  for (const [mine, ref, w, h, scale] of [['desktop-mid', 'desktop-2-mid', 2880, 900, 1], ['phone-mid', 'phone-2-mid', 824, 915, 2], ['desktop-done', 'desktop-3-done', 2880, 900, 1]] as const) {
    const img = (p: string) => `data:image/png;base64,${readFileSync(p).toString('base64')}`
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000;display:flex;gap:0}figure{margin:0;flex:1;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:8px;top:6px;font:12px monospace;color:#fff;background:rgba(0,0,0,.6);padding:2px 6px}</style>
<figure><img src="${img(join(v3, `${ref}.png`))}"><figcaption>v3 reference · ${ref}</figcaption></figure><figure><img src="${img(join(out, `${mine}.png`))}"><figcaption>glide /council · ${mine}</figcaption></figure>`
    shoot(html, `compare-${mine}`, w, h, scale)
  }
}
