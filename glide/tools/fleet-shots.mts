// Headless synthetic Fleet shots from the production fleetDesign/fleetCardHtml presentation.
// Usage from repo root: bun glide/tools/fleet-shots.mts OUT_DIR
// Writes hosts|portfolio|factory at 1060x596 and 412x915, plus matching HTML.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { fleetCardHtml, FLEET_DESIGN_CSS } from '../../frontend/src/commands/fleet.js'
import { decodeFleet, fleetDesign, type FleetView } from '../../frontend/src/wire/fleet.js'
import { DASH, MONO, NIGHT, RADIUS, TRACK, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'fleet-shots')
const work = mkdtempSync(join(tmpdir(), 'fleet-shots-'))
mkdirSync(out, { recursive: true })
mkdirSync(join(out, 'html'), { recursive: true })

// Demo-only fixtures; no real infrastructure, repository, session or provider data.
const hosts = {
  kind: 'fleet-hosts', app: 'k3s',
  data: { hosts: [
    { id: 'sample-host-1', label: 'Workstation', online: true, k3s: { node: 'Ready', pods: [['sample', 'verify', 'Running', 0, '']] },
      harnesses: [{ kind: 'Hermes', agents: [{ id: 'sample-session', name: 'Draft review', state: 'blocked' }] }] },
    { id: 'sample-host-2', label: 'Phone worker', online: true, k3s: null, harnesses: [
      { kind: 'Phone', agents: [{ id: 'sample-phone', name: 'Mobile checks', state: 'working' }] }] },
    { id: 'sample-host-3', label: 'Spare host', online: false, k3s: null, harnesses: [] }
  ] } }
const portfolio = {
  kind: 'fleet-portfolio', app: 'dash',
  data: { portfolios: { sample: { products: [
    { id: 'sample:glide', label: 'Glide', features: [
      { id: 'ui', label: 'glide', tasks: [
        { id: 'sample-1', label: 'Review compact cards', status: 'blocked', url: 'https://example.test/task/1' },
        { id: 'sample-2', label: 'Polish phone sizing', status: 'next' }] }] },
    { id: 'sample:factory', label: 'Factory', features: [
      { id: 'work', label: 'factory', tasks: [{ id: 'sample-3', label: 'Review handoff', status: 'active', url: 'https://example.test/task/3' }] }] }
  ] } } } }
const factory = {
  kind: 'fleet-factory', app: 'aodl',
  data: { nodes: [
    { id: 'brain', label: 'Dispatch', state: 'done', col: 0 },
    { id: 'lane', label: 'Verify', state: 'running', col: 1 },
    { id: 'card', label: 'Review gate', state: 'needs-you', col: 2 },
    { id: 'repo', label: 'Publish result', state: 'idle', col: 3 }
  ], edges: [
    ['brain', 'lane', 'delegated', true], ['lane', 'card', 'delegated', true],
    ['card', 'repo', 'touched', false]
  ] } }
const documents = { hosts, portfolio, factory }
const browser = ['chromium', 'google-chrome-stable'].find(command => {
  try { execFileSync('which', [command], { stdio: 'ignore' }); return true }
  catch { return false }
})
if (!browser) throw new Error('Headless Chromium not found')

function html(view: FleetView): string {
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
  const document = html(view)
  for (const [size, width, height, scale] of [
    ['desktop', 1060, 596, 1], ['phone', 412, 915, 2]
  ] as const) {
    const name = view + '-' + size
    const file = join(out, 'html', name + '.html')
    const shot = join(out, name + '.png')
    writeFileSync(file, document)
    execFileSync(browser, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--user-data-dir=' + join(work, 'chrome-' + name),
      '--force-device-scale-factor=' + scale,
      '--window-size=' + width + ',' + height,
      '--screenshot=' + shot, 'file://' + file
    ], { stdio: 'ignore', timeout: 60_000 })
    console.log(shot)
  }
}
