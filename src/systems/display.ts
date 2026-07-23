import { ENDING_THRESHOLDS } from './ending'
import { LESSON_TIER_MIN } from '../data/activities'
import { GAME_CONFIG, DURABILITY } from '../data/config'
import { RESOURCE_META, STAT_META } from '../data/stats'
import type { Effect, GameState, ResourceKey, StatKey } from '../types/game'

/**
 * ★ 표시 방식 (UI 리디자인 1단계, 실플레이 피드백 #8·#9).
 *
 * 화면에는 **수치를 내보내지 않는다.** 게이지는 질적 라벨로, 효과는 ▲▼ + 정도로 보여준다.
 * 정확한 값은 사이드바의 "상세(내부값)" 접이식에만 남긴다.
 *
 * ★ 이 파일의 요점은 **구간 경계를 시스템 문턱에 못 박는다**는 것이다.
 *   라벨이 임의로 5등분돼 있으면 플레이어가 오판한다 — 특히 국정 영향도는 엔딩의 주축이라
 *   "저울이 맞음"으로 바뀌는 순간이 곧 공존 tier 진입이어야 한다. 그래서 경계값을
 *   지어내지 않고 ENDING_THRESHOLDS·GAME_CONFIG·DURABILITY·수업 등급에서 가져온다.
 *   그러면 라벨이 곧 시스템 설명이 되어, 수치를 감췄는데도 이해가 더 잘 된다.
 */

export interface Band {
  /** 이 구간의 하한(이상). */
  min: number
  label: string
  /** 위험을 알려야 하는 구간인지 — 화면이 붉게 표시한다. */
  peril?: boolean
}

/** 값에 해당하는 구간. 표는 오름차순으로 두고 뒤에서부터 찾는다. */
function bandOf(bands: Band[], value: number): Band {
  for (let i = bands.length - 1; i >= 0; i--) {
    if (value >= bands[i].min) return bands[i]
  }
  return bands[0]
}

/** 스탯 5종 공통. 경계 45·72 는 **수업 등급 문턱 그 자체**다(데이터에서 가져온다). */
const STAT_BANDS: Band[] = [
  { min: 0, label: '처음' },
  { min: 15, label: '익히는 중' },
  { min: LESSON_TIER_MIN.middle, label: '제법' },
  { min: LESSON_TIER_MIN.high, label: '능함' },
  { min: 90, label: '통달' },
]

const RESOURCE_BANDS: Record<Exclude<ResourceKey, 'actionPoints'>, Band[]> = {
  /**
   * ★ 국정 영향도 — 경계가 곧 엔딩 tier 경계다.
   *   20 미만 = 허수아비:완전 / 45 = 공존 진입 / 70 = 친정 진입.
   */
  courtInfluence: [
    { min: 0, label: '이름뿐' },
    { min: ENDING_THRESHOLDS.puppetTotal, label: '미미함' },
    { min: ENDING_THRESHOLDS.coexist, label: '저울이 맞음' },
    { min: ENDING_THRESHOLDS.autonomy, label: '국정을 쥠' },
  ],
  /**
   * 심신 — 12 미만은 위험 누적(RISK.strainDanger), 25 는 경고선,
   * 55 부터 내구도가 쌓인다(DURABILITY.MANAGE_THRESHOLD). "안정적"이 곧 그릇이 자라는 선.
   */
  wellbeing: [
    { min: 0, label: '위태로움', peril: true },
    { min: 12, label: '지쳤음', peril: true },
    { min: GAME_CONFIG.wellbeingWarning, label: '버틸 만함' },
    { min: DURABILITY.MANAGE_THRESHOLD, label: '안정적' },
    { min: 80, label: '생기 있음' },
  ],
  /** 스승 신뢰 — 50 은 「쓰러진 아침 → 요양한다」가 열리는 선. */
  tutorTrust: [
    { min: 0, label: '서먹함' },
    { min: 25, label: '따름' },
    { min: 50, label: '두터움' },
    { min: 75, label: '온전히 맡김' },
  ],
  /** 섭정 신망 — 50 은 「섭정공과의 담판」(회유 루트)이 열리는 선. */
  regentRapport: [
    { min: 0, label: '아이로만 봄' },
    { min: 20, label: '가늠함' },
    { min: 50, label: '인정함' },
    { min: 75, label: '동렬로 대함' },
  ],
  /** 섭정 의심 — 60 은 경고 이벤트 발동선, 100 은 무방비 위험 누적선. */
  regentSuspicion: [
    { min: 0, label: '무심함' },
    { min: 20, label: '지켜봄' },
    { min: 40, label: '눈여겨봄' },
    { min: GAME_CONFIG.regentSuspicionWarning, label: '경계함', peril: true },
    { min: 90, label: '노려봄', peril: true },
  ],
}

/** 스탯은 다섯이 같은 구간표를 쓴다(등급 문턱이 스탯별로 다르지 않으므로). */
export function statBand(value: number): Band {
  return bandOf(STAT_BANDS, value)
}

export function resourceBand(key: ResourceKey, value: number): Band {
  const bands = RESOURCE_BANDS[key as keyof typeof RESOURCE_BANDS]
  if (!bands) return { min: 0, label: String(Math.round(value)) }
  return bandOf(bands, value)
}

/**
 * ★ 경고 칩 문구 — **구간 어휘를 그대로 쓴다.**
 *
 *   예전 칩은 "심신이 바닥났습니다"였는데 같은 화면의 게이지는 "지쳤음"이라, 한 값을
 *   두 어휘로 말하고 있었다(심신 21). 문턱도 서로 달라서(칩은 ≤25, 구간은 <25)
 *   경계에서 어긋났다. 이제 칩은 **peril 구간에서만** 뜨고, 문구도 그 구간 이름에서 나온다.
 */
const PERIL_NOTICE: Record<string, string> = {
  위태로움: '심신이 위태롭습니다',
  지쳤음: '심신이 지쳤습니다',
  경계함: '섭정이 경계하고 있습니다',
  노려봄: '섭정이 노려보고 있습니다',
}

export function perilNotice(key: ResourceKey, value: number): string | null {
  const band = resourceBand(key, value)
  if (!band.peril) return null
  return PERIL_NOTICE[band.label] ?? null
}

/** 게이지 하나를 그리는 데 필요한 것 전부 — 화면은 이것만 받는다. */
export interface GaugeView {
  /** 하네스 훅(data-gauge)에 쓰는 키. */
  key: string
  label: string
  /** 정확한 값 — 화면에 글자로 내보내지 않고 data-value 로만 심는다. */
  value: number
  band: Band
  /** 0~100 채움 비율. */
  pct: number
  /** 막대 색(토큰 CSS 색). */
  color: string
  /** 지금 나이에 닿을 수 있는 한계(0~100). 막대 위에 금으로 그린다. */
  capPct?: number
}

const STAT_COLOR: Record<StatKey, string> = {
  statecraft: 'var(--color-gold-400)',
  finance: '#7fae86',
  rhetoric: '#6f97c4',
  martial: '#c46f6f',
  courtcraft: '#9a7fc4',
}

const RESOURCE_COLOR: Partial<Record<ResourceKey, string>> = {
  courtInfluence: 'var(--color-gold-400)',
  wellbeing: '#6fb0a8',
  tutorTrust: 'var(--color-gold-300)',
  regentRapport: '#8f9ac4',
  regentSuspicion: 'var(--color-peril)',
}

export function statGauge(key: StatKey, state: GameState): GaugeView {
  const value = state.stats[key]
  return {
    key,
    label: STAT_META[key].label,
    value,
    band: statBand(value),
    pct: Math.max(0, Math.min(100, (value / GAME_CONFIG.statMax) * 100)),
    color: STAT_COLOR[key],
  }
}

/**
 * cap 은 **막대 길이를 줄이는 데 쓰지 않는다** — 지금 나이의 한계선을 그리는 데만 쓴다.
 * 막대는 항상 0~100 절대 눈금이라 라벨(구간)과 어긋나지 않는다.
 */
export function resourceGauge(key: ResourceKey, state: GameState, cap?: number): GaugeView {
  const value = state[key] as number
  return {
    key,
    label: RESOURCE_META[key].label,
    value,
    band: resourceBand(key, value),
    pct: Math.max(0, Math.min(100, value)),
    color: RESOURCE_COLOR[key] ?? 'var(--color-gold-400)',
    ...(cap !== undefined ? { capPct: Math.max(0, Math.min(100, cap)) } : {}),
  }
}

/**
 * ★ 효과 표기 — 수치 대신 ▲▼ + 정도.
 *
 * 기준을 둘만 둔다(스탯 / 자원). 복잡하면 못 읽는다.
 *   스탯(월 환산): <1.5 소폭 · <3 보통 · 그 이상 큼
 *     → 수업 등급의 실이득 1.0 / 2.0 / 3.4 와 **1:1로 떨어진다.**
 *       "▲통치학 소폭"이 곧 초급, "큼"이 곧 고급이다.
 *   자원(스케일 없음): <5 소폭 · <12 보통 · 그 이상 큼
 */
export type Magnitude = '소폭' | '보통' | '큼'

export function magnitudeOf(effect: Effect, scale = 1): Magnitude {
  const isStat = effect.target.kind === 'stat'
  const amount = Math.abs(effect.amount * (isStat ? scale : 1))
  const [small, medium] = isStat ? [1.5, 3] : [5, 12]
  if (amount < small) return '소폭'
  if (amount < medium) return '보통'
  return '큼'
}

export interface EffectView {
  /** ▲ 또는 ▼ — 값의 부호 그대로(의미의 좋고 나쁨이 아니라). */
  arrow: '▲' | '▼'
  label: string
  magnitude: Magnitude
  /**
   * 이 변화가 군주에게 이로운가. 의심만 반대다 — 오르는 게 나쁘다.
   * 색을 정하는 데 쓴다.
   */
  good: boolean
}

export function effectView(effect: Effect, scale = 1): EffectView {
  const up = effect.amount > 0
  const isSuspicion =
    effect.target.kind === 'resource' && effect.target.key === 'regentSuspicion'
  return {
    arrow: up ? '▲' : '▼',
    label:
      effect.target.kind === 'stat'
        ? STAT_META[effect.target.key].label
        : effect.target.kind === 'resource'
          ? RESOURCE_META[effect.target.key].label
          : '',
    magnitude: magnitudeOf(effect, scale),
    good: isSuspicion ? !up : up,
  }
}

/**
 * ★ 결과 델타도 같은 규칙으로 (턴 결과·이벤트 후일담).
 *
 *   여태 결과 화면은 "+0.6" 같은 소수를 그대로 뱉었다. 활동 카드는 "소폭"이라 해 놓고
 *   결과는 숫자를 보여주면 같은 화면 안에서 두 어법이 싸운다. Delta 는 라벨만 갖고 있으므로
 *   스탯 라벨 목록으로 종류를 되짚어 같은 기준을 적용한다.
 */
const STAT_LABELS = new Set(Object.values(STAT_META).map((m) => m.label))

export function deltaView(delta: { label: string; amount: number }): EffectView {
  const isStat = STAT_LABELS.has(delta.label)
  const amount = Math.abs(delta.amount)
  const [small, medium] = isStat ? [1.5, 3] : [5, 12]
  return {
    arrow: delta.amount > 0 ? '▲' : '▼',
    label: delta.label,
    magnitude: amount < small ? '소폭' : amount < medium ? '보통' : '큼',
    good: delta.label === RESOURCE_META.regentSuspicion.label ? delta.amount < 0 : delta.amount > 0,
  }
}

/**
 * 수업 등급을 별 개수로. 등급이 자동 전환되므로 별도 자동으로 따라간다
 * (난이도를 데이터에 따로 적지 않는다 — 두 곳에 적으면 어긋난다).
 *   등급 없는 활동은 AP 비용을 난이도로 읽는다.
 */
export function difficultyStars(tierLabel: string | null, apCost: number): number {
  if (tierLabel === '초급') return 2
  if (tierLabel === '중급') return 3
  if (tierLabel === '고급') return 5
  return apCost >= 2 ? 4 : 1
}
