// The design checks a widget passes before it mounts (kvnloo/glide#326 c), in code rather than in a
// prompt: text at 11 px or more, no glow or particle effects, readable inks, and parts that fit the slot.
// Each returns the problems it found; an empty list passes.

import { contrastRatio } from '../hermes/theme.js'
import type { WalPalette } from '../../../glide/frontend/wal.js'

import type { UiName, UiNode } from './library.js'
import type { WidgetSlot } from './mounts.js'

export const MIN_TEXT_PX = 11
export const TEXT_FLOOR = 4.5

const GLOW = /(box|text)-shadow|drop-shadow|blur\(|@keyframes|animation|<filter|feGaussianBlur|<animate/i

/** A stylesheet or SVG: every font-size in px at least MIN_TEXT_PX, and nothing that glows or moves. */
export function checkMarkup(text: string, where: string): string[] {
  const problems: string[] = []
  for (const m of text.matchAll(/font-size\s*[:=]\s*"?(\d+(?:\.\d+)?)(px)?/gi)) {
    if (Number(m[1]) < MIN_TEXT_PX) problems.push(`${where}: text at ${m[1]} px is under ${MIN_TEXT_PX} px`)
  }
  const glow = GLOW.exec(text)
  if (glow) problems.push(`${where}: ${glow[0]} is a glow or motion effect`)
  return problems
}

/** What each slot holds: the composer ring is one strip, so only figures and a fill. */
const SLOT_PARTS: Record<WidgetSlot, { max: number; only?: readonly UiName[] }> = {
  'above-composer': { max: 6 },
  'below-composer': { max: 6 },
  'composer-ring': { max: 3, only: ['Meter', 'Hero', 'Text', 'Badges', 'Graphic'] }
}

/** A bound tree for `slot`: its part count, its kinds and its host graphics. */
export function checkTree(tree: UiNode, slot: WidgetSlot): string[] {
  const problems: string[] = []
  const rule = SLOT_PARTS[slot]
  const leaves: UiNode[] = []
  const walk = (n: UiNode) => {
    if (n.typeName === 'Card' || n.typeName === 'Row' || n.typeName === 'Section') n.props.children.forEach(walk)
    else leaves.push(n)
  }
  walk(tree)
  if (leaves.length > rule.max) problems.push(`${slot} holds at most ${rule.max} parts, the program has ${leaves.length}`)
  for (const n of leaves) {
    if (rule.only && !rule.only.includes(n.typeName)) problems.push(`${slot} cannot hold a ${n.typeName}; use ${rule.only.join(', ')}`)
    if (n.typeName === 'Graphic') problems.push(...checkMarkup(n.props.svg, n.props.alt))
  }
  return problems
}

/** The surface's inks: text, muted, dim and accent at TEXT_FLOOR over the background and the card layer. */
export function checkPalette(p: WalPalette): string[] {
  const problems: string[] = []
  for (const ink of ['fg', 'muted', 'dim', 'accent'] as const) {
    for (const [name, under] of [['background', p.bg], ['card', p.layers[0]]] as const) {
      const ratio = contrastRatio(p[ink], under) ?? 0
      if (ratio < TEXT_FLOOR) problems.push(`${ink} ${p[ink]} on the ${name} ${under} is ${ratio.toFixed(2)}:1, under ${TEXT_FLOOR}:1`)
    }
  }
  return problems
}
