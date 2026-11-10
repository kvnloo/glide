import { describe, expect, it, vi } from 'vitest'

import { euiHostPort } from '../app/eui-host.js'
import { factoryCommand, type FactoryHost, type FactoryRun, type FactoryStatus } from '../commands/factory.js'
import { localCommand } from '../commands/local.js'
import { liveSessionId } from '../core/ids.js'
import { EuiCards } from '../eui/cards.js'
import { HOST_APPROVE_ID } from '../eui/hostSnapshot.js'
import { SessionState } from '../session/state.js'
import { Transcript } from '../transcript/store.js'
import { parseJson, record } from '../wire/json.js'

import { must, ofKind, stub } from './fakes.js'

const run = (r: Partial<FactoryRun> = {}): FactoryRun => ({
  run: 'shot-a', state: 'done', output: '/runs/shot-a/out.mp4', seconds: 253, verdict: 'SYNCED', compare: null, ...r
})
const status = (s: Partial<FactoryStatus> = {}): FactoryStatus => ({
  comfy: { running: false, free_vram_mb: 5600 }, runs: [run()], rendering: null, ...s
})

// The plugin answers only through `/factory json <verb> <params>` (command.dispatch).
function setup(answer: (verb: string, params: Record<string, unknown>) => unknown) {
  const session = new SessionState(() => undefined)
  session.ref = { live: liveSessionId('factory-session'), stored: null }
  const transcript = new Transcript()
  const eui = new EuiCards(vi.fn(), undefined, euiHostPort({ session, transcript }, () => true))
  const verbs: string[] = []
  const request = vi.fn(async (method: string, params: Record<string, unknown>) => {
    if (method !== 'command.dispatch') throw new Error(`unknown method: ${method}`)
    expect(params).toMatchObject({ name: 'factory', session_id: 'factory-session' })
    const [, verb = '', ...json] = String(params.arg).split(' ')
    verbs.push(verb)
    return { output: JSON.stringify(answer(verb, record(parseJson(json.join(' ') || '{}')) ?? {})) }
  })
  const host = { gw: stub<FactoryHost['gw']>({ request }), session, transcript, eui }
  const panels = () => transcript.entries.filter(e => e.kind === 'panel').map(e => ofKind(e, 'panel'))
  const view = (index: number) => must(eui.hostView(must(panels()[index])))
  const titles = () => panels().map(p => p.title)
  return { host, verbs, transcript, panels, view, titles }
}

const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

describe('/factory', () => {
  it('is a listed local command', () => {
    expect(localCommand('factory')?.help).toContain('Content factory')
  })

  it('shows the factory, the latest runs, and offers a render without starting one', async () => {
    const { host, verbs, titles } = setup(() => status())
    await factoryCommand(host, '')
    expect(verbs).toEqual(['status'])
    expect(titles()).toEqual(['Content factory', 'shot-a', 'Render shot-a'])
  })

  it('offers no render while one is running', async () => {
    const { host, titles } = setup(() => status({ rendering: 'shot-a', runs: [run({ state: 'running' })] }))
    await factoryCommand(host, '')
    expect(titles()).toEqual(['Content factory', 'shot-a'])
  })

  it('renders only after the tap, then posts the result when the run finishes', async () => {
    let polls = 0
    const { host, verbs, view, titles } = setup((verb, params) => {
      if (verb === 'render') return { run: params.run, state: 'queued' }
      if (verb === 'runs') return { runs: [run({ state: ++polls < 2 ? 'running' : 'done' })] }
      return status()
    })
    await factoryCommand(host, 'render shot-a', async () => undefined)
    expect(titles()).toEqual(['Render shot-a'])
    expect(verbs).toEqual([])

    must(view(0).activate)(HOST_APPROVE_ID)
    await settle()
    expect(verbs).toEqual(['render', 'runs', 'runs'])
    expect(titles().slice(1)).toEqual(['Rendering shot-a', 'shot-a rendered'])
  })

  it('searches studied scenes into one card', async () => {
    const { host, verbs, titles } = setup(() => ({
      hits: [{ scene: 'Scene 65', videos: 1156, model: 'seedance_2_0', duration: '10', direction: 'CUT 1 - wide standoff', takes: ['https://t/1.mp4'] }]
    }))
    await factoryCommand(host, 'scenes snow standoff')
    expect(verbs).toEqual(['scenes'])
    expect(titles()).toEqual(['Studied scenes for “snow standoff”'])
  })

  it('shows the plugin error instead of a card', async () => {
    const { host, transcript, panels } = setup(() => ({ error: 'no run named \'x\'' }))
    await factoryCommand(host, '')
    expect(panels()).toEqual([])
    expect(JSON.stringify(transcript.entries)).toContain('no run named')
  })
})
