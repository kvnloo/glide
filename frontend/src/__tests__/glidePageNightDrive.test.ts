// GL-063: the Night Drive page (glide/pages/night-drive.html) mounts, plays music it synthesizes itself, and its
// spectrum is the analyser's reading of that audio: non-zero bins while it plays, nothing once it pauses. The
// pane's real theme function restyles it live.
import { describe, expect, it } from 'vitest'

import { type PageTheme, themeFunction } from '../glideui/pages.js'
import { type FakeAnalyser, loadPage, type PageRun } from './glidePageHarness.js'

const DAY: PageTheme = { dark: false, bg: '#f5f1ea', surface: '#ece6dc', fg: '#2a2620', muted: '#6b6459', accent: '#7c3aed', accentInk: '#ffffff' }

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
  it('mounts idle and silent: the player, three tracks and a spectrum canvas, no audio until asked', () => {
    const run = loadPage('night-drive')
    expect(run.eval('document.title')).toBe('Night Drive')
    expect(text(run, 'title')).toBe('Night Drive')
    expect(run.eval(`[...document.querySelectorAll('#tracks b')].map(b => b.textContent).join('|')`)).toBe('Night Drive|Neon Overpass|Last Exit')
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
})
