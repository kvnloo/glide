// Headless shots of the whole-app templates (GL-065): Default, Mono and Studio applied through the real
// Templates.use (glide/frontend/templates.ts) into a scratch settings.json, the real Theme building each mode's
// palette and sheet, the real transcriptCss, and transcript nodes from the real entryNode drawn by a small
// stand-in for Tern's DOM (.sf-card > .sf-card-body, .sf-md, data-role). Each docked panel is the page file
// Templates wrote, themed with the real themeFunction as the pane would. A fifth shot is the palette's
// template rows (paletteRows) over the Default chat. This is a fixture, not Tern: native captures are separate.
// One headless Chromium at a time. Usage, from frontend/:
//   bun ../glide/tools/template-shots.mts OUT_DIR
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Palette } from '@stencil-hq/tern'

import { Theme } from '../../frontend/src/chrome/theme.js'
import { pageThemeOf, themeFunction } from '../../frontend/src/glideui/pages.js'
import type { Entry } from '../../frontend/src/model.js'
import { fileSettings, type ThemeMode } from '../../frontend/src/settings.js'
import { paletteRows } from '../../frontend/src/shortcuts/palette.js'
import { entryNode } from '../../frontend/src/view/transcript.js'
import { readUi } from '../../frontend/src/wire/files.js'
import { TEMPLATES, Templates, type TemplateId } from '../frontend/templates.js'

const out = resolve(process.argv[2] ?? 'template-shots')
mkdirSync(out, { recursive: true })
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

interface J { k: string; p?: Record<string, unknown>; c?: J[] }
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
/** A little Markdown: paragraphs, bullet lists, bold and code spans. */
const md = (text: string) => text.split(/\n{2,}/).map(block => /^- /m.test(block)
  ? `<ul>${block.split('\n').map(l => `<li>${inline(l.replace(/^- /, ''))}</li>`).join('')}</ul>`
  : `<p>${inline(block)}</p>`).join('')

/** Tern's node tree as the stand-in DOM: one element per node, class sf-<kind>, the role as data-role. */
function dom(n: J): string {
  const p = n.p ?? {}
  const role = typeof p['role'] === 'string' ? ` data-role="${esc(p['role'])}"` : ''
  const kids = (n.c ?? []).map(dom).join('')
  switch (n.k) {
    case 'card': return `<div class="sf sf-card"${role}><div class="sf-card-body">${kids}</div></div>`
    case 'md': return `<div class="sf sf-md"${role}>${md(String(p['text'] ?? ''))}</div>`
    case 'text': return `<span class="sf sf-text"${role}>${(Array.isArray(p['spans']) ? p['spans'] : []).map(s => `<span class="${esc((s as { s?: string }).s ?? '').split(' ').map(c => `sf-t-${c}`).join(' ')}">${esc((s as { t?: string }).t)}</span>`).join('')}</span>`
    case 'icon': return `<i class="sf sf-icon" title="${esc(p['name'])}">${p['name'] === 'terminal' ? '›_' : p['name'] === 'copy' ? '⧉' : '•'}</i>`
    case 'code': case 'ansi': return `<pre class="sf sf-${n.k}"${role}>${esc(p['text'])}</pre>`
    case 'section': {
      const [head, ...body] = n.c ?? []
      return `<div class="sf sf-section"${role}><div class="sf-section-head">${head ? dom(head) : ''}</div>${p['collapsed'] ? '' : `<div class="sf-section-body">${body.map(dom).join('')}</div>`}</div>`
    }
    case 'el': return p['tag'] === 'button' ? `<button class="sf-el" aria-label="${esc(p['aria'])}">${kids}</button>` : `<div class="sf-el">${kids}</div>`
    default: return `<div class="sf sf-${n.k}"${role}>${kids}</div>`
  }
}

const now = Date.UTC(2026, 10, 22, 15, 30)
const at = (min: number) => now - min * 60_000
const call = (id: string, name: string, context: string, min: number) => ({ kind: 'tool', id, call: { id, name, args: {}, argsText: '{}', context, outcome: { status: 'done' }, startedAt: at(min), completedAt: at(min) + 900, resultText: '', via: { kind: 'direct' } } })
// Synthetic history: the prompts are the film's beats, the numbers a plausible session.
const ENTRIES = [
  { kind: 'user', id: 'u1', text: 'Add a graph of my commits under the composer', at: at(42) },
  { kind: 'turn', id: 't1', rev: 1, startedAt: at(42), end: { status: 'done', endedAt: at(41) }, tickTokens: 18_400, blocks: [
    call('c1', 'terminal', 'git log --all --since=53.weeks', 42), call('c2', 'glide_ui_mount', 'heat below-composer', 41),
    { kind: 'text', id: 'b1', text: 'Mounted a **commit graph** below the composer: 1,380 commits in the last year, Mon/Wed/Fri rows and a Less–More legend.' }
  ] },
  { kind: 'user', id: 'u2', text: 'Now a focus timer that runs around my composer', at: at(30) },
  { kind: 'turn', id: 't2', rev: 1, startedAt: at(30), end: { status: 'done', endedAt: at(29) }, tickTokens: 9_800, blocks: [
    call('c3', 'glide_ui_mount', 'ring composer-ring 25 min', 30),
    { kind: 'text', id: 'b2', text: 'A 25-minute ring now runs round the composer.\n\n- The chip at the top-left counts down\n- `/glide focus` ends the block early' }
  ] },
  { kind: 'user', id: 'u3', text: 'Build me a block-based sandbox game', at: at(12) },
  { kind: 'turn', id: 't3', rev: 1, startedAt: at(12), end: { status: 'done', endedAt: at(7) }, tickTokens: 41_200, blocks: [
    call('c4', 'write_file', 'blockworld.html', 11), call('c5', 'terminal', 'node --check blockworld.js', 9), call('c6', 'write_file', 'blockworld.html', 8), call('c7', 'glide_page_open', 'blockworld over', 7),
    { kind: 'text', id: 'b3', text: 'Blockworld is open over the chat: an island of voxels with a day/night cycle that follows the theme.' }
  ] }
] as unknown as Entry[]

const BOARD = JSON.stringify([
  { t: 'rect', role: 'accent', w: 2.5, x1: 70, y1: 120, x2: 300, y2: 230 },
  { t: 'arrow', role: 'ink', w: 2.5, x1: 300, y1: 175, x2: 420, y2: 175 },
  { t: 'ellipse', role: 'ink', w: 2.5, x1: 420, y1: 120, x2: 600, y2: 230 },
  { t: 'pen', role: 'muted', w: 2.5, p: [90, 300, 140, 290, 190, 320, 240, 296, 290, 316, 340, 300] },
  { t: 'note', id: 'n1', x: 110, y: 150, text: 'Beat 60 s\nMono → Studio' },
  { t: 'note', id: 'n2', x: 445, y: 155, text: 'Whiteboard' }
])

const TERN_DEFAULT = ':root{--panel:#16181d;--l1:#1d2027;--l2:#252932;--l3:#323743;--t1:#e6e8ee;--t2:#a9afbd;--t3:#8a90a0;--accent:#7aa2f7;--accent-ink:#0b0d12}'

function shell(sheets: string, transcript: string, panel: string | null, overlay = '', label: string): string {
  return `<!doctype html><meta charset="utf-8"><style>
${TERN_DEFAULT}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--panel); }
body { display: flex; font: 14px/1.5 system-ui, sans-serif; color: var(--t1); }
.sf-region { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; background: var(--panel); color: var(--t1); }
.status { font: 12px ui-monospace, monospace; color: var(--t3); padding: 10px 22px; border-bottom: 1px solid var(--l3); }
.status b { color: var(--accent); font-weight: 600; }
.main { flex: 1; overflow: hidden; padding: 16px 22px; display: flex; flex-direction: column; gap: 12px; }
.sf-card { background: var(--l2); border: 1px solid var(--l3); border-radius: 10px; padding: 8px 12px; }
.sf-card-body { display: flex; flex-direction: column; gap: 2px; }
.sf-row { display: flex; gap: 6px; align-items: center; }
[data-role='omp.user.tools'] { justify-content: flex-end; font-size: 11px; }
.sf-t-dim { color: var(--t3); } .sf-t-muted { color: var(--t2); } .sf-t-mono { font-family: ui-monospace, monospace; }
.sf-md p { margin: 0 0 6px; } .sf-md ul { margin: 0 0 6px; padding-left: 20px; } .sf-md code { font: 12px ui-monospace, monospace; background: var(--l3); padding: 1px 4px; border-radius: 4px; }
.sf-col { display: flex; flex-direction: column; gap: 6px; }
.sf-section-head { font-size: 12px; color: var(--t2); padding: 2px 0; }
.sf-icon { font-style: normal; color: var(--t3); font-size: 11px; width: 16px; display: inline-block; }
.sf-el { background: none; border: none; color: var(--t3); padding: 0; font-size: 11px; }
[data-role='omp.turn.usage'] { color: var(--t3); }
.dock { padding: 12px 22px 16px; }
.composer { border: 1px solid var(--l3); background: var(--l1); border-radius: 14px; padding: 12px 14px; color: var(--t3); }
.panel { flex: 0 0 46%; border-left: 1px solid var(--l3); }
.panel iframe { width: 100%; height: 100%; border: 0; display: block; }
.pk { position: fixed; left: 50%; top: 70px; transform: translateX(-50%); width: 560px; background: var(--l1); border: 1px solid var(--l3); border-radius: 14px; box-shadow: 0 18px 48px rgb(0 0 0 / .5); font-size: 13px; overflow: hidden; }
.pk .q { padding: 12px 14px; border-bottom: 1px solid var(--l3); color: var(--t1); } .pk .q span { color: var(--t3); }
.pk .it { padding: 8px 14px; display: flex; flex-direction: column; } .pk .it small { color: var(--t3); } .pk .it.sel { background: var(--l3); }
.pk .g { padding: 8px 14px 2px; font: 10px ui-monospace, monospace; text-transform: uppercase; letter-spacing: .08em; color: var(--t3); }
</style><style>${sheets}</style>
<div class="sf-region"><div class="status">hermes tern · glide · template <b>${esc(label)}</b></div>
<div class="main" data-surface-main>${transcript}</div>
<div class="dock"><div class="composer">Ask Hermes…</div></div></div>
${panel ? `<div class="panel"><iframe src="${panel}"></iframe></div>` : ''}${overlay}`
}

const browser = ['chromium', 'google-chrome-stable'].find(b => { try { execFileSync('which', [b]); return true } catch { return false } })
if (!browser) throw new Error('no headless Chromium')
const scratch = mkdtempSync(join(tmpdir(), 'glide-template-shots-'))
try {
  const file = join(scratch, 'glide', 'settings.json')
  const settings = fileSettings(file)
  const sheets = new Map<string, string>()
  let palette: Palette | undefined
  const theme = new Theme({
    palette: p => { palette = p },
    stylesheet: (n, css) => void (css === null ? sheets.delete(n) : sheets.set(n, css)),
    settings,
    walFile: join(scratch, 'no-wallpaper.json')
  }, 'tern')
  const templates = new Templates({
    file, settings,
    setTheme: (mode: ThemeMode) => theme.set(mode),
    closePage: async () => undefined,
    reload: () => undefined,
    changed: () => undefined,
    entries: () => ENTRIES,
    cwd: () => repo,
    now: () => now
  })
  const cx = { now, welcome: { version: '' }, copy: () => undefined } as unknown as Parameters<typeof entryNode>[2]
  const transcript = ENTRIES.map(e => dom(JSON.parse(JSON.stringify(entryNode(e, `main.${e.id}`, cx))) as J)).join('')
  const flags = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=3000', `--user-data-dir=${join(scratch, 'chromium')}`, '--window-size=1600,900']
  const shoot = (name: string, html: string) => {
    const path = join(scratch, `${name}.html`)
    writeFileSync(path, html)
    execFileSync(browser, [...flags, `--screenshot=${join(out, `${name}.png`)}`, `file://${path}`], { stdio: 'ignore', timeout: 60_000 })
    console.log(join(out, `${name}.png`))
  }

  for (const id of ['default', 'mono', 'studio'] as TemplateId[]) {
    const line = await templates.use(id)
    const ui = readUi(file)
    const page = ui.pages?.[0]
    let panel: string | null = null
    if (page) {
      // As the pane does: the page wears the surface's colours (themeFunction), evaluated once it has loaded.
      const t = pageThemeOf(theme.wal, palette)
      const seed = page.id === 'template-whiteboard' ? `<script>localStorage.setItem('glide-whiteboard-v1', ${JSON.stringify(BOARD)})</script>` : ''
      const themed = readFileSync(page.path, 'utf8').replace('<head>', `<head>${seed}`).replace('</body>', `<script>(${t ? themeFunction(t) : 'function(){}'})()</script></body>`)
      panel = join(scratch, `${id}-panel.html`)
      writeFileSync(panel, themed)
    }
    console.log(`${id}: ${line} theme=${theme.mode} pages=${JSON.stringify(ui.pages?.map(p => [p.id, p.how]))} sheets=${[...sheets.keys()].join(',')} transcript=${templates.transcript}`)
    const all = [...sheets.values(), templates.css() ?? ''].join('\n')
    shoot(id, shell(all, transcript, panel ? `file://${panel}` : null, '', TEMPLATES[id].label))
    if (id === 'default') {
      const rows = paletteRows().filter(r => r.group === 'Templates')
      const overlay = `<div class="pk"><div class="q">template<span> · Search Hermes commands…</span></div><div class="g">Templates</div>${rows.map((r, i) => `<div class="it${i === 0 ? ' sel' : ''}"><b>${esc(r.name)}</b><small>${esc(r.description)} · runs ${esc(r.command)}</small></div>`).join('')}</div>`
      shoot('palette', shell(all, transcript, null, overlay, 'Default'))
    }
  }
  theme.dispose()
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
