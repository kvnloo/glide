// Agent-mounted widgets around the composer (kvnloo/glide#326): the real glide/v1 adapter compiles the
// program from settings.json's `ui`, the host source re-binds it as its data changes, the design checks
// gate it, and the verdict lands in ui-status.json for the mounting tool.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import * as z from 'zod/mini'

import { dashPalette } from '../../../glide/frontend/dash.js'
import { styleAccent, styleWal } from '../../../glide/frontend/style.js'
import { walPalette } from '../../../glide/frontend/wal.js'
import { checkMarkup, checkPalette, checkTree } from '../glideui/checks.js'
import type { UiNode } from '../glideui/library.js'
import { commitDays, commitsDoc, focusDoc } from '../glideui/mounts.js'
import { node, UI_CSS } from '../glideui/render.js'
import { GlideWidgets, statusFile } from '../glideui/widgets.js'
import { dockNodes } from '../view/dock.js'
import { readUi } from '../wire/files.js'
import { parseJson } from '../wire/json.js'

import { dockActions, dockContext } from './dockFakes.js'
import { tree } from './fakes.js'

const verdicts = z.object({ rev: z.number(), widgets: z.record(z.string(), z.object({ ok: z.boolean(), problems: z.optional(z.array(z.string())) })) })

const NOW = new Date(2026, 10, 13, 12).getTime()
const COMMITS = 'root = GlideCard("commits", [Graphic("heat"), Stats("stats")])'
const RING = 'root = GlideCard("focus", [Meter("meter"), Hero("left")])'

function home(ui: unknown) {
  const file = join(mkdtempSync(join(tmpdir(), 'glide-ui-')), 'glide', 'settings.json')
  const write = (next: unknown) => writeFileSync(file, JSON.stringify({ theme: 'auto', ui: next }))
  mkdirSync(join(file, '..'), { recursive: true })
  write(ui)
  return { file, write, status: () => verdicts.parse(parseJson(readFileSync(statusFile(file), 'utf8'))) }
}

function widgets(file: string, times: number[] = [], clock = { now: NOW }) {
  let changes = 0
  let restyles = 0
  const w = new GlideWidgets({
    file,
    changed: () => { changes++ },
    cwd: () => '/repo/glide',
    commits: async () => times,
    now: () => clock.now,
    restyled: () => { restyles++; return undefined }
  })
  return { w, changes: () => changes, restyles: () => restyles }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 20))
const text = (n: unknown) => JSON.stringify(n)

describe('widget sources', () => {
  it('counts commits per local day over 52 weeks, today last', () => {
    const today = Math.floor(NOW / 1000)
    const days = commitDays([today, today - 60, today - 86_400, today - 400 * 86_400], NOW)
    expect(days.at(-1)).toBe(2)
    expect(days.at(-2)).toBe(1)
    expect(days.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('paints the heatmap only in theme tokens, so a restyle retints it', () => {
    const doc = commitsDoc([Math.floor(NOW / 1000)], NOW, 'glide')
    const heat = doc.slots['heat']
    expect(heat?.c).toBe('Graphic')
    const p = heat?.p
    const svg = p && 'svg' in p && typeof p.svg === 'string' ? p.svg : ''
    expect(svg).toContain('var(--accent)')
    expect(svg.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([])
    expect(checkMarkup(svg, 'heat')).toEqual([])
  })

  it('counts a focus block down from when it started, across a relaunch', () => {
    const doc = focusDoc(NOW - 5 * 60_000, 25, NOW)
    expect(doc.slots['left']?.p).toMatchObject({ value: '20:00' })
    expect(focusDoc(NOW - 26 * 60_000, 25, NOW).slots['left']?.p).toMatchObject({ value: 'Done' })
  })
})

describe('design checks', () => {
  it('pass the shipped sheet and catch small text, glow and motion', () => {
    expect(checkMarkup(UI_CSS, 'sheet')).toEqual([])
    expect(checkMarkup('[a]{font-size:10px}', 's')[0]).toMatch(/10 px is under 11 px/)
    expect(checkMarkup('[a]{box-shadow:0 0 8px gold}', 's')[0]).toMatch(/glow or motion/)
    expect(checkMarkup('<svg><animate/></svg>', 's')[0]).toMatch(/glow or motion/)
  })

  it('keep the composer ring to a strip of figures', () => {
    const doc = commitsDoc([], NOW, 'r')
    const card: UiNode = { type: 'element', typeName: 'Card', props: { title: 't', children: [{ type: 'element', typeName: 'Stats', props: { items: [{ label: 'a', value: '1' }] } }] } }
    expect(doc.slots['stats']?.c).toBe('Stats')
    expect(checkTree(card, 'composer-ring')[0]).toMatch(/cannot hold a Stats/)
    expect(checkTree(card, 'below-composer')).toEqual([])
  })

  it('hold a warmed and accented palette to 4.5:1', () => {
    const wal = { special: { background: '#101418', foreground: '#d8dee9' }, colors: { color4: '#5e81ac', color7: '#a0a8b8', color8: '#7a8494' } }
    const warm = walPalette(styleWal(wal, { warmth: 0.8 }), 'test')
    expect(warm.bg).not.toBe(walPalette(wal).bg)
    expect(checkPalette(warm)).toEqual([])
    expect(checkPalette(styleAccent(dashPalette(), { accent: '#202020' }))).toEqual([])
    expect(checkPalette({ ...warm, muted: warm.bg })[0]).toMatch(/muted .* under 4.5:1/)
  })
})

describe('GlideWidgets', () => {
  it('reads only well-formed mounts from settings.json', () => {
    const h = home({ rev: 2, widgets: [{ id: 'commits', slot: 'below-composer', source: 'git.commits', program: COMMITS }, { id: 'Bad Id', slot: 'x' }] })
    expect(readUi(h.file).widgets.map(w => w.id)).toEqual(['commits'])
    expect(readUi(join(h.file, 'missing'))).toEqual({ rev: 0, widgets: [] })
  })

  it('mounts a valid program under the composer, reports it, and re-binds when the source refreshes', async () => {
    const h = home({ rev: 1, widgets: [{ id: 'commits', slot: 'below-composer', source: 'git.commits', program: COMMITS }] })
    const t = Math.floor(NOW / 1000)
    const times = [t, t - 10, t - 86_400]
    const clock = { now: NOW }
    const f = widgets(h.file, times, clock)
    await f.w.start()
    expect(h.status()).toMatchObject({ rev: 1, widgets: { commits: { ok: true } } })
    const r = { send: () => undefined, svg: () => 'blob' }
    await flush()
    const drawn = text(f.w.nodes('below-composer', r).map(tree))
    expect(drawn).toContain('This week')
    expect(drawn).toContain('"3 commits in 52 weeks"')
    // A new commit, read on the next refresh: the same compiled program re-binds to it.
    times.push(t + 5)
    clock.now += 121_000
    f.w.nodes('below-composer', r)
    await flush()
    expect(text(f.w.nodes('below-composer', r).map(tree))).toContain('"4 commits in 52 weeks"')
    expect(f.w.nodes('above-composer', r)).toEqual([])
    f.w.dispose()
  })

  it('fails closed on a program that names a slot the source lacks, or does not fit its slot', async () => {
    const h = home({ rev: 3, widgets: [
      { id: 'bad', slot: 'below-composer', source: 'git.commits', program: 'root = GlideCard("commits", [Hero("nope")])' },
      { id: 'wide', slot: 'composer-ring', source: 'git.commits', program: COMMITS },
      { id: 'ring', slot: 'composer-ring', source: 'clock.focus', minutes: 25, startedAt: NOW - 60_000, program: RING }
    ] })
    const f = widgets(h.file)
    await f.w.start()
    const s = h.status()
    expect(s.widgets['bad']?.ok).toBe(false)
    expect(s.widgets['bad']?.problems?.[0]).toMatch(/Unknown slot: nope/)
    expect(s.widgets['wide']?.problems?.[0]).toMatch(/cannot hold a Stats/)
    expect(s.widgets['ring']).toEqual({ ok: true })
    const r = { send: () => undefined, svg: () => 'blob' }
    expect(f.w.nodes('below-composer', r)).toEqual([])
    const ring = text(f.w.nodes('composer-ring', r).map(tree))
    expect(ring).toContain('glide.ring')
    expect(ring).toContain('24:00')
    f.w.dispose()
  })

  it('re-applies the theme only when the style changes', async () => {
    const h = home({ rev: 1, widgets: [], style: { warmth: 0.5 } })
    const f = widgets(h.file)
    await f.w.start()
    expect(f.restyles()).toBe(1)
    expect(f.w.style).toEqual({ warmth: 0.5 })
    await f.w.reload()
    expect(f.restyles()).toBe(1)
    h.write({ rev: 2, widgets: [], style: { warmth: 0.9 } })
    await f.w.reload()
    expect(f.restyles()).toBe(2)
    f.w.dispose()
  })
})

describe('dock slots', () => {
  it('stack widgets above, on and below the composer, keeping the composer key', () => {
    const w = (k: string) => node({ type: 'element', typeName: 'Text', props: { body: k } }, k, { send: () => undefined })
    const keys = dockNodes(dockContext(), dockActions(), { above: [w('a')], ring: [w('r')], below: [w('b')] }).map(n => tree(n).p?.['key'])
    expect(keys.slice(-4)).toEqual(['glide.above', 'glide.ring', 'composer', 'glide.below'])
    expect(dockNodes(dockContext(), dockActions()).map(n => tree(n).p?.['key']).at(-1)).toBe('composer')
  })
})
