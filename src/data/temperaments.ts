import type { Gender, StatKey, Stats } from '../types/game'

/**
 * ★ [2] 활동 선호 카테고리 — 활동의 `pref` 태그와 맞춘다.
 *   신뢰는 "이 아이가 원하는 걸 해줬는가"(선호 일치)로 오른다. 기질이 기본 성향을 정한다.
 */
export type PrefCategory =
  | '통치학' | '변론' | '무예' | '재정' | '궁정처세' | '사냥' | '정무' | '휴식' | '놀이'

/** 매달 wish 로테이션이 도는 수업 풀(균형은 편향이 없어 여기서 매달 다른 것을 원한다). */
export const LESSON_CATEGORIES: PrefCategory[] = ['통치학', '변론', '무예', '재정', '궁정처세']

/**
 * 시작 기질 (바이블 M2b-0 예약 항목) — "어떤 아이였는가".
 *
 * ★ 난이도 시스템이 아니라 **시작 빌드 프리셋**이다. 밸런스를 여러 벌 만들지 않는다.
 *   - 트레이드오프 필수: 뭔가 높으면 뭔가 낮다(스탯 총합 41 유지 — 여린만 예외).
 *   - 소폭(±5~10): "약간 유리한 출발"이지 "운명"이 아니다. 그 기질로도 다른 길을 간다.
 *   - ★ 심신(자원)·내구도(숨은 그릇)는 **어느 기질도 건드리지 않는다.** 자원을 건드리면
 *     난이도가 갈리고(초반 데드 위험), 스탯을 건드리면 특화가 갈린다 — 후자가 의도다.
 *     "몸이 약한/강한"은 심신이 아니라 **무예(스탯)와 서사**로 표현한다.
 *
 * ★ 기질은 시작 스탯·신뢰를 심을 뿐, 게임에는 flag `temperament_<id>` 로만 남는다
 *   (스키마 변경 없음 → 세이브 버전 안 올림). 온보딩·엔딩의 선택적 서사가 이 flag 를 읽는다.
 *
 * ★ '여린'의 신뢰 30 은 11세 상한(20) 위다. 상한은 성장을 막을 뿐 타고난 것을 빼앗지 않도록
 *   effects.ts clamp 을 고쳤다(초과분 유지·성장 차단). 그래서 11~12세에 실제 신뢰 우위를 갖는다.
 */
export interface Temperament {
  id: string
  /** 화면 이름. 예: 영민. */
  name: string
  /** 한 줄 성향(부제). 예: 문약형. */
  epithet: string
  /** "어떤 아이였는가" 서사 한 줄. 수치 나열 대신 이걸 보여준다. */
  line: string
  /** 시작 스탯(절대값). 기본(균형)에서 재분배. */
  stats: Stats
  /** 시작 튜터 신뢰(기본 20). */
  tutorTrust: number
  /** 균형 대비 오른/내린 스탯 — 질적 표시(▲▼)용. */
  up: StatKey[]
  down: StatKey[]
  /** 신뢰가 기본보다 높은가(여린). */
  trustUp?: boolean
  /**
   * ★ [2] 활동 선호 — 신뢰가 선호 일치로 오른다.
   *   likes: 좋아하는 활동 카테고리 / dislikes: 싫어하는 것 /
   *   overloadDislike: 특정 활동이 아니라 **무리한 일정(3활동)** 자체를 싫어함(여린).
   */
  preferences: { likes: PrefCategory[]; dislikes: PrefCategory[]; overloadDislike?: boolean }
}

/** 기본(균형) 시작값 — config.INITIAL_STATS 와 같아야 한다. 재분배의 기준. */
const BALANCED: Stats = { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 }
const BASE_TRUST = 20

export const DEFAULT_TEMPERAMENT_ID = 'balanced'

export const TEMPERAMENTS: Temperament[] = [
  {
    id: 'balanced',
    name: '균형',
    epithet: '또래처럼',
    line: '남달리 뛰어나지도, 뒤처지지도 않은 아이였다. 무엇이든 될 수 있었다.',
    stats: { ...BALANCED },
    tutorTrust: BASE_TRUST,
    up: [],
    down: [],
    // 균형은 고정 편향이 없다 — wish 가 매달 전 수업에서 돈다(LESSON_CATEGORIES).
    preferences: { likes: [], dislikes: [] },
  },
  {
    id: 'bright',
    name: '영민',
    epithet: '문약형',
    line: '영민하나 몸이 여린 아이였다. 글은 빨랐고, 검은 늘 무거워했다.',
    // 통치·변론↑ / 무예·궁정·재정↓ (총 41)
    stats: { statecraft: 16, finance: 6, rhetoric: 13, martial: 3, courtcraft: 3 },
    tutorTrust: BASE_TRUST,
    up: ['statecraft', 'rhetoric'],
    down: ['martial', 'courtcraft'],
    preferences: { likes: ['통치학', '변론'], dislikes: ['무예'] },
  },
  {
    id: 'robust',
    name: '강건',
    epithet: '무인형',
    line: '또래보다 몸이 먼저 자란 아이였다. 말 위가 책상보다 편하다 했다.',
    // 무예↑ / 재정·궁정↓ (총 41)
    stats: { statecraft: 13, finance: 4, rhetoric: 10, martial: 13, courtcraft: 1 },
    tutorTrust: BASE_TRUST,
    up: ['martial'],
    down: ['finance', 'courtcraft'],
    preferences: { likes: ['무예', '사냥'], dislikes: ['통치학', '변론'] },
  },
  {
    id: 'cunning',
    name: '영악',
    epithet: '모사형',
    line: '일찍 사람을 읽을 줄 아는 아이였다. 누가 무엇을 원하는지 먼저 알았다.',
    // 궁정·재정↑ / 통치↓ (총 41)
    stats: { statecraft: 5, finance: 12, rhetoric: 7, martial: 6, courtcraft: 11 },
    tutorTrust: BASE_TRUST,
    up: ['courtcraft', 'finance'],
    down: ['statecraft'],
    // 좋아하는 건 있되 딱히 싫어하는 게 없는 성격.
    preferences: { likes: ['궁정처세', '정무'], dislikes: [] },
  },
  {
    id: 'tender',
    name: '여린',
    epithet: '관계형',
    line: '마음이 여려 곁을 많이 타는 아이였다. 능력은 더디 여물어도, 사람은 붙들 줄 알았다.',
    // 전반 살짝 낮게(총 38, −3) + 튜터 신뢰↑(30)
    stats: { statecraft: 11, finance: 8, rhetoric: 9, martial: 6, courtcraft: 4 },
    tutorTrust: 30,
    up: [],
    down: ['statecraft', 'rhetoric', 'courtcraft'],
    trustUp: true,
    // ★ 특정 활동이 아니라 강도를 싫어한다 — 무리한 일정(3활동)이 비선호. 여린의 성격과 맞다.
    preferences: { likes: ['휴식', '놀이'], dislikes: [], overloadDislike: true },
  },
]

export const TEMPERAMENT_BY_ID: Record<string, Temperament> = Object.fromEntries(
  TEMPERAMENTS.map((t) => [t.id, t]),
)

/** 이 기질을 골랐다는 flag 이름. */
export const temperamentFlag = (id: string): string => `temperament_${id}`

/** 성별 무관 — 지금은 성별로 갈리지 않지만, (다) 확장 대비 시그니처만 열어 둔다. */
export function temperamentLine(t: Temperament, _gender: Gender): string {
  return t.line
}
