import type { GameDate } from '../types/game'

export const GAME_CONFIG = {
  /** 즉위년 1월, 11세에 시작. (월 단위 전환) */
  startDate: { year: 0, month: 1 } as GameDate,
  startAge: 11,
  /** 이 나이를 넘기면 이번 단계의 끝점. 엔딩은 M3. */
  endAge: 20,
  /** 한 해의 달 수. 12→1 로 넘어갈 때 나이가 오른다. */
  monthsPerYear: 12,

  actionPointsPerTurn: 3,

  statMin: 0,
  statMax: 100,
  resourceMin: 0,
  resourceMax: 100,

  /** 이 값 이상이면 섭정 경고 이벤트가 발동한다. */
  regentSuspicionWarning: 60,
  /** 이 값 이하면 심신 경고를 표시한다(M1은 표시만, 실제 페널티는 M2). */
  wellbeingWarning: 25,

  saveKey: 'queening.save',
  /** 올릴 때마다 systems/save.ts 의 MIGRATIONS 에 변환을 추가할 것. */
  saveVersion: 7,
} as const

/** 달 표시. 1..12. */
export function monthLabel(month: number): string {
  return `${month}월`
}

/**
 * ★ 활동 델타 배율 (월 단위 전환 1단계).
 *
 * 계절(36턴) 기준으로 잡힌 활동 델타를 월(108턴) 기준으로 줄인다. 턴이 3배이므로
 * ÷3 근처에서 출발해, 108턴 시뮬로 최종 스탯이 의도 범위에 들도록 실측 조정한다.
 *
 * 데이터(활동)는 계절 값을 그대로 두고 이 상수 하나로 스케일한다 — 튜닝이 상수 하나로
 * 끝나게(활동 11개를 매번 다시 고치지 않게). 내구도 계수는 이 위에 곱해진다.
 */
export const MONTH_SCALE = 1 / 3

/**
 * ★ 내구도 계수 (월 단위 전환 1단계).
 *
 * durability = base(age) + accumulated
 *   base(age)   = (age - 11) × BASE_PER_AGE   — 나이가 곧 그릇
 *   accumulated = 심신을 THRESHOLD 이상 유지한 달마다 += MANAGE_GAIN
 *
 * 역할 1 (낮으면 벌): 심신 소모 × (1 + max(0, THRESHOLD - durability) × COST_SLOPE)
 * 역할 2 (높으면 상): 성장 델타 × (1 + max(0, durability - THRESHOLD) × GROWTH_SLOPE)
 *
 * ★ 값은 108턴 무리형/관리형 시뮬로 실측 조정한다(시작 근사치).
 */
export const DURABILITY = {
  BASE_PER_AGE: 6, // 11세 0 → 20세 54
  MANAGE_THRESHOLD: 55, // 이 심신 이상으로 유지한 달에 누적이 는다
  MANAGE_GAIN: 0.4,
  /** 상/벌의 중심축. durability 가 이 값보다 낮으면 벌, 높으면 상. */
  PIVOT: 30,
  COST_SLOPE: 0.02, // durability 0 이면 심신 소모 ×(1+30×0.02)=×1.6
  GROWTH_SLOPE: 0.01, // durability 70 이면 성장 ×(1+40×0.01)=×1.4
  /** 초기값 — 나이 기본값(11세=0)에서 출발. */
  initial: 0,
} as const


export const INITIAL_STATS = {
  statecraft: 12,
  finance: 8,
  rhetoric: 10,
  martial: 6,
  courtcraft: 5,
} as const

export const INITIAL_RESOURCES = {
  wellbeing: 70,
  tutorTrust: 20,
  regentSuspicion: 10,
  regentRapport: 20,
  /** 11세 허수아비에서 출발한다. */
  courtInfluence: 10,
} as const

/**
 * 국정 영향도의 나이별 상한.
 * 11세:25 · 14세:49 · 17세:73 · 20세:97
 *
 * 어린 나이에 실권을 몰아쳐 굳히는 길을 막는다. 친정은 9년에 걸쳐
 * 밀어 올려야만 닿는 자리여야 한다.
 */
export function courtInfluenceCap(age: number): number {
  return Math.min(GAME_CONFIG.resourceMax, 25 + (age - GAME_CONFIG.startAge) * 8)
}
