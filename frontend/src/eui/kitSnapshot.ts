import type { EuiNode } from './sandbox.js'

/** Negative ids cannot collide with the sandbox's positive element ids. */
export function kitSnapshot(node: EuiNode | null, notes: readonly string[], refresh: boolean, refreshing: boolean, error?: string): EuiNode {
  let id = -2
  const text = (text: string): EuiNode => ({ t: 'text', text })
  const el = (tag: string, kids: readonly EuiNode[], attrs: Record<string, string> = {}, style = ''): EuiNode => ({
    t: 'el', tag, id: id--, cls: '', style, attrs, click: false, kids
  })
  const button: EuiNode[] = refresh ? [{ t: 'el', tag: 'button', id: -1, cls: 'eu-btn', style: 'flex:none',
    attrs: { title: 'Reload this snapshot', ...(refreshing ? { disabled: 'true' } : {}) },
    click: !refreshing, kids: [text(refreshing ? 'Refreshing…' : 'Refresh')] }] : []
  // The last note and Refresh share one row under the card, so a capped card's head stays on screen.
  const last = notes.at(-1)
  return el('div', [
    ...(node ? [node] : [el('p', [text(error ? 'Card unavailable' : 'Loading card…')], { role: 'status' })]),
    ...notes.slice(0, -1).map(note => el('p', [text(note)], { 'data-fleet-note': '' })),
    ...(error ? [el('p', [text(error)], { role: 'status' })] : []),
    ...(last === undefined ? button : [el('div', [el('p', [text(last)], { 'data-fleet-note': '' }, 'flex:1;min-width:0;margin:0'), ...button], {},
      'display:flex;align-items:center;gap:12px')])
  ])
}
