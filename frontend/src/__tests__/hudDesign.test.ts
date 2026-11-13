// Regression coverage for the scoped HUD/notice design pass. Rendering remains owned by Tern.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { hudKey } from '../chrome/hud.js'
import { Notices, noticeLine } from '../chrome/notices.js'

import { key } from './fakes.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const here = dirname(fileURLToPath(import.meta.url))
const stylesFile = join(here, '../view/styles.ts')
const styles = readFileSync(stylesFile, 'utf8')

// styles.ts contains older, unrelated rules outside the tokens gate. Only these two selector
// sections are in this worker's edit scope, so opt their complete source into the same gate.
function cssSection(start: string, end: string): string {
  const from = styles.indexOf(start)
  const to = styles.indexOf(end, from)
  expect(from).toBeGreaterThan(-1)
  expect(to).toBeGreaterThan(from)
  return styles.slice(from, to)
}

const noticeCss = cssSection('/* Gateway notices:', '/* While a turn runs')
const hudCss = cssSection('/* HUD pills and goal/loop capsules:', '/* What the keys do while a pill holds them')

describe('HUD pills and notice strip design', () => {
  it('keeps keyboard focus, navigation, open and handback unchanged', () => {
    const pills = ['todos', 'agents', 'shells', 'prs', 'goal', 'loop'] as const
    const idle = { idle: true, pills }

    expect(hudKey(key('down'), idle)).toEqual({ consumed: true, focused: 'todos' })
    expect(hudKey(key('down'), { ...idle, idle: false })).toEqual({ consumed: false })
    expect(hudKey(key('right'), { ...idle, focused: 'todos' })).toEqual({ consumed: true, focused: 'agents' })
    expect(hudKey(key('left'), { ...idle, focused: 'agents' })).toEqual({ consumed: true, focused: 'todos' })
    expect(hudKey(key('enter'), { ...idle, focused: 'agents' })).toEqual({ consumed: true, open: 'agents' })
    expect(hudKey(key('escape'), { ...idle, focused: 'agents' })).toEqual({ consumed: true })
    expect(hudKey(key('up'), { ...idle, focused: 'agents' })).toEqual({ consumed: true })
    expect(hudKey(key('x', { text: 'x' }), { ...idle, focused: 'agents' })).toEqual({ consumed: false })
  })

  it('projects a single plain line per notice, preserving warning, error and success tones', () => {
    expect(noticeLine('  Host\n  session   ready  ')).toBe('Host session ready')
    const notices = new Notices()
    notices.show({ key: 'fail', text: 'Lane\r\n timed out. Retry?', level: 'error', kind: 'sticky' }, 100)
    notices.show({ key: 'hold', text: 'Host\n paused', level: 'warn', kind: 'sticky' }, 101)
    notices.show({ key: 'done', text: 'Task\t finished', level: 'success', kind: 'sticky' }, 102)
    expect(notices.active(103).map(n => [n.text, n.tone])).toEqual([
      ['Lane timed out. Retry?', 'error'],
      ['Host paused', 'warning'],
      ['Task finished', 'success']
    ])
    expect(notices.otherError(103)?.text).toBe('Lane timed out. Retry?')
  })

  it('styles each pill as a mono uppercase status pill, with gold reserved for focus', () => {
    expect(hudCss).toContain('font: 500 ${TYPE.label}px/1.4 ${MONO}')
    expect(hudCss).toContain('letter-spacing: ${TRACK.caps}')
    expect(hudCss).toContain('border-radius: ${RADIUS.pill}px')
    expect(hudCss).not.toContain('min-height: 44px') // one-line pills, omp density
    expect(hudCss).toContain("data-role='hermes.automation.item'")
    expect(hudCss).toContain('flex-wrap: wrap')
    expect(hudCss).toContain("data-mark='pick'")
    expect(hudCss).toContain('var(--sf-p-accent, var(--accent))')
    expect(hudCss).not.toMatch(/transition|animation/) // nothing moves, so reduced motion needs no override
  })

  it('maps each notice tone to its host status hue', () => {
    expect(noticeCss).toContain('var(--sf-c-warning, var(--t2))')
    expect(noticeCss).toContain('var(--sf-c-error, var(--t2))')
    expect(noticeCss).toContain('var(--sf-c-success, var(--t2))')
    expect(noticeCss).toContain('white-space: nowrap')
  })

  it('keeps both edited selector sections within the token drift gate', () => {
    expect(tokenDrift(noticeCss)).toEqual(NO_DRIFT)
    expect(tokenDrift(hudCss)).toEqual(NO_DRIFT)
  })

  for (const file of ['../chrome/hud.ts', '../chrome/attention.ts', '../chrome/notices.ts']) {
    it(`${file} uses no stray visual literals`, () => {
      expect(tokenDrift(readFileSync(join(here, file), 'utf8'))).toEqual(NO_DRIFT)
    })
  }
})
