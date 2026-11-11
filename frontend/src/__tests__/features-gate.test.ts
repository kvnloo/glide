import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const script = fileURLToPath(new URL('../../scripts/features-gate.mjs', import.meta.url))
const feature = (id = 'chat') => ({
  id, title: 'Chat', surface: 'slash', entry: '/chat', journey: 'first-chat',
  expect: 'Shows a reply', tests: ['frontend/src/__tests__/chat.test.ts'], army: []
})
let root: string

function write(path: string, contents: string) {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
}

function inventory(features: unknown[] = [feature()], removed: unknown[] = []) {
  write('frontend/e2e/features.json', JSON.stringify({ features, removed }))
}

function git(...args: string[]) {
  const result = spawnSync('git', args, {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' }
  })
  expect(result.status, result.stderr).toBe(0)
  return result.stdout.trim()
}

function base() {
  git('add', '.')
  git('-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture')
  git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  return git('rev-parse', 'HEAD')
}

function run(...args: string[]) {
  const result = spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' })
  return { exit: result.status, output: result.stdout + result.stderr }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'glide-features-'))
  git('init', '-q')
  write('frontend/src/__tests__/chat.test.ts', "import { it } from 'vitest'\nit('renders a chat reply', () => {})\n")
  write('tests/test_chat.py', 'def test_chat_reply():\n    pass\n')
  write('frontend/e2e/JOURNEYS.md', '# Journeys\n\n## first-chat\nStart a chat.\n\n1. `chat`\n')
  base()
  inventory()
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('feature gate CLI', () => {
  it('checks file paths, Vitest titles and pytest names without a base inventory', () => {
    inventory([{ ...feature(), tests: ['frontend/src/__tests__/chat.test.ts', 'renders a chat reply', 'test_chat_reply'] }])
    expect(run()).toEqual({ exit: 0, output: expect.stringContaining('features | with tests | with army pass\n1 | 1 | 0') })
  })

  it.each([
    null,
    { features: [] },
    { features: [{}] },
    { features: [{ ...feature(), surface: 'unknown' }] },
    { features: [{ ...feature(), title: ' ' }] },
    { features: [{ ...feature(), id: '../chat' }] },
    { features: [{ ...feature(), army: 'pass' }] },
    { features: [{ ...feature(), tests: [42] }] },
    { features: [{ ...feature(), tests: ['test_chat_reply', 'test_chat_reply'] }] },
    { features: [feature(), feature()] },
    { features: [feature()], removed: [{ id: 'old', reason: '' }] }
  ])('rejects malformed inventory %#', data => {
    write('frontend/e2e/features.json', JSON.stringify(data))
    expect(run().exit).toBe(1)
  })

  it('rejects an unknown journey and missing, unknown or duplicate journey members', () => {
    inventory([{ ...feature(), journey: 'missing' }])
    expect(run().output).toContain('unknown journey')
    inventory()
    for (const body of ['', '1. `unknown`', '1. `chat`\n2. `chat`']) {
      write('frontend/e2e/JOURNEYS.md', `# Journeys\n\n## first-chat\n${body}\n`)
      expect(run().exit).toBe(1)
    }
  })

  it('rejects missing test files, arbitrary source files and prose posing as a test title', () => {
    write('frontend/src/chat.ts', 'export const chat = true\n')
    write('tests/notes.md', 'a nonexistent test\n')
    for (const reference of ['frontend/src/__tests__/missing.test.ts', 'frontend/src/chat.ts', 'a nonexistent test']) {
      inventory([{ ...feature(), tests: [reference] }])
      expect(run().output).toContain('test reference not found')
    }
  })

  it('rejects a deleted test even when its tracked filename still exists in the Git index', () => {
    base()
    rmSync(join(root, 'frontend/src/__tests__/chat.test.ts'))
    expect(run().output).toContain('test reference not found')
  })

  it('accepts an unchanged base and new covered features', () => {
    base()
    expect(run().exit).toBe(0)
    inventory([feature(), feature('second')])
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `second`\n')
    expect(run().exit).toBe(0)
  })

  it('rejects feature deletion without a reason and permits an explicit removal', () => {
    inventory([feature(), feature('old')])
    base()
    inventory()
    expect(run().output).toContain('feature removed without reason: old')
    inventory([feature()], [{ id: 'old', reason: 'The old chat entry was replaced.' }])
    expect(run().exit).toBe(0)
  })

  it('rejects a lost test reference unless its feature has an explicit removal reason', () => {
    inventory([{ ...feature(), tests: ['test_chat_reply', 'renders a chat reply'] }])
    base()
    inventory([{ ...feature(), tests: ['test_chat_reply'] }])
    expect(run().output).toContain('test reference removed without reason: chat')
    inventory([{ ...feature(), tests: ['test_chat_reply'] }], [{ id: 'chat', reason: 'The Python integration now covers this entry.' }])
    expect(run().exit).toBe(0)
  })

  it('never allows the count of untested features to grow, even with removal reasons', () => {
    base()
    inventory([{ ...feature(), tests: [] }], [{ id: 'chat', reason: 'Removing coverage is not a waiver.' }])
    expect(run().output).toContain('features with zero tests increased: 0 -> 1')
  })

  it('rejects an invalid base ref rather than silently skipping the comparison', () => {
    base()
    expect(run('--base-ref', 'does-not-exist').output).toContain('cannot resolve base ref')
  })

  it('skips only an absent base inventory and rejects a corrupt existing base inventory', () => {
    write('frontend/e2e/features.json', '{broken')
    base()
    inventory()
    expect(run().output).toContain('base inventory')
  })

  it('requires a receipts directory in strict mode and rejects empty or malformed evidence', () => {
    base()
    expect(run('--strict').exit).toBe(1)
    mkdirSync(join(root, 'receipts'))
    expect(run('--strict', '--receipts', join(root, 'receipts')).output).toContain('missing army pass: chat')
    write('receipts/bad.json', '{broken')
    expect(run('--strict', '--receipts', join(root, 'receipts')).output).toContain('receipt')
  })

  it('rejects stale, failed and unknown-feature receipts and ignores inline army claims', () => {
    const sha = base()
    inventory([{ ...feature(), army: [{ feature: 'chat', sha, verdict: 'pass' }] }])
    for (const receipt of [
      { feature: 'chat', sha: '0'.repeat(40), verdict: 'pass' },
      { feature: 'chat', sha, verdict: 'fail' },
      { feature: 'other', sha, verdict: 'pass' }
    ]) {
      write('receipts/result.json', JSON.stringify(receipt))
      expect(run('--strict', '--receipts', join(root, 'receipts')).exit).toBe(1)
    }
  })

  it('counts only exact-HEAD passes from receipt files, including nested arrays', () => {
    const sha = base()
    write('receipts/one.json', JSON.stringify({ feature: 'chat', sha: '0'.repeat(40), verdict: 'pass' }))
    write('receipts/runner/two.json', JSON.stringify([{ feature: 'chat', sha, verdict: 'pass' }]))
    const result = run('--strict', '--receipts', join(root, 'receipts'))
    expect(result.exit, result.output).toBe(0)
    expect(result.output).toContain('1 | 1 | 1')
  })

  it.each([['--receipts'], ['--base-ref'], ['--root'], ['--typo'], ['--strict=maybe']])('rejects invalid option %s', arg => {
    expect(run(arg).exit).toBe(1)
  })
})
