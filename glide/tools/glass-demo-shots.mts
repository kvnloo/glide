// Headless evidence for the real /glide glass popup over synthetic bright wallpaper.
// From the repository root: bun glide/tools/glass-demo-shots.mts OUT_DIR
// Writes desktop-0/40/80/100.png at 1060 x 596 and phone-0/40/80/100.png at 412 x 915.
// Requires bun and a local Chromium or google-chrome-stable; no real user colours are read.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { euiStyles } from '../../frontend/src/eui/cards.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import { mix } from '../../frontend/src/hermes/theme.js'
import type { Overlay } from '../../frontend/src/overlays/overlay.js'
import type { CouncilHost } from '../frontend/councilPopup.js'
import { dashPalette } from '../frontend/dash.js'
import { GLASS_STRENGTHS, openGlassDemo, type GlassStrength } from '../frontend/glassDemo.js'
import { DASH, NIGHT, RADIUS, TYPE } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'glass-demo-shots')
const work = mkdtempSync(join(tmpdir(), 'glass-demo-shots-'))
mkdirSync(join(out, 'html'), { recursive: true })

// Synthetic wallpaper with a bright region: it exercises the contrast floor rather than
// measuring only a black canvas.
const palette = dashPalette({
  special: { background: DASH.fg, foreground: DASH.bg },
  colors: {
    color0: DASH.fg, color1: DASH.gold, color2: DASH.success, color3: DASH.error,
    color4: DASH.muted, color5: DASH.dim, color6: DASH.bg, color7: DASH.fg
  }
})

interface Node {
  k?: string
  p?: Record<string, unknown>
  c?: Node[]
  type?: string
  props?: Record<string, unknown> & { children?: Node | Node[] }
}
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Render the real Tern popup tree and the stylesheet rules emitted by its EUI host. */
function page(strength: GlassStrength): string {
  const rules = new Map<string, string>()
  let overlay: Overlay | undefined
  const host: CouncilHost = {
    open: o => { overlay = o },
    close: () => { overlay = undefined },
    changed: () => undefined,
    transcript: { notice: message => { throw new Error(message) } },
    eui: {
      host: { publish: () => { throw new Error('no cards are published by this demo') } },
      click: () => undefined,
      svg: () => undefined,
      style: css => {
        const id = `glass-${rules.size + 1}`
        rules.set(id, `[data-eui-s='${id}']{${ternBody(css.replace(/[{}<]/g, ''))}}`)
        return id
      }
    }
  }
  openGlassDemo(host, palette, () => { throw new Error('screenshots never apply a strength') }, {
    startStrength: strength, reducedMotion: true
  })
  if (!overlay) throw new Error('the real glass popup did not open')
  const tree = JSON.parse(JSON.stringify(overlay.node('layer.overlay-1'))) as Node
  const draw = (n: Node): string => {
    const props = n.p ?? n.props ?? {}
    const children = n.c ?? n.props?.children ?? []
    const kids = (Array.isArray(children) ? children : [children]).map(draw).join('')
    if ((n.k ?? n.type) === 'overlay') {
      return `<div class="tern-overlay" role="dialog"><div class="tern-head">${escape(String(props['head'] ?? ''))}</div><div class="tern-body">${kids}</div></div>`
    }
    if (n.k !== 'el') throw new Error(`unexpected Tern node ${String(n.k ?? n.type)}`)
    const tag = String(props['tag'])
    const attrs = Object.entries((props['attrs'] ?? {}) as Record<string, string>)
      .map(([name, value]) => ` ${name}="${escape(value)}"`).join('')
    const cls = props['class'] ? ` class="${escape(String(props['class']))}"` : ''
    return `<${tag}${attrs}${cls}>${typeof props['text'] === 'string' ? escape(props['text']) : ''}${kids}</${tag}>`
  }
  const body = draw(tree)

  // Dash-only palette; the cream/gold wallpaper is synthetic and deliberately bright.
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root {
  --l1:${mix(DASH.bg, DASH.fg, 0.07)};--l2:${mix(DASH.bg, DASH.fg, 0.13)};
  --l3:${mix(DASH.bg, DASH.fg, 0.21)};--card:var(--l1);
  --t1:${DASH.fg};--t2:${NIGHT.text2};--t3:${NIGHT.text3};--accent:${DASH.gold};
  --sans:'Hanken Grotesk',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
}
* { box-sizing:border-box; }
html,body { margin:0;min-width:0;min-height:100%;background:${DASH.bg};color:${DASH.fg};font-family:var(--sans);font-size:${TYPE.body}px; }
.wallpaper { position:fixed;inset:0;background:
  radial-gradient(ellipse at 25% 17%, ${DASH.fg},transparent 64%),
  linear-gradient(135deg,${DASH.gold},${DASH.muted} 45%,${DASH.bg}); }
.pane { position:fixed;inset:0;padding:16px;color:${NIGHT.text2};font-family:var(--mono);font-size:${TYPE.meta}px; }
.dim { position:fixed;inset:0;background:rgba(0,0,0,0.45); }
.tern-overlay {
  position:absolute;left:12px;right:12px;top:12px;max-height:calc(100vh - 24px);
  overflow:auto;background:var(--l1);border:1px solid var(--l3);border-radius:${RADIUS.block}px;
}
.tern-head { padding:10px 14px;border-bottom:1px solid var(--l3);font-size:${TYPE.body}px;color:var(--t2); }
.tern-body { padding:12px; }
button { cursor:pointer; }
@media (prefers-reduced-motion: reduce) { [data-glass-playground] * { transition:none;animation:none; } }
${euiStyles()}
${[...rules.values()].join('\n')}
</style>
<div class="wallpaper"></div><div class="pane">GLIDE · GLASS DEMO · SYNTHETIC</div>
<div class="dim"></div>${body}`
}

const browser = ['chromium', 'google-chrome-stable'].find(name => {
  try { execFileSync('which', [name], { stdio: 'ignore' }); return true } catch { return false }
})
if (!browser) throw new Error('Chromium is required for glass-demo-shots')
function shot(strength: GlassStrength, name: 'desktop' | 'phone', width: number, height: number): void {
  const file = join(out, 'html', `${name}-${strength}.html`)
  const png = join(out, `${name}-${strength}.png`)
  writeFileSync(file, page(strength))
  execFileSync(browser!, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--user-data-dir=${join(work, `chromium-${name}-${strength}`)}`,
    '--force-device-scale-factor=1', `--window-size=${width},${height}`,
    `--screenshot=${png}`, `file://${file}`
  ], { stdio: 'ignore', timeout: 60_000 })
  console.log(png)
}
for (const strength of GLASS_STRENGTHS) {
  shot(strength, 'desktop', 1060, 596)
  shot(strength, 'phone', 412, 915)
}
