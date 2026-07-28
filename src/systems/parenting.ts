import type { GameState } from '../types/game'
import { ACTIVITY_BY_ID } from '../data/activities'
import {
  LESSON_CATEGORIES, TEMPERAMENTS, TEMPERAMENT_BY_ID, temperamentFlag,
  type PrefCategory, type Temperament,
} from '../data/temperaments'

/**
 * 아이를 살피는 층 ([2]) — 신뢰 선호 + 심신 상태.
 *
 * ★ 신뢰는 "이 아이가 원하는 걸 해줬는가"(선호 일치)로 오른다 — 관계 지표가 진짜 관계가 된다.
 * ★ 심신 상태(피로/감기/병)는 wellbeing 밴드에서 파생한다(파탄만 strain). 새 지표 0.
 * ★ 기질이 기본 성향을 정하고, 매달 그 안에서 "이번 달 원하는 것"(wish)이 정해진다.
 */

// ── 신뢰 델타 ──
export const TRUST_WISH = 4
export const TRUST_LIKE = 2
export const TRUST_DISLIKE = 1

// ── 심신 상태 임계(wellbeing 밴드) — 파탄만 strain(risk.ts). ──
export const COLD_WELLBEING = 20 // 감기: 학습 ×COLD_LEARN + 경고
export const ILL_WELLBEING = 8 // 병: 심신 바닥 → 강제 휴식 1달
export const COLD_LEARN = 0.8 // 감기 때 성장 효율
export const ILL_RECOVER = 24 // 강제 휴식 한 달의 회복량(바닥<8 → ~32, 감기선 위로)
/**
 * ★ 병이 파탄(strain)의 **차단기**가 되는 문턱. 파탄(strain≥12) 전에 앓아눕혀(강제 휴식)
 *   회복·리셋시켜 파탄으로 직행하지 않게 한다. "가혹하되 좌절 아닌" — 신뢰가 낮아 파탄을
 *   회피 못 하는 플레이(선호 무시)도 병이 먼저 잡아 데드로 강제되지 않는다.
 */
export const ILL_STRAIN = 8

/** 이 게임의 기질(없으면 균형). CutsceneScreen 로컬 함수를 공용으로 승격. */
export function currentTemperament(game: GameState): Temperament {
  const t = TEMPERAMENTS.find((x) => game.flags[temperamentFlag(x.id)])
  return t ?? TEMPERAMENT_BY_ID.balanced
}

/** 절대 월 인덱스(로테이션·결정론 파생용). */
function monthIndex(game: GameState): number {
  return game.date.year * 12 + game.date.month
}

/**
 * ★ 이번 달 이 아이가 원하는 것(wish) — likes 를 월 로테이션.
 *   균형은 고정 편향이 없어 전 수업 풀(LESSON_CATEGORIES)에서 매달 다른 것을 원한다.
 *   무상태·결정론(date+기질 파생).
 */
export function monthlyWish(game: GameState): PrefCategory {
  const t = currentTemperament(game)
  const pool = t.preferences.likes.length ? t.preferences.likes : LESSON_CATEGORIES
  return pool[monthIndex(game) % pool.length]
}

export type PrefRelation = 'wish' | 'like' | 'dislike' | 'neutral'

/** 활동 하나와 이 아이의 관계(이번 달 wish 기준). */
export function prefRelation(pref: string | undefined, game: GameState, wish: PrefCategory): PrefRelation {
  if (!pref) return 'neutral'
  if (pref === wish) return 'wish'
  const t = currentTemperament(game)
  if (t.preferences.likes.includes(pref as PrefCategory)) return 'like'
  if (t.preferences.dislikes.includes(pref as PrefCategory)) return 'dislike'
  return 'neutral'
}

/**
 * ★ 이번 달 활동들이 이 아이가 원하는 걸 해줬는지로 신뢰 변화를 계산한다.
 *   wish +4 · like +2 · dislike −1 · 무관 0 · (여린) 3활동 무리 자체가 −1.
 *   rest 의 baseline +1(돌보는 행위)은 활동 효과에 그대로 남아 여기서 세지 않는다.
 */
export function preferenceTrust(activityIds: string[], game: GameState): number {
  const wish = monthlyWish(game)
  const t = currentTemperament(game)
  let delta = 0
  for (const id of activityIds) {
    const rel = prefRelation(ACTIVITY_BY_ID[id]?.pref, game, wish)
    if (rel === 'wish') delta += TRUST_WISH
    else if (rel === 'like') delta += TRUST_LIKE
    else if (rel === 'dislike') delta -= TRUST_DISLIKE
  }
  // 여린: 특정 활동이 아니라 무리한 일정(3활동) 자체가 비선호.
  if (t.preferences.overloadDislike && activityIds.length >= 3) delta -= TRUST_DISLIKE
  return delta
}

/** ★ 스케줄 한 줄 — 이번 달 wish 를 수치 없이 결로만 알린다(플레이어가 해석). */
const WISH_HINT: Record<PrefCategory, string> = {
  통치학: '요즘 이 아이는 책에서 눈을 떼지 않는다.',
  변론: '요즘 이 아이는 말끝마다 되묻는다 — 무언가 겨루고 싶은 눈치다.',
  무예: '몸이 근질거리는지 자꾸 마당으로 눈이 간다.',
  재정: '요즘 이 아이는 숫자 적힌 것을 오래 들여다본다.',
  궁정처세: '사람들 오가는 자리를 유심히 살핀다.',
  사냥: '바깥바람을 쐬고 싶은 얼굴이다.',
  정무: '어른들이 무슨 이야기를 하는지 자꾸 귀를 기울인다.',
  휴식: '부쩍 지쳐 보인다 — 좀 쉬고 싶은 눈치다.',
  놀이: '요즘 통 웃지를 않는다 — 아이답게 놀고 싶은 모양이다.',
}
export function wishHint(game: GameState): string {
  return WISH_HINT[monthlyWish(game)]
}

/**
 * ★ 심신 상태(피로/감기/병) — wellbeing 밴드에서 파생. 파탄(strain 누적)은 여기서 안 본다.
 *   "지금 얼마나 나쁜가"(밴드) vs "얼마나 오래 나빴나"(파탄)의 구분.
 */
export type WellbeingState = 'normal' | 'fatigue' | 'cold' | 'ill'
export function wellbeingState(wellbeing: number): WellbeingState {
  if (wellbeing < ILL_WELLBEING) return 'ill'
  if (wellbeing < COLD_WELLBEING) return 'cold'
  if (wellbeing < 40) return 'fatigue'
  return 'normal'
}
