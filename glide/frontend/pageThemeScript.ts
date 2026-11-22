import type { PageTheme } from '../../frontend/src/glideui/pages.js'

/**
 * The function a page block evaluates: sets the variables on <html> and tells the page's own code. The event's
 * detail carries the phase too (day on a light surface, night on a dark one), so a game can draw its sky.
 */
export function themeFunction(theme: PageTheme, url?: string): string {
  const t = { ...theme, phase: theme.dark ? 'night' : 'day' }
  const vars: Record<string, string> = {
    '--glide-bg': t.bg, '--glide-surface': t.surface, '--glide-fg': t.fg, '--glide-muted': t.muted,
    '--glide-accent': t.accent, '--glide-accent-ink': t.accentInk
  }
  return `function () {
  ${url ? `if (location.href.split('#')[0] !== ${JSON.stringify(url)}) return false` : ''}
  const t = ${JSON.stringify(t)}, v = ${JSON.stringify(vars)}, s = document.documentElement.style
  for (const k in v) s.setProperty(k, v[k])
  s.colorScheme = t.dark ? 'dark' : 'light'
  document.documentElement.dataset.glideTheme = t.dark ? 'dark' : 'light'
  document.documentElement.dataset.glidePhase = t.phase
  window.__glideTheme = t
  window.dispatchEvent(new CustomEvent('glide-theme', { detail: t }))
  return true
}`
}
