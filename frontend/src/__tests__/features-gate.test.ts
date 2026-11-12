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
    { features: [feature()], removed: null },
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

  it('merges generic extension inventories into counts and journeys', () => {
    inventory()
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), journey: 'intel' }] }))
    write('frontend/e2e/features.other.json', JSON.stringify({ features: [feature('other')] }))
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `other`\n\n## intel\n1. `intel`\n')
    expect(run()).toEqual({ exit: 0, output: expect.stringContaining('3 | 3 | 0') })
  })

  it.each(['features.json', 'features.other.json'])('rejects duplicate feature ids across an extension and %s', name => {
    write(`frontend/e2e/${name}`, JSON.stringify({ features: [feature()] }))
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature()] }))
    expect(run().output).toContain('duplicate feature id: chat')
  })

  it('rejects duplicate removal reasons across inventories', () => {
    inventory([feature()], [{ id: 'old', reason: 'Removed old entry.' }])
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature('intel')], removed: [{ id: 'old', reason: 'Duplicate reason.' }] }))
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `intel`\n')
    expect(run().output).toContain('duplicate removed id: old')
  })

  it.each([
    null,
    { features: [] },
    { features: [feature('intel')], removed: [{ id: 'old', reason: '' }] }
  ])('validates every extension inventory %#', value => {
    write('frontend/e2e/features.intel.json', JSON.stringify(value))
    expect(run().exit).toBe(1)
  })

  it('validates extension journeys and test references in the merged inventory', () => {
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), journey: 'intel' }] }))
    expect(run().output).toContain('unknown journey: intel')
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n\n## intel\n1. `intel`\n')
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), journey: 'intel', tests: ['missing test title'] }] }))
    expect(run().output).toContain('intel: test reference not found')
  })

  it('requires a reason for deletion of an entire extension that exists only in the base', () => {
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature('intel')] }))
    base()
    rmSync(join(root, 'frontend/e2e/features.intel.json'))
    expect(run().output).toContain('feature removed without reason: intel')
    inventory([feature()], [{ id: 'intel', reason: 'Removed the old extension.' }])
    expect(run().exit).toBe(0)
  })

  it('compares extension test references to the base without weakening the zero-test count', () => {
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), tests: ['test_chat_reply', 'renders a chat reply'] }] }))
    base()
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `intel`\n')
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), tests: ['test_chat_reply'] }] }))
    expect(run().output).toContain('test reference removed without reason: intel')
    inventory([feature()], [{ id: 'intel', reason: 'Use the remaining integration coverage.' }])
    expect(run().exit).toBe(0)
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [{ ...feature('intel'), tests: [] }] }))
    expect(run().output).toContain('features with zero tests increased: 0 -> 1')
  })

  it('allows a covered feature to move between inventories without being counted as removed', () => {
    inventory([feature(), feature('intel')])
    base()
    inventory()
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature('intel')] }))
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `intel`\n')
    expect(run()).toEqual({ exit: 0, output: expect.stringContaining('2 | 2 | 0') })
  })

  it('compares a base extension even when the base has no primary inventory', () => {
    rmSync(join(root, 'frontend/e2e/features.json'))
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature('intel')] }))
    base()
    rmSync(join(root, 'frontend/e2e/features.intel.json'))
    inventory()
    expect(run().output).toContain('feature removed without reason: intel')
  })

  it('rejects malformed and duplicate inventories in the base extensions', () => {
    write('frontend/e2e/features.intel.json', '{broken')
    base()
    rmSync(join(root, 'frontend/e2e/features.intel.json'))
    expect(run().output).toContain('base inventory')
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature()] }))
    base()
    rmSync(join(root, 'frontend/e2e/features.intel.json'))
    expect(run().output).toContain('duplicate feature id: chat')
  })

  it('requires strict receipts for extension features as well as primary features', () => {
    write('frontend/e2e/features.intel.json', JSON.stringify({ features: [feature('intel')] }))
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `intel`\n')
    const sha = base()
    write('receipts/results.json', JSON.stringify([{ feature: 'chat', sha, verdict: 'pass' }]))
    expect(run('--strict', '--receipts', join(root, 'receipts')).output).toContain('missing army pass: intel')
    write('receipts/results.json', JSON.stringify([{ feature: 'chat', sha, verdict: 'pass' }, { feature: 'intel', sha, verdict: 'pass' }]))
    expect(run('--strict', '--receipts', join(root, 'receipts'))).toEqual({ exit: 0, output: expect.stringContaining('2 | 2 | 2') })
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

  it('requires a pass for every feature and invalidates receipts after a new commit', () => {
    inventory([feature(), feature('second')])
    write('frontend/e2e/JOURNEYS.md', '## first-chat\n1. `chat`\n2. `second`\n')
    const sha = base()
    const first = { feature: 'chat', sha, verdict: 'pass' }
    write('receipts/results.json', JSON.stringify([first]))
    expect(run('--strict', '--receipts', join(root, 'receipts')).output).toContain('missing army pass: second')
    write('receipts/results.json', JSON.stringify([first, { feature: 'second', sha, verdict: 'pass' }]))
    expect(run('--strict', '--receipts', join(root, 'receipts')).exit).toBe(0)
    base()
    expect(run('--strict', '--receipts', join(root, 'receipts')).output).toContain('missing army pass: chat, second')
  })

  it.each([['--receipts'], ['--base-ref'], ['--root'], ['--typo'], ['--strict=maybe']])('rejects invalid option %s', arg => {
    expect(run(arg).exit).toBe(1)
  })
})
