import type { GameDate } from '../types/game'

export const GAME_CONFIG = {
  /** 즉위년 봄, 11세에 시작. */
  startDate: { year: 0, season: 'spring' } as GameDate,
  startAge: 11,
  /** 이 나이를 넘기면 이번 단계의 끝점. 엔딩은 M3. */
  endAge: 20,

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
  saveVersion: 6,
} as const

export const SEASON_LABEL: Record<GameDate['season'], string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const

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
