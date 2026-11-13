import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLIDE_CATALOG, bindGlide, projectGlide } from '../src/glide.mjs';
import { createGenerationAdapter } from '../src/adapter.mjs';

process.env.OPENUI_TELEMETRY_DISABLED = '1';
const element = (typeName, props = {}) => ({ type: 'element', typeName, props, partial: false, hasDynamicProps: false });
const bad = (fn, code) => assert.throws(fn, error => error.code === code, `expected ${code}`);
const context = { scope: 'session-a:branch-a' };
const doc = {
  id: 'intel', title: 'Local intelligence', source: 'Source: /intel',
  slots: {
    'hill': { c: 'Section', p: { title: 'Hill climbs', aside: '5 climbs' } },
    'hill.trend': { c: 'Spark', p: { points: [0.4, 0.92], summary: 'best 0.92' } },
    'hill.best': { c: 'Hero', p: { value: '0.92', label: 'Orb feel' } },
  },
};

test('the real OpenUI parser compiles a glide/v1 program into slot references only', async () => {
  const adapter = await createGenerationAdapter({ library: 'glide' });
  assert.match(adapter.prompt, /GlideCard\(snapshotId: string, parts: Component\[\]\)/);
  const source = 'root = GlideCard("intel", [hill])\nhill = Section("hill", [Row([Spark("hill.trend"), Hero("hill.best")])])';
  const handoff = adapter.compile(source, context);
  assert.equal(handoff.status, 'validated-not-verified');
  assert.deepEqual(handoff.view, { kind: 'glide-card', snapshotId: 'intel', parts: [
    { c: 'Section', slot: 'hill', parts: [{ c: 'Row', parts: [{ c: 'Spark', slot: 'hill.trend' }, { c: 'Hero', slot: 'hill.best' }] }] },
  ] });
  const card = bindGlide(handoff.view, doc);
  assert.equal(card.typeName, 'Card');
  assert.equal(card.props.source, 'Source: /intel');
  assert.deepEqual(card.props.children[0].props.children[0].props.children[1].props, { value: '0.92', label: 'Orb feel' });
});

test('a program cannot author data: objects, numbers as values and extra props are rejected', async () => {
  const adapter = await createGenerationAdapter({ library: 'glide' });
  assert.throws(() => adapter.compile('root = GlideCard("intel", [Hero({value: "9.9"})])', context));
  bad(() => projectGlide(element('GlideCard', { snapshotId: 'intel', parts: [element('Hero', { slot: 'hill.best', value: '9.9' })] })), 'props');
  bad(() => projectGlide(element('GlideCard', { snapshotId: 'intel', parts: [element('Hero', { slot: '/etc/passwd' })] })), 'slot');
  bad(() => projectGlide(element('GlideCard', { snapshotId: 'intel', parts: [element('GlideCard', { snapshotId: 'x', parts: [] })] })), 'element');
});

test('each slot at most once', () => bad(() => projectGlide(element('GlideCard', { snapshotId: 'intel', parts: [
  element('Hero', { slot: 'hill.best' }), element('Hero', { slot: 'hill.best' })] })), 'slots'));

test('binding fails closed on the wrong card, an unknown slot or a mismatched component', () => {
  const view = (parts, snapshotId = 'intel') => ({ kind: 'glide-card', snapshotId, parts });
  bad(() => bindGlide(view([{ c: 'Hero', slot: 'hill.best' }], 'fleet'), doc), 'snapshot');
  bad(() => bindGlide(view([{ c: 'Hero', slot: 'nope' }]), doc), 'slot');
  bad(() => bindGlide(view([{ c: 'Spark', slot: 'hill.best' }]), doc), 'slot');
  bad(() => bindGlide(view([{ c: 'Hero', slot: 'constructor' }]), doc), 'slot');
});

test('every catalog leaf takes exactly one slot key', () => {
  for (const [name, spec] of Object.entries(GLIDE_CATALOG)) {
    if (['GlideCard', 'Section', 'Row'].includes(name)) continue;
    assert.deepEqual(Object.keys(spec.properties), ['slot'], name);
  }
});

test('shipped default programs compile', async () => {
  const adapter = await createGenerationAdapter({ library: 'glide' });
  const programs = JSON.parse(readFileSync(new URL('../fixtures/glide-programs.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(programs).length > 0);
  for (const [name, source] of Object.entries(programs)) assert.equal(adapter.compile(source, context).view.kind, 'glide-card', name);
});
