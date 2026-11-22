// The piano take (GL-066): a phrase in Free play off the computer keys, Ode to Joy falling and playing itself in
// Listen, a restyle by the pane mid-song (zeron-night, then glide-gold), then Play: the song waits at each melody
// note while the keys are pressed for real, and a key pressed with the mouse.
export const viewport = { width: 960, height: 640 }

const NIGHT = { dark: true, bg: '#0e0c14', surface: '#17141f', fg: '#ece8f4', muted: '#9a93ab', accent: '#a78bfa', accentInk: '#111111' }
const GOLD = { dark: true, bg: '#0e0c09', surface: '#1a1712', fg: '#f1ebe0', muted: '#a69b88', accent: '#d7b986', accentInk: '#111111' }

const LIVE = `(() => { const a = window.piano.analyser; if (!a) return 0
  const b = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(b); return b.filter(v => v > 0).length })()`
const CODE = { a: 'KeyA', s: 'KeyS', d: 'KeyD', f: 'KeyF', g: 'KeyG', h: 'KeyH', j: 'KeyJ', k: 'KeyK' }

export async function scene(t) {
  await t.theme(NIGHT)
  await t.wait(600)
  await t.click('[data-mode="free"]')
  for (const [k, ms] of [['a', 260], ['s', 260], ['d', 260], ['f', 260], ['g', 520], ['g', 520]]) {
    await t.key(k, CODE[k], ms)
    await t.wait(60)
  }
  await t.key('d', CODE.d, 0)
  await t.note('free: analyser bins above zero while E4 rings', LIVE)
  await t.wait(1600)
  await t.click('[data-mode="listen"]')
  await t.click('#start')
  await t.note('listen: started', 'window.piano.running')
  await t.wait(3200)
  await t.note('listen: notes on screen', 'window.piano.notes().length')
  await t.note('listen: voices sounding', 'window.piano.sounding.map(window.piano.nameOf).join(" ")')
  await t.note('listen: analyser bins above zero', LIVE)
  await t.wait(2500)
  await t.theme(GOLD)
  await t.note('restyled by the pane, accent', 'window.piano.theme.accent')
  await t.wait(3500)
  await t.click('[data-mode="play"]')
  await t.click('#start')
  await t.wait(3000)
  await t.note('play: waiting at the first note', 'window.piano.waiting')
  // Each melody note: wait until the song stops for it, then press its key.
  for (const k of 'ddfggfdsaasddss') {
    await t.eval(`new Promise(r => { const c = () => (window.piano.waiting ? r(true) : setTimeout(c, 20)); c() })`)
    await t.wait(90)
    await t.key(k, CODE[k], 200)
  }
  await t.note('play: score', 'window.piano.score')
  await t.wait(800)
  await t.pointer('[data-note="67"]', 500)
  await t.note('mouse press on G4 sounded', 'document.querySelector(\'[data-note="67"]\').getAttribute("aria-label")')
  await t.wait(1200)
}
