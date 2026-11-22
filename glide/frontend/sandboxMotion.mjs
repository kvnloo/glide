// Bridge the pinned kit's WAAPI subset to Tern's native CSS clock. No per-frame
// snapshots, stylesheet writes or SVG blob uploads. This is not a layout engine.
import { createHash } from 'node:crypto'

const properties = new Set(['opacity', 'transform', 'transformOrigin', 'width', 'height', 'left', 'top', 'translate', 'margin', 'padding'])
const kebab = name => name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
const number = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)'
const length = new RegExp(`^${number}(?:px|%)?$`)
const transform = new RegExp(`^(?:\\s*(?:translate[XY]?|scale[XY]?|rotate)\\(${number}(?:px|%|deg)?(?:[, ]+${number}(?:px|%|deg)?)?\\))+$`)
const easingPattern = /^(?:linear|ease(?:-in|-out|-in-out)?|cubic-bezier\([\d., +\-]+\)|steps\(\d+,\s*(?:start|end)\))$/

function value(name, input) {
  const v = String(input ?? '').trim()
  if (name === 'opacity' && length.test(v) && Number.isFinite(Number(v))) return v
  if (name === 'transform') return v === '' || v === 'none' ? 'none' : transform.test(v) ? v : undefined
  if (name === 'translate' && v.split(/\s+/).every(p => length.test(p))) return `translate(${v.split(/\s+/).join(',')})`
  if (name === 'transformOrigin' && /^(?:left|right|center|top|bottom)(?: (?:left|right|center|top|bottom))?$/.test(v)) return v
  if (['width', 'height', 'left', 'top', 'margin', 'padding'].includes(name) && length.test(v)) return v
  return undefined
}

/** Only allow the pinned kit's portable motion declarations across the native CSS boundary. */
function rule(frames, timing, variant) {
  if (!timing.duration || frames.length < 2 || frames.length > 16) return undefined
  let easing = timing.easing
  if (easing.startsWith('linear(')) {
    // Tern 0.9.x uses the portable cubic-bezier subset. Keep the kit's duration
    // and approximate the sampled spring, including overshoot when present.
    const samples = easing.slice(7, -1).split(',').map(Number)
    easing = samples.some(n => n > 1.02) ? 'cubic-bezier(.2,.85,.35,1.18)' : 'cubic-bezier(.2,.75,.3,1)'
  }
  if (!easingPattern.test(easing)) easing = 'ease-out'
  const keys = frames.map((frame, i) => {
    const body = Object.entries(frame).flatMap(([p, v]) => {
      if (!properties.has(p)) return []
      const parsed = value(p, v)
      return parsed === undefined ? [] : [`${p === 'translate' ? 'transform' : kebab(p)}:${parsed}`]
    }).join(';')
    return body ? `${+(100 * i / (frames.length - 1)).toFixed(2)}%{${body}}` : ''
  }).join('')
  if (!keys) return undefined
  const args = `${timing.duration}ms ${easing} ${timing.delay}ms ${timing.iterations === Infinity ? 'infinite' : timing.iterations} ${timing.direction} ${timing.fill}`
  const id = createHash('sha256').update(JSON.stringify([keys, args, variant])).digest('hex').slice(0, 16)
  const name = `eui-motion-${id}`
  const selector = `[data-eui-motion='${name}']`
  return {
    name,
    css: `@keyframes ${name}{${keys}}\n${selector}{animation:${name} ${args}}\n@media (prefers-reduced-motion: reduce){${selector}{animation:none!important}}\n`
  }
}

const ms = n => Number.isFinite(n) ? Math.min(120_000, Math.max(0, Math.round(n))) : 0
const timers = new WeakMap()
const installed = new WeakSet()

export function motionBridge(document, prototype, log) {
  const latest = new WeakMap()
  const variants = new WeakMap()
  const owners = new WeakMap()
  const byElement = new WeakMap()
  let building
  const bridge = {
    createRoot(root, changed) {
      const active = new Set()
      let queued = false, disposed = false
      const owner = {
        active,
        notify() {
          if (disposed || queued) return
          queued = true
          queueMicrotask(() => {
            queued = false
            if (!disposed) changed()
          })
        }
      }
      owners.set(root, owner)
      return {
        make(fn) {
          building = owner
          try { return fn() } finally { building = undefined }
        },
        dispose() {
          disposed = true
          for (const a of active) a.cancel()
          owners.delete(root)
        },
        prune() {
          for (const a of active) if (!root.contains(a.element)) a.cancel()
        }
      }
    },
    animate(el, frames, opts) {
      const owner = owners.get(el.closest('[data-eui="card"]')) ?? building
      const f = Array.isArray(frames) ? frames : []
      const timing = {
        duration: ms(typeof opts === 'number' ? opts : opts?.duration),
        delay: ms(opts?.delay),
        iterations: opts?.iterations === Infinity ? Infinity : Math.max(1, Math.min(100, Math.floor(opts?.iterations || 1))),
        easing: String(opts?.easing ?? 'linear'),
        direction: ['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(opts?.direction) ? opts.direction : 'normal',
        fill: ['none', 'both', 'forwards', 'backwards'].includes(opts?.fill) ? opts.fill : 'none'
      }
      const duration = timing.duration * timing.iterations
      const end = (Number.isNaN(duration) ? 0 : duration) + timing.delay
      let timer, elapsed = 0, started = performance.now(), resolve, reject
      const set = byElement.get(el) ?? new Set()
      byElement.set(el, set)
      const variant = (variants.get(el) ?? 0) ^ 1
      variants.set(el, variant)
      const css = owner && el.namespaceURI !== 'http://www.w3.org/2000/svg' ? rule(f, timing, variant) : undefined
      const previous = latest.get(el)
      const a = {
        element: el,
        rule: css,
        finished: new Promise((res, rej) => { resolve = res; reject = rej }),
        playState: 'running',
        onfinish: null,
        get currentTime() { return Math.min(end, elapsed + (this.playState === 'running' ? performance.now() - started : 0)) },
        cancel() {
          if (this.playState !== 'running' && this.playState !== 'paused') return
          this.playState = 'idle'
          cleanup()
          reject(bridge.cancelReason)
        },
        finish() {
          if (this.playState !== 'running' && this.playState !== 'paused') return
          elapsed = end
          this.playState = 'finished'
          if ((timing.fill === 'forwards' || timing.fill === 'both') && latest.get(el) === a) {
            const reverse = timing.direction === 'reverse' || (timing.direction === 'alternate' && timing.iterations % 2 === 0) ||
              (timing.direction === 'alternate-reverse' && timing.iterations % 2 !== 0)
            const last = reverse ? f[0] : f.at(-1)
            if (last) for (const [k, v] of Object.entries(last)) {
              if (k !== 'offset' && k !== 'easing') el.style.setProperty(kebab(k), String(v))
            }
          }
          cleanup()
          resolve(this)
          try { this.onfinish?.() } catch (e) { log(e) }
        },
        pause() {
          if (this.playState !== 'running') return
          elapsed = this.currentTime
          this.playState = 'paused'
          clearTimeout(timer)
          owner?.notify()
        },
        play() {
          if (this.playState !== 'paused') return
          started = performance.now()
          this.playState = 'running'
          schedule()
          owner?.notify()
        },
        addEventListener() {}
      }
      const schedule = () => {
        if (Number.isFinite(end)) {
          timer = setTimeout(() => a.finish(), Math.max(0, end - a.currentTime))
          timer.unref?.()
        }
      }
      const cleanup = () => {
        clearTimeout(timer)
        set.delete(a)
        owner?.active.delete(a)
        if (latest.get(el) === a) {
          latest.delete(el)
          if (css) owner?.notify()
        }
      }
      a.finished.catch(() => {}) // WAAPI cancellation rejects; fire-and-forget kit calls need no handler.
      latest.set(el, a)
      set.add(a)
      owner?.active.add(a)
      if (css || previous?.rule) owner?.notify()
      schedule()
      return a
    },
    animations(el, subtree) {
      const all = [...(byElement.get(el) ?? [])]
      if (subtree) for (const child of el.querySelectorAll('*')) all.push(...(byElement.get(child) ?? []))
      return all
    }
  }
  bridge.snapshot = el => {
    const a = latest.get(el)
    return a?.rule && { ...a.rule, paused: a.playState === 'paused' }
  }
  timers.set(document, bridge)
  // linkedom shares prototypes across documents. Route each call to its own sandbox.
  if (!installed.has(prototype)) {
    installed.add(prototype)
    prototype.animate = function (frames, opts) { return timers.get(this.ownerDocument)?.animate(this, frames, opts) }
    prototype.getAnimations = function (opts) { return timers.get(this.ownerDocument)?.animations(this, opts?.subtree) ?? [] }
  }
  return bridge
}
