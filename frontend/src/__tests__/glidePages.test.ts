// Agent pages (glide_page_open, kvnloo/glide#326): settings.json's `ui.pages` opens each page in a Tern browser
// block once per request, themes it with the surface's colors, restyles every open page, and the verdict
// lands in ui-status.json beside the widgets'.
import { mkdir, mkdtemp, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { pageOrigin } from '../../../glide/frontend/pageAssets.js'

import type { Browser } from '../gev/globe.js'
import { GlidePages, pageThemeOf, pageUrl, type PageTheme } from '../glideui/pages.js'
import { themeFunction } from '../../../glide/frontend/pageThemeScript.js'
import { GlideWidgets, statusFile } from '../glideui/widgets.js'
import { readJsonFile, readUi } from '../wire/files.js'

const NIGHT: PageTheme = { dark: true, bg: '#0e0c14', surface: '#17141f', fg: '#ece8f4', muted: '#9a93ab', accent: '#a78bfa', accentInk: '#111111' }
const DAY: PageTheme = { ...NIGHT, dark: false, bg: '#f5f1ea', fg: '#2a2620' }

function fakeBrowser(opts: { failOpen?: string; goneBlocks?: Set<number> } = {}) {
  const ops: Record<string, unknown>[] = []
  let next = 40
  const browser: Browser = async op => {
    ops.push(op)
    if (op['op'] === 'open') {
      if (opts.failOpen) throw new Error(opts.failOpen)
      return { block: ++next }
    }
    const block = op['block']
    if (typeof block === 'number' && opts.goneBlocks?.has(block)) throw new Error('no such block')
    return {}
  }
  return { browser, ops }
}

const page = (id: string, opened: number, how: 'over' | 'beside' | 'below' = 'over') => ({ id, title: id, path: `/tmp/${id}.html`, how, opened })

describe('GlidePages', () => {
  it('opens each request once in its own block and themes it', async () => {
    const { browser, ops } = fakeBrowser()
    const pages = new GlidePages(browser, () => 7)
    await pages.restyle(NIGHT)
    expect(await pages.sync([page('blockworld', 1)])).toEqual({ blockworld: { ok: true, block: 41 } })
    expect(ops[0]).toEqual({ op: 'open', owner: 7, url: pageUrl('/tmp/blockworld.html'), how: 'over' })
    expect(ops[1]).toMatchObject({ op: 'eval', block: 41, world: 'page' })
    expect(await pages.sync([page('blockworld', 1)])).toEqual({})
    expect(ops.filter(o => o['op'] === 'open')).toHaveLength(1)
  })

  it('reloads the same id in place, and reopens it when its block has gone', async () => {
    const gone = new Set<number>()
    const { browser, ops } = fakeBrowser({ goneBlocks: gone })
    const pages = new GlidePages(browser, () => 7)
    await pages.sync([page('piano', 1)])
    expect(await pages.sync([page('piano', 2)])).toEqual({ piano: { ok: true, block: 41 } })
    expect(ops.at(-1)).toEqual({ op: 'goto', block: 41, url: pageUrl('/tmp/piano.html') })
    gone.add(41)
    expect(await pages.sync([page('piano', 3, 'beside')])).toEqual({ piano: { ok: true, block: 42 } })
    expect(ops.at(-1)).toMatchObject({ op: 'open', how: 'beside' })
  })

  it('focuses an existing saved page and reopens a closed one from the list', async () => {
    const { browser } = fakeBrowser()
    const focused: number[] = []
    let closed = false
    const pages = new GlidePages(browser, () => 7, async block => {
      if (closed) throw new Error('Cannot navigate a closed browser block')
      focused.push(block)
    })
    const saved = page('music', 1)
    await pages.sync([saved])
    expect(await pages.reopen(saved)).toEqual({ ok: true, block: 41 })
    expect(focused).toEqual([41])
    closed = true
    expect(await pages.reopen(saved)).toEqual({ ok: true, block: 42 })
    expect(await pages.sync([saved])).toEqual({})
  })

  it('restyles every open page and reports failures without a pane', async () => {
    const { browser, ops } = fakeBrowser()
    const pages = new GlidePages(browser, () => 7)
    await pages.sync([page('a', 1), page('b', 1)])
    ops.length = 0
    await pages.restyle(DAY)
    expect(ops.map(o => [o['op'], o['block']])).toEqual([['eval', 41], ['eval', 42]])
    expect(await new GlidePages(browser, () => undefined).sync([page('c', 1)])).toEqual({ c: { ok: false, problems: ['not inside a Tern pane'] } })
    expect(await new GlidePages(fakeBrowser({ failOpen: 'headless' }).browser, () => 7).sync([page('d', 1)])).toEqual({ d: { ok: false, problems: ['headless'] } })
  })
})

describe('themeFunction', () => {
  it('sets the --glide-* variables and dispatches glide-theme in the page', () => {
    const set: Record<string, string> = {}
    const events: unknown[] = []
    const dataset: Record<string, string> = {}
    const documentElement = { style: { setProperty: (k: string, v: string) => { set[k] = v }, colorScheme: '' }, dataset }
    const win: Record<string, unknown> = { dispatchEvent: (e: { detail: unknown }) => events.push(e.detail) }
    const ctx = { document: { documentElement }, window: win, CustomEvent: class { constructor(public type: string, public init: { detail: unknown }) {} get detail() { return this.init.detail } } }
    expect(runInNewContext(`(${themeFunction(DAY)})()`, ctx)).toBe(true)
    expect(set).toMatchObject({ '--glide-bg': DAY.bg, '--glide-accent': DAY.accent, '--glide-fg': DAY.fg })
    expect(documentElement.style.colorScheme).toBe('light')
    expect(documentElement.dataset['glideTheme']).toBe('light')
    expect(documentElement.dataset['glidePhase']).toBe('day')
    expect(events).toEqual([{ ...DAY, phase: 'day' }])
    runInNewContext(`(${themeFunction({ ...DAY, dark: true })})()`, ctx)
    expect(documentElement.dataset['glidePhase']).toBe('night')
    expect(events[1]).toMatchObject({ dark: true, phase: 'night' })
  })

  it('derives a theme from the wallpaper palette first, else from the Tern tokens', () => {
    expect(pageThemeOf({ dark: true, bg: '#000000', fg: '#ffffff', muted: '#888888', accent: '#a78bfa', accentInk: '#111111', layers: ['#111111'] }, undefined))
      .toEqual({ dark: true, bg: '#000000', surface: '#111111', fg: '#ffffff', muted: '#888888', accent: '#a78bfa', accentInk: '#111111' })
    expect(pageThemeOf(undefined, { dark: { text: '#eeeeee', accent: '#a78bfa', muted: '#999999' } })).toMatchObject({ dark: true, fg: '#eeeeee', accent: '#a78bfa' })
    expect(pageThemeOf(undefined, { light: { text: '#222222', accent: '#7c3aed' } })).toMatchObject({ dark: false, bg: '#f5f1ea', accentInk: '#ffffff' })
    expect(pageThemeOf(undefined, { dark: {}, light: {} })).toMatchObject({ dark: true, accent: '#d7b986' })
  })
})

describe('pages in settings.json', () => {
  it('reads ui.pages, drops a bad one, and writes the verdict to ui-status.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'glide-pages-'))
    const file = join(dir, 'settings.json')
    writeFileSync(file, JSON.stringify({ ui: { rev: 3, widgets: [], pages: [page('blockworld', 5), { id: 'Bad Id', title: 'x', path: '/x.html' }, { id: 'rel', title: 'x', path: 'x.html' }] } }))
    expect(readUi(file).pages?.map(p => p.id)).toEqual(['blockworld'])
    const { browser } = fakeBrowser()
    const w = new GlideWidgets({
      file, pages: new GlidePages(browser, () => 7), restyled: () => undefined,
      changed: () => {}, cwd: () => undefined
    })
    await w.reload()
    expect(readJsonFile(statusFile(file))).toMatchObject({
      rev: 3, pages: { blockworld: { ok: true, block: 41 } }
    })
    w.dispose()
  })
})

it('serves declared model and seekable audio assets but not neighboring files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'glide-asset-test-'))
  try {
    const entry = join(dir, 'scene.html')
    await mkdir(join(dir, 'media'))
    await writeFile(entry, '<title>Scene</title>')
    const model = join(dir, 'media', 'model file.glb')
    await writeFile(model, 'glTF')
    await truncate(model, 5 * 2 ** 20)
    await writeFile(join(dir, 'media', 'theme.wav'), 'RIFF0123WAVE')
    await writeFile(join(dir, 'media', 'unlisted.wav'), 'not public')
    const origin = await pageOrigin(entry, ['media/model file.glb', 'media/theme.wav'])
    try {
      expect(await (await fetch(origin.url)).text()).toBe('<title>Scene</title>')
      const asset = (name: string) => new URL(`media/${name}`, origin.url)
      const glb = await fetch(asset('model file.glb'))
      expect(glb.headers.get('content-type')).toBe('model/gltf-binary')
      expect((await glb.arrayBuffer()).byteLength).toBe(5 * 2 ** 20)
      const audio = await fetch(asset('theme.wav'), { headers: { Range: 'bytes=8-11' } })
      expect(audio.status).toBe(206)
      expect(audio.headers.get('content-type')).toBe('audio/wav')
      expect(audio.headers.get('content-range')).toBe('bytes 8-11/12')
      expect(await audio.text()).toBe('WAVE')
      expect((await fetch(asset('unlisted.wav'))).status).toBe(404)
      expect((await fetch(asset('theme.wav'), { headers: { Range: 'bytes=100-' } })).status).toBe(416)
      expect((await fetch(new URL('/media/theme.wav', origin.url))).status).toBe(404)
    } finally {
      origin.close()
    }
    await symlink(model, join(dir, 'alias.glb'))
    await expect(pageOrigin(entry, ['alias.glb'])).rejects.toThrow('Invalid page companion')
    await expect(pageOrigin(entry, ['../model.glb'])).rejects.toThrow('Invalid page companion')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
