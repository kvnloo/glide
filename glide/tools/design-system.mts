// Glide's design system on one page: the tokens (glide/frontend/tokens.ts) and every Glide view, each drawn
// by its real code path, once per theme mode, over a wallpaper. Focus, digest, wind-down and hours cards come
// from the real /glide focus command; approval and intent cards from the test fixtures; all go through
// hostSnapshot and euiCardNode, the renderer Tern mounts. The council and lanes popups come from their open*
// functions, the orb from orbSvg, and the surface rows carry the selectors glass.ts dresses. Each mode wears
// the stylesheet the Theme class installs for `/glide theme dash` or `/glide theme auto`, reading the
// wallpaper's pywal colors.json, with the region left clear, as on Tern's transparent window.
// Then one headless Chromium at a time frames each section at desktop (1440x900) and phone (412x915, 2x)
// size: a viewport each, so the fixed wallpaper sits as it would on screen. Usage, from the repo root:
//   bun glide/tools/design-system.mts OUT_DIR WALLPAPER_IMAGE WAL_COLORS_JSON
// The page only links the wallpaper; workshop art is not ours, so neither it nor these frames go in the repo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { approvalCard } from '../../frontend/src/__tests__/euiHostFixtures.js'
import { intentCards } from '../../frontend/src/__tests__/intentFixtures.js'
import { orbSvg, type OrbState } from '../../frontend/src/chrome/orb.js'
import { Theme } from '../../frontend/src/chrome/theme.js'
import { focusCommand, type GlideFocus } from '../../frontend/src/commands/glide.js'
import { euiStyles } from '../../frontend/src/eui/cards.js'
import { hostSnapshot } from '../../frontend/src/eui/hostSnapshot.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import { contrastRatio, mix, relativeLuminance } from '../../frontend/src/hermes/theme.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import type { ThemeMode } from '../../frontend/src/settings.js'
import { euiCardNode, type EuiRender } from '../../frontend/src/view/euiCard.js'
import { parseLaneStatus } from '../../frontend/src/voice/lanes.js'
import { decodeEuiHostCard } from '../../frontend/src/wire/euiHostCard.js'
import { demoRun, schedule } from '../frontend/council.js'
import { type CouncilHost, openCouncilPopup } from '../frontend/councilPopup.js'
import { restTint } from '../frontend/glass.js'
import { INTENT_KINDS } from '../frontend/intentCards.js'
import { fileBindings, openLanesPopup } from '../frontend/lanesPopup.js'
import { COUNCIL_HUE, DASH, GOLD, MONO, NIGHT, RADIUS, SERIF, STATUS, TRACK, TYPE } from '../frontend/tokens.js'
import type { WalPalette } from '../frontend/wal.js'

const [outArg, wallArg, walArg] = process.argv.slice(2)
if (!outArg || !wallArg || !walArg) throw new Error('usage: bun glide/tools/design-system.mts OUT_DIR WALLPAPER_IMAGE WAL_COLORS_JSON')
const out = resolve(outArg)
const wallpaper = resolve(wallArg)
const project = join(dirname(wallpaper), 'project.json')
const wallName = existsSync(project) ? String((JSON.parse(readFileSync(project, 'utf8')) as { title?: string }).title ?? basename(wallpaper)) : basename(wallpaper)
mkdirSync(out, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'glide-design-system-'))

// ---- Tern's node tree as HTML, as council-shots.mts draws it: `el` nodes keep tags and attributes,
// inline styles become the same filtered [data-eui-s] rules Tern receives, SVG blobs become images.
interface Node { k?: string; p?: Record<string, unknown>; c?: Node[]; type?: string; props?: Record<string, unknown> & { children?: Node | Node[] } }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const blobs = new Map<string, string>()
const rules = new Map<string, string>()
const render: EuiRender = {
  click: () => undefined,
  svg: markup => { const id = `b${blobs.size + 1}`; blobs.set(id, markup); return id },
  style: css => { const key = `s${rules.size + 1}`; rules.set(key, `[data-eui-s='${key}']{${ternBody(css.replace(/[{}<]/g, ''))}}`); return key }
}
const img = (svg: string, w: number, h: number) => `<img width="${w}" height="${h}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`
function draw(n: Node | string | null): string {
  if (n === null) return ''
  if (typeof n === 'string') return esc(n)
  const p = n.p ?? n.props ?? {}
  const children = n.c ?? n.props?.children ?? []
  const kids = (Array.isArray(children) ? children : [children]).map(draw).join('')
  if ((n.k ?? n.type) === 'overlay') return `<div class="sf-overlay"><div class="sf-ov-card"><div class="ov-head">${esc(String(p['head'] ?? ''))}</div><div class="ov-body">${kids}</div></div></div>`
  if (n.k === 'image') { const svg = blobs.get(String(p['blob'])); return svg ? img(svg, Number(p['w']), Number(p['h'])) : '' }
  if (n.k !== 'el') throw new Error(`unexpected node kind ${String(n.k ?? n.type)}`)
  const tag = String(p['tag'])
  const attrs = Object.entries((p['attrs'] ?? {}) as Record<string, string>).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')
  const cls = p['class'] ? ` class="${esc(String(p['class']))}"` : ''
  return `<${tag}${attrs}${cls}${p['disabled'] ? ' disabled' : ''}>${typeof p['text'] === 'string' ? esc(p['text']) : ''}${kids}</${tag}>`
}
const tree = (n: unknown) => draw(JSON.parse(JSON.stringify(n)) as Node)

// ---- the components, from their real code paths, on synthetic data
const KINDS = ['approve', 'receipt', 'metric', ...INTENT_KINDS]
const hostCard = (raw: unknown) => {
  const data = decodeEuiHostCard(raw, KINDS)
  return tree(euiCardNode(data.title, { spec: { kind: data.kind, app: data.app } as never, app: data.app, label: data.title, node: hostSnapshot(data, 'pending') }, render))
}

/** The cards /glide focus publishes: idle, `50` (block on), `stop` (ended + digest), `wind-down`, `hours`. */
async function focusCards(): Promise<unknown[]> {
  const focus = (f: Partial<GlideFocus> = {}): GlideFocus => ({
    phase: 'PEAK', phase_source: 'circadian', flow: { flow: 0.72, confidence: 0.6 }, next_window: '14:00–16:00', bedtime: '2026-11-12T23:30:00-06:00',
    block: null, guarded: true, queued: 0, learned: { days: 10, source: 'your Hermes sessions', stop: 23, windows: [{ start: 9, end: 11, days: 20 }, { start: 14, end: 16, days: 9 }] }, ...f
  })
  const got: unknown[] = []
  const cards = { publish: (d: unknown) => { got.push(d); return { update: (u: unknown) => void got.push(u), revoke: () => undefined } } }
  const run = (sub: string, f: GlideFocus) => focusCommand(cards as never, async () => f, sub, e => { throw e })
  await run('', focus())
  await run('50', focus({ block: { until: '10:20', minutes_left: 38, minutes: 50 }, queued: 2 }))
  await run('stop', focus({ digest: [{ cls: 'review', title: 'A pull request wants a look' }, { cls: 'question', title: 'Which branch ships Friday?' }] }))
  await run('wind-down', focus({ phase: 'WIND_DOWN', wind_down: { nudge: true, resume: { title: 'parser', last_asks: ['fix the tokenizer', 'rerun the lanes probe'] } } }))
  await run('hours', focus())
  return got
}

function popup(open: (host: CouncilHost) => void, after?: (o: Overlay) => void): string {
  let overlay: Overlay | undefined
  const host: CouncilHost = {
    open: o => { overlay = o }, close: () => { overlay = undefined }, changed: () => undefined,
    transcript: { notice: (text: string) => { throw new Error(text) } },
    eui: { host: { publish: () => { throw new Error('no cards here') } }, click: render.click, svg: render.svg, style: render.style }
  }
  open(host)
  if (!overlay) throw new Error('the popup did not open')
  after?.(overlay)
  return tree(overlay.node('layer.overlay-1'))
}

/** /council, settled on its verdict. */
function councilPopup(): string {
  let now = 0
  return popup(host => openCouncilPopup(host, { run: demoRun(), live: false, from: 'synthetic seats and brief' }, { now: () => now, every: () => () => undefined }),
    o => { o.onKey({ name: 'enter', ctrl: false, alt: false, shift: false, meta: false }); now = schedule(demoRun()).total })
}

/** The voice lanes popup over lanes-shots.mts' synthetic call, its lanes on catalog models so each chip reads as a real pick. */
function lanesPopup(): string {
  const call = parseLaneStatus({
    session_id: 'demo-call', open: true, revision: 'r12',
    lanes: [
      { role: 'fast', model: 'qwen3-1.7b', resolved: null, state: 'answered', researching: null, error: null, entry: { text: 'Standup moved to 10:30; the agenda is unchanged.', confidence: 0.86, status: 'draft', kind: 'answer' } },
      { role: 'small', model: 'qwen3.5-4b', resolved: null, state: 'verified', researching: null, error: null, entry: { text: 'Checked: the release notes list three fixes, not four.', confidence: 0.93, status: 'verified', kind: 'answer' } },
      { role: 'large', model: 'claude-sonnet-5', resolved: null, state: 'thinking', researching: 'compare the two rollout plans', error: null, entry: null },
      { role: 'council', model: 'socratic-council', resolved: null, state: 'dead', researching: null, error: 'provider timed out after 30s', entry: null }
    ]
  })
  const bindings = fileBindings(join(work, 'bindings.json'))
  bindings.set('large', 'slow')
  return popup(host => openLanesPopup(host, { call, error: '' }, bindings))
}

// ---- the token sections
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',')
const swatch = (name: string, hex: string, on: string) =>
  `<figure class="sw"><i style="background:${hex}"></i><figcaption><b>${esc(name)}</b><span>${hex}</span><span>${(contrastRatio(hex, on) ?? 0).toFixed(1)}:1</span></figcaption></figure>`
const group = (title: string, items: Record<string, string>, on: string) =>
  `<div class="sw-group"><h4>${title}</h4><div class="sw-row">${Object.entries(items).map(([k, v]) => swatch(k, v, on)).join('')}</div></div>`

function tokens(p: WalPalette): { colour: string; type: string } {
  // The resting glass over the wallpaper's lightest sample: the worst case the floor is set for.
  const light = [...p.samples].sort((a, b) => (relativeLuminance(b) ?? 0) - (relativeLuminance(a) ?? 0))[0] ?? p.bg
  const glass = mix(light, p.bg, restTint(p) / 100)
  const theme = { fg: p.fg, accent: p.accent, glow: p.glow, muted: p.muted, dim: p.dim, error: p.error, success: p.success, warning: p.warning }
  const night = Object.fromEntries(Object.entries(NIGHT).filter(([, v]) => v.startsWith('#')))
  const mono = (k: string) => k === 'label' || k === 'meta'
  const serif = (k: string) => ['lead', 'name', 'title', 'display', 'hero', 'giant'].includes(k)
  const type = Object.entries(TYPE).map(([k, v]) => {
    const style = mono(k) ? `font-family:${MONO};${k === 'label' ? `text-transform:uppercase;letter-spacing:${TRACK.wide}` : ''}`
      : serif(k) ? `font-family:${SERIF};letter-spacing:${v >= 80 ? TRACK.giant : v >= 28 ? TRACK.display : TRACK.tight}` : 'font-family:var(--sans)'
    return `<div class="ty"><code>${k} · ${v}px</code><span style="${style};font-size:${v}px">${v >= 44 ? '4.5:1' : mono(k) ? 'lane · broker · 0.93' : 'The council has spoken'}</span></div>`
  }).join('')
  const radius = Object.entries(RADIUS).map(([k, v]) => `<div class="ra"><i style="border-radius:${v}px"></i><code>${k} · ${v === 999 ? 'pill' : `${v}px`}</code></div>`).join('')
  const track = Object.entries(TRACK).map(([k, v]) => {
    const caps = k === 'caps' || k === 'wide'
    return `<div class="tr"><code>${k} · ${v}</code><span style="letter-spacing:${v};font-family:${caps ? MONO : SERIF};font-size:${caps ? TYPE.label : TYPE.title}px;${caps ? 'text-transform:uppercase' : ''}">${caps ? 'glide · council' : 'Deep work, guarded'}</span></div>`
  }).join('')
  return {
    colour: `<section class="pane"><h3>Colour</h3>
${group(`/glide theme ${p.source === 'dash' ? 'dash' : 'auto'} · contrast on the glass over the wallpaper's lightest sample (${glass})`, theme, glass)}
${group('Dash · tokens.DASH · on Dash black', { ...DASH }, DASH.bg)}
${group('Popup night inks · tokens.NIGHT · faint marks bars only', night, NIGHT.canvas)}
${group('The one gold call to action · tokens.GOLD · ink on fill', { ...GOLD }, GOLD.fill)}
${group('Status fallbacks and the council hue · on Dash black', { ...STATUS, council: COUNCIL_HUE }, DASH.bg)}
<p class="note">Glass floor ${p.floor}% · resting tint ${restTint(p)}% of ${p.bg}. Every text ink holds 4.5:1 over every wallpaper sample through the frost's saturate() steps (designTokens.test.ts).</p></section>`,
    type: `<section class="pane"><h3>Type · tokens.TYPE</h3>${type}</section>
<section class="pane split"><div><h3>Radius · tokens.RADIUS</h3><div class="ra-row">${radius}</div><p class="note">Circles use 50%.</p></div><div><h3>Tracking · tokens.TRACK</h3>${track}</div></section>`
  }
}

const orbs = () => (['idle', 'listening', 'thinking', 'working', 'speaking', 'waiting', 'error'] as OrbState[])
  .map(s => `<figure>${img(orbSvg(s, 1.2, true), 72, 72)}<figcaption>${s}</figcaption></figure>`).join('')

/** Tern's own rows (status, transcript, native card, composer, lanes) under the selectors glass.ts dresses. */
const surface = () => `<div class="sf sf-status"><span>glide</span><span>claude-opus · 41% context</span><span>focus · peak · block 38m</span></div>
<div class="row"><div class="sf sf-text">› A banner line in the transcript sits on its own strip of glass.</div></div>
<div class="sf sf-card"><div class="sf-text"><b>Native card</b> · a Tern card with a head: the tool result, the diff, the file read.</div></div>
<div class="sf-col" data-role="omp.live.lanes"><div class="sf-text">lanes · fast answered · small verified · large thinking: compare the two rollout plans</div></div>
<div class="sf sf-col sf-col" data-role="omp.editor"><div class="sf-text">Ask Glide…  /glide focus 50 · /council · /glide theme dash</div></div>`

// ---- the page, per theme mode
function themeSheet(mode: ThemeMode, walFile: string) {
  const sheets = new Map<string, string>()
  const theme = new Theme({ palette: () => undefined, stylesheet: (n, css) => void (css === null ? sheets.delete(n) : sheets.set(n, css)), settings: { save: () => ({}) }, walFile }, mode)
  theme.apply()
  const p = theme.wal
  theme.dispose()
  if (!p) throw new Error(`${walFile} is not a pywal colors.json`)
  return { css: [...sheets.values()].join('\n'), p }
}

const cards = [...await focusCards(), approvalCard(), ...Object.values(intentCards)].map(hostCard)
const council = councilPopup()
const lanes = lanesPopup()

const MODES: [ThemeMode, string][] = [['dash', 'Dash: warm night, cream ink, one gold'], ['auto', 'Auto: the wallpaper\'s own colours']]
const grid = (from: number, to?: number) => `<div class="grid">${cards.slice(from, to).map(c => `<div class="cell">${c}</div>`).join('')}</div>`
const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b]); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
const OVERLAP = 120

for (const [mode, blurb] of MODES) {
  const { css, p } = themeSheet(mode, resolve(walArg))
  const other = MODES.find(([m]) => m !== mode)?.[0] ?? mode
  const t = tokens(p)
  const sections: Record<string, string> = {
    colour: `<h2>Tokens · glide/frontend/tokens.ts</h2>${t.colour}`,
    type: `<h2>Tokens · glide/frontend/tokens.ts</h2>${t.type}`,
    cards: `<h2>Cards · hostSnapshot → euiCardNode</h2>${grid(0, 6)}`,
    'cards-2': `<h2>Cards · approval and the AODL intent heroes</h2>${grid(6)}`,
    council: `<h2>Popups · /council</h2><div class="popup" id="council">${council}</div>`,
    lanes: `<h2>Popups · voice lanes</h2><div class="popup" id="lanes">${lanes}</div>`,
    surface: `<h2>Surface · chrome/orb.ts and Tern's rows under glass.ts</h2><section class="pane"><h3>Voice orb</h3><div class="orbs">${orbs()}</div></section>${surface()}`
  }
  // The gallery's own labels sit on the resting glass the glass sheet gives Tern's banner lines and card heads.
  const glass = `background: rgba(${rgb(p.bg)},${restTint(p) / 100}); -webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%);`
  const page = (body: string) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Glide design system · ${mode}</title><style>
:root { --l1:#161614; --l2:#22221f; --l3:#34332f; --t1:#e8e4da; --t2:#b4afa3; --t3:#837f74; --accent:#d7b986; --sans:'Hanken Grotesk',system-ui,sans-serif; --mono:${MONO}; }
* { box-sizing: border-box; }
/* A still shows each card settled: entrances (the digest tile lands at .9s) end, loops hold one phase. */
*, *::before, *::after { animation-delay: -30s !important; animation-play-state: paused !important; }
html { background: #000 url("file://${encodeURI(wallpaper)}") center / cover fixed; }
body { margin: 0; font: ${TYPE.body}px/1.45 var(--sans); }
.sf-region[data-surface] { background: transparent; min-height: 100vh; padding: 24px clamp(12px, 3vw, 40px) 40px; }
header { display: flex; align-items: baseline; gap: 6px 16px; flex-wrap: wrap; padding: 14px 18px; border-radius: ${RADIUS.card}px; ${glass} }
header h1 { margin: 0; font: 400 ${TYPE.display}px/1.1 ${SERIF}; letter-spacing: ${TRACK.display}; color: var(--t1); }
.kick, h2 { font: ${TYPE.label}px ${MONO}; letter-spacing: ${TRACK.wide}; text-transform: uppercase; color: var(--t2); }
header a { font: ${TYPE.small}px ${MONO}; color: var(--accent); }
h2 { width: fit-content; margin: 20px 0 10px; padding: 4px 10px; border-radius: 12px; ${glass} }
h3 { font: 400 ${TYPE.title}px/1.2 ${SERIF}; margin: 0 0 12px; color: var(--t1); }
h4 { font: 400 ${TYPE.label}px ${MONO}; letter-spacing: ${TRACK.caps}; text-transform: uppercase; color: var(--t3); margin: 0 0 6px; }
code { font: ${TYPE.meta}px ${MONO}; color: var(--t3); }
.pane { padding: 16px 18px; margin: 0 0 12px; border-radius: ${RADIUS.card}px; ${glass} box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px -18px rgba(0,0,0,.85); color: var(--t1); }
.split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; }
.sw-group { margin: 0 0 12px; } .sw-row { display: grid; grid-template-columns: repeat(auto-fill, 128px); gap: 8px 12px; }
.sw { margin: 0; display: flex; gap: 8px; align-items: center; }
.sw i { width: 28px; height: 28px; border-radius: ${RADIUS.tile}px; flex: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); }
.sw figcaption { display: flex; flex-direction: column; font: ${TYPE.label}px/1.3 ${MONO}; color: var(--t2); min-width: 0; } .sw b { color: var(--t1); font-weight: 500; }
.note { font: ${TYPE.small}px/1.5 var(--sans); color: var(--t2); margin: 4px 0 0; }
.ty, .tr { display: grid; grid-template-columns: 120px minmax(0, 1fr); align-items: baseline; gap: 12px; padding: 4px 0; overflow: hidden; white-space: nowrap; line-height: 1.15; }
.ty { border-top: 1px solid rgba(255,255,255,.06); }
.ra-row { display: flex; gap: 14px; flex-wrap: wrap; } .ra { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.ra i { width: 56px; height: 40px; border: 1.5px solid var(--accent); background: rgba(255,255,255,.04); }
.orbs { display: flex; gap: 18px; flex-wrap: wrap; } .orbs figure { margin: 0; text-align: center; } .orbs figcaption { font: ${TYPE.label}px ${MONO}; letter-spacing: ${TRACK.caps}; text-transform: uppercase; color: var(--t2); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 14px; align-items: start; }
.popup { margin: 0 auto 14px; } #council { max-width: 960px; } #lanes { max-width: 760px; }
.sf-overlay .sf-ov-card { border-radius: ${RADIUS.card}px; overflow: hidden; }
.ov-head { padding: 10px 16px; color: var(--t2); border-bottom: 1px solid rgba(255,255,255,.08); }
.ov-body { padding: 12px; }
[data-eui-svg] img { display: block; max-width: 100%; height: auto; }
.sf { margin: 0 0 10px; } .sf-status { display: flex; gap: 18px; padding: 6px 12px; font: ${TYPE.meta}px ${MONO}; color: var(--t2); border-radius: ${RADIUS.tile}px; }
.sf-card, .sf-col[data-role] { padding: 12px 14px; color: var(--t1); margin: 0 0 10px; border-radius: ${RADIUS.card}px; }
/* A transcript row's gutter takes the banner strip's bleed (glass.ts: padding offset by margin), so it lines up with the panes. */
.row { padding: 6px 10px; margin: 0 0 10px; } .sf-col[data-role='omp.editor'] { color: var(--t3); font: ${TYPE.body}px ${MONO}; }
@media (max-width: 600px) { .split { grid-template-columns: minmax(0, 1fr); } .ty, .tr { grid-template-columns: 84px minmax(0, 1fr); } .sf-status { flex-wrap: wrap; gap: 4px 12px; } .sw-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
${euiStyles()}
${css}
${[...rules.values()].join('\n')}
</style><div class="sf-region" data-surface>
<header><span class="kick">glide · design system</span><h1>${esc(blurb)}</h1><a href="design-system-${other}.html">/glide theme ${other} →</a>
<span class="kick">${esc(wallName)} · liquid glass at ${restTint(p)}%</span></header>
${body}
</div>`
  writeFileSync(join(out, `design-system-${mode}.html`), page(Object.values(sections).join('\n')))
  // Headless --screenshot paints only the first viewport, so each frame is its own page with its section on top,
  // and a section taller than the viewport is shot again scrolled, in slices that overlap by OVERLAP px.
  const chrome = (args: string[]) => execFileSync(browser, ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files',
    `--user-data-dir=${join(work, 'chromium')}`, ...args], { timeout: 120_000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  for (const [shot, w, h, scale] of [['desktop', 1440, 900, 1], ['phone', 412, 915, 2]] as const) {
    for (const [name, section] of Object.entries(sections)) {
      const file = join(work, `${mode}-${shot}-${name}.html`)
      // Measured in an iframe the frame's size: headless windows are at least 500px wide, wider than the phone.
      writeFileSync(file, page(section) + `<script>addEventListener('load', () => document.fonts.ready.then(() => parent.postMessage(document.documentElement.scrollHeight, '*')))</script>`)
      const probe = join(work, `${mode}-${shot}-${name}-probe.html`)
      writeFileSync(probe, `<body><iframe src="file://${file}" width="${w}" height="${h}" style="border:0"></iframe><script>addEventListener('message', e => document.body.dataset.h = e.data)</script>`)
      const tall = Number(/data-h="(\d+)"/.exec(chrome(['--virtual-time-budget=15000', '--dump-dom', `file://${probe}`]))?.[1])
      if (!tall) throw new Error(`no height for ${mode} ${shot} ${name}`)
      const tops = [0]
      while ((tops.at(-1) ?? 0) + h < tall) tops.push(Math.min(tall - h, (tops.at(-1) ?? 0) + h - OVERLAP))
      tops.forEach((y, i) => {
        const slice = join(work, `${mode}-${shot}-${name}-${i}.html`)
        // Shifted, not scrolled: headless shoots a scrolled page before it paints the tiles scrolled into view.
        writeFileSync(slice, page(section) + `<style>body { margin-top: -${y}px; }</style>`)
        chrome([`--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`, `--screenshot=${join(out, `${mode}-${shot}-${name}${tops.length > 1 ? `.${i + 1}` : ''}.png`)}`, `file://${slice}`])
      })
    }
  }
  console.log(join(out, `design-system-${mode}.html`), `floor ${p.floor}% rest ${restTint(p)}% accent ${p.accent} glow ${p.glow} error ${p.error}`)
}
