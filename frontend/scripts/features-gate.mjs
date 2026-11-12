#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const inventoryDirectory = 'frontend/e2e'
const inventoryPath = `${inventoryDirectory}/features.json`
const inventoryFile = name => name === 'features.json' || /^features\..+\.json$/.test(name)
const journeyPath = 'frontend/e2e/JOURNEYS.md'
const surfaces = new Set(['slash', 'shortcut', 'pane', 'card', 'voice', 'cli', 'gateway'])
const identifier = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const testFile = /(?:^|\/)(?:[^/]+\.(?:test|spec)\.[cm]?[jt]sx?|test_[^/]+\.py|[^/]+_test\.py)$/
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0

function requireThat(condition, message) {
  if (!condition) throw new Error(message)
}

function strings(value, field) {
  requireThat(Array.isArray(value) && value.every(text), `${field} must be an array of nonempty strings`)
  requireThat(new Set(value).size === value.length, `${field} contains duplicates`)
}

function parseInventory(raw, label) {
  requireThat(object(raw) && Array.isArray(raw.features) && raw.features.length > 0, `${label}: features must be a nonempty array`)
  const ids = new Set()
  for (const row of raw.features) {
    requireThat(object(row), `${label}: feature must be an object`)
    for (const field of ['id', 'title', 'entry', 'journey', 'expect']) {
      requireThat(text(row[field]), `${label}: ${field} must be nonempty text`)
    }
    requireThat(identifier.test(row.id), `${label}: invalid feature id: ${row.id}`)
    requireThat(!ids.has(row.id), `${label}: duplicate feature id: ${row.id}`)
    ids.add(row.id)
    requireThat(surfaces.has(row.surface), `${row.id}: invalid surface`)
    strings(row.tests, `${row.id}.tests`)
    requireThat(Array.isArray(row.army), `${row.id}.army must be an array`)
  }
  const removed = raw.removed === undefined ? [] : raw.removed
  requireThat(Array.isArray(removed), `${label}: removed must be an array`)
  const reasons = new Map()
  for (const row of removed) {
    requireThat(object(row) && text(row.id) && identifier.test(row.id) && text(row.reason), `${label}: removed entries need an id and reason`)
    requireThat(!reasons.has(row.id), `${label}: duplicate removed id: ${row.id}`)
    reasons.set(row.id, row.reason)
  }
  return { features: raw.features, reasons }
}

function mergeInventories(entries) {
  const features = []
  const ids = new Set()
  const reasons = new Map()
  for (const [label, raw] of entries) {
    const inventory = parseInventory(raw, label)
    for (const row of inventory.features) {
      requireThat(!ids.has(row.id), `${label}: duplicate feature id: ${row.id}`)
      ids.add(row.id)
      features.push(row)
    }
    for (const [id, reason] of inventory.reasons) {
      requireThat(!reasons.has(id), `${label}: duplicate removed id: ${id}`)
      reasons.set(id, reason)
    }
  }
  return { features, reasons }
}

function currentInventory(root) {
  const extensions = readdirSync(join(root, inventoryDirectory))
    .filter(name => name !== 'features.json' && inventoryFile(name)).sort()
  const paths = [inventoryPath, ...extensions.map(name => `${inventoryDirectory}/${name}`)]
  return mergeInventories(paths.map(path => [path, json(join(root, path))]))
}

function json(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`${file}: ${error.message}`)
  }
}

function journeys(source, features) {
  const map = new Map()
  let current
  for (const line of source.split(/\r?\n/)) {
    const heading = /^## ([a-z][a-z0-9-]*)\s*$/.exec(line)
    if (heading) {
      current = heading[1]
      requireThat(!map.has(current), `duplicate journey: ${current}`)
      map.set(current, [])
    } else {
      const item = /^\d+\. `([a-z][a-z0-9-]*)`(?:\s|$)/.exec(line)
      if (item) {
        requireThat(current !== undefined, 'feature listed before a journey heading')
        map.get(current).push(item[1])
      }
    }
  }
  for (const row of features) requireThat(map.has(row.journey), `${row.id}: unknown journey: ${row.journey}`)
  const byId = new Map(features.map(row => [row.id, row]))
  const listed = new Set()
  for (const [id, members] of map) {
    requireThat(members.length > 0, `journey has no features: ${id}`)
    for (const member of members) {
      requireThat(byId.has(member), `unknown journey feature: ${member}`)
      requireThat(byId.get(member).journey === id, `journey mismatch: ${member}`)
      requireThat(!listed.has(member), `duplicate journey feature: ${member}`)
      listed.add(member)
    }
  }
  for (const row of features) requireThat(listed.has(row.id), `feature missing from journey: ${row.id}`)
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd()
}

function testReferences(root) {
  const refs = new Set()
  const paths = git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')
  for (const path of new Set(paths.filter(path => testFile.test(path)))) {
    const file = join(root, path)
    let source
    try {
      if (!statSync(file).isFile()) continue
      source = readFileSync(file, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    refs.add(path)
    if (path.endsWith('.py')) {
      for (const match of source.matchAll(/^\s*(?:async\s+)?def\s+(test_\w+)\s*\(/gm)) refs.add(match[1])
    } else {
      // Titles are declarations, not arbitrary matching text in docs or snapshots.
      const declarations = /^\s*(?:it|test)(?:\.(?:only|skip|todo|concurrent|sequential|fails))*\(\s*(['"`])((?:\\.|(?!\1)[^\\\r\n])*)\1/gm
      for (const match of source.matchAll(declarations)) {
        if (match[1] === '`' && match[2].includes('${')) continue
        refs.add(match[2].replace(/\\(['"`\\])/g, '$1'))
      }
    }
  }
  return refs
}

function compareBase(root, baseRef, current) {
  try {
    git(root, 'rev-parse', '--verify', `${baseRef}^{commit}`)
  } catch {
    throw new Error(`cannot resolve base ref: ${baseRef}; fetch it before running the gate`)
  }
  const paths = git(root, 'ls-tree', '-r', '--name-only', '-z', baseRef, '--', inventoryDirectory)
    .split('\0').filter(path => path.startsWith(`${inventoryDirectory}/`) && inventoryFile(path.slice(inventoryDirectory.length + 1))).sort()
  if (!paths.length) return
  let base
  try {
    base = mergeInventories(paths.map(path => [path, JSON.parse(git(root, 'show', `${baseRef}:${path}`))]))
  } catch (error) {
    throw new Error(`base inventory: ${error.message}`)
  }
  const byId = new Map(current.features.map(row => [row.id, row]))
  for (const previous of base.features) {
    const row = byId.get(previous.id)
    if (!row) {
      requireThat(current.reasons.has(previous.id), `feature removed without reason: ${previous.id}`)
    } else {
      for (const reference of previous.tests) {
        requireThat(row.tests.includes(reference) || current.reasons.has(previous.id), `test reference removed without reason: ${previous.id}: ${reference}`)
      }
    }
  }
  const untested = features => features.filter(row => row.tests.length === 0).length
  const before = untested(base.features)
  const after = untested(current.features)
  requireThat(after <= before, `features with zero tests increased: ${before} -> ${after}`)
}

function armyPasses(directory, sha, features) {
  const known = new Set(features.map(row => row.id))
  const passed = new Set()
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      requireThat(!entry.isSymbolicLink(), `receipt symlinks are not supported: ${path}`)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        const raw = json(path)
        const receipts = Array.isArray(raw) ? raw : [raw]
        for (const receipt of receipts) {
          requireThat(object(receipt) && text(receipt.feature) && /^[a-f0-9]{40}$/.test(receipt.sha) && ['pass', 'fail'].includes(receipt.verdict), `invalid receipt: ${path}`)
          requireThat(known.has(receipt.feature), `receipt names unknown feature: ${receipt.feature}`)
          if (receipt.sha === sha && receipt.verdict === 'pass') passed.add(receipt.feature)
        }
      }
    }
  }
  visit(directory)
  return passed
}

function options(args) {
  const result = { root: resolve(dirname(fileURLToPath(import.meta.url)), '../..'), strict: false, baseRef: 'origin/main' }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--strict') result.strict = true
    else if (['--root', '--base-ref', '--receipts'].includes(arg)) {
      const value = args[++i]
      requireThat(text(value) && !value.startsWith('--'), `${arg} needs a value`)
      if (arg === '--root') result.root = resolve(value)
      else if (arg === '--base-ref') result.baseRef = value
      else result.receipts = resolve(value)
    } else throw new Error(`unknown argument: ${arg}`)
  }
  requireThat(!result.strict || result.receipts, '--strict requires --receipts <dir>')
  return result
}

try {
  const { root, strict, baseRef, receipts } = options(process.argv.slice(2))
  const inventory = currentInventory(root)
  journeys(readFileSync(join(root, journeyPath), 'utf8'), inventory.features)
  const references = testReferences(root)
  for (const row of inventory.features) {
    for (const reference of row.tests) requireThat(references.has(reference), `${row.id}: test reference not found: ${reference}`)
  }
  compareBase(root, baseRef, inventory)
  const passed = receipts ? armyPasses(receipts, git(root, 'rev-parse', 'HEAD'), inventory.features) : new Set()
  console.log('features | with tests | with army pass')
  console.log(`${inventory.features.length} | ${inventory.features.filter(row => row.tests.length > 0).length} | ${passed.size}`)
  if (strict) {
    const missing = inventory.features.filter(row => !passed.has(row.id)).map(row => row.id)
    requireThat(missing.length === 0, `missing army pass: ${missing.join(', ')}`)
  }
} catch (error) {
  console.error(`features-gate: ${error.message}`)
  process.exitCode = 1
}
