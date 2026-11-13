// Fits the pinned kit's fleet cards (/hosts, /portfolio, /factory graph) to Tern's 1060x596 window:
// one group open (the most urgent, else the first), and long lists capped behind an "N more" button.
// It edits the mounted kit DOM in the sandbox, so the kit's own controls and intents run unchanged;
// each container is fitted the first time it appears, and a re-render's new nodes are fitted again.

/** The slice of a sandbox (linkedom) element this pass touches. */
export interface FitEl {
  readonly children: Iterable<FitEl>
  readonly ownerDocument: { createElement(tag: string): FitEl }
  className: string
  textContent: string | null
  matches(selector: string): boolean
  querySelector(selector: string): FitEl | null
  querySelectorAll(selector: string): Iterable<FitEl>
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  toggleAttribute(name: string, force?: boolean): boolean
  after(...nodes: FitEl[]): void
  append(...nodes: FitEl[]): void
  remove(): void
  addEventListener(type: string, listener: () => void): void
}

/**
 * The fleet cards' density over the pinned kit sheet, in omp's card grammar (8px flat box, 1px border,
 * 14px inset): one neutral pill for every tag, gold only for the next step, no tree guide lines, and the
 * factory's stats and graph folded below its action rows. compactCss scopes and minifies it with the kit sheet.
 */
export const FLEET_FIT_CSS = `
[data-eui='card'] .eu-card[class*=k-fleet]{border-radius:8px;box-shadow:none;--fl-r-md:8px}
[data-eui='card'] :is(.fh-root,.fp-root,.ff-root){padding:0;gap:8px;border:0}
[data-eui='card'] :is(.fl-updated,.fl-controls){margin:0}
[data-eui='card'] :is(.fl-tag,.ff-graph .eu-btn){display:inline-block;font:500 11px/18px var(--fl-sans);margin:0;padding:0 7px;min-height:0;border:1px solid var(--fl-hair2);border-radius:999px;background:none;color:var(--fl-ink2);width:fit-content}
[data-eui='card'] .fp-next .fl-tag{color:var(--fl-gold);border-color:currentColor}
[data-eui='card'] :is(.fp-kids,.fp-feat)::before{display:none}
[data-eui='card'] :is(.fp-kids,.fp-feat,.fp-tasks,.fh-kids){margin-left:0;padding-left:14px;border:0}
[data-eui='card'] .fl-root :is(.fp-prow,.fp-task,.fp-frow,.fh-row,.fp-next,.ff-bi){padding:4px 8px;min-height:0;flex-wrap:nowrap;align-items:center;background:none}
[data-eui='card'] .fl-root .fp-next{padding:8px;border:1px solid var(--fl-hair2)}
[data-eui='card'] .fp-rt{display:flex;gap:8px;align-items:baseline}
[data-eui='card'] .fl-root :is(.ff-rt,.fp-task-l){flex:1 1 0}
[data-eui='card'] .fl-root .fp-d-acts{width:auto;padding:0}
[data-eui='card'] .ff-stats{grid-template-columns:repeat(4,1fr)}
[data-eui='card'] .ff-graph .eu-btn{margin:2px}
[data-eui='card'] .fl-fold{order:1;display:grid;gap:8px}
`

/** The kit's tag classes, each with its own colours; the fit draws them all as one neutral pill. */
const PILLS = '.fp-hz,.fp-st,.fp-tag,.fh-count'

/** A list's visible rows before "N more". */
export const FLEET_ROW_CAP = 3

interface Fit {
  /** [list, group, urgent]: in each list only one group stays open, the first holding `urgent`, else the first open one. */
  readonly one: readonly (readonly [string, string, string])[]
  /** [list, row, cap]: rows past the cap hide behind one "N more" button. */
  readonly caps: readonly (readonly [string, string, number])[]
  /** [parent, children, label]: those children move into one closed `details` the reader opens by its label. */
  readonly folds: readonly (readonly [string, string, string])[]
}

const FITS: Readonly<Record<string, Fit>> = {
  'fleet-hosts': {
    one: [['.fh-tree', 'details.fh-host-group', '.fh-l0 .fh-blocked']],
    caps: [['.fh-tree', 'details.fh-host-group', 4], ['.fh-host-group', 'section.fh-kids', 2], ['.fh-kids', 'details.fh-agentwrap', FLEET_ROW_CAP],
      ['.fh-machines', '.fh-mach', FLEET_ROW_CAP], ['.fh-node', '.fh-podwrap', FLEET_ROW_CAP]],
    folds: []
  },
  'fleet-portfolio': {
    one: [['.fp-tree', 'details.fp-group', '.fp-dot.blocked']],
    caps: [['.fp-tree', 'details.fp-group', 2], ['.fp-kids', '.fp-feat', 1], ['.fp-tasks', '.fp-task', FLEET_ROW_CAP],
      ['.fp-lane', '.fp-fcard', 2], ['.fp-links', '.fp-readout', FLEET_ROW_CAP]],
    folds: []
  },
  // The kit keeps its stats, graph, legend and detail nodes and redraws inside them, so they can move.
  'fleet-factory': { one: [], caps: [['.ff-bl', '.ff-bi', FLEET_ROW_CAP]], folds: [['.ff-root', '.ff-stats,.ff-graph,.ff-legend,.ff-detail', 'Stats and graph']] }
}

const rows = (list: FitEl, row: string): FitEl[] => [...list.children].filter(el => el.matches(row))
const within = (root: FitEl, selector: string): FitEl[] => [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)]

/** A fresh fit for one mount of `kind`, or undefined for kinds the kit already sizes. */
export function fleetFit(kind: string): ((root: FitEl) => void) | undefined {
  const fit = FITS[kind]
  if (!fit) return undefined
  // Per rule, so a user's later toggle or "N more" is never undone by the next pass.
  const seen = new Map<string, WeakSet<FitEl>>()
  const first = (el: FitEl, rule: string) => {
    const set = seen.get(rule) ?? new WeakSet<FitEl>()
    seen.set(rule, set)
    if (set.has(el)) return false
    set.add(el)
    return true
  }
  const doc = (root: FitEl) => root.ownerDocument
  return root => {
    for (const el of within(root, PILLS)) el.className = el.className.replace(/^\S+/, 'fl-tag')
    for (const [i, [parent, kids, label]] of fit.folds.entries()) for (const host of within(root, parent)) {
      if (!first(host, 'f' + i)) continue
      const moved = rows(host, kids)
      const at = moved[0]
      if (!at) continue
      const fold = doc(root).createElement('details')
      fold.className = 'fl-fold'
      const summary = doc(root).createElement('summary')
      summary.className = 'fl-tag'
      summary.textContent = label
      at.after(fold)
      fold.append(summary, ...moved)
    }
    for (const [i, [list, group, urgent]] of fit.one.entries()) for (const parent of within(root, list)) {
      if (!first(parent, 'o' + i)) continue
      const groups = rows(parent, group)
      const pick = groups.find(g => g.querySelector(urgent)) ?? groups.find(g => g.hasAttribute('open'))
      // The kit marks every group `open` by class once; keep the class with the state it styles.
      for (const g of groups) { g.toggleAttribute('open', g === pick); g.className = g.className.replace(/\s*\bopen\b/g, '') + (g === pick ? ' open' : '') }
      pick?.setAttribute('data-fit-pick', '')
    }
    for (const [i, [list, row, cap]] of fit.caps.entries()) for (const parent of within(root, list)) {
      if (!first(parent, 'c' + i)) continue
      const items = rows(parent, row)
      if (items.length <= cap) continue
      const rest = items.slice(cap)
      const last = items.at(-1)
      // The urgent group stays visible even when it sorts past the cap.
      const kept = rest.filter(el => el.hasAttribute('data-fit-pick'))
      const hidden = rest.filter(el => !kept.includes(el))
      for (const el of hidden) el.toggleAttribute('hidden', true)
      const more = doc(root).createElement('button')
      more.setAttribute('type', 'button')
      more.className = 'fl-tag fl-more'
      more.textContent = hidden.length + ' more'
      more.addEventListener('click', () => { for (const el of hidden) el.toggleAttribute('hidden', false); more.remove() })
      last?.after(more)
    }
  }
}
