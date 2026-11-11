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

function contract(d: EuiHostCardData, el: El): EuiNode {
  const ok = d.rows.filter(r => met(r.value)).length
  return el('div', [
    el('div', d.rows.map(r => el('div', [
      el('i', [], 'ih-barfill'),
      el('small', [text(r.label)])
    ], met(r.value) ? 'ih-bar ih-met' : 'ih-bar ih-missing', { 'data-state': met(r.value) ? 'met' : 'missing' })), 'ih-gatebars'),
    el('p', [text(`${ok}/${d.rows.length} criteria evidenced · ${d.rows.length - ok} missing`)], 'ih-cap')
  ], 'ih-hero ih-contract')
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
[data-eui='card'] .ih-wavebox { position: relative; min-height: 72px; }
[data-eui='card'] .ih-wave { position: absolute; left: 0; top: 0; opacity: .9; }
[data-eui='card'] .ih-ask { position: relative; margin: 0; padding: 14px 4px; font-size: 20px; line-height: 1.5; font-weight: 600; color: var(--h-fg); letter-spacing: -.01em; }
[data-eui='card'] .ih-u { padding-bottom: 1px; border-bottom: 3px solid var(--h-primary); }
[data-eui='card'] .ih-c-acceptance { border-color: var(--ih-acc); color: var(--ih-acc); }
[data-eui='card'] .ih-c-scope { border-color: var(--ih-scope); color: var(--ih-scope); }
[data-eui='card'] .ih-c-deadline { border-color: var(--ih-due); color: var(--ih-due); }
[data-eui='card'] .ih-keys { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
[data-eui='card'] .ih-key { font: 11px/1.4 var(--h-mono); padding: 2px 8px; border: 1px solid; border-radius: 999px; border-bottom-width: 1px; }
[data-eui='card'] .ih-gatebars { display: flex; gap: 8px; align-items: flex-end; height: 120px; padding: 0 6px; border-bottom: 2px solid var(--h-border); }
[data-eui='card'] .ih-bar { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; gap: 6px; }
[data-eui='card'] .ih-barfill { display: block; height: 78%; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, var(--h-primary), rgba(255,255,255,.04)); }
[data-eui='card'] .ih-missing .ih-barfill { background: transparent; border: 1px dashed var(--ih-due); height: 78%; animation: ih-pulse 1.4s ease-in-out infinite; }
[data-eui='card'] .ih-bar small { font: 10px/1.3 var(--h-mono); color: var(--h-mutedFg); text-align: center; }
[data-eui='card'] .ih-cap { margin: 8px 0 0; font: 11px/1.4 var(--h-mono); color: var(--h-mutedFg); }
[data-eui='card'] .ih-hold { position: relative; overflow: hidden; width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--h-primary); background: transparent; color: var(--h-fg); font-weight: 600; }
[data-eui='card'] .ih-holdfill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--h-primary); opacity: .35; transition: width .15s ease-out; }
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
@keyframes ih-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes ih-out { 0% { transform: translateY(0); opacity: 1 } 100% { transform: translateY(-100%); opacity: 0 } }
@keyframes ih-in { 0%, 44% { transform: translateY(100%) } 100% { transform: translateY(0) } }
@keyframes ih-slam { 0%, 74% { opacity: 0; transform: rotate(-6deg) scale(2.6) } 100% { opacity: 1; transform: rotate(-6deg) scale(1) } }
@media (prefers-reduced-motion: reduce) {
  [data-eui='card'] .ih-hero *, [data-eui='card'] .ih-hold .ih-holdfill { animation: none; transition: none; }
}
`
