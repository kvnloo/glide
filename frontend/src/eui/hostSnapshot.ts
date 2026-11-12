// Host data uses the existing EuiNode -> Tern renderer; the demo kit never sees an operation.
import { attentionHero } from '../../../glide/frontend/attentionCards.js'
import { intentDoneLabel, intentHero } from '../../../glide/frontend/intentCards.js'
import type { EuiHostCardData } from '../wire/euiHostCard.js'

import type { EuiNode } from './sandbox.js'

export type HostCardStatus = 'pending' | 'running' | 'done' | 'failed'
export const HOST_APPROVE_ID = 1

/** Only plain text and a fixed native button; no model-supplied markup, style or link targets. */
export function hostSnapshot(data: EuiHostCardData, status: HostCardStatus): EuiNode {
  let next = 2
  const text = (value: string): EuiNode => ({ t: 'text', text: value })
  const el = (tag: string, kids: readonly EuiNode[], cls = '', attrs: Record<string, string> = {}): EuiNode => ({
    t: 'el', tag, id: next++, cls, style: '', attrs, click: false, kids
  })
  const attention = attentionHero(data, el)
  const hero = intentHero(data, el) ?? attention
  // The focus card's Start/End block is the same rich button as the contract's hold to approve.
  const hold = data.kind === 'intent-contract' || (attention !== undefined && data.approval !== undefined)
  // The declare hero sets the ask and its clause keys; the contract hero draws every row (criteria,
  // lanes, hosts, gate, budget). A paragraph or list under either would repeat it.
  // Attention heroes draw all their rows and keep the summary as the source line.
  const drawn = attention !== undefined || (hero !== undefined && (hold || data.kind === 'intent-declare'))
  // The title is a head row above the box, as omp heads its tool cards (name, then target).
  const head = el('div', [el('span', [text('Glide')], 'eui-host-name'), el('span', [text(data.title)], 'eui-host-title')], 'eui-host-head')
  const kids: EuiNode[] = [
    ...(hero ? [hero] : []),
    ...(data.summary === undefined || (drawn && !hold && !attention) ? [] : [el('p', [text(data.summary)])]),
    ...(drawn ? [] : [el('dl', data.rows.flatMap(row => [
      el('dt', [text(row.label)]),
      el('dd', [text(String(row.value))])
    ]), 'eui-host-rows')])
  ]
  if (data.approval) {
    kids.push(el('p', [text(data.approval.description)], 'eui-host-operation'))
    kids.push({
      t: 'el', tag: 'button', id: HOST_APPROVE_ID, cls: hold ? 'eu-btn eui-host-approve ih-hold' : 'eu-btn eui-host-approve', style: '',
      attrs: { 'data-eui-action': 'approve', ...(status === 'pending' ? {} : { disabled: 'true' }) },
      click: status === 'pending',
      kids: [...(hold ? [el('i', [], 'ih-holdfill')] : []), text(status === 'pending' ? data.approval.label
        : status === 'running' ? 'Running…'
          : status === 'done' ? intentDoneLabel(data) ?? 'Completed' : 'Failed · approval used')]
    })
  }
  return el('div', [head, el('section', kids, 'eu-card eui-host')])
}
