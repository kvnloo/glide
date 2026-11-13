// Fits the pinned kit's fleet cards (/hosts, /portfolio, /factory graph) to Tern's 1060x596 window:
// one group open (the most urgent, else the first), long lists capped behind an "N more" button and the
// factory's stats folded. It rewrites the kit's DOM snapshot, never the kit's DOM, so the first frame Tern
// paints is already final height and the kit's own controls and intents run unchanged.
import type { EuiEl, EuiNode } from './sandbox.js'

/**
 * The fleet cards' density over the pinned kit sheet, in omp's card grammar (8px flat box, 1px border,
 * 14px inset): one neutral pill for every tag, gold only for the next step, no tree guide lines, and the
 * factory's stats and graph folded below its action rows. compactCss scopes and minifies it with the kit sheet.
 */
export const FLEET_FIT_CSS = `
[data-eui='card'] .eu-card[class*=k-fleet]{border-radius:8px;box-shadow:none;--fl-r-md:8px;--h-density:.5;--pad:14px}
[data-eui='card'] :is(.fh-root,.fp-root,.ff-root){padding:0;gap:8px;border:0}
[data-eui='card'] :is(.fl-updated,.fl-controls){margin:0}
[data-eui='card'] :is(.fl-tag,.fp-btn,.ff-graph .eu-btn){display:inline-block;font:500 11px/18px var(--fl-sans);margin:0;padding:0 7px;min-height:0;border:1px solid var(--fl-hair2);border-radius:999px;background:none;color:var(--fl-ink2);width:fit-content}
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
[data-eui='card'] .fl-fold{display:grid;gap:8px}
`

/** The kit's tag classes, each with its own colours; the fit draws them all as one neutral pill. */
const PILLS = '.fp-hz,.fp-st,.fp-tag,.fh-count'

/** A list's visible rows before "N more". */
export const FLEET_ROW_CAP = 3

type Rule<N extends number> = readonly (readonly string[] & { length: N })[]
interface Fit {
  /** [parent, child, into]: the child moves to the front of the first `into` among its siblings and their kids, or is dropped when `into` is ''. `:empty` acts only while it holds no text. */
  readonly moves: Rule<3>
  /** [parent, children, label]: those children move into one closed `details` at the end, opened by its label. */
  readonly folds: Rule<3>
  /** [list, group, urgent]: in each list only one group stays open, the first holding `urgent`, else the first open one. */
  readonly one: Rule<3>
  /** [list, row, cap]: rows past the cap hide behind one "N more" button; the open group and urgent rows count first. */
  readonly caps: readonly (readonly [string, string, number])[]
}

// Tern's entry head already names the view and its counts: keep the kit head's one-line verb and status,
// and put the snapshot's age on the controls row.
const HEAD = [['.eu-h', '.eu-ico', ''], ['.eu-t', 'b', '']] as const

const FITS: Readonly<Record<string, Fit>> = {
  'fleet-hosts': {
    moves: [...HEAD, ['.fh-root', '.fh-head', ''], ['.fh-root', '.fh-toast:empty', ''], ['.fh-root', '.fl-updated', '.fl-controls']],
    folds: [],
    one: [['.fh-tree', 'details.fh-host-group', '.fh-blocked']],
    caps: [['.fh-tree', 'details.fh-host-group', 2], ['.fh-host-group', 'section.fh-kids', 1], ['.fh-kids', 'details.fh-agentwrap', 2],
      ['.fh-machines', '.fh-mach', FLEET_ROW_CAP], ['.fh-node', '.fh-podwrap', FLEET_ROW_CAP]]
  },
  'fleet-portfolio': {
    // The portfolio select names the portfolio, the gold pill marks the next step, and Shared links lists each feature's tags.
    moves: [...HEAD, ['.fp-head', '.fp-title', ''], ['.fp-next', '.fp-next-k', ''], ['.fp-feat', '.fp-ftags', ''], ['.fp-root', '.fl-updated', '.fp-stats']],
    folds: [],
    one: [['.fp-tree', 'details.fp-group', '.fp-dot.blocked']],
    caps: [['.fp-tree', 'details.fp-group', 1], ['.fp-kids', '.fp-feat', 1], ['.fp-tasks', '.fp-task', 2],
      ['.fp-lane', '.fp-fcard', 2], ['.fp-links', '.fp-readout', FLEET_ROW_CAP]]
  },
  'fleet-factory': { moves: HEAD, folds: [['.ff-root', '.ff-stats,.ff-graph,.ff-legend,.ff-detail', 'Stats and graph']], one: [], caps: [['.ff-bl', '.ff-bi', FLEET_ROW_CAP]] }
}

/** `tag.class.class` selectors, comma-separated, with an optional `:empty`; enough for the kit's class-named fleet DOM. */
const is = (n: EuiNode, selector: string): boolean => n.t === 'el' && selector.split(',').some(one => {
  const [simple = '', empty] = one.trim().split(':')
  const [tag, ...classes] = simple.split('.')
  const own = n.cls.split(/\s+/)
  return (!tag || n.tag === tag) && classes.every(c => own.includes(c)) && (empty === undefined || !text(n).trim())
})
const text = (n: EuiNode): string => n.t === 'text' ? n.text : n.t === 'el' ? n.kids.map(text).join('') : ''
const has = (n: EuiNode, selector: string): boolean => n.t === 'el' && n.kids.some(k => is(k, selector) || has(k, selector))
const els = (kids: readonly EuiNode[], selector: string) => kids.filter((k): k is EuiEl => is(k, selector))

// The fit's own controls carry ids no sandbox element or kitSnapshot wrapper has: -(BASE + 4 * target + op).
const BASE = 1_000_000
const OPEN = 0, MORE = 1, FOLD = 2, BOX = 3
const control = (target: number, op: number) => -(BASE + 4 * target + op)

/** The fit of one mount: a pure rewrite of each snapshot, plus the reader's opens it must keep. */
export interface FleetFit {
  (node: EuiNode): EuiNode
  /** Handles a click on one of the fit's own controls; false for every other id. */
  click(id: number): boolean
}

/** A fresh fit for one mount of `kind`, or undefined for kinds the kit already sizes. */
export function fleetFit(kind: string): FleetFit | undefined {
  const fit = FITS[kind]
  if (!fit) return undefined
  // Which group each list opens is decided at its first snapshot, so a reader's later toggle is never undone.
  const decided = new Set<number>()
  const closed = new Set<number>()
  const picked = new Set<number>()
  const opened = new Set<string>()
  const marks = fit.one.map(([, , marker]) => marker).join(',')
  const el = (tag: string, cls: string, id: number, attrs: Record<string, string>, kids: readonly EuiNode[]): EuiEl =>
    ({ t: 'el', tag, id, cls, style: '', attrs, click: tag !== 'details', kids })

  const rewrite = (n: EuiNode): EuiNode => {
    if (n.t !== 'el') return n
    let kids = n.kids.map(rewrite)
    const cls = is(n, PILLS) ? n.cls.replace(/^\S+/, 'fl-tag') : n.cls
    for (const [parent = '', child = '', into = ''] of fit.moves) if (is(n, parent)) {
      const moved: EuiNode[] = els(kids, child)
      let placed = !into
      const put = (k: EuiNode): EuiNode => placed || k.t !== 'el' ? k : is(k, into) ? (placed = true, { ...k, kids: [...moved, ...k.kids] }) : { ...k, kids: k.kids.map(put) }
      kids = kids.filter(k => !moved.includes(k)).map(put)
    }
    for (const [parent = '', moved = '', label = ''] of fit.folds) if (is(n, parent) && kids.some(k => is(k, moved))) {
      const open = opened.has(FOLD + ':' + n.id)
      const summary = el('summary', 'fl-tag', control(n.id, FOLD), {}, [{ t: 'text', text: label }])
      kids = [...kids.filter(k => !is(k, moved)), el('details', 'fl-fold', control(n.id, BOX), { open: open ? 'true' : '' },
        open ? [summary, ...kids.filter(k => is(k, moved))] : [summary])]
    }
    for (const [list = '', group = '', urgent = ''] of fit.one) if (is(n, list)) {
      const groups = els(kids, group)
      if (!decided.has(n.id)) {
        decided.add(n.id)
        const pick = groups.find(g => has(g, urgent)) ?? groups.find(g => g.attrs['open'])
        for (const g of groups) (g === pick ? picked : closed).add(g.id)
      }
      kids = kids.map(g => g.t === 'el' && is(g, group) && closed.has(g.id) && !opened.has(OPEN + ':' + g.id) && g.attrs['open'] ? {
        ...g, cls: g.cls.replace(/\s*\bopen\b/g, ''), attrs: { ...g.attrs, open: '' },
        kids: g.kids.filter(k => is(k, 'summary')).slice(0, 1).map(s => ({ ...s, id: control(g.id, OPEN), click: true }))
      } : g)
    }
    for (const [list, row, cap] of fit.caps) if (is(n, list) && !opened.has(MORE + ':' + n.id)) {
      const rows = els(kids, row)
      // The open group and urgent rows stay visible wherever they sort, and take their places under the cap first.
      const kept = rows.filter(k => picked.has(k.id) || (marks !== '' && has(k, marks)))
      let room = cap - kept.length
      const hidden: EuiNode[] = rows.filter(k => !kept.includes(k) && room-- <= 0)
      if (!hidden.length) continue
      const last = kids.findLastIndex(k => is(k, row))
      const more = el('button', 'fl-tag fl-more', control(n.id, MORE), { type: 'button' }, [{ t: 'text', text: hidden.length + ' more' }])
      kids = [...kids.slice(0, last + 1), more, ...kids.slice(last + 1)].filter(k => !hidden.includes(k))
    }
    return kids === n.kids && cls === n.cls ? n : { ...n, cls, kids }
  }

  return Object.assign(rewrite, {
    click(id: number) {
      const code = -id - BASE
      if (!Number.isSafeInteger(code) || code < 0 || code % 4 === BOX) return false
      const key = (code % 4) + ':' + Math.floor(code / 4)
      if (code % 4 === FOLD && opened.has(key)) opened.delete(key)
      else opened.add(key)
      return true
    }
  })
}
