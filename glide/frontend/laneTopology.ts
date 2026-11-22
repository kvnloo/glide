// The broker's /v1/lanes/launch accepts counts against preset D and one model-list
// clause. Do not send a request if it would silently replace another tier's models.
import type { Lane } from '../../frontend/src/voice/lanes.js'

const TIERS = ['fast', 'small', 'large'] as const
const pools = {
  fast: ['qwen3-0.6b-q8', 'qwen3-1.7b', 'vllm-sr/free'],
  small: ['smol', 'qwen3.5-4b', 'vllm-sr/free'],
  large: ['slow', 'claude-sonnet-5', 'plan', 'claude-haiku-4-5']
} as const
const words = new Map([
  ['qwen3-0.6b-q8', 'qwen 0.6b'], ['qwen3-1.7b', 'qwen 1.7b'], ['qwen3.5-4b', 'qwen 4b'],
  ['vllm-sr/free', 'vllm'], ['smol', 'smol'], ['slow', 'slow'], ['plan', 'plan'],
  ['claude-sonnet-5', 'sonnet'], ['claude-opus-5-5', 'opus'], ['claude-haiku-4-5', 'haiku']
])
const choices = {
  fast: [...pools.fast, 'smol'],
  small: pools.small,
  large: [...pools.large, 'claude-opus-5-5']
}
export const launchModels = (role: string): readonly string[] =>
  TIERS.find(t => t === role) ? choices[role as keyof typeof choices] : []

export function launchChoice(lanes: readonly Pick<Lane, 'role' | 'model'>[]): string | null {
  if (lanes.some(l => ![...TIERS, 'council'].some(t => t === l.role))) return null
  const council = lanes.filter(l => l.role === 'council')
  if (council.length > 1 || council.some(l => !['socratic-council', 'opus-5.5+sol+argon'].includes(l.model))) return null
  const helpers = lanes.filter(l => l.role === 'fast' || l.role === 'small').length
  const counts = [`${council.length} council`]
  let edit = ''
  if (helpers < 1 || helpers > 6) return null
  for (const tier of TIERS) {
    const models = lanes.filter(l => l.role === tier).map(l => l.model)
    if (new Set(models).size !== models.length) return null
    if (tier === 'large' && (models.length < 1 || models.length > 4)) return null
    if (models.every((m, i) => m === pools[tier][i])) {
      counts.push(`${models.length} ${tier}`)
    } else {
      if (edit || models.some(m => !choices[tier].some(id => id === m) || !words.has(m))) return null
      edit = `set ${tier} lanes to ${models.map(m => words.get(m)).join(' and ')}`
    }
  }
  return [...counts, edit].filter(Boolean).join(', ')
}
