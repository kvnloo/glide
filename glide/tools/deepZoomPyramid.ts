// A synthetic gigapixel Deep Zoom Image for the deep-zoom journey (GL-104), cut tile by tile so the full
// image never exists in memory or on disk. The image is a function of the pixel: 4096 px hue cells, a 256 px
// checker and a 32 px fine checker. Each level samples it nearest-neighbour, the way a pyramid tool downsamples.
// Equal tiles (most of one hue cell) are encoded once; every tile file is still written.
//
//   bun glide/tools/deepZoomPyramid.ts <out-dir> [width height]     (prints the summary as JSON)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32, deflateSync } from 'node:zlib'

export interface Pyramid {
  readonly dzi: string
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly maxLevel: number
  readonly files: number
  readonly encoded: number
  readonly bytes: number
}

const HUES = 24
/** RGB of the synthetic image at full-resolution pixel (x, y). */
export function pixel(x: number, y: number): [number, number, number] {
  return colour(xCode(x), xCode(y))
}
const xCode = (v: number) => ((v >> 12) << 2) | (((v >> 8) & 1) << 1) | ((v >> 5) & 1)
function colour(cx: number, cy: number): [number, number, number] {
  const h = (((cx >> 2) * 7 + (cy >> 2) * 13) % HUES) / HUES
  const lift = (((cx >> 1) ^ (cy >> 1)) & 1 ? 0.78 : 1) * (((cx ^ cy) & 1) ? 0.92 : 1)
  const ch = (o: number) => Math.round(255 * lift * (0.5 + 0.42 * Math.cos(2 * Math.PI * (h + o))))
  return [ch(0), ch(1 / 3), ch(2 / 3)]
}

function chunk(type: string, data: Buffer) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)
  return Buffer.concat([head, data, crc])
}

function png(width: number, height: number, xs: Int32Array, ys: Int32Array) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  const rows = new Map<number, Buffer>()
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let j = 0; j < height; j++) {
    const code = ys[j] ?? 0
    let row = rows.get(code)
    if (!row) {
      row = Buffer.alloc(width * 3 + 1)
      for (let i = 0; i < width; i++) row.set(colour(xs[i] ?? 0, code), 1 + i * 3)
      rows.set(code, row)
    }
    row.copy(raw, j * row.length)
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
}

/** Writes `<dir>/image.dzi` and `<dir>/image_files/` (PNG tiles, no overlap). */
export function writePyramid(dir: string, width = 40000, height = 30000, tileSize = 512): Pyramid {
  const maxLevel = Math.ceil(Math.log2(Math.max(width, height)))
  const files = join(dir, 'image_files')
  const encoded = new Map<string, Buffer>()
  let count = 0, bytes = 0
  for (let level = 0; level <= maxLevel; level++) {
    const k = 2 ** (maxLevel - level)
    const lw = Math.ceil(width / k), lh = Math.ceil(height / k)
    mkdirSync(join(files, String(level)), { recursive: true })
    for (let col = 0; col * tileSize < lw; col++) {
      const w = Math.min(tileSize, lw - col * tileSize)
      const xs = Int32Array.from({ length: w }, (_, i) => xCode(Math.min(width - 1, (col * tileSize + i) * k)))
      for (let row = 0; row * tileSize < lh; row++) {
        const h = Math.min(tileSize, lh - row * tileSize)
        const ys = Int32Array.from({ length: h }, (_, j) => xCode(Math.min(height - 1, (row * tileSize + j) * k)))
        const sig = `${w}x${h}:${Buffer.from(xs.buffer).toString('base64')}:${Buffer.from(ys.buffer).toString('base64')}`
        let data = encoded.get(sig)
        if (!data) encoded.set(sig, data = png(w, h, xs, ys))
        writeFileSync(join(files, String(level), `${col}_${row}.png`), data)
        count++
        bytes += data.length
      }
    }
  }
  const dzi = join(dir, 'image.dzi')
  writeFileSync(dzi, `<?xml version="1.0" encoding="UTF-8"?>\n<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" Format="png" Overlap="0" TileSize="${tileSize}">\n  <Size Width="${width}" Height="${height}"/>\n</Image>\n`)
  return { dzi, width, height, tileSize, maxLevel, files: count, encoded: encoded.size, bytes }
}

if (process.argv[1]?.endsWith('deepZoomPyramid.ts')) {
  const [out, w, h] = process.argv.slice(2)
  if (!out) {
    console.error('usage: bun glide/tools/deepZoomPyramid.ts <out-dir> [width height]')
    process.exit(2)
  }
  console.log(JSON.stringify(writePyramid(out, w ? Number(w) : undefined, h ? Number(h) : undefined)))
}
