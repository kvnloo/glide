// The Night Drive take (GL-063): press play, the spectrum stands up off the analyser, the pane restyles it mid-song
// (zeron-night, then glide-gold, the studio themes in glide/tools/studio-themes), the drop, the next track, pause.
export const viewport = { width: 960, height: 640 }

const NIGHT = { dark: true, bg: '#0e0c14', surface: '#17141f', fg: '#ece8f4', muted: '#9a93ab', accent: '#a78bfa', accentInk: '#111111' }
const GOLD = { dark: true, bg: '#0e0c09', surface: '#1a1712', fg: '#f1ebe0', muted: '#a69b88', accent: '#d7b986', accentInk: '#111111' }

/** How many of the AnalyserNode's 1024 frequency bins read above zero right now. */
const LIVE = `(() => { const a = window.nightDrive.analyser; if (!a) return 0
  const b = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(b); return b.filter(v => v > 0).length })()`
const BANDS = `window.nightDrive.spectrum().filter(v => v > 0.15).length`
const PLAYING = `new Promise(r => { const c = () => (window.nightDrive.state === 'playing' ? r(true) : setTimeout(c, 50)); c() })`

export async function scene(t) {
  await t.theme(NIGHT)
  await t.note('idle, analyser bins above zero', LIVE)
  await t.wait(1200)
  await t.click('#play')
  await t.note('playing', PLAYING)
  await t.wait(3500)
  await t.note('analyser bins above zero', LIVE)
  await t.note('spectrum bands above 15%', BANDS)
  await t.theme(GOLD)
  await t.note('restyled by the pane, accent', 'window.nightDrive.theme.accent')
  await t.wait(2500)
  await t.key('ArrowRight', 'ArrowRight')
  await t.key('ArrowRight', 'ArrowRight')
  await t.note('seeked to', 'Math.round(window.nightDrive.time)')
  await t.wait(4500)
  await t.note('in the drop, analyser bins above zero', LIVE)
  await t.note('low end (mean of the 6 lowest bands)', 'Math.round(window.nightDrive.spectrum().slice(0, 6).reduce((a, b) => a + b, 0) / 6 * 100) / 100')
  await t.theme(NIGHT)
  await t.click('#next')
  await t.note('next track', `${PLAYING}.then(() => document.getElementById('title').textContent)`)
  await t.wait(3500)
  await t.note('analyser bins above zero', LIVE)
  await t.key(' ', 'Space')
  await t.wait(1200)
  await t.note('paused', 'window.nightDrive.state')
  await t.note('spectrum bands above 0 after pause', `window.nightDrive.spectrum().filter(v => v > 0).length`)
}
