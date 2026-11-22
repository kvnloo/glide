import { Node } from '@stencil-hq/tern'
import { describe, expect, it, vi } from 'vitest'

import { Sidebar, type SidebarHost } from '../chrome/sidebar.js'
import { liveSessionId } from '../core/ids.js'
import type { GitState } from '../git/status.js'

import { must, stub } from './fakes.js'

const checkout = (root: string): GitState => ({ ahead: 0, behind: 0, branch: 'main', files: [], root })

describe('Sidebar', () => {
  it('shows saved pages with an Open action in the native sidebar', async () => {
    const open = vi.fn()
    const sidebar = new Sidebar(stub<SidebarHost>({
      changed: vi.fn(), session: { info: null }, prs: { entries: () => [] }
    }), async () => undefined, {
      list: () => [{ id: 'scene', path: '/tmp/scene.html', title: 'Gold Scene', how: 'over', opened: 1 }],
      open
    })
    sidebar.toggle()
    const node = sidebar.node('layer.sidebar')
    if (!(node instanceof Node)) throw new Error('Sidebar not drawn')
    expect(node.props['sections']).toContainEqual({
      id: 'pages', title: 'Pages',
      rows: [{ id: 'page:scene', label: 'Gold Scene', control: { k: 'action', act: 'open-page', label: 'Open' } }]
    })
    await node.handlers?.onAction?.['open-page']?.({ ev: 'action', sf: 's0', id: 'sidebar', act: 'open-page', value: 'page:scene', raw: {} })
    expect(open).toHaveBeenCalledWith('scene')
    sidebar.dispose()
  })
  it("drops a git read for the last session, and reads the adopted one's right after it", async () => {
    const reads = new Map<string, PromiseWithResolvers<GitState | undefined>>()
    const read = vi.fn((cwd: string) => {
      const r = Promise.withResolvers<GitState | undefined>()
      reads.set(cwd, r)

      return r.promise
    })
    const session = { info: { cwd: '/a' } }
    const sidebar = new Sidebar(stub<SidebarHost>({ changed: vi.fn(), session }), read)
    sidebar.adopt(liveSessionId('a'))
    sidebar.toggle()
    expect(read).toHaveBeenCalledWith('/a')

    // Session b is adopted while a's read runs: b's read waits for it, and a's answer is dropped.
    session.info = { cwd: '/b' }
    sidebar.adopt(liveSessionId('b'))
    expect(read).toHaveBeenCalledTimes(1)
    must(reads.get('/a')).resolve(checkout('/a'))
    await vi.waitFor(() => expect(read).toHaveBeenCalledWith('/b'))
    expect(sidebar.state).toBeUndefined()

    must(reads.get('/b')).resolve(checkout('/b'))
    await vi.waitFor(() => expect(sidebar.state?.root).toBe('/b'))
    sidebar.dispose()
  })

  it('reads every five seconds while open, and not once closed', async () => {
    vi.useFakeTimers()

    try {
      const read = vi.fn(async (cwd: string) => checkout(cwd))
      const sidebar = new Sidebar(stub<SidebarHost>({ changed: vi.fn(), session: { info: { cwd: '/a' } } }), read)
      sidebar.toggle()
      await vi.advanceTimersByTimeAsync(0)
      expect(read).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(5000)
      expect(read).toHaveBeenCalledTimes(2)

      sidebar.toggle()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(read).toHaveBeenCalledTimes(2)
      sidebar.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})
