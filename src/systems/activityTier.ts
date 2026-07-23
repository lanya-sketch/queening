import type { Activity, ActivityTier, Effect, GameState } from '../types/game'

/**
 * 수업 등급 해석 (밸런스 재설계 1단계).
 *
 * ★ 카드는 스탯당 한 장. 현재 스탯이 오르면 같은 카드가 초급→중급→고급으로 바뀐다.
 *   얻는 것도 크고 심신·의심 대가도 커진다 — 그래서 **밀어준 스탯만 고급에 닿는다.**
 *   균형 육성은 다섯을 전부 초급에 묶어 두게 되어 스스로 비효율이 된다(벌이 아니라 복리).
 */
export function activeTier(activity: Activity, state: GameState): ActivityTier | null {
  if (!activity.tiers?.length || !activity.tierStat) return null
  const level = state.stats[activity.tierStat] ?? 0
  // min 이 큰 것부터 보고 최초로 충족하는 등급.
  const sorted = [...activity.tiers].sort((a, b) => b.min - a.min)
  return sorted.find((t) => level >= t.min) ?? sorted[sorted.length - 1]
}

/** 지금 이 활동이 실제로 낼 효과. 등급이 있으면 등급 효과가 기본 효과를 대체한다. */
export function activityEffects(activity: Activity, state: GameState): Effect[] {
  return activeTier(activity, state)?.effects ?? activity.effects
}

/** 카드에 붙일 등급 배지(없으면 null). */
export function activityTierLabel(activity: Activity, state: GameState): string | null {
  return activeTier(activity, state)?.label ?? null
}
