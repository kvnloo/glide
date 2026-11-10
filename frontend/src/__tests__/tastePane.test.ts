import { execFile } from 'node:child_process'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { openTastePane, tasteBoard } from '../wire/taste.js'

import { stub } from './fakes.js'

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_file: string, _args: string[], _options: unknown,
    callback: (error: null, result: { stdout: string }) => void) => callback(null, { stdout: '{"ok":{"block":42}}' }))
}))

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

const board = { url: 'http://127.0.0.1:8789/s/sketch-ab12/', title: 'Sketch' }

describe('Taste native pane adapter', () => {
  it('opens beside the exact current owner using argv, without a shell', async () => {
    vi.stubEnv('TERN_PANE', '17')
    expect(await openTastePane(tasteBoard(board))).toBe(42)
    expect(execFile).toHaveBeenCalledWith('tern', ['browser', JSON.stringify({
      op: 'open', owner: 17, url: board.url, how: 'beside'
    }), '--timeout', '15'], { timeout: 20_000, shell: false }, expect.any(Function))
  })

  it('cannot open on the desktop without a current pane', async () => {
    vi.stubEnv('TERN_PANE', '')
    await expect(openTastePane(board)).rejects.toThrow('local Tern pane')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('rejects an error response instead of inventing a pane receipt', async () => {
    vi.stubEnv('TERN_PANE', '17')
    vi.mocked(execFile).mockImplementationOnce(stub(stubReply))
    await expect(openTastePane(board)).rejects.toThrow('did not confirm')
  })

  it.each(['https://example.com/boards', 'file:///tmp/board', 'http://127.0.0.1:8789/private',
    'http://user:pass@127.0.0.1:8789/boards', 'http://localhost.evil/boards'])(
    'rejects unsafe board URL %s', (url: string) => {
      expect(() => tasteBoard({ ...board, url })).toThrow()
    })
})

function stubReply(...args: unknown[]) {
  const callback = args.at(-1)
  if (typeof callback === 'function') callback(null, { stdout: '{"error":{"message":"unavailable"}}' })
  return undefined
}
