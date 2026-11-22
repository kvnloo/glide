// Draws model.js into the page and feeds it input: the composer, the chips, the approval buttons, the
// /theme picker's keys, the tour and the demo clock. All state changes go through the model.
import { BLOCK_MINUTES, SUGGESTIONS, THEMES, TOUR, findAction, initialState, key, pick, press, submit, tick } from './model.js'

const $ = sel => document.querySelector(sel)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const MINUTE_MS = 400 // one demo minute; a 50-minute block plays in 20 seconds

const win = $('[data-window]')
const log = $('[data-transcript]')
const empty = $('[data-empty]')
const input = $('[data-input]')
const chips = $('[data-chips]')
const picker = $('[data-picker]')
const mode = $('[data-mode]')
const clock = $('[data-clock]')
const tourButton = $('[data-tour]')

let state = initialState()
let timer = null
let touring = false

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue
    if (k === 'class') node.className = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else node.setAttribute(k, v === true ? '' : v)
  }
  for (const child of children.flat()) if (child !== null && child !== undefined) node.append(child)
  return node
}

function liveLead(card) {
  if (card.live !== 'block' || !state.block) return card.lead
  return `${BLOCK_MINUTES - state.block.elapsed} min left · ${state.held.length} ask${state.held.length === 1 ? '' : 's'} held. ${card.lead}`
}

function cardNode(card) {
  if (card.kind === 'user') return el('div', { class: 'msg user' }, el('code', {}, card.text))
  if (card.kind === 'notice') return el('div', { class: `msg notice tone-${card.tone}` }, card.text)
  const body = el('div', { class: 'box' },
    el('p', { class: 'card-lead' }, liveLead(card)),
    card.facts ? el('div', { class: 'facts' }, card.facts.map(f => el('span', { class: 'fact' }, f))) : null,
    card.rows ? el('dl', { class: 'rows' }, card.rows.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v)))) : null,
    card.bars ? el('div', { class: 'bars', role: 'img', 'aria-label': card.bars.map(b => `${b.label}: ${b.value}`).join(', ') },
      card.bars.map(b => el('div', { class: 'bar-col' },
        el('span', { class: 'bar-fill', style: `--v:${b.value / Math.max(...card.bars.map(sample => sample.value))}` }),
        el('span', { class: 'bar-label' }, b.label)))) : null,
    card.quotes ? el('ul', { class: 'quotes' }, card.quotes.map(q => el('li', {}, el('q', {}, q.text), el('span', { class: 'meta' }, q.meta)))) : null,
    card.actions.length ? el('div', { class: 'actions' }, card.actions.map(a =>
      el('button', { type: 'button', class: a.primary ? 'act primary' : 'act', 'data-action': a.id, onclick: () => act(card.id, a.id) }, a.label))) : null)
  return el('article', { class: `card${card.settled ? ' settled' : ''}`, 'data-card': card.title },
    el('header', { class: 'card-head' },
      el('span', { class: 'card-name' }, 'Glide'), el('span', { class: 'card-title' }, `· ${card.title}`),
      card.pill ? el('span', { class: `pill tone-${card.pill.tone}` }, card.pill.label) : null),
    body)
}

let drawn = 0
function render() {
  // Cards are appended once; a live card (the running block) and settled cards are redrawn in place.
  const nodes = log.querySelectorAll('[data-k]')
  state.cards.forEach((card, i) => {
    const existing = nodes[i]
    if (existing && existing.dataset.k === card.id && !card.live && existing.dataset.settled === String(Boolean(card.settled))) return
    const node = cardNode(card)
    node.dataset.k = card.id
    node.dataset.settled = String(Boolean(card.settled))
    if (existing) { node.classList.add('still'); existing.replaceWith(node) }
    else log.append(node)
  })
  for (let i = state.cards.length; i < nodes.length; i++) nodes[i].remove()
  empty.hidden = state.cards.length > 0
  if (state.cards.length !== drawn) log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  drawn = state.cards.length

  win.dataset.theme = state.theme
  mode.textContent = THEMES.find(t => t.id === state.theme).label
  picker.hidden = !state.picker
  if (state.picker) {
    picker.replaceChildren(
      el('p', { class: 'picker-head' }, 'Theme · ↑ ↓ preview · Enter use · Esc cancel'),
      ...THEMES.map((t, i) => el('div', {
        class: 'opt', role: 'option', id: `opt-${t.id}`, 'aria-selected': String(i === state.picker.index),
        onclick: () => { update(pick(state, i)); update(key(state, 'Enter')); input.focus() },
        onmouseenter: () => update(pick(state, i))
      }, el('span', { class: 'opt-label' }, t.label), el('span', { class: 'opt-detail' }, t.detail))))
    picker.setAttribute('aria-activedescendant', `opt-${THEMES[state.picker.index].id}`)
  }

  clock.hidden = !state.block
  if (state.block) clock.textContent = `Demo clock: 1 s ≈ ${Math.round(1000 / MINUTE_MS * 10) / 10} min · minute ${state.block.elapsed} of ${BLOCK_MINUTES}`
  syncTimer()
}

function syncTimer() {
  if (state.block && !timer) timer = setInterval(() => update(tick(state)), MINUTE_MS)
  if (!state.block && timer) { clearInterval(timer); timer = null }
}

function update(next) {
  if (next === state) return
  const opened = !state.picker && next.picker
  state = next
  render()
  if (opened) picker.focus()
}

function act(cardId, actionId) {
  if (touring) return
  update(press(state, cardId, actionId))
}

function run(text) {
  update(submit(state, text))
  input.value = ''
  drawChips()
}

function drawChips() {
  const typed = input.value.trim()
  const list = SUGGESTIONS.filter(s => !typed || s.startsWith(typed))
  chips.replaceChildren(...list.map(s => el('button', { type: 'button', class: 'chip', onclick: () => { if (!touring) { run(s); if (!state.picker) input.focus() } } }, s)))
}

$('[data-composer]').addEventListener('submit', e => { e.preventDefault(); if (!touring) run(input.value) })
input.addEventListener('input', drawChips)
input.addEventListener('keydown', e => {
  if (e.key === 'Tab' && input.value.startsWith('/')) {
    const match = SUGGESTIONS.find(s => s.startsWith(input.value.trim()) && s !== input.value.trim())
    if (match) { e.preventDefault(); input.value = match; drawChips() }
  }
})
picker.addEventListener('keydown', e => {
  if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) return
  e.preventDefault()
  update(key(state, e.key))
  if (!state.picker) input.focus()
})
$('[data-reset]').addEventListener('click', () => { touring = false; tourButton.textContent = 'Play the tour'; update(initialState()); input.value = ''; drawChips() })

const sleep = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms))

async function typeOut(text) {
  input.value = ''
  for (const ch of text) {
    if (!touring) return false
    input.value += ch
    drawChips()
    await sleep(45)
  }
  await sleep(250)
  return touring
}

async function tour() {
  if (touring) { touring = false; tourButton.textContent = 'Play the tour'; return }
  update(initialState())
  touring = true
  tourButton.textContent = 'Stop the tour'
  win.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  for (const step of TOUR) {
    if (!touring) break
    if (step.type === 'submit') {
      if (!(await typeOut(step.text))) break
      run(step.text)
      await sleep(900)
    } else if (step.type === 'press') {
      const card = findAction(state, step.action)
      const button = card && log.querySelector(`[data-k="${card.id}"] [data-action="${step.action}"]`)
      if (!button) break
      button.classList.add('is-pressing')
      await sleep(700)
      update(press(state, card.id, step.action))
      await sleep(900)
    } else {
      const until = (state.block?.elapsed ?? 0) + step.minutes
      while (touring && state.block && state.block.elapsed < until) await sleep(MINUTE_MS)
    }
  }
  touring = false
  tourButton.textContent = 'Play the tour'
}

tourButton.addEventListener('click', tour)
for (const link of document.querySelectorAll('[data-tour-start]')) link.addEventListener('click', () => { if (!touring) tour() })

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy)
      button.textContent = 'copied ✓'
    } catch {
      button.textContent = 'select and copy'
    }
    setTimeout(() => { button.textContent = 'copy' }, 1600)
  })
}

const tabs = [...document.querySelectorAll('[data-tabs] [role=tab]')]
function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab
    t.setAttribute('aria-selected', String(on))
    t.tabIndex = on ? 0 : -1
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on
  }
  tab.focus()
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab))
  tab.addEventListener('keydown', e => {
    const i = tabs.indexOf(tab)
    if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length])
    if (e.key === 'ArrowLeft') selectTab(tabs[(i + tabs.length - 1) % tabs.length])
  })
}

drawChips()
render()
document.documentElement.dataset.ready = 'true'
