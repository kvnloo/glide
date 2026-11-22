// Deep zoom (GL-104): a Deep Zoom Image pyramid served to the shipped viewer (glide/deepzoom/viewer.html) from a
// private loopback origin. Only three kinds of path answer: the viewer, the descriptor (image.dzi) and a tile
// inside the pyramid's bounds (image_files/<level>/<col>_<row>.<format>). Anything else, the source image
// included, is a 404, so the viewer can only ever load the tiles it shows.
import { randomUUID } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, dirname, join, sep } from 'node:path'

import { serve, type PageOrigin } from './pageAssets.js'

const LOOPBACK = '127.' + '0.0.1'
const TILE_MIME: Readonly<Record<string, string>> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const DZI_LIMIT = 64 * 2 ** 10
const TILE_LIMIT = 16 * 2 ** 20
const VIEWER_LIMIT = 4 * 2 ** 20
const MAX_SIDE = 2 ** 22

export interface Dzi {
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly overlap: number
  readonly format: string
  /** The finest level; level 0 is 1×1 px. */
  readonly maxLevel: number
}

const attr = (xml: string, tag: string, name: string) => {
  const el = new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>`, 'i').exec(xml)?.[1] ?? ''
  return new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`).exec(el)?.[1]
}
const int = (raw: string | undefined) => (raw !== undefined && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN)

/** The descriptor's numbers; throws on anything that is not a sane pyramid. */
export function parseDzi(xml: string): Dzi {
  if (!/<(?:\w+:)?Image\b/i.test(xml)) throw new Error('not a Deep Zoom Image descriptor')
  const width = int(attr(xml, 'Size', 'Width'))
  const height = int(attr(xml, 'Size', 'Height'))
  const tileSize = int(attr(xml, 'Image', 'TileSize'))
  const overlap = int(attr(xml, 'Image', 'Overlap') ?? '0')
  const format = (attr(xml, 'Image', 'Format') ?? '').toLowerCase()
  if (!TILE_MIME[format]) throw new Error('unsupported tile format')
  if (!(width >= 1 && height >= 1 && width <= MAX_SIDE && height <= MAX_SIDE)) throw new Error('image size out of range')
  if (!(tileSize >= 1 && tileSize <= 4096 && overlap >= 0 && overlap <= 64)) throw new Error('tile size out of range')
  return { width, height, tileSize, overlap, format, maxLevel: Math.ceil(Math.log2(Math.max(width, height))) }
}

/** Level `level`'s size in pixels and in tiles. */
export function levelGrid(d: Dzi, level: number) {
  const scale = 2 ** (d.maxLevel - level)
  const width = Math.ceil(d.width / scale)
  const height = Math.ceil(d.height / scale)
  return { width, height, cols: Math.ceil(width / d.tileSize), rows: Math.ceil(height / d.tileSize) }
}

/** The tile a request path names, when it is inside the pyramid. */
export function tileOf(d: Dzi, path: string): { level: number; col: number; row: number } | undefined {
  const m = /^image_files\/(\d{1,2})\/(\d{1,7})_(\d{1,7})\.([a-z]+)$/.exec(path)
  if (!m || m[4] !== d.format) return undefined
  const [level, col, row] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (level > d.maxLevel) return undefined
  const g = levelGrid(d, level)
  return col < g.cols && row < g.rows ? { level, col, row } : undefined
}

export interface DeepZoomOrigin extends PageOrigin {
  readonly dzi: Dzi
  /** Requests answered: the viewer, the descriptor, tiles, and refusals (404). */
  readonly served: { viewer: number; descriptor: number; tiles: number; refused: number }
}

/** Serves `viewer` and the pyramid of the `.dzi` file at `dziPath` on 127.0.0.1 until closed. */
export async function deepZoomOrigin(dziPath: string, viewer: string): Promise<DeepZoomOrigin> {
  const descriptor = await realpath(dziPath)
  const entry = await realpath(viewer)
  if (!/\.dzi$/i.test(descriptor) || !/\.html?$/i.test(entry)) throw new Error('Invalid deep-zoom page')
  if ((await stat(descriptor)).size > DZI_LIMIT) throw new Error('Deep Zoom descriptor over 64 KiB')
  const dzi = parseDzi(await readFile(descriptor, 'utf8'))
  const tiles = await realpath(join(dirname(descriptor), basename(descriptor).replace(/\.dzi$/i, '_files')))
  if (!(await stat(tiles)).isDirectory()) throw new Error('No tile folder beside the descriptor')
  const prefix = '/' + randomUUID() + '/'
  const served = { viewer: 0, descriptor: 0, tiles: 0, refused: 0 }
  let host = ''
  const server = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0] ?? ''
    const name = path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : undefined
    const refuse = (code = 404) => { served.refused++; res.writeHead(code).end() }
    if (name === undefined || req.headers.host !== host || (req.method !== 'GET' && req.method !== 'HEAD')) return refuse()
    // serve() refuses a file whose real path differs (a symlink out of the pyramid).
    const send = (file: string, mime: string, limit: number) => serve(req, res, { path: file, mime, limit })
    let job: Promise<void> | undefined
    if (name === 'viewer.html') {
      served.viewer++
      job = send(entry, 'text/html; charset=utf-8', VIEWER_LIMIT)
    } else if (name === 'image.dzi') {
      served.descriptor++
      job = send(descriptor, 'application/xml', DZI_LIMIT)
    } else {
      const tile = tileOf(dzi, name)
      if (!tile) return refuse()
      served.tiles++
      const file = join(tiles, String(tile.level), `${tile.col}_${tile.row}.${dzi.format}`)
      job = file.startsWith(tiles + sep) ? send(file, TILE_MIME[dzi.format] ?? 'application/octet-stream', TILE_LIMIT) : undefined
    }
    if (!job) return refuse()
    job.catch(() => {
      if (res.headersSent) res.destroy()
      else refuse()
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, LOOPBACK, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const addr = server.address()
  if (!addr || typeof addr === 'string') {
    server.close()
    throw new Error('No deep-zoom address')
  }
  host = `${LOOPBACK}:${addr.port}`
  server.unref()
  return {
    url: `http://${host}${prefix}viewer.html`, dzi, served,
    close: () => {
      server.close()
      server.closeAllConnections()
    }
  }
}

