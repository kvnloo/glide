// The landing page's interactive demo, as data. A pure state machine: every function takes a state and
// returns the next one, so model.test.mjs drives the same flow the page draws. No DOM, no network, no
// clock: the page passes time in through tick(). Everything it shows is synthetic sample data.

/** The corrections glide/demo/seed.py's six synthetic sessions yield (its cron session is skipped). */
export const CORRECTIONS = [
  { id: 'c1', session: 'cli', text: 'no, use pnpm for the frontend, never npm. The lockfile is pnpm-lock.yaml.' },
  { id: 'c2', session: 'tui', text: 'Correction: never push to main. Open a PR and wait for CI to pass.' },
  { id: 'c3', session: 'cli', text: 'actually, our SQL files use two spaces, not tabs.' },
  { id: 'c4', session: 'desktop', text: 'no, always deploy to staging first and run the smoke tests there.' },
  { id: 'c5', session: 'tui', text: 'actually, sign every commit with my SSH key (git commit -S).' }
]
const SESSIONS_READ = 6

/** What the sample machine reports on Detect. Detection installs nothing. */
const MACHINE = [['CPU', '8 cores'], ['RAM', '16 GB'], ['GPU', 'none'], ['Ollama', '1 model']]

/** Asks an agent raises during a deep-work block: non-critical ones are held, critical ones pass. */
export const ASKS = [
  { at: 4, text: 'Lint finished with 2 warnings. Review now?', critical: false },
  { at: 11, text: 'PR #41 has a new review comment.', critical: false },
  { at: 19, text: 'Disk is 97% full on the build host.', critical: true },
  { at: 27, text: 'Which changelog heading should the release use?', critical: false }
]

/** Messages per two-hour window in seed.py's --rhythm history (ten days, local time). */
const HOURS = [['08–10', 30], ['10–12', 30], ['12–14', 0], ['14–16', 30], ['16–18', 0], ['18–20', 0], ['20–22', 0], ['22–24', 10]]

/** /theme's modes, in the native picker's order. The browser preview approximates each one. */
export const THEMES = [
  { id: 'tern', label: 'Tern', detail: 'Your Tern theme, with no colours of its own' },
  { id: 'nous', label: 'Nous', detail: 'Bone ink and quiet greys; gold only when it is earned' },
  { id: 'skin', label: 'Hermes skin', detail: "The Hermes skin's accent and status colours" },
  { id: 'auto', label: 'Wallpaper', detail: "The wallpaper's pywal colours, live" },
  { id: 'dash', label: 'Dash', detail: 'Warm black, cream ink, one gold' }
]

/** The composer's suggestion chips. */
export const SUGGESTIONS = ['/glide', '/glide focus', '/glide recall frontend', '/glide focus hours', '/theme', '/glide off', '/help']

export const BLOCK_MINUTES = 50

/** A scripted tour: what "Play the tour" types and presses, in order. */
export const TOUR = [
  { type: 'submit', text: '/glide' },
  { type: 'press', action: 'build' },
  { type: 'press', action: 'enable' },
  { type: 'submit', text: '/glide recall frontend' },
  { type: 'submit', text: '/glide focus' },
  { type: 'press', action: 'start' },
  { type: 'wait', minutes: 30 },
  { type: 'press', action: 'end' }
]

export function initialState() {
  return { cards: [], next: 1, memory: 'none', recall: false, block: null, held: [], theme: 'dash', picker: null }
}

const words = s => s.toLowerCase().match(/[a-z0-9]+/g) ?? []
const STOP = new Set(['a', 'an', 'the', 'is', 'in', 'on', 'of', 'to', 'not', 'no', 'and', 'with', 'for', 'only', 'never', 'must', 'run', 'actually', 'correction'])

/** BM25 over the sample corrections (k1 1.2, b 0.75), the ranking Glide's store uses. Top three, score > 0. */
export function rank(query, docs = CORRECTIONS) {
  const terms = [...new Set(words(query).filter(w => !STOP.has(w)))]
  const toks = docs.map(d => words(d.text))
  const avg = toks.reduce((n, t) => n + t.length, 0) / Math.max(1, toks.length)
  const scored = docs.map((d, i) => {
    const t = toks[i]
    let score = 0
    for (const term of terms) {
      const df = toks.filter(tokens => tokens.includes(term)).length
      const tf = t.filter(token => token === term).length
      if (!tf) continue
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5))
      score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * t.length / avg))
    }
    return { ...d, score: Math.round(score * 100) / 100 }
  })
  return scored.filter(d => d.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3)
}

function add(state, card) {
  return { ...state, cards: [...state.cards, { id: `k${state.next}`, actions: [], ...card }], next: state.next + 1 }
}

const user = (state, text) => add(state, { kind: 'user', text })
const notice = (state, text, tone = 'info') => add(state, { kind: 'notice', text, tone })

function detectCard(state) {
  const built = state.memory !== 'none'
  return add(state, {
    kind: 'card', title: 'Detect', pill: { label: 'SAMPLE', tone: 'muted' },
    lead: built ? `Memory holds ${CORRECTIONS.length} corrections. Recall is ${state.recall ? 'on' : 'off'}.` : 'This machine can build memory. Detection installed nothing.',
    facts: MACHINE.map(([k, v]) => `${k} ${v}`),
    actions: built ? (state.recall ? [] : [{ id: 'enable', label: 'Turn on', primary: true }]) : [{ id: 'build', label: 'Build memory', primary: true }]
  })
}

function focusCard(state) {
  const running = state.block !== null
  return add(state, {
    kind: 'card', title: 'Focus', pill: running ? { label: 'HELD', tone: 'warn' } : { label: 'SAMPLE', tone: 'muted' },
    lead: running ? `Deep-work block: ${BLOCK_MINUTES - state.block.elapsed} min left` : 'Morning peak. Next deep-work window 08:00–10:00.',
    rows: [['Flow likelihood', 'needs Flowkit'], ['Bedtime', '23:30'], ['Asks held', String(state.held.length)]],
    actions: running ? [{ id: 'end', label: 'End block', primary: true }] : [{ id: 'start', label: 'Start 50-min block', primary: true }]
  })
}

function hoursCard(state) {
  return add(state, {
    kind: 'card', title: 'Your hours', pill: { label: 'SAMPLE', tone: 'muted' },
    lead: 'You worked most from 08:00 to 12:00 and from 14:00 to 16:00.',
    bars: HOURS.map(([label, n]) => ({ label, value: n })), actions: []
  })
}

function helpCard(state) {
  return add(state, {
    kind: 'card', title: 'Commands', lead: 'This demo answers these commands. Type one, or tap a chip below.',
    rows: [['/glide', 'Detect, build memory, turn on recall'], ['/glide recall <words>', 'Matching past corrections'], ['/glide focus', 'Phase, deep-work block, held asks'], ['/glide focus hours', 'Your best two-hour windows'], ['/glide off', 'Stop quoting corrections'], ['/theme', 'Preview the colour modes']],
    actions: []
  })
}

/** The composer: echo the line, then answer it. */
export function submit(state, raw) {
  const text = raw.trim()
  if (!text) return state
  let s = user({ ...state, picker: null }, text)
  if (!text.startsWith('/')) return notice(s, 'This demo answers slash commands only. Try /glide or /help.')
  const [cmd, sub, ...rest] = text.slice(1).split(/\s+/)
  if (cmd === 'help') return helpCard(s)
  if (cmd === 'theme') return { ...s, picker: { index: Math.max(0, THEMES.findIndex(t => t.id === s.theme)), before: s.theme } }
  if (cmd !== 'glide') return notice(s, `Unknown command /${cmd}. Try /help.`, 'warn')
  if (sub === undefined) return detectCard(s)
  if (sub === 'focus' && rest[0] === 'hours') return hoursCard(s)
  if (sub === 'focus' && rest.length === 0) return focusCard(s)
  if (sub === 'off') {
    if (!s.recall) return notice(s, 'Recall is already off.')
    return notice({ ...s, recall: false }, 'Recall is off. Past corrections are no longer quoted into turns.')
  }
  if (sub === 'recall') {
    if (s.memory === 'none') return notice(s, 'No memory yet. Run /glide and approve Build memory first.', 'warn')
    const query = rest.join(' ')
    if (!query) return notice(s, 'Usage: /glide recall <words>', 'warn')
    const hits = rank(query)
    return add(s, {
      kind: 'card', title: `Recall · ${query}`, pill: { label: `${hits.length} MATCH${hits.length === 1 ? '' : 'ES'}`, tone: hits.length ? 'ok' : 'muted' },
      lead: hits.length ? 'These past corrections would be quoted into the next turn. Current instructions win.' : 'No past correction matches those words.',
      quotes: hits.map(h => ({ text: h.text, meta: `${h.session} · score ${h.score.toFixed(2)}` })), actions: []
    })
  }
  return notice(s, `Unknown command /glide ${sub}. Try /help.`, 'warn')
}

/** Settle a card: its buttons go away once one is pressed. */
const settle = (state, cardId) => ({ ...state, cards: state.cards.map(c => (c.id === cardId ? { ...c, actions: [], settled: true } : c)) })

/** The newest card that offers `actionId`, or undefined. */
export function findAction(state, actionId) {
  return [...state.cards].reverse().find(c => c.actions.some(a => a.id === actionId))
}

/** An approval button. Unknown or already-settled buttons change nothing. */
export function press(state, cardId, actionId) {
  const card = state.cards.find(c => c.id === cardId)
  if (!card || !card.actions.some(a => a.id === actionId)) return state
  let s = settle(state, cardId)
  if (actionId === 'build') {
    s = { ...s, memory: 'built' }
    return add(s, {
      kind: 'card', title: 'Memory built', pill: { label: 'DONE', tone: 'ok' },
      lead: `${CORRECTIONS.length} corrections kept from ${SESSIONS_READ} sample sessions.`,
      rows: [['Sessions read', String(SESSIONS_READ)], ['Skipped', '1 (not a local chat)'], ['Corrections kept', String(CORRECTIONS.length)], ['Model calls', '0']],
      actions: [{ id: 'enable', label: 'Turn on', primary: true }]
    })
  }
  if (actionId === 'enable') {
    s = { ...s, recall: true }
    return add(s, {
      kind: 'card', title: 'Recall on', pill: { label: 'ON', tone: 'ok' },
      lead: 'Up to three matching corrections are quoted into each turn. Try /glide recall frontend.', actions: []
    })
  }
  if (actionId === 'start') {
    s = { ...s, block: { elapsed: 0 }, held: [] }
    return add(s, {
      kind: 'card', title: 'Deep-work block', pill: { label: 'RUNNING', tone: 'warn' }, live: 'block',
      lead: 'Replies stay short. Non-critical asks wait for the digest; critical ones still pass.',
      actions: [{ id: 'end', label: 'End block', primary: true }]
    })
  }
  if (actionId === 'end') return endBlock(s)
  return s
}

function endBlock(state) {
  if (!state.block) return state
  const held = state.held
  const cards = state.cards.map(c => (c.live === 'block' ? { ...c, live: undefined, actions: [], settled: true, pill: { label: 'DONE', tone: 'ok' } } : c))
  return add({ ...state, cards, block: null, held: [] }, {
    kind: 'card', title: 'Digest', pill: { label: `${held.length} HELD`, tone: 'muted' },
    lead: held.length ? `Block ended after ${state.block.elapsed} min. Here is everything that waited.` : `Block ended after ${state.block.elapsed} min. Nothing waited.`,
    quotes: held.map(a => ({ text: a.text, meta: `minute ${a.at}` })), actions: []
  })
}

/** One demo minute passes. Asks arrive on schedule; the block ends by itself at 50 minutes. */
export function tick(state, minutes = 1) {
  let s = state
  for (let i = 0; i < minutes && s.block; i++) {
    const elapsed = s.block.elapsed + 1
    s = { ...s, block: { elapsed } }
    for (const ask of ASKS.filter(a => a.at === elapsed)) {
      s = ask.critical ? notice(s, `Critical, passed through: ${ask.text}`, 'bad') : { ...s, held: [...s.held, ask] }
    }
    if (elapsed >= BLOCK_MINUTES) s = endBlock(s)
  }
  return s
}

/** The /theme picker: arrows preview live, Enter keeps it, Escape puts the old theme back. */
export function key(state, name) {
  const p = state.picker
  if (!p) return state
  if (name === 'ArrowDown' || name === 'ArrowUp') {
    const index = (p.index + (name === 'ArrowDown' ? 1 : THEMES.length - 1)) % THEMES.length
    return { ...state, picker: { ...p, index }, theme: THEMES[index].id }
  }
  if (name === 'Enter') return notice({ ...state, picker: null }, `Theme: ${THEMES[p.index].label}. Kept for the next launch.`)
  if (name === 'Escape') return { ...state, picker: null, theme: p.before }
  return state
}

/** Click a picker row: same as moving the selection there. */
export function pick(state, index) {
  if (!state.picker || index < 0 || index >= THEMES.length || index === state.picker.index) return state
  return { ...state, picker: { ...state.picker, index }, theme: THEMES[index].id }
}
