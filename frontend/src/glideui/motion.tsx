import { html, type JSX, ui } from '@stencil-hq/tern'

import { CRITICAL_EASE, criticalProgress, NORMAL_MOTION_MS } from '../../../glide/frontend/motion.js'
import type { UiNode, UiTone } from './library.js'

export const MOTION_SHEET = 'glide-motion'
const FRAMES = 16
const FRAME_MS = NORMAL_MOTION_MS.enter / (FRAMES - 1)

/** Only a single formatted figure, never clocks, ranges, versions or prose. */
export function countFrames(value: string): string[] {
  const match = /^([\p{Sc}+−-]?)(-?\d+(?:,\d{3})*(?:\.\d+)?)(\s*(?:%|×|[kKmMbB]|ms|s|GB|MB|KB|px|checks|commits)?)$/u.exec(value)
  if (!match) return []
  const [, prefix = '', digits = '', suffix = ''] = match
  const target = Number(digits.replaceAll(',', ''))
  if (!Number.isFinite(target)) return []
  const decimals = digits.split('.')[1]?.length ?? 0
  if (decimals > 6) return []
  return Array.from({ length: FRAMES }, (_, i) => {
    if (i === FRAMES - 1) return value
    const scaled = target * (i === 0 ? 0 : criticalProgress(i / (FRAMES - 1)))
    const [whole = '', fraction] = scaled.toFixed(decimals).split('.')
    const formatted = digits.includes(',') ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole
    return `${prefix}${formatted}${fraction === undefined ? '' : '.' + fraction}${suffix}`
  })
}

/** Terminal parents win over a stale active child. */
export function liveCard(n: UiNode): boolean {
  switch (n.typeName) {
    case 'Card':
      if (n.props.status === 'done' || n.props.status === 'error') return false
      return n.props.status === 'running' || n.props.status === 'pending' || n.props.children.some(liveCard)
    case 'Row':
    case 'Section': return n.props.children.some(liveCard)
    case 'Steps': return n.props.items.some(s => s.status === 'active')
    default: return false
  }
}

/** Final text reserves the layout; hidden samples never enter the accessibility tree. */
export function figure(value: string, role: string, tone?: UiTone, entrance = true): JSX.Element {
  const frames = entrance ? countFrames(value) : []
  if (!frames.length) return ui.text({ key: 'v', role, text: value, ...(tone ? { tone } : {}) })
  return html.span({ key: 'v', role, class: 'glide-count', aria: value, ...(tone ? { tone } : {}) }, [
    html.span({ key: 'final', class: 'glide-count-final' }, value),
    ...frames.slice(0, -1).map((text, i) => html.span({ key: `f${i}`, class: `glide-count-frame glide-count-f${i}`, attrs: { 'aria-hidden': 'true' } }, text))
  ])
}

const ROOT = '[data-glide-motion]'
const LIVE = "[data-glide-motion='live']"
const ENTER = "[data-glide-enter='yes']"
const ROWS = [
  "[data-role='glide.body']>*", "[data-role='glide.list']>*", "[data-role='glide.flow.row']>*",
  "[data-role='glide.table'] .sf-tbl-body>.sf-tbl-row", "[data-role='glide.steps'] .sf-ck-item", "[data-role='glide.kv']>.sf-kv-item"
]
const ROW_ENTRANCES = ROWS.map(selector => `${ENTER} ${selector}`).join(',')

/** Separate from untrusted widget markup checks: only this host-owned sheet may animate cards. */
export const MOTION_CSS = `
${ROOT}{position:relative;--glide-ease:${CRITICAL_EASE}}
${ROOT} [data-role='omp.btn']{box-shadow:none!important}
${ENTER}::before{content:"";position:absolute;inset:0;pointer-events:none;border:1px solid var(--l3);border-radius:8px;transform-origin:left top;animation:glide-outline ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) both}
${ENTER}>[data-role='glide.card']{animation:glide-shell ${NORMAL_MOTION_MS.fade}ms var(--glide-ease) both}
${ROW_ENTRANCES},${ENTER} [data-role='glide.source']{animation:glide-reveal ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) backwards}
${ENTER} [data-role='glide.bars'] .bars>.b{transform-origin:center bottom;animation:glide-bar ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) backwards}
${ENTER} .sf-mt-fill{transform-origin:left center;animation:glide-grow ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) backwards}
${ENTER} [data-role='glide.spark'],${ENTER} [data-role='glide.graphic']{animation:glide-reveal ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) backwards}
${ROOT} .glide-count{position:relative;display:inline-block;white-space:nowrap;font-variant-numeric:tabular-nums}
${ROOT} .glide-count-final{animation:glide-count-final ${NORMAL_MOTION_MS.enter}ms step-end backwards}
${ROOT} .glide-count-frame{position:absolute;left:0;top:0;opacity:0;pointer-events:none;animation:glide-count-frame ${FRAME_MS}ms step-end}
${Array.from({ length: FRAMES - 1 }, (_, i) => `${ROOT} .glide-count-f${i}{animation-delay:${i * FRAME_MS}ms}`).join('\n')}
${LIVE} [data-role='glide.meter'] .sf-mt-track{position:relative;overflow:hidden}
${LIVE} [data-role='glide.meter'] .sf-mt-track::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 35%,color-mix(in srgb,var(--sf-accent) 12%,transparent) 50%,transparent 65%);animation:glide-shimmer 3200ms var(--glide-ease) 700ms infinite}
${LIVE} [data-role='glide.spark']{animation:glide-drift 4200ms ease-in-out 700ms infinite}
${ENTER}${LIVE} [data-role='glide.spark']{animation:glide-reveal ${NORMAL_MOTION_MS.enter}ms var(--glide-ease) backwards,glide-drift 4200ms ease-in-out 700ms infinite}
${LIVE}::after{content:"";position:absolute;top:12px;right:12px;width:5px;height:5px;border-radius:50%;background:var(--sf-accent);pointer-events:none;animation:glide-tick 2800ms ease-in-out 700ms infinite}
@keyframes glide-outline{from{opacity:0;transform:scaleX(.02)}to{opacity:1;transform:scaleX(1)}}
@keyframes glide-shell{from{opacity:0}to{opacity:1}}
@keyframes glide-reveal{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@keyframes glide-grow{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
@keyframes glide-bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes glide-count-frame{from{opacity:1}to{opacity:0}}
@keyframes glide-count-final{from{opacity:0}to{opacity:1}}
@keyframes glide-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes glide-drift{0%,100%{transform:translateX(0)}50%{transform:translateX(1px)}}
@keyframes glide-tick{0%,100%{opacity:.45}50%{opacity:.8}}
@media (prefers-reduced-motion: reduce){
${ROW_ENTRANCES},${ENTER} [data-role='glide.source'],${ENTER} [data-role='glide.spark'],${ENTER}${LIVE} [data-role='glide.spark'],${ENTER} [data-role='glide.graphic']{animation:glide-shell ${NORMAL_MOTION_MS.fade}ms var(--glide-ease) both}
${ENTER} [data-role='glide.bars'] .bars>.b,${ENTER} .sf-mt-fill,${LIVE}:not(${ENTER}) [data-role='glide.spark'],${ROOT} .glide-count-final{animation:none}
${ROOT} .glide-count-frame{display:none!important}
${ROOT} .glide-count-final{opacity:1!important}
${ROOT}::before,${ROOT}::after,${LIVE} [data-role='glide.meter'] .sf-mt-track::after{display:none!important}
}
`
