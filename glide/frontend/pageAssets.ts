// Bundle pages get an isolated loopback origin so fetch(), modules and audio seeking work together.
// Nothing is served by directory: only the entry point and explicitly registered companion files.
import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { open, realpath } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'
import { basename, dirname, extname, join } from 'node:path'

const LOOPBACK = '127.' + '0.0.1'
const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.obj': 'text/plain', '.mtl': 'text/plain', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css'
}
const ENTRY_LIMIT = 4 * 2 ** 20
const ASSET_LIMIT = 128 * 2 ** 20
const assetName = /^[a-z0-9_][a-z0-9_. -]*(?:\/[a-z0-9_][a-z0-9_. -]*)*$/i
const urlPath = (path: string) => '/' + path.split('/').map(encodeURIComponent).join('/')

type ByteRange = { start: number; end: number }
function byteRange(raw: string, size: number): ByteRange | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(raw)
  if (!match || (!match[1] && !match[2])) return
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  if (start <= end) return { start, end }
  return undefined
}

export interface PageFile { path: string; mime: string; limit: number }
/** Streams one regular file (Range-aware) after checking it is still at its real path and under its limit. */
export async function serve(req: IncomingMessage, res: ServerResponse, file: PageFile) {
  if (await realpath(file.path) !== file.path) throw new Error('page file moved')
  const handle = await open(file.path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > file.limit) throw new Error('invalid page file')
    const range = req.headers.range ? byteRange(req.headers.range, stat.size) : undefined
    if (req.headers.range && !range) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end()
      return
    }
    res.writeHead(range ? 206 : 200, {
      'Accept-Ranges': 'bytes', 'Content-Type': file.mime, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Length': range ? range.end - range.start + 1 : stat.size,
      ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}` } : {})
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    await pipeline(handle.createReadStream({ ...range, autoClose: false }), res)
  } finally {
    await handle.close()
  }
}

export interface PageOrigin { url: string; close(): void }
export async function pageOrigin(path: string, assets: readonly string[]): Promise<PageOrigin> {
  const entry = await realpath(path)
  const dir = dirname(entry)
  const mime = MIME[extname(entry).toLowerCase()]
  if (!mime?.startsWith('text/html') || assets.length > 64) throw new Error('Invalid page bundle')
  const prefix = '/' + randomUUID()
  const entryUrl = prefix + urlPath(basename(entry))
  const files = new Map<string, PageFile>([[entryUrl, { path: entry, mime, limit: ENTRY_LIMIT }]])
  let remaining = ASSET_LIMIT
  for (const name of assets) {
    const type = MIME[extname(name).toLowerCase()]
    const candidate = join(dir, name)
    if (!type || type.startsWith('text/html') || name.length > 256 || !assetName.test(name) || await realpath(candidate) !== candidate) {
      throw new Error('Invalid page companion file')
    }
    const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    try {
      const stat = await handle.stat()
      remaining -= stat.size
      if (!stat.isFile() || remaining < 0) throw new Error('Page assets exceed 128 MiB or are not regular files')
      files.set(prefix + urlPath(name), { path: candidate, mime: type, limit: stat.size })
    } finally {
      await handle.close()
    }
  }
  let host = ''
  const server = createServer((req, res) => {
    const file = req.url && files.get(req.url.split('?')[0] ?? '')
    if (!file || req.headers.host !== host || (req.method !== 'GET' && req.method !== 'HEAD')) {
      res.writeHead(404).end()
      return
    }
    void serve(req, res, file).catch((error: unknown) => {
      if (res.headersSent) res.destroy(error instanceof Error ? error : undefined)
      else {
        const code = (error as NodeJS.ErrnoException | undefined)?.code
        res.writeHead(code === 'EACCES' ? 403 : 404).end()
      }
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
    throw new Error('No page bundle address')
  }
  host = `${LOOPBACK}:${addr.port}`
  server.unref()
  return { url: `http://${host}${entryUrl}`, close: () => {
    server.close()
    server.closeAllConnections()
  } }
}
