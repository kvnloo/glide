#!/usr/bin/env node
// Drives the landing page's demo in headless Chrome over the DevTools protocol and checks each step:
// chips, approval buttons, the composer, the /theme picker's keys, a deep-work block, the tour, phone
// width and console errors. Writes PNGs and check.json to OUT.
//
//   python3 -m http.server 8817 --directory glide/site &
//   node glide/tools/site-check.mjs http://127.0.0.1:8817/ OUT
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, out = 'site-check'] = process.argv.slice(2)
if (!url) { console.error('usage: site-check.mjs URL [OUT]'); process.exit(2) }
mkdirSync(out, { recursive: true })

const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(b => {
  try { execFileSync('which', [b], { stdio: 'ignore' }); return true } catch { return false }
})
const profile = mkdtempSync(join(tmpdir(), 'site-check-'))
const proc = spawn(process.env.CHROME ?? chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))

let port
for (let i = 0; i < 100 && !port; i++) {
  await sleep(100)
  try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0] } catch { /* not yet */ }
}
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let seq = 0
const waiting = new Map()
const errors = []
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data)
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id) }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '))
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/fonts\.g/.test(msg.params.entry.url ?? '')) errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`)
})
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  waiting.set(id, m => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)))
  ws.send(JSON.stringify({ id, method, params }))
})
const js = async expr => {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result.value
}
const until = async (expr, ms = 8000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (await js(`return Boolean(${expr})`)) return true
  throw new Error(`timed out waiting for: ${expr}`)
}
const shot = async (name, clip) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
  writeFileSync(join(out, `${name}.png`), Buffer.from(r.data, 'base64'))
  await js(`document.querySelector('.nav').style.position = ''`)
}
const demoClip = () => js(`document.querySelector('.nav').style.position = 'static'; const r = document.querySelector('#demo').getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height }`)
const width = (w, h = 900) => cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 })

const checks = []
async function check(name, fn) {
  try { await fn(); checks.push({ name, ok: true }) } catch (error) { checks.push({ name, ok: false, error: String(error.message ?? error) }) }
}
const card = title => `[...document.querySelectorAll('[data-card]')].find(c => c.dataset.card === ${JSON.stringify(title)})`
const chip = text => `[...document.querySelectorAll('.chip')].find(c => c.textContent === ${JSON.stringify(text)}).click()`
const button = (title, action) => `${card(title)}.querySelector('[data-action=${action}]').click()`
const send = text => `const i = document.querySelector('[data-input]'); i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event('input')); document.querySelector('[data-composer]').requestSubmit()`
const keydown = k => `document.querySelector('[data-picker]').dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }))`

await cdp('Runtime.enable'); await cdp('Log.enable'); await cdp('Page.enable')
await width(1280)
const nav = await cdp('Page.navigate', { url })
await until(`document.documentElement.dataset.ready === 'true'`)
await shot('01-landing-1280')

await check('detect, build memory and turn on', async () => {
  await js(chip('/glide'))
  await until(`${card('Detect')}?.querySelector('[data-action=build]')`)
  await js(button('Detect', 'build'))
  await until(`${card('Memory built')}`)
  await until(`!${card('Detect')}.querySelector('button')`)
  await js(button('Memory built', 'enable'))
  await until(`${card('Recall on')}`)
})
await check('composer: /glide recall frontend quotes the pnpm correction', async () => {
  await js(send('/glide recall frontend'))
  await until(`${card('Recall · frontend')}?.textContent.includes('pnpm')`)
})
await shot('02-memory-recall', await demoClip())
await check('deep-work block holds asks and ends in one digest', async () => {
  await js(chip('/glide focus'))
  await until(`${card('Focus')}?.querySelector('[data-action=start]')`)
  await js(button('Focus', 'start'))
  await until(`!document.querySelector('[data-clock]').hidden`)
  await until(`/[1-9] asks? held/.test(${card('Deep-work block')}.textContent)`, 12000)
  await shot('03-block-running', await demoClip())
  await js(button('Deep-work block', 'end'))
  await until(`${card('Digest')}?.querySelectorAll('li').length >= 1`)
  await until(`document.querySelector('[data-clock]').hidden`)
})
await check('theme picker: arrows preview, Escape restores, Enter keeps', async () => {
  await js(chip('/theme'))
  await until(`!document.querySelector('[data-picker]').hidden`)
  await js(keydown('ArrowUp'))
  await until(`document.querySelector('[data-window]').dataset.theme === 'auto'`)
  await shot('04-theme-preview', await demoClip())
  await js(keydown('Escape'))
  await until(`document.querySelector('[data-window]').dataset.theme === 'dash' && document.querySelector('[data-picker]').hidden`)
  await js(chip('/theme'))
  await until(`!document.querySelector('[data-picker]').hidden`)
  await js(keydown('ArrowDown')); await js(keydown('ArrowDown')); await js(keydown('Enter'))
  await until(`document.querySelector('[data-window]').dataset.theme === 'nous' && document.querySelector('[data-picker]').hidden`)
  await until(`[...document.querySelectorAll('.msg.notice')].some(n => n.textContent.includes('Theme: Nous'))`)
})
await check('unknown input points at /help', async () => {
  await js(send('/nope'))
  await until(`[...document.querySelectorAll('.msg.notice')].some(n => n.textContent.includes('/help'))`)
})
await check('reset clears the transcript', async () => {
  await js(`document.querySelector('[data-reset]').click()`)
  await until(`document.querySelectorAll('[data-card]').length === 0 && !document.querySelector('[data-empty]').hidden && document.querySelector('[data-window]').dataset.theme === 'dash'`)
})
await check('install tabs switch panels with the keyboard', async () => {
  await js(`document.querySelector('#t-install').focus(); document.querySelector('#t-install').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`)
  await until(`!document.querySelector('#tab-run').hidden && document.querySelector('#tab-install').hidden`)
})
await check('the tour plays to the digest by itself', async () => {
  await js(`document.querySelector('[data-tour]').click()`)
  await until(`${card('Digest')} && document.querySelector('[data-tour]').textContent === 'Play the tour'`, 90000)
  await until(`${card('Recall on')} && ${card('Recall · frontend')}`)
})
await shot('05-tour-done', await demoClip())
await check('412 px: no horizontal overflow, 44 px tap targets', async () => {
  await width(412, 900)
  await sleep(300)
  const r = await js(`return { overflow: document.documentElement.scrollWidth - innerWidth,
    small: [...document.querySelectorAll('#demo button, .cta a, .tabs button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent) }`)
  if (r.overflow > 0) throw new Error(`page overflows by ${r.overflow}px`)
  if (r.small.length) throw new Error(`tap targets under 44px: ${r.small.join(', ')}`)
})
await shot('06-demo-412', await demoClip())
await shot('07-landing-412')
await check('no console errors', async () => { if (errors.length) throw new Error(errors.join(' | ')) })

const passed = checks.filter(c => c.ok).length
writeFileSync(join(out, 'check.json'), JSON.stringify({ url, frame: nav.frameId, checks, errors }, null, 2))
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : `: ${c.error}`}`)
console.log(`site-check: ${passed}/${checks.length} passed`)
ws.close(); proc.kill(); await sleep(200)
rmSync(profile, { recursive: true, force: true })
process.exit(passed === checks.length ? 0 : 1)
