import type { UiName, UiNode } from '../glideui/library.js'

/** One of every glide/v1 part. Kept synthetic for the native capture and regression tests. */
export const motionParts = {
  Card: { type: 'element', typeName: 'Card', props: { title: 'Atlas · live checks', status: 'running', children: [] } },
  Section: { type: 'element', typeName: 'Section', props: { title: 'Checks', aside: 'Live', children: [] } },
  Row: { type: 'element', typeName: 'Row', props: { children: [] } },
  Hero: { type: 'element', typeName: 'Hero', props: { value: '1,248', label: 'Checks passed', detail: 'Synthetic atlas workspace' } },
  Stats: { type: 'element', typeName: 'Stats', props: { items: [{ label: 'Workers', value: '24' }, { label: 'Pass rate', value: '98.4%' }, { label: 'Elapsed', value: '12.50s' }] } },
  Text: { type: 'element', typeName: 'Text', props: { body: 'Build the UI, then watch the checks land.', tone: 'muted' } },
  Spark: { type: 'element', typeName: 'Spark', props: { points: [2, 3, 2, 5, 4, 6, 8, 7, 10], summary: 'Synthetic throughput' } },
  Bars: { type: 'element', typeName: 'Bars', props: { values: [14, 28, 20, 36, 42], labels: ['A', 'B', 'C', 'D', 'E'], summary: 'Checks per batch' } },
  Meter: { type: 'element', typeName: 'Meter', props: { label: 'Verification', value: 0.72, total: '72%', tone: 'accent' } },
  Table: { type: 'element', typeName: 'Table', props: { columns: [{ id: 'host', head: 'Host', grow: true }, { id: 'load', head: 'Load', meter: true }], rows: [{ id: 'atlas', cells: { host: 'atlas', load: 0.72 } }, { id: 'laptop', cells: { host: 'laptop', load: 0.44 } }] } },
  Kv: { type: 'element', typeName: 'Kv', props: { items: [{ k: 'Target', v: 'atlas' }, { k: 'Source', v: 'Synthetic' }] } },
  List: { type: 'element', typeName: 'List', props: { items: [{ id: '1', label: 'Typecheck', detail: 'No diagnostics', value: '124 checks' }, { id: '2', label: 'Lint', detail: 'No errors', value: '48 checks' }, { id: '3', label: 'End-to-end', detail: 'Running on atlas', badge: 'Live', tone: 'accent' }] } },
  Tabs: { type: 'element', typeName: 'Tabs', props: { active: 'all', items: [{ id: 'all', label: 'All', count: 24, intent: { action: 'all' } }, { id: 'live', label: 'Live', count: 3, intent: { action: 'live' } }] } },
  Badges: { type: 'element', typeName: 'Badges', props: { items: [{ text: 'Synthetic' }, { text: 'atlas', tone: 'accent' }] } },
  Steps: { type: 'element', typeName: 'Steps', props: { items: [{ id: 'build', text: 'Build', status: 'done' }, { id: 'test', text: 'Verify', status: 'active' }, { id: 'ship', text: 'Review', status: 'pending' }] } },
  Flow: { type: 'element', typeName: 'Flow', props: { stages: [{ id: 'ask', label: 'Ask' }, { id: 'build', label: 'Build', tone: 'accent' }, { id: 'verify', label: 'Verify' }] } },
  Buttons: { type: 'element', typeName: 'Buttons', props: { items: [{ label: 'Complete checks', primary: true, intent: { action: 'done' } }] } },
  Graphic: { type: 'element', typeName: 'Graphic', props: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="25" fill="none" stroke="#b99b67" stroke-width="2"/><path d="M32 7 A25 25 0 0 1 57 32" fill="none" stroke="#e8c58d" stroke-width="3"/></svg>', w: 64, h: 64, alt: 'Synthetic verification ring' } }
} satisfies { [K in UiName]: Extract<UiNode, { typeName: K }> }

export function motionCard(done = false, page = 0): UiNode {
  const p = motionParts
  const row = (...children: UiNode[]): UiNode => ({ ...p.Row, props: { children } })
  const children = page === 0
    ? [row(p.Hero, p.Stats), p.Meter, row(p.Spark, p.Bars), p.List, p.Buttons]
    : [p.Tabs, row(p.Table, p.Kv), row(p.Steps, p.Graphic), p.Flow, p.Badges, p.Text, p.Buttons]
  return { ...p.Card, props: { ...p.Card.props, status: done ? 'done' : 'running', children } }
}
