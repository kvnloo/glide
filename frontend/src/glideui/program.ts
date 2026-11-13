// The OpenUI half of a Glide card. A program (a shipped default or one an agent wrote) goes through
// the packaged generation adapter's real lang-core parser and glide/v1 validation; bindGlide then
// fills its slot references from the host's GlideDoc. Programs never carry data.
import { glideModules, type GlideView } from '../wire/openui.js'

import type { GlideDoc, UiNode } from './library.js'

export type { GlideView }
export interface Glide {
  /** A shipped default program, compiled once per scope. */
  program(name: string, scope: string): GlideView
  /** An agent-written program; throws with the adapter's code when it is not valid glide/v1. */
  compile(source: string, scope: string): GlideView
  /** Pure and synchronous, so a card re-binds on every host update. Throws on a missing/mismatched slot. */
  bind(view: GlideView, doc: GlideDoc): UiNode
}

let loading: Promise<Glide> | undefined

async function load(): Promise<Glide> {
  const { adapter, bindGlide, programs } = await glideModules()
  const compiled = new Map<string, GlideView>()
  const compile = (source: string, scope: string) => adapter.compile(source, { scope }).view
  return {
    compile,
    program(name, scope) {
      const key = scope + '\0' + name
      let view = compiled.get(key)
      if (!view) {
        const source = programs.get(name)
        if (source === undefined) throw new Error(`No shipped glide program ${name}`)
        view = compile(source, scope)
        compiled.set(key, view)
      }
      return view
    },
    bind: bindGlide
  }
}

/** The packaged parser and binder, loaded once; a failed load is retried on the next call. */
export function glide(): Promise<Glide> {
  loading ??= load()
  loading.catch(() => { loading = undefined })
  return loading
}
