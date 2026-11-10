// Run only in an owned isolated Tern display with the existing Atlas server.
// From the repo root: GLIDE_TASTE_VERIFY_ISOLATED=1 bun glide/tools/verify-taste.ts
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { decodeJson, record } from '../../frontend/src/wire/json.js'
import { openTastePane, tasteBoard } from '../frontend/taste.js'

assert.equal(process.env['GLIDE_TASTE_VERIFY_ISOLATED'], '1', 'An owned isolated Tern display is required')
const source = process.env['GLIDE_SOURCE'] ?? fileURLToPath(new URL('../', import.meta.url))
const execute = promisify(execFile)
const home = await mkdtemp(join(tmpdir(), 'glide-taste-verify-'))
let block: number | undefined
try {
  const python = `
import importlib.util, pathlib, sys
root = pathlib.Path(sys.argv[1])
spec = importlib.util.spec_from_file_location('glide_verify', root / '__init__.py', submodule_search_locations=[str(root)])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
from glide_verify import core
print(core.command('json taste {}', session_id='isolated-taste-verification'))
`
  const result = await execute(process.env['HERMES_PYTHON'] ?? 'python3', ['-c', python, source], {
    env: { ...process.env, HERMES_HOME: home }, timeout: 30_000
  })
  const board = tasteBoard(decodeJson(result.stdout))
  assert.deepEqual(await readdir(home), [], 'Taste must not enable memory or write profile data')
  block = await openTastePane(board)
  let loaded = false
  for (let i = 0; i < 40; i++) {
    const { stdout } = await execute('tern', ['browser', JSON.stringify({ op: 'state', block }), '--timeout', '5'])
    const state = record(record(stdout)?.['ok'])
    if (state?.['loading'] === false && state['url'] === board.url && state['error'] === null) {
      assert.equal(state['shown'], true)
      assert.ok(Number(state['width']) > 0)
      assert.ok(Number(state['height']) > 0)
      loaded = true
      break
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert.ok(loaded, 'The actual native browser must finish loading the board URL')
  console.log(JSON.stringify({ ok: true, native_browser_loaded: true, profile_unchanged: true, block }))
} finally {
  if (block !== undefined) await execute('tern', ['browser', JSON.stringify({ op: 'close', block }), '--timeout', '5'])
  await rm(home, { recursive: true, force: true })
}
