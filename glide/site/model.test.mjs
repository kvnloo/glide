// node --test glide/site/model.test.mjs: the landing demo's state machine, without a browser.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ASKS, BLOCK_MINUTES, CORRECTIONS, THEMES, TOUR, findAction, initialState, key, pick, press, rank, submit, tick } from './model.js'

const last = s => s.cards.at(-1)
const run = (s, actionId) => press(s, findAction(s, actionId).id, actionId)

test('recall before memory is built asks for /glide first', () => {
  const s = submit(initialState(), '/glide recall frontend')
  assert.equal(last(s).kind, 'notice')
  assert.match(last(s).text, /Build memory first|approve Build memory/)
})

test('detect, build memory and turn on walk the approval flow', () => {
  let s = submit(initialState(), '/glide')
  assert.equal(s.cards[0].kind, 'user')
  assert.deepEqual(last(s).actions.map(a => a.id), ['build'])
  s = run(s, 'build')
  assert.equal(s.memory, 'built')
  assert.equal(s.cards[1].settled, true, 'the pressed card loses its buttons')
  assert.deepEqual(s.cards[1].actions, [])
  assert.match(last(s).lead, new RegExp(`${CORRECTIONS.length} corrections`))
  s = run(s, 'enable')
  assert.equal(s.recall, true)
  assert.equal(findAction(s, 'enable'), undefined)
  const again = submit(s, '/glide')
  assert.deepEqual(last(again).actions, [], 'Detect offers nothing once recall is on')
})

test('a settled button cannot be pressed twice', () => {
  let s = submit(initialState(), '/glide')
  const id = last(s).id
  s = press(s, id, 'build')
  const count = s.cards.length
  assert.equal(press(s, id, 'build'), s)
  assert.equal(s.cards.length, count)
})

test('recall ranks the frontend correction first and returns at most three', () => {
  const hits = rank('frontend')
  assert.equal(hits[0].id, 'c1')
  assert.ok(hits.length <= 3)
  assert.deepEqual(rank('zebra'), [])
  assert.ok(rank('commit push main').length <= 3)
  let s = run(submit(initialState(), '/glide'), 'build')
  s = submit(s, '/glide recall frontend')
  assert.equal(last(s).quotes[0].text, CORRECTIONS[0].text)
  assert.equal(last(s).pill.label, '1 MATCH')
})

test('/glide off turns recall off', () => {
  let s = run(run(submit(initialState(), '/glide'), 'build'), 'enable')
  s = submit(s, '/glide off')
  assert.equal(s.recall, false)
  assert.match(last(submit(s, '/glide off')).text, /already off/)
})

test('a deep-work block holds non-critical asks, passes critical ones and ends in one digest', () => {
  let s = run(submit(initialState(), '/glide focus'), 'start')
  assert.deepEqual(s.block, { elapsed: 0 })
  s = tick(s, 30)
  const critical = ASKS.filter(a => a.critical && a.at <= 30)
  const held = ASKS.filter(a => !a.critical && a.at <= 30)
  assert.equal(s.held.length, held.length)
  assert.equal(s.cards.filter(c => c.kind === 'notice' && c.tone === 'bad').length, critical.length)
  s = run(s, 'end')
  assert.equal(s.block, null)
  assert.deepEqual(last(s).quotes.map(q => q.text), held.map(a => a.text))
  assert.equal(last(s).pill.label, `${held.length} HELD`)
  assert.equal(s.cards.find(c => c.title === 'Deep-work block').pill.label, 'DONE')
})

test('a block ends by itself at its length', () => {
  let s = run(submit(initialState(), '/glide focus'), 'start')
  s = tick(s, BLOCK_MINUTES + 10)
  assert.equal(s.block, null)
  assert.equal(last(s).title, 'Digest')
  assert.equal(s.cards.filter(c => c.title === 'Digest').length, 1)
})

test('the theme picker previews on arrows, keeps on Enter and restores on Escape', () => {
  let s = submit(initialState(), '/theme')
  assert.equal(THEMES[s.picker.index].id, 'dash')
  s = key(s, 'ArrowDown')
  assert.equal(s.theme, THEMES[0].id, 'wraps to the top')
  s = key(s, 'Escape')
  assert.equal(s.theme, 'dash')
  assert.equal(s.picker, null)
  s = key(pick(submit(s, '/theme'), 1), 'Enter')
  assert.equal(s.theme, 'nous')
  assert.match(last(s).text, /Nous/)
})

test('unknown input gets a pointer to /help, and /help lists the commands', () => {
  assert.match(last(submit(initialState(), 'hello')).text, /slash commands/)
  assert.match(last(submit(initialState(), '/nope')).text, /\/help/)
  assert.ok(last(submit(initialState(), '/help')).rows.length >= 5)
  assert.equal(submit(initialState(), '   ').cards.length, 0)
})

test('the scripted tour runs end to end on the model', () => {
  let s = initialState()
  for (const step of TOUR) {
    if (step.type === 'submit') s = submit(s, step.text)
    else if (step.type === 'press') s = run(s, step.action)
    else s = tick(s, step.minutes)
  }
  assert.equal(s.recall, true)
  assert.equal(last(s).title, 'Digest')
})
