// Build the source kit in a temporary test directory, never over the tracked vendor/PIN.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

export async function fleetKitFixture(source, out) {
  source = resolve(source)
  await mkdir(join(out, 'data'), { recursive: true })
  const from = file => JSON.stringify(join(source, 'js', file))
  const contents = `
    import { KINDS_FLEET as KINDS } from ${from('kinds-fleet.js')};
    import { rng, Run, motion } from ${from('motion.js')};
    import { loadApps, catalog } from ${from('shell.js')};
    import { state as theme } from ${from('themes.js')};
    globalThis.__EUI = { KINDS, rng, Run, motion, loadApps, catalog, theme };
  `
  const result = await build({ stdin: { contents, resolveDir: source }, bundle: true, format: 'iife', write: false })
  await writeFile(join(out, 'kit.js'), result.outputFiles[0].text)
  await writeFile(join(out, 'kit.css'), await readFile(join(source, 'fleet.css')))
  const kinds = ['fleet-hosts', 'fleet-portfolio', 'fleet-factory']
  await writeFile(join(out, 'PIN.json'), JSON.stringify({ kinds }))
  for (const file of ['apps.json', 'themes.json']) await copyFile(join(source, 'data', file), join(out, 'data', file))
  const examples = await import(pathToFileURL(join(source, 'js/fleet-data.js')).href)
  const { HOSTS, PORTFOLIOS, FACTORY } = structuredClone({ HOSTS: examples.HOSTS, PORTFOLIOS: examples.PORTFOLIOS, FACTORY: examples.FACTORY })
  // Match the collector's globally scoped product ids, keeping the authored examples synthetic.
  for (const [key, portfolio] of Object.entries(PORTFOLIOS)) {
    for (const product of portfolio.products) {
      product.id = `${key}:${product.id}`
      for (const feature of product.features) for (const task of feature.tasks) task.url = `https://example.test/task/${task.id}`
    }
    for (const shared of portfolio.shared) shared.owner = `${key}:${shared.owner}`
  }
  for (const node of FACTORY.nodes) node.url = `https://example.test/node/${node.id}`
  const at = '2026-11-11T00:00:00Z'
  const docs = [
    { kind: kinds[0], app: 'k3s', data: { at, hosts: HOSTS } },
    { kind: kinds[1], app: 'dash', data: { at, portfolios: PORTFOLIOS } },
    { kind: kinds[2], app: 'aodl', data: { at, ...FACTORY } }
  ]
  await writeFile(join(out, 'fixtures.json'), JSON.stringify(docs))
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: fleet-kit-fixture.mjs SOURCE OUTPUT')
  await fleetKitFixture(process.argv[2], process.argv[3])
}
