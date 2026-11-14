// Synthetic gateway, real App and real SDK. Driven only through this proof's owned input file.
import { EventEmitter } from 'node:events'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { connect } from '@stencil-hq/tern'
import { App } from '../../frontend/src/app/chat.js'
import { REQUIRED_CAPABILITIES } from '../../frontend/src/hermes/requirements.js'

const root = process.env.WORK_TREE_PROOF
if (!root) throw new Error('WORK_TREE_PROOF is required')
const sid = 'synthetic-work-tree'
class Gateway extends EventEmitter {
  attached = true
  isCanonical = true
  async request(method, p = {}) {
    if (method === 'session.create' || method === 'session.resume') return { session_id: sid, subscription_id: 'proof', messages: [], info: { stored_session_id: sid, title: 'SAMPLE · work tree', cwd: '/sample/atlas', terminal_backend: 'local' } }
    if (method === 'runtime.describe') return { capabilities: [...REQUIRED_CAPABILITIES] }
    if (method === 'setup.status') return { provider_configured: true }
    if (method === 'gateway.capabilities') return { plugin_methods: [] }
    if (method === 'config.get') return p.key === 'full' ? { config: { display: {} } } : { value: null }
    if (method === 'commands.catalog') return { canon: {}, skills: {} }
    if (method === 'agents.list') return { agents: [] }
    if (method === 'processes.list') return { processes: [] }
    if (method === 'session.list') return { sessions: [] }
    if (method.startsWith('prompt.')) throw new Error('Proof does not send model requests')
    return {}
  }
  drain() { queueMicrotask(() => this.emit('event', { type: 'gateway.ready', payload: {} })) }
  kill() {}
  holdAttach() {}
  settleAttach() {}
  hydrateSharedPrompts() {}
}
const tern = await connect({ app: 'hermes', features: ['edit', 'undo', 'send'], version: 'SAMPLE-work-tree' })
if (!tern) throw new Error('SDK handshake failed')
const gw = new Gateway()
const app = new App(tern, gw, 'SAMPLE', { settings: { load: () => ({ theme: 'dash', thoughts: false, jobCharts: false, tableCharts: 'off' }), save: () => { throw new Error('No settings writes') } } })
process.once('SIGTERM', () => app.quit())
const event = (type, payload) => gw.emit('event', { type, session_id: sid, payload })
let sequence = 0
const heartbeat = setInterval(() => {
  let input
  try { input = JSON.parse(readFileSync(join(root, 'input.json'), 'utf8')) } catch { /* input has not arrived */ }
  if (input && input.sequence > sequence && app.session.ref.live === sid) {
    sequence = input.sequence
    if (input.action === 'start') {
      app.transcript.user({ text: 'Add search; test the keyboard flow', at: Date.now() })
      event('message.start', {})
      event('todo.updated', { todos: [{ id: 'feature', content: 'Search', status: 'in_progress' }, { id: 'ui', parent: 'feature', content: 'Build search input', status: 'in_progress' }, { id: 'keys', parent: 'feature', content: 'Verify keyboard flow', status: 'pending' }] })
      event('tool.start', { name: 'read_file', tool_id: 'read', args: { path: '/sample/atlas/src/search.ts' } })
      event('tool.complete', { name: 'read_file', tool_id: 'read', result: { content: 'SAMPLE', total_lines: 1 } })
    } else if (input.action === 'edit') {
      event('tool.start', { name: 'patch', tool_id: 'edit', args: { path: '/sample/atlas/src/search.ts', old_string: 'old', new_string: 'new' } })
      event('tool.start', { name: 'write_file', tool_id: 'create', args: { path: '/sample/atlas/src/search.test.ts', content: 'SAMPLE' } })
    } else if (input.action === 'done') {
      event('tool.complete', { name: 'patch', tool_id: 'edit', result: { success: true } })
      event('tool.complete', { name: 'write_file', tool_id: 'create', result: { success: true, files_created: ['/sample/atlas/src/search.test.ts'] } })
      event('todo.updated', { todos: [{ id: 'feature', content: 'Search', status: 'completed' }, { id: 'ui', parent: 'feature', content: 'Build search input', status: 'completed' }, { id: 'keys', parent: 'feature', content: 'Verify keyboard flow', status: 'completed' }] })
      event('message.complete', { status: 'complete', text: 'Search and keyboard flow verified. SAMPLE receipt.' })
    } else if (input.action === 'reset') {
      app.transcript.reset({ session: 'other', usage: undefined })
    } else if (input.action === 'quit') {
      app.quit()
    }
    app.changed()
  }
  writeFileSync(join(root, 'state.json'), JSON.stringify({ pid: process.pid, ready: app.session.ref.live === sid, sequence, scope: app.stores.workTree.scope, entries: app.transcript.entries }))
}, 100)
try { process.exitCode = await app.run() } finally { clearInterval(heartbeat); writeFileSync(join(root, 'exit.json'), JSON.stringify({ code: process.exitCode })) }
