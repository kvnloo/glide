import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { record } from './json.js'

export interface TasteBoard { url: string; title: string }

export function tasteBoard(raw: unknown): TasteBoard {
  const value = record(raw)
  const url = value?.['url']
  const title = value?.['title']
  if (typeof url !== 'string' || typeof title !== 'string') {
    throw new Error('Invalid Taste Atlas board reply')
  }
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      !/^\/(?:boards|s\/[a-z0-9-]{4,40}\/)$/.test(parsed.pathname)) {
    throw new Error('Taste Atlas requires a loopback board URL')
  }
  return { url, title }
}

/** A user-requested local board, not the agent browser-control/drive backend. */
export async function openTastePane(board: TasteBoard): Promise<number> {
  const owner = process.env['TERN_PANE'] ?? ''
  if (!/^[1-9][0-9]*$/.test(owner) || !Number.isSafeInteger(Number(owner))) {
    throw new Error('Taste pane needs a local Tern pane. Open the board URL in your browser instead.')
  }
  const { stdout } = await promisify(execFile)('tern', ['browser', JSON.stringify({
    op: 'open', owner: Number(owner), url: board.url, how: 'beside'
  }), '--timeout', '15'], { timeout: 20_000, shell: false })
  const result = record(record(stdout)?.['ok'])
  const block = result?.['block']
  if (typeof block !== 'number' || !Number.isSafeInteger(block) || block <= 0) {
    throw new Error('Tern did not confirm opening the Taste pane')
  }
  return block
}
