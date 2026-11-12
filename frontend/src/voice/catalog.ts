// What a helper lane is bound to, in words and colours: each role's realistic models (the z0live broker's
// lanes.py presets plus the owner's routing) and the zerOS AODL agent-core key they are drawn with. Hues and
// effort levels are ported from zerOS tools/console/agent-encodings.json (encoding 2026-07-14.1): hue says
// provider only, effort is an orbit-pip count. Local and Groq have no hue in that key; theirs are Glide's, and
// multi-provider takes xAI's violet, since the key's #d9bd7a reads as Anthropic gold beside it.
import { readFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import { record } from '../wire/json.js'

export const PROVIDERS = {
  local: { label: 'Local', hue: '#b3bfd4' },
  anthropic: { label: 'Anthropic', hue: '#e6b86f' },
  openai: { label: 'OpenAI', hue: '#54d7c2' },
  opencode: { label: 'OpenCode', hue: '#3dd68c' },
  groq: { label: 'Groq', hue: '#f0794a' },
  multi: { label: 'Multi-provider', hue: '#d875ef' },
  unknown: { label: 'Unspecified', hue: '#9ca39a' }
} as const
export type ProviderId = keyof typeof PROVIDERS

export const EFFORTS = {
  min: { label: 'Min', orbits: 1, accent: '#92a198' },
  standard: { label: 'Standard', orbits: 2, accent: '#7ee3a0' },
  high: { label: 'High', orbits: 3, accent: '#68dfff' },
  max: { label: 'Max', orbits: 4, accent: '#ffd34c' },
  unknown: { label: 'Unspecified', orbits: 0, accent: '#9ca39a' }
} as const
export type EffortId = keyof typeof EFFORTS

export const BILLING = { free: 'Free', subscription: 'Subscription', paid: 'Paid', unknown: 'Unknown' } as const
export type Billing = keyof typeof BILLING

export interface LaneModel {
  id: string
  label: string
  provider: ProviderId
  billing: Billing
  route: 'local' | 'cloud'
  effort: EffortId
  /** A z0int voice-plan role alias (smol, slow): the real model comes from the pinned voice plan. */
  alias?: true
  /** Extra words for the tooltip (seats, harness). */
  note?: string
}

const m = (id: string, label: string, provider: ProviderId, billing: Billing, effort: EffortId, extra: Partial<LaneModel> = {}): LaneModel =>
  ({ id, label, provider, billing, route: provider === 'local' ? 'local' : 'cloud', effort, ...extra })

/** The models each role may be bound to, in picker order. */
export const ROLE_MODELS: Readonly<Record<string, readonly LaneModel[]>> = {
  fast: [
    m('qwen3-0.6b-q8', 'Qwen3 0.6B Q8', 'local', 'free', 'min'),
    m('qwen3-1.7b', 'Qwen3 1.7B', 'local', 'free', 'min'),
    m('claude-haiku-4-5', 'Claude Haiku 4.5', 'anthropic', 'subscription', 'min'),
    m('llama-3.1-8b-instant', 'Llama 3.1 8B', 'groq', 'free', 'min', { note: 'Groq free tier' })
  ],
  small: [
    m('smol', 'smol role', 'anthropic', 'subscription', 'standard', { alias: true }),
    m('qwen3.5-4b', 'Qwen3.5 4B', 'local', 'free', 'standard'),
    m('luna', 'GPT Luna', 'openai', 'subscription', 'standard', { note: 'via fx' }),
    m('deepseek-v4.1-flash-free', 'DeepSeek V4.1 Flash', 'opencode', 'free', 'standard')
  ],
  large: [
    m('slow', 'slow role', 'anthropic', 'subscription', 'high', { alias: true }),
    m('claude-sonnet-5', 'Claude Sonnet 5', 'anthropic', 'subscription', 'high'),
    m('gpt-6.1-sol', 'GPT-6.1 Sol', 'openai', 'subscription', 'high', { note: 'via fx' })
  ],
  council: [
    m('socratic-council', 'Socratic council', 'multi', 'subscription', 'max', { note: 'seats Opus 5.5 · Sol · Argon' })
  ]
}

/** Models a voice-plan role may resolve to, beyond the picker rows. */
const RESOLVED: readonly LaneModel[] = [
  m('claude-opus-5-5', 'Claude Opus 5.5', 'anthropic', 'subscription', 'high')
]
const BY_ID = new Map([...RESOLVED, ...Object.values(ROLE_MODELS).flat()].map(x => [x.id, x]))

const PLAN_PATH = '.z0int/config/z0live-voice-plan.json'
let plan: { at: number; roles: Record<string, string> } | undefined

/** Role → model from the pinned z0int voice plan ($Z0LIVE_VOICE_PLAN, else ~/.z0int, the real user's too), read every 10 s at most. */
export function voicePlanRoles(env = process.env, now = Date.now()): Record<string, string> {
  if (plan && now - plan.at < 10_000) return plan.roles
  const real = (() => { try { return userInfo().homedir } catch { return '' } })()
  const files = env['Z0LIVE_VOICE_PLAN'] ? [env['Z0LIVE_VOICE_PLAN']] : [...new Set([homedir(), real].filter(Boolean))].map(h => join(h, PLAN_PATH))
  let roles: Record<string, string> = {}
  for (const file of files) {
    try {
      const v = record(readFileSync(file, 'utf8'))
      if (!v) continue
      roles = Object.fromEntries(Object.entries(record(v['roles']) ?? {}).flatMap(([k, r]) => {
        const model = record(r)?.['model']
        return typeof model === 'string' ? [[k, model]] : []
      }))
      break
    } catch { /* next */ }
  }
  plan = { at: now, roles }
  return roles
}

/** A bound model as people read it. A role alias shows the model it resolves to (broker first, then the voice plan). */
export function laneModel(id: string, resolved: string | null = null, roles: Record<string, string> = voicePlanRoles()): LaneModel & { via?: string; target?: string } {
  const known = BY_ID.get(id)
  if (!known) return m(id, id, 'unknown', 'unknown', 'unknown')
  if (!known.alias) return known
  const target = resolved ?? roles[id]
  const real = target ? BY_ID.get(target) : undefined
  return { ...known, label: real?.label ?? target ?? `${id} role (unresolved)`, provider: real?.provider ?? (target ? 'unknown' : known.provider), via: id, ...(target ? { target } : {}) }
}

/** Picker rows for a role: its realistic models, plus whatever the lane is bound to now if it is not one of them. */
export function roleChoices(role: string, current: readonly string[] = []): string[] {
  const ids = (ROLE_MODELS[role] ?? []).map(x => x.id)
  return [...new Set([...ids, ...current.filter(Boolean)])]
}

const deepen = (hex: string) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.62).toString(16).padStart(2, '0')).join('')

/** A provider's hue, deepened on a light theme so it holds against white. */
export const providerHue = (id: ProviderId, dark: boolean) => (dark ? PROVIDERS[id].hue : deepen(PROVIDERS[id].hue))
