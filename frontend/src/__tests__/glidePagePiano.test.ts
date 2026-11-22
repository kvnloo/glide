// GL-066: the piano page (glide/pages/piano.html) mounts a 25-key keyboard under a lane of falling notes. A key
// press sounds its pitch (the analyser's loudest bin is that note) and stops on release; in Listen the song's notes
// fall at the lane's speed and sound as they land; in Play the song waits at each melody note until you hit it.
import { describe, expect, it } from 'vitest'

import { type PageTheme } from '../glideui/pages.js'
import { themeFunction } from '../../../glide/frontend/pageThemeScript.js'
import { type FakeAudioContext, loadPage, type PageRun } from './glidePageHarness.js'

const DAY: PageTheme = { dark: false, bg: '#f5f1ea', surface: '#ece6dc', fg: '#2a2620', muted: '#6b6459', accent: '#7c3aed', accentInk: '#ffffff' }
const C4 = 261.63, C5 = 523.25, E4 = 329.63, E5 = 659.26

const key = (run: PageRun, type: 'keydown' | 'keyup', k: string, code: string) => run.eval(`window.__key(${JSON.stringify(type)}, ${JSON.stringify(k)}, ${JSON.stringify(code)})`)
const keyAttr = (run: PageRun, note: number, attr: string) => run.eval(`document.querySelector('[data-note="${note}"]').dataset.${attr}`)
const click = (run: PageRun, selector: string) => run.eval(`window.__click(document.querySelector(${JSON.stringify(selector)}))`)

function audioOf(run: PageRun): FakeAudioContext {
  const ctx = run.audio[0]
  if (!ctx) throw new Error('the page made no audio context')
  return ctx
}

/** Whether an oscillator at `hz` (within a cent or so) reaches the speakers now. */
const sounds = (run: PageRun, hz: number) => {
  const ctx = audioOf(run)
  return ctx.sounding().some(o => Math.abs(o.hz(ctx.currentTime) - hz) < hz * 0.001)
}

/** The frequency (Hz) of the analyser's loudest bin. */
function loudest(run: PageRun) {
  const ctx = audioOf(run)
  const a = ctx.analysers()[0]
  if (!a) throw new Error('no analyser')
  const bins = new Uint8Array(a.frequencyBinCount)
  a.getByteFrequencyData(bins)
  let best = 0
  bins.forEach((b, i) => { if (b > (bins[best] ?? 0)) best = i })
  return { hz: best * ctx.sampleRate / a.fftSize, live: bins.filter(b => b > 0).length }
}

describe('piano page', { timeout: 60_000 }, () => {
  it('mounts a 25-key keyboard (C4 to C6) under the lane, silent until played', () => {
    const run = loadPage('piano')
    expect(run.eval('document.title')).toBe('Piano')
    expect(run.eval(`document.querySelectorAll('.key.white').length`)).toBe(15)
    expect(run.eval(`document.querySelectorAll('.key.black').length`)).toBe(10)
    expect(run.eval(`[...document.querySelectorAll('.key')].map(k => k.getAttribute('aria-label')).filter((_, i, a) => i === 0 || i === a.length - 1).join(' ')`)).toBe('C4 C6')
    expect(run.eval(`document.querySelector('[data-note="60"]').textContent`)).toBe('A')
    expect(run.eval(`[...document.querySelectorAll('#song option')].map(o => o.textContent).join('|')`)).toBe('Ode to Joy|Twinkle, Twinkle|Für Elise')
    run.advance(100)
    expect(run.eval(`document.getElementById('lane').getContext('2d').ops.some(o => o.op === 'fillRect')`)).toBe(true)
    expect(run.audio).toHaveLength(0)
  })

  it('sounds a key while it is held: the analyser peaks at its pitch, and it stops on release', () => {
    const run = loadPage('piano')
    key(run, 'keydown', 'a', 'KeyA')
    expect(sounds(run, C4)).toBe(true)
    expect(keyAttr(run, 60, 'down')).toBe('true')
    run.advance(120)
    const heard = loudest(run)
    expect(Math.abs(heard.hz - C4)).toBeLessThan(30)
    expect(heard.live).toBeGreaterThan(10)
    key(run, 'keyup', 'a', 'KeyA')
    expect(keyAttr(run, 60, 'down')).toBe('false')
    run.advance(1200)
    expect(sounds(run, C4)).toBe(false)
    // X moves the letters up an octave: A is now C5.
    key(run, 'keydown', 'x', 'KeyX')
    expect(run.eval(`document.querySelector('[data-note="72"]').textContent`)).toBe('A')
    key(run, 'keydown', 'a', 'KeyA')
    expect(sounds(run, C5)).toBe(true)
  })

  it('Listen: notes fall at the lane speed and sound as they land on the keys', () => {
    const run = loadPage('piano')
    click(run, '#start')
    run.advance(32)
    const y0 = run.eval(`window.piano.notes().find(n => n.m === 76).y`)
    run.advance(480)
    const y1 = run.eval(`window.piano.notes().find(n => n.m === 76).y`)
    if (typeof y0 !== 'number' || typeof y1 !== 'number') throw new Error('no falling E5')
    // 0.48 s at a third of the lane (352 px) a second.
    expect(y1 - y0).toBeGreaterThan(54)
    expect(y1 - y0).toBeLessThan(60)
    expect(run.eval(`document.getElementById('lane').getContext('2d').ops.filter(o => o.op === 'roundRect').length`)).toBeGreaterThan(5)
    expect(run.audio).toHaveLength(1)
    expect(sounds(run, E5)).toBe(false)
    run.advance(2200)
    expect(run.eval('window.piano.time')).toBeGreaterThanOrEqual(0)
    expect(sounds(run, E5)).toBe(true)
    expect(sounds(run, C4)).toBe(true)
    expect(keyAttr(run, 76, 'down')).toBe('true')
    run.advance(3000)
    expect(run.eval('window.piano.time')).toBeGreaterThan(3)
    expect(loudest(run).live).toBeGreaterThan(50)
  })

  it('Play: the song waits at each melody note until you hit it, and counts hits and slips', () => {
    const run = loadPage('piano')
    click(run, '[data-mode="play"]')
    click(run, '#start')
    run.advance(3500)
    expect(run.eval('window.piano.waiting')).toBe(true)
    expect(run.eval('window.piano.time')).toBe(0)
    expect(keyAttr(run, 76, 'target')).toBe('true')
    // The accompaniment plays itself; the melody is yours.
    expect(sounds(run, C4)).toBe(true)
    expect(sounds(run, E5)).toBe(false)
    // The melody sits in octave 5, so the letters moved there: A is C5, D is E5.
    expect(run.eval(`document.querySelector('[data-note="72"]').textContent`)).toBe('A')
    key(run, 'keydown', 'a', 'KeyA')
    expect(sounds(run, C5)).toBe(true)
    expect(run.eval('window.piano.score.slips')).toBe(1)
    run.advance(200)
    expect(run.eval('window.piano.time')).toBe(0)
    key(run, 'keydown', 'd', 'KeyD')
    expect(sounds(run, E5)).toBe(true)
    expect(run.eval('window.piano.score.hits')).toBe(1)
    run.advance(300)
    expect(run.eval('window.piano.time')).toBeGreaterThan(0.2)
    expect(run.eval(`document.getElementById('score').textContent`)).toBe('1/30 hit · streak 1 · 1 slips')
  })

  it('Free: what you play rises off the keys', () => {
    const run = loadPage('piano')
    click(run, '[data-mode="free"]')
    expect(run.eval(`document.getElementById('title').textContent`)).toBe('Free play')
    key(run, 'keydown', 'd', 'KeyD')
    run.advance(300)
    expect(run.eval('window.piano.ribbons')).toBe(1)
    expect(sounds(run, E4)).toBe(true)
    key(run, 'keyup', 'd', 'KeyD')
    run.advance(200)
    expect(run.eval('window.piano.notes().length')).toBe(0)
  })

  it('wears the pane theme live: glide-theme repaints the lane', () => {
    const run = loadPage('piano')
    click(run, '#start')
    run.advance(100)
    run.eval(`(${themeFunction(DAY)})()`)
    expect(run.eval('document.documentElement.dataset.glideTheme')).toBe('light')
    expect(run.eval('window.piano.theme.accent')).toBe(DAY.accent)
    run.eval(`document.getElementById('lane').getContext('2d').ops.length = 0`)
    run.advance(16)
    const styles = run.eval(`[...new Set(document.getElementById('lane').getContext('2d').ops.map(o => String(o.fillStyle)))].join(' ')`)
    expect(styles).toContain('rgba(124,58,237')
    expect(styles).not.toContain('rgba(110,231,200')
  })
})
