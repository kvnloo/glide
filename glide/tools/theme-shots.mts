// Headless shots of the auto theme (`/glide theme auto`) with two synthetic pywal palettes. Each
// palette is a colors.json in a temp dir; the real Theme (frontend/src/chrome/theme.ts) applies it
// and the stylesheet it sends is laid over Tern-like defaults, a transcript and a host card drawn
// with the ephemeral-ui kit CSS. One headless Chromium at a time. Usage, from the repo root:
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
  'theme-b': wal('#f4efe6', '#d8d0c0', ['#f4efe6', '#c03030', '#40a040', '#c8a040', '#3060c0', '#e020a0', '#30a0a0', '#e0d8c8', '#eae4d8'])
}

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
<div class="status">hermes tern · glide · theme <b>auto</b> · ${name}</div>
<div class="user">/glide theme auto</div>
<p>Glide theme follows the wallpaper. The accent is the most saturated of color1..6; text is lifted to 4.5:1.</p>
<p class="muted">Muted line: secondary detail stays readable on the wallpaper background.</p>
<p class="dim">Dim line · synthetic colors.json fixture · <a>linked text</a></p>
<div data-eui="card"><div class="eui-host"><h3 class="eui-host-title">Glide palette</h3>
<dl class="eui-host-rows"><dt>Accent</dt><dd>${accent}</dd><dt>Source</dt><dd>synthetic colors.json</dd><dt>Export</dt><dd>/glide theme export</dd></dl>
<div style="margin-top:12px;display:flex;gap:8px"><button class="eu-btn primary">Keep</button><button class="eu-btn ghost">Default</button></div></div></div>
<div class="swatches">${Object.values(PALETTES[name as keyof typeof PALETTES].colors).slice(0, 8).map(c => `<i style="background:${c}"></i>`).join('')}</div>
</div>`
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
    }, 'auto')
    theme.apply()
    theme.dispose()
    const html = join(scratch, `${name}.html`)
    writeFileSync(html, page(name, [...sheets.values()].join('\n'), theme.wal?.accent ?? '?'))
    execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(scratch, 'chromium')}`,
      '--window-size=1200,760', `--screenshot=${join(out, `${name}.png`)}`, `file://${html}`], { stdio: 'ignore', timeout: 60_000 })
    console.log(join(out, `${name}.png`), theme.wal?.accent)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
