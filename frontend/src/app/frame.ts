// One frame of the pane, its steps in a fixed order: a pill that left hands the keys back
// (Hud.prune), the completion list follows the composer, the surface gets the whole view (the
// dock from dockModel(), the layers, the transcript), and then the caret moves where it belongs,
// sent only when that changed. Every step but those three only reads.

import type { FileContext } from '../artifacts/links.js'
import type { GatewayClient } from '@hermes/shared/gateway-client'
import type { JSX } from '@stencil-hq/tern'

import type { FactoryPane } from '../chrome/factory.js'
import type { Hud } from '../chrome/hud.js'
import type { ThinkingOrb } from '../chrome/orb.js'
import { liveDock, type LaneStrip } from '../voice/lanes.js'
import type { Sidebar } from '../chrome/sidebar.js'
import type { MediaDelivery } from '../media-delivery.js'
import type { Completion } from '../overlays/completion.js'
import type { Overlay, OverlayStack } from '../overlays/overlay.js'
import type { PrAside } from '../prs/aside.js'
import { COMPOSER_ID, INPUT_ID, type SurfaceHost } from '../surface/host.js'
import type { Transcript } from '../transcript/store.js'
import type { EuiCards } from '../eui/cards.js'
import type { GlideWidgets } from '../glideui/widgets.js'
import type { WorkTreeCard } from '../glideui/workTreeCard.js'
import { euiSheets } from '../eui/cards.js'
import type { UiRender } from '../glideui/render.js'
import type { TableCharts } from '../transcript/tableCharts.js'
import { type DockActions, dockNodes, widgetAside } from '../view/dock.js'
import { type DockSources, dockModel, isModal, shownPills } from '../view/dockModel.js'
import { bindBrowserFocus, type BrowserFocusHost } from '../view/tools/cards/browser.js'
import type { Retention } from '../view/retention.js'
import { lspLinkContext } from '../view/tools/lsp-links.js'
import { entryNode, type TranscriptContext } from '../view/transcript.js'
import type { WelcomeContext } from '../view/welcome.js'
import type { LiveVoice } from '../voice/live.js'

/** What a frame reads and the three things it changes: the pills' focus, the completion and the surface. */
export interface FrameCx extends DockSources {
  readonly liveVoice: Pick<LiveVoice, 'node' | 'blocked'>
  readonly surface: Pick<SurfaceHost, 'closed' | 'follow' | 'render'> & Partial<Pick<SurfaceHost, 'raw'>>
  readonly retention?: Retention | undefined
  /** The active gateway transport: attached gateways never attest file-locality. */
  readonly gateway?: Pick<GatewayClient, 'attached'>
  readonly hud: Pick<Hud, 'focused' | 'prune' | 'todosOpen'>
  readonly completion: Pick<Completion, 'ghost' | 'nodes' | 'update'>
  readonly mediaDelivery?: MediaDelivery
  readonly charts: TableCharts
  readonly eui?: EuiCards
  /** Agent-mounted widgets around the composer (glide_ui_mount). */
  readonly workTree?: Pick<WorkTreeCard, 'node'>
  readonly widgets?: Pick<GlideWidgets, 'nodes'>
  readonly overlays: readonly Overlay[]
  readonly stack: Pick<OverlayStack, 'rootOf'>
  readonly transcript: Pick<Transcript, 'changedEntries' | 'currentTodos' | 'entries' | 'lifetime' | 'live'>
  readonly prAside: Pick<PrAside, 'node' | 'open'>
  readonly sidebar: Pick<Sidebar, 'node'>
  readonly factory: Pick<FactoryPane, 'node' | 'open'>
  /** Tern has the aside feature: Factory, the PR aside or the session sidebar docks at the right edge. */
  aside(): boolean
  /** The dock's buttons, bound once. */
  readonly actions: DockActions
  /** The welcome card's logo, version and tip; the backend's version stands in for a missing one. */
  readonly welcome: WelcomeContext
  /** The Copy buttons: the entry whose button reads Copied, and what a click does. */
  readonly copies: Pick<TranscriptContext, 'copied' | 'copy'>
  /** Local file paths are valid only if Tern and Hermes share the filesystem. */
  readonly hostLocal: boolean
  readonly nativeMedia: boolean
  /** The host clock preference negotiated for this Tern session. */
  readonly hour12?: () => boolean
  /** Only for session-scoped native browser-card Focus; never used by ordinary tool cards. */
  readonly browser: BrowserFocusHost
  /** Optional SDK image on the composer line, updated by its own lifecycle-safe animator. */
  readonly orb?: Pick<ThinkingOrb, 'props'>
  /** The live call's helper lanes, drawn under the live controls; while they orbit, that scene is the voice orb. */
  readonly lanes?: Pick<LaneStrip, 'node' | 'orbiting'>
  /** `/glide focus clean`: the clean view's layer while it is up; it then draws alone and keys go to the app. */
  readonly clean?: () => JSX.Element | null
}

/** Draws one frame at `now`; nothing once the surface closed. */
export function drawFrame(cx: FrameCx, now = Date.now()) {
  if (cx.surface.closed) {
    return
  }

  const modal = isModal(cx.overlays)
  const entries = transcriptContext(cx, now)

  // A pill that left (its last process aged out) hands the keys back.
  cx.hud.prune(shownPills(cx, now))

  // Every composer change (keys, native edits and undo, submits, queue edits) ends in a render: refresh here.
  if (!modal) {
    cx.completion.update(cx.composer)
  }

  // The clean view draws alone: no transcript rows and no dock (Tern keeps app sheets off its own regions, so
  // hiding them has to be by not drawing them). Restoring redraws the transcript from the store as usual.
  const clean = cx.clean?.() ?? null
  if (clean) {
    const quiet = { dock: [], layer: [clean] }
    if (cx.retention) cx.retention.paint(quiet, [], entries, modal, new Set())
    else cx.surface.render({ ...quiet, main: [] })
    cx.surface.follow(null)
    return
  }

  const live = liveDock(cx.liveVoice.node(), cx.lanes?.node() ?? null)
  // Widgets only show what their host source holds: no control in one acts (nothing to send).
  const r: UiRender = { send: () => undefined, svg: markup => cx.eui?.svg(markup) }
  const w = cx.widgets
  const work = cx.workTree?.node(cx.transcript, cx.session.info?.cwd ?? '', r, (name, css) => {
    if (euiSheets.get(name) === css) return
    euiSheets.set(name, css)
    cx.surface.raw?.stylesheet(name, css)
  })
  const slots = { above: w?.nodes('above-composer', r) ?? [], ring: w?.nodes('composer-ring', r) ?? [], below: [...(work ? [work] : []), ...(w?.nodes('below-composer', r) ?? [])] }
  const chrome = {
    dock: [...(live ? [live] : []), ...dockNodes({ ...dockModel(cx, now), ...(cx.orb && !cx.lanes?.orbiting ? { orb: cx.orb.props() } : {}) }, cx.actions, slots)],
    layer: [
      ...(cx.aside()
        ? [cx.factory.open ? cx.factory.node('layer.factory') : cx.prAside.open ? cx.prAside.node('layer.prs') : (cx.sidebar.node('layer.sidebar') ?? widgetAside(w?.nodes('sidebar', r) ?? []))].filter(n => n !== null)
        : []),
      ...cx.overlays.map(o => o.node(cx.stack.rootOf(o))),
      ...(modal ? [] : cx.completion.nodes(COMPOSER_ID))
    ]
  }

  if (cx.retention) {
    cx.retention.paint(chrome, cx.transcript.entries, entries, modal, cx.transcript.changedEntries)
  } else {
    cx.surface.render({ ...chrome, main: cx.transcript.entries.map(e => entryNode(e, `main.${e.id}`, entries)) })
  }

  cx.surface.follow(focusOf(cx))
}

/** What the transcript's entries draw with this frame. */
export function transcriptContext(cx: Pick<FrameCx, 'session' | 'copies' | 'welcome' | 'gateway'> & Partial<Pick<FrameCx, 'charts' | 'eui' | 'browser' | 'mediaDelivery' | 'hostLocal' | 'nativeMedia' | 'hour12'>>, now: number): TranscriptContext {
  const info = cx.session.info
  const focusBrowser = cx.browser ? bindBrowserFocus(cx.browser, cx.session.ref) : undefined
  const backend = info?.version && info.version !== 'unknown' ? `v${info.version}` : ''

  return {
    ...(cx.charts ? { charts: cx.charts } : {}),
    ...(cx.eui ? { eui: cx.eui } : {}),
    copied: cx.copies.copied,
    copy: cx.copies.copy,
    hour12: cx.hour12?.() ?? false,
    links: {
      cwd: info?.cwd ?? '',
      hostLocal: cx.hostLocal === true && info?.terminal_backend === 'local',
      media: cx.nativeMedia === true
    } satisfies FileContext,
    focusBrowser,
    browserSource: cx.session.ref,
    now,
    ...(cx.mediaDelivery ? { media: cx.mediaDelivery, mediaRev: cx.mediaDelivery.token() } : {}),
    lspContext: lspLinkContext({
      cwd: info?.cwd,
      terminalBackend: info?.terminal_backend,
      sessionLive: cx.session.ref.live !== null,
      gatewayAttached: cx.gateway?.attached !== false,
      ssh: Boolean(process.env['SSH_CONNECTION'] || process.env['SSH_CLIENT'] || process.env['SSH_TTY'])
    }),
    welcome: { ...cx.welcome, version: cx.welcome.version || backend }
  }
}

/** Where the caret goes: the top overlay's field; none under a modal sheet without one or while a pill holds the keys; else the composer. */
function focusOf(cx: Pick<FrameCx, 'hud' | 'overlays' | 'stack'>): string | null {
  const top = cx.overlays.at(-1)

  return top?.focus ? top.focus(cx.stack.rootOf(top)) : top?.modal || cx.hud.focused ? null : INPUT_ID
}
