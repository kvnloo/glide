// A finished God's Eye View tool call becomes a native card in the chat: published at once from the
// answer, then updated with the real app's globe once Tern's browser has rendered it.

import type { EuiCards } from '../eui/cards.js'
import type { EuiNativeHandle } from '../eui/host.js'
import type { ToolCall } from '../model.js'

import { record } from '../wire/json.js'
import { embedUrl, gevAnswer } from '../wire/gev.js'

import { gevCard, gevTitle, type GevCardState } from './card.js'
import { type Browser, captureGlobe, openGlobe, paneBlock, ternBrowser } from './globe.js'

export class GevCards {
  readonly #seen = new Set<string>()

  constructor(
    private readonly eui: () => EuiCards | undefined,
    private readonly notice: (text: string) => void,
    private readonly browser: Browser = ternBrowser,
    private readonly owner: () => number | undefined = paneBlock
  ) {}

  /** `call`'s card, once per finished call; anything that is not a GEV answer is left alone. */
  show(call: ToolCall | undefined): void {
    if (!call || call.outcome.kind !== 'done' || this.#seen.has(call.id)) return
    const answer = gevAnswer(call.name, call.result, call.resultText)
    const eui = this.eui()
    if (!answer || !eui) return
    this.#seen.add(call.id)
    const owner = this.owner()
    let state: GevCardState = { capturing: owner !== undefined, ...(owner === undefined ? { failed: 'no Tern pane' } : {}) }
    let handle: EuiNativeHandle | undefined
    const intent = async (detail: unknown) => {
      const action = record(detail)?.['action']
      if (action === 'open' && owner !== undefined) {
        await openGlobe(answer.url, owner, this.browser).catch(e => this.notice(`God's Eye View: ${String(e instanceof Error ? e.message : e)}`))
      }
    }
    const card = () => ({ kind: 'gev-' + answer.tool, app: "God's Eye View", title: gevTitle(answer.tool), ui: gevCard(answer, state) })
    try {
      handle = eui.host.publishNative(card(), intent)
    } catch {
      return
    }
    if (owner === undefined) return
    void captureGlobe(embedUrl(answer.url), owner, this.browser).then(
      png => { state = { capturing: false, png } },
      (e: unknown) => { state = { capturing: false, failed: e instanceof Error ? e.message : String(e) } }
    ).then(() => {
      try { handle?.update(card(), intent) } catch { /* the session moved on */ }
    })
  }
}
