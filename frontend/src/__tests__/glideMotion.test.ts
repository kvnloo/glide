import { describe, expect, it } from 'vitest'

import type { UiNode } from '../glideui/library.js'
import { countFrames, liveCard, MOTION_CSS } from '../glideui/motion.js'
import { node } from '../glideui/render.js'
import { tree } from './fakes.js'
import { motionParts } from './glideMotionFixtures.js'

const card = (status?: 'pending' | 'running' | 'done' | 'error'): UiNode => ({
  type: 'element', typeName: 'Card', props: { title: 'Atlas', ...(status ? { status } : {}), children: [
    { type: 'element', typeName: 'Hero', props: { value: '1,248', label: 'Checks' } },
    { type: 'element', typeName: 'Meter', props: { value: 0.72, label: 'Progress' } },
    { type: 'element', typeName: 'Steps', props: { items: [{ id: 'test', text: 'Test', status: 'active' }] } }
  ] }
})

describe('shared glide/v1 motion', () => {
  it('counts formatted values to their exact final text without touching clocks or non-numbers', () => {
    for (const value of ['1,248', '$12.50', '-42 ms', '72%', '0', '3.20×']) {
      const frames = countFrames(value)
      expect(frames).toHaveLength(16)
      expect(frames.at(-1)).toBe(value)
    }
    expect(countFrames('1,248')[0]).toBe('0')
    expect(countFrames('$12.50')[0]).toBe('$0.00')
    expect(countFrames('20:00')).toEqual([])
    expect(countFrames('Done')).toEqual([])
    expect(countFrames('v2.1.0')).toEqual([])
  })

  it('uses the stageshow curve monotonically with no overshoot', () => {
    const values = countFrames('1000').map(Number)
    expect(values[7]).toBeGreaterThan(500)
    expect(values.every((v, i) => v >= (values[i - 1] ?? 0) && v <= 1000)).toBe(true)
  })

  it('only idles live work and lets a terminal card override stale active children', () => {
    expect(liveCard(card('running'))).toBe(true)
    expect(liveCard(card('pending'))).toBe(true)
    expect(liveCard(card())).toBe(true)
    expect(liveCard(card('done'))).toBe(false)
    expect(liveCard(card('error'))).toBe(false)
  })

  it('covers every native part through the same card entrance, without altering the source data', () => {
    for (const part of Object.values(motionParts)) {
      const before = JSON.stringify(part)
      const n: UiNode = { type: 'element', typeName: 'Card', props: { title: part.typeName, children: [part] } }
      expect(tree(node(n, 'all', { send: () => undefined, svg: () => 'fixture' })).p?.['attrs'])
        .toMatchObject({ 'data-glide-enter': 'yes' })
      expect(JSON.stringify(part)).toBe(before)
    }
  })

  it('mounts motion in the common renderer and skips entrance on host revisions', () => {
    const running = tree(node(card('running'), 'atlas', { send: () => undefined }))
    const done = tree(node(card('done'), 'atlas', { send: () => undefined }))
    expect(running.p?.['attrs']).toMatchObject({ 'data-glide-motion': 'live' })
    expect(done.p?.['attrs']).toMatchObject({ 'data-glide-motion': 'still' })
    expect(running.p?.['tag']).toBe('div')
    const revised = tree(node(card('done'), 'atlas', { send: () => undefined, entrance: false }))
    expect(revised.p?.['attrs']).toMatchObject({ 'data-glide-enter': 'no' })
    expect(JSON.stringify(revised)).not.toContain('glide-count')
    expect(JSON.stringify(running)).toContain('glide-count')
    expect(JSON.stringify(done)).toContain('1,248')
  })

  it('disables motion and reveals final data under reduced motion without glow or tiny type', () => {
    expect(MOTION_CSS).toContain('cubic-bezier(0.45,0,0.1,1)')
    expect(MOTION_CSS).toContain('@media (prefers-reduced-motion: reduce)')
    expect(MOTION_CSS).toContain('animation:none!important')
    expect(MOTION_CSS).toContain('.glide-count-frame{display:none!important}')
    expect(MOTION_CSS).not.toMatch(/box-shadow|text-shadow|filter:|font-size:10px/)
    expect(MOTION_CSS).toContain("[data-glide-motion='live']")
  })
})
