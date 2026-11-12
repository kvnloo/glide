#!/usr/bin/env node
// Reapply compatibility fixes without fetching or changing the upstream kit pin.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { adaptFleetJs, scopeCss } from '../../frontend/scripts/vendor-ephemeral-ui.mjs'

for (const name of ['kit.css', 'kit.js']) {
  const path = fileURLToPath(new URL('../../frontend/src/vendor/ephemeral-ui/' + name, import.meta.url))
  const before = readFileSync(path, 'utf8')
  const adapt = name === 'kit.js' ? adaptFleetJs : css => {
    const end = css.indexOf('\n') + 1
    return css.slice(0, end) + scopeCss(css.slice(end))
  }
  const after = adapt(before)
  assert.equal(adapt(after), after, 'Kit adaptation must be idempotent')
  if (process.argv.includes('--check')) assert.equal(before, after, 'Run node glide/tools/adapt-eui-kit.mjs')
  else writeFileSync(path, after)
}
