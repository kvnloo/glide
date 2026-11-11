// AODL intent heroes: one rich, data-driven instrument on top of each intent-* host card. Built as
// plain EuiNodes for the existing host renderer (eui/hostSnapshot.ts) and styled by INTENT_CSS,
// which binds to the card's --h-* tokens so a theme change retints it. Heroes only draw what the
// host data says: a missing receipt reads 0, never a pass; approval stays the host's one button.
import type { EuiNode } from '../../frontend/src/eui/sandbox.js'
import type { EuiHostCardData } from '../../frontend/src/wire/euiHostCard.js'

export type IntentKind = 'intent-declare' | 'intent-contract' | 'intent-work' | 'intent-proof'
export const INTENT_KINDS: readonly IntentKind[] = ['intent-declare', 'intent-contract', 'intent-work', 'intent-proof']
export const isIntentKind = (kind: string): kind is IntentKind => (INTENT_KINDS as readonly string[]).includes(kind)

type El = (tag: string, kids: readonly EuiNode[], cls?: string, attrs?: Record<string, string>) => EuiNode
const text = (value: string): EuiNode => ({ t: 'text', text: value })
const str = (v: string | number | boolean) => String(v)

/** Deterministic waveform bars for an utterance: louder on vowels, quiet at spaces. */
export function waveform(words: string, bars = 64): number[] {
  const out: number[] = []
  for (let i = 0; i < bars; i++) {
    const ch = words[Math.floor(i * words.length / bars)] ?? ' '
    const base = ch === ' ' ? 0.12 : /[aeiou]/i.test(ch) ? 0.85 : 0.5
    out.push(Math.round((base * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7 + ch.charCodeAt(0))))) * 100) / 100)
  }
  return out
}

function waveSvg(words: string): EuiNode {
  const w = 480, h = 72, amps = waveform(words)
  const step = w / amps.length
  const rects = amps.map((a, i) => {
    const bh = Math.max(2, a * h)
    return `<rect x="${(i * step + 1).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${(step - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5"/>`
  }).join('')
  return { t: 'svg', w, h, cls: 'ih-wave', style: '', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g fill="var(--h-primary)" opacity="0.55">${rects}</g></svg>` }
}

/** The ask split into plain runs and the phrases each clause row names (first match, in order). */
export function clauseRuns(ask: string, rows: EuiHostCardData['rows']): { text: string; clause?: string }[] {
  const hits = rows.map(r => ({ clause: r.label.toLowerCase(), phrase: str(r.value), at: ask.toLowerCase().indexOf(str(r.value).toLowerCase()) }))
    .filter(x => x.phrase && x.at >= 0).sort((a, b) => a.at - b.at)
  const runs: { text: string; clause?: string }[] = []
  let at = 0
  for (const x of hits) {
    if (x.at < at) continue
    if (x.at > at) runs.push({ text: ask.slice(at, x.at) })
    runs.push({ text: ask.slice(x.at, x.at + x.phrase.length), clause: x.clause })
    at = x.at + x.phrase.length
  }
  if (at < ask.length) runs.push({ text: ask.slice(at) })
  return runs
}

function declare(d: EuiHostCardData, el: El): EuiNode {
  const ask = d.summary ?? ''
  const runs = clauseRuns(ask, d.rows)
  return el('div', [
    el('div', [waveSvg(ask), el('p', runs.map(r => r.clause
      ? el('span', [text(r.text)], `ih-u ih-c-${r.clause.replace(/[^a-z]/g, '')}`, { 'data-clause': r.clause })
      : text(r.text)), 'ih-ask')], 'ih-wavebox'),
    el('div', d.rows.map(r => el('span', [text(`${r.label} · ${str(r.value)}`)], `ih-key ih-c-${r.label.toLowerCase().replace(/[^a-z]/g, '')}`)), 'ih-keys')
  ], 'ih-hero ih-declare')
}

const met = (v: string | number | boolean) => v === true || /^(observed|met|pass|ok|yes)$/i.test(str(v))
/** A criterion's value as its state and receipt: "observed · 9f3c2a7" -> ['observed', '9f3c2a7']. */
const evidence = (v: string | number | boolean): [string, string] => {
  const [state = '', receipt = ''] = str(v).split('·').map(s => s.trim())
  return [state, receipt]
}

/** A criterion label as its clause kind and phrase: "scope: plugin" -> ['scope', 'plugin']. */
export function criterion(label: string): { kind: string; phrase: string } {
  const at = label.indexOf(': ')
  return at > 0 ? { kind: label.slice(0, at), phrase: label.slice(at + 2) } : { kind: 'criterion', phrase: label }
}

// The contract is typed rows: "<kind>: <phrase>" criteria ("missing · needs <evidence>" or
// "observed · <receipt>"), "pattern", "lane: <role>" ("<job> · <model> · <state>"), "host: <name>"
// ("<status> · <runs>"), "gate", "budget" and "sample" (which panels hold synthetic data).
const TYPED = /^(pattern|gate|budget|sample|lane: .+|host: .+)$/
export const isCriterion = (label: string) => !TYPED.test(label)
const rowsOf = (d: EuiHostCardData, prefix: string) => d.rows.filter(r => r.label.startsWith(prefix))
  .map(r => ({ name: r.label.slice(prefix.length), parts: str(r.value).split('·').map(s => s.trim()) }))
const one = (d: EuiHostCardData, label: string) => str(d.rows.find(r => r.label === label)?.value ?? '')
const tone = (state: string) => /^(online|ready|running|working|thinking|answered|verified|\d+\/\d+ ready)/i.test(state) ? 'ok'
  : /^(idle|queued|standby|corrected)/i.test(state) ? 'idle' : /^(blocked|dead|offline|down)/i.test(state) ? 'bad' : 'idle'

function contract(d: EuiHostCardData, el: El): EuiNode {
  const crit = d.rows.filter(r => isCriterion(r.label))
  const ok = crit.filter(r => met(evidence(r.value)[0])).length
  const sample = one(d, 'sample')
  const synthetic = (panel: string) => sample.split(',').map(s => s.trim()).includes(panel)
  const head = (title: string, note: string, panel?: string) => el('div', [
    el('b', [text(title)], 'ih-h'), el('span', [text(note)], 'ih-hnote'),
    ...(panel && synthetic(panel) ? [el('span', [text('sample data')], 'ih-sample')] : [])
  ], 'ih-head')
  const reqs = el('div', crit.map(r => {
    const { kind, phrase } = criterion(r.label)
    const [state, more] = evidence(r.value)
    const good = met(state)
    return el('div', [
      el('small', [text(kind)], 'ih-kind'),
      el('div', [el('span', [text(`“${phrase}”`)], 'ih-phrase'),
        el('span', [text(good ? `evidence · ${more || state}` : more || 'needs a real-turn receipt')], 'ih-needs')], 'ih-req-text'),
      good ? el('span', [el('b', [text('✓')], 'ih-tick'), text(' evidenced')], 'ih-mark')
        : el('span', [el('i', [], 'ih-dot'), text(' missing')], 'ih-mark')
    ], good ? 'ih-slot ih-met' : 'ih-slot ih-missing', { 'data-state': good ? 'met' : 'missing' })
  }), 'ih-slots')
  const lanes = rowsOf(d, 'lane: ')
  const node = (l: { name: string; parts: string[] }) => {
    const [job = '', model = '', state = 'idle'] = l.parts
    return el('div', [el('div', [el('i', [], `ih-led ih-${tone(state)}`), el('b', [text(l.name)])], 'ih-lrole'),
      el('small', [text(model || job)], 'ih-lmodel'), el('small', [text(job)], 'ih-ljob')],
    `ih-lane ih-l-${l.name.replace(/[^a-z]/g, '')}`, { 'data-state': state })
  }
  const link = () => el('i', [], 'ih-flowlink')
  const fan = /fan-out/i.test(one(d, 'pattern'))
  const mid = lanes.filter(l => fan && (l.name === 'small' || l.name === 'large'))
  const flow: EuiNode[] = [el('span', [text('ask')], 'ih-term')]
  for (const l of lanes) {
    if (mid.includes(l)) {
      if (l === mid[0]) flow.push(link(), el('div', mid.map(m => el('div', [el('i', [], 'ih-stub'), node(m), el('i', [], 'ih-stub')], 'ih-branch')), 'ih-fan'))
      continue
    }
    flow.push(link(), node(l))
  }
  flow.push(el('i', [], 'ih-flowlink ih-gated'), el('span', [text('receipt')], 'ih-term ih-due'))
  const hosts = rowsOf(d, 'host: ')
  const gate = one(d, 'gate').split('·').map(s => s.trim())
  const votes = Number(/(\d+) of (\d+)/.exec(gate[1] ?? '')?.[2] ?? 0)
  const budget = one(d, 'budget').split('·').map(s => s.trim())
  const left = Math.max(0, Math.min(100, Number(/(\d+)%/.exec(budget[1] ?? '')?.[1] ?? 0)))
  return el('div', [
    head('Requirements', `${ok}/${crit.length} evidenced · ${crit.length - ok} missing`),
    reqs,
    ...(lanes.length ? [head('Orchestration', one(d, 'pattern'), 'lanes'), el('div', flow, 'ih-flow')] : []),
    ...(hosts.length ? [head('Hosts', 'where each slice runs', 'hosts'), el('div', hosts.map(h => el('div', [
      el('div', [el('i', [], `ih-led ih-${tone(h.parts[0] ?? '')}`), el('b', [text(h.name)])], 'ih-lrole'),
      el('small', [text(h.parts[0] ?? '')], 'ih-hstate'), el('small', [text(h.parts[1] ?? '')], 'ih-ljob')
    ], 'ih-host', { 'data-state': h.parts[0] ?? '' })), 'ih-hosts')] : []),
    ...(gate[0] || budget[0] ? [el('div', [
      el('div', [el('div', [el('small', [text('gate')], 'ih-kind')], 'ih-head'), el('b', [text(gate[0] ?? '')], 'ih-gname'),
        el('div', [...Array.from({ length: votes }, () => el('i', [], 'ih-pip')), el('small', [text(`0/${votes} seats voted`)], 'ih-ljob')], 'ih-pips'),
        el('small', [text(gate[1] ?? '')], 'ih-ljob')], 'ih-gate'),
      el('div', [el('div', [el('small', [text(synthetic('budget') ? 'budget · sample' : 'budget')], 'ih-kind ih-wide')], 'ih-head'),
        el('b', [text(budget[0] ?? '')], 'ih-gname'),
        el('div', [el('i', [], `ih-meterfill ih-w${Math.round(left / 10)}`)], 'ih-meter'), el('small', [text(budget[1] ?? '')], 'ih-ljob')], 'ih-budget')
    ], 'ih-gaterow')] : [])
  ], 'ih-hero ih-contract')
}

/** The approve button's label once approved: a contract is approved, not complete, until every receipt lands. */
export function intentDoneLabel(d: EuiHostCardData): string | undefined {
  if (d.kind !== 'intent-contract') return undefined
  return d.rows.filter(r => isCriterion(r.label)).every(r => met(evidence(r.value)[0])) ? 'Approved · all criteria evidenced' : 'Approved — awaiting receipts'
}

function work(d: EuiHostCardData, el: El): EuiNode {
  const kids: EuiNode[] = []
  let seam = false
  d.rows.forEach((r, i) => {
    const [state = 'unknown', repo = ''] = str(r.value).split('·').map(s => s.trim())
    if (!seam && i > 0 && state !== 'built' && d.rows.slice(0, i).every(x => str(x.value).startsWith('built'))) {
      kids.push(el('span', [text('built ≠ accepted')], 'ih-seam'))
      seam = true
    } else if (i > 0) kids.push(el('i', [], 'ih-link'))
    kids.push(el('div', [
      el('b', [text(r.label)], 'ih-node'),
      el('small', [text(state)], 'ih-state'),
      ...(repo ? [el('span', [text(repo)], 'ih-repo')] : [])
    ], `ih-stop ih-s-${state.replace(/[^a-z]/g, '')}`, { 'data-state': state }))
  })
  return el('div', kids, 'ih-hero ih-work ih-rail')
}

function proof(d: EuiHostCardData, el: El): EuiNode {
  const n = Number(d.rows.find(r => /receipt/i.test(r.label))?.value ?? 0) || 0
  const hash = str(d.rows.find(r => /hash/i.test(r.label))?.value ?? '')
  return el('div', [
    el('div', n > 0
      ? [el('span', [text(String(n - 1))], 'ih-n ih-n-out'), el('span', [text(String(n))], 'ih-n ih-n-in')]
      : [el('span', [text('0')], 'ih-n')], 'ih-counter'),
    el('small', [text(n === 1 ? 'real-turn receipt' : 'real-turn receipts')], 'ih-cap'),
    n > 0 && hash ? el('span', [text(hash.slice(0, 12))], 'ih-stamp') : el('span', [text('no receipt yet')], 'ih-stamp ih-none')
  ], `ih-hero ih-proof ${n > 0 ? 'ih-landed' : ''}`.trim())
}

/** The hero for an intent card, or undefined for any other kind. */
export function intentHero(d: EuiHostCardData, el: El): EuiNode | undefined {
  if (!isIntentKind(d.kind)) return undefined
  return { 'intent-declare': declare, 'intent-contract': contract, 'intent-work': work, 'intent-proof': proof }[d.kind](d, el)
}

export const INTENT_CSS = `
[data-eui='card'] .ih-hero { --ih-acc: var(--h-success, #7fd1a0); --ih-scope: var(--h-primary); --ih-due: var(--h-warning, #e8b04a); position: relative; margin: 0 0 12px; padding: 14px; border: 1px solid var(--h-border); border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0)), var(--h-muted); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); overflow: hidden; }
[data-eui='card'] .ih-wavebox { position: relative; }
[data-eui='card'] .ih-wave { display: block; width: 100%; height: 40px; margin-bottom: 8px; opacity: .45; }
[data-eui='card'] .ih-ask { position: relative; margin: 0; padding: 14px 4px; font-size: 20px; line-height: 1.5; font-weight: 600; color: var(--h-fg); letter-spacing: -.01em; }
[data-eui='card'] .ih-u { padding-bottom: 1px; border-bottom: 3px solid var(--h-primary); }
[data-eui='card'] .ih-c-acceptance { border-color: var(--ih-acc); color: var(--ih-acc); }
[data-eui='card'] .ih-c-scope { border-color: var(--ih-scope); color: var(--ih-scope); }
[data-eui='card'] .ih-c-deadline { border-color: var(--ih-due); color: var(--ih-due); }
[data-eui='card'] .ih-keys { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
[data-eui='card'] .ih-key { font: 11px/1.4 var(--h-mono); padding: 2px 8px; border: 1px solid; border-radius: 999px; border-bottom-width: 1px; }
[data-eui='card'] .ih-tick { font-weight: 700; }
[data-eui='card'] .ih-contract { padding: 12px; }
[data-eui='card'] .ih-head { display: flex; align-items: baseline; gap: 8px; margin: 12px 0 6px; white-space: nowrap; }
[data-eui='card'] .ih-contract > .ih-head:first-child { margin-top: 0; }
[data-eui='card'] .ih-h { font: 700 11px/1.2 var(--h-mono); color: var(--h-fg); text-transform: uppercase; letter-spacing: .1em; }
[data-eui='card'] .ih-hnote { flex: 1; min-width: 0; font: 11px/1.2 var(--h-mono); color: var(--h-fg); opacity: .7; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-sample { flex: none; font: 700 9px/1 var(--h-mono); padding: 3px 6px; border: 1px solid var(--h-fg); border-radius: 999px; color: var(--h-fg); background: var(--h-bg); opacity: .75; text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-slots { display: flex; flex-direction: column; gap: 6px; }
[data-eui='card'] .ih-slot { display: flex; align-items: center; gap: 10px; height: 46px; box-sizing: border-box; padding: 0 10px; border: 1px dashed var(--ih-due); border-radius: 8px; overflow: hidden; }
[data-eui='card'] .ih-slot.ih-met { border: 1px solid var(--ih-acc); background: rgba(127,209,160,.08); }
[data-eui='card'] .ih-kind { flex: none; width: 76px; font: 700 10px/1.2 var(--h-mono); color: var(--h-fg); opacity: .7; text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-kind.ih-wide { width: auto; }
[data-eui='card'] .ih-req-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
[data-eui='card'] .ih-phrase { font-size: 13px; line-height: 1.3; font-weight: 600; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-needs { font: 11px/1.3 var(--h-mono); color: var(--h-fg); opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-mark { flex: none; width: 84px; display: flex; align-items: center; justify-content: flex-end; gap: 2px; font: 600 11px/1.2 var(--h-mono); color: var(--h-fg); white-space: nowrap; }
[data-eui='card'] .ih-met .ih-mark { color: var(--ih-acc); }
[data-eui='card'] .ih-dot { display: inline-block; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--ih-due); animation: ih-pulse 1.4s ease-in-out infinite; }
[data-eui='card'] .ih-flow { display: flex; align-items: center; padding: 10px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); }
[data-eui='card'] .ih-term { flex: none; font: 600 10px/1 var(--h-mono); padding: 8px 8px; border-radius: 999px; border: 1px solid var(--h-border); color: var(--h-mutedFg); text-transform: uppercase; letter-spacing: .06em; }
[data-eui='card'] .ih-flowlink { flex: 1; min-width: 8px; height: 2px; background: var(--h-mutedFg); }
[data-eui='card'] .ih-flowlink.ih-gated { min-width: 18px; background: #a855d6; }
[data-eui='card'] .ih-term.ih-due { border: 1.5px dashed var(--ih-due); color: var(--h-fg); }
[data-eui='card'] .ih-fan { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 4px 0; border-left: 2px solid var(--h-mutedFg); border-right: 2px solid var(--h-mutedFg); border-radius: 4px; }
[data-eui='card'] .ih-branch { display: flex; align-items: center; }
[data-eui='card'] .ih-stub { flex: none; width: 10px; height: 2px; background: var(--h-mutedFg); }
[data-eui='card'] .ih-lane { flex: none; width: 96px; height: 56px; box-sizing: border-box; padding: 5px 7px; border: 1px solid var(--h-border); border-radius: 7px; background: var(--h-muted); overflow: hidden; }
[data-eui='card'] .ih-l-council { border-color: #a855d6; box-shadow: 0 0 0 1px rgba(207,120,239,.25); }
[data-eui='card'] .ih-l-council .ih-lrole b { color: #a855d6; }
[data-eui='card'] .ih-lrole { display: flex; align-items: center; gap: 5px; font: 600 11px/1.2 var(--h-mono); color: var(--h-fg); white-space: nowrap; }
[data-eui='card'] .ih-lmodel, [data-eui='card'] .ih-ljob, [data-eui='card'] .ih-hstate { display: block; font: 11px/1.35 var(--h-mono); color: var(--h-fg); opacity: .72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-lmodel { color: var(--h-fg); opacity: .8; }
[data-eui='card'] .ih-led { flex: none; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #9ca39a; }
[data-eui='card'] .ih-led.ih-ok { background: #7ee3a0; box-shadow: 0 0 6px rgba(126,227,160,.6); }
[data-eui='card'] .ih-led.ih-bad { background: #e8513a; }
[data-eui='card'] .ih-hosts { display: flex; gap: 6px; }
[data-eui='card'] .ih-host { flex: 1 1 0; min-width: 0; padding: 7px 8px; border: 1px solid var(--h-border); border-radius: 7px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ih-hstate { color: var(--h-fg); opacity: .8; }
[data-eui='card'] .ih-gaterow { display: flex; gap: 6px; margin-top: 12px; }
[data-eui='card'] .ih-gate, [data-eui='card'] .ih-budget { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border: 1px solid var(--h-border); border-radius: 7px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ih-gate { border-color: #a855d6; }
[data-eui='card'] .ih-gaterow .ih-head { margin: 0; height: 15px; align-items: center; }
[data-eui='card'] .ih-gname { font-size: 12px; line-height: 1.3; font-weight: 600; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-pips { display: flex; align-items: center; gap: 4px; height: 13px; }
[data-eui='card'] .ih-gate .ih-pips .ih-ljob, [data-eui='card'] .ih-gate > .ih-ljob { color: var(--h-fg); opacity: .75; }
[data-eui='card'] .ih-pip { flex: none; display: inline-block; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #a855d6; box-sizing: border-box; }
[data-eui='card'] .ih-pips .ih-ljob { margin-left: 4px; }
[data-eui='card'] .ih-meter { position: relative; height: 6px; margin: 3px 0 4px; border-radius: 3px; background: var(--h-border); overflow: hidden; }
[data-eui='card'] .ih-meterfill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; background: var(--h-primary); }
[data-eui='card'] .ih-w0 { width: 0%; }
[data-eui='card'] .ih-w1 { width: 10%; }
[data-eui='card'] .ih-w2 { width: 20%; }
[data-eui='card'] .ih-w3 { width: 30%; }
[data-eui='card'] .ih-w4 { width: 40%; }
[data-eui='card'] .ih-w5 { width: 50%; }
[data-eui='card'] .ih-w6 { width: 60%; }
[data-eui='card'] .ih-w7 { width: 70%; }
[data-eui='card'] .ih-w8 { width: 80%; }
[data-eui='card'] .ih-w9 { width: 90%; }
[data-eui='card'] .ih-w10 { width: 100%; }
[data-eui='card'] .ih-cap { margin: 8px 0 0; font: 11px/1.4 var(--h-mono); color: var(--h-mutedFg); }
[data-eui='card'] .ih-hold { position: relative; overflow: hidden; width: 100%; padding: 12px; border-radius: 10px; border: 2px solid var(--h-primary); background: var(--h-card, var(--h-bg)); color: var(--h-fg); font-weight: 700; }
[data-eui='card'] .ih-hold[disabled] { background: var(--h-muted); color: var(--h-fg); }
[data-eui='card'] .ih-holdfill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--h-primary); opacity: .4; transition: width .15s ease-out; }
[data-eui='card'] .ih-hold:active .ih-holdfill { width: 100%; transition: width 1s linear; }
[data-eui='card'] .ih-rail { display: flex; align-items: center; gap: 0; }
[data-eui='card'] .ih-stop { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 88px; }
[data-eui='card'] .ih-node { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--h-border); font: 600 13px var(--h-mono); }
[data-eui='card'] .ih-s-built .ih-node { border-color: var(--ih-acc); color: var(--ih-acc); }
[data-eui='card'] .ih-s-running .ih-node { border-color: var(--h-primary); color: var(--h-primary); animation: ih-pulse 1.2s ease-in-out infinite; }
[data-eui='card'] .ih-s-blocked .ih-node { border-color: var(--ih-due); color: var(--ih-due); border-style: dashed; }
[data-eui='card'] .ih-state { font: 10px var(--h-mono); color: var(--h-mutedFg); text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-repo { font: 10px var(--h-mono); padding: 1px 6px; border-radius: 4px; background: var(--h-bg); border: 1px solid var(--h-border); }
[data-eui='card'] .ih-link { flex: 1; height: 2px; background: var(--h-border); }
[data-eui='card'] .ih-seam { flex: 1; text-align: center; font: 10px var(--h-mono); color: var(--ih-due); border-top: 2px dashed var(--ih-due); padding-top: 4px; margin-top: -18px; }
[data-eui='card'] .ih-proof { display: flex; flex-direction: column; align-items: center; padding: 18px; }
[data-eui='card'] .ih-counter { position: relative; height: 96px; width: 120px; overflow: hidden; text-align: center; }
[data-eui='card'] .ih-n { position: absolute; left: 0; right: 0; top: 0; font-size: 88px; line-height: 96px; font-weight: 500; letter-spacing: -.06em; color: var(--h-primary); }
[data-eui='card'] .ih-n-out { opacity: 0; transform: translateY(-100%); animation: ih-out .5s ease-in; }
[data-eui='card'] .ih-n-in { animation: ih-in .9s ease-out; }
[data-eui='card'] .ih-stamp { margin-top: 10px; padding: 4px 12px; font: 600 13px var(--h-mono); color: var(--h-primary); border: 2px solid var(--h-primary); border-radius: 6px; transform: rotate(-6deg); animation: ih-slam 1.35s cubic-bezier(.2,1.6,.4,1); }
[data-eui='card'] .ih-stamp.ih-none { color: var(--h-mutedFg); border-color: var(--h-border); border-style: dashed; transform: none; opacity: 1; animation: none; }
@keyframes ih-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .5 } }
@keyframes ih-out { 0% { transform: translateY(0); opacity: 1 } 100% { transform: translateY(-100%); opacity: 0 } }
@keyframes ih-in { 0%, 44% { transform: translateY(100%) } 100% { transform: translateY(0) } }
@keyframes ih-slam { 0%, 74% { opacity: 0; transform: rotate(-6deg) scale(2.6) } 100% { opacity: 1; transform: rotate(-6deg) scale(1) } }
@media (prefers-reduced-motion: reduce) {
  [data-eui='card'] .ih-hero *, [data-eui='card'] .ih-hold .ih-holdfill { animation: none; transition: none; }
}
`
