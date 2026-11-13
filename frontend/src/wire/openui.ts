// Runtime boundary to the original, packaged OpenUI preview experiment.
// The tracked source assets ship beside dist/entry.js with the plugin.
// Neither Hermes' pinned runtime nor a donor checkout supplies the validator.
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { readFile } from 'node:fs/promises'

import type { GlideDoc, UiNode } from '../glideui/library.js'
import type { VisualBundle } from '../visuals.js'

import { decodeJson, record } from './json.js'

/** Public exports of openui/openui-preview/src/bundle.mjs (reviewed donor). */
export interface OpenUiContract {
  readonly MAX_BYTES: number
  validateBundle(input: unknown): VisualBundle
  fingerprints(): Promise<unknown>
  assertCurrent(bundle: VisualBundle, scope: string, fingerprints: unknown): void
}

function isOpenUiContract(value: unknown): value is OpenUiContract {
  const module = record(value)

  return Boolean(
    module &&
      module['MAX_BYTES'] === 8 * 1024 * 1024 &&
      typeof module['validateBundle'] === 'function' &&
      typeof module['fingerprints'] === 'function' &&
      typeof module['assertCurrent'] === 'function'
  )
}

/**
 * Vitest executes src/wire/openui.ts; the production esbuild output executes
 * dist/entry.js. Both resolve the same tracked plugin-local source directory.
 * No environment variable, working directory or Hermes fork may redirect it.
 */
export function packagedOpenUiUrl(path: string): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const source = basename(here) === 'wire' && basename(dirname(here)) === 'src'
  const frontend = source ? resolve(here, '../..') : resolve(here, '..')

  return pathToFileURL(join(frontend, 'openui', path)).href
}
const packagedValidatorUrl = () => packagedOpenUiUrl('openui-preview/src/bundle.mjs')

/** Load the reviewed validator and its full on-disk fingerprint inputs. */
export async function openUiContract(): Promise<OpenUiContract> {
  let loaded: unknown

  try {
    loaded = await import(/* @vite-ignore */ packagedValidatorUrl())
  } catch {
    throw new Error('Packaged OpenUI preview validator or a required source asset is missing; reinstall the glide plugin.')
  }

  if (!isOpenUiContract(loaded)) {
    throw new Error('Unsupported packaged OpenUI preview validator exports.')
  }

  return loaded
}

/** A compiled glide/v1 program: slot references only, never data. */
export interface GlideView { readonly kind: 'glide-card'; readonly snapshotId: string; readonly parts: readonly unknown[] }
/** The packaged generation adapter (library 'glide'), its binder and the shipped default programs. */
export interface GlideModules {
  readonly adapter: { compile(source: string, context: { scope: string }): { readonly view: GlideView } }
  bindGlide(view: GlideView, doc: GlideDoc): UiNode
  readonly programs: ReadonlyMap<string, string>
}
const fn = (value: unknown, name: string) => typeof record(value)?.[name] === 'function'
function isAdapter(value: unknown): value is GlideModules['adapter'] { return fn(value, 'compile') }
function isGenerationModule(value: unknown): value is { createGenerationAdapter(options: { library: 'glide' }): Promise<unknown> } {
  return fn(value, 'createGenerationAdapter')
}
function isGlideModule(value: unknown): value is Pick<GlideModules, 'bindGlide'> { return fn(value, 'bindGlide') }

/** Load the packaged glide/v1 adapter (real lang-core parser), binder and default programs. */
export async function glideModules(): Promise<GlideModules> {
  // The adapter refuses to parse unless OpenUI's telemetry is off; opting out is always safe.
  process.env['OPENUI_TELEMETRY_DISABLED'] = '1'
  process.env['DO_NOT_TRACK'] = '1'
  const [generation, glide, text] = await Promise.all([
    import(/* @vite-ignore */ packagedOpenUiUrl('openui-generation/src/adapter.mjs')),
    import(/* @vite-ignore */ packagedOpenUiUrl('openui-generation/src/glide.mjs')),
    readFile(new URL(packagedOpenUiUrl('openui-generation/fixtures/glide-programs.json')), 'utf8')
  ])
  if (!isGenerationModule(generation) || !isGlideModule(glide)) throw new Error('Unsupported packaged OpenUI generation exports.')
  const adapter = await generation.createGenerationAdapter({ library: 'glide' })
  if (!isAdapter(adapter)) throw new Error('Unsupported packaged glide adapter.')
  const programs = new Map<string, string>()
  for (const [name, source] of Object.entries(record(decodeJson(text)) ?? {})) if (typeof source === 'string') programs.set(name, source)
  return { adapter, bindGlide: (view, doc) => glide.bindGlide(view, doc), programs }
}
