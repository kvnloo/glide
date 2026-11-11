#!/usr/bin/env node
// Run from any cwd. Own one foreground headless Tern until ctl quit; never use owner sockets.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { build } from 'esbuild'

const tools = dirname(fileURLToPath(import.meta.url))
const frontend = resolve(tools, '../../frontend')
const repo = dirname(frontend)
const base = resolve(process.env.FACTORY_PROOF_BASE || join(tmpdir(), 'glide-factory-pane'))
const args = process.argv.slice(2)
assert(args.length === 0 || (args.length === 2 && args[0] === '--out'), 'Usage: node glide/tools/verify-factory.mjs [--out NEW_W1-proof_DIRECTORY]')
mkdirSync(base, { recursive: true })
const out = args.length ? resolve(args[1]) : mkdtempSync(join(base, 'W1-proof-'))
assert(out.startsWith(base + '/W1-proof'), 'Output must be a W1-proof directory under the W1 artifact root')
if (args.length) mkdirSync(out, { recursive: false })
const runtime = mkdtempSync(join(tmpdir(), 'w1-tern-'))
const control = join(runtime, 'control.sock')
const plugin = process.env.FACTORY_PROOF_PLUGIN
const intent = process.env.FACTORY_INTENT_SOURCE
const aodl = process.env.FACTORY_AODL_SOURCE
assert(plugin && intent && aodl, 'Set FACTORY_PROOF_PLUGIN, FACTORY_INTENT_SOURCE and FACTORY_AODL_SOURCE')
const tern = process.env.FACTORY_PROOF_TERN || 'tern'
const pin = '68231658f0ec0338464c0916a2329b9587444312'
const commandLog = join(out, 'commands.jsonl')
const checks = []
const screenshots = []
let serve
let serveDone
let failure
let serveExit
const env = { ...process.env }
for (const key of ['DISPLAY', 'WAYLAND_DISPLAY', 'HYPRLAND_INSTANCE_SIGNATURE', 'SWAYSOCK', 'TMUX', 'STY', 'ZELLIJ',
  'TERN_PANE', 'TERN_WINDOW', 'TERN_CONTROL', 'TERN_TSP', 'HERMES_TUI_GATEWAY_URL', 'HERMES_TUI_RESUME', 'HERMES_TUI_QUERY',
  'HERMES_TUI_IMAGE', 'HERMES_CWD', 'HERMES_TERN_RESTORED']) delete env[key]
Object.assign(env, {
  HOME: join(out, 'home'), HERMES_HOME: join(out, 'home', '.hermes'),
  XDG_CONFIG_HOME: join(out, 'home', '.config'), XDG_CACHE_HOME: join(out, 'home', '.cache'),
  XDG_DATA_HOME: join(out, 'home', '.local', 'share'), XDG_RUNTIME_DIR: runtime,
  TERN_CONFIG_DIR: join(out, 'tern-config'), TERN_DAEMON_SOCKET: join(runtime, 'daemon.sock'),
  FACTORY_PROOF_ROOT: out, FACTORY_PROOF_PLUGIN: plugin,
  FACTORY_PROOF_ADAPTER: join(tools, 'verify-factory-backend.py'),
  PYTHONPATH: [join(intent, 'src'), join(out, 'dependencies')].join(':'), PYTHONDONTWRITEBYTECODE: '1',
  TERN_TSP_RECORD: join(out, 'tsp.jsonl')
})
for (const path of [env.HOME, env.HERMES_HOME, env.TERN_CONFIG_DIR]) mkdirSync(path, { recursive: true })
function command(binary, argv, options = {}) {
  const result = spawnSync(binary, argv, { cwd: frontend, env, encoding: 'utf8', ...options })
  appendFileSync(commandLog, JSON.stringify({ at: new Date().toISOString(), binary, argv, status: result.status,
    error: result.error?.message, stdout: typeof result.stdout === 'string' ? result.stdout : undefined,
    stderr: typeof result.stderr === 'string' ? result.stderr : undefined }) + '\n')
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${binary} ${argv.join(' ')}: ${result.stderr}`)
  return result.stdout
}
function ctl(...argv) { return command(tern, ['ctl', '--control', control, ...argv]) }
function state() { return JSON.parse(readFileSync(join(out, 'app-state.json'), 'utf8')) }
async function until(test, label, ms = 20000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (serveExit) throw new Error(`Tern exited before ${label}: ${JSON.stringify(serveExit)}`)
    if (test()) return
    await sleep(100)
  }
  throw new Error('Timed out: ' + label)
}
function factoryCalls() { return state().calls.filter(c => c.method === 'command.dispatch') }
function proof(label, test) { assert(test, label); checks.push(label) }
function snapshot(name) {
  ctl('wait', '800')
  ctl('shot', name)
  assert(existsSync(join(out, 'serve', name + '.png')), 'Tern did not write the screenshot')
  screenshots.push(name)
  const tree = ctl('tree')
  writeFileSync(join(out, name + '.tree.txt'), tree)
  writeFileSync(join(out, name + '.state.json'), JSON.stringify(state(), null, 2))
  writeFileSync(join(out, name + '.stats.json'), ctl('stats'))
  return tree
}
async function toggle() {
  ctl('type', '/factory')
  ctl('key', 'Enter')
  await sleep(250)
}
const sources = ['src/app/chat.ts', 'src/app/frame.ts', 'src/chrome/factory.tsx', 'src/commands/factory.ts', 'src/wire/factory.ts', 'src/view/styles.ts']
const sourceHashes = () => Object.fromEntries(sources.map(path => [path,
  createHash('sha256').update(readFileSync(join(frontend, path))).digest('hex')]))
const startHashes = sourceHashes()
try {
  // Same local, exact validator extraction as hermes-plugin/tests/run_canonical.py. No downloads.
  mkdirSync(join(out, 'dependencies'))
  const archive = command('git', ['-C', aodl, 'archive', pin, 'aodl_contract'], { encoding: null })
  command('tar', ['-x', '-C', join(out, 'dependencies')], { input: archive })
  for (const [name, runState] of [['SYNTHETIC-failed-shot', 'failed'], ['SYNTHETIC-finished-shot', 'done'], ['SYNTHETIC-working-shot', 'running'], ['SYNTHETIC-ready-shot', 'ready']]) {
    const dir = join(out, 'runs', name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'workflow_api.json'), '{}\n')
    if (runState !== 'ready') writeFileSync(join(dir, 'render.json'), JSON.stringify({ state: runState, started: 1, ...(runState === 'done' ? { finished: 4, exit: 0 } : {}) }))
  }
  writeFileSync(join(out, 'scenes.jsonl'), '')
  writeFileSync(join(out, 'backend-mode'), 'synthetic\n')
  await build({ absWorkingDir: frontend, entryPoints: [join(tools, 'verify-factory-app.mjs')], bundle: true,
    platform: 'node', format: 'esm', target: 'node22', outfile: join(out, 'app.mjs'),
    jsx: 'automatic', jsxImportSource: '@stencil-hq/tern', loader: { '.png': 'binary' },
    alias: { '@tui': join(frontend, '.hermes-src/ui-tui/src') }, preserveSymlinks: false,
    nodePaths: [join(frontend, 'node_modules')],
    banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
    metafile: true, logLevel: 'warning'
  }).then(result => {
    writeFileSync(join(out, 'bundle-meta.json'), JSON.stringify(result.metafile, null, 2))
    assert(!Object.keys(result.metafile.inputs).some(p => p.includes('vitest')), 'Proof must not bundle vitest')
  })
  const argv = ['serve', '--control', control, '--out', out]
  writeFileSync(join(out, 'launch.json'), JSON.stringify({ binary: tern, argv, isolation: {
    HOME: env.HOME, HERMES_HOME: env.HERMES_HOME, XDG_RUNTIME_DIR: runtime,
    TERN_CONFIG_DIR: env.TERN_CONFIG_DIR, TERN_DAEMON_SOCKET: env.TERN_DAEMON_SOCKET,
    DISPLAY: null, WAYLAND_DISPLAY: null
  }, intent, aodl, validatorPin: pin, sourceHashes: startHashes }, null, 2))
  console.log(`Owned headless proof: ${out}\nControl: ${control}\n${tern} ${argv.join(' ')}`)
  const log = createWriteStream(join(out, 'serve.log'))
  serve = spawn(tern, argv, { cwd: out, env, stdio: ['ignore', 'pipe', 'pipe'] })
  serve.stdout.pipe(log, { end: false })
  serve.stderr.pipe(log, { end: false })
  serveDone = once(serve, 'exit').then(([code, signal]) => { serveExit = { code, signal }; log.end(); return serveExit })
  await until(() => existsSync(control), 'owned control endpoint')
  ctl('ready')
  const appEnv = Object.entries(env).filter(([key]) => /^(HOME$|HERMES_HOME$|XDG_|TERN_CONFIG_DIR$|TERN_DAEMON_SOCKET$|FACTORY_PROOF_|PYTHONPATH$|PYTHONDONTWRITEBYTECODE$|TERN_TSP_RECORD$)/.test(key))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(' ')
  ctl('run', JSON.stringify(`exec env -u DISPLAY -u WAYLAND_DISPLAY -u TMUX -u STY -u ZELLIJ ${appEnv} ${JSON.stringify(process.execPath)} ${JSON.stringify(join(out, 'app.mjs'))} 2>${JSON.stringify(join(out, 'app.stderr.log'))}`))
  await until(() => existsSync(join(out, 'app-state.json')) && state().ready, 'real SDK handshake and gateway session')
  ctl('size', '1440', '1000')
  await sleep(300)
  proof('Factory is off by default with zero backend dispatches', !state().factoryOpen && factoryCalls().length === 0)
  const off = snapshot('01-off-default')
  proof('Default native tree has no Factory pane', !off.includes('Only decisions.'))
  const notices = JSON.stringify(state().notices)
  await toggle()
  await until(() => state().factoryOpen && JSON.stringify(state().factory).includes('contract-'), '/factory native pending pane')
  const pending = snapshot('02-pending-synthetic')
  const props = JSON.stringify(state().factory)
  proof('/factory opened the real native prefs aside', pending.includes('sf sf-prefs') && pending.includes('Factory') && props.includes('Only decisions.') && state().caps.features.includes('aside'))
  proof('Pending canonical synthetic contract id and unavailable review are visible', pending.includes('contract-') && pending.includes('pending') && pending.includes('AODL review unavailable'))
  proof('Failed and done-awaiting-review attention rows are visible', pending.includes('SYNTHETIC-failed-shot') && pending.includes('Failed') && pending.includes('SYNTHETIC-finished-shot') && pending.includes('Awaiting review'))
  proof('Running job is one quiet count, not an attention row; ready is absent from attention', pending.includes('1 jobs running') && !pending.includes('SYNTHETIC-working-shot') && !JSON.stringify(state().factory.sections.find(s => s.id === 'attention')).includes('SYNTHETIC-ready-shot'))
  proof('No approval or execution controls for pending proposals', !props.includes('"control"') && !pending.includes('Run approved intent'))
  proof('Pane is native with no EUI cards or modal overlays', state().euiCards === 0 && state().overlays.length === 0)
  const count = factoryCalls().length
  await until(() => factoryCalls().length > count, 'second real-time poll', 16000)
  writeFileSync(join(out, '03-poll.state.json'), JSON.stringify(state(), null, 2))
  const intervals = factoryCalls().slice(1).map((c, i) => c.at - factoryCalls()[i].at)
  proof('Polling is no faster than 10000ms in real time', intervals.length > 0 && intervals.every(ms => ms >= 10000))
  writeFileSync(join(out, 'backend-mode'), 'unavailable\n')
  await until(() => JSON.stringify(state().factory).includes('AODL machine proposals unavailable'), 'actual production backend unavailable response', 18000)
  const unavailable = snapshot('04-backend-unavailable')
  proof('Production machine-provenance blocker is honestly visible', unavailable.includes('Factory unavailable') && unavailable.includes('AODL machine proposals unavailable') && unavailable.includes('Suggestions blocked'))
  proof('Routine polls and backend failure added no transcript notices', JSON.stringify(state().notices) === notices)
  ctl('click', JSON.stringify('.sf-prefs .pf-close'))
  await until(() => !state().factoryOpen, 'native close button')
  const nativeClosed = snapshot('05-native-closed')
  proof('Native close button closes the actual aside', !nativeClosed.includes('sf sf-prefs'))
  await toggle()
  await until(() => state().factoryOpen, '/factory reopens')
  await toggle()
  await until(() => !state().factoryOpen, '/factory close')
  const closed = snapshot('06-slash-closed')
  proof('/factory closes the pane in the real native tree', !closed.includes('Only decisions.'))
  const closedCount = factoryCalls().length
  await sleep(10500)
  proof('Closed pane stops backend reads', factoryCalls().length === closedCount)
  proof('No render, approval, or prompt dispatch was attempted', state().calls.every(c => c.method !== 'command.dispatch' || c.params.arg === 'json suggest {}') && !state().calls.some(c => /approve|prompt\.submit/.test(c.method)))
  assert.deepEqual(sourceHashes(), startHashes, 'Parent source changed during proof; rerun for a coherent receipt')
  ctl('type', '/quit')
  ctl('key', 'Enter')
  await until(() => existsSync(join(out, 'app-exit.json')), 'App normal shutdown before serve quits')
  const appExit = JSON.parse(readFileSync(join(out, 'app-exit.json'), 'utf8'))
  proof('App exits normally through local /quit before the owned PTY closes', appExit.code === 0 && appExit.appCode === 0)
  proof('App stderr is empty after actual process exit', readFileSync(join(out, 'app.stderr.log'), 'utf8') === '')
  console.log(`PASS: ${checks.length} checks; screenshots + trees in ${out}`)
} catch (error) {
  failure = error
  console.error(error.stack || error)
} finally {
  if (serve && !serveExit && existsSync(control)) {
    try { ctl('quit') } catch (error) { failure ||= error; console.error('ctl quit failed: ' + error.message) }
  }
  if (serveDone) await serveDone
  writeFileSync(join(out, 'result.json'), JSON.stringify({ pass: !failure, error: failure?.stack, checks,
    serveExit, sourceHashes: startHashes, completed: new Date().toISOString() }, null, 2))
  writeFileSync(join(out, 'RECEIPT.md'), `# W1 owned headless native proof\n\nResult: ${failure ? 'FAIL' : 'PASS'}. ${checks.length} checks passed. Tern serve exit: ${JSON.stringify(serveExit)}.\n\nRerun from the checkout:\n\n\`\`\`sh\nnode glide/tools/verify-factory.mjs\n\`\`\`\n\nOne owned foreground child: \`tern serve --control ${control} --out ${out}\`. App closes through local \`/quit\` before \`tern ctl --control ${control} quit\` stops serve. \`app-exit.json\` records the actual App process exit. No detached jobs or owner GUI. Display variables removed; unique home, config, runtime and daemon socket. The installed z0-guard has no desktop subcommand, so the focus-safety skill's headless-only fallback applies.\n\n${checks.map(c => '- PASS: ' + c).join('\n')}\n\n${failure ? 'Error: ' + String(failure) + '\n\n' : ''}Captured screenshots: ${screenshots.length ? screenshots.map(name => `\`serve/${name}.png\``).join(', ') : 'none'}. Matching layout JSON is under \`serve/\`; tree, App state and stats are at the artifact root. The exact pane launch command and isolated environment assignments are in \`commands.jsonl\`. \`03-poll.state.json\` records poll times. Exact control commands and exit codes: \`commands.jsonl\`. Gateway calls: \`gateway.jsonl\`. Real Python responses: \`backend-answers.jsonl\`. Real SDK traffic: \`tsp.jsonl\`. Build inputs: \`bundle-meta.json\`. Launch isolation and source hashes: \`launch.json\`.\n\n## Proof limits\n\nThis is actual App composition, real pinned SDK connect, and real Tern native rendering/input. Only the gateway is an EventEmitter stand-in. It permits only factory suggest on command.dispatch. The Python plugin, IntentService compiler, hashing and pinned validator are real. The synthetic model and evidence mirror the existing canonical pytest fixture. Runs, workflow files, profile and pending contracts are SYNTHETIC TEST ONLY, under this owned artifact root. No inference, content-rendering workload, approval record, approval endpoint, human approval claim or render attempt. Tern itself uses its native wgpu renderer for UI screenshots. This host has no software Vulkan ICD; the native renderer warning is retained in \`serve.log\`.\n\nThe unavailable case restores the unmodified production service factory in a separate empty store. Canonical machine provenance and review-existing remain unavailable. The full requirement of a human reviewing a suggestion in AODL and a real render returning to the pane is BLOCKED and not proven. No real GPU render was permitted. The stubbed gateway is not the live Hermes launcher/websocket/authentication stack.\n`)
  console.log(`Receipt: ${join(out, 'RECEIPT.md')}`)
}
if (failure) process.exitCode = 1
