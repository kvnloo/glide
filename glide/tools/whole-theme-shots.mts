// Headless shots of Glide's whole themes (GL-062) on one fixture chat, each switched by the real tool.
// A pane is the real GlideWidgets + Theme, wired as stores.ts wires them, following a temp settings.json;
// each step runs glide_theme's switch (glide/whole_theme.py, in Python) against that home, which writes the
// theme beside `ui` and waits for the pane's verdict. The pane wears it, and the stylesheet and Tern palette
// it sent are laid over one transcript, code block and card drawn from the surface's variables (and the kit CSS).
// Writes OUT_DIR/NN-<theme>.png and OUT_DIR/steps.json (each tool call, its result and the measured contrast).
// One headless Chromium at a time. Usage, from the repo root:
//   bun glide/tools/whole-theme-shots.mts OUT_DIR
import { execFile, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import type { Palette } from '@stencil-hq/tern'

import { Theme } from '../../frontend/src/chrome/theme.js'
import { euiStyles } from '../../frontend/src/eui/cards.js'
import { GlideWidgets } from '../../frontend/src/glideui/widgets.js'
import { isGlideTheme, themeTokens } from '../frontend/themes.js'

const out = resolve(process.argv[2] ?? 'whole-theme-shots')
mkdirSync(out, { recursive: true })
const repo = resolve(import.meta.dirname, '../..')

/** The agent's calls, in order: each named theme, then the day/night flips the tool resolves through the pairs. */
const STEPS: Record<string, string>[] = [
  { theme: 'light' }, { theme: 'dark-code' }, { theme: 'sepia' }, { theme: 'warm-dark' }, { theme: 'day' }, { theme: 'night' },
  { phase: 'flip' }, { theme: 'sepia', phase: 'night' }, { phase: 'day' }
]

/** glide_theme's switch, the tool's own code, run against `home` (it waits for the pane's verdict). */
const PY = `import json, sys, types
from pathlib import Path
pkg = types.ModuleType("glide_plugin"); pkg.__path__ = [sys.argv[1]]; sys.modules["glide_plugin"] = pkg
from glide_plugin import whole_theme
print(json.dumps(whole_theme.switch(Path(sys.argv[2]), json.loads(sys.argv[3]), wait=5)))`
const tool = async (home: string, args: Record<string, string>) =>
  JSON.parse((await promisify(execFile)('python3', ['-c', PY, join(repo, 'glide'), home, JSON.stringify(args)])).stdout) as Record<string, unknown>

const MEASURE = `<script>
const rgb = s => (s.match(/[\\d.]+/g) || []).map(Number)
const lum = ([r, g, b]) => [r, g, b].map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
const out = {}
for (const el of document.querySelectorAll('[data-m]')) {
  let bg = [255, 255, 255]
  const chain = []
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(getComputedStyle(n))
  for (const cs of chain) { const b = rgb(cs.backgroundColor), a = b[3] ?? 1; bg = bg.map((c, i) => c + (b[i] - c) * a) }
  const ink = rgb(getComputedStyle(el).color)
  const [hi, lo] = [lum(ink), lum(bg)].sort((a, b) => b - a)
  out[el.dataset.m] = +((hi + 0.05) / (lo + 0.05)).toFixed(2)
}
const pre = document.createElement('pre'); pre.id = 'm'; pre.style.cssText = 'position:absolute;top:4000px'; pre.textContent = JSON.stringify(out); document.body.append(pre)
</script>`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function page(sheet: string, palette: Palette | undefined, call: string, result: Record<string, unknown>): string {
  const p = palette?.dark ?? {}
  const mode = String(result['theme'])
  const t = isGlideTheme(mode) ? themeTokens(mode) : undefined
  return `<!doctype html><meta charset="utf-8"><style>
:root { --l1:#161614; --l2:#22221f; --l3:#34332f; --t1:#e8e4da; --t2:#b4afa3; --t3:#837f74; --accent:#d7b986; --sans:system-ui,sans-serif; --mono:ui-monospace,monospace; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
[data-surface] { min-height: 100%; padding: 24px 36px; font: 14px/1.5 var(--sans); background: #111110; color: var(--t1); }
.status { font: 12px var(--mono); color: var(--t3); border-bottom: 1px solid var(--l3); padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
.status b { color: ${p['statusLineModel'] ?? 'var(--accent)'}; font-weight: 600; }
.user { background: var(--l2); border-radius: 10px; padding: 9px 14px; margin: 0 0 12px auto; max-width: 560px; }
.muted { color: var(--t2); } .dim { color: var(--t3); } a { color: ${p['mdLink'] ?? 'var(--accent)'}; }
.tool { font: 12px var(--mono); color: var(--t2); border-left: 2px solid var(--accent); padding: 4px 10px; margin: 10px 0; background: var(--l1); }
.tool b { color: var(--accent); } .ok { color: var(--sf-c-success); }
pre.code { font: 12.5px/1.55 var(--mono); background: var(--l1); border: 1px solid var(--l3); border-radius: 8px; padding: 10px 14px; margin: 10px 0; color: var(--t1); }
.card { background: var(--card); border: 1px solid var(--l3); border-radius: 12px; padding: 12px 16px; max-width: 520px; }
.card .head { font-size: 13px; margin-bottom: 8px; } .card .rows { display: grid; grid-template-columns: 90px 1fr; gap: 2px 12px; font-size: 13px; }
.btns { display: flex; gap: 8px; margin-top: 12px; } .btn { font-size: 12.5px; padding: 4px 12px; border-radius: 7px; border: 1px solid var(--l3); color: var(--t1); background: var(--l2); }
.btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.k { color: var(--accent); } .s { color: var(--sf-c-success); } .n { color: var(--sf-c-warning); } .c { color: var(--t3); } .e { color: var(--sf-c-error); }
${euiStyles()}
${sheet}
</style><div data-surface>
<div class="status" data-m="status"><span>hermes tern · glide · theme <b>${esc(mode)}</b>${t ? ` · ${t.phase}` : ''}</span><span>${t ? `pair: ${esc(t.pair)}` : ''}</span></div>
<div class="user" data-m="user">same chat restyled light / dark code / sepia / warm dark, and give it a day and night</div>
<div class="tool" data-m="tool">▸ <b>glide_theme</b> ${esc(call)} → <span class="ok">${result['ok'] ? 'ok' : 'failed'}</span>, pane checked: ${String(result['checked'])}</div>
<p data-m="text">Done: the whole surface now wears <b>${esc(t?.label ?? mode)}</b>. ${t ? esc(t.detail) + '.' : ''} Ask for day or night and I flip it to its pair.</p>
<pre class="code" data-m="code"><span class="c"># one table of named token sets</span>
<span class="k">def</span> resolve(current, theme, phase):
    base = theme <span class="k">or</span> current
    <span class="k">return</span> table[base][<span class="s">"pair"</span>] <span class="k">if</span> phase == <span class="s">"flip"</span> <span class="k">else</span> base  <span class="c"># ${String(6)} themes</span>
<span class="e">raise</span> ValueError(<span class="s">"phase: day, night or flip"</span>)  <span class="n">4.5</span></pre>
<p class="muted" data-m="muted">Muted line: chat, cards, widgets, pages and the Tern window repaint through the same tokens.</p>
<p class="dim" data-m="dim">Dim line · fixture chat · <a data-m="link">glide/frontend/themes.json</a></p>
<div class="card" data-eui="card"><div class="head"><span class="dim" data-m="card.label">Theme</span> <b data-m="card.title">${esc(t?.label ?? mode)}</b></div>
<div class="rows"><span class="muted" data-m="card.term">Phase</span><span>${t?.phase ?? '-'}</span><span class="muted">Pair</span><span class="dim" data-m="card.subtitle">${esc(t?.pair ?? '-')}</span><span class="muted">Accent</span><span>${esc(p['accent'] ?? '-')}</span></div>
<div class="btns"><span class="btn primary" data-m="card.primary">Keep</span><span class="btn" data-m="card.ghost">Flip to ${esc(t?.pair ?? 'night')}</span></div></div>
</div>${MEASURE}`
}

const browser = ['chromium', 'google-chrome-stable', 'google-chrome'].find(b => { try { execFileSync('which', [b], { stdio: 'ignore' }); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
const scratch = mkdtempSync(join(tmpdir(), 'glide-whole-theme-shots-'))
const home = join(scratch, 'hermes')
const file = join(home, 'glide', 'settings.json')
mkdirSync(join(home, 'glide'), { recursive: true })
writeFileSync(file, `${JSON.stringify({ theme: 'tern', ui: { rev: 0, widgets: [] } })}\n`)
const sheets = new Map<string, string>()
let palette: Palette | undefined
const theme = new Theme({
  palette: p => { palette = p },
  stylesheet: (n, css) => void (css === null ? sheets.delete(n) : sheets.set(n, css)),
  settings: { save: () => ({}) },
  walFile: join(scratch, 'none.json')
}, 'tern')
const widgets = new GlideWidgets({
  file, changed: () => undefined, cwd: () => undefined,
  glide: async () => { throw new Error('no widgets in this fixture') },
  restyled: () => { theme.apply(); return theme.wal },
  retheme: (mode, restyle) => { if (!theme.wear(mode) && restyle) theme.apply(); return theme.wal },
  theme: () => theme.mode
})
const steps: unknown[] = []
try {
  theme.apply()
  await widgets.start()
  for (const [i, args] of STEPS.entries()) {
    const result = await tool(home, args)
    const call = JSON.stringify(args)
    const name = `${String(i + 1).padStart(2, '0')}-${String(result['theme'])}`
    const html = join(scratch, `${name}.html`)
    writeFileSync(html, page([...sheets.values()].join('\n'), palette, call, result))
    const flags = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(scratch, 'chromium')}`, '--window-size=1060,640']
    execFileSync(browser, [...flags, `--screenshot=${join(out, `${name}.png`)}`, `file://${html}`], { stdio: 'ignore', timeout: 60_000 })
    const dom = execFileSync(browser, [...flags, '--dump-dom', `file://${html}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 })
    const measured = JSON.parse(/<pre id="m"[^>]*>([^<]*)<\/pre>/.exec(dom)?.[1]?.replace(/&quot;/g, '"') ?? '{}') as Record<string, number>
    steps.push({ shot: `${name}.png`, call: args, result, worn: theme.mode, palette: palette?.name, contrast: measured })
    console.log(name, call, JSON.stringify(result), `min contrast ${Math.min(...Object.values(measured))}`)
  }
  writeFileSync(join(out, 'steps.json'), `${JSON.stringify(steps, null, 2)}\n`)
} finally {
  widgets.dispose()
  theme.dispose()
  rmSync(scratch, { recursive: true, force: true })
}
