import { digest, freeze, requireInput, LIMITS, MAX_SOURCE_BYTES } from './catalog.mjs';

// glide/v1: the model composes a Glide card from host-owned slots. Every leaf names one slot key the
// host put in the card document, and the slot's own component must match the call, so a program can
// arrange, omit and reorder what the host measured but never author a value. The frontend draws the
// bound tree with native Tern kinds in the ephemeral-ui kit's look (frontend/src/glideui/render.tsx).
const slot = (name, description) => ({ signature: `${name}(slot: string)`, description, properties: { slot: { type: 'string' } } });
export const GLIDE_LEAVES = Object.freeze({
  Hero: 'The one big figure or word the card answers with, and its label.',
  Stats: 'Two to four small labelled figures in a row.',
  Text: 'One sentence of host prose.',
  Spark: 'A trend line over a series, with a one-line summary.',
  Bars: 'Bars comparing a few values.',
  Meter: 'One labelled 0..1 fill, such as a budget left.',
  Table: 'Rows of facts with aligned columns; meter columns draw fills.',
  Kv: 'Label and value pairs.',
  List: 'Numbered rows with a detail line and a value; rows may open details.',
  Tabs: 'The card\'s tab strip. Picking a tab asks the host for that view.',
  Badges: 'Short state chips.',
  Steps: 'An ordered plan with each step\'s state.',
  Flow: 'A left-to-right pipeline of stages, such as lanes from ask to receipt.',
  Buttons: 'The card\'s host actions. Approval and execution stay with the host.',
  Graphic: 'A host-drawn instrument such as a waveform, ring or day band.',
});
export const GLIDE_CATALOG = freeze({
  GlideCard: {
    signature: 'GlideCard(snapshotId: string, parts: Component[])',
    description: 'Root. Select the host card document by key and its parts in display order. Never invent keys or data.',
    properties: { snapshotId: { type: 'string' }, parts: { type: 'array', items: {} } },
  },
  Section: {
    signature: 'Section(slot: string, parts: Component[])',
    description: 'A titled group; its title and count come from the slot.',
    properties: { slot: { type: 'string' }, parts: { type: 'array', items: {} } },
  },
  Row: {
    signature: 'Row(parts: Component[])',
    description: 'Two or three parts side by side, such as a Spark beside a Hero.',
    properties: { parts: { type: 'array', items: {} } },
  },
  ...Object.fromEntries(Object.entries(GLIDE_LEAVES).map(([name, description]) => [name, slot(name, description)])),
});
const PARTS = Object.freeze(Object.keys(GLIDE_CATALOG).filter(name => name !== 'GlideCard'));
export const GLIDE_SCHEMA = freeze({
  properties: Object.fromEntries(Object.keys(GLIDE_CATALOG).map(name => [name, {}])),
  $defs: Object.fromEntries(Object.entries(GLIDE_CATALOG).map(([name, spec]) => [name, {
    type: 'object', additionalProperties: false, properties: spec.properties, required: Object.keys(spec.properties),
  }])),
});
export const GLIDE_LIBRARY = freeze({
  id: 'glide/v1', root: 'GlideCard', schema: GLIDE_SCHEMA,
  components: Object.fromEntries(Object.entries(GLIDE_CATALOG).map(([name, { signature, description }]) => [name, { signature, description }])),
});
export const GLIDE_LIBRARY_HASH = digest(JSON.stringify({ GLIDE_LIBRARY, LIMITS, MAX_SOURCE_BYTES }));

const key = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(value);

function element(node, names) {
  requireInput(node?.type === 'element' && names.includes(node.typeName) && node.partial === false && node.hasDynamicProps !== true,
    'element', 'Expected a complete static glide/v1 part.');
  const props = node.props;
  requireInput(props && typeof props === 'object' && !Array.isArray(props), 'props', 'Expected named component properties.');
  const expected = Object.keys(GLIDE_CATALOG[node.typeName].properties).sort();
  requireInput(JSON.stringify(Object.keys(props).sort()) === JSON.stringify(expected), 'props', `Unexpected ${node.typeName} properties.`);
  return props;
}

function part(node, depth) {
  requireInput(depth <= LIMITS.depth, 'depth', 'glide/v1 nesting is too deep.');
  const p = element(node, PARTS);
  const kids = list => {
    requireInput(Array.isArray(list) && list.length >= 1 && list.length <= 16, 'parts', `${node.typeName} needs 1 to 16 parts.`);
    return list.map(child => part(child, depth + 1));
  };
  if (node.typeName === 'Row') return { c: 'Row', parts: kids(p.parts) };
  requireInput(key(p.slot), 'slot', 'Use a slot key the host supplied.');
  return node.typeName === 'Section' ? { c: 'Section', slot: p.slot, parts: kids(p.parts) } : { c: node.typeName, slot: p.slot };
}

/** Selection and composition only: a card key and a tree of slot references. */
export function projectGlide(root) {
  const props = element(root, ['GlideCard']);
  requireInput(key(props.snapshotId), 'snapshot', 'Use a host-provided card key, not a path or URL.');
  requireInput(Array.isArray(props.parts) && props.parts.length >= 1 && props.parts.length <= 16, 'parts', 'Select 1 to 16 parts.');
  const parts = props.parts.map(node => part(node, 1));
  const used = [];
  const walk = p => { if (p.slot) used.push(p.slot); for (const child of p.parts ?? []) walk(child); };
  parts.forEach(walk);
  requireInput(new Set(used).size === used.length, 'slots', 'Each slot appears at most once.');
  return freeze({ snapshotId: props.snapshotId, parts });
}

export function bindGlideSelection(selection, source, context) {
  requireInput(typeof context?.scope === 'string' && context.scope.length > 0 && context.scope.length <= 256,
    'scope', 'A host-owned session/branch scope is required.');
  const handoff = {
    schema: 'native-visual-selection/v1', status: 'validated-not-verified',
    generator: { core: '@openuidev/lang-core@0.3.1', adapter: 'bounded-glide-selection/v1' },
    scope: context.scope, sourceHash: digest(source), libraryHash: GLIDE_LIBRARY_HASH,
    view: { kind: 'glide-card', snapshotId: selection.snapshotId, parts: selection.parts },
  };
  return freeze({ ...handoff, id: digest(JSON.stringify(handoff)) });
}

/**
 * Bind a validated selection to the host card document. Pure and synchronous, so a card re-binds on
 * every host update without re-parsing. Fails closed on a wrong card, a missing slot or a slot whose
 * component differs from the call. Slots the program omits are simply not drawn.
 */
export function bindGlide(view, doc) {
  requireInput(view?.kind === 'glide-card' && doc && typeof doc === 'object', 'view', 'Expected a glide-card selection and host document.');
  requireInput(view.snapshotId === doc.id, 'snapshot', `Program selects card ${view.snapshotId}, host has ${doc.id}.`);
  const take = (name, slotKey) => {
    const found = Object.hasOwn(doc.slots, slotKey) ? doc.slots[slotKey] : undefined;
    requireInput(found, 'slot', `Unknown slot: ${slotKey}.`);
    requireInput(found.c === name, 'slot', `Slot ${slotKey} is a ${found.c}, not a ${name}.`);
    return found.p;
  };
  const bind = p => {
    if (p.c === 'Row') return { type: 'element', typeName: 'Row', props: { children: p.parts.map(bind) } };
    if (p.c === 'Section') return { type: 'element', typeName: 'Section', props: { ...take('Section', p.slot), children: p.parts.map(bind) } };
    return { type: 'element', typeName: p.c, props: take(p.c, p.slot) };
  };
  const card = { title: doc.title, children: view.parts.map(bind) };
  for (const k of ['status', 'source', 'app']) if (doc[k] !== undefined) card[k] = doc[k];
  return { type: 'element', typeName: 'Card', props: card };
}
