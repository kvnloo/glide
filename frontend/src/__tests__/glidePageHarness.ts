// A Glide page (glide/pages/*.html, kvnloo/glide#326) under test: the page's own HTML and inline script run on
// linkedom's DOM with a virtual clock (requestAnimationFrame, performance.now and AudioContext.currentTime move
// only when the test advances it), a 2D canvas that records what it draws, and a WebAudio graph that computes its
// signal: buffer sources play their samples, oscillators their waveforms, gains follow their automation, and an
// AnalyserNode's frequency data is a Blackman-windowed DFT of what reaches it, smoothed and scaled to bytes as the
// Web Audio spec says. So "the analyser shows the music" is a fact about the page's real audio, not a stub.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

import { parseHTML } from 'linkedom'

/** glide/pages, where the bundled pages live. */
export const PAGES = resolve(dirname(fileURLToPath(import.meta.url)), '../../../glide/pages')

type Automation = { readonly t: number; readonly kind: 'set' | 'linear' | 'exp' | 'target'; readonly v: number; readonly tau: number }

export class FakeParam {
  #value: number
  #events: Automation[] = []

  constructor(value: number) {
    this.#value = value
  }

  get value() { return this.#value }
  set value(v: number) { this.#value = v; this.#events = [] }

  #add(e: Automation) { this.#events = [...this.#events.filter(x => x.t <= e.t), e, ...this.#events.filter(x => x.t > e.t)]; return this }
  setValueAtTime(v: number, t: number) { return this.#add({ t, kind: 'set', v, tau: 0 }) }
  linearRampToValueAtTime(v: number, t: number) { return this.#add({ t, kind: 'linear', v, tau: 0 }) }
  exponentialRampToValueAtTime(v: number, t: number) { return this.#add({ t, kind: 'exp', v, tau: 0 }) }
  setTargetAtTime(v: number, t: number, tau: number) { return this.#add({ t, kind: 'target', v, tau }) }
  cancelScheduledValues(t: number) { this.#events = this.#events.filter(e => e.t < t); return this }
  cancelAndHoldAtTime(t: number) { const v = this.at(t); this.cancelScheduledValues(t); return this.setValueAtTime(v, t) }

  /** The value at time t, following the automation events. */
  at(t: number): number {
    let v = this.#value
    let prevT = 0
    for (let i = 0; i < this.#events.length; i++) {
      const e = this.#events[i]
      if (!e) break
      if (e.kind === 'target') {
        if (t < e.t) return v
        const next = this.#events[i + 1]?.t ?? Infinity
        const until = Math.min(t, next)
        v = e.v + (v - e.v) * Math.exp(-(until - e.t) / Math.max(1e-6, e.tau))
        if (t < next) return v
        prevT = next
        continue
      }
      if (e.t > t) {
        if (e.kind === 'linear') return v + (e.v - v) * (t - prevT) / (e.t - prevT)
        if (e.kind === 'exp' && v > 0 && e.v > 0) return v * Math.pow(e.v / v, (t - prevT) / (e.t - prevT))
        return v
      }
      v = e.v
      prevT = e.t
    }
    return v
  }
}

export class FakeNode {
  readonly inputs = new Set<FakeNode>()
  readonly context: FakeAudioContext

  constructor(context: FakeAudioContext) {
    this.context = context
    context.nodes.push(this)
  }

  connect<T>(dest: T): T {
    if (dest instanceof FakeNode) dest.inputs.add(this)
    return dest
  }

  disconnect() {
    for (const n of this.context.nodes) n.inputs.delete(this)
  }

  /** The node's (mono) output at time t; `path` breaks feedback loops. */
  out(t: number, path: Set<FakeNode>): number {
    return this.sum(t, path)
  }

  protected sum(t: number, path: Set<FakeNode>): number {
    let s = 0
    for (const n of this.inputs) {
      if (path.has(n)) continue
      path.add(n)
      s += n.out(t, path)
      path.delete(n)
    }
    return s
  }

  /** Whether any started source reaches this node. */
  hears(path = new Set<FakeNode>()): boolean {
    for (const n of this.inputs) {
      if (path.has(n)) continue
      path.add(n)
      if ((n instanceof FakeSource && n.started) || n.hears(path)) return true
    }
    return false
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1)
  override out(t: number, path: Set<FakeNode>) { return this.sum(t, path) * this.gain.at(t) }
}

/** Filters, compressors, panners: pass the signal through (the tests ask what sounds, not its timbre). */
export class FakeThrough extends FakeNode {
  readonly frequency = new FakeParam(350)
  readonly Q = new FakeParam(1)
  readonly gain = new FakeParam(0)
  readonly detune = new FakeParam(0)
  readonly pan = new FakeParam(0)
  readonly threshold = new FakeParam(-24)
  readonly knee = new FakeParam(30)
  readonly ratio = new FakeParam(12)
  readonly attack = new FakeParam(0.003)
  readonly release = new FakeParam(0.25)
  type = 'lowpass'
}

export class FakeDelay extends FakeNode {
  readonly delayTime = new FakeParam(0)
  override out(t: number, path: Set<FakeNode>) { return this.sum(t - this.delayTime.at(t), path) }
}

export class FakeSource extends FakeNode {
  startAt = Infinity
  stopAt = Infinity
  offset = 0
  started = false
  onended: (() => void) | null = null

  start(when = 0, offset = 0) {
    this.startAt = Math.max(when, this.context.currentTime)
    this.offset = offset
    this.started = true
  }

  stop(when = 0) {
    this.stopAt = Math.max(when, this.context.currentTime)
  }

  playing(t: number) { return this.started && t >= this.startAt && t < this.stopAt }
}

export class FakeBuffer {
  readonly #channels: Float32Array[]
  readonly sampleRate: number
  readonly length: number

  constructor(channels: number, length: number, sampleRate: number) {
    this.#channels = Array.from({ length: channels }, () => new Float32Array(length))
    this.sampleRate = sampleRate
    this.length = length
  }

  get numberOfChannels() { return this.#channels.length }
  get duration() { return this.length / this.sampleRate }
  getChannelData(c: number): Float32Array {
    const ch = this.#channels[c]
    if (!ch) throw new RangeError(`no channel ${c}`)
    return ch
  }
  copyToChannel(src: Float32Array, c: number, start = 0) { this.getChannelData(c).set(src.subarray(0, this.length - start), start) }
}

export class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null
  loop = false
  readonly playbackRate = new FakeParam(1)

  override out(t: number) {
    const b = this.buffer
    if (!b || !this.playing(t)) return 0
    let i = Math.floor((t - this.startAt + this.offset) * b.sampleRate)
    if (this.loop) i %= b.length
    if (i < 0 || i >= b.length) return 0
    let s = 0
    for (let c = 0; c < b.numberOfChannels; c++) s += b.getChannelData(c)[i] ?? 0
    return s / b.numberOfChannels
  }
}

export class FakeWave {
  constructor(readonly real: Float32Array, readonly imag: Float32Array) {}
}

export class FakeOscillator extends FakeSource {
  type = 'sine'
  readonly frequency = new FakeParam(440)
  readonly detune = new FakeParam(0)
  wave: FakeWave | null = null

  setPeriodicWave(w: FakeWave) { this.wave = w; this.type = 'custom' }

  /** The pitch it sounds at time t (Hz). */
  hz(t: number) { return this.frequency.at(t) * Math.pow(2, this.detune.at(t) / 1200) }

  override out(t: number) {
    if (!this.playing(t)) return 0
    const p = this.hz(t) * (t - this.startAt)
    const f = p - Math.floor(p)
    if (this.wave) {
      let s = 0, norm = 0
      for (let k = 1; k < this.wave.real.length; k++) {
        const a = this.wave.real[k] ?? 0, b = this.wave.imag[k] ?? 0
        s += a * Math.cos(2 * Math.PI * k * f) + b * Math.sin(2 * Math.PI * k * f)
        norm += Math.abs(a) + Math.abs(b)
      }
      return norm > 0 ? s / norm : 0
    }
    if (this.type === 'square') return f < 0.5 ? 1 : -1
    if (this.type === 'sawtooth') return 2 * f - 1
    if (this.type === 'triangle') return f < 0.5 ? 4 * f - 1 : 3 - 4 * f
    return Math.sin(2 * Math.PI * f)
  }
}

const BLACKMAN = (i: number, n: number) => 0.42 - 0.5 * Math.cos(2 * Math.PI * i / n) + 0.08 * Math.cos(4 * Math.PI * i / n)

export class FakeAnalyser extends FakeNode {
  fftSize = 2048
  smoothingTimeConstant = 0.8
  minDecibels = -100
  maxDecibels = -30
  #smoothed = new Float64Array(0)

  get frequencyBinCount() { return this.fftSize / 2 }

  override out(t: number, path: Set<FakeNode>) { return this.sum(t, path) }

  /** The last fftSize samples that reached the analyser, oldest first. */
  timeDomain(): Float64Array {
    const n = this.fftSize, t = this.context.currentTime, sr = this.context.sampleRate
    const x = new Float64Array(n)
    if (!this.hears()) return x
    for (let i = 0; i < n; i++) x[i] = this.sum(t - (n - 1 - i) / sr, new Set([this]))
    return x
  }

  /** Smoothed linear magnitudes, per the spec's "smoothing over time". */
  #magnitudes(): Float64Array {
    const n = this.fftSize, bins = n / 2
    if (this.#smoothed.length !== bins) this.#smoothed = new Float64Array(bins)
    const x = this.timeDomain()
    for (let i = 0; i < n; i++) x[i] = (x[i] ?? 0) * BLACKMAN(i, n)
    const cos = new Float64Array(n), sin = new Float64Array(n)
    for (let m = 0; m < n; m++) { cos[m] = Math.cos(2 * Math.PI * m / n); sin[m] = Math.sin(2 * Math.PI * m / n) }
    const tau = this.smoothingTimeConstant
    for (let k = 0; k < bins; k++) {
      let re = 0, im = 0
      for (let i = 0; i < n; i++) {
        const m = (i * k) % n, v = x[i] ?? 0
        re += v * (cos[m] ?? 0)
        im -= v * (sin[m] ?? 0)
      }
      this.#smoothed[k] = tau * (this.#smoothed[k] ?? 0) + (1 - tau) * Math.hypot(re, im) / n
    }
    return this.#smoothed
  }

  getFloatFrequencyData(out: Float32Array) {
    const mag = this.#magnitudes()
    for (let k = 0; k < out.length && k < mag.length; k++) out[k] = 20 * Math.log10(mag[k] ?? 0)
  }

  getByteFrequencyData(out: Uint8Array) {
    const mag = this.#magnitudes()
    const range = this.maxDecibels - this.minDecibels
    for (let k = 0; k < out.length && k < mag.length; k++) {
      const db = 20 * Math.log10(mag[k] ?? 0)
      out[k] = Math.max(0, Math.min(255, Math.floor(255 / range * (db - this.minDecibels))))
    }
  }

  getByteTimeDomainData(out: Uint8Array) {
    const x = this.timeDomain()
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, Math.floor(128 * (1 + (x[i] ?? 0)))))
  }

  getFloatTimeDomainData(out: Float32Array) {
    const x = this.timeDomain()
    for (let i = 0; i < out.length; i++) out[i] = x[i] ?? 0
  }
}

/** The virtual clock every fake reads (ms). */
export class Clock {
  ms = 0
}

export class FakeAudioContext {
  readonly nodes: FakeNode[] = []
  readonly sampleRate = 48000
  readonly destination: FakeNode
  state: 'running' | 'suspended' | 'closed' = 'running'
  readonly #clock: Clock
  readonly #born: number
  #paused = 0
  #pausedAt: number | undefined

  constructor(clock: Clock) {
    this.#clock = clock
    this.#born = clock.ms
    this.destination = new FakeNode(this)
  }

  get currentTime() { return ((this.#pausedAt ?? this.#clock.ms) - this.#born - this.#paused) / 1000 }

  resume() {
    if (this.#pausedAt !== undefined) { this.#paused += this.#clock.ms - this.#pausedAt; this.#pausedAt = undefined }
    this.state = 'running'
    return Promise.resolve()
  }

  suspend() {
    this.#pausedAt ??= this.#clock.ms
    this.state = 'suspended'
    return Promise.resolve()
  }

  close() { this.state = 'closed'; return Promise.resolve() }

  createGain() { return new FakeGain(this) }
  createAnalyser() { return new FakeAnalyser(this) }
  createBiquadFilter() { return new FakeThrough(this) }
  createDynamicsCompressor() { return new FakeThrough(this) }
  createStereoPanner() { return new FakeThrough(this) }
  createDelay() { return new FakeDelay(this) }
  createOscillator() { return new FakeOscillator(this) }
  createBufferSource() { return new FakeBufferSource(this) }
  createBuffer(channels: number, length: number, sampleRate: number) { return new FakeBuffer(channels, length, sampleRate) }
  createPeriodicWave(real: Float32Array, imag: Float32Array) { return new FakeWave(real, imag) }

  /** The oscillators sounding now that reach the speakers. */
  sounding(): FakeOscillator[] {
    const t = this.currentTime
    const live = new Set<FakeNode>()
    const walk = (n: FakeNode) => { for (const i of n.inputs) if (!live.has(i)) { live.add(i); walk(i) } }
    walk(this.destination)
    return this.nodes.filter((n): n is FakeOscillator => n instanceof FakeOscillator && n.playing(t) && live.has(n))
  }

  analysers(): FakeAnalyser[] { return this.nodes.filter((n): n is FakeAnalyser => n instanceof FakeAnalyser) }
}

/** The DOM bits a page uses that linkedom leaves out, installed inside the page's context. */
const PRELUDE = `
window.innerWidth = 960; window.innerHeight = 640; window.devicePixelRatio = 1
window.requestAnimationFrame = __h.raf; window.cancelAnimationFrame = __h.caf
window.AudioContext = __h.AudioContext
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
window.getComputedStyle = el => ({ getPropertyValue: name => el.style.getPropertyValue(name) || '' })
const canvasProto = Object.getPrototypeOf(document.createElement('canvas'))
canvasProto.getContext = function (kind) {
  if (kind !== '2d') return null
  if (this.__g) return this.__g
  const ops = []
  const state = { canvas: this, fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1, font: '10px sans-serif',
    textAlign: 'start', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: 'transparent',
    globalCompositeOperation: 'source-over', imageSmoothingEnabled: true }
  const gradient = kind => (...args) => ({ kind, args, stops: [], addColorStop(o, c) { this.stops.push([o, c]) } })
  const g = new Proxy(state, {
    get(target, p) {
      if (p in target) return target[p]
      if (p === 'ops') return ops
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createConicGradient') return gradient(p)
      if (p === 'measureText') return text => ({ width: String(text).length * 7 })
      return (...args) => { ops.push({ op: p, args, fillStyle: target.fillStyle, strokeStyle: target.strokeStyle, alpha: target.globalAlpha }) }
    },
    set(target, p, v) { target[p] = v; return true }
  })
  this.__g = g
  return g
}
`

export interface PageRun {
  /** Evaluates page-side JavaScript (window is the page's window) and returns the result. */
  eval(code: string): unknown
  /** Moves the clock on by `ms`, running animation frames every `step` ms. */
  advance(ms: number, step?: number): void
  /** Waits (real time) until the page-side expression is truthy. */
  until(code: string, timeoutMs?: number): Promise<void>
  /** The audio contexts the page made. */
  readonly audio: FakeAudioContext[]
  readonly clock: Clock
}

/** Loads glide/pages/<name>.html into a fresh DOM and runs its scripts. */
export function loadPage(name: string): PageRun {
  const html = readFileSync(resolve(PAGES, `${name}.html`), 'utf8')
  const clock = new Clock()
  const audio: FakeAudioContext[] = []
  let frames: { id: number; fn: (t: number) => void }[] = []
  let nextFrame = 1
  const harness = {
    raf: (fn: (t: number) => void) => { frames.push({ id: nextFrame, fn }); return nextFrame++ },
    caf: (id: number) => { frames = frames.filter(f => f.id !== id) },
    AudioContext: class extends FakeAudioContext { constructor() { super(clock); audio.push(this) } }
  }
  const context = createContext({ __dom: parseHTML(html), __h: harness, console, setTimeout, clearTimeout, performance: { now: () => clock.ms } })
  runInContext(`globalThis.window = __dom.window; globalThis.document = __dom.document; globalThis.CustomEvent = __dom.window.CustomEvent`, context)
  runInContext(PRELUDE + EVENTS, context)
  runInContext(`globalThis.requestAnimationFrame = window.requestAnimationFrame`, context)
  const scripts = runInContext(`[...document.querySelectorAll('script:not([src])')].map(s => s.textContent)`, context)
  if (!Array.isArray(scripts)) throw new Error('no scripts')
  for (const code of scripts) if (typeof code === 'string') runInContext(code, context, { filename: `${name}.html` })
  const run: PageRun = {
    eval: code => runInContext(code, context),
    advance(ms, step = 16) {
      for (let left = ms; left > 0; left -= step) {
        clock.ms += Math.min(step, left)
        const due = frames
        frames = []
        for (const f of due) f.fn(clock.ms)
      }
    },
    async until(code, timeoutMs = 20_000) {
      const end = Date.now() + timeoutMs
      while (!runInContext(code, context)) {
        if (Date.now() > end) throw new Error(`timed out waiting for ${code}`)
        await new Promise(r => setTimeout(r, 5))
      }
    },
    audio,
    clock
  }
  return run
}

/** Page-side helpers a test calls through run.eval: window.__key, window.__pointer, window.__click. */
const EVENTS = `
window.__key = (type, key, code, target) => {
  const e = new window.Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { key, code: code || '', repeat: false })
  ;(target || document.body).dispatchEvent(e)
  return e
}
window.__pointer = (type, el, extra) => {
  const e = new window.Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId: 1, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: 0, clientY: 0, ...(extra || {}) })
  el.dispatchEvent(e)
  return e
}
window.__click = el => el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
`
