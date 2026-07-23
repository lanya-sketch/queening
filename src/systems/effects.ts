import { CHARACTER_BY_ID } from '../data/characters'
import {
  GAME_CONFIG, courtInfluenceCap, regentRapportCap, tutorTrustCap,
} from '../data/config'
import { RESOURCE_META, STAT_META } from '../data/stats'
import type { Delta, Effect, EffectTarget, GameState } from '../types/game'

export type Rng = () => number

export function targetLabel(target: EffectTarget): string {
  if (target.kind === 'stat') return STAT_META[target.key].label
  if (target.kind === 'affection') {
    return `${CHARACTER_BY_ID[target.charId]?.name ?? target.charId} 호감도`
  }
  // 카운터는 내부 타이머라 결과 화면에 보일 이름이 없다.
  if (target.kind === 'counter') return `__counter:${target.key}`
  return RESOURCE_META[target.key].label
}

/**
 * amount 에 ±variance 편차를 더한다.
 * ★ 소수 델타(월 단위)를 위해 연속 편차를 쓴다: amount + (rng*2-1)×variance.
 *   결정론 모드(rng=0.5)에서는 (0)×variance = 0 이라 편차가 정확히 사라진다.
 */
function roll(effect: Effect, rng: Rng): number {
  if (!effect.variance) return effect.amount
  return effect.amount + (rng() * 2 - 1) * effect.variance
}

function read(state: GameState, target: EffectTarget): number {
  if (target.kind === 'stat') return state.stats[target.key]
  if (target.kind === 'affection') {
    return state.affection[target.charId] ?? CHARACTER_BY_ID[target.charId]?.startingAffection ?? 0
  }
  if (target.kind === 'counter') return state.counters?.[target.key] ?? 0
  return state[target.key]
}

function clamp(target: EffectTarget, value: number, state: GameState): number {
  if (target.kind === 'stat') {
    return Math.min(GAME_CONFIG.statMax, Math.max(GAME_CONFIG.statMin, value))
  }
  if (target.kind === 'affection') {
    return Math.min(GAME_CONFIG.resourceMax, Math.max(GAME_CONFIG.resourceMin, value))
  }
  // 계절 타이머는 0 이상이면 그만. 100 상한을 적용할 대상이 아니다.
  if (target.kind === 'counter') return Math.max(0, value)
  if (target.key === 'actionPoints') return Math.max(0, value)
  // ★ 나이에 따라 상한이 움직이는 지표들 — 영향도(원래) + 신뢰·섭정 신망(밸런스 재설계).
  //   과속을 막는 장치이자 세계관이다(어린애를 통치자로 인정할 리 없다).
  const max =
    target.key === 'courtInfluence' ? courtInfluenceCap(state.age)
    : target.key === 'tutorTrust' ? tutorTrustCap(state.age)
    : target.key === 'regentRapport' ? regentRapportCap(state.age)
    : GAME_CONFIG.resourceMax
  return Math.min(max, Math.max(GAME_CONFIG.resourceMin, value))
}

function write(state: GameState, target: EffectTarget, value: number): void {
  if (target.kind === 'stat') state.stats[target.key] = value
  else if (target.kind === 'affection') state.affection[target.charId] = value
  else if (target.kind === 'counter') state.counters[target.key] = value
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
  const next: GameState = {
    ...state,
    stats: { ...state.stats },
    affection: { ...state.affection },
    counters: { ...(state.counters ?? {}) },
  }
  if (!effects?.length) return { state: next, deltas: [] }

  const totals = new Map<string, number>()

  for (const effect of effects) {
    const before = read(next, effect.target)
    const after = clamp(effect.target, before + roll(effect, rng), next)
    write(next, effect.target, after)

    const label = targetLabel(effect.target)
    totals.set(label, (totals.get(label) ?? 0) + (after - before))
  }

  const deltas: Delta[] = [...totals.entries()]
    // 계절 타이머는 플레이어에게 보고할 "변화"가 아니다.
    .filter(([label, amount]) => amount !== 0 && !label.startsWith('__counter:'))
    .map(([label, amount]) => ({ label, amount }))

  return { state: next, deltas }
}

/**
 * 활동 카드·선택지에서 효과를 한 줄로 미리 보여줄 때 쓴다.
 *
 * ★ scale(MONTH_SCALE)은 **스탯에만** 적용한다 — 실제 적용과 같은 규칙이라
 *   카드의 스탯은 축소된 추정치, 심신·의심 등 자원은 그대로 보여준다.
 *   이벤트 선택지는 scale 1(기본). 내구도 계수는 숨은 상태라 반영하지 않는다.
 */
export function formatEffect(effect: Effect, scale = 1): string {
  const s = effect.target.kind === 'stat' ? scale : 1
  const amount = Math.round(effect.amount * s)
  const sign = amount > 0 ? '+' : ''
  const variance = effect.variance ? `±${Math.max(1, Math.round(effect.variance * s))}` : ''
  return `${targetLabel(effect.target)} ${sign}${amount}${variance}`
}
