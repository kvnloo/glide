// Optional Chromium end-to-end check. Pass the path to an installed playwright-core package.
import assert from 'node:assert/strict'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

const [, , playwright, executablePath, screenshot, take] = process.argv
if (!playwright || !executablePath) throw new Error('Usage: node pixel-art.mjs /path/to/playwright-core /path/to/chromium [screenshot.png] [take.webm]')
const { chromium } = createRequire(import.meta.url)(playwright)
const profile = await mkdtemp(join(tmpdir(), 'pixel-studio-'))
const url = new URL('../docs/pages/pixel-art.html', import.meta.url).href
const viewport = { width: 720, height: 720 }
const open = () => chromium.launchPersistentContext(profile, {
  executablePath, viewport, ...(take ? { recordVideo: { dir: profile, size: viewport } } : {})
})
let browser
try {
  browser = await open()
  let page = browser.pages()[0]
  await page.goto(url)
  const recording = take ? await page.video().path() : null
  if (take) await wait(500)
  const canvas = page.locator('#art')
  const box = await canvas.boundingBox()
  assert.ok(box)
  const point = (x, y) => [box.x + (x + 0.5) * box.width / 16, box.y + (y + 0.5) * box.height / 16]
  const pixel = (x, y) => page.locator('#art').evaluate((el, [px, py]) =>
    Array.from(el.getContext('2d').getImageData(px, py, 1, 1).data), [x, y])
  const purple = [121, 78, 234, 255]
  const clear = [0, 0, 0, 0]
  assert.deepEqual(await pixel(3, 3), clear)

  async function stroke(x, y, toX, toY) {
    await page.mouse.move(...point(x, y))
    await page.mouse.down()
    await page.mouse.move(...point(toX, toY), { steps: 4 })
    await page.mouse.up()
    if (take) await wait(180)
  }
  for (const [x, y, toX, toY] of [[4, 3, 11, 3], [4, 4, 4, 10], [11, 4, 11, 10],
    [4, 11, 11, 11], [6, 6, 6, 6], [9, 6, 9, 6], [6, 8, 9, 8]]) {
    await stroke(x, y, toX, toY)
  }
  assert.deepEqual(await pixel(8, 3), purple)
  await page.getByRole('button', { name: 'Eraser' }).click()
  await stroke(7, 8, 7, 8)
  assert.deepEqual(await pixel(7, 8), clear)
  await page.getByRole('button', { name: 'Pencil' }).click()
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  assert.deepEqual(await pixel(1, 0), purple)

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  assert.equal(await page.getByRole('status').textContent(), 'Saved sprite.')
  if (take) await wait(1100)
  await browser.close()
  if (recording) await copyFile(recording, take)

  browser = await open()
  page = browser.pages()[0]
  await page.goto(url)
  assert.equal(await page.getByRole('status').textContent(), 'Saved sprite restored.')
  assert.deepEqual(await pixel(8, 3), purple)
  assert.deepEqual(await pixel(7, 8), clear)
  assert.deepEqual(await pixel(1, 0), purple)
  if (screenshot) await page.screenshot({ path: screenshot, animations: 'disabled' })

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const png = await download
  assert.equal(png.suggestedFilename(), 'glide-sprite.png')
  assert.equal(await png.failure(), null)
  console.log('PASS: file:// pencil drag, eraser, keyboard paint, save, browser restart and restore, PNG download')
} finally {
  await browser?.close()
  await rm(profile, { recursive: true, force: true })
}
