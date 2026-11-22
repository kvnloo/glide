// GL-063: the Night Drive page (glide/pages/night-drive.html) mounts, plays music it synthesizes itself, and its
// spectrum is the analyser's reading of that audio: non-zero bins while it plays, nothing once it pauses. The
// pane's real theme function restyles it live.
// GL-050: the Emotions control sorts the queue by emotion or filters it to one, in fixed colours that mean energy.
import { describe, expect, it } from 'vitest'

import { type PageTheme } from '../glideui/pages.js'
import { themeFunction } from '../../../glide/frontend/pageThemeScript.js'
import { type FakeAnalyser, loadPage, type PageRun } from './glidePageHarness.js'

const DAY: PageTheme = { dark: false, bg: '#f5f1ea', surface: '#ece6dc', fg: '#2a2620', muted: '#6b6459', accent: '#7c3aed', accentInk: '#ffffff' }

const PLAYLIST = ['Night Drive', 'Neon Overpass', 'Last Exit', 'Low Tide', 'Static Bloom', 'Harbor Lights']
// The meaning of each colour: energy order, cool to warm. These must not move with the theme.
const FEELS: Record<string, string> = { calm: '#3fc1b0', wistful: '#8c7cf0', driving: '#ff6b57', tense: '#f29a2e', bright: '#f2d43d' }

const text = (run: PageRun, id: string) => run.eval(`document.getElementById(${JSON.stringify(id)}).textContent`)
const label = (run: PageRun, id: string) => run.eval(`document.getElementById(${JSON.stringify(id)}).getAttribute('aria-label')`)

function analyserOf(run: PageRun): FakeAnalyser {
  const a = run.audio[0]?.analysers()[0]
  if (!a) throw new Error('the page made no analyser')
  return a
}

/** How many of the analyser's frequency bins read above zero, read the way the page reads them. */
function liveBins(a: FakeAnalyser) {
  const bins = new Uint8Array(a.frequencyBinCount)
  a.getByteFrequencyData(bins)
  return bins.filter(b => b > 0).length
}

async function playing(run: PageRun) {
  run.eval(`window.__click(document.getElementById('play'))`)
  await run.until(`window.nightDrive.state === 'playing'`, 60_000)
}

describe('Night Drive page', { timeout: 60_000 }, () => {
  it('mounts idle and silent: the player, six tracks and a spectrum canvas, no audio until asked', () => {
    const run = loadPage('night-drive')
    expect(run.eval('document.title')).toBe('Night Drive')
    expect(text(run, 'title')).toBe('Night Drive')
    expect(run.eval(`[...document.querySelectorAll('#tracks b')].map(b => b.textContent).join('|')`)).toBe(PLAYLIST.join('|'))
    expect(label(run, 'play')).toBe('Play')
    expect(text(run, 'duration')).toBe('1:00')
    expect(run.eval('window.nightDrive.state')).toBe('idle')
    run.advance(200)
    expect(run.eval('window.nightDrive.spectrum().every(v => v === 0)')).toBe(true)
    expect(run.eval(`document.getElementById('scene').getContext('2d').ops.some(o => o.op === 'arc')`)).toBe(true)
    expect(run.audio).toHaveLength(0)
  })

  it('synthesizes each track to real, unclipped stereo audio', async () => {
    const run = loadPage('night-drive')
    await run.eval(`window.nightDrive.ready(0).then(d => {
      let sum = 0, peak = 0, diff = 0
      for (let i = 0; i < d.length; i += 5) { const l = d.L[i], r = d.R[i]; sum += l * l; peak = Math.max(peak, Math.abs(l), Math.abs(r)); diff += Math.abs(l - r) }
      window.__pcm = { rms: Math.sqrt(sum / (d.length / 5)), peak, width: diff / (d.length / 5), duration: d.duration }
    })`)
    expect(run.eval('window.__pcm.rms')).toBeGreaterThan(0.08)
    expect(run.eval('window.__pcm.peak')).toBeLessThanOrEqual(0.9)
    expect(run.eval('window.__pcm.width')).toBeGreaterThan(0.001)
    expect(run.eval('window.__pcm.duration')).toBeGreaterThan(60)
  })

  it('plays: the analyser reads non-zero bins and the spectrum stands up; a pause silences it', async () => {
    const run = loadPage('night-drive')
    await playing(run)
    expect(label(run, 'play')).toBe('Pause')
    run.advance(1500)
    const analyser = analyserOf(run)
    expect(analyser.fftSize).toBe(2048)
    expect(liveBins(analyser)).toBeGreaterThan(100)
    expect(run.eval('window.nightDrive.spectrum().filter(v => v > 0.15).length')).toBeGreaterThan(10)
    expect(text(run, 'elapsed')).toBe('0:01')
    // The bars on the canvas are that spectrum.
    run.eval(`document.getElementById('scene').getContext('2d').ops.length = 0`)
    run.advance(16)
    expect(run.eval(`document.getElementById('scene').getContext('2d').ops.filter(o => o.op === 'fillRect' && o.args[3] > 4 && String(o.fillStyle).startsWith('rgba(255,95,162')).length`)).toBeGreaterThan(10)

    run.eval(`window.__key('keydown', ' ', 'Space')`)
    expect(run.eval('window.nightDrive.state')).toBe('paused')
    expect(label(run, 'play')).toBe('Play')
    run.advance(500)
    const quiet = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(quiet)
    expect(quiet.every(v => v === 0)).toBe(true)
    expect(run.eval('window.nightDrive.spectrum().every(v => v === 0)')).toBe(true)
    expect(text(run, 'elapsed')).toBe('0:01')
  })

  it('seeks into the drop, where the kick and bass fill the low end, and moves on at the end of a track', async () => {
    const run = loadPage('night-drive')
    await playing(run)
    run.eval(`window.__key('keydown', 'ArrowRight')`)
    run.eval(`window.__key('keydown', 'ArrowRight')`)
    run.eval(`window.__key('keydown', 'ArrowRight')`)
    await run.until(`window.nightDrive.state === 'playing' && window.nightDrive.time >= 15`)
    run.advance(800)
    expect(run.eval('window.nightDrive.spectrum().slice(0, 6).reduce((a, b) => a + b, 0) / 6')).toBeGreaterThan(0.5)
    run.eval(`window.nightDrive.seek(window.nightDrive.tracks[0].duration - 0.3)`)
    await run.until(`window.nightDrive.time > 59`)
    run.advance(600)
    await run.until(`window.nightDrive.index === 1 && window.nightDrive.state === 'playing'`, 60_000)
    expect(text(run, 'title')).toBe('Neon Overpass')
    run.advance(1000)
    expect(liveBins(analyserOf(run))).toBeGreaterThan(100)
  })

  it('wears the pane theme live: glide-theme repaints the canvas and sets the page variables', async () => {
    const run = loadPage('night-drive')
    await playing(run)
    run.advance(400)
    run.eval(`(${themeFunction(DAY)})()`)
    expect(run.eval(`document.documentElement.style.getPropertyValue('--glide-accent')`)).toBe(DAY.accent)
    expect(run.eval('window.nightDrive.theme.accent')).toBe(DAY.accent)
    run.eval(`document.getElementById('scene').getContext('2d').ops.length = 0`)
    run.advance(16)
    const styles = run.eval(`[...new Set(document.getElementById('scene').getContext('2d').ops.map(o => String(o.fillStyle)))].join(' ')`)
    expect(styles).toContain('rgba(124,58,237')
    expect(styles).not.toContain('rgba(255,95,162')
  })

  it('GL-050: the Emotions button opens a colour-coded menu: sort by energy, show one emotion, with counts', () => {
    const run = loadPage('night-drive')
    const shown = () => run.eval(`[...document.querySelectorAll('#tracks li:not([hidden]) b span')].map(b => b.textContent).join('|')`)
    expect(text(run, 'emotions-label')).toBe('Emotions')
    expect(text(run, 'queue-count')).toBe('6 of 6')
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(true)
    // Every row wears its emotion's colour and says it.
    expect(run.eval(`[...document.querySelectorAll('#tracks button')].map(b => b.dataset.emotion + '=' + b.style.getPropertyValue('--feel')).join(' ')`))
      .toBe('driving=#ff6b57 bright=#f2d43d wistful=#8c7cf0 calm=#3fc1b0 tense=#f29a2e wistful=#8c7cf0')
    expect(run.eval(`document.querySelector('#tracks small').textContent`)).toBe('Driving · A minor · 96 BPM')
    // The button carries the whole palette, low energy to high.
    expect(run.eval(`[...document.querySelectorAll('#emotions .spectrum i')].map(i => i.style.getPropertyValue('--feel')).join(' ')`))
      .toBe(Object.values(FEELS).join(' '))

    run.eval(`window.__click(document.getElementById('emotions'))`)
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(false)
    expect(run.eval(`document.getElementById('emotions').getAttribute('aria-expanded')`)).toBe('true')
    expect(run.eval(`[...document.querySelectorAll('#emotion-menu button')].map(b =>
      [b.querySelector('span').textContent, b.querySelector('small').textContent, b.getAttribute('aria-checked'), b.style.getPropertyValue('--feel')].join('/')).join(' ')`)).toBe('Playlist order//true/ By emotion · calm → bright//false/ Every emotion/6/true/ ' +
      'Calm/1/false/#3fc1b0 Wistful/2/false/#8c7cf0 Driving/1/false/#ff6b57 Tense/1/false/#f29a2e Bright/1/false/#f2d43d')

    // Sort: calm to bright, ties keep playlist order. The menu stays open to pick a filter next.
    run.eval(`window.__click([...document.querySelectorAll('#emotion-menu button')][1])`)
    expect(shown()).toBe('Low Tide|Last Exit|Harbor Lights|Night Drive|Static Bloom|Neon Overpass')
    expect(text(run, 'emotions-label')).toBe('By emotion')
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(false)
    expect(run.eval(`[...document.querySelectorAll('#emotion-menu button')].map(b => b.getAttribute('aria-checked')).slice(0, 2).join(',')`)).toBe('false,true')

    // Filter: one emotion; the button takes its colour, the other palette dots dim.
    run.eval(`window.__click([...document.querySelectorAll('#emotion-menu button')].find(b => b.textContent.startsWith('Wistful')))`)
    expect(shown()).toBe('Last Exit|Harbor Lights')
    expect(text(run, 'emotions-label')).toBe('Wistful')
    expect(text(run, 'queue-count')).toBe('2 of 6')
    expect(run.eval(`document.getElementById('emotions').style.getPropertyValue('--feel')`)).toBe(FEELS['wistful'])
    expect(run.eval(`[...document.querySelectorAll('#emotions .spectrum i[data-on]')].map(i => i.dataset.emotion).join()`)).toBe('wistful')

    // Esc closes the menu; clicking outside does too.
    run.eval(`window.__key('keydown', 'Escape')`)
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(true)
    run.eval(`window.__key('keydown', 'e')`)
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(false)
    run.eval(`window.__click(document.getElementById('title'))`)
    expect(run.eval(`document.getElementById('emotion-menu').hidden`)).toBe(true)

    // Back to everything in playlist order.
    run.eval(`window.nightDrive.only(null); window.nightDrive.sortBy('playlist')`)
    expect(shown()).toBe(PLAYLIST.join('|'))
    expect(text(run, 'emotions-label')).toBe('Emotions')
    expect(run.eval(`'active' in document.getElementById('emotions').dataset`)).toBe(false)
  })

  it('GL-050: previous, next and the end of a track walk the queue the control shows', () => {
    const run = loadPage('night-drive')
    run.eval(`window.nightDrive.only('wistful')`)
    // The current track (Night Drive, driving) is not in the queue: next starts it, previous wraps from its end.
    run.eval(`window.__click(document.getElementById('next'))`)
    expect(text(run, 'title')).toBe('Last Exit')
    run.eval(`window.__key('keydown', 'n')`)
    expect(text(run, 'title')).toBe('Harbor Lights')
    run.eval(`window.__click(document.getElementById('next'))`)
    expect(text(run, 'title')).toBe('Last Exit')
    run.eval(`window.__click(document.getElementById('prev'))`)
    expect(text(run, 'title')).toBe('Harbor Lights')
    expect(run.eval(`document.querySelector('#tracks button[aria-current=true] b span').textContent`)).toBe('Harbor Lights')

    run.eval(`window.nightDrive.only(null); window.nightDrive.sortBy('emotion')`)
    expect(run.eval('window.nightDrive.queue.map(i => window.nightDrive.tracks[i].emotion).join()')).toBe('calm,wistful,wistful,driving,tense,bright')
    run.eval(`window.__click(document.getElementById('next'))`)
    expect(text(run, 'title')).toBe('Night Drive')
    run.eval(`window.__click(document.getElementById('next'))`)
    expect(text(run, 'title')).toBe('Static Bloom')
    expect(() => run.eval(`window.nightDrive.only('angry')`)).toThrow(/unknown emotion/)
  })

  it('GL-050: the playing track\'s emotion colours its badge and the horizon, and stays fixed through a theme change', async () => {
    const run = loadPage('night-drive')
    expect(text(run, 'feel')).toBe('Driving')
    expect(run.eval(`document.getElementById('feel').style.getPropertyValue('--feel')`)).toBe(FEELS['driving'])
    run.eval(`window.nightDrive.select(3)`)
    expect(text(run, 'feel')).toBe('Calm')
    run.eval(`document.getElementById('scene').getContext('2d').ops.length = 0`)
    run.advance(16)
    const glow = () => run.eval(`document.getElementById('scene').getContext('2d').ops
      .filter(o => o.op === 'fillRect' && o.fillStyle && o.fillStyle.stops).map(o => o.fillStyle.stops.map(s => s[1]).join(' ')).join(' | ')`)
    expect(glow()).toContain('rgba(63,193,176,0.55)')
    run.eval(`(${themeFunction(DAY)})()`)
    run.eval(`document.getElementById('scene').getContext('2d').ops.length = 0`)
    run.advance(16)
    expect(glow()).toContain('rgba(63,193,176,0.55)')
    expect(run.eval(`document.querySelector('#tracks button[data-emotion=calm]').style.getPropertyValue('--feel')`)).toBe(FEELS['calm'])
    // Every track still synthesizes to audio, the new ones included.
    await run.eval(`window.nightDrive.ready(4).then(d => { window.__len = d.duration })`)
    expect(run.eval('window.__len')).toBeGreaterThan(45)
  })
})
