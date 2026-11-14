// One renderer for bound glide/v1 trees (library.ts): every part becomes a native Tern kind (card,
// tabs, chart, table, kv, checklist, meter, badge), so Tern does layout, truncation and theming itself
// and nothing is measured in a fake DOM. Roles carry the ephemeral-ui kit's look (UI_CSS).
import { DASH, NIGHT } from '../../../glide/frontend/tokens.js'
import { html, type JSX, type Span, ui } from '@stencil-hq/tern'

import { button, pressable } from '../view/ui/button.js'
import type { UiCell, UiIntent, UiNode, UiTone } from './library.js'
import { figure, liveCard } from './motion.js'

export interface UiRender {
  /** Host revisions replace native ids; only the original publication enters. */
  entrance?: boolean
  /** Sends a control's intent to the card's owner (revision-checked by the host). */
  send(intent: UiIntent): void
  /** A blob id for a trusted host SVG; undefined drops the graphic. */
  svg?(markup: string): string | undefined
}

const span = (t: string, s?: string): Span => (s ? { t, s } : { t })
const toneStyle = (tone: UiTone | undefined) => tone === undefined || tone === 'neutral' ? undefined : tone
const clamp = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
const STEP_STATUS = { pending: 'pending', active: 'running', done: 'done', blocked: 'error' } as const

function cell(v: UiCell | undefined, meter: boolean) {
  if (meter && typeof v === 'number') return { meter: { value: clamp(v) } }
  if (v !== undefined && typeof v === 'object') return [span(v.text, toneStyle(v.tone))]
  return String(v ?? '')
}

function kids(nodes: readonly UiNode[], r: UiRender): JSX.Element[] {
  return nodes.map((n, i) => node(n, `p${i}`, r))
}

export function node(n: UiNode, key: string, r: UiRender): JSX.Element {
  switch (n.typeName) {
    case 'Card': {
      const p = n.props
      return html.div({ key, attrs: { 'data-glide-motion': liveCard(n) ? 'live' : 'still', 'data-glide-enter': r.entrance === false ? 'no' : 'yes' } },
        <card head={[span(p.title, 'strong'), ...(p.app ? [span('  ' + p.app, 'muted')] : [])]} key="card" role="glide.card" {...(p.status ? { status: p.status } : {})}>
          <col gap="md" key="body" role="glide.body">{kids(p.children, r)}</col>
          {p.source ? <text key="src" role="glide.source" text={p.source} wrap="word" /> : null}
        </card>
      )
    }
    case 'Section': {
      const p = n.props
      return (
        <col gap="sm" key={key} role="glide.section">
          <row align="baseline" key="h" role="glide.section.head">
            <text key="t" role="glide.section.title" text={p.title} truncate="end" />
            <spacer grow={1} key="f" />
            {p.aside ? <text key="a" role="glide.label" text={p.aside} /> : null}
          </row>
          {kids(p.children, r)}
        </col>
      )
    }
    case 'Row':
      return (
        <row align="center" gap="lg" key={key} role="glide.row">
          {n.props.children.map((c, i) => <col basis={0} grow={c.typeName === 'Hero' ? 0 : 1} key={`k${i}`} min={{ w: '16ch' }}>{node(c, 'n', r)}</col>)}
        </row>
      )
    case 'Hero': {
      const p = n.props
      return (
        <col gap="none" key={key} role="glide.hero">
          {figure(p.value, 'glide.hero.value', p.tone, r.entrance)}
          <text key="l" role="glide.label" text={p.label} truncate="end" />
          {p.detail ? <text key="d" role="glide.hero.detail" text={p.detail} wrap="word" /> : null}
        </col>
      )
    }
    case 'Stats':
      return (
        <row gap="lg" key={key} role="glide.stats" wrap>
          {n.props.items.map((s, i) => (
            <col gap="none" key={`s${i}`} min={{ w: '10ch' }} role="glide.stat">
              {figure(s.value, 'glide.stat.value', s.tone, r.entrance)}
              <text key="l" role="glide.label" text={s.label} truncate="end" />
            </col>
          ))}
        </row>
      )
    case 'Text': {
      const t = n.props.tone
      const role = t === 'muted' ? 'glide.muted' : t === 'strong' ? 'glide.strong' : t === 'quote' ? 'glide.quote' : 'glide.text'
      const tone = t === 'muted' || t === 'strong' || t === 'quote' ? undefined : toneStyle(t)
      return <text key={key} role={role} text={n.props.body} wrap="word" {...(tone ? { tone } : {})} />
    }
    case 'Spark':
      return <chart key={key} kind="spark" role="glide.spark" series={n.props.points.map(value => ({ value }))} size="lg" summary={n.props.summary} />
    case 'Bars':
      return <chart key={key} kind="bars" role="glide.bars" series={n.props.values.map((value, i) => ({ value, label: n.props.labels[i] ?? '' }))} size="md" summary={n.props.summary} />
    case 'Meter': {
      const p = n.props
      return <meter key={key} label={p.label} role="glide.meter" value={clamp(p.value)} {...(p.total ? { total: p.total } : {})} {...(toneStyle(p.tone) ? { tone: toneStyle(p.tone) } : {})} />
    }
    case 'Table': {
      const { columns, rows } = n.props
      const first = columns[0]?.id ?? ''
      const table = (
        <table
          cols={columns.map((c, i) => ({ id: c.id, head: c.head, ...(c.align ? { align: c.align } : {}), ...(c.grow || (i === 0 && !columns.some(x => x.grow)) ? { grow: 1 } : {}) }))}
          key="t"
          role="glide.table"
          rows={rows.map(row => ({ id: row.id, cells: Object.fromEntries(columns.map(c => [c.id, cell(row.cells[c.id], c.meter === true)])) }))}
        />
      )
      const open = rows.filter(row => row.intent)
      return (
        <col gap="sm" key={key} role="glide.table.wrap">
          {table}
          {open.length === 0 ? null : (
            <row gap="sm" key="open" role="glide.table.open" wrap>
              {open.map((row, i) => {
                const label = row.cells[first]
                return button({ key: `o${i}`, label: typeof label === 'object' ? label.text : String(label ?? row.id), wrap: 'none', onClick: () => { if (row.intent) r.send(row.intent) } })
              })}
            </row>
          )}
        </col>
      )
    }
    case 'Kv':
      return <kv items={n.props.items.map(i => ({ k: i.k, v: i.v }))} key={key} layout="grid" role="glide.kv" />
    case 'List': {
      const numbered = n.props.numbered !== false
      return (
        <col gap="xs" key={key} role="glide.list">
          {n.props.items.flatMap((it, i) => {
            const group = it.group !== undefined && it.group !== n.props.items[i - 1]?.group
              ? [<text key={`g${i}`} role="glide.list.group" text={it.group} truncate="end" />] : []
            const row = (
              <row align="center" gap="md" key="r" role="glide.list.row">
                {numbered ? <text key="i" role="glide.list.index" text={String(i + 1).padStart(2, '0')} /> : null}
                <col gap="none" grow={1} key="t" shrink={1}>
                  <text key="l" role="glide.strong" text={it.label} truncate="end" {...(toneStyle(it.tone) ? { tone: toneStyle(it.tone) } : {})} />
                  {it.detail ? <text key="d" role="glide.muted" text={it.detail} wrap="word" /> : null}
                </col>
                {it.badge ? <badge key="b" text={it.badge} {...(toneStyle(it.tone) ? { tone: toneStyle(it.tone) } : {})} /> : null}
                {it.value ? <text key="v" role="glide.list.value" text={it.value} /> : null}
              </row>
            )
            const intent = it.intent
            return [...group, intent ? pressable({ key: `i${i}`, name: it.label, onClick: () => r.send(intent) }, row) : <col key={`i${i}`}>{row}</col>]
          })}
        </col>
      )
    }
    case 'Tabs': {
      const { items, active } = n.props
      return (
        <tabs
          active={active}
          items={items.map(t => ({ id: t.id, label: t.count === undefined ? t.label : [span(t.label), span(' ' + t.count, 'muted')] }))}
          key={key}
          onSelect={ev => { const t = items.find(x => x.id === ev.item); if (t && t.id !== active) r.send(t.intent) }}
          role="glide.tabs"
        />
      )
    }
    case 'Badges':
      return <row gap="sm" key={key} role="glide.badges" wrap>{n.props.items.map((b, i) => <badge key={`b${i}`} text={b.text} {...(toneStyle(b.tone) ? { tone: toneStyle(b.tone) } : {})} />)}</row>
    case 'Steps':
      return (
        <checklist
          key={key}
          mode="full"
          phases={[{ id: 'p', items: n.props.items.map(s => ({ id: s.id, text: s.text, status: STEP_STATUS[s.status], ...(s.note ? { note: s.note } : {}) })) }]}
          role="glide.steps"
        />
      )
    case 'Flow': {
      const { stages, note } = n.props
      return (
        <col gap="sm" key={key} role="glide.flow">
          <row align="stretch" gap="xs" key="s" role="glide.flow.row">
            {stages.flatMap((s, i) => [
              ...(i === 0 ? [] : [<text key={`a${i}`} role="glide.flow.arrow" text="→" />]),
              <col basis={0} gap="none" grow={1} key={`s${i}`} min={{ w: '10ch' }} role={`glide.flow.stage.${s.tone ?? 'neutral'}`}>
                <text key="l" role="glide.strong" text={s.label} truncate="end" />
                {s.detail ? <text key="d" role="glide.muted" text={s.detail} wrap="word" /> : null}
              </col>
            ])}
          </row>
          {note ? <text key="n" role="glide.muted" text={note} wrap="word" /> : null}
        </col>
      )
    }
    case 'Buttons':
      return (
        <row align="center" gap="sm" key={key} role="glide.actions" wrap>
          {n.props.items.map((b, i) => b.disabled
            ? <text key={`b${i}`} role="glide.muted" text={b.label} />
            : button({ key: `b${i}`, label: b.label, wrap: 'none', ...(b.primary ? { kind: 'primary' as const } : {}), onClick: () => r.send(b.intent) }))}
        </row>
      )
    case 'Graphic': {
      const blob = r.svg?.(n.props.svg)
      return blob === undefined ? <spacer key={key} size="none" /> : <col key={key} role="glide.graphic">{ui.image({ key: 'g', blob, w: n.props.w, h: n.props.h, alt: n.props.alt })}</col>
    }
  }
}

/** The surface sheet names: UI_CSS (shared with transcript cards), and the ring's live position. */
export const UI_SHEET = 'glide-ui'
export const RING_SHEET = 'glide-ring'

/** Where the sweep starts on the top edge: just past the chip, as in the reference. */
const RING_START = 0.2

/**
 * The ring's live paint for a meter at `left` (1 = full, 0 = done). Tern's renderer has no conic gradients, and its
 * masks leave a hairline on an unpadded edge, so the ring is plain border pieces: up to three on the top edge
 * (`t0`-`t2`) and two below (`bl` up the left side and along the bottom to the split, `br` from there round the
 * right). The sweep runs clockwise from the chip along the top, back along the bottom and up under the chip; the
 * head dot sits where spent meets left. Selectors carry an extra attribute so they beat UI_CSS whichever sheet lands
 * last.
 */
export function ringCss(left: number, glow = false): string {
  const d = (1 - Math.max(0, Math.min(1, left))) * 2
  const x0 = RING_START
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`
  const at = (role: string, css: string) => `[data-role][data-role='glide.ring.${role}']{${css}}`
  const colour = (spent: boolean) => (spent ? RING_SPENT : RING_LEFT)
  const tops = (spans: readonly (readonly [number, number, boolean])[]) =>
    spans
      .filter(([a, b]) => b > a)
      .map(([a, b, spent], i) =>
        at(`t${i}`, `display:block;left:${a === 0 ? '-1px' : pct(a)};right:${b === 1 ? '-1px' : pct(1 - b)};border-radius:${a === 0 ? 17 : 0}px ${b === 1 ? 17 : 0}px 0 0;border-color:${colour(spent)}`),
      )
      .join('')
  const whole = (spent: boolean) => at('bl', `right:-1px;border-right-width:2px;border-radius:17px;border-color:${colour(spent)}`) + at('br', 'display:none')
  let css: string, head: string
  if (d <= 1 - x0) {
    const h = x0 + d
    css = tops([[0, x0, false], [x0, h, true], [h, 1, false]]) + whole(false)
    head = `top:-4px;left:calc(${pct(h)} - 4px)`
  } else if (d <= 2 - x0) {
    const h = 1 - (d - (1 - x0))
    css = tops([[0, x0, false], [x0, 1, true]]) + at('bl', `right:${pct(1 - h)};border-color:${RING_LEFT}`) + at('br', `left:${pct(h)};border-color:${RING_SPENT}`)
    head = `bottom:-4px;left:calc(${pct(h)} - 4px)`
  } else {
    const h = d - (2 - x0)
    css = tops([[0, h, true], [h, x0, false], [x0, 1, true]]) + whole(true)
    head = `top:-4px;left:calc(${pct(h)} - 4px)`
  }
  return `${css}\n${at('head', head)}${glow ? RING_GLOW : ''}`
}

const ACCENT = `var(--sf-accent,${DASH.gold})`
const RING_LEFT = ACCENT
const RING_SPENT = `color-mix(in srgb,${ACCENT} 14%,var(--l2))`

/** The opt-in glow (glow: true on the mount): a halo round the composer and the head. Kept out of UI_CSS, which the design checks hold glow-free. */
const RING_GLOW = `
[data-role='glide.ring.glow']{position:absolute;inset:-1px;z-index:1;pointer-events:none;border-radius:17px;box-shadow:0 0 26px 2px color-mix(in srgb,${ACCENT} 38%,transparent),0 0 6px color-mix(in srgb,${ACCENT} 55%,transparent)}
[data-role='glide.ring.head']{box-shadow:0 0 10px 4px color-mix(in srgb,${ACCENT} 55%,transparent),0 0 3px 1px color-mix(in srgb,${ACCENT} 40%,var(--ink,${NIGHT.text}))}`


/** The kit's look on native kinds: type ramp, uppercase mono labels, hero figure, hairline rows. */
export const UI_CSS = `
[data-role='glide.body']{padding:4px 2px}
/* The composer ring: a stroke on the composer's own border, spent clockwise from the chip. */
[data-role='glide.ring.t0'],[data-role='glide.ring.t1'],[data-role='glide.ring.t2']{display:none;position:absolute;top:-1px;height:24px;z-index:3;pointer-events:none;border:0 solid transparent;border-top-width:2px}
[data-role='glide.ring.bl'],[data-role='glide.ring.br']{position:absolute;top:-1px;bottom:-1px;z-index:3;pointer-events:none;border:0 solid transparent;border-bottom-width:2px}
[data-role='glide.ring.bl']{left:-1px;border-left-width:2px;border-radius:17px 0 0 17px}
[data-role='glide.ring.br']{right:-1px;border-right-width:2px;border-radius:0 17px 17px 0}
[data-role='glide.ring.head']{position:absolute;z-index:3;width:8px;height:8px;border-radius:50%;pointer-events:none;background:color-mix(in srgb,${ACCENT} 40%,var(--ink,${NIGHT.text}))}
[data-role='glide.ring.chip']{position:absolute;top:-14px;left:20px;z-index:4;gap:7px;padding:4px 13px 4px 11px;border-radius:999px;border:1px solid var(--l2);background:light-dark(var(--pop-bg),var(--raise));font-size:13px;line-height:18px}
[data-role='glide.ring.dot']{width:8px;height:8px;border-radius:50%;background:${ACCENT}}
[data-role='glide.ring.label']{opacity:.72}
[data-role='glide.ring.value']{font-weight:600;font-variant-numeric:tabular-nums}
/* The context hairline steps past the chip. */
.sf-col[data-role='omp.editor']:has(> [data-role='glide.ring.chip']) .sf-meter[data-role='omp.composer.context']{left:132px}
[data-role='glide.hero.value']{font-size:32px;font-weight:600;letter-spacing:-.04em;line-height:1.05;color:var(--sf-accent,${DASH.gold});font-variant-numeric:tabular-nums}
[data-role='glide.hero.detail']{font-size:12px;opacity:.72}
[data-role='glide.stat.value']{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
[data-role='glide.label'],[data-role='glide.list.index']{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.66;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.section.title']{font-size:15px;font-weight:600}
[data-role='glide.muted']{opacity:.7}
[data-role='glide.strong']{font-weight:600}
[data-role='glide.quote']{font-size:15px;line-height:1.45;padding-left:10px;border-left:2px solid var(--sf-accent,${DASH.gold})}
[data-role='glide.source']{font-size:11px;opacity:.56;padding-top:8px;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.list.row']{padding:8px 10px}
[data-role='glide.list.group']{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.66;font-family:'IBM Plex Mono',ui-monospace,monospace;padding:10px 10px 2px}
[data-role='glide.list.value']{font-variant-numeric:tabular-nums;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.flow.arrow']{opacity:.5;align-self:center}
[data-role^='glide.flow.stage']{padding:8px 10px;border-radius:10px;border:1px solid var(--sf-border,${NIGHT.border})}
[data-role='glide.flow.stage.accent'],[data-role='glide.flow.stage.success']{border-color:var(--sf-accent,${DASH.gold})}
`
