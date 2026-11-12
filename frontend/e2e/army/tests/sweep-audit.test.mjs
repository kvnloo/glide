import test from 'node:test';
import assert from 'node:assert/strict';
import { colors, controlOutcome, canaryRecall } from '../sweep-audit.mjs';

test('contrast composites translucent foregrounds instead of treating them as opaque', () => {
  const c = colors();
  assert.equal(c.contrast([0,0,0,1], [255,255,255,1]), 21);
  assert.equal(c.contrast([255,255,255,1], [255,255,255,1]), 1);
  assert.ok(c.contrast(c.over([0,0,0,.1], [255,255,255,1]), [255,255,255,1]) < 1.3);
});
test('CSS color-mix sRGB channels are normalized, not byte values', () => {
  assert.deepEqual(colors().parse('color(srgb 1 0.5 0 / 0.25)'), [255,127.5,0,.25]);
});
test('changing a checkbox or select value alone is not visible app feedback', () => {
  assert.equal(controlOutcome({before:'same', after:'same', intents:[], navigation:false}), 'dead');
  assert.equal(controlOutcome({before:'one', after:'two', intents:[], navigation:false}), 'dom-change');
  assert.equal(controlOutcome({before:'same', after:'same', intents:[{action:'open-chat'}], navigation:false}), 'intent');
});
test('recall requires a matching detector and selector, not a goal or title mentioning a seed', () => {
  const result = canaryRecall('sweep-themes', [
    {check:'surface', selector:'.fh-head', canary:'black-light-surface'},
    {check:'clipped-text', selector:'.fh-title', canary:'phone-clipped-label'},
    {check:'data-consistency', selector:'.fh-count', canary:'wrong-stat'},
  ]);
  assert.equal(result.recall, 1);
  assert.deepEqual(result.missed, []);
  assert.equal(canaryRecall('sweep-clicks', [{title:'dead-button'}]).recall, 0);
  assert.equal(canaryRecall('sweep-console', []).recall, null);
});
