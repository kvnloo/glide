import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { FLEET_DESIGN_CSS, fleetCardHtml } from '../commands/fleet.js'
import { decodeEuiKit } from '../wire/euiKit.js'
import { decodeFleetIntent, fleetDesign, fleetHost } from '../wire/fleet.js'

import { NO_DRIFT, tokenDrift } from './helpers/tokenDrift.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const source = (file: string) => readFileSync(join(root, file), 'utf8')

const hostDoc = () => decodeEuiKit({ kind: 'fleet-hosts', app: 'k3s', data: { hosts: [
  { id: 'sample-1', label: 'Desk', online: true, k3s: null, harnesses: [
    { kind: 'Hermes', agents: [{ id: 'sample-chat', name: 'Draft', state: 'blocked' }] }] },
  { id: 'sample-2', label: 'Phone', online: true, k3s: null, harnesses: [] },
  { id: 'sample-3', label: 'Spare', online: false, k3s: null, harnesses: [] }
] } })
const portfolioDoc = () => decodeEuiKit({ kind: 'fleet-portfolio', app: 'dash', data: {
  portfolios: { sample: { products: [
    { id: 'sample:ui', label: 'UI', features: [
      { id: 'ui:glide', label: 'glide', tasks: [{ id: 'one', label: 'Review cards', status: 'blocked', url: 'https://example.test/one' }] },
      { id: 'ui:factory', label: 'factory', tasks: [{ id: 'two', label: 'Choose next', status: 'next' }] }] },
    { id: 'sample:other', label: 'Other', features: [
      { id: 'other:glide', label: 'glide', tasks: [{ id: 'three', label: 'Secondary task', status: 'active' }] }] }
  ] } }
} })
const graphDoc = () => decodeEuiKit({ kind: 'fleet-factory', app: 'aodl', data: {
  nodes: [
    { id: 'brain', label: 'Dispatch', col: 0, state: 'done' },
    { id: 'lane', label: 'Verify', col: 1, state: 'failing' },
    { id: 'card', label: 'Review', col: 2, state: 'needs-you' },
    { id: 'repo', label: 'Publish', col: 3, state: 'idle' }
  ], edges: [
    ['brain', 'lane', 'delegated', true], ['lane', 'card', 'delegated', true],
    ['card', 'repo', 'touched', false]
  ]
} })

describe('Fleet compact presentation', () => {
  it('answers the host question in one hero, then one bounded row and action per host', () => {
    const model = fleetDesign(hostDoc(), 'hosts')
    expect(model.hero).toContain('3 hosts · failed · Check host on Spare')
    expect(model.rows).toHaveLength(3)
    expect(model.rows.filter(row => row.recommended)).toHaveLength(1)
    expect(model.rows.map(row => row.action)).toEqual(['Answer', 'Check host', 'Check host'])
    expect(model.rows.every(row => !row.fact || /^\d+ (agents?|pods?)$/.test(row.fact))).toBe(true)
    expect(fleetCardHtml(model).match(/class="fl-design-row"/g)).toHaveLength(3)
    expect(FLEET_DESIGN_CSS).toContain('height:52px')
    expect(FLEET_DESIGN_CSS).toContain('min-height:44px')
  })

  it('selects one trusted host check and rejects an unlisted host', () => {
    const model = fleetDesign(hostDoc(), 'hosts')
    const check = model.rows[2]?.intent
    expect(check).toBeDefined()
    expect(decodeFleetIntent(check)).toEqual({ action: 'check-host', entities: { host: 'sample-3' } })
    expect(fleetHost(hostDoc(), { host: 'sample-3' }).online).toBe(false)
    expect(() => fleetHost(hostDoc(), { host: 'foreign' })).toThrow(/unavailable/i)
  })

  it('groups the portfolio into one row per repository with one next action', () => {
    const model = fleetDesign(portfolioDoc(), 'portfolio')
    expect(model.rows.map(row => row.name)).toEqual(['glide', 'factory'])
    expect(model.rows[0]?.state).toBe('held')
    expect(model.rows[1]?.action).toBe('Set next')
    expect(model.rows.filter(row => row.recommended)).toHaveLength(1)
    expect(model.rows.every(row => !row.fact || row.fact.endsWith('task'))).toBe(true)
  })

  it('draws 152-pixel factory tiles with real hairline edges and one recommended fix', () => {
    const model = fleetDesign(graphDoc(), 'factory')
    expect(model.tiles).toHaveLength(4)
    expect(model.edges).toEqual([['brain', 'lane'], ['lane', 'card'], ['card', 'repo']])
    expect(model.tiles.filter(node => node.recommended).map(node => node.key)).toEqual(['lane'])
    const html = fleetCardHtml(model)
    expect(html).toContain('viewBox="0 0 644 ')
    expect(html).toContain('viewBox="0 0 316 ')
    expect(html.match(/class="fl-design-tile"/g)).toHaveLength(8) // 4 per responsive layout
    expect(FLEET_DESIGN_CSS).toContain('width:152px')
    expect(FLEET_DESIGN_CSS).toContain('stroke-width:1')
    expect(FLEET_DESIGN_CSS).toContain('prefers-reduced-motion:reduce')
  })

  it('escapes raw markup and gives a safe empty-data answer', () => {
    const doc = decodeEuiKit({ kind: 'fleet-hosts', app: 'k3s', data: { hosts: [{
      id: 'sample', label: '<script>bad</script>', online: false, harnesses: [], k3s: null
    }] } })
    const html = fleetCardHtml(fleetDesign(doc, 'hosts'))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(fleetDesign(decodeEuiKit({ kind: 'fleet-hosts', app: 'k3s', data: {} }), 'hosts').hero)
      .toContain('Refresh to retry')
  })

  // Explicit per-file drift gate opt-ins: do not edit the shared token gate.
  for (const path of [
    'frontend/src/commands/fleet.ts',
    'frontend/src/wire/fleet.ts',
    'glide/tools/fleet-shots.mts',
    'glide/fleet.py'
  ]) {
    it(path + ' uses token scale for every styled property', () => {
      expect(tokenDrift(source(path))).toEqual(NO_DRIFT)
    })
  }
})
