// Headless shot of the voice lanes popup (glide/frontend/lanesPopup.ts) over a synthetic lane call,
// rendered the same way as council-shots.mts: the real popup's Tern node tree as HTML, then one
// headless Chromium screenshot. Usage, from the repo root:
//   bun glide/tools/lanes-shots.mts OUT_PNG
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { euiStyles } from '../../frontend/src/eui/cards.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import { parseLaneStatus } from '../../frontend/src/voice/lanes.js'
import type { CouncilHost } from '../frontend/councilPopup.js'
import { fileBindings, openLanesPopup } from '../frontend/lanesPopup.js'

const outPng = resolve(process.argv[2] ?? 'lanes-popup.png')
const work = mkdtempSync(join(tmpdir(), 'lanes-shots-'))
mkdirSync(dirname(outPng), { recursive: true })

// Synthetic sample call: no real models or usage.
const call = parseLaneStatus({
  session_id: 'demo-call', open: true, revision: 'r12',
  lanes: [
    { role: 'fast', model: 'sample-fast', resolved: null, state: 'answered', researching: null, error: null, entry: { text: 'Standup moved to 10:30; the agenda is unchanged.', confidence: 0.86, status: 'draft', kind: 'answer' } },
    { role: 'small', model: 'sample-small', resolved: 'sample-small-q4', state: 'verified', researching: null, error: null, entry: { text: 'Checked: the release notes list three fixes, not four.', confidence: 0.93, status: 'verified', kind: 'answer' } },
    { role: 'large', model: 'sample-large', resolved: null, state: 'thinking', researching: 'compare the two rollout plans', error: null, entry: null },
    { role: 'council', model: 'sample-council', resolved: null, state: 'dead', researching: null, error: 'provider timed out after 30s', entry: null }
  ]
})
const bindings = fileBindings(join(work, 'bindings.json'))
bindings.set('large', 'sample-large-plus')

interface Node { k?: string; p?: Record<string, unknown>; c?: Node[]; type?: string; props?: Record<string, unknown> & { children?: Node | Node[] } }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const rules = new Map<string, string>()
let overlay: Overlay | undefined
const host: CouncilHost = {
  open: o => { overlay = o }, close: () => { overlay = undefined }, changed: () => undefined,
  transcript: { notice: (text: string) => { throw new Error(text) } },
  eui: {
    host: { publish: () => { throw new Error('no cards here') } },
    click: () => undefined,
    svg: () => undefined,
    style: css => { const key = `s${rules.size + 1}`; rules.set(key, `[data-eui-s='${key}']{${ternBody(css.replace(/[{}<]/g, ''))}}`); return key }
  }
}
process.env['GLIDE_LANE_MODELS'] = 'sample-large-plus'
openLanesPopup(host, { call, error: '' }, bindings)
if (!overlay) throw new Error('the popup did not open')
const tree = JSON.parse(JSON.stringify(overlay.node('layer.overlay-1'))) as Node
const draw = (n: Node): string => {
  const p = n.p ?? n.props ?? {}
  const children = n.c ?? n.props?.children ?? []
  const kids = (Array.isArray(children) ? children : [children]).map(draw).join('')
  if ((n.k ?? n.type) === 'overlay') return `<div class="tern-overlay" role="dialog"><div class="tern-head">${esc(String(p['head'] ?? ''))}</div><div class="tern-body">${kids}</div></div>`
  if (n.k !== 'el') throw new Error(`unexpected node kind ${n.k}`)
  const tag = String(p['tag'])
  const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
  const cls = p['class'] ? ` class="${esc(String(p['class']))}"` : ''
  return `<${tag}${attrs}${cls}>${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
}
const html = `<!doctype html><meta charset="utf-8"><style>
:root { --l1:#161614; --l2:#22221f; --l3:#34332f; --t1:#e8e4da; --t2:#b4afa3; --t3:#837f74; --accent:#d7b986; --sans:'Hanken Grotesk',system-ui,sans-serif; --mono:'IBM Plex Mono',ui-monospace,monospace; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #111110; color: var(--t1); font: 14px/1.45 var(--sans); }
.pane { position: fixed; inset: 0; padding: 24px; color: #6b675e; font: 13px/1.6 var(--mono); }
.dim { position: fixed; inset: 0; background: rgba(0,0,0,0.55); }
.tern-overlay { position: absolute; left: 50%; top: 24px; transform: translateX(-50%); width: min(760px, calc(100vw - 24px)); max-height: calc(100vh - 48px); overflow: auto; background: var(--l1); border: 1px solid var(--l3); border-radius: 12px; box-shadow: 0 18px 48px rgba(0,0,0,0.6); }
.tern-head { padding: 10px 16px; border-bottom: 1px solid var(--l3); color: var(--t2); font-size: 13px; }
.tern-body { padding: 12px; }
button { cursor: pointer; }
${euiStyles()}
${[...rules.values()].join('\n')}
</style><div class="pane">hermes tern · subagents card → voice lanes<br>› the transcript sits under the popup</div><div class="dim"></div>${draw(tree)}`
const file = join(work, 'lanes.html')
writeFileSync(file, html)
const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b]); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(work, 'chromium')}`,
  '--force-device-scale-factor=1', '--window-size=1440,900', `--screenshot=${outPng}`, `file://${file}`], { stdio: 'ignore', timeout: 60_000 })
console.log(outPng)
