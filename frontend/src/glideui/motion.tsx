import { html, type JSX, ui } from '@stencil-hq/tern'

import type { UiNode, UiTone } from './library.js'

export const MOTION_SHEET = 'glide-motion'
const FRAMES = 16
const LEAD_MS = 120
const FRAME_MS = 30

/** Samples cubic-bezier(0.45,0,0.1,1), including its non-linear time axis. */
function ease(time: number): number {
  let low = 0, high = 1
  for (let i = 0; i < 20; i++) {
    const t = (low + high) / 2
    const x = 3 * (1 - t) ** 2 * t * 0.45 + 3 * (1 - t) * t ** 2 * 0.1 + t ** 3
    if (x < time) low = t
    else high = t
  }
  const t = (low + high) / 2
  return 3 * (1 - t) * t ** 2 + t ** 3
}

/** Only a single formatted figure, never clocks, ranges, versions or prose. */
export function countFrames(value: string): string[] {
  const match = /^([\p{Sc}+−-]?)(-?\d+(?:,\d{3})*(?:\.\d+)?)(\s*(?:%|×|[kKmMbB]|ms|s|GB|MB|KB|px|checks|commits)?)$/u.exec(value)
  if (!match) return []
  const [, prefix = '', digits = '', suffix = ''] = match
  const target = Number(digits.replaceAll(',', ''))
  if (!Number.isFinite(target)) return []
  const decimals = digits.split('.')[1]?.length ?? 0
  return Array.from({ length: FRAMES }, (_, i) => {
    if (i === FRAMES - 1) return value
    const scaled = target * (i === 0 ? 0 : ease(i / (FRAMES - 1)))
    const fixed = scaled.toFixed(decimals)
    const formatted = digits.includes(',') ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : fixed
    return `${prefix}${formatted}${suffix}`
  })
}

/** Terminal parents win over a stale active child. Unlabelled snapshots do not idle. */
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
    ...frames.map((text, i) => html.span({ key: `f${i}`, class: `glide-count-frame glide-count-f${i}`, attrs: { 'aria-hidden': 'true' } }, text))
  ])
}

const ROOT = '[data-glide-motion]'
const LIVE = "[data-glide-motion='live']"
const ENTER = "[data-glide-enter='yes']"
const REVEAL = `${ENTER} [data-role='glide.body']>*`
const ROWS = `${ENTER} [data-role='glide.list']>*,${ENTER} [data-role='glide.flow.row']>*,${ENTER} .sf-table tbody>tr,${ENTER} .sf-checklist-item`

/** Separate from untrusted widget markup checks: only this host-owned sheet may animate cards. */
export const MOTION_CSS = `
${ROOT}{position:relative;--glide-ease:cubic-bezier(0.45,0,0.1,1)}
${ENTER}::before{content:"";position:absolute;inset:0;pointer-events:none;border:1px solid var(--l3);border-radius:8px;transform-origin:left top;animation:glide-outline 180ms var(--glide-ease) both}
${ENTER}>[data-role='glide.card']{animation:glide-shell 180ms var(--glide-ease) both}
${REVEAL},${ENTER} [data-role='glide.source']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards}
${ROWS}{animation:glide-reveal 400ms var(--glide-ease) 160ms backwards}
${Array.from({ length: 8 }, (_, i) => `${ENTER} [data-role='glide.body']>:nth-child(${i + 1}),${ENTER} [data-role='glide.list']>:nth-child(${i + 1}),${ENTER} .sf-table tbody>tr:nth-child(${i + 1}){animation-delay:${120 + i * 10}ms}`).join('\n')}
${ENTER} [data-role='glide.body']>:nth-child(n+9),${ENTER} [data-role='glide.list']>:nth-child(n+9),${ENTER} .sf-table tbody>tr:nth-child(n+9){animation-delay:200ms}
${ENTER} [data-role='glide.bars'] .bars>.b{transform-origin:center bottom;animation:glide-bar 480ms var(--glide-ease) 120ms backwards}
${ENTER} .sf-mt-fill{transform-origin:left center;animation:glide-grow 480ms var(--glide-ease) 120ms backwards}
${ENTER} [data-role='glide.spark'],${ENTER} [data-role='glide.graphic']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards}
${ROOT} .glide-count{position:relative;display:inline-block;white-space:nowrap;font-variant-numeric:tabular-nums}
${ROOT} .glide-count-final{animation:glide-count-final 600ms step-end backwards}
${ROOT} .glide-count-frame{position:absolute;left:0;top:0;opacity:0;pointer-events:none;animation:glide-count-frame ${FRAME_MS}ms step-end}
${Array.from({ length: FRAMES }, (_, i) => `${ROOT} .glide-count-f${i}{animation-delay:${LEAD_MS + i * FRAME_MS}ms}`).join('\n')}
${LIVE} [data-role='glide.meter'] .sf-mt-track{position:relative;overflow:hidden}
${LIVE} [data-role='glide.meter'] .sf-mt-track::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 35%,color-mix(in srgb,var(--sf-accent) 12%,transparent) 50%,transparent 65%);animation:glide-shimmer 3200ms var(--glide-ease) 700ms infinite}
${LIVE} [data-role='glide.spark']{animation:glide-drift 4200ms ease-in-out 700ms infinite}
${ENTER}${LIVE} [data-role='glide.spark']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards,glide-drift 4200ms ease-in-out 700ms infinite}
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
${ROOT},${ROOT} *,${ROOT}::before,${ROOT}::after,${ROOT} *::after{animation:none!important;transition:none!important;transform:none!important}
${ROOT} .glide-count-frame{display:none!important}
${ROOT} .glide-count-final{opacity:1!important}
${ROOT}::before,${ROOT}::after,${LIVE} [data-role='glide.meter'] .sf-mt-track::after{display:none!important}
}
`
