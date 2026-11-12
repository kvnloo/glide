// The orbit's planets as pointer targets. Tern's SDK sends a program clicks, never hover or pointer
// moves, so hover lives in this stylesheet on the client: each planet is a native button riding a CSS arm
// that turns about the voice orb. Over the orbit the arms pause where they are (no position jump), and a
// brake transition carries each planet on from full speed to rest in BRAKE_S, so they ease to a stop and
// ease off again on leave. Stopped planets wobble like iOS home-screen icons in edit mode and wear a small
// edit badge: they can be picked. The planet under the pointer grows and names its lane. Reduced motion
// seats the planets still and shows a dashed ring instead of the wobble.
import { minifyCss } from '../../../glide/frontend/css.js'
import { DASH, NIGHT, RADIUS, TYPE } from '../../../glide/frontend/tokens.js'

import { deadMark, HALO, lanePeriod, type OrbitLane, orbitLayout, ORBIT_SCALE, orbitScene, orbitUnits, PLANET, tint } from './orbit.js'

/** The stylesheet's name in Tern. */
export const ORBIT_SHEET = 'glide-orbit'
/** The orbit container's class; `-still` marks reduced motion. */
export const ORBIT_CLASS = 'glide-orbit'
/** Seconds the hover brake takes from full speed to rest (and back on leave). */
export const BRAKE_S = 0.3
/**
 * The brake's curve: the cubic Bézier form of the quadratic 2s − s², whose slope is 2 at s = 0 and 0 at
 * s = 1. Covering ω·BRAKE_S/2 along it, a planet leaves at exactly its orbit speed ω and arrives at rest.
 */
export const BRAKE_EASE = 'cubic-bezier(0.3333, 0.6667, 0.6667, 1)'
/** Edit-mode wobble: ±JIGGLE_DEG, one full wobble per JIGGLE_S (about 7 Hz, as on an iPhone home screen). */
export const JIGGLE_DEG = 2.5
/** …and a sub-pixel bob with it, as an iPhone icon's off-centre pivot gives, so a round planet visibly wobbles too. */
export const JIGGLE_PX = 0.8
export const JIGGLE_S = 0.14
/** A planet's hit target, in pixels: wider than the planet so a stopped one is easy to click. */
export const HIT = 44
/** The hovered planet's scale, and its label's gap above the hit box: clear of the scaled planet and badge. */
export const HOVER_SCALE = 1.35
const LABEL_GAP = Math.ceil((HIT * (HOVER_SCALE - 1)) / 2) + 5

/** One lane's seat on the CSS orbit, everything in pixels and seconds. */
export interface Seat {
  readonly role: string
  /** Whether its arm turns (a dead lane, or any lane under reduced motion, sits still). */
  readonly moving: boolean
  /** Its angle at t = 0 (orbitLayout's theta), in radians. */
  readonly theta: number
  readonly period: number
  /** The arm's side: the orbit's diameter, centred on the voice orb. */
  readonly arm: number
  /** Its arm's animation-delay: negative, so the turn starts at theta. */
  readonly delay: number
  /** Degrees the brake carries it on past the pause (ω·BRAKE_S/2). */
  readonly brake: number
  /** Its wobble's phase offset, so neighbours never wobble in step. */
  readonly jiggleDelay: number
}

const TAU = 2 * Math.PI
const f = (v: number, d = 3) => Number(v.toFixed(d)).toString()

/** Pixels per viewBox unit as the scene image is drawn (its size is rounded, so not quite ORBIT_SCALE). */
export const orbitPx = (lanes: readonly OrbitLane[]) => orbitScene(lanes).w / orbitUnits(lanes).w

/** Each lane's seat. CSS turns clockwise and theta runs counter-clockwise from the bottom, so an arm turns to −theta. */
export function orbitSeats(lanes: readonly OrbitLane[], reduce = false): Seat[] {
  const px = orbitPx(lanes)
  return orbitLayout(lanes, 0, reduce).map((s, i) => {
    const period = lanePeriod(s.role)
    const moving = !s.parked && !reduce
    const turn = ((s.theta % TAU) + TAU) % TAU
    return {
      role: s.role,
      moving,
      theta: s.theta,
      period,
      arm: 2 * s.r * px,
      delay: moving ? -(turn / TAU) * period : 0,
      brake: moving ? ((360 / period) * BRAKE_S) / 2 : 0,
      // A golden-ratio step spreads the phases evenly over one wobble.
      jiggleDelay: -((i * 0.618034) % 1) * JIGGLE_S
    }
  })
}

/** The planet's centre on a CSS arm at angle `deg` (CSS rotate, clockwise), in the scene's pixels. */
export function armPoint(lanes: readonly OrbitLane[], seat: Seat, deg: number): { x: number; y: number } {
  const { w, h } = orbitScene(lanes)
  const a = (deg * Math.PI) / 180
  const r = seat.arm / 2
  // The button sits at the bottom centre of the arm's square: (0, r) from its centre, then rotated.
  return { x: w / 2 - r * Math.sin(a), y: h / 2 + r * Math.cos(a) }
}

/** The arm's CSS angle at `seconds` of its animation (before any hover). */
export function armAngle(seat: Seat, seconds: number): number {
  if (!seat.moving) return (-seat.theta * 180) / Math.PI
  return (-360 * (seconds - seat.delay)) / seat.period
}

/**
 * Where a hover leaves a moving arm: paused at `enter`, then carried on by the brake for BRAKE_S along
 * BRAKE_EASE (the quadratic it encodes). `seconds` is clock time; before `enter` it just turns.
 */
export function brakedAngle(seat: Seat, seconds: number, enter: number): number {
  if (seconds <= enter || !seat.moving) return armAngle(seat, seconds)
  const s = Math.min(1, (seconds - enter) / BRAKE_S)
  return armAngle(seat, enter) - seat.brake * (2 * s - s * s)
}

const n = (v: number) => v.toFixed(1)

/** A planet's face (its body, highlight and thinking halo, or a dead lane's mark), centred in a HIT box. */
export function planetSvg(lane: OrbitLane, dark: boolean): string {
  const u = HIT / ORBIT_SCALE
  const c = u / 2
  const r = PLANET * 1.1
  const hue = lane.hue ?? tint(lane.role, dark)
  const edge = dark ? DASH.bg : DASH.fg
  const body = lane.state === 'dead'
    ? deadMark(c, c, r, dark)
    : (lane.state === 'thinking' ? `<circle cx="${n(c)}" cy="${n(c)}" r="${n(HALO * 1.1)}" fill="${dark ? NIGHT.text2 : DASH.dim}" fill-opacity="0.2"/>` : '') +
      `<circle cx="${n(c)}" cy="${n(c)}" r="${n(r)}" fill="${hue}" stroke="${edge}" stroke-width="0.8"/>` +
      `<circle cx="${n(c - r * 0.3)}" cy="${n(c - r * 0.3)}" r="${n(r * 0.35)}" fill="${DASH.fg}" fill-opacity="0.4"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HIT}" height="${HIT}" viewBox="0 0 ${n(u)} ${n(u)}">${body}</svg>`
}

/** A moving planet's comet tail in its arm's frame (planet at the bottom), as long as the lane is quick. */
export function tailSvg(lane: OrbitLane, seat: Seat, dark: boolean): string {
  const u = seat.arm / ORBIT_SCALE
  const c = u / 2
  const rr = c
  const r = PLANET * 1.1
  const ink = dark ? NIGHT.text3 : DASH.dim
  const dots = Array.from({ length: 6 }, (_, i) => {
    const th = -((i + 1) / 6) * ((TAU * 0.35) / seat.period)
    const k = 1 - (i + 1) / 7
    return `<circle cx="${n(c + rr * Math.sin(th))}" cy="${n(c + rr * Math.cos(th))}" r="${n(r * (0.35 + 0.5 * k))}" fill-opacity="${(0.18 * k).toFixed(2)}"/>`
  }).join('')
  const px = Math.round(seat.arm)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n(u)} ${n(u)}"><g data-tail="${lane.role}" fill="${ink}">${dots}</g></svg>`
}

/** The hover hint's iOS-style edit badge: a small disc with three dots (pick a model). */
export function badgeSvg(dark: boolean): string {
  const fill = dark ? DASH.fg : DASH.dim
  const ink = dark ? DASH.bg : DASH.fg
  return `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="5" fill="${fill}" stroke="${ink}" stroke-width="0.8"/>` +
    [3.2, 5.5, 7.8].map(x => `<circle cx="${x}" cy="5.5" r="0.85" fill="${ink}"/>`).join('') + '</svg>'
}

/** The orbit's stylesheet for these lanes: the arms, their pause, brake and wobble, and the hover label. */
export function orbitCss(lanes: readonly OrbitLane[], reduce = false): string {
  const { w, h } = orbitScene(lanes)
  const seats = orbitSeats(lanes, reduce)
  const O = `.${ORBIT_CLASS}`
  const half = HIT / 2
  const rules = [
    `${O} { position: relative; flex: none; width: ${w}px; height: ${h}px; }`,
    `${O} [data-role='glide.orbit.bg'] { position: absolute; left: 0; top: 0; }`,
    // Tern opens an image viewer on a click on any image (`.sf-zoom`): here clicks belong to the planets' buttons.
    `${O} .sf-image { pointer-events: none; cursor: default; }`,
    `${O} .glide-orbit-arm { position: absolute; pointer-events: none; animation-name: glide-orbit-turn; animation-timing-function: linear; animation-iteration-count: infinite; }`,
    `${O} .glide-orbit-brake, ${O} .glide-orbit-unbrake, ${O} .glide-orbit-jiggle { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }`,
    `${O} .glide-orbit-brake, ${O} .glide-orbit-unbrake { transition: transform ${BRAKE_S}s ${BRAKE_EASE}; }`,
    `${O} .glide-orbit-tail { position: absolute; left: 0; top: 0; pointer-events: none; transition: opacity ${BRAKE_S}s; }`,
    `${O} .glide-orbit-planet { position: absolute; left: 50%; top: 100%; width: ${HIT}px; height: ${HIT}px; margin: -${half}px 0 0 -${half}px; padding: 0; border: 0; border-radius: 50%; background: transparent; pointer-events: auto; cursor: pointer; }`,
    `${O} .glide-orbit-face { position: absolute; left: 0; top: 0; right: 0; bottom: 0; animation-name: glide-orbit-unturn; animation-timing-function: linear; animation-iteration-count: infinite; }`,
    `${O} .glide-orbit-jiggle { transition: transform .18s ease-out; }`,
    `${O} .glide-orbit-jiggle [data-role='glide.orbit.face'] { position: absolute; left: 0; top: 0; }`,
    // The badge overlaps the planet's upper-left rim, as iOS's edit badge does an icon's corner.
    `${O} .glide-orbit-badge { position: absolute; left: ${Math.round(HIT / 2 - PLANET * ORBIT_SCALE)}px; top: ${Math.round(HIT / 2 - PLANET * ORBIT_SCALE)}px; opacity: 0; transition: opacity .2s; }`,
    `${O} .glide-orbit-ring { position: absolute; left: 1px; top: 1px; right: 1px; bottom: 1px; border-radius: 50%; border: 1.5px dashed var(--t2, ${NIGHT.text2}); opacity: 0; transition: opacity .2s; }`,
    `${O} .glide-orbit-label { position: absolute; left: 50%; bottom: 100%; margin-bottom: ${LABEL_GAP}px; translate: -50% 0; padding: 2px 7px; border-radius: ${RADIUS.pill}px; white-space: nowrap; font: 500 ${TYPE.meta}px var(--sans, sans-serif); color: var(--t1, ${NIGHT.text}); background: var(--pop-bg, ${NIGHT.canvas}); border: 1px solid var(--l2, ${NIGHT.borderStrong}); box-shadow: 0 3px 10px rgba(0,0,0,.28); opacity: 0; pointer-events: none; transition: opacity .15s; }`,
    // Hover: the arms and faces stop where they are; the brake carries each on to rest.
    `${O}:hover .glide-orbit-arm, ${O}:hover .glide-orbit-face { animation-play-state: paused; }`,
    `${O}:focus-within .glide-orbit-arm, ${O}:focus-within .glide-orbit-face { animation-play-state: paused; }`,
    `${O}:hover .glide-orbit-badge, ${O}:focus-within .glide-orbit-badge { opacity: 1; }`,
    // A stopped planet leaves no comet tail.
    `${O}:hover .glide-orbit-tail, ${O}:focus-within .glide-orbit-tail { opacity: 0; }`,
    `${O}:hover .glide-orbit-jiggle, ${O}:focus-within .glide-orbit-jiggle { animation-name: glide-orbit-jiggle; animation-duration: ${JIGGLE_S}s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }`,
    `${O}:hover .glide-orbit-arm:hover { z-index: 3; }`,
    `${O} .glide-orbit-planet:hover .glide-orbit-jiggle, ${O} .glide-orbit-planet:focus-visible .glide-orbit-jiggle { animation-name: none; transform: scale(${HOVER_SCALE}); }`,
    `${O} .glide-orbit-planet:focus-visible { outline: 2px solid var(--t1, ${NIGHT.text}); outline-offset: 2px; }`,
    `${O} .glide-orbit-planet:hover .glide-orbit-label, ${O} .glide-orbit-planet:focus-visible .glide-orbit-label { opacity: 1; }`,
    // Reduced motion: nothing moves; a dashed ring says the planets can be picked.
    `${O}.glide-orbit-still:hover .glide-orbit-jiggle, ${O}.glide-orbit-still:focus-within .glide-orbit-jiggle { animation-name: none; }`,
    `${O}.glide-orbit-still:hover .glide-orbit-ring, ${O}.glide-orbit-still:focus-within .glide-orbit-ring { opacity: 1; }`,
    `${O}.glide-orbit-still .glide-orbit-planet:hover .glide-orbit-jiggle { transform: scale(1.2); }`,
    `@keyframes glide-orbit-turn { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }`,
    `@keyframes glide-orbit-unturn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
    `@keyframes glide-orbit-jiggle { 0%, 100% { transform: translate(-${JIGGLE_PX}px, ${JIGGLE_PX / 2}px) rotate(-${JIGGLE_DEG}deg); } 50% { transform: translate(${JIGGLE_PX}px, -${JIGGLE_PX / 2}px) rotate(${JIGGLE_DEG}deg); } }`
  ]
  seats.forEach((s, i) => {
    const L = `${O} .glide-orbit-s${i}`
    const at = `left: ${f(w / 2 - s.arm / 2)}px; top: ${f(h / 2 - s.arm / 2)}px; width: ${f(s.arm)}px; height: ${f(s.arm)}px;`
    if (s.moving) {
      const timing = `animation-duration: ${f(s.period)}s; animation-delay: ${f(s.delay, 4)}s;`
      rules.push(`${L} { ${at} ${timing} }`, `${L} .glide-orbit-face { ${timing} }`,
        `${O}:hover .glide-orbit-s${i} > .glide-orbit-brake, ${O}:focus-within .glide-orbit-s${i} > .glide-orbit-brake { transform: rotate(-${f(s.brake)}deg); }`,
        `${O}:hover .glide-orbit-s${i} .glide-orbit-unbrake, ${O}:focus-within .glide-orbit-s${i} .glide-orbit-unbrake { transform: rotate(${f(s.brake)}deg); }`)
    } else {
      const deg = f((s.theta * 180) / Math.PI)
      rules.push(`${L} { ${at} animation-name: none; transform: rotate(-${deg}deg); }`, `${L} .glide-orbit-face { animation-name: none; transform: rotate(${deg}deg); }`)
    }
    rules.push(`${L} .glide-orbit-jiggle { animation-delay: ${f(s.jiggleDelay, 4)}s; }`)
  })
  // CSS media fallback covers a host that has not threaded its reduced-motion preference
  // through to orbitCss; the true fixed seats are the same as orbitLayout(..., true).
  const fixed = orbitSeats(lanes, true)
  rules.push(`@media (prefers-reduced-motion: reduce) {
    ${O} .glide-orbit-arm, ${O} .glide-orbit-face, ${O} .glide-orbit-jiggle { animation: none !important; transition: none !important; }
    ${O} .glide-orbit-brake, ${O} .glide-orbit-unbrake { transform: none !important; transition: none !important; }
    ${O} .glide-orbit-jiggle { transform: none !important; }
    ${O} .glide-orbit-tail { opacity: 0 !important; }
    ${O}:hover .glide-orbit-ring, ${O}:focus-within .glide-orbit-ring { opacity: 1; }
    ${fixed.map((seat, i) => {
      const deg = f((seat.theta * 180) / Math.PI)
      return `${O} .glide-orbit-s${i} { transform: rotate(-${deg}deg) !important; }
        ${O} .glide-orbit-s${i} .glide-orbit-face { transform: rotate(${deg}deg) !important; }`
    }).join('\n')}
  }`)
  return minifyCss(rules.join('\n'))
}
