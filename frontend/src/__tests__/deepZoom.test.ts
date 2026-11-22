// Deep zoom (GL-104): the tile origin answers the viewer, the descriptor and in-bounds tiles of a Deep Zoom Image,
// and refuses everything else (the source image, other files, out-of-range tiles, foreign hosts); a page with
// `tiles` opens through it.
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deepZoomOrigin, levelGrid, parseDzi, tileOf, type DeepZoomOrigin } from '../../../glide/frontend/deepZoom.js'
import { pixel, writePyramid, type Pyramid } from '../../../glide/tools/deepZoomPyramid.js'

import type { Browser } from '../gev/globe.js'
import { GlidePages } from '../glideui/pages.js'
import { readUi } from '../wire/files.js'

const VIEWER = fileURLToPath(new URL('../../../glide/deepzoom/viewer.html', import.meta.url))
const GIGA = parseDzi('<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" TileSize="510" Overlap="1" Format="jpg"><Size Width="40000" Height="30000"/></Image>')

function get(url: string, opts: { method?: string; host?: string } = {}) {
  return new Promise<{ status: number; type: string | undefined; body: Buffer }>((resolve, reject) => {
    const u = new URL(url)
    const req = request({ host: u.hostname, port: u.port, path: u.pathname, method: opts.method ?? 'GET', headers: opts.host ? { host: opts.host } : {} }, res => {
      const parts: Buffer[] = []
      res.on('data', (b: Buffer) => parts.push(b))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, type: res.headers['content-type'], body: Buffer.concat(parts) }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('parseDzi and the pyramid grid', () => {
  it('reads a 1.2 gigapixel descriptor and its 17 levels', () => {
    expect(GIGA).toEqual({ width: 40000, height: 30000, tileSize: 510, overlap: 1, format: 'jpg', maxLevel: 16 })
    expect(levelGrid(GIGA, 16)).toEqual({ width: 40000, height: 30000, cols: 79, rows: 59 })
    expect(levelGrid(GIGA, 8)).toEqual({ width: 157, height: 118, cols: 1, rows: 1 })
    expect(levelGrid(GIGA, 0)).toEqual({ width: 1, height: 1, cols: 1, rows: 1 })
  })

  it('refuses what is not a sane pyramid', () => {
    expect(() => parseDzi('<Collection/>')).toThrow('not a Deep Zoom Image')
    expect(() => parseDzi('<Image TileSize="256" Format="gif"><Size Width="9" Height="9"/></Image>')).toThrow('format')
    expect(() => parseDzi('<Image TileSize="256" Format="png"><Size Width="0" Height="9"/></Image>')).toThrow('size')
    expect(() => parseDzi('<Image TileSize="99999" Format="png"><Size Width="9" Height="9"/></Image>')).toThrow('tile size')
  })

  it('names only tiles inside each level', () => {
    expect(tileOf(GIGA, 'image_files/16/78_58.jpg')).toEqual({ level: 16, col: 78, row: 58 })
    for (const bad of ['image_files/16/79_0.jpg', 'image_files/16/0_59.jpg', 'image_files/17/0_0.jpg', 'image_files/8/1_0.jpg',
      'image_files/16/0_0.png', 'image_files/16/../0_0.jpg', 'image.jpg', 'image_files/16/0_0.jpg/x']) {
      expect(tileOf(GIGA, bad)).toBeUndefined()
    }
  })
})

describe('deepZoomOrigin', () => {
  let dir: string
  let pyramid: Pyramid
  let origin: DeepZoomOrigin
  let base: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'glide-dz-'))
    pyramid = writePyramid(dir, 40000, 30000)
    await writeFile(join(dir, 'image.tif'), 'the source image: never served')
    await writeFile(join(dir, 'image_files', 'notes.txt'), 'x')
    await symlink(join(dir, 'image.tif'), join(dir, 'image_files', '16', 'link.png'))
    origin = await deepZoomOrigin(pyramid.dzi, VIEWER)
    base = origin.url.replace(/viewer\.html$/, '')
  })
  afterAll(async () => {
    origin.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('writes a gigapixel pyramid tile by tile', () => {
    expect(pyramid.width * pyramid.height).toBeGreaterThanOrEqual(1e9)
    expect(pyramid).toMatchObject({ maxLevel: 16, files: 6279 })
    expect(pyramid.encoded).toBeLessThan(pyramid.files)
    expect(pixel(0, 0)).not.toEqual(pixel(4096, 0))
    expect(pixel(0, 0)).not.toEqual(pixel(256, 0))
  })

  it('serves the viewer, the descriptor and in-bounds tiles with their types', async () => {
    expect(origin.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]{36}\/viewer\.html$/)
    expect(origin.dzi).toEqual({ width: 40000, height: 30000, tileSize: 512, overlap: 0, format: 'png', maxLevel: 16 })
    const page = await get(origin.url)
    expect([page.status, page.type, page.body.toString()]).toEqual([200, 'text/html; charset=utf-8', expect.stringContaining('<title>Deep zoom</title>')])
    expect((await get(base + 'image.dzi')).status).toBe(200)
    for (const t of ['0/0_0', '9/0_0', '16/0_0', '16/78_58', '12/4_3']) {
      const tile = await get(`${base}image_files/${t}.png`)
      expect([t, tile.status, tile.type]).toEqual([t, 200, 'image/png'])
      expect(tile.body.subarray(1, 4).toString()).toBe('PNG')
    }
    expect((await get(base + 'image_files/16/0_0.png', { method: 'HEAD' })).status).toBe(200)
  })

  it('refuses the source image, other files, out-of-range tiles, links, other hosts and methods', async () => {
    const before = origin.served.refused
    const refused = ['image.tif', 'image_files/notes.txt', 'image_files/16/79_0.png', 'image_files/17/0_0.png',
      'image_files/16/link.png', '..%2Fimage.tif', 'image_files/16/0_0.jpg', '']
    for (const p of refused) expect([p, (await get(base + p)).status]).toEqual([p, 404])
    expect((await get(origin.url.replace(/\/[0-9a-f-]{36}\//, '/00000000-0000-0000-0000-000000000000/'))).status).toBe(404)
    expect((await get(origin.url, { host: 'evil.example' })).status).toBe(404)
    expect((await get(origin.url, { method: 'POST' })).status).toBe(404)
    expect(origin.served.refused - before).toBe(refused.length + 3)
  })

  it('refuses a descriptor without its tile folder', async () => {
    const lone = join(dir, 'lone.dzi')
    await writeFile(lone, '<Image TileSize="256" Format="png"><Size Width="9" Height="9"/></Image>')
    await expect(deepZoomOrigin(lone, VIEWER)).rejects.toThrow()
  })
})

describe('a deep-zoom page', () => {
  it('opens through the tile origin and settings.json keeps its tiles', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'glide-dz-page-'))
    try {
      const { dzi } = writePyramid(dir, 3000, 2000, 256)
      const ops: Record<string, unknown>[] = []
      const browser: Browser = async op => {
        ops.push(op)
        return op['op'] === 'open' ? { block: 5 } : {}
      }
      const pages = new GlidePages(browser, () => 3)
      const mount = { id: 'deep-zoom', title: 'scene', path: VIEWER, tiles: dzi, how: 'beside' as const, opened: 1 }
      expect(await pages.sync([mount])).toEqual({ 'deep-zoom': { ok: true, block: 5 } })
      const url = String(ops[0]?.['url'])
      expect(ops[0]).toMatchObject({ op: 'open', owner: 3, how: 'beside' })
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/.+\/viewer\.html$/)
      expect((await get(url.replace(/viewer\.html$/, 'image_files/12/11_7.png'))).status).toBe(200)
      expect(await pages.sync([{ ...mount, tiles: join(dir, 'missing.dzi'), opened: 2 }])).toEqual({
        'deep-zoom': { ok: false, problems: [expect.stringContaining('ENOENT')] }
      })
      pages.dispose()
      const file = join(dir, 'settings.json')
      await writeFile(file, JSON.stringify({ ui: { rev: 2, widgets: [], pages: [mount, { ...mount, id: 'bad', tiles: 'relative.dzi' }] } }))
      expect(readUi(file).pages).toEqual([mount, { ...mount, id: 'bad', tiles: undefined }])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
