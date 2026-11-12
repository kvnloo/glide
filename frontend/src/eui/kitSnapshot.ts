import type { EuiNode } from './sandbox.js'

/** Negative ids cannot collide with the sandbox's positive element ids. */
export function kitSnapshot(node: EuiNode | null, notes: readonly string[], refresh: boolean, refreshing: boolean, error?: string): EuiNode {
  let id = -2
  const text = (text: string): EuiNode => ({ t: 'text', text })
  const el = (tag: string, kids: readonly EuiNode[], attrs: Record<string, string> = {}): EuiNode => ({
    t: 'el', tag, id: id--, cls: '', style: '', attrs, click: false, kids
  })
  return el('div', [
    ...(node ? [node] : [el('p', [text(error ? 'Card unavailable' : 'Loading card…')], { role: 'status' })]),
    ...notes.map(note => el('p', [text(note)], { 'data-fleet-note': '' })),
    ...(error ? [el('p', [text(error)], { role: 'status' })] : []),
    ...(refresh ? [{ t: 'el', tag: 'button', id: -1, cls: 'eu-btn', style: '',
      attrs: { title: 'Reload this snapshot', ...(refreshing ? { disabled: 'true' } : {}) },
      click: !refreshing, kids: [text(refreshing ? 'Refreshing…' : 'Refresh')] } satisfies EuiNode] : [])
  ])
}
