// Same node/JSX settings as frontend/scripts/build.mjs, for the production-popup verifier.
import { build } from '../../frontend/node_modules/esbuild/lib/main.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const outfile = resolve(root, '.hermes-agent/council-build/native.mjs')
await build({
  absWorkingDir: resolve(root, 'frontend'),
  entryPoints: [resolve(root, 'glide/tools/council-native.mts')],
  nodePaths: [resolve(root, 'frontend/node_modules')],
  bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile,
  jsx: 'automatic', jsxImportSource: '@stencil-hq/tern', preserveSymlinks: true,
  loader: { '.png': 'binary' },
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  logLevel: 'warning'
})
console.log(outfile)
