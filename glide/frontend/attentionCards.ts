// Attention heroes: one instrument on top of each /glide focus host card, built like the AODL heroes
// (intentCards.ts): plain EuiNodes for eui/hostSnapshot.ts, SVG through themeSvg's --h-* tokens and
// CSS bound to the card's --h-* variables, so the Tern/pywal theme retints them. The app id names the
// card (the kinds stay the pinned approve/receipt); heroes draw only what the rows say.
import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import type { EuiHostCardData } from '../../frontend/src/wire/euiHostCard.js'

export const FOCUS_APP = 'glide.focus'
export const DIGEST_APP = 'glide.digest'
export const WIND_APP = 'glide.wind'
export const HOURS_APP = 'glide.hours'
const APPS = [FOCUS_APP, DIGEST_APP, WIND_APP, HOURS_APP]
export const isAttentionCard = (d: Pick<EuiHostCardData, 'app'>) => APPS.includes(d.app)

type El = (tag: string, kids: readonly EuiNode[], cls?: string, attrs?: Record<string, string>) => EuiNode
const text = (value: string): EuiNode => ({ t: 'text', text: value })
const one = (d: EuiHostCardData, label: string) => String(d.rows.find(r => r.label === label)?.value ?? '')
const num = (v: string) => { const n = Number(v); return Number.isFinite(n) && v !== '' ? n : undefined }
const svg = (w: number, h: number, cls: string, body: string): EuiNode =>
  ({ t: 'svg', w, h, cls, style: '', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>` })

/** The block ring: the arc is the share of the block still left; off is an empty dashed track. */
export function ringSvg(left: number | undefined, total: number | undefined, ink = 'var(--h-primary)'): EuiNode {
  const s = 132, r = 56, c = 2 * Math.PI * r
  const frac = left !== undefined && total ? Math.max(0, Math.min(1, left / total)) : 0
  const track = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--h-border)" stroke-width="10"${total ? '' : ' stroke-dasharray="4 7"'}/>`
  const arc = frac > 0 ? `<circle cx="66" cy="66" r="${r}" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 66 66)"/>` : ''
  return svg(s, s, 'ah-ringsvg', track + arc)
}

// One line per state, so the card says where you are and what happens next before any fact tile.
function focus(d: EuiHostCardData, el: El): EuiNode {
  const block = one(d, 'block')
  const on = block === 'on', done = block === 'done'
  const left = num(one(d, 'left')), total = num(one(d, 'length'))
  const held = num(one(d, 'held')) ?? 0
  const asks = (n: number) => `${n} ${n === 1 ? 'ask' : 'asks'}`
  const next = one(d, 'next') || 'not learned yet'
  const fact = (k: string, v: string) => el('div', [el('small', [text(k)], 'ah-k'), el('b', [text(v)], 'ah-v')], 'ah-fact')
  const status = on ? `Deep work until ${one(d, 'until')}` : done ? 'Block done' : `Ready for ${total ?? 50} minutes of deep work`
  const line = on ? (held ? `${asks(held)} held for the digest` : 'Asks wait here for the digest')
    : done ? (held ? `${asks(held)} handed back in the digest below` : 'Nothing was held') : `Best window next: ${next}`
  return el('div', [
    el('div', [ringSvg(on ? left : done ? total ?? 1 : undefined, on ? total : done ? total ?? 1 : undefined, done ? 'var(--h-mutedFg)' : undefined),
      el('div', [el('b', [text(on ? String(left ?? '—') : done ? (total ? String(total) : '✓') : String(total ?? 50))], 'ah-big'),
        el('small', [text(on ? 'min left' : done ? (total ? 'min done' : 'done') : 'min, ready')], 'ah-cap')], 'ah-ringlabel')], 'ah-ring'),
    el('div', [
      el('div', [el('i', [], on ? 'ah-led ah-on' : 'ah-led'), text(status)], 'ah-status'),
      el('span', [text(line)], held ? 'ah-pill ah-held' : 'ah-pill'),
      el('div', [fact('phase', one(d, 'phase')), fact('flow', one(d, 'flow')), fact('bedtime', one(d, 'bedtime'))], 'ah-facts')
    ], 'ah-side')
  ], `ah-hero ah-focus${on ? ' ah-live' : done ? ' ah-done' : ''}`)
}

/** The count tile, then every held ask in full, oldest first: the digest is the to-do list it hands back. */
function digest(d: EuiHostCardData, el: El): EuiNode {
  const items = d.rows.filter(r => r.label !== 'count')
  const n = num(one(d, 'count')) ?? items.length
  return el('div', [
    el('div', [el('b', [text(String(n))], 'ah-big'), el('small', [text(n === 1 ? 'held ask' : 'held asks')], 'ah-cap')], n ? 'ah-tile' : 'ah-tile ah-none'),
    el('ol', items.length ? items.map(r => el('li', [el('small', [text(r.label)], `ah-cls ah-c-${r.label.replace(/[^a-z]/g, '')}`),
      el('span', [text(String(r.value))], 'ah-title')], 'ah-item'))
      : [el('li', [el('span', [text('Nothing waited for you. Pick the next thing.')], 'ah-title')], 'ah-item')], 'ah-list')
  ], 'ah-hero ah-digest')
}

// The day band runs 06:00 to 06:00 so a bedtime after midnight still sits on it.
const hourOf = (clock: string) => { const m = /(\d{1,2}):(\d\d)/.exec(clock); return m ? Number(m[1]) + Number(m[2]) / 60 : undefined }
const BAND_W = 480, BAND_X = (h: number) => (((h - 6) % 24 + 24) % 24) / 24 * BAND_W

/** Best hours (primary), the wind-down stretch from usual stop to bedtime, and now. */
export function daySvg(best: readonly [number, number][], now?: number, stop?: number, bed?: number): EuiNode {
  const parts = [`<rect x="0" y="22" width="${BAND_W}" height="16" rx="8" fill="var(--h-border)" opacity="0.55"/>`]
  if (stop !== undefined && bed !== undefined) {
    const a = BAND_X(stop), b = BAND_X(bed) || BAND_W
    if (b > a) parts.push(`<rect x="${a.toFixed(1)}" y="22" width="${(b - a).toFixed(1)}" height="16" fill="var(--h-mutedFg)" opacity="0.45"/>`)
  }
  for (const [s, e] of best) {
    const a = BAND_X(s), b = BAND_X(e) || BAND_W
    if (b > a) parts.push(`<rect x="${a.toFixed(1)}" y="20" width="${(b - a).toFixed(1)}" height="20" rx="4" fill="var(--h-primary)"/>`)
  }
  if (bed !== undefined) parts.push(`<circle cx="${BAND_X(bed).toFixed(1)}" cy="30" r="6" fill="none" stroke="var(--h-fg)" stroke-width="2"/>`)
  if (now !== undefined) parts.push(`<rect x="${(BAND_X(now) - 1).toFixed(1)}" y="12" width="2" height="36" fill="var(--h-fg)"/>`)
  for (const h of [6, 12, 18, 0]) parts.push(`<text x="${(BAND_X(h) + 2).toFixed(1)}" y="62" font-family="monospace" font-size="17" fill="var(--h-fg)" opacity="0.85">${String(h).padStart(2, '0')}</text>`)
  return svg(BAND_W, 68, 'ah-daysvg', parts.join(''))
}

function wind(d: EuiHostCardData, el: El): EuiNode {
  const best = one(d, 'best').split(',').map(s => /(\d+)-(\d+)/.exec(s)).filter(m => m !== null).map(m => [Number(m[1]), Number(m[2])] as [number, number])
  const asks = d.rows.filter(r => r.label === 'ask').map(r => String(r.value))
  const legend = (cls: string, label: string) => el('span', [el('i', [], `ah-sw ${cls}`), text(label)], 'ah-leg')
  return el('div', [
    daySvg(best, hourOf(one(d, 'now')), num(one(d, 'stop')), hourOf(one(d, 'bedtime'))),
    el('div', [legend('ah-sw-best', 'best hours'), legend('ah-sw-wind', 'wind-down'), legend('ah-sw-now', `now ${one(d, 'now')}`),
      legend('ah-sw-bed', `bed ${one(d, 'bedtime')}`)], 'ah-legend'),
    el('div', [
      el('small', [text('Tomorrow starts here')], 'ah-k'),
      ...(asks.length ? asks.map(a => el('p', [text(`“${a}”`)], 'ah-quote')) : [el('p', [text('Nothing open: tomorrow starts fresh.')], 'ah-quote')]),
      el('small', [text(`Next deep work ${one(d, 'next') || 'not learned yet'}`)], 'ah-cap')
    ], 'ah-note')
  ], 'ah-hero ah-wind')
}

/** /glide focus hours: the learned windows on the day band, then each row as a fact tile. */
function hours(d: EuiHostCardData, el: El): EuiNode {
  const best = d.rows.map(r => /(\d{1,2}):00–(\d{1,2}):00/.exec(String(r.value))).filter(m => m !== null).map(m => [Number(m[1]), Number(m[2])] as [number, number])
  return el('div', [
    daySvg(best),
    el('div', d.rows.map(r => el('div', [el('small', [text(r.label)], 'ah-k'), el('b', [text(String(r.value))], 'ah-v')], 'ah-fact')), 'ah-facts')
  ], 'ah-hero ah-hours')
}

/** The hero for a /glide focus card, or undefined for any other card. */
export function attentionHero(d: EuiHostCardData, el: El): EuiNode | undefined {
  return d.app === FOCUS_APP ? focus(d, el) : d.app === DIGEST_APP ? digest(d, el) : d.app === WIND_APP ? wind(d, el)
    : d.app === HOURS_APP ? hours(d, el) : undefined
}

export const ATTENTION_CSS = `
[data-eui='card'] .ah-hero { position: relative; margin: 0 0 12px; padding: 14px; border: 1px solid var(--h-border); border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0)), var(--h-muted); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); overflow: hidden; }
[data-eui='card'] .ah-focus { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 18px; }
[data-eui='card'] .ah-ring { position: relative; flex: none; width: 132px; height: 132px; }
[data-eui='card'] .ah-ringsvg { position: absolute; left: 0; top: 0; }
[data-eui='card'] .ah-ringlabel { position: absolute; left: 0; right: 0; top: 34px; display: flex; flex-direction: column; align-items: center; }
[data-eui='card'] .ah-big { font-size: 44px; line-height: 48px; font-weight: 600; letter-spacing: -.04em; color: var(--h-fg); }
[data-eui='card'] .ah-live .ah-big { color: var(--h-fg); }
[data-eui='card'] .ah-cap { font: 11px/1.4 var(--h-mono); color: var(--h-fg); opacity: .85; }
[data-eui='card'] .ah-side { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
[data-eui='card'] .ah-status { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: var(--h-fg); }
[data-eui='card'] .ah-led { flex: none; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--h-mutedFg); }
[data-eui='card'] .ah-led.ah-on { background: var(--h-primary); animation: ah-pulse 1.6s ease-in-out infinite; }
[data-eui='card'] .ah-facts { display: flex; gap: 6px; }
[data-eui='card'] .ah-fact { flex: 0 1 152px; min-width: 0; padding: 6px 8px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ah-k { display: block; font: 700 10px/1.3 var(--h-mono); color: var(--h-fg); opacity: .8; text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ah-v { display: block; font-size: 13px; line-height: 1.35; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ah-pill { align-self: flex-start; font: 600 11px/1.4 var(--h-mono); padding: 2px 10px; border: 1px solid var(--h-border); border-radius: 999px; color: var(--h-fg); }
[data-eui='card'] .ah-pill.ah-held { border-color: var(--h-fg); color: var(--h-fg); }
[data-eui='card'] .ah-digest { display: flex; align-items: flex-start; gap: 14px; }
[data-eui='card'] .ah-title { flex: 1; min-width: 0; font-size: 15px; line-height: 1.4; color: var(--h-fg); }
[data-eui='card'] .ah-cls { flex: none; font: 700 10px/1.2 var(--h-mono); padding: 2px 6px; border-radius: 999px; border: 1px solid var(--h-mutedFg); color: var(--h-fg); text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ah-c-decision { border-color: var(--h-fg); }
[data-eui='card'] .ah-tile { flex: none; width: 96px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 0 12px; border: 1px solid var(--h-border); border-radius: 12px; background: var(--h-bg); animation: ah-land .9s ease-out both; }
[data-eui='card'] .ah-tile.ah-none { border-style: dashed; }
[data-eui='card'] .ah-tile.ah-none .ah-big { color: var(--h-mutedFg); }
[data-eui='card'] .ah-list { flex: 1; min-width: 0; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
[data-eui='card'] .ah-item { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; }
[data-eui='card'] .ah-item + .ah-item { border-top: 1px solid var(--h-border); }
[data-eui='card'] .ah-daysvg { display: block; width: 100%; }
[data-eui='card'] .ah-hours .ah-facts { margin-top: 8px; }
[data-eui='card'] .ah-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0 10px; }
[data-eui='card'] .ah-leg { display: flex; align-items: center; gap: 5px; font: 12px/1.3 var(--h-mono); color: var(--h-fg); }
[data-eui='card'] .ah-sw { display: inline-block; width: 10px; height: 10px; border-radius: 4px; }
[data-eui='card'] .ah-sw-best { background: var(--h-primary); }
[data-eui='card'] .ah-sw-wind { background: var(--h-mutedFg); opacity: .6; }
[data-eui='card'] .ah-sw-now { width: 2px; background: var(--h-fg); }
[data-eui='card'] .ah-sw-bed { border: 2px solid var(--h-fg); border-radius: 50%; box-sizing: border-box; }
[data-eui='card'] .ah-note { padding: 10px 12px; border: 1px solid var(--h-border); border-left: 3px solid var(--h-mutedFg); border-radius: 8px; background: var(--h-bg); }
[data-eui='card'] .ah-quote { margin: 6px 0; font-size: 15px; line-height: 1.4; font-weight: 600; color: var(--h-fg); }
@keyframes ah-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }
@keyframes ah-land { 0%, 50% { transform: scale(.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  [data-eui='card'] .ah-hero * { animation: none; }
}
`
