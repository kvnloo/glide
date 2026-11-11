// Real App + pinned Tern SDK; only the gateway is an owned, read-only stand-in.
import { EventEmitter } from 'node:events'
import { appendFileSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { connect } from '@stencil-hq/tern'
import { App } from '../../frontend/src/app/chat.js'

const root = process.env.FACTORY_PROOF_ROOT
if (!root) throw new Error('FACTORY_PROOF_ROOT is required')
const sid = 'synthetic-w1-proof'
const calls = []

class ProofGateway extends EventEmitter {
  isCanonical = true
  attached = true
  async request(method, params = {}) {
    const call = { at: Date.now(), method, params }
    calls.push(call)
    appendFileSync(join(root, 'gateway.jsonl'), JSON.stringify(call) + '\n')
    if (method === 'command.dispatch') {
      if (params.name !== 'factory' || params.arg !== 'json suggest {}' || params.session_id !== sid) {
        throw new Error('Proof gateway permits only scoped factory suggestions, never approval or rendering')
      }
      const mode = readFileSync(join(root, 'backend-mode'), 'utf8').trim()
      const output = execFileSync(process.env.FACTORY_PROOF_PYTHON || 'python3', [
        process.env.FACTORY_PROOF_ADAPTER, process.env.FACTORY_PROOF_PLUGIN, root, mode, sid
      ], { encoding: 'utf8', env: process.env })
      const answer = JSON.parse(output)
      appendFileSync(join(root, 'backend-answers.jsonl'), JSON.stringify({ at: Date.now(), mode, answer }) + '\n')
      return { output }
    }
    if (method === 'session.create' || method === 'session.resume') {
      return { session_id: sid, subscription_id: 'owned-w1-sub', messages: [],
        info: { stored_session_id: sid, profile_name: 'synthetic-proof', title: 'SYNTHETIC W1 proof. No human approval.', cwd: root } }
    }
    if (method === 'setup.status') return { provider_configured: true }
    if (method === 'gateway.capabilities') return { plugin_methods: [] }
    if (method === 'config.get') return params.key === 'full' ? { config: { display: {} } } : { value: null }
    if (method === 'commands.catalog') return { canon: {}, skills: {} }
    if (method === 'processes.list') return { processes: [] }
    if (method === 'agents.list') return { agents: [] }
    if (method === 'session.list') return { sessions: [] }
    if (method === 'session.detach' || method === 'session.set_thinking' || method === 'session.set_cwd') return {}
    // The non-factory startup reads match the App tests' empty gateway defaults.
    // Anything capable of writes or execution fails closed rather than silently succeeding.
    if (/^(prompt\.|slash\.|.*(?:approve|render|submit|execute|\.set|\.delete|\.create))/.test(method)) {
      throw new Error('Proof gateway refuses mutating method: ' + method)
    }
    return {}
  }
  drain() { queueMicrotask(() => this.emit('event', { type: 'gateway.ready', payload: {} })) }
  kill() {}
  holdAttach() {}
  settleAttach() {}
  hydrateSharedPrompts() {}
}

const tern = await connect({ app: 'hermes', features: ['edit', 'undo', 'send'], version: 'SYNTHETIC-W1-proof' })
if (!tern) throw new Error('Real Tern SDK handshake failed')
writeFileSync(join(root, 'caps.json'), JSON.stringify(tern.caps, null, 2))
if (!tern.caps.features.includes('aside')) throw new Error('This Tern does not support native aside')
const gw = new ProofGateway()
const app = new App(tern, gw, 'SYNTHETIC W1 proof, no approval', {
  settings: { load: () => ({ thoughts: false, jobCharts: false, tableCharts: 'off' }), save: () => { throw new Error('No settings writes in proof') } }
})
const report = () => {
  const node = app.stores.factory.node('layer.factory')
  const value = {
    synthetic: true, ready: app.session.ref.live === sid,
    factoryOpen: app.stores.factory.open, factory: node?.props ?? null,
    overlays: app.overlays.map(o => o.key), euiCards: app.eui.host.size,
    notices: app.transcript.entries.filter(e => e.kind === 'notice'),
    calls, caps: tern.caps
  }
  const path = join(root, 'app-state.json')
  writeFileSync(path + '.tmp', JSON.stringify(value, null, 2))
  renameSync(path + '.tmp', path)
}
let appCode
process.once('exit', code => {
  writeFileSync(join(root, 'app-exit.json'), JSON.stringify({ code, appCode: appCode ?? null }))
})
const running = app.run()
const heartbeat = setInterval(report, 100)
try {
  appCode = await running
  process.exitCode = appCode
} finally {
  clearInterval(heartbeat)
  report()
}
