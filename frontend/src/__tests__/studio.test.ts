import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STUDIO_RUNTIME } from '../../../glide/frontend/studioRuntime.js'
import { record } from '../wire/json.js'

import { studioCard, studioSnapshot, studioTree } from '../../../glide/frontend/studio.js'

const project = {
  schema: 'fframestudio.project/1', id: 'atlas', title: 'Atlas launch',
  videos: [{ id: 'film', name: 'Film', scenes: [{ id: 'opening', name: 'Opening', clipIds: ['hero'] }],
    clips: [{ id: 'hero', name: 'Hero', mediaId: 'picture', attached: [{ id: 'title', kind: 'text', field: 'headline' }, { id: 'sound', kind: 'audio' }] },
      { id: 'end', name: 'End', mediaId: null, attached: [] }] }]
}
const snapshot = () => studioSnapshot({ mode: 'web', url: 'http://127.0.0.1:7878/#/p/atlas', project })

describe('studio preview', () => {
  it('executes the real Node adapter instead of entering the reserved inspect debugger', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', STUDIO_RUNTIME, '--', 'snapshot', 'atlas'], {
      encoding: 'utf8', env: { ...process.env, GLIDE_STUDIO_DIR: join(tmpdir(), 'glide-studio-deliberately-missing-checkout') }
    })
    expect(result.status).toBe(1)
    expect(record(result.stdout)).toEqual({ error: expect.stringContaining('Set GLIDE_STUDIO_DIR') })
    expect(result.stdout).not.toContain('Debugger')
  })

  it('groups clips and their real attachments under scenes, including ungrouped clips', () => {
    expect(studioTree(snapshot().project)).toEqual([
      { id: 'film/opening/hero/media', group: 'Film / Opening', label: 'Hero', detail: 'Media layer' },
      { id: 'film/opening/hero/title', group: 'Film / Opening', label: 'headline', detail: 'Hero / text' },
      { id: 'film/opening/hero/sound', group: 'Film / Opening', label: 'audio', detail: 'Hero / audio' },
      { id: 'film/end', group: 'Film / End', label: 'End', detail: 'No layers' }
    ])
  })

  it('is a read-only native glide/v1 card with a safe URL and no edit intents', () => {
    const card = studioCard({ phase: 'open', snapshot: snapshot() })
    expect(card.ui.typeName).toBe('Card')
    const text = JSON.stringify(card)
    expect(text).toContain('Read-only')
    expect(text).toContain('Atlas launch')
    expect(text).toContain('http://127.0.0.1:7878/#/p/atlas')
    expect(text).not.toContain('token')
    expect(text).not.toContain('intent')
  })

  it('represents the library honestly when no project is selected', () => {
    const card = studioCard({ phase: 'open', snapshot: studioSnapshot({ mode: 'native', url: 'http://127.0.0.1:7878/', project: null }) })
    expect(JSON.stringify(card)).toContain('/glide studio <project-id>')
  })

  it.each(['https://example.com/', 'http://127.0.0.1:7878/?token=secret', 'http://u:p@127.0.0.1:7878/', 'file:///tmp/a'])('refuses unsafe URLs %s', url => {
    expect(() => studioSnapshot({ mode: 'web', url, project })).toThrow()
  })

  it('caps large previews and reports omitted layers', () => {
    const big = structuredClone(project)
    const video = big.videos[0]
    if (!video) throw new Error('fixture')
    video.clips = Array.from({ length: 150 }, (_, i) => ({ id: `c${i}`, name: `Clip ${i}`, mediaId: null, attached: [] }))
    expect(studioTree(studioSnapshot({ mode: 'web', url: 'http://127.0.0.1:7878/', project: big }).project).length).toBeLessThanOrEqual(81)
  })
})
