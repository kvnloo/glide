// Headless synthetic Fleet shots. Two presentations:
//   preview-*: the token-only fleetDesign/fleetCardHtml preview;
//   kit-{before,after}-*: what Tern draws, the pinned kit's DOM snapshot with its real stylesheet,
//   before and after fleetFit (eui/fleetFit.ts), at 1060x596 and in a 556 px pane.
// Usage from repo root: bun glide/tools/fleet-shots.mts OUT_DIR
// Writes OUT_DIR/*.png, OUT_DIR/html/*.html and OUT_DIR/measure.json (rect heights, px).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { fleetCardHtml, FLEET_DESIGN_CSS } from '../../frontend/src/commands/fleet.js'
import { compactCss, euiDir, euiStyles } from '../../frontend/src/eui/cards.js'
import { FLEET_FIT_CSS, fleetFit } from '../../frontend/src/eui/fleetFit.js'
import { createSandbox, type EuiNode } from '../../frontend/src/eui/sandbox.js'
import { TERN_ATTR } from '../../frontend/src/eui/ternCss.js'
import { decodeFleet, fleetDesign, type FleetView } from '../../frontend/src/wire/fleet.js'
import { DASH, MONO, NIGHT, RADIUS, STATUS, TRACK, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'fleet-shots')
const work = mkdtempSync(join(tmpdir(), 'fleet-shots-'))
mkdirSync(join(out, 'html'), { recursive: true })

// Demo-only fixtures; no real infrastructure, repository, session or provider data.
const at = '2026-11-12T21:00:00Z'
const gauges = { cpu: 40, mem: 55, swap: 5, disk: 60, gpu: null }
const agent = (id: string, name: string, state: string, line: string) => ({ id, name, state, line, age: '2m', model: 'sample' })
const hosts = {
  kind: 'fleet-hosts', app: 'k3s',
  data: { at, hosts: [
    { id: 'sample-host-1', label: 'Workstation', role: 'Desktop · cluster server', online: true, gauges,
      k3s: { node: 'Ready', version: 'v1.0', pods: [['sample', 'verify', 'Running', 0, ''], ['sample', 'gate', 'Running', 0, ''], ['sample', 'index', 'Completed', 0, ''], ['sample', 'cache', 'Running', 1, '']] },
      harnesses: [
        { kind: 'Hermes', agents: [agent('sample-a', 'Draft review', 'working', 'reading the sample brief'), agent('sample-b', 'Release notes', 'working', 'writing section 2 of 4'),
          agent('sample-c', 'Inbox sort', 'idle', 'waiting for the next ask'), agent('sample-d', 'Doc pass', 'idle', 'parked')] },
        { kind: 'Editor agent', agents: [agent('sample-e', 'Layout fix', 'working', 'running unit tests')] },
        { kind: 'Shell agent', agents: [agent('sample-f', 'Cleanup', 'idle', 'parked')] }] },
    { id: 'sample-host-2', label: 'Laptop', role: 'Laptop · cluster agent', online: true, gauges,
      k3s: { node: 'Ready', version: 'v1.0', pods: [['sample', 'build', 'Running', 0, '']] },
      harnesses: [{ kind: 'Hermes', agents: [agent('sample-g', 'Sample answer', 'blocked', 'approve: publish the sample wave'), agent('sample-h', 'Map export', 'working', 'step 3 of 5')] }] },
    { id: 'sample-host-3', label: 'Phone worker', role: 'Phone · virtual display', online: true, gauges, k3s: null,
      harnesses: [{ kind: 'Phone', agents: [agent('sample-i', 'Mobile checks', 'working', 'lane 2 of 3'), agent('sample-j', 'Screen notes', 'idle', 'parked')] }] },
    { id: 'sample-host-4', label: 'Build box', role: 'Server · cluster agent', online: true, gauges, k3s: null,
      harnesses: [{ kind: 'Hermes', agents: [agent('sample-k', 'Nightly build', 'working', 'compiling target 4 of 9')] }] },
    { id: 'sample-host-5', label: 'Spare host', role: 'Server', online: false, gauges, k3s: null, harnesses: [] }
  ] } }
const task = (id: string, label: string, status: string) => ({ id, label, status, url: 'https://example.test/task/' + id })
const product = (id: string, label: string, horizon: string, statuses: string[][]) => ({
  id: 'sample:' + id, label, horizon,
  features: statuses.map((tasks, f) => ({ id: id + '-f' + f, label: label + ' area ' + (f + 1), horizon, uses: ['kit'],
    tasks: tasks.map((status, t) => task(id + '-' + f + '-' + t, 'Sample task ' + (t + 1) + ' for ' + label, status)) }))
})
const portfolio = {
  kind: 'fleet-portfolio', app: 'dash',
  data: { at, portfolios: { sample: { label: 'Sample portfolio', lead: 'Five sample products, one next step each', shared: [{ id: 'kit', label: 'Card kit', owner: 'sample:cards' }],
    products: [
      product('cards', 'Cards', 'now', [['active', 'next', 'done', 'done'], ['active', 'next', 'done']]),
      product('notes', 'Notes', 'now', [['blocked', 'next', 'active', 'done', 'done', 'done'], ['next', 'done']]),
      product('maps', 'Maps', 'next', [['next', 'done', 'done'], ['active', 'next', 'done', 'done']]),
      product('sound', 'Sound', 'next', [['active', 'next', 'done'], ['next']]),
      product('garden', 'Garden', 'later', [['next', 'done', 'done'], ['done', 'done']])] } } } }
const node = (id: string, col: number, label: string, kind: string, state: string, extra: Record<string, string> = {}) => ({ id, col, label, kind, state, ...extra })
const factory = {
  kind: 'fleet-factory', app: 'aodl',
  data: { at, stats: { queue: 6, depth: 20, sendsHour: 9, capHour: 30, posted: 14, verifyPass: 0.9 },
    nodes: [
      node('brain', 0, 'Dispatch', 'chat', 'live'),
      node('lane-1', 1, 'Verify lane', 'subagent', 'live'), node('lane-2', 1, 'Review lane', 'subagent', 'needs-you', { reason: 'sample approval waiting', action: 'Prepare fix' }),
      node('lane-3', 1, 'Docs lane', 'subagent', 'idle'),
      node('card-1', 2, 'Sample card A', 'chat', 'failing', { reason: 'sample check failed', action: 'Prepare fix' }), node('card-2', 2, 'Sample card B', 'chat', 'done'),
      node('card-3', 2, 'Sample card C', 'chat', 'needs-you', { reason: 'sample answer needed', action: 'Prepare fix' }),
      node('card-4', 2, 'Sample card D', 'chat', 'failing', { reason: 'sample build failed', action: 'Prepare fix' }),
      node('repo-1', 3, 'sample/one', 'repo', 'idle'), node('repo-2', 3, 'sample/two', 'repo', 'idle')],
    edges: [['brain', 'lane-1', 'delegated', true], ['brain', 'lane-2', 'delegated', true], ['brain', 'lane-3', 'delegated', false],
      ['lane-1', 'card-1', 'delegated', true], ['lane-1', 'card-2', 'delegated', false], ['lane-2', 'card-3', 'delegated', true],
      ['lane-3', 'card-4', 'delegated', false], ['card-1', 'repo-1', 'touched', false], ['card-3', 'repo-2', 'touched', false]] } }
const documents = { hosts, portfolio, factory }
const title = { hosts: 'Hosts', portfolio: 'Portfolio', factory: 'Factory graph' }

const browser = ['chromium', 'google-chrome-stable'].find(command => {
  try { execFileSync('which', [command], { stdio: 'ignore' }); return true }
  catch { return false }
})
if (!browser) throw new Error('Headless Chromium not found')
const chrome = (name: string, width: number, height: number, scale: number, file: string, extra: string[]) =>
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--user-data-dir=' + join(work, 'chrome-' + name), '--force-device-scale-factor=' + scale,
    '--window-size=' + width + ',' + height, ...extra, 'file://' + file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 })

const esc = (value: unknown): string => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const TAGS = new Set(['div', 'span', 'p', 'section', 'header', 'footer', 'nav', 'aside', 'main', 'article', 'figure', 'blockquote', 'ul', 'ol', 'li',
  'dl', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'pre', 'code', 'kbd', 'strong', 'b', 'em', 'i', 'del', 'mark', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'label', 'button', 'form', 'input'])
const INLINE = new Set(['a', 'small', 'sup', 'sub', 'abbr', 'time', 's', 'u', 'var', 'cite', 'q', 'output', 'bdi', 'textarea', 'select', 'option'])
const BOOLEAN = new Set(['checked', 'open', 'hidden', 'disabled'])

/** view/euiCard.tsx's conversion, as HTML: Tern's tag set, data-eui-a- attribute mirrors, SVG as an image. */
function draw(node: EuiNode): string {
  if (node.t === 'text') return esc(node.text)
  if (node.t === 'svg') return '<span data-eui-svg class="' + esc(node.cls) + '" style="' + esc(node.style) + '"><img alt="" width="' + Math.round(node.w) +
    '" height="' + Math.round(node.h) + '" src="data:image/svg+xml;base64,' + Buffer.from(node.svg).toString('base64') + '"></span>'
  const tag = node.tag === 'input' ? (['checkbox', 'radio'].includes(node.attrs['type'] ?? '') ? 'input' : 'span')
    : TAGS.has(node.tag) ? node.tag : INLINE.has(node.tag) ? 'span' : 'div'
  let attrs = ''
  for (const [k, v] of Object.entries(node.attrs)) {
    if (/^(data-|aria-)/.test(k) || k === 'role') attrs += ' ' + k + '="' + esc(v) + '"'
    if (!k.startsWith('data-') && (v !== '' || !BOOLEAN.has(k))) attrs += ' ' + TERN_ATTR + k + '="' + esc(v) + '"'
  }
  if (node.attrs['hidden']) attrs += ' hidden'
  if (node.attrs['disabled']) attrs += ' disabled'
  if (tag === 'input') attrs += ' type="checkbox"' + (node.attrs['checked'] ? ' checked' : '')
  const kids = node.kids.map(draw).join('') + (node.tag === 'input' && tag === 'span' ? esc(node.attrs['value'] || node.attrs['placeholder'] || '') : '')
  return '<' + tag + attrs + (node.cls ? ' class="' + esc(node.cls) + '"' : '') + (node.style ? ' style="' + esc(node.style) + '"' : '') + '>' + kids + '</' + tag + '>'
}

const ROWS = { hosts: '.fh-row,.fh-mach,.fh-podwrap', portfolio: '.fp-prow,.fp-task', factory: '.ff-bi' }
/** Writes rect heights into the DOM, read back by --dump-dom: card, head, groups, and the third visible row's bottom from the head's top. */
const measure = (view: FleetView) => '<script>addEventListener("load",()=>{const r=e=>Math.round(e.getBoundingClientRect().height);' +
  'const head=document.querySelector(".tern-head"),top=head.getBoundingClientRect().top,card=document.querySelector("article.eu-card");' +
  'const rows=[...document.querySelectorAll(' + JSON.stringify(ROWS[view]) + ')].filter(e=>e.getClientRects().length);' +
  'const m={head:r(head),card:r(card),groups:[...document.querySelectorAll(".fp-group,.fh-host-group")].map(r),rows:rows.length,' +
  'more:[...document.querySelectorAll(".fl-more")].map(e=>e.textContent),' +
  'parts:Object.fromEntries([...document.querySelectorAll(".fl-root>*,.fh-view>*")].map(e=>[e.className.split(" ")[0]||e.tagName,r(e)])),' +
  'tags:[...new Set([...document.querySelectorAll(\".fp-hz,.fp-st,.fp-tag,.fh-count,.fl-tag\")].map(e=>{const s=getComputedStyle(e);return s.backgroundColor+\" \"+s.borderTopWidth+\" \"+s.borderTopColor+\" \"+s.color}))],' +
  'guides:[...document.querySelectorAll(\".fp-kids,.fp-feat,.fp-tasks,.fh-kids\")].filter(e=>getComputedStyle(e).borderLeftWidth!==\"0px\"||getComputedStyle(e,\"::before\").display!==\"none\"&&getComputedStyle(e,\"::before\").content!==\"none\").length,' +
  'row3:rows[2]?Math.round(rows[2].getBoundingClientRect().bottom-top):null};' +
  'document.body.setAttribute("data-measure",JSON.stringify(m))})</script>'

const ternCss = ':root{--l1:' + DASH.bg + ';--l2:color-mix(in srgb,' + DASH.fg + ' 8%,transparent);--l3:' + NIGHT.borderStrong +
  ';--card:' + DASH.bg + ';--t1:' + DASH.fg + ';--t2:' + DASH.muted + ';--t3:' + DASH.muted + ';--accent:' + DASH.gold +
  ';--h-success:' + STATUS.ok + ';--h-warning:' + STATUS.warn + ';--h-danger:' + STATUS.bad + ';--sans:"Hanken Grotesk",system-ui,sans-serif;--mono:' + MONO + '}' +
  '*{box-sizing:border-box}body{margin:0;padding:12px;background:' + DASH.bg + ';color:' + DASH.fg + ';font:' + TYPE.body + 'px/1.4 var(--sans)}' +
  '.transcript{margin:0 auto;min-width:0}.tern-head{display:flex;gap:8px;height:24px;align-items:center;white-space:nowrap;overflow:hidden;color:' + DASH.muted + '}' +
  '.tern-head span{color:' + DASH.fg + ';overflow:hidden;text-overflow:ellipsis}'
// "before" is the kit sheet without the fit's rules, "after" the sheet Tern gets.
const fitCss = compactCss(FLEET_FIT_CSS)
if (!euiStyles().includes(fitCss)) throw new Error('the kit sheet no longer carries FLEET_FIT_CSS verbatim')
const sheet = { before: euiStyles().replace(fitCss, ''), after: euiStyles() }

function kitPage(view: FleetView, node: EuiNode | null, width: number, hero: string, mode: 'before' | 'after'): string {
  const kids = node?.t === 'el' ? node.kids.map(draw).join('') : ''
  return '<!doctype html><html lang="en"><meta charset="utf-8"/><title>Glide Fleet kit · SAMPLE · ' + view + '</title><style>' + ternCss + sheet[mode] +
    '</style><body><main class="transcript" style="width:' + width + 'px"><div class="tern-head">Glide <span>' + esc(title[view] + ' · ' + hero) +
    '</span></div><div data-eui="card" data-eu data-eui-kind="fleet-' + view + '">' + kids + '</div></main>' + measure(view) + '</body></html>'
}

function previewPage(view: FleetView): string {
  const card = fleetCardHtml(fleetDesign(decodeFleet(documents[view], view), view))
  return '<!doctype html><html lang="en"><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<title>Glide Fleet · SAMPLE · ' + view + '</title><style>' +
    ':root{--l1:' + DASH.bg + ';--l2:color-mix(in srgb,' + DASH.fg + ' 6%,transparent);' +
    '--l3:' + NIGHT.borderStrong + ';--t1:' + DASH.fg + ';--t2:' + NIGHT.text2 + ';' +
    '--sans:"Hanken Grotesk",system-ui,sans-serif;--mono:' + MONO + '}' +
    '*{box-sizing:border-box}body{margin:0;padding:24px 12px;background:' + DASH.bg +
    ';color:' + DASH.fg + ';font:' + TYPE.body + 'px/1.4 var(--sans)}' +
    '.transcript{width:min(880px,100%);margin:0 auto;min-width:0}' +
    '.sample{display:inline-block;margin:0 0 12px;padding:5px 8px;background:var(--l2);' +
    'border-radius:' + RADIUS.pill + 'px;color:var(--t2);font:' + TYPE.label + 'px ' +
    MONO + ';letter-spacing:' + TRACK.caps + '}' +
    FLEET_DESIGN_CSS + '</style><main class="transcript">' +
    '<span class="sample">SAMPLE</span>' + card + '</main></html>'
}

for (const view of ['hosts', 'portfolio', 'factory'] as const) {
  for (const [size, width, height, scale] of [['desktop', 1060, 596, 1], ['phone', 412, 915, 2]] as const) {
    const name = 'preview-' + view + '-' + size
    const file = join(out, 'html', name + '.html')
    writeFileSync(file, previewPage(view))
    chrome(name, width, height, scale, file, ['--screenshot=' + join(out, name + '.png')])
    console.log(join(out, name + '.png'))
  }
}

const kit = await createSandbox(euiDir(), 'dark')
const report: Record<string, unknown> = {}
for (const view of ['hosts', 'portfolio', 'factory'] as const) {
  const doc = documents[view]
  const hero = fleetDesign(decodeFleet(doc, view), view).hero
  for (const mode of ['before', 'after'] as const) {
    const mounted = kit.mount('fleet-' + view, doc.app, () => undefined, doc, undefined, mode === 'after' ? fleetFit('fleet-' + view) : undefined)
    const snap = mounted.snapshot()
    mounted.dispose()
    // Tern's transcript column at this window, and the narrower pane the factory card was measured in.
    for (const [pane, width] of [['desktop', 880], ['pane', 556]] as const) {
      const name = 'kit-' + mode + '-' + view + '-' + pane
      const file = join(out, 'html', name + '.html')
      writeFileSync(file, kitPage(view, snap, width, hero, mode))
      const dom = chrome(name + '-m', 1060, 596, 1, file, ['--virtual-time-budget=3000', '--dump-dom'])
      const found = /data-measure="([^"]*)"/.exec(dom)
      report[name] = found ? JSON.parse(found[1]!.replace(/&quot;/g, '"')) : null
      chrome(name, 1060, 596, 1, file, ['--screenshot=' + join(out, name + '.png')])
      console.log(join(out, name + '.png'), JSON.stringify(report[name]))
    }
  }
}
writeFileSync(join(out, 'measure.json'), JSON.stringify(report, null, 2) + '\n')
