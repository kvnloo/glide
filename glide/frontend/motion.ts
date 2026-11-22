// Finite UI timings from Dash MOTION.md at 166998f3. The shared ephemeral-ui
// theme speed and turbo multipliers are a separate contract.
export const NORMAL_MOTION_MS = {
  press: 70, fade: 120, nav: 140, snappy: 150, settle: 180, enter: 150, exit: 120
} as const

export const TURBO_MOTION_MS = {
  press: 60, fade: 100, nav: 120, snappy: 100, settle: 120, enter: 0, exit: 0
} as const

export const CRITICAL_EASE = 'linear(0, 0.228, 0.538, 0.752, 0.875, 0.940, 0.972, 0.988, 0.995, 0.998, 1)'

/** Critically damped response normalized to land exactly at the deadline. */
export function criticalProgress(t: number): number {
  return (1 - (1 + 9 * t) * Math.exp(-9 * t)) / (1 - 10 * Math.exp(-9))
}
