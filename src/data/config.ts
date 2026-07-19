import type { GameDate } from '../types/game'

export const GAME_CONFIG = {
  /** 즉위년 봄, 11세에 시작. */
  startDate: { year: 0, season: 'spring' } as GameDate,
  startAge: 11,

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
  saveVersion: 1,
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
} as const
