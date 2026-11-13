import type { ActionEvent } from '@stencil-hq/tern'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { storedSessionId } from '../core/ids.js'
import { INPUT_ID } from '../surface/host.js'
import type { FactorySnapshot } from '../wire/factory.js'

import { settle, setup } from './appSetup.js'
import { key, must, type Reply, topNodes } from './fakes.js'

vi.mock('@tui/lib/history.js', () => ({ append: () => undefined, load: () => [] }))
vi.mock('../eui/sandbox.js', async (importOriginal: () => Promise<typeof import('../eui/sandbox.js')>) => ({
  ...await importOriginal(),
  vendorDir: () => ''
}))

type Status = 'pending' | 'approved'
type Aside = 'factory' | 'sidebar' | 'prs'
const apps: ReturnType<typeof setup>['app'][] = []
const contract = 'factory-contract-1'

function snapshot(status: Status = 'pending', sid = 's1'): FactorySnapshot {
  return {
    runs: [
      { run: 'failed-shot', state: 'failed', output: null, seconds: null, verdict: 'Runner failed', compare: null },
      { run: 'finished-shot', state: 'done', output: 'preview.png', seconds: 3, verdict: null, compare: 'compare.png' },
      { run: 'working-shot', state: 'running', output: null, seconds: null, verdict: null, compare: null }
    ],
    running_count: 1,
    suggestions: [{
      run: 'failed-shot', action: 'render', title: 'Retry failed shot', contract_id: contract, session_id: sid, status,
      review: { available: false, reason: 'Canonical review-existing API unavailable' }
    }]
  }
}

async function started({ status = 'pending', replies = {}, features = ['aside'] }: {
  status?: Status; replies?: Record<string, Reply>; features?: string[]
} = {}) {
  const harness = setup({
    'session.resume': params => ({ session_id: params['session_id'], info: {} }),
    'command.dispatch': params => {
      if (params['arg'] === 'json suggest {}') return { output: JSON.stringify(snapshot(status, String(params['session_id']))) }
      if (typeof params['arg'] === 'string' && params['arg'].startsWith('json render ')) {
        return { output: JSON.stringify({ run: 'failed-shot', state: 'queued' }) }
      }
      return { output: 'Factory text status' }
    },
    ...replies
  }, { features })
  apps.push(harness.app)
  await harness.app.resume(storedSessionId('s1'))
  await settle()
  return harness
}

async function factory(harness: ReturnType<typeof setup>) {
  await harness.type('/factory')
  await harness.press(key('enter'))
  await settle()
}

function prefs(harness: ReturnType<typeof setup>) {
  return topNodes(harness.tern.region('layer')).filter(node => node.kind === 'prefs')
}

function factoryNode(harness: ReturnType<typeof setup>) {
  return must(prefs(harness).find(node => node.props['title'] === 'Factory'), 'rendered Factory prefs')
}

function action(act: string, value?: string): ActionEvent {
  return { ev: 'action', sf: 'hermes', id: 'layer.factory', act, raw: {}, ...(value === undefined ? {} : { value }) }
}

beforeEach(() => {
  delete process.env['HERMES_TUI_QUERY']
  delete process.env['HERMES_TUI_IMAGE']
})

afterEach(() => {
  for (const app of apps.splice(0)) app.dispose()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('App Factory composition', () => {
  it('starts closed without reads, then /factory toggles a native pane without the EUI kit', async () => {
    const h = await started()
    expect(h.app.eui.dir).toBe('')
    expect(h.app.eui.kinds).toEqual([])
    expect(h.app.stores.factory.open).toBe(false)
    expect(prefs(h)).toEqual([])
    expect(h.sent('command.dispatch')).toEqual([])

    await factory(h)
    expect(h.app.stores.factory.open).toBe(true)
    expect(prefs(h)).toHaveLength(1)
    expect(factoryNode(h).props['title']).toBe('Factory')
    expect(h.sent('command.dispatch')).toEqual([{ name: 'factory', arg: 'json suggest {}', session_id: 's1' }])
    expect(h.app.eui.host.size).toBe(0)
    expect(h.app.overlays).toEqual([])

    await factory(h)
    expect(h.app.stores.factory.open).toBe(false)
    expect(prefs(h)).toEqual([])
    expect(h.sent('command.dispatch')).toHaveLength(1)
    expect(h.sent('slash.exec')).toEqual([])
  })

  it('uses text without an aside and adds no unsupported-pane notice', async () => {
    const h = await started({ features: [] })
    const showText = vi.spyOn(h.app.operations, 'showText')
    const notices = h.app.transcript.entries.filter(entry => entry.kind === 'notice')
    expect(h.app.toggleFactory()).toBe(false)
    await factory(h)
    expect(h.app.stores.factory.open).toBe(false)
    expect(prefs(h)).toEqual([])
    expect(showText).toHaveBeenCalledWith('Content factory', 'Factory text status')
    expect(h.sent('command.dispatch')).toEqual([{ name: 'factory', arg: '', session_id: 's1' }])
    expect(h.app.transcript.entries.filter(entry => entry.kind === 'notice')).toEqual(notices)
  })

  const directions: [Aside, Aside][] = [
    ['factory', 'sidebar'], ['sidebar', 'factory'], ['factory', 'prs'],
    ['prs', 'factory'], ['sidebar', 'prs'], ['prs', 'sidebar']
  ]
  it.each(directions)('replaces %s with %s, leaving exactly one native aside', async (from: Aside, to: Aside) => {
    const h = await started()
    const open = async (aside: Aside) => {
      if (aside === 'factory') await factory(h)
      else if (aside === 'sidebar') h.app.toggleSidebar()
      else h.app.openPrAside(undefined)
      await settle()
      expect({ factory: h.app.stores.factory.open, sidebar: h.app.sidebar.open, prs: h.app.stores.prAside.open })
        .toEqual({ factory: aside === 'factory', sidebar: aside === 'sidebar', prs: aside === 'prs' })
      expect(prefs(h)).toHaveLength(1)
      expect(prefs(h)[0]?.props['title']).toBe({ factory: 'Factory', sidebar: 'Session', prs: 'Pull requests' }[aside])
    }
    await open(from)
    await open(to)
  })

  it('keeps the composer focused and sends a prompt while Factory stays open', async () => {
    const h = await started()
    await factory(h)
    expect(h.tern.focused.at(-1)).toBe(INPUT_ID)
    await h.type('keep working beside Factory')
    await h.press(key('enter'))
    expect(h.sent('prompt.submit')).toHaveLength(1)
    expect(h.sent('prompt.submit')[0]).toMatchObject({ session_id: 's1', text: 'keep working beside Factory' })
    expect(h.app.stores.factory.open).toBe(true)
    expect(factoryNode(h)).toBeDefined()
  })

  it('renders pending contracts natively without an approval or execution control', async () => {
    const h = await started()
    await factory(h)
    const view = JSON.stringify(factoryNode(h).props)
    expect(view).toContain(contract)
    expect(view).toContain('pending')
    expect(view).toContain('AODL review unavailable')
    expect(view).toContain('failed-shot')
    expect(view).toContain('Awaiting review')
    expect(view).toContain('1 job running')
    expect(view).not.toContain('working-shot')
    expect(view).not.toContain('"control"')
    expect(factoryNode(h).handlers?.onAction?.['approve']).toBeUndefined()
    expect(h.app.eui.host.size).toBe(0)
    await must(h.tern.dispatch(action('render', contract)))()
    await settle()
    expect(h.sent('command.dispatch')).toHaveLength(1)
  })

  it('executes an approved intent only on its explicit native callback, with the contract id', async () => {
    const pending = Promise.withResolvers<unknown>()
    const h = await started({ replies: {
      'command.dispatch': params => params['arg'] === 'json suggest {}'
        ? { output: JSON.stringify(snapshot('approved')) }
        : pending.promise
    } })
    await factory(h)
    expect(JSON.stringify(factoryNode(h).props)).toContain('Run approved intent')
    expect(h.sent('command.dispatch')).toHaveLength(1)
    const render = must(h.tern.dispatch(action('render', contract)), 'native render callback')
    await render()
    await render()
    await settle()
    expect(h.sent('command.dispatch')).toEqual([
      { name: 'factory', arg: 'json suggest {}', session_id: 's1' },
      { name: 'factory', arg: `json render ${JSON.stringify({ run: 'failed-shot', contract_id: contract })}`, session_id: 's1' }
    ])
    expect(h.sent('prompt.submit')).toEqual([])
    expect(h.sent('slash.exec')).toEqual([])
    pending.resolve({ output: JSON.stringify({ run: 'failed-shot', state: 'queued' }) })
    await settle()
  })

  it('restores the approved render control after closing and reopening during a render', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    const pending = Promise.withResolvers<unknown>()
    const h = await started({ replies: {
      'command.dispatch': params => params['arg'] === 'json suggest {}'
        ? { output: JSON.stringify(snapshot('approved')) }
        : pending.promise
    } })
    await factory(h)
    expect(JSON.stringify(factoryNode(h).props)).toContain('Run approved intent')
    await must(h.tern.dispatch(action('render', contract)))()
    expect(h.sent('command.dispatch')).toHaveLength(2)

    await factory(h)
    expect(h.app.stores.factory.open).toBe(false)
    await factory(h)
    expect(h.app.stores.factory.open).toBe(true)
    pending.resolve({ output: JSON.stringify({ run: 'failed-shot', state: 'queued' }) })
    await settle()
    await vi.advanceTimersByTimeAsync(10_000)
    await settle()

    expect(h.sent('command.dispatch').filter(params => params['arg'] === 'json suggest {}')).toHaveLength(2)
    const view = JSON.stringify(factoryNode(h).props)
    expect(view).toContain(contract)
    expect(view).toContain('approved')
    expect(view).toContain('Run approved intent')
  })

  it('rejects a captured approved render callback after a fail-closed poll removes its suggestion', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    let reads = 0
    const h = await started({ replies: {
      'command.dispatch': params => {
        if (params['arg'] === 'json suggest {}') {
          reads++
          return { output: JSON.stringify(reads === 1 ? snapshot('approved') : {
            ...snapshot('approved'), suggestions: [], error: 'AODL approval no longer available', fail_closed: true
          }) }
        }
        return { output: JSON.stringify({ run: 'failed-shot', state: 'queued' }) }
      }
    } })
    await factory(h)
    expect(JSON.stringify(factoryNode(h).props)).toContain('Run approved intent')
    const render = must(h.tern.dispatch(action('render', contract)), 'captured approved render callback')

    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(reads).toBe(2)
    const view = JSON.stringify(factoryNode(h).props)
    expect(view).toContain('AODL approval no longer available')
    expect(view).toContain('Paused until the check passes')
    expect(view).not.toContain('Run approved intent')
    await render()
    await settle()

    expect(h.sent('command.dispatch').filter(params =>
      typeof params['arg'] === 'string' && params['arg'].startsWith('json render ')
    )).toEqual([])
  })

  it.each(['pending', 'approved'] as const)('rejects queued %s native handlers after adopting another session', async (status: Status) => {
    const h = await started({ status })
    await factory(h)
    const render = must(h.tern.dispatch(action('render', contract)))
    const close = must(h.tern.dispatch(action('close')))
    await h.app.resume(storedSessionId('s2'))
    await render()
    await close()
    await settle()
    expect(h.app.session.ref.live).toBe('s2')
    expect(h.app.stores.factory.open).toBe(true)
    expect(JSON.stringify(factoryNode(h).props)).not.toContain(contract)
    expect(h.sent('command.dispatch')).toEqual([{ name: 'factory', arg: 'json suggest {}', session_id: 's1' }])
  })

  it('drops a pending snapshot that resolves after the App adopts another session', async () => {
    const pending = Promise.withResolvers<unknown>()
    const h = await started({ replies: { 'command.dispatch': () => pending.promise } })
    await factory(h)
    expect(h.sent('command.dispatch')).toHaveLength(1)
    await h.app.resume(storedSessionId('s2'))
    pending.resolve({ output: JSON.stringify(snapshot()) })
    await settle()
    expect(h.app.session.ref.live).toBe('s2')
    expect(JSON.stringify(factoryNode(h).props)).not.toContain(contract)
    expect(h.app.stores.factory.open).toBe(true)
  })

  it('keeps repeated polling errors in the pane, without notices or EUI publications', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    const h = await started({ replies: { 'command.dispatch': () => { throw new Error('Factory backend unavailable') } } })
    const notices = h.app.transcript.entries.filter(entry => entry.kind === 'notice')
    await factory(h)
    expect(JSON.stringify(factoryNode(h).props)).toContain('Factory backend unavailable')
    const reads = h.sent('command.dispatch').length
    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(h.sent('command.dispatch')).toHaveLength(reads + 1)
    expect(h.app.transcript.entries.filter(entry => entry.kind === 'notice')).toEqual(notices)
    expect(h.app.eui.host.size).toBe(0)
    expect(h.app.overlays).toEqual([])
  })
})
