// How Glide cards fit Tern's transcript, drawn by the real card path and measured in headless Chromium:
// kit button labels (#289) and card density against omp's tool card (#303, #327). Cards are drawn by
// euiCardNode, the renderer Tern mounts: the pinned intel-suite kit over synthetic climbs with long labels,
// the idle /glide focus card, and the approval card from the test fixtures. The HTML carries the compacted
// card sheet plus Tern's own button rule (`button:where(.sf-el)`: inline-flex, centred, nowrap), which is
// what made long labels clip at both ends.
// This is a browser fixture, not a Tern window. Tern renders with WebKitGTK/WPE, so a real-window still is
// still needed. Usage from the repository root:
//   bun glide/tools/card-fit-shots.mts OUT_DIR
// Output: OUT_DIR/fit-{desktop,narrow,phone}.png (1060, 700 and 412 px wide) and OUT_DIR/metrics.json:
// per card its width, radius, border, shadow, inset, head-row height and the text sizes it paints; per
// button its label and whether the label crosses the button's left edge (clipped), the card's right edge,
// or ends in an ellipsis instead.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { approvalCard } from '../../frontend/src/__tests__/euiHostFixtures.js'
import { focusCommand, type GlideFocus } from '../../frontend/src/commands/glide.js'
import { euiDir, euiStyles } from '../../frontend/src/eui/cards.js'
import { hostSnapshot } from '../../frontend/src/eui/hostSnapshot.js'
import { kitSnapshot } from '../../frontend/src/eui/kitSnapshot.js'
import { createSandbox } from '../../frontend/src/eui/sandbox.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import { euiCardNode, type EuiRender } from '../../frontend/src/view/euiCard.js'
import { decodeEuiHostCard } from '../../frontend/src/wire/euiHostCard.js'
import { decodeEuiKit, kitNotes } from '../../frontend/src/wire/euiKit.js'
import { presentIntel, type IntelDoc } from '../../frontend/src/wire/intel.js'
import { DASH, MONO, NIGHT, STATUS, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'card-fit-shots')
const work = mkdtempSync(join(tmpdir(), 'card-fit-shots-'))
mkdirSync(join(out, 'html'), { recursive: true })

// Synthetic climbs whose labels are as long as the ones that clipped in the #288 hill tab.
const climb = (n: string, label: string, points: number[]) => ({ id: `climb-${n.repeat(24)}`, label, metric: 'recall@3', points, best: Math.max(...points) })
const intel: IntelDoc = {
  kind: 'intel-suite', app: 'glide',
  data: {
    at: '2026-11-12T21:00:00Z', tab: 0,
    climbs: [
      climb('a', 'lab/colony-20261103-233209/mushroom-grow-optimizer', [0.51, 0.55, 0.6, 0.58, 0.66, 0.7]),
      climb('b', 'lab/colony-20261104-081544/route-ranker-small-model', [0.49, 0.54, 0.56, 0.58]),
      climb('c', 'lab/recall-benchmark', [0.4, 0.45, 0.47])
    ],
    routes: [], memory: [], failures: [], trace: [],
    notes: ['Read-only local snapshot. Observations are not commands or verified fixes.']
  }
}
const focus: GlideFocus = {
  phase: 'PEAK', phase_source: 'circadian', flow: { flow: 0.72, confidence: 0.6 }, next_window: '14:00–16:00', bedtime: '2026-11-12T23:30:00-06:00',
  block: null, guarded: true, queued: 0, learned: { days: 10, source: 'your Hermes sessions', stop: 23, windows: [{ start: 9, end: 11, days: 20 }] }
}

// ---- Tern's node tree as HTML (design-system.mts' drawer): every el gets Tern's `sf-el` class, inline
// styles become the filtered [data-eui-s] rules Tern receives, SVG blobs become images.
interface Node { k?: string; p?: Record<string, unknown>; c?: Node[] }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const blobs = new Map<string, string>()
const rules = new Map<string, string>()
const render: EuiRender = {
  click: () => undefined,
  svg: markup => { const id = `b${blobs.size + 1}`; blobs.set(id, markup); return id },
  style: css => { const key = `s${rules.size + 1}`; rules.set(key, `[data-eui-s='${key}']{${ternBody(css.replace(/[{}<]/g, ''))}}`); return key }
}
function draw(n: Node | string): string {
  if (typeof n === 'string') return esc(n)
  const p = n.p ?? {}
  const kids = (n.c ?? []).map(draw).join('')
  if (n.k === 'image') {
    const svg = blobs.get(String(p['blob']))
    return svg ? `<img class="sf-image" width="${Number(p['w'])}" height="${Number(p['h'])}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">` : ''
  }
  if (n.k === 'text') return esc(String(p['text'] ?? ''))
  if (n.k !== 'el') throw new Error(`unexpected node kind ${String(n.k)}`)
  const tag = String(p['tag'])
  const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
  return `<${tag}${attrs} class="sf-el${p['class'] ? ` ${esc(String(p['class']))}` : ''}">${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
}
const tree = (n: unknown) => draw(JSON.parse(JSON.stringify(n)) as Node)

const hostCard = (raw: unknown) => {
  const data = decodeEuiHostCard(raw, ['approve', 'receipt', 'metric', 'note'])
  return tree(euiCardNode(data.title, { spec: { kind: data.kind, app: data.app } as never, app: data.app, label: data.title, node: hostSnapshot(data, 'pending') }, render))
}
async function focusCard(): Promise<string> {
  const got: unknown[] = []
  const cards = { publish: (d: unknown) => { got.push(d); return { update: () => undefined, revoke: () => undefined } } }
  await focusCommand(cards as never, async () => focus, '', e => { throw e })
  return hostCard(got[0])
}
async function intelCard(): Promise<string> {
  const kit = await createSandbox(euiDir(), 'dark')
  const card = decodeEuiKit({ ...presentIntel(intel).card, title: 'Local intelligence' })
  const mounted = kit.mount('intel-suite', 'glide', () => undefined, card)
  const node = euiCardNode('card', { spec: { kind: 'intel-suite', app: 'glide' } as never, app: 'glide', label: 'Local intelligence', node: kitSnapshot(mounted.snapshot(), kitNotes(card), true, false) }, render)
  mounted.dispose()
  return tree(node)
}

// The transcript column as omp sets it in a 1060 px window: 880 px, centred, min(880, width - 32) below that.
// Headless Chromium will not open a window narrower than about 500 px, so the body is pinned to the shot's width.
const page = (cards: [string, string][], width: number) => `<!doctype html><html lang="en"><meta charset="utf-8"><style>
:root{--l1:${NIGHT.canvas};--l2:color-mix(in srgb,${DASH.fg} 8%,transparent);--l3:color-mix(in srgb,${DASH.fg} 15%,transparent);--t1:${DASH.fg};--t2:${NIGHT.text2};--t3:${NIGHT.text3};--accent:${DASH.gold};--card:${NIGHT.canvas};--h-success:${STATUS.ok};--h-warning:${STATUS.warn};--h-danger:${STATUS.bad};--sans:"Hanken Grotesk",system-ui,sans-serif;--mono:${MONO}}
*{box-sizing:border-box}html,body{margin:0;background:${DASH.bg};color:${DASH.fg};font:${TYPE.body}px/1.45 var(--sans)}body{width:${width}px;overflow:hidden}
main{width:min(880px,calc(100% - 32px));margin:14px auto;min-width:0}main>section{margin:0 0 18px;min-width:0}
button:where(.sf-el){display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
${euiStyles()}
${[...rules.values()].join('\n')}
</style><main>${cards.map(([name, html]) => `<section data-fit="${name}">${html}</section>`).join('')}</main><pre id="metrics" hidden></pre><script>addEventListener('load',()=>{
const px=v=>Math.round(parseFloat(v)*10)/10,out={};
for(const s of document.querySelectorAll('[data-fit]')){
const box=s.querySelector('.eu-card'),head=s.querySelector('.eui-host-head,.eu-h'),cs=getComputedStyle(box),r=box.getBoundingClientRect();
const sizes=new Set(),walk=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);let t;
while((t=walk.nextNode()))if(t.textContent.trim()&&t.parentElement.getClientRects().length)sizes.add(px(getComputedStyle(t.parentElement).fontSize));
const buttons=[...s.querySelectorAll('button')].filter(b=>b.textContent.trim()&&b.getClientRects().length).map(b=>{
const br=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(b);const tr=range.getBoundingClientRect(),label=b.querySelector(':scope>.eu-label');
return {label:b.textContent.trim(),clipped:tr.left<br.left-0.5,pastCard:br.right>r.right+0.5,ellipsis:label?label.scrollWidth>label.clientWidth:false}});
out[s.dataset.fit]={width:Math.round(r.width),radius:px(cs.borderTopLeftRadius),border:px(cs.borderTopWidth),shadow:cs.boxShadow,
inset:px(cs.paddingLeft),head:head?Math.round(head.getBoundingClientRect().height):null,textSizes:[...sizes].sort((a,b)=>a-b),buttons}}
document.getElementById('metrics').textContent=JSON.stringify(out)})</script></html>`

const browser = ['chromium', 'google-chrome-stable'].find(name => { try { execFileSync('which', [name]); return true } catch { return false } })
if (!browser) throw new Error('Headless Chromium is required')
const flags = (name: string, w: number, h: number) => ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--user-data-dir=${join(work, name)}`]

const cards: [string, string][] = [['intel', await intelCard()], ['focus', await focusCard()], ['approval', hostCard(approvalCard())]]
const metrics: Record<string, unknown> = {}
for (const [name, w, h] of [['fit-desktop', 1060, 1500], ['fit-narrow', 700, 1700], ['fit-phone', 412, 2200]] as const) {
  const input = join(out, 'html', `${name}.html`)
  writeFileSync(input, page(cards, w))
  execFileSync(browser, [...flags(name, Math.max(w, 600), h), `--screenshot=${join(out, `${name}.png`)}`, `file://${input}`], { stdio: 'ignore', timeout: 60_000 })
  const dom = execFileSync(browser, [...flags(`${name}-m`, Math.max(w, 600), h), '--virtual-time-budget=2000', '--dump-dom', `file://${input}`], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] })
  const found = /<pre id="metrics" hidden="">([^<]*)<\/pre>/.exec(dom)?.[1]
  metrics[name] = found ? JSON.parse(found.replace(/&quot;/g, '"')) : null
  console.log(join(out, `${name}.png`))
}
writeFileSync(join(out, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n')
rmSync(work, { recursive: true, force: true })
