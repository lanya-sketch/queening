import { GAME_CONFIG } from '../data/config'
import { RESOURCE_META, STAT_META } from '../data/stats'
import type { Delta, Effect, EffectTarget, GameState } from '../types/game'

export type Rng = () => number

export function targetLabel(target: EffectTarget): string {
  return target.kind === 'stat' ? STAT_META[target.key].label : RESOURCE_META[target.key].label
}

/** amount 에 ±variance 정수 편차를 더한다. */
function roll(effect: Effect, rng: Rng): number {
  if (!effect.variance) return effect.amount
  const v = effect.variance
  return effect.amount + Math.floor(rng() * (v * 2 + 1)) - v
}

function read(state: GameState, target: EffectTarget): number {
  return target.kind === 'stat' ? state.stats[target.key] : state[target.key]
}

function clamp(target: EffectTarget, value: number): number {
  if (target.kind === 'stat') {
    return Math.min(GAME_CONFIG.statMax, Math.max(GAME_CONFIG.statMin, value))
  }
  if (target.key === 'actionPoints') return Math.max(0, value)
  return Math.min(GAME_CONFIG.resourceMax, Math.max(GAME_CONFIG.resourceMin, value))
}

function write(state: GameState, target: EffectTarget, value: number): void {
  if (target.kind === 'stat') state.stats[target.key] = value
  else state[target.key] = value
}

/**
 * 효과 목록을 적용한 새 상태와, clamp 이후 "실제로" 변한 양을 돌려준다.
 * 같은 대상에 대한 변화는 하나로 합쳐서 보고한다.
 */
export function applyEffects(
  state: GameState,
  effects: Effect[] | undefined,
  rng: Rng = Math.random,
): { state: GameState; deltas: Delta[] } {
  const next: GameState = { ...state, stats: { ...state.stats } }
  if (!effects?.length) return { state: next, deltas: [] }

  const totals = new Map<string, number>()

  for (const effect of effects) {
    const before = read(next, effect.target)
    const after = clamp(effect.target, before + roll(effect, rng))
    write(next, effect.target, after)

    const label = targetLabel(effect.target)
    totals.set(label, (totals.get(label) ?? 0) + (after - before))
  }

  const deltas: Delta[] = [...totals.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([label, amount]) => ({ label, amount }))

  return { state: next, deltas }
}

/** 활동 카드 등에서 효과를 한 줄로 미리 보여줄 때 쓴다. */
export function formatEffect(effect: Effect): string {
  const sign = effect.amount > 0 ? '+' : ''
  const variance = effect.variance ? `±${effect.variance}` : ''
  return `${targetLabel(effect.target)} ${sign}${effect.amount}${variance}`
}
