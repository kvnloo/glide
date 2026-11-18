// A deep-research run as a native GEV card: the sources it has pulled so far (by platform, growing),
// the simulation stages it has built, what it knows and how, and the latest pulls.

import type { UiNode, UiTone } from '../../glideui/library.js'
import { elapsed, PLATFORM_LABEL, PLATFORMS, type ResearchState, type Tier } from './case.js'

const TIER: Readonly<Record<Tier, { text: string; tone: UiTone }>> = {
  seen: { text: 'SEEN', tone: 'success' }, reported: { text: 'REPORTED', tone: 'info' }, derived: { text: 'DERIVED', tone: 'warning' }, inferred: { text: 'INFERRED', tone: 'neutral' }
}
const n = (v: number) => v.toLocaleString('en-US')

export interface ResearchCardState {
  readonly png?: string | undefined
  readonly size?: { readonly w: number; readonly h: number } | undefined
  readonly capturing?: boolean
  readonly failed?: string | undefined
  readonly paused?: boolean
}

export function researchCard(s: ResearchState, view: ResearchCardState = {}): UiNode {
  const { c } = s
  const kids: UiNode[] = []

  if (view.png) kids.push({ type: 'element', typeName: 'Picture', props: { png: view.png, w: view.size?.w ?? 1280, h: view.size?.h ?? 800, alt: `God's Eye View: ${c.title}` } })
  else if (view.capturing || view.failed) kids.push({ type: 'element', typeName: 'Text', props: { body: view.failed ? `Globe unavailable: ${view.failed}` : 'Rendering the globe in God\'s Eye View…', tone: 'muted' } })
  kids.push({ type: 'element', typeName: 'Badges', props: { items: [
    { text: c.basis === 'kb' ? 'REAL SOURCES' : 'AUTHORED EXAMPLE', tone: c.basis === 'kb' ? 'success' : 'warning' },
    { text: c.place }, { text: c.eventUtc.replace('T', ' ').replace(/:\d\dZ$/, 'Z') }
  ] } })
  const built = s.sim.filter(x => x.status === 'done').length
  kids.push({ type: 'element', typeName: 'Stats', props: { items: [
    { label: 'Sources', value: n(s.total), tone: 'accent' },
    { label: 'Platforms', value: String(PLATFORMS.filter(p => s.by[p] > 0).length) },
    { label: 'Researching', value: elapsed(s.t) },
    { label: 'Sim', value: `${built}/${s.sim.length}`, ...(built === s.sim.length ? { tone: 'success' as const } : {}) }
  ] } })
  const live = PLATFORMS.filter(p => s.by[p] > 0)
  if (live.length) {
    kids.push({ type: 'element', typeName: 'Row', props: { children: [
      { type: 'element', typeName: 'Bars', props: { values: live.map(p => s.by[p]), labels: live.map(p => PLATFORM_LABEL[p]), summary: live.map(p => `${PLATFORM_LABEL[p]} ${n(s.by[p])}`).join(', ') } },
      { type: 'element', typeName: 'Spark', props: { points: s.growth, summary: `${n(s.total)} sources in ${elapsed(s.t)}` } }
    ] } })
  }
  kids.push({ type: 'element', typeName: 'Section', props: { title: 'Simulation', aside: s.sim.every(x => x.status === 'done') ? 'built' : 'building', children: [
    { type: 'element', typeName: 'Steps', props: { items: s.sim.map(x => ({ id: x.id, text: x.label, status: x.status })) } }
  ] } })
  const known = s.findings.slice(-4).reverse()
  if (known.length) {
    kids.push({ type: 'element', typeName: 'Section', props: { title: 'What we know', aside: `${s.findings.length}`, children: [
      { type: 'element', typeName: 'List', props: { items: known.map((f, i) => ({ id: `f${s.findings.length - i}`, label: f.text, badge: TIER[f.tier].text, tone: TIER[f.tier].tone })) } }
    ] } })
  }
  const latest = s.pulls.slice(0, 4)
  if (latest.length) {
    kids.push({ type: 'element', typeName: 'Section', props: { title: 'Just pulled', children: [
      { type: 'element', typeName: 'List', props: { items: latest.map((p, i) => ({ id: `p${i}`, label: p.label, badge: PLATFORM_LABEL[p.platform], ...(p.detail ? { detail: p.detail } : {}), value: `+${elapsed(p.t)}` })) } }
    ] } })
  }
  kids.push({ type: 'element', typeName: 'Buttons', props: { items: [
    { label: 'Open the sim in God\'s Eye View', intent: { action: 'open', entities: {} }, primary: true },
    ...(s.done ? [] : [{ label: view.paused ? 'Resume research' : 'Pause research', intent: { action: view.paused ? 'resume' : 'pause', entities: {} } }])
  ] } })
  return { type: 'element', typeName: 'Card', props: { title: `Deep research · ${c.title}`, app: "GOD'S EYE VIEW", skin: 'gev', status: s.done ? 'done' : view.paused ? 'pending' : 'running', children: kids } }
}
