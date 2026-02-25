import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const ICON_SIZES = [16, 32, 48, 180, 512]
const BRAND_PRIMARY = '#245DFF'
const BRAND_SECONDARY = '#0EA5A4'
const BRAND_SURFACE = '#F8FAFF'

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawSymbol(ctx, size) {
  const artSize = size * 0.76
  const offset = (size - artSize) / 2
  const unit = artSize / 40
  const round = Math.max(1, unit * 3)

  drawRoundedRect(ctx, offset, offset, artSize, artSize, round)
  ctx.fillStyle = BRAND_PRIMARY
  ctx.fill()

  ctx.fillStyle = BRAND_SURFACE
  ctx.beginPath()
  ctx.moveTo(offset + 4 * unit, offset + 34 * unit)
  ctx.lineTo(offset + 4 * unit, offset + 22 * unit)
  ctx.lineTo(offset + 12 * unit, offset + 22 * unit)
  ctx.lineTo(offset + 12 * unit, offset + 18 * unit)
  ctx.lineTo(offset + 20 * unit, offset + 18 * unit)
  ctx.lineTo(offset + 20 * unit, offset + 14 * unit)
  ctx.lineTo(offset + 28 * unit, offset + 14 * unit)
  ctx.lineTo(offset + 28 * unit, offset + 10 * unit)
  ctx.lineTo(offset + 36 * unit, offset + 10 * unit)
  ctx.lineTo(offset + 36 * unit, offset + 34 * unit)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = BRAND_SECONDARY
  ctx.fillRect(offset + 28 * unit, offset + 6 * unit, 8 * unit, 4 * unit)
}

async function writeIconWithFs(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  drawSymbol(ctx, size)
  const target =
    size === 180
      ? path.join(projectRoot, 'public', 'apple-touch-icon.png')
      : path.join(projectRoot, 'public', `favicon-${size}x${size}.png`)
  await writeFile(target, await canvas.encode('png'))
}

async function main() {
  await mkdir(path.join(projectRoot, 'public'), { recursive: true })
  for (const size of ICON_SIZES) {
    await writeIconWithFs(size)
  }
  const pwaCanvas = createCanvas(512, 512)
  const pwaCtx = pwaCanvas.getContext('2d')
  drawSymbol(pwaCtx, 512)
  await writeFile(path.join(projectRoot, 'public', 'icon-512x512.png'), await pwaCanvas.encode('png'))
}

main().catch((error) => {
  console.error('[brand-icons] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
