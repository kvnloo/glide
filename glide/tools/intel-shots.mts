// Real intel-suite kit shots over synthetic data, before/after the view-model projection.
// Mirrors lanes-shots.mts: snapshot the pinned kit DOM, render it with its actual CSS,
// and use headless Chromium for 1060x596 and 412x915 frames. No local data is read.
// Usage from the repository root:
//   bun glide/tools/intel-shots.mts OUT_DIR
// Output: OUT_DIR/{before,after}-{hill,skills,memory,failures,trace}-{desktop,phone}.png
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { euiDir, euiStyles } from '../../frontend/src/eui/cards.js'
import { createSandbox, type EuiNode } from '../../frontend/src/eui/sandbox.js'
import { INTEL_TABS, presentIntel, type IntelDoc } from '../../frontend/src/wire/intel.js'
import { DASH, MONO, NIGHT, RADIUS, STATUS, TRACK, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'intel-shots')
const work = mkdtempSync(join(tmpdir(), 'intel-shots-'))
mkdirSync(out, { recursive: true })
mkdirSync(join(out, 'html'), { recursive: true })

// Sample observations only; synthetic identities are intentionally unlike local source data.
const sample: IntelDoc = {
  kind: 'intel-suite', app: 'glide',
  data: {
    at: '2026-11-12T21:00:00Z', tab: 0,
    climbs: [
      { id: 'climb-aaaaaaaaaaaaaaaaaaaaaaaa', label: 'lab/recall-benchmark', metric: 'recall@3',
        points: [0.51, 0.55, 0.57, 0.60, 0.58, 0.66, 0.70, 0.68], best: 0.70 },
      { id: 'climb-bbbbbbbbbbbbbbbbbbbbbbbb', label: 'lab/route-test', metric: 'validation accuracy',
        points: [0.49, 0.54, 0.56, 0.58], best: 0.58 }
    ],
    routes: [
      { skill: 'systematic-debugging', hits: 16, corrected: 1 },
      { skill: 'python-testing', hits: 11, corrected: 0 },
      { skill: 'frontend-design', hits: 6, corrected: 1 }
    ],
    memory: [
      { level: 'L5', name: 'STATE-PACKET.md', size: '22800 B', fresh: '2026-11-12T20:40:00Z', stale: false },
      { level: 'L4', name: 'Reconciled-node-dossiers', size: '175400 B', fresh: '2026-11-08T19:00:00Z', stale: false },
      { level: 'L2', name: 'Distilled-facts', size: '112000 B', fresh: '2026-11-01T08:00:00Z', stale: true }
    ],
    failures: [
      { sig: 'failure-aaaaaaaaaaaaaaaaaaaaaaaa', source: 'gateway-retry', spark: '101101001011', count: 12, status: 'open' },
      { sig: 'failure-bbbbbbbbbbbbbbbbbbbbbbbb', source: 'stale-index', spark: '001010000010', count: 6, status: 'fixed' },
      { sig: 'failure-cccccccccccccccccccccccc', source: 'missing-keyring', spark: '000100000000', count: 2, status: 'law' }
    ],
    trace: [
      { lane: 'session-aaaaaaaaaaaaaaaaaaaaaaaa', spans: [[0, 4, 'm'], [4, 7, 't'], [7, 18, 'm'], [18, 19, 'e']] },
      { lane: 'session-bbbbbbbbbbbbbbbbbbbbbbbb', spans: [[6, 11, 'm'], [11, 14, 't'], [14, 24, 'm']] }
    ],
    notes: ['Sample only. Read-only observations; no real profile data.']
  }
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function draw(node: EuiNode | null): string {
  if (!node) return ''
  if (node.t === 'text') return escapeHtml(node.text)
  if (node.t === 'svg') {
    return '<img alt="Chart" width="' + node.w + '" height="' + node.h +
      '" src="data:image/svg+xml;base64,' + Buffer.from(node.svg).toString('base64') + '">'
  }
  const attrs = Object.entries(node.attrs).map(([key, value]) => ' ' + key + '="' + escapeHtml(value) + '"').join('')
  const cls = node.cls ? ' class="' + escapeHtml(node.cls) + '"' : ''
  const style = node.style ? ' style="' + escapeHtml(node.style) + '"' : ''
  const tag = node.tag
  return '<' + tag + attrs + cls + style + (node.click ? ' data-shot-clickable="true"' : '') +
    '>' + node.kids.map(draw).join('') + '</' + tag + '>'
}

const style = [
  ':root{--l1:' + NIGHT.canvas + ';--l2:color-mix(in srgb,' + DASH.fg + ' 8%,transparent);' +
  '--l3:color-mix(in srgb,' + DASH.fg + ' 15%,transparent);--t1:' + DASH.fg +
  ';--t2:' + NIGHT.text2 + ';--t3:' + NIGHT.text3 + ';--accent:' + DASH.gold +
  ';--h-success:' + STATUS.ok + ';--h-warning:' + STATUS.warn + ';--h-danger:' + STATUS.bad +
  ';--sans:"Hanken Grotesk",system-ui,sans-serif;--mono:' + MONO + ';}',
  '*{box-sizing:border-box}',
  'html,body{margin:0;min-height:100%;background:' + DASH.bg + ';color:' + DASH.fg +
    ';font:' + TYPE.body + 'px/1.45 var(--sans);}',
  '.transcript{width:100%;padding:14px;min-width:0}',
  '.glide-head{display:flex;gap:6px;align-items:center;height:24px;min-width:0;' +
    'font:' + TYPE.body + 'px/1.3 var(--sans);color:' + NIGHT.text2 + ';white-space:nowrap}',
  '.glide-head b{font-weight:500;color:' + DASH.fg + '}',
  '.sample-pill{margin-left:auto;border:1px solid ' + STATUS.ok + ';border-radius:' + RADIUS.pill +
    'px;font:' + TYPE.label + 'px/1.5 var(--mono);letter-spacing:' + TRACK.caps +
    ';color:' + STATUS.ok + ';padding:2px 8px}',
  '.intel-frame{border:1px solid var(--l3);background:var(--l1);border-radius:' + RADIUS.tile +
    'px;padding:14px;min-width:0;overflow-wrap:anywhere}',
  '.intel-frame [data-eui="card"]{width:100%;max-width:none;min-width:0}',
  '.intel-frame img{max-width:100%;height:auto}',
  euiStyles()
].join('\n')

function html(node: EuiNode | null): string {
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' + style + '</style><main class="transcript">' +
    '<div class="glide-head"><b>Glide</b><span>· Intelligence</span><span class="sample-pill">SAMPLE</span></div>' +
    '<section class="intel-frame">' + draw(node) + '</section></main></html>'
}

const browser = ['chromium', 'google-chrome-stable'].find(name => {
  try { execFileSync('which', [name]); return true } catch { return false }
})
if (!browser) throw new Error('Headless Chromium is required for intel shots')

function shoot(page: string, name: string, width: number, height: number) {
  const input = join(out, 'html', name + '.html')
  const image = join(out, name + '.png')
  writeFileSync(input, page)
  execFileSync(browser!, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=' + width + ',' + height,
    '--user-data-dir=' + join(work, 'chromium-' + name), '--screenshot=' + image,
    'file://' + input], { stdio: 'ignore', timeout: 60_000 })
  console.log(image)
}

const kit = await createSandbox(euiDir(), 'dark')
if (!kit.kinds.includes('intel-suite')) throw new Error('Pinned intel-suite kit is unavailable')
const modes: Array<['before' | 'after', IntelDoc]> = [
  ['before', sample],
  ['after', presentIntel(sample).card]
]
for (const [mode, doc] of modes) {
  for (const [index, name] of INTEL_TABS.entries()) {
    const input: IntelDoc = { ...doc, data: { ...doc.data, tab: index as IntelDoc['data']['tab'] } }
    const mounted = kit.mount('intel-suite', 'glide', () => undefined, input)
    const page = html(mounted.snapshot())
    shoot(page, mode + '-' + name + '-desktop', 1060, 596)
    shoot(page, mode + '-' + name + '-phone', 412, 915)
    mounted.dispose()
  }
}
