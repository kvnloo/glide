import { describe, expect, it, vi } from 'vitest'

import { filmCommand } from '../film.js'
import { editorUrl, filmBridge } from '../../wire/fframestudio.js'

const BRIDGE = JSON.stringify({ url: 'http://127.0.0.1:17888', token: 'tok-1', root: '/lib', pid: 1 })
const PROJECT = JSON.stringify({ id: 'meta', title: 'Meta film', kind: 'fframes', duration_s: 12, renders: [{}], shots: [{ id: 'a', name: 'Hook', t0: 0, t1: 4 }, { id: 'b', name: 'Ask', t0: 4, t1: 12 }] })
const files: Record<string, string> = { '/b.json': BRIDGE, '/lib/projects/meta/project.json': PROJECT, '/lib/projects/library.json': JSON.stringify({ projects: [{ id: 'meta', title: 'Meta film' }] }) }
const read = async (p: string) => { const f = files[p]; if (f === undefined) throw new Error('ENOENT'); return f }

function host() {
  const update = vi.fn()
  const publishNative = vi.fn(() => ({ update }))
  return { update, publishNative, h: { eui: { host: { publishNative } }, transcript: { notice: vi.fn(), panel: vi.fn() } } }
}

describe('/film', () => {
  it('decodes only a loopback bridge and deep-links the editor to the project', () => {
    expect(filmBridge(JSON.stringify({ url: 'http://evil.example', token: 't', root: '/' }))).toBeUndefined()
    const b = filmBridge(BRIDGE)
    if (!b) throw new Error('bridge')
    expect(editorUrl(b, 'meta')).toBe('http://127.0.0.1:17888/open?token=tok-1&to=%23%2Fp%2Fmeta')
  })

  it('publishes the project card and opens the fframestudio editor under the pane', async () => {
    const { h, publishNative, update } = host()
    const browser = vi.fn(async () => ({ ok: true }))
    await filmCommand(h, 'meta', { read, browser, owner: 7, bridgeFile: '/b.json' })
    expect(browser).toHaveBeenCalledWith({ op: 'open', owner: 7, url: 'http://127.0.0.1:17888/open?token=tok-1&to=%23%2Fp%2Fmeta', how: 'below' })
    expect(publishNative).toHaveBeenCalledOnce()
    const card = JSON.stringify(update.mock.calls.at(-1))
    expect(card).toContain('Meta film')
    expect(card).toContain('12.0 s')
    expect(card).toContain('Hook')
    expect(card).not.toContain('tok-1')
  })

  it('says what is missing instead of failing silently', async () => {
    const a = host()
    await filmCommand(a.h, 'meta', { read, owner: 7, bridgeFile: '/none.json' })
    expect(a.h.transcript.notice).toHaveBeenCalledWith(expect.stringContaining('npm run bridge'), 'warning')
    const b = host()
    await filmCommand(b.h, '../etc', { read, owner: 7, bridgeFile: '/b.json' })
    expect(b.h.transcript.notice).toHaveBeenCalledWith(expect.stringContaining('no fframestudio project'), 'warning')
    const c = host()
    await filmCommand(c.h, '', { read, owner: 7, bridgeFile: '/b.json' })
    expect(c.h.transcript.panel).toHaveBeenCalledWith('/film <project>', expect.stringContaining('Meta film'))
  })
})
