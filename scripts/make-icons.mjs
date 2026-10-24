// Renders the app icon (ink check on moon grey, same geometry as public/icon.svg) to PNGs.
// No dependencies: distance-field rasterizer + node:zlib PNG encoder. Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0xde, 0xd8, 0xca]
const INK = [0x22, 0x20, 0x19]
// Check mark in the 1024 icon space: path points transformed by translate(267 274) scale(3.6).
const POINTS = [
  [18, 70],
  [55, 114],
  [118, 18],
].map(([x, y]) => [267 + x * 3.6, 274 + y * 3.6])
const HALF_STROKE = 12 * 3.6

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function render(size) {
  const scale = 1024 / size
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3) // filter byte 0 + RGB
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) * scale
      const py = (y + 0.5) * scale
      const d = Math.min(
        distToSegment(px, py, POINTS[0], POINTS[1]),
        distToSegment(px, py, POINTS[1], POINTS[2]),
      )
      // Anti-alias over one output pixel.
      const coverage = Math.max(0, Math.min(1, (HALF_STROKE - d) / scale + 0.5))
      for (let c = 0; c < 3; c++) {
        row[1 + x * 3 + c] = Math.round(BG[c] + (INK[c] - BG[c]) * coverage)
      }
    }
    rows.push(row)
  }
  return png(size, size, Buffer.concat(rows))
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [file, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writeFileSync(new URL(`../public/${file}`, import.meta.url), render(size))
  console.log(`public/${file} ${size}×${size}`)
}
