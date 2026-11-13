// Headless shots of the auto theme (`/glide theme auto`) with two synthetic pywal palettes, and of the
// `dash` mode. Each palette is a colors.json in a temp dir; the real Theme (frontend/src/chrome/theme.ts)
// applies it and the stylesheet it sends is laid over Tern-like defaults, a transcript and a host card
// drawn with the ephemeral-ui kit CSS. Each shot also prints the measured contrast of every [data-m] line
// (computed colour, opacity and the first opaque background under it) to OUT_DIR/NAME.json.
// One headless Chromium at a time. Usage, from the repo root:
//   bun glide/tools/theme-shots.mts OUT_DIR
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Theme } from '../../frontend/src/chrome/theme.js'
import { euiStyles } from '../../frontend/src/eui/cards.js'

const out = resolve(process.argv[2] ?? 'theme-shots')
mkdirSync(out, { recursive: true })

const wal = (bg: string, fg: string, c: string[]) => ({
  special: { background: bg, foreground: fg, cursor: fg },
  colors: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`color${i}`, c[i] ?? c[7] ?? fg]))
})
const PALETTES = {
  'theme-a': wal('#0f1420', '#c8d0e0', ['#0f1420', '#a05050', '#5a8a5a', '#ff7a00', '#5070a0', '#806080', '#508080', '#9aa4b8', '#4a5468']),
  'theme-b': wal('#f4efe6', '#d8d0c0', ['#f4efe6', '#c03030', '#40a040', '#c8a040', '#3060c0', '#e020a0', '#30a0a0', '#e0d8c8', '#eae4d8']),
  // The dash mode reads no wallpaper: an empty colors.json path keeps it to Dash's own tokens.
  dash: wal('#0c0c0a', '#ECE8DF', [])
}

/** Writes each [data-m] line's measured contrast into #m: its colour, faded by every opacity above it, on its backgrounds composited root-down. */
const MEASURE = `<script>
const rgb = s => (s.match(/[\\d.]+/g) || []).map(Number)
const lum = ([r, g, b]) => [r, g, b].map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
const out = {}
for (const el of document.querySelectorAll('[data-m]')) {
  const chain = []
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(getComputedStyle(n))
  let fade = 1, bg = [255, 255, 255]
  for (const cs of chain) {
    fade *= Number(cs.opacity)
    const b = rgb(cs.backgroundColor), a = b[3] ?? 1
    bg = bg.map((c, i) => c + (b[i] - c) * a)
  }
  const ink = rgb(getComputedStyle(el).color)
  const seen = ink.slice(0, 3).map((c, i) => bg[i] + (c - bg[i]) * fade * (ink[3] ?? 1))
  const [hi, lo] = [lum(seen), lum(bg)].sort((a, b) => b - a)
  out[el.dataset.m] = { color: getComputedStyle(el).color, opacity: +fade.toFixed(2), bg: 'rgb(' + bg.map(Math.round).join(',') + ')', ratio: +((hi + 0.05) / (lo + 0.05)).toFixed(2) }
}
const pre = document.createElement('pre'); pre.id = 'm'; pre.style.cssText = 'position:absolute;top:4000px'; pre.textContent = JSON.stringify(out); document.body.append(pre)
</script>`

function page(name: string, sheet: string, accent: string): string {
  return `<!doctype html><meta charset="utf-8"><style>
:root { --l1:#161614; --l2:#22221f; --l3:#34332f; --t1:#e8e4da; --t2:#b4afa3; --t3:#837f74; --accent:#d7b986; --sans:system-ui,sans-serif; --mono:ui-monospace,monospace; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
[data-surface] { min-height: 100%; padding: 28px 36px; font: 14px/1.5 var(--sans); background: #111110; color: var(--t1); }
.status { font: 12px var(--mono); color: var(--t3); border-bottom: 1px solid var(--l3); padding-bottom: 8px; margin-bottom: 18px; }
.status b { color: var(--accent); font-weight: 600; }
.user { background: var(--l2); border-radius: 10px; padding: 10px 14px; margin: 0 0 14px auto; max-width: 520px; }
.muted { color: var(--t2); } .dim { color: var(--t3); } a { color: var(--accent); }
.swatches { display: flex; gap: 6px; margin-top: 18px; } .swatches i { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--l3); }
${euiStyles()}
${sheet}
</style><div data-surface>
<div class="status" data-m="status">hermes tern · glide · theme <b>${name === 'dash' ? 'dash' : 'auto'}</b> · ${name}</div>
<div class="user">/glide theme ${name === 'dash' ? 'dash' : 'auto'}</div>
<p data-m="text">Glide theme follows the wallpaper. The accent is the most saturated of color1..6; text is lifted to 4.5:1.</p>
<p class="muted" data-m="muted">Muted line: secondary detail stays readable on the wallpaper background.</p>
<p class="dim" data-m="dim">Dim line · synthetic colors.json fixture · <a>linked text</a></p>
<div data-eui="card" data-eu><div class="eu-card eui-host"><div class="eui-host-head"><span class="eui-host-name" data-m="card.label">Fleet</span><span class="eui-host-title">Glide palette</span></div>
<dl class="eui-host-rows"><dt data-m="card.term">Accent</dt><dd>${accent}</dd><dt>Peer</dt><dd><span class="dim" data-m="card.subtitle">Tailnet peer · offline</span></dd><dt>Export</dt><dd>/glide theme export</dd></dl>
<p class="eu-hint" data-m="card.note">Source: read-only fleet collectors</p>
<div style="margin-top:12px;display:flex;gap:8px"><button class="eu-btn primary">Keep</button><button class="eu-btn ghost" data-m="card.ghost">Refresh</button><button class="eu-btn" data-eui-a-disabled="true" data-m="card.disabled">Set next unavailable</button></div></div></div>
<div class="swatches">${Object.values(PALETTES[name as keyof typeof PALETTES].colors).slice(0, 8).map(c => `<i style="background:${c}"></i>`).join('')}</div>
</div>${MEASURE}`
}

const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b]); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
const scratch = mkdtempSync(join(tmpdir(), 'glide-theme-shots-'))
try {
  for (const [name, colors] of Object.entries(PALETTES)) {
    const file = join(scratch, `${name}.json`)
    writeFileSync(file, JSON.stringify(colors))
    const sheets = new Map<string, string>()
    const theme = new Theme({
      palette: () => undefined,
      stylesheet: (n, css) => void (css === null ? sheets.delete(n) : sheets.set(n, css)),
      settings: { save: () => ({}) },
      walFile: file
    }, name === 'dash' ? 'dash' : 'auto')
    theme.apply()
    theme.dispose()
    const html = join(scratch, `${name}.html`)
    writeFileSync(html, page(name, [...sheets.values()].join('\n'), theme.wal?.accent ?? '?'))
    const flags = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(scratch, 'chromium')}`, '--window-size=1060,596']
    execFileSync(browser, [...flags, `--screenshot=${join(out, `${name}.png`)}`, `file://${html}`], { stdio: 'ignore', timeout: 60_000 })
    const dom = execFileSync(browser, [...flags, '--dump-dom', `file://${html}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 })
    const measured = /<pre id="m"[^>]*>([^<]*)<\/pre>/.exec(dom)?.[1]?.replace(/&quot;/g, '"') ?? '{}'
    writeFileSync(join(out, `${name}.json`), measured)
    console.log(join(out, `${name}.png`), theme.wal?.accent, measured)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
