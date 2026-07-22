import { DURABILITY, GAME_CONFIG } from '../data/config'
import type { GameState } from '../types/game'

/**
 * 내구도 시스템 (월 단위 전환 1단계).
 *
 * ★ 숨은 상태. UI 막대 없이 상세창에서만 보인다. 두 역할이 대칭이다 —
 *   낮으면 벌(심신 소모 곱 증가), 높으면 상(성장 곱 증가). PIVOT 이 중심축.
 *   그래서 "초반 인내 → 후반 폭발 / 초반 욕심 → 관리 실패" 곡선이 나온다.
 *
 * ★ durability 는 turn.ts 가 매 턴 갱신한다(나이 기본값 + 관리 누적).
 *   여기서는 그 값을 읽어 소모·성장 계수를 계산하는 순수 함수만 둔다.
 */

/** 나이가 정하는 그릇. 어릴수록 작다. */
export function durabilityBase(age: number): number {
  return (age - GAME_CONFIG.startAge) * DURABILITY.BASE_PER_AGE
}

/**
 * 심신 소모 계수. durability 가 PIVOT 보다 낮을수록 커진다(어릴 때 혹독).
 * PIVOT 이상이면 1(추가 벌 없음).
 */
export function wellbeingCostFactor(durability: number): number {
  const deficit = Math.max(0, DURABILITY.PIVOT - durability)
  return 1 + deficit * DURABILITY.COST_SLOPE
}

/**
 * 성장 계수. durability 가 PIVOT 보다 높을수록 커진다(잘 관리하면 후반 가속).
 * PIVOT 이하면 1(추가 상 없음 — 벌은 심신 쪽에서 이미 받는다).
 */
export function growthFactor(durability: number): number {
  const surplus = Math.max(0, durability - DURABILITY.PIVOT)
  return 1 + surplus * DURABILITY.GROWTH_SLOPE
}

/**
 * 이번 턴의 durability 관리 누적분. 심신을 잘 유지했으면 는다.
 *
 * ★ durability 는 증분으로 관리한다(별도 accumulated 필드 없이):
 *   - 매 턴 이 관리 누적을 더하고,
 *   - 나이가 오르는 달엔 BASE_PER_AGE 를 더한다(그릇이 자란다).
 *   초기값은 base(11)=0. 그래서 durability = base(age) + Σ관리누적 이 자연히 유지된다.
 */
export function durabilityGain(state: GameState): number {
  return state.wellbeing >= DURABILITY.MANAGE_THRESHOLD ? DURABILITY.MANAGE_GAIN : 0
}
