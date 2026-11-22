// Whole-app templates (GL-065, kvnloo/glide#346): the command palette's "Use Mono template" and "Use Studio template"
// apply a theme, a transcript style and docked panels at once, live, and Default puts each back.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Palette } from '@stencil-hq/tern'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Theme } from '../chrome/theme.js'
import { localCommand, type CommandHost } from '../commands/local.js'
import { contrastRatio } from '../hermes/theme.js'
import type { Browser } from '../gev/globe.js'
import { GlidePages, shippedPage } from '../glideui/pages.js'
import type { Entry, TurnEntry } from '../model.js'
import { fileSettings, type ThemeMode } from '../settings.js'
import { paletteRows } from '../shortcuts/palette.js'
import { readSettings, readUi } from '../wire/files.js'
import { parseJson } from '../wire/json.js'
import {
  analyticsData, monoPalette, pageWithData, studioPalette, TEMPLATES, Templates, transcriptCss, writeTemplatePages
} from '../../../glide/frontend/templates.js'
import { minifyCss } from '../../../glide/frontend/css.js'
import { MONO } from '../../../glide/frontend/tokens.js'
import { WAL_SHEET } from '../../../glide/frontend/wal.js'

import { stub } from './fakes.js'

const dirs: string[] = []
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'glide-templates-')); dirs.push(d); return d }

const turn = (id: string, over: Partial<TurnEntry>): TurnEntry => stub<TurnEntry>({
  kind: 'turn', id, rev: 1, blocks: [], startedAt: 1_000, end: { status: 'done', endedAt: 61_000 }, ...over
})
const tool = (name: string) => stub<TurnEntry['blocks'][number]>({ kind: 'tool', id: name, call: { name } })

function host(file: string, entries: readonly Entry[] = []) {
  const themes: ThemeMode[] = []
  const closed: string[] = []
  const reload = vi.fn()
  const changed = vi.fn()
  const t = new Templates({
    file,
    settings: fileSettings(file),
    setTheme: mode => void themes.push(mode),
    closePage: async id => void closed.push(id),
    reload,
    changed,
    entries: () => entries,
    cwd: () => '/work/repo',
    commits: async () => [Date.UTC(2026, 10, 20, 12) / 1000, Date.UTC(2026, 10, 20, 13) / 1000],
    now: () => Date.UTC(2026, 10, 22, 12)
  })
  return { t, themes, closed, reload, changed }
}

describe('templates catalog', () => {
  it('Mono is greyscale and terminal with Analytics; Studio is gold and bubble with the Whiteboard; Default undoes both', () => {
    expect(TEMPLATES.mono).toMatchObject({ theme: 'mono', transcript: 'terminal', panels: [{ page: 'analytics', how: 'beside' }] })
    expect(TEMPLATES.studio).toMatchObject({ theme: 'studio', transcript: 'bubble', panels: [{ page: 'whiteboard', how: 'beside' }] })
    expect(TEMPLATES.default).toMatchObject({ theme: 'tern', transcript: 'standard', panels: [] })
  })

  it('every template ink reads 4.5:1 on its own background and card layers', () => {
    for (const p of [monoPalette(), studioPalette()]) {
      for (const under of [p.bg, ...p.layers]) {
        for (const ink of [p.fg, p.accent, p.muted, p.dim]) expect(contrastRatio(ink, under) ?? 0).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrastRatio(p.accentInk, p.accent) ?? 0).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('the terminal transcript sets mono type and a prompt mark; the bubble one a right-hand accent bubble; standard installs nothing', () => {
    const terminal = transcriptCss('terminal') ?? ''
    expect(terminal).toContain(".sf-card[data-role='omp.user']")
    expect(terminal).toContain(minifyCss(`a{font-family:${MONO}}`).slice(2, -1))
    expect(terminal).toContain("content:'❯ '")
    const bubble = transcriptCss('bubble') ?? ''
    expect(bubble).toContain('margin-left:auto !important')
    expect(bubble).toContain("[data-role='omp.assistant']")
    expect(transcriptCss('standard')).toBeNull()
  })
})

describe('Templates.use', () => {
  it('applies Mono live: saves it, wears the mono theme, writes the Analytics page with this session\'s numbers and docks it beside', async () => {
    const dir = tmp(), file = join(dir, 'settings.json')
    // An agent's own page stays listed through every template switch.
    writeFileSync(file, JSON.stringify({ thoughts: false, ui: { rev: 4, widgets: [], pages: [{ id: 'blockworld', title: 'Blockworld', path: '/w/b.html', how: 'over', opened: 1 }] } }))
    const entries: Entry[] = [
      stub<Entry>({ kind: 'user', id: 'u1', text: 'hi', at: 0 }),
      turn('t1', { blocks: [tool('terminal'), tool('read_file'), tool('terminal')], tickTokens: 1200 })
    ]
    const h = host(file, entries)

    const line = await h.t.use('mono')

    expect(line).toBe('Mono template: the Mono theme, the terminal transcript, Analytics beside the chat.')
    expect(h.themes).toEqual(['mono'])
    expect(readSettings(file)).toMatchObject({ template: 'mono', transcript: 'terminal', thoughts: false })
    expect(h.t.current).toBe('mono')
    expect(h.t.css()).toBe(transcriptCss('terminal'))
    const ui = readUi(file)
    expect(ui.rev).toBe(5)
    expect(ui.pages?.map(p => [p.id, p.how])).toEqual([['blockworld', 'over'], ['template-analytics', 'beside']])
    const page = ui.pages?.find(p => p.id === 'template-analytics')
    expect(page?.path).toBe(join(dir, 'pages', 'analytics.html'))
    const html = readFileSync(page?.path ?? '', 'utf8')
    const data = parseJson(/id="glide-data">([^<]*)</.exec(html)?.[1] ?? '{}')
    expect(data).toMatchObject({ prompts: 1, turns: 1, tokens: 1200, seconds: 60, toolCalls: 3, cwd: '/work/repo', tools: [{ name: 'terminal', count: 2 }, { name: 'read_file', count: 1 }] })
    expect(data).toMatchObject({ commits: expect.arrayContaining([{ day: '2026-11-20', count: 2 }]) })
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(h.changed).toHaveBeenCalled()
  })

  it('switching to Studio closes Analytics and docks the Whiteboard; Default closes every template panel and the transcript sheet', async () => {
    const file = join(tmp(), 'settings.json')
    const h = host(file)
    await h.t.use('mono')
    await h.t.use('studio')
    expect(h.closed).toEqual(['template-analytics'])
    expect(readUi(file).pages?.map(p => p.id)).toEqual(['template-whiteboard'])
    expect(h.t.css()).toBe(transcriptCss('bubble'))
    expect(h.themes).toEqual(['mono', 'studio'])

    expect(await h.t.use('default')).toBe("Default template: Tern's theme, the standard transcript, no template panels.")
    expect(h.closed).toEqual(['template-analytics', 'template-whiteboard'])
    expect(readUi(file).pages).toEqual([])
    expect(h.t.css()).toBeNull()
    expect(h.themes.at(-1)).toBe('tern')
  })

  it('a panel opens beside the chat and keeps the template\'s other panels where they are docked', async () => {
    const file = join(tmp(), 'settings.json')
    const h = host(file)
    await h.t.use('mono')
    expect(await h.t.panel('whiteboard')).toBe('Whiteboard opened beside the chat.')
    expect(readUi(file).pages?.map(p => p.id).sort()).toEqual(['template-analytics', 'template-whiteboard'])
    expect(h.closed).toEqual([])
  })

  it('a page written with data cannot close its own script', () => {
    expect(pageWithData('<script type="application/json" id="glide-data">{}</script>', { cwd: '</script><b>' }))
      .toBe('<script type="application/json" id="glide-data">{"cwd":"\\u003c/script>\\u003cb>"}</script>')
  })

  it('writing template pages keeps every other settings key and the agent\'s pages', () => {
    const file = join(tmp(), 'settings.json')
    writeFileSync(file, JSON.stringify({ theme: 'nous', ui: { rev: 1, widgets: [{ id: 'w' }], style: { warmth: 0.5 }, pages: [{ id: 'template-analytics' }, { id: 'piano' }] } }))
    writeTemplatePages(file, [])
    expect(parseJson(readFileSync(file, 'utf8'))).toEqual({ theme: 'nous', ui: { rev: 2, widgets: [{ id: 'w' }], style: { warmth: 0.5 }, pages: [{ id: 'piano' }] } })
  })
})

describe('analyticsData', () => {
  it('folds the ninth tool on into Other and counts failed turns', () => {
    const blocks = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(tool)
    const d = analyticsData([turn('t1', { blocks, end: { status: 'error', endedAt: 2_000 } })], Date.UTC(2026, 10, 22))
    expect(d.tools).toHaveLength(8)
    expect(d.tools.at(-1)).toEqual({ name: 'Other', count: 2 })
    expect(d.failed).toBe(1)
    expect(d.commits).toHaveLength(30)
  })
})

describe('shipped pages', () => {
  it.each(['analytics', 'whiteboard'])('%s ships, colours itself from --glide-* and follows glide-theme', name => {
    const path = shippedPage(name)
    expect(existsSync(path)).toBe(true)
    const html = readFileSync(path, 'utf8')
    expect(html).toContain('<script type="application/json" id="glide-data">{}</script>')
    for (const v of ['--glide-bg', '--glide-fg', '--glide-accent', '--glide-surface']) expect(html).toContain(`var(${v})`)
    expect(html).toContain("'glide-theme'")
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/)
  })
})

describe('the Mono and Studio theme modes', () => {
  it('wear their palette and the card sheet, without touching the Tern window; leaving takes the sheet away', () => {
    const sent: Palette[] = []
    const sheets = new Map<string, string>()
    const windowTheme = vi.fn()
    const theme = new Theme({
      palette: p => void sent.push(p),
      stylesheet: (name, css) => void (css === null ? sheets.delete(name) : sheets.set(name, css)),
      settings: { save: () => ({}) },
      walFile: join(tmp(), 'none.json'),
      windowTheme
    }, 'mono')
    theme.apply()
    expect(sent.at(-1)?.name).toEqual({ dark: 'glide-mono', light: 'glide-mono' })
    expect(sheets.get(WAL_SHEET)).toContain(monoPalette().bg)
    expect(theme.wal?.source).toBe('mono')
    theme.set('studio')
    expect(sent.at(-1)?.name).toEqual({ dark: 'glide-studio', light: 'glide-studio' })
    expect(theme.wal?.accent).toBe(studioPalette().accent)
    theme.set('tern')
    expect(sheets.has(WAL_SHEET)).toBe(false)
    expect(windowTheme).not.toHaveBeenCalled()
    theme.dispose()
  })
})

describe('the command palette and /template', () => {
  it('lists the templates and their panels after the commands, each running its /template command', () => {
    const rows = paletteRows()
    expect(rows[0]?.name.startsWith('/')).toBe(true)
    const tpl = rows.filter(r => r.group === 'Templates').map(r => [r.name, r.command])
    expect(tpl).toEqual([
      ['Use Mono template', '/template mono'],
      ['Use Studio template', '/template studio'],
      ['Use Default template', '/template default'],
      ['Open Analytics page', '/template panel analytics'],
      ['Open Whiteboard page', '/template panel whiteboard']
    ])
    expect(rows.some(r => r.name === '/template')).toBe(true)
  })

  it('/template mono applies it and reports the line; a bad name shows the usage', async () => {
    const use = vi.fn(async () => 'Mono template: applied.')
    const panel = vi.fn(async () => 'Analytics opened beside the chat.')
    const notice = vi.fn()
    const h = stub<CommandHost>({ templates: { current: 'default', use, panel }, transcript: { notice } })
    const cmd = localCommand('template')
    await cmd?.run(h, 'mono')
    await cmd?.run(h, 'panel analytics')
    await cmd?.run(h, 'neon')
    await cmd?.run(h, '')
    expect(use).toHaveBeenCalledWith('mono')
    expect(panel).toHaveBeenCalledWith('analytics')
    expect(notice.mock.calls).toEqual([
      ['Mono template: applied.', 'success'],
      ['Analytics opened beside the chat.', 'success'],
      ['Usage: /template [mono|studio|default] or /template panel [analytics|whiteboard]', 'warning'],
      ['Template: Default. /template [mono|studio|default] or /template panel [analytics|whiteboard]']
    ])
  })
})

describe('GlidePages.close', () => {
  it('closes an open page\'s block and forgets it; an unknown id is a no-op', async () => {
    const ops: unknown[] = []
    const browser: Browser = async op => { ops.push(op); return op.op === 'open' ? { block: 7 } : {} }
    const pages = new GlidePages(browser, () => 1)
    await pages.sync([{ id: 'template-analytics', title: 'Analytics', path: '/x/analytics.html', how: 'beside', opened: 1 }])
    await pages.close('template-analytics')
    await pages.close('nothing')
    expect(ops.filter(o => JSON.stringify(o).includes('"close"'))).toEqual([{ op: 'close', block: 7 }])
  })
})

describe('settings.json', () => {
  it('reads the template and transcript style, and drops values it does not know', () => {
    const file = join(tmp(), 'settings.json')
    writeFileSync(file, JSON.stringify({ theme: 'studio', template: 'studio', transcript: 'bubble' }))
    expect(readSettings(file)).toEqual({ theme: 'studio', template: 'studio', transcript: 'bubble' })
    writeFileSync(file, JSON.stringify({ theme: 'neon', template: 'neon', transcript: 'chat' }))
    expect(readSettings(file)).toEqual({})
  })
})
