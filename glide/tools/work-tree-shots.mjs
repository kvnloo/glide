#!/usr/bin/env node
// Real App, SDK and Tern pixels. Run under flock /tmp/glide-studio-heavy.lock.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const frontend = join(repo, 'frontend')
const { build } = createRequire(join(frontend, 'package.json'))('esbuild')
const out = resolve(process.argv[2] ?? join(repo, 'docs/images/work-tree'))
const memory = Number(readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/)?.[1] ?? 0)
assert(memory > 6 * 1024 * 1024, 'Wait for MemAvailable > 6 GiB before capture')
mkdirSync(out, { recursive: true })
const runtime = mkdtempSync(join(tmpdir(), 'glide-work-tree-'))
const control = join(runtime, 'control.sock')
const env = { ...process.env }
for (const key of ['DISPLAY', 'WAYLAND_DISPLAY', 'HYPRLAND_INSTANCE_SIGNATURE', 'SWAYSOCK', 'TMUX', 'STY', 'ZELLIJ', 'TERN_PANE', 'TERN_WINDOW', 'TERN_CONTROL', 'TERN_TSP', 'HERMES_TUI_GATEWAY_URL', 'HERMES_TUI_RESUME', 'HERMES_TUI_QUERY', 'HERMES_TUI_IMAGE', 'HERMES_CWD', 'HERMES_TERN_RESTORED', 'GLIDE_LANES_URL', 'GLIDE_LANES_TOKEN_FILE']) delete env[key]
Object.assign(env, { HOME: join(runtime, 'home'), HERMES_HOME: join(runtime, 'home/.hermes'), XDG_CONFIG_HOME: join(runtime, 'config'), XDG_CACHE_HOME: join(runtime, 'cache'), XDG_STATE_HOME: join(runtime, 'state'), XDG_RUNTIME_DIR: runtime, TERN_CONFIG_DIR: join(runtime, 'tern'), TERN_DAEMON_SOCKET: join(runtime, 'daemon.sock'), WORK_TREE_PROOF: runtime })
for (const dir of [env.HOME, env.HERMES_HOME, env.TERN_CONFIG_DIR]) mkdirSync(dir, { recursive: true })
const themes = spawnSync('python3', ['-c', 'import launcher; launcher.install_themes()'], { env, cwd: repo, encoding: 'utf8' })
assert.equal(themes.status, 0, themes.stderr)
const bundle = join(frontend, 'dist/work-tree-proof.mjs')
await build({ absWorkingDir: frontend, entryPoints: [join(repo, 'glide/tools/work-tree-proof-app.mjs')], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: bundle, jsx: 'automatic', jsxImportSource: '@stencil-hq/tern', loader: { '.png': 'binary' }, preserveSymlinks: true, nodePaths: [join(frontend, 'node_modules')], banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" } })
function ctl(...args) {
  const r = spawnSync('tern', ['ctl', '--control', control, ...args], { env, encoding: 'utf8' })
  assert.equal(r.status, 0, `ctl ${args.join(' ')}: ${r.stderr} ${r.stdout}`)
  return r.stdout
}
const server = spawn('tern', ['serve', '--control', control, '--out', out], { env, cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] })
const log = createWriteStream(join(runtime, 'serve.log'))
server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false })
const exited = once(server, 'exit')
async function until(test, label) {
  for (let i = 0; i < 200; i++) { if (test()) return; if (server.exitCode !== null) throw new Error('Tern exited: ' + readFileSync(join(runtime, 'serve.log'), 'utf8')); await sleep(100) }
  throw new Error(`Timed out: ${label}; runtime ${runtime}`)
}
const state = () => existsSync(join(runtime, 'state.json')) ? JSON.parse(readFileSync(join(runtime, 'state.json'), 'utf8')) : {}
let sequence = 0
async function action(action) {
  writeFileSync(join(runtime, 'input.json'), JSON.stringify({ sequence: ++sequence, action }))
  await until(() => state().sequence === sequence, action)
  await sleep(250)
}
function shot(name) { ctl('wait', '300'); ctl('shot', name); writeFileSync(join(out, `${name}.tree.txt`), ctl('tree')); writeFileSync(join(out, `${name}.dump.txt`), ctl('dump')) }
try {
  await until(() => existsSync(control), 'control socket')
  ctl('ready'); ctl('size', '1060', '796')
  ctl('theme', 'dark', 'dash'); ctl('theme', 'light', 'dash'); ctl('appearance', 'dark')
  const appEnv = ['HOME', 'HERMES_HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'XDG_RUNTIME_DIR', 'TERN_CONFIG_DIR', 'TERN_DAEMON_SOCKET', 'WORK_TREE_PROOF'].map(key => `${key}=${JSON.stringify(env[key])}`).join(' ')
  ctl('run', JSON.stringify(`exec env -u DISPLAY -u WAYLAND_DISPLAY -u TMUX -u STY -u ZELLIJ ${appEnv} ${JSON.stringify(process.execPath)} ${JSON.stringify(bundle)} 2>${JSON.stringify(join(runtime, 'app.stderr.log'))}`))
  await until(() => state().ready, 'App ready')
  await action('start')
  await until(() => ctl('tree').includes('Waiting for file tools') || ctl('tree').includes('search.ts'), 'work tree mounted')
  ctl('record', 'start', 'HEADLESS-work-tree', 'fps', '24')
  await action('edit')
  await sleep(500)
  shot('HEADLESS-files-live')
  assert(ctl('tree').includes('editing'), 'running edit is visible')
  ctl('click', "[data-role='glide.tabs'] .sf-tab:nth-child(2)")
  await sleep(300)
  // Native tabs have real SDK handlers; assert that the Tern tree changed after the click.
  let view = ctl('tree')
  if (!view.includes('Build search input')) {
    const dump = ctl('dump', "[data-role='glide.tabs']")
    throw new Error('Tasks tab did not switch through native input: ' + dump)
  }
  shot('HEADLESS-tasks-live')
  assert(view.includes('Verify keyboard flow'), 'nested tasks are visible')
  ctl('reduce-motion', 'on'); shot('HEADLESS-reduced-motion')
  ctl('reduce-motion', 'off')
  await action('done')
  await until(() => ctl('tree').includes('Show work tree'), 'collapsed receipt')
  shot('HEADLESS-receipt')
  assert(!ctl('tree').includes('Build search input'), 'tree automatically collapsed')
  ctl('record', 'stop')
  ctl('click', "button[aria-label='Show work tree']")
  await sleep(300)
  assert(ctl('tree').includes('Verify keyboard flow'), 'receipt reopens through a real button')
  ctl('size', '412', '796'); shot('HEADLESS-phone')
  ctl('size', '1060', '796')
  await action('reset')
  assert(!ctl('tree').includes('Work tree'), 'session reset removes previous tree')
  ctl('key', 'Ctrl+d')
  await until(() => existsSync(join(runtime, 'exit.json')), 'App shutdown')
  writeFileSync(join(out, 'proof.json'), JSON.stringify({ status: 'passed', synthetic: true, host: 'real Tern serve', isolation: 'Owned headless endpoint, no physical display; shared studio kept untouched', runtime, checks: ['gateway start mounts', 'read/edit/create events', 'native task tab click', 'nested tasks', 'reduced motion', 'auto-collapse and receipt', '412 px', 'native expand click', 'session reset'] }, null, 2))
  console.log(JSON.stringify({ out, runtime, status: 'passed' }))
} finally {
  if (server.exitCode === null) { try { ctl('quit') } catch { /* preserve original failure */ } }
  await exited
  log.end()
}
