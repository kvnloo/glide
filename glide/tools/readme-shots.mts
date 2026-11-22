// Browser fixture shots for the README's composer widgets and fleet card: the commit heatmap under the
// composer, the focus ring round it, and /hosts. Each widget goes through the real pipeline (GlideWidgets
// reads a settings.json `ui`, compiles the glide/v1 program, binds its source, runs the design checks and
// draws with render.tsx); /hosts goes through fleetGlide and the shipped fleet program. The Tern node tree is
// then written as HTML with the real UI_CSS and ring sheets over a Tern-like pane, and one headless Chromium
// screenshots it at 1060x596. Tern's own renderer is approximated here, so these are fixture renders, not
// native Tern captures. All data is synthetic. Usage, from the repo root:
//   bun glide/tools/readme-shots.mts OUT_DIR
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import type { JSX } from '@stencil-hq/tern'

import { fleetGlide } from '../../frontend/src/glideui/fleet.js'
import { glide } from '../../frontend/src/glideui/program.js'
import { node, UI_CSS, type UiRender } from '../../frontend/src/glideui/render.js'
import { GlideWidgets, statusFile } from '../../frontend/src/glideui/widgets.js'
import type { EuiKitDoc } from '../../frontend/src/wire/euiKit.js'
import { DASH, MONO, NIGHT, STATUS } from '../frontend/tokens.js'

process.env['TZ'] = 'UTC'
const out = resolve(process.argv[2] ?? 'readme-shots')
const work = mkdtempSync(join(tmpdir(), 'readme-shots-'))
mkdirSync(out, { recursive: true })

// A fixed afternoon, so every run draws the same pictures.
const NOW = Date.UTC(2026, 10, 20, 15, 4)
const DAY = 86_400_000

/** A year of synthetic commits: weekdays busier than weekends, a quiet fortnight, a recent streak. */
function sampleCommits(): number[] {
  const times: number[] = []
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let d = 0; d < 364; d++) {
    const t = NOW - d * DAY
    const weekday = new Date(t).getUTCDay() % 6 !== 0
    if (d > 150 && d < 165) continue
    const n = d < 9 ? 2 + Math.floor(rand() * 6) : Math.floor(rand() * (weekday ? 7 : 2.2))
    for (let k = 0; k < n; k++) times.push(Math.floor(t / 1000) - k * 2400)
  }
  return times
}

// ── Tern nodes as HTML ─────────────────────────────────────────────────────────────────────────────
interface TNode { k?: string; p?: Record<string, unknown>; c?: TNode[] }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const svgs = new Map<string, string>()
const render: UiRender = { entrance: false, send: () => undefined, svg: markup => { const id = `blob${svgs.size + 1}`; svgs.set(id, markup); return id } }
type Span = { t: string; s?: string }
const spans = (v: unknown) => Array.isArray(v) ? (v as Span[]).map(s => `<span${s.s ? ` data-s="${esc(s.s)}"` : ''}>${esc(s.t)}</span>`).join('') : esc(String(v ?? ''))
const GAP: Record<string, number> = { none: 0, xs: 4, sm: 8, md: 12, lg: 18 }

function draw(raw: unknown): string {
  if (raw === null || raw === undefined || raw === false) return ''
  if (Array.isArray(raw)) return raw.map(draw).join('')
  const n = raw as TNode
  const p = n.p ?? {}
  const kids = (n.c ?? []).map(draw).join('')
  const role = typeof p['role'] === 'string' ? ` data-role="${esc(p['role'])}"` : ''
  const tone = typeof p['tone'] === 'string' ? ` data-tone="${esc(p['tone'])}"` : ''
  const gap = typeof p['gap'] === 'string' ? `gap:${GAP[p['gap']] ?? 8}px;` : ''
  const flex = `${typeof p['grow'] === 'number' ? `flex-grow:${p['grow']};` : ''}${p['basis'] === 0 ? 'flex-basis:0;' : ''}${p['shrink'] === 1 ? 'min-width:0;' : ''}`
  switch (n.k) {
    case 'el': {
      const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
      const cls = p['class'] ? ` class="sf-el ${esc(String(p['class']))}"` : ' class="sf-el"'
      const tag = String(p['tag'])
      return `<${tag}${attrs}${cls}${role}>${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
    }
    case 'col': case 'row': {
      const align = p['align'] === 'center' ? 'align-items:center;' : p['align'] === 'baseline' ? 'align-items:baseline;' : ''
      return `<div class="sf-${n.k}"${role}${tone} style="${gap}${flex}${align}${p['wrap'] ? 'flex-wrap:wrap;' : ''}">${kids}</div>`
    }
    case 'text': {
      const cut = p['truncate'] === 'end' || p['wrap'] === 'none' ? ' data-cut' : ''
      return `<span class="sf-text"${role}${tone}${cut}>${spans(p['text'])}</span>`
    }
    case 'spacer': return `<div class="sf-spacer" style="${flex}"></div>`
    case 'card': {
      const status = typeof p['status'] === 'string' ? `<span class="sf-status" data-status="${esc(p['status'])}">${esc(p['status'])}</span>` : ''
      return `<div class="sf-card"${role}><div class="sf-card-head">${spans(p['head'])}${status}</div><div class="sf-card-body">${kids}</div></div>`
    }
    case 'image': {
      const svg = svgs.get(String(p['blob'])) ?? ''
      return `<div class="sf-image" role="img" aria-label="${esc(String(p['alt'] ?? ''))}">${svg}</div>`
    }
    case 'badge': return `<span class="sf-badge"${tone}>${esc(String(p['text'] ?? ''))}</span>`
    case 'meter': {
      const v = Math.max(0, Math.min(1, Number(p['value'] ?? 0)))
      return `<div class="sf-meter"${role}${tone}><span class="sf-meter-label">${esc(String(p['label'] ?? ''))}</span><span class="sf-meter-track"><span style="width:${(v * 100).toFixed(1)}%"></span></span>${p['total'] ? `<span class="sf-meter-total">${esc(String(p['total']))}</span>` : ''}</div>`
    }
    case 'tabs': {
      const items = (p['items'] ?? []) as { id: string; label: unknown }[]
      return `<div class="sf-tabs"${role}>${items.map(t => `<span class="sf-tab"${t.id === p['active'] ? ' data-active' : ''}>${spans(t.label)}</span>`).join('')}</div>`
    }
    case 'table': {
      const cols = (p['cols'] ?? []) as { id: string; head: string; grow?: number }[]
      const rows = (p['rows'] ?? []) as { id: string; cells: Record<string, unknown> }[]
      const cell = (v: unknown) => {
        if (v && typeof v === 'object' && !Array.isArray(v) && 'meter' in v) {
          const m = Number((v as { meter: { value: number } }).meter.value)
          return `<span class="sf-meter-track sf-cell-meter"><span style="width:${(m * 100).toFixed(0)}%"></span></span>`
        }
        if (Array.isArray(v)) return (v as Span[]).map(s => `<span${s.s ? ` data-tone="${esc(s.s)}"` : ''}>${esc(s.t)}</span>`).join('')
        return esc(String(v ?? ''))
      }
      return `<table class="sf-table"${role}><tr>${cols.map(c => `<th${c.grow ? ' class="grow"' : ''}>${esc(c.head)}</th>`).join('')}</tr>${rows.map(r => `<tr>${cols.map(c => `<td>${cell(r.cells[c.id])}</td>`).join('')}</tr>`).join('')}</table>`
    }
    case 'chart': {
      const series = ((p['series'] ?? []) as { value: number }[]).map(s => s.value)
      const max = Math.max(1, ...series)
      const pts = series.map((v, i) => `${(i / Math.max(1, series.length - 1) * 300).toFixed(1)},${(40 - v / max * 36).toFixed(1)}`).join(' ')
      return `<svg class="sf-chart" width="300" height="42" viewBox="0 0 300 42"><polyline fill="none" stroke="var(--accent)" stroke-width="1.6" points="${pts}"/></svg>`
    }
    case 'kbd': return ''
    default: return `<div class="sf-${esc(String(n.k))}"${role}>${kids}</div>`
  }
}
const html = (el: JSX.Element) => draw(JSON.parse(JSON.stringify(el)))

// ── The pane ───────────────────────────────────────────────────────────────────────────────────────
const BASE = `
:root{color-scheme:dark;--bg:${DASH.bg};--l1:#151513;--l2:#2a2925;--raise:#1d1c19;--pop-bg:#1d1c19;--ink:${NIGHT.text};--muted:${DASH.muted};--accent:${DASH.gold};--sf-accent:${DASH.gold};--sf-border:${NIGHT.border}}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:13px/1.45 Inter,system-ui,sans-serif;overflow:hidden}
.win{position:fixed;inset:0;display:flex;flex-direction:column;background:#0f0f0d}
.bar{height:40px;flex:none;display:flex;align-items:center;gap:10px;padding:0 14px;color:${DASH.muted};font-size:13px}
.bar .logo{width:22px;height:22px;border-radius:50%;border:2px solid ${DASH.gold};opacity:.8}
.bar .tab{padding:4px 12px;border-radius:8px}.bar .tab.on{background:#22211e;color:var(--ink)}
.pane{flex:1;margin:0 6px;border-radius:10px;background:var(--bg);display:flex;flex-direction:column;align-items:center;overflow:hidden;position:relative}
.transcript{width:880px;flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:14px;padding:18px 0 22px}
.dock{width:712px;display:flex;flex-direction:column;gap:12px;padding-bottom:16px}
.status{height:28px;flex:none;display:flex;align-items:center;gap:16px;padding:0 22px;font:12px/1 ${MONO};color:${DASH.dim}}
.status .r{margin-left:auto}
.user{align-self:flex-end;max-width:70%;padding:8px 14px;border-radius:14px;background:#24231f;color:var(--ink)}
.note{color:${DASH.muted}}.note b{color:var(--ink);font-weight:600;margin-right:8px}
.composer{position:relative;border:1px solid var(--l2);border-radius:17px;background:#141412;padding:16px 18px 12px;display:flex;flex-direction:column;gap:12px}
.composer .ph{color:#8f8a80;font-size:14px}
.composer .chips{display:flex;gap:8px;align-items:center;font-size:12px;color:${DASH.muted}}
.composer .chips span{border:1px solid var(--l2);border-radius:999px;padding:4px 11px}
.composer .chips .send{margin-left:auto;border-radius:10px;padding:4px 14px}
.sf-col{display:flex;flex-direction:column;min-width:0}.sf-row{display:flex;flex-direction:row;min-width:0}
.sf-spacer{flex:1}
.sf-text{display:block}.sf-text[data-cut]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sf-text [data-s=muted],[data-s=muted]{opacity:.6}.sf-text [data-s=strong]{font-weight:600}
[data-tone=success]{color:${DASH.success}}[data-tone=warning]{color:${STATUS.warn}}[data-tone=error]{color:${DASH.error}}[data-tone=accent]{color:${DASH.gold}}
.sf-card{border:1px solid ${NIGHT.border};border-radius:14px;background:#161614;padding:12px 16px 14px}
.sf-card-head{display:flex;align-items:center;gap:6px;font-size:14px;padding-bottom:8px}
.sf-status{margin-left:auto;font:11px/1 ${MONO};text-transform:uppercase;letter-spacing:.08em;color:${DASH.gold}}
.sf-image svg{display:block;max-width:100%;height:auto}
.sf-badge{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid currentColor;font:11px/1.5 ${MONO};text-transform:uppercase;letter-spacing:.06em;color:${DASH.muted};white-space:nowrap}
.sf-tabs{display:flex;gap:4px;border-bottom:1px solid ${NIGHT.border}}
.sf-tab{padding:6px 12px;color:${DASH.muted}}.sf-tab[data-active]{color:var(--ink);box-shadow:inset 0 -2px ${DASH.gold}}
.sf-table{width:100%;border-collapse:collapse;font-size:13px}.sf-table th{text-align:left;font:11px/1 ${MONO};letter-spacing:.08em;opacity:.66;padding:6px 8px}
.sf-table td{padding:7px 8px;border-top:1px solid ${NIGHT.border}}
.sf-meter{display:flex;align-items:center;gap:10px}.sf-meter-track{flex:1;height:6px;border-radius:3px;background:#2b2a26;overflow:hidden;display:block;min-width:60px}
.sf-meter-track>span{display:block;height:100%;background:${DASH.gold}}
.hermes-press{all:unset;display:flex;flex-direction:column;min-width:0;font:inherit;color:inherit;text-align:left;cursor:pointer}
[data-role='glide.list.row']{border-top:1px solid ${NIGHT.border}}
[data-tone=success]{color:${DASH.success}}[data-tone=warning]{color:${STATUS.warn}}[data-tone=error]{color:${DASH.error}}
[data-role='omp.btn']{border:1px solid ${NIGHT.borderStrong};border-radius:8px;padding:5px 14px}
`
function page(name: string, body: string, sheets: readonly string[]): string {
  const file = join(work, `${name}.html`)
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${BASE}\n${sheets.join('\n')}</style>
<div class="win"><div class="bar"><span class="logo"></span><span class="tab">Default</span><span class="tab on">Glide ×</span></div>
<div class="pane">${body}</div>
<div class="status"><span>hermes</span><span>main</span><span class="r">newline · send</span></div></div>`)
  return file
}
const composer = (inner = '') => `<div class="composer sf-col" data-role="omp.editor">${inner}<div class="ph">Ask Hermes — / commands · @ files</div>
<div class="chips"><span>sample-model</span><span>medium</span><span>demo/glide</span><span class="send">⏎</span></div></div>`

const browser = ['chromium', 'google-chrome-stable', 'google-chrome'].find(b => { try { execFileSync('which', [b], { stdio: 'ignore' }); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
function shoot(file: string, png: string) {
  execFileSync(browser!, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(work, 'chromium')}`,
    '--force-device-scale-factor=1', '--window-size=1060,596', '--virtual-time-budget=2000', `--screenshot=${png}`, `file://${file}`], { stdio: 'ignore', timeout: 60_000 })
  console.log(png)
}

/** One widget through the real pipeline: settings.json → compile → bind → design checks → render.tsx. */
async function widget(mount: Record<string, unknown>, slot: 'below-composer' | 'composer-ring') {
  const settings = join(work, `${String(mount['id'])}.json`)
  writeFileSync(settings, JSON.stringify({ ui: { rev: 1, widgets: [mount] } }))
  const sheets = new Map<string, string>()
  const w = new GlideWidgets({ file: settings, restyled: () => undefined, changed: () => undefined, cwd: () => join(work, 'glide'),
    commits: async () => sampleCommits(), now: () => NOW, sheet: (name, css) => { sheets.set(name, css) } })
  await w.reload()
  await new Promise(r => setTimeout(r, 50)) // the commits source fetches once, then re-binds
  await w.reload()
  const nodes = w.nodes(slot, render)
  w.dispose()
  const verdict = JSON.parse(await Bun.file(statusFile(settings)).text()) as { widgets: Record<string, { ok: boolean; problems?: string[] }> }
  const v = verdict.widgets[String(mount['id'])]
  if (!v?.ok || !nodes.length) throw new Error(`${String(mount['id'])} did not mount: ${JSON.stringify(v)}`)
  return { body: nodes.map(html).join(''), sheets: [...sheets.values()] }
}

// 1. The commit heatmap under the composer (glide_ui_mount below-composer, git.commits).
{
  const w = await widget({ id: 'commits', slot: 'below-composer', source: 'git.commits', program: 'root = GlideCard("commits", [Graphic("heat"), Stats("stats")])' }, 'below-composer')
  shoot(page('heatmap', `<div class="transcript">
<div class="user">add a graph of my commits under the composer</div>
<div class="note"><b>Glide</b>Mounted under the composer: 52 weeks of this repo's git log. It redraws when a commit lands.</div></div>
<div class="dock">${composer()}<div class="sf-col" data-role="glide.dock">${w.body}</div></div>`, w.sheets), join(out, 'heatmap.png'))
}

// 2. The focus ring round the composer (composer-ring, clock.focus, 25 min, 11 min in; glow is the tool's default).
{
  const w = await widget({ id: 'focus', slot: 'composer-ring', source: 'clock.focus', minutes: 25, startedAt: NOW - 11 * 60_000, glow: true,
    program: 'root = GlideCard("focus", [Meter("meter"), Hero("left")])' }, 'composer-ring')
  shoot(page('focus-ring', `<div class="transcript">
<div class="user">add a focus timer that runs around my composer</div>
<div class="note"><b>Glide</b>A 25-minute focus ring is on the composer. The stroke spends clockwise from the chip.</div></div>
<div class="dock" style="padding-bottom:40px">${composer(w.body)}</div>`, w.sheets), join(out, 'focus-ring.png'))
}

// 3. /hosts over a synthetic fleet snapshot: four sample hosts, Hermes and omp agents, two k3s pods.
{
  const doc = { kind: 'fleet-hosts', app: 'k3s', data: { at: '2026-11-20T15:04:00Z', notes: ['Source: synthetic sample fleet'], hosts: [
    { id: 'atlas', label: 'atlas', role: 'workstation', online: true, gauges: { cpu: 42, mem: 61, disk: 38, gpu: 12 },
      k3s: { node: 'atlas', version: 'v1.31', pods: [['glide', 'lane-broker', 'Running', 0, ''], ['glide', 'taste-atlas', 'Running', 1, '']] },
      harnesses: [{ kind: 'hermes', agents: [
        { id: 'sample-ship-orb', name: 'Ship the voice orb', state: 'working', line: 'editing frontend/src/voice', age: '4m' },
        { id: 'sample-notes', name: 'Draft release notes', state: 'blocked', line: 'waiting for your approval', age: '12m' }] }] },
    { id: 'laptop', label: 'laptop', role: 'dev', online: true, gauges: { cpu: 18, mem: 47, disk: 71 }, k3s: null,
      harnesses: [{ kind: 'omp', agents: [{ id: 'process:4412', name: 'Lint sweep', state: 'idle', line: 'last run passed', age: '1h' }] }] },
    { id: 'phone', label: 'phone', online: true, k3s: null, harnesses: [] },
    { id: 'tablet', label: 'tablet', online: false, k3s: null, harnesses: [] }] } }
  const g = await glide()
  const { program, doc: bound } = fleetGlide(doc as unknown as EuiKitDoc, 'hosts', 'agents')
  const card = html(node(g.bind(g.program(program, 'readme'), bound), 'hosts', render))
  shoot(page('fleet', `<div class="transcript" style="justify-content:flex-start;gap:6px;padding-top:2px">
<div class="note" style="font-family:${MONO};font-size:12px">› /hosts</div>${card}</div>`, [UI_CSS]), join(out, 'fleet.png'))
}
