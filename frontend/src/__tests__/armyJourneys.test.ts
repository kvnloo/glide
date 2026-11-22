// TesterArmy journey drive: every typed entry in the features inventories, run headless through the real
// App on the fixture Tern session, with the gateway's plugin half answered by the real plugin (the
// army fixture host, glide/tools/army_host.py) in a disposable profile. A line passes when the app
// visibly answers it (a transcript entry, an overlay, or a request to the gateway) and nothing it
// reaches is missing: a plugin command or method the plugin did not register, or a forwarded command
// the pinned Hermes registry does not know, fails the feature. Set GLIDE_ARMY_OUT to keep the record.
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

import { TERMINAL_FEATURES } from '@stencil-hq/tern'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as z from 'zod/mini'

import { parseJson, record } from '../wire/json.js'

import { FakeGateway, fakeTern, key } from './fakes.js'

const scratch = mkdtempSync(join(tmpdir(), 'glide-army-'))
process.env['HERMES_HOME'] = join(scratch, 'app')
mkdirSync(process.env['HERMES_HOME'], { recursive: true })
// The external editor the fixture user has: it writes one line into the draft file and exits.
const editor = join(scratch, 'army-editor')
writeFileSync(editor, '#!/bin/sh\nprintf "edited by the army editor" > "$1"\n', { mode: 0o755 })
process.env['VISUAL'] = editor
// A synthetic `tern` CLI on PATH: it records each native call (`tern open --split right PATH`) the app makes.
const ternLog = join(scratch, 'tern-calls.log')
mkdirSync(join(scratch, 'bin'))
writeFileSync(join(scratch, 'bin', 'tern'), `#!/bin/sh\nprintf '%s\\n' "$*" >> '${ternLog}'\n`, { mode: 0o755 })
process.env['PATH'] = `${join(scratch, 'bin')}:${process.env['PATH'] ?? ''}`
const ternCalls = (): string[] => { try { return readFileSync(ternLog, 'utf8').split('\n').filter(Boolean) } catch { return [] } }
// Media the fixture user attaches and views: a PNG header and a one-triangle OBJ.
const png = join(scratch, 'army.png')
writeFileSync(png, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]))
const model = join(scratch, 'army.obj')
writeFileSync(model, 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')
process.env['EDITOR'] = editor

const { App } = await import('../app/chat.js')

const repo = resolve('..')
const python = process.env['GLIDE_ARMY_PYTHON'] ?? 'python3'

const Inventory = z.object({ features: z.array(z.object({ id: z.string(), journey: z.string(), surface: z.string(), entry: z.string() })) })
const Registered = z.object({ commands: z.array(z.string()), gateway: z.array(z.string()) })
const inventory = (name: string) => Inventory.parse(parseJson(readFileSync(join(repo, 'frontend/e2e', name), 'utf8'))).features
const features = [...inventory('features.json'), ...inventory('features.intel.json')]

/** Steps per feature: a slash line, a typed prompt, a composer completion, or a key chord. */
type Step = { line: string; pane?: true; forbid?: RegExp } | { replay: string } | { events: Record<string, unknown>[] } | { prompt: string } | { complete: string } | { chord: string; mods: Record<string, boolean> }

// Concrete forms of each typed entry. Placeholders take fixture values; a feature not listed here has
// no typed entry (an event-driven card or pane) and is exercised by its fixture suites instead.
const DRIVES: Record<string, Step[]> = {
  'chat-send': [{ prompt: 'army: say hello' }],
  // Event-driven surfaces: a recorded gateway stream (the golden replays' fixtures) or a minimal one.
  'thinking-orb': [{ prompt: 'list the files' }, { replay: 'turn-tools' }],
  'tool-cards': [{ replay: 'turn-tools' }],
  'gateway-prompts': [{ replay: 'approval-clarify' }],
  'ephemeral-chat-cards': [{ events: [
    { type: 'message.start', payload: {} },
    { type: 'message.complete', payload: { text: 'Here is the thread.\n\n```ephemeral-ui\n' + JSON.stringify({
      kind: 'thread', app: 'gmail', title: 'Synthetic thread', subject: 'Invoice 42', summary: 'Synthetic due date',
      fields: { Sender: 'Sample person' }, actions: 'host-confirmed', buttons: ['Dismiss'] }) + '\n```' } }
  ] }],
  'slash-completion': [{ complete: '/hel' }],
  'glide-detect': [{ line: '/glide' }, { line: '/glide help' }],
  'memory-build': [{ line: '/glide build' }],
  'memory-enable': [{ line: '/glide on' }],
  'memory-recall': [{ line: '/glide recall army words' }],
  'memory-disable': [{ line: '/glide off' }],
  'glide-setup': [{ line: '/glide setup' }],
  'glide-json-fallback': [{ line: '/glide json detect {}' }],
  'router-card': [{ line: '/glide router' }],
  'router-install': [{ line: '/glide skill-router install' }],
  'router-list': [{ line: '/glide skill-router list' }],
  'router-rank': [{ line: '/glide skill-router rank debug a failing test' }],
  'hill-climb-card': [{ line: '/glide climb' }],
  'hill-climb-scaffold': [{ line: '/glide hill-climb scaffold' }],
  'hill-climb-run': [{ line: '/glide hill-climb run --samples 1' }],
  'hill-climb-status': [{ line: '/glide hill-climb status' }],
  'hill-climb-stop-resume': [{ line: '/glide hill-climb stop' }, { line: '/glide hill-climb resume' }],
  'offload-card': [{ line: '/glide savings' }],
  'offload-models': [{ line: '/glide offload models' }],
  'offload-task': [{ line: '/glide offload summarize army fixture text' }],
  'offload-savings': [{ line: '/glide offload savings' }],
  'offload-reset': [{ line: '/glide offload reset' }],
  'focus-status': [{ line: '/glide focus' }],
  'focus-hours': [{ line: '/glide focus hours' }],
  'focus-start': [{ line: '/glide focus start' }],
  'focus-stop': [{ line: '/glide focus stop' }],
  'focus-wind-down': [{ line: '/glide focus wind-down' }],
  'voice-dictation': [{ line: '/voice status' }, { line: '/voice on' }, { line: '/voice off' }],
  'live-voice-toggle': [{ line: '/live status' }, { line: '/live' }],
  'hold-to-talk-unavailable': [{ line: '/ptt' }],
  'voice-lanes-popup': [{ line: '/glide lanes' }],
  'taste-pane': [{ line: '/glide taste' }],
  'intent-declare': [{ line: '/glide intent ship the army journey runner' }],
  'council-popup': [{ line: '/council' }],
  'council-card': [{ line: '/council card' }],
  'factory-pane': [{ line: '/factory' }],
  'factory-text-status': [{ line: '/factory text' }, { line: '/factory status' }],
  'factory-runs': [{ line: '/factory runs' }],
  'factory-scenes': [{ line: '/factory scenes army' }],
  'factory-suggest': [{ line: '/factory suggest' }],
  'factory-render': [{ line: '/factory render' }],
  'visual-picker': [{ line: '/visual' }],
  // The separate Luau route is opt-in: the chat picker, in a real pane, never links or installs a Tern plugin.
  'native-visual-route': [{ line: '/visual', pane: true, forbid: /^plugin\b/u }],
  'image-attachments': [{ line: `/image ${png}` }, { line: '/paste' }],
  'written-media': [{ line: `/view3d ${model}`, pane: true }],
  'tool-results-sheet': [{ line: '/tool-results' }],
  'new-session': [{ line: '/new army' }, { line: '/reset' }, { line: '/clear' }],
  'session-picker': [{ line: '/sessions' }, { line: '/resume' }],
  'session-sidebar': [{ line: '/sidebar' }],
  'pull-requests': [{ line: '/prs' }],
  'working-changes': [{ line: '/changes' }, { line: '/diff' }],
  'fork-pane': [{ line: '/fork' }],
  'rewind-picker': [{ line: '/rewind' }],
  'branch-tree': [{ line: '/tree' }],
  'undo-turns': [{ line: '/undo' }],
  'retry-turn': [{ line: '/retry' }],
  'compress-context': [{ line: '/compress' }, { line: '/compact' }],
  'branch-session': [{ line: '/branch army' }],
  'save-session': [{ line: '/save' }],
  'rollback-checkpoint': [{ line: '/rollback list' }],
  'context-snapshot': [{ line: '/context' }],
  'session-info': [{ line: '/info' }],
  'agents-hub': [{ line: '/agents' }, { line: '/tasks' }],
  'agents-spawn-gate': [{ line: '/agents status' }, { line: '/agents pause' }, { line: '/agents resume' }],
  'background-processes': [{ line: '/ps' }, { line: '/processes' }],
  'cron-jobs': [{ line: '/cron' }],
  'prompt-queue': [{ line: '/queue army queued prompt' }, { line: '/queue' }],
  'steer-turn': [{ line: '/steer army steer' }],
  'stop-turn-processes': [{ line: '/stop' }],
  'background-question': [{ line: '/bg army background question' }],
  'btw-threads': [{ line: '/btw army side question' }],
  'retained-notices': [{ line: '/notices' }],
  'session-reports': [{ line: '/usage' }, { line: '/status' }, { line: '/history' }],
  'tools-inventory': [{ line: '/tools' }],
  'mcp-reports': [{ line: '/mcp' }, { line: '/mcp status' }],
  'ssh-report': [{ line: '/ssh' }],
  'native-settings': [{ line: '/settings' }],
  'model-hub': [{ line: '/models' }],
  'model-picker': [{ line: '/model' }],
  'model-cycle': [{ chord: 'p', mods: { ctrl: true } }],
  'reasoning-effort': [{ line: '/effort' }, { line: '/reasoning high' }],
  'fast-mode': [{ line: '/fast' }],
  'theme-picker': [{ line: '/theme' }, { line: '/theme nous' }],
  'hermes-skin': [{ line: '/skin' }],
  'wallpaper-theme': [{ line: '/glide theme auto' }],
  'whole-theme': [{ line: '/glide theme sepia' }],
  'wallpaper-default': [{ line: '/glide theme default' }],
  'wallpaper-export': [{ line: '/glide theme export' }],
  'external-editor': [{ line: '/editor' }],
  'prompt-history-search': [{ chord: 'r', mods: { ctrl: true } }],
  'copy-text': [{ line: '/copy' }],
  'command-palette': [{ line: '/palette' }],
  'help-bindings': [{ line: '/help' }, { line: '/help model' }],
  'config-command': [{ line: '/config show' }],
  'plugins-list': [{ line: '/plugins' }],
  'subscription-report': [{ line: '/subscription' }],
  'browser-manage': [{ line: '/browser status' }],
  'browser-blocks': [{ line: '/browser-blocks' }],
  'reload-integrations': [{ line: '/reload' }, { line: '/reload-mcp' }],
  'worktree-command': [{ line: '/worktree list' }],
  'snapshot-create': [{ line: '/snapshot create army' }],
  'update-split': [{ line: '/update' }],
  'unsupported-commands': [{ line: '/battery' }, { line: '/density' }],
  'plan-review-boundary': [{ line: '/plan' }],
  'quit-chat': [{ line: '/quit' }],
  'fleet-hosts': [{ line: '/hosts' }],
  'fleet-portfolio': [{ line: '/portfolio' }],
  'fleet-factory': [{ line: '/factory graph' }],
  'intel-stock-command': [{ line: '/intel' }, { line: '/intel hill' }],
  'intel-pinned-kit-status': [{ line: '/intel skills' }]
}

/** The real plugin, registered once in its own disposable profile; requests answered in order. */
class PluginHost {
  readonly #child: ChildProcessWithoutNullStreams
  readonly #waiting: ((reply: Record<string, unknown>) => void)[] = []

  constructor() {
    this.#child = spawn(python, [join(repo, 'glide/tools/army_host.py'), 'serve'], {
      cwd: scratch,
      env: { ...process.env, GLIDE_ARMY_FIXTURE: '1', HERMES_HOME: join(scratch, 'plugin'), HOME: scratch }
    })
    createInterface({ input: this.#child.stdout }).on('line', line => {
      this.#waiting.shift()?.(record(parseJson(line)) ?? { ok: false, error: `unreadable reply: ${line}` })
    })
  }

  /** Requests the plugin has not answered yet. */
  get pending(): number {
    return this.#waiting.length
  }

  ask(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise(done => {
      this.#waiting.push(done)
      this.#child.stdin.write(JSON.stringify(request) + '\n')
    })
  }

  close() {
    this.#child.stdin.end()
  }
}

/** Every name and alias the pinned Hermes slash registry dispatches. */
function hermesCommands(): Set<string> {
  const code = 'import json; from hermes_cli.commands import COMMAND_REGISTRY as R; ' +
    'print(json.dumps(sorted({n for c in R for n in (c.name, *c.aliases)})))'
  const raw = execFileSync(python, ['-c', code], {
    cwd: resolve('.hermes-src'), encoding: 'utf8', env: { ...process.env, PYTHONPATH: resolve('.hermes-src'), HERMES_HOME: join(scratch, 'registry') }
  })
  return new Set(z.array(z.string()).parse(parseJson(raw)))
}

interface Effect {
  line: string; entries: string[]; overlays: string[]; methods: string[]; reached: string[]; missing: string[]
  refused: string[]; changed: string[]; layers: string[]; native: string[]; draft: string | null; exited: boolean
}

/** Commands owned by a plugin this repository does not ship: with it absent, a visible refusal is the pass. */
const EXTERNAL: Record<string, string> = { factory: 'the fframestudio factory plugin' }

/**
 * Warnings and errors a feature may show in the fixture profile: a visible refusal of an integration the
 * sandbox does not have (no microphone, clipboard, Nous login, wallpaper colours or Taste Atlas app), or
 * the feature's own documented boundary. Any other warning or error fails the drive.
 */
const REFUSALS: Record<string, RegExp> = {
  'memory-recall': /Glide memory is incomplete/u,
  'voice-dictation': /Dictation needs the Hermes command supplied by `hermes tern`/u,
  'hold-to-talk-unavailable': /^Hold-to-talk unavailable/u,
  'taste-pane': /Taste Atlas is unavailable/u,
  // Staging bytes needs the live gateway's scope capture, which no fixture can grant; the clipboard needs the launcher's Hermes.
  'image-attachments': /^Could not attach army\.png: PermissionError: gateway scope capture is unavailable$|^Could not read the clipboard image: no Hermes command/u,
  'wallpaper-export': /no wallpaper colours found yet/u,
  'copy-text': /^No answer to copy yet\.$/u,
  'subscription-report': /^Not logged into Nous Portal/u,
  'unsupported-commands': /is an Ink TUI feature; Tern has no/u
}

/** A notice the app shows when its own code threw: a crash, never an answer. */
const CRASH = /Cannot read properties|is not a function|is not iterable|could not build a frame/iu

let host: PluginHost
let inventoryReply: z.infer<typeof Registered>
let registry: Set<string>
const journal: { feature: string; journey: string; ok: boolean; steps: Effect[] }[] = []

beforeAll(async () => {
  host = new PluginHost()
  const inv = await host.ask({ op: 'inventory' })
  if (!inv['ok']) throw new Error('fixture host did not register the plugin: ' + JSON.stringify(inv))
  inventoryReply = Registered.parse(inv['result'])
  registry = hermesCommands()
}, 60_000)

afterAll(() => {
  host.close()
  const out = process.env['GLIDE_ARMY_OUT']
  if (out) writeFileSync(join(out, 'frontend-drives.json'), JSON.stringify({ registry: registry.size, plugin: inventoryReply, record: journal }, null, 1))
})

/** Waits until the app is idle: no new gateway request for a few turns and every plugin call answered. */
const settle = async (gw: FakeGateway) => {
  const deadline = Date.now() + 120_000
  let quiet = 0
  while (quiet < 4 && Date.now() < deadline) {
    const sent = gw.calls.length
    await new Promise(done => setTimeout(done, 5))
    quiet = gw.calls.length === sent && host.pending === 0 ? quiet + 1 : 0
  }
}

/** A turn by what it drew: its text and each tool or card block. */
const describeTurn = (blocks: readonly { kind: string; text?: unknown; call?: unknown }[]) =>
  'turn: ' + blocks.map(b => b.kind === 'tool' ? `tool ${String(record(b.call)?.['name'] ?? '')}` : b.kind === 'text' && typeof b.text === 'string' ? `text(${b.text.length})` : b.kind).join(', ')
const describeEntry = (e: { kind: string; text?: unknown; title?: unknown; tone?: unknown; blocks?: unknown }) =>
  e.kind === 'turn' && Array.isArray(e.blocks) ? describeTurn(e.blocks) :
  `${e.kind}${typeof e.tone === 'string' && e.tone !== 'info' ? `(${e.tone})` : ''}${typeof e.text === 'string' ? ': ' + e.text.slice(0, 160) : typeof e.title === 'string' ? ': ' + e.title : ''}`

/** One fresh app per feature: the gateway's plugin half is the fixture host, the rest a fake. */
async function drive(feature: string, steps: Step[]): Promise<Effect[]> {
  const gw = new FakeGateway()
  const missing: string[] = []
  const reached: string[] = []
  const plugin = new Set(inventoryReply.commands)
  let sessions = 0

  gw.handlers.set('setup.status', () => ({ provider_configured: true }))
  gw.handlers.set('session.create', () => {
    sessions++
    return {
      info: { stored_session_id: `army-${sessions}`, profile_name: 'army', cwd: repo, model: 'army-model', provider: 'army' },
      session_id: `army-${sessions}`, subscription_id: `sub-${sessions}`
    }
  })
  gw.handlers.set('commands.catalog', () => ({
    canon: Object.fromEntries([...registry, ...plugin].map(n => [`/${n}`, `/${n}`])), skills: {}
  }))
  gw.handlers.set('gateway.capabilities', () => ({ plugin_methods: inventoryReply.gateway }))
  gw.handlers.set('prompt.submit', () => ({ status: 'started' }))
  gw.handlers.set('session.resume', p => ({
    info: { stored_session_id: String(p['session_id'] ?? 'army-1') }, running: false, session_id: String(p['session_id'] ?? 'army-1'),
    subscription_id: 'sub-resumed', revision: 1, execution_generation: 1
  }))
  gw.handlers.set('prompt.background', () => ({ task_id: 'army-bg-1' }))
  gw.handlers.set('session.fork', () => ({ session_id: 'army-fork-1', profile: 'army' }))
  gw.handlers.set('session.save', () => ({ file: join(scratch, 'army-saved.json') }))
  gw.handlers.set('session.mutate', p => ({
    status: 'applied', revision: 2, ...(p['operation'] === 'model' ? { model: 'army-model-2' } : {}),
    ...(p['operation'] === 'branch' ? { branched_session_id: 'army-branch-1' } : {}),
    ...(p['operation'] === 'compress' ? { summary: { headline: 'Compressed 4 messages', token_line: '~1,200 → ~300 tokens', note: 'fixture owner receipt' } } : {})
  }))
  gw.handlers.set('complete.slash', p => {
    const query = String(p['text'] ?? '').replace(/^\//u, '').toLowerCase()
    const items = [...registry, ...plugin].filter(n => n.startsWith(query)).sort().slice(0, 8).map(n => ({ display: `/${n}`, text: n }))
    return { items, replace_from: 1 }
  })
  gw.handlers.set('model.options', () => ({
    model: 'army-model', provider: 'army',
    providers: [{ capabilities: { 'army-model': { fast: true, reasoning: true } }, is_current: true, models: ['army-model', 'army-model-2'], name: 'Army', slug: 'army' }]
  }))
  gw.handlers.set('session.context_breakdown', () => ({
    categories: [{ color: 'accent', id: 'messages', label: 'Conversation', tokens: 200 }],
    context_estimated: true, context_max: 1000, context_percent: 20, context_source: 'estimate', context_used: 200, estimated_total: 200, model: 'army-model'
  }))
  const slash = async (name: string, arg: string) => {
    reached.push(`/${name}`)
    if (plugin.has(name)) {
      const reply = await host.ask({ op: 'command', name, arg })
      if (!reply['ok']) {
        missing.push(`/${name}: ${String(reply['error'])}`)
        throw new Error(String(reply['error']))
      }
      return String(reply['output'])
    }
    if (EXTERNAL[name]) throw new Error(`unknown command /${name}`)
    if (!registry.has(name)) {
      missing.push(`/${name}: not a Hermes or plugin command`)
      throw new Error(`unknown command /${name}`)
    }
    return `(fixture gateway) /${name} dispatched`
  }
  gw.handlers.set('slash.exec', async p => {
    const [name = '', ...rest] = String(p['command'] ?? '').trim().split(/\s+/u)
    return { output: await slash(name.toLowerCase(), rest.join(' ')) }
  })
  gw.handlers.set('command.dispatch', async p => ({
    type: 'exec', output: await slash(String(p['name'] ?? '').toLowerCase(), String(p['arg'] ?? ''))
  }))
  for (const method of inventoryReply.gateway) {
    gw.handlers.set(method, async params => {
      reached.push(method)
      const reply = await host.ask({ op: 'gateway', method, params: { ...params, session_id: 'army-s1' } })
      if (!reply['ok']) throw new Error(String(reply['error']))
      return reply['result']
    })
  }

  const tern = fakeTern({ cols: 100, draws: true, features: [...TERMINAL_FEATURES] })
  const app = new App(tern.session, gw.client, 'army')
  let exited = false
  void app.run().then(() => { exited = true })
  gw.event({ type: 'gateway.ready', payload: {} })
  await settle(gw)

  const effects: Effect[] = []
  // App state a step may change without a transcript entry: the theme worn, live voice, the docked aside.
  const state = (): Record<string, string> => ({
    theme: String(app.stores.theme.mode),
    live: String(app.liveVoice.phase),
    session: String(app.session.ref.live),
    model: String(app.session.info?.model ?? ''),
    effort: String(app.session.info?.reasoning_effort ?? '')
  })
  for (const step of steps) {
    const shown = new Set(app.transcript.entries)
    const overlays = app.overlays.map(o => o.key)
    const calls = gw.calls.length
    const reachedAt = reached.length
    const missingAt = missing.length
    const before = state()
    const passing = new Set<string>()
    const opsAt = tern.ops.length
    const nativeAt = ternCalls().length
    // A step that needs a Tern pane runs with the pane variable the real launcher exports.
    if ('pane' in step) process.env['TERN_PANE'] = 'army-pane'
    let line: string
    if ('line' in step || 'prompt' in step) {
      line = 'line' in step ? step.line : step.prompt
      app.stores.composer.set(line)
      tern.press('enter')
    } else if ('replay' in step || 'events' in step) {
      // Gateway events for the live session, one at a time, as the gateway delivers them.
      const fed = 'replay' in step
        ? readFileSync(new URL(`./fixtures/${step.replay}.jsonl`, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => record(parseJson(l)) ?? {})
        : step.events
      line = 'replay' in step ? `replay ${step.replay}` : `events ${fed.map(e => String(e['type'])).join(',')}`
      for (const ev of fed.filter(e => e['type'] !== 'gateway.ready')) {
        gw.event({ ...ev, session_id: app.session.ref.live })
        await settle(gw)
        for (const o of app.overlays) if (!overlays.includes(o.key)) passing.add(o.key)
      }
    } else if ('complete' in step) {
      line = `${step.complete} + tab`
      for (const ch of step.complete) {
        tern.press(key(ch, { text: ch }))
        await settle(gw)
      }
      await new Promise(done => setTimeout(done, 150))
      await settle(gw)
      tern.press(key('tab'))
    } else {
      line = `chord ${Object.keys(step.mods).join('+')}+${step.chord}`
      tern.press(key(step.chord, step.mods))
    }
    await settle(gw)
    delete process.env['TERN_PANE']
    const added = app.transcript.entries.filter(e => !shown.has(e))
    const opened = [...new Set([...passing, ...app.overlays.map(o => o.key).filter(k => !overlays.includes(k))])]
    const notices = added.flatMap(e => (e.kind === 'notice' ? [e] : []))
    const name = line.startsWith('/') ? line.slice(1).split(/\s+/u)[0] ?? '' : ''
    const refused = EXTERNAL[name] ? notices.filter(n => n.tone === 'error' && n.text.includes(`/${name}`)).map(n => `${EXTERNAL[name]} is absent: ${n.text}`) : []
    const crashes = notices.filter(n => CRASH.test(n.text)).map(n => `crash: ${n.text}`)
    const unexpected = notices.filter(n => (n.tone === 'error' || n.tone === 'warning') && !CRASH.test(n.text) &&
      !refused.some(r => r.endsWith(n.text)) && !(REFUSALS[feature]?.test(n.text) ?? false)).map(n => `unexpected ${n.tone}: ${n.text}`)
    const draft = app.stores.composer.text
    effects.push({
      line,
      // A host card is a panel the EUI host draws: name it by its card title, not the panel's fallback text.
      entries: added.map(e => (e.kind === 'panel' && app.eui.hostView(e) ? `host card: ${e.title}` : describeEntry(e))),
      overlays: opened.length ? opened : app.overlays.length !== overlays.length ? ['(overlay closed)'] : [],
      methods: gw.calls.slice(calls).map(c => c.method),
      reached: reached.slice(reachedAt),
      missing: [...missing.slice(missingAt).filter(m => !EXTERNAL[m.slice(1).split(':')[0] ?? '']), ...crashes, ...unexpected,
        ...('forbid' in step && step.forbid ? ternCalls().slice(nativeAt).filter(c => step.forbid?.test(c)).map(c => `forbidden native call: tern ${c}`) : [])],
      refused,
      native: ternCalls().slice(nativeAt),
      // The docked aside (sidebar, PRs, factory) draws by frame op into the layer region.
      layers: tern.ops.slice(opsAt).filter(op => op[0] === 'add' && op[2] === 'layer').map(op => String(op[1])),
      changed: Object.entries(state()).filter(([k, v]) => before[k] !== v).map(([k, v]) => `${k}: ${before[k] || '-'} -> ${v || '-'}`),
      draft: draft && draft !== line && !('prompt' in step) ? draft : null,
      exited
    })
    // Close what the step opened and clear the draft, so the next step starts at an empty composer.
    for (let i = 0; i < 3 && app.overlays.length; i++) {
      tern.press('escape')
      await settle(gw)
    }
    app.stores.composer.set('')
  }
  if (!exited) app.quit()
  return effects
}

/** The app visibly answered: a transcript entry, an overlay or aside, a changed draft, session, theme, model or voice, or it quit. */
const answered = (e: Effect) => e.exited || e.entries.length > 0 || e.overlays.length > 0 || e.layers.length > 0 || e.native.length > 0 ||
  e.draft !== null || e.changed.length > 0

const journeys = [...new Set(features.map(f => f.journey))]
for (const journey of journeys) {
  describe(`army journey ${journey}`, () => {
    for (const feature of features.filter(f => f.journey === journey && DRIVES[f.id])) {
      it(`army drive ${feature.id}`, async () => {
        const steps = await drive(feature.id, DRIVES[feature.id] ?? [])
        const ok = steps.every(s => answered(s) && s.missing.length === 0)
        journal.push({ feature: feature.id, journey, ok, steps })
        for (const s of steps) {
          expect(s.missing, `${feature.id}: ${s.line}`).toEqual([])
          expect(answered(s), `${feature.id}: ${s.line} drew no answer: ${JSON.stringify(s)}`).toBe(true)
        }
      }, 60_000)
    }
  })
}

it('drives only inventory features', () => {
  const ids = new Set(features.map(f => f.id))
  expect(Object.keys(DRIVES).filter(id => !ids.has(id))).toEqual([])
})
