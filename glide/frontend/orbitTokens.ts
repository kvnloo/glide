// FOCUS orbit role hues in one named warm-to-cool ramp, with contrast-tuned light seats.
// Like glide/frontend/tokens.ts, this is a token definition file (literal values belong here).
import { DASH, NIGHT, STATUS } from './tokens.js'

export const ROLE_TINT = {
  fast: { dark: '#f2b24c', light: '#c47a12' },
  small: { dark: '#3fc8b4', light: '#0f8a7a' },
  large: { dark: '#a98bf5', light: '#6a4fc4' },
  council: { dark: '#5aa7ff', light: '#1f6fd6' }
} as const

/** The fallback is used when the host does not expose its theme to an SVG image. */
export const ORBIT_MARK = {
  danger: `var(--h-danger, ${STATUS.bad})`,
  deadFallback: { dark: '#ff6b6b', light: '#c62828' }
} as const

export const roleTint = (role: string, dark: boolean): string => {
  const ramp: Readonly<Record<string, { dark: string; light: string }>> = ROLE_TINT
  return ramp[role]?.[dark ? 'dark' : 'light'] ?? (dark ? NIGHT.text2 : DASH.dim)
}
