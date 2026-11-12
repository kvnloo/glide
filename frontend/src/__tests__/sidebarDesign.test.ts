// Design gate for the session aside and both programmed theme polarities.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { HermesSkin } from '@hermes/shared/skin'
import { describe, expect, it, vi } from 'vitest'

import { DASH, STATUS } from '../../../glide/frontend/tokens.js'
import { paletteFor } from '../chrome/palette.js'
import { Sidebar, type SidebarHost } from '../chrome/sidebar.js'
import type { GitState } from '../git/status.js'
import { contrastRatio } from '../hermes/theme.js'

import { stub } from './fakes.js'
import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

interface Node {
  k?: string
  p?: {
    key?: string
    role?: string
    text?: string
    basis?: string
    variant?: string
    min?: { h?: string }
  }
  c?: Node[]
}

const flatten = (node: Node): Node[] => [node, ...(node.c ?? []).flatMap(flatten)]

describe('session sidebar design', () => {
  it('uses compact native rows, one status pill per row, fact chips and content-width actions', async () => {
    const git: GitState = {
      root: '/sample',
      branch: 'feature',
      upstream: 'origin/main',
      ahead: 2,
      behind: 0,
      files: [{ path: 'src/example.ts', status: 'modified', staged: false, additions: 3, deletions: 1 }]
    }
    const host = stub<SidebarHost>({
      changed: vi.fn(),
      session: { info: { cwd: '/sample' } },
      prs: { entries: () => [] }
    })
    const sidebar = new Sidebar(host, async () => git)

    try {
      sidebar.toggle()
      await vi.waitFor(() => expect(sidebar.state).toEqual(git))
      const node = sidebar.node('sidebar')
      expect(node).not.toBeNull()
      const tree = flatten(JSON.parse(JSON.stringify(node)) as Node)
      const rows = tree.filter(n => n.p?.role === 'glide.sidebar.row')
      expect(rows).toHaveLength(3)

      for (const row of rows) {
        expect(row.p?.min?.h).toBe('3lines')
        const parts = flatten(row)
        expect(parts.filter(n => n.k === 'badge' && n.p?.role === 'glide.sidebar.status')).toHaveLength(1)
        for (const button of parts.filter(n => n.k === 'button')) {
          expect(button.p?.basis).toBe('content')
          expect(button.p?.min?.h).toBe('3lines')
        }
      }

      expect(tree.find(n => n.p?.role === 'glide.sidebar.fact')?.p?.text).toBe('main +2')
      expect(tree.filter(n => n.k === 'button' && n.p?.variant === 'primary')).toHaveLength(1)
      expect(tree.some(n => n.k === 'badge' && n.p?.text === 'MODIFIED')).toBe(true)
    } finally {
      sidebar.dispose()
    }
  })

  for (const name of ['sidebar.tsx', 'palette.ts']) {
    it(name + ': opts into the token drift gate', () => {
      const file = fileURLToPath(new URL('../chrome/' + name, import.meta.url))
      expect(tokenDrift(readFileSync(file, 'utf8'))).toEqual(NO_DRIFT)
    })
  }
})

describe('theme palette ink contrast', () => {
  const textInks = ['text', 'muted', 'dim', 'mdLink', 'statusLinePath', 'error', 'accent']

  for (const polarity of ['dark', 'light'] as const) {
    it('keeps every Nous ' + polarity + ' text ink at 4.5:1 on the canvas and focused row', () => {
      const palette = paletteFor('nous', undefined)[polarity] as Record<string, string>
      const backgrounds = [polarity === 'dark' ? DASH.bg : DASH.fg, palette['selectedBg']]
      for (const key of textInks) {
        const ink = palette[key]
        expect(ink, key).toBeDefined()
        for (const bg of backgrounds) {
          expect(contrastRatio(ink, bg) ?? 0, key + ' on ' + bg).toBeGreaterThanOrEqual(4.5)
        }
      }
      expect(palette['statusLineModel']).toBeUndefined()
      expect(palette['mdListBullet']).toBeUndefined()
      expect(palette['mdLink']).not.toBe(palette['accent'])
    })
  }

  it('lifts skin action and status inks against their own theme backgrounds', () => {
    const skin = stub<HermesSkin>({
      name: 'sample',
      colors: { ui_accent: DASH.gold, ui_ok: DASH.success, ui_error: DASH.error, ui_warn: STATUS.warn },
      dark_colors: { background: DASH.bg },
      light_colors: { background: DASH.fg }
    })
    const palette = paletteFor('skin', skin)
    for (const polarity of ['dark', 'light'] as const) {
      const bg = polarity === 'dark' ? DASH.bg : DASH.fg
      const colors = palette[polarity] as Record<string, string>
      for (const key of ['accent', 'error', 'success', 'warning']) {
        expect(contrastRatio(colors[key], bg) ?? 0, polarity + ' ' + key).toBeGreaterThanOrEqual(4.5)
      }
      expect(colors['statusLineModel']).toBeUndefined()
      expect(colors['mdListBullet']).toBeUndefined()
      expect(colors['muted']).toBeUndefined()
    }
  })
})
