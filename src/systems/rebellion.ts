import type { GameState } from '../types/game'
import { throneTier } from '../data/throne'

/**
 * 반란 모의 ([3] A) — 친정 이후의 긴장.
 *
 * ★ 새 지표를 만들지 않는다. 친정(친정 선포 + 영향도≥70) 이후 「섭정 의심」 게이지의
 *   **성격이 뒤집힌다**: 친정 전 = 섭정공이 왕을 경계(높으면 왕이 위험) / 친정 후 = 밀려난
 *   섭정공이 반격을 준비(반란 모의). 같은 게이지(regentSuspicion)를 그대로 읽는다.
 * ★ 모후 축(침실·모후의 약)은 의심을 안 읽으므로 전환과 무관하다.
 */

export const RISK_REBELLION = '__risk:rebellion'

/** ★ 친정 이후인가 — 「섭정 의심」이 「반란 모의」로 읽히는 국면. */
export function isPostAutonomy(game: GameState): boolean {
  return game.flags.declared_rule === true && throneTier(game.courtInfluence ?? 0) === 'autonomy'
}

/** 안도 민심 개수(백성이 왕 편인 정도) — 반란 진압 수단 하나. */
export function reliefCount(game: GameState): number {
  const f = game.flags
  return Object.keys(f).filter((k) => k.startsWith('people_relieved_') && f[k] === true).length
}

/** 민심이 왕을 받치는 문턱 — 이 이상이면 백성으로 반란을 누를 수 있다. */
export const PEOPLE_FAVOR_MIN = 2

/** 반란을 누를 수단을 하나라도 갖췄나 — 민심·군사·회유·하원·권세. (여럿 중 하나면 회피) */
export function hasRebellionMeans(game: GameState): boolean {
  const f = game.flags
  return (
    reliefCount(game) >= PEOPLE_FAVOR_MIN ||
    f.military_route_open === true ||
    f.military_king_led === true ||
    f.regent_alliance === true ||
    f.regent_retired === true ||
    f.house_commons_defended === true ||
    (game.courtStanding ?? 0) >= STANDING_STRONG
  )
}

/** 권세가 "조정을 쥔" 선 — 담판 판세의 한 축이자 반란 가담을 마르게 하는 문턱. */
export const STANDING_STRONG = 55
/** 신망이 담판 판세에 드는 선. */
export const RAPPORT_TIDE = 55

/**
 * ★ [3] 담판 판세 — 섭정공이 "버틸 수 없어" 물러나는 조건. 왕 개인의 힘이 아니라 판이 기울어야.
 *   새 지표 없이 기존 신호 넷을 조합한다. 각기 다른 플레이가 공존에 닿게(백성/궁정/제도 노선).
 *     · house_commons_defended — 하원 여론 (16세 방어의 뒤늦은 값)
 *     · people_favor — 민심 (안도 ≥ PEOPLE_FAVOR_MIN)
 *     · regentRapport ≥ RAPPORT_TIDE — 신망
 *     · courtStanding ≥ STANDING_STRONG — 권세(궁정 안 왕 편)
 */
export function tideSignals(game: GameState): number {
  const f = game.flags
  let n = 0
  if (f.house_commons_defended === true) n++
  if (reliefCount(game) >= PEOPLE_FAVOR_MIN) n++
  if ((game.regentRapport ?? 0) >= RAPPORT_TIDE) n++
  if ((game.courtStanding ?? 0) >= STANDING_STRONG) n++
  return n
}

/** 판이 기울었나 — 넷 중 둘 이상. 이 이상이면 담판에서 섭정공이 명예직을 받고 물러난다. */
export const TIDE_MIN = 2
export function tideHasTurned(game: GameState): boolean {
  return tideSignals(game) >= TIDE_MIN
}

/**
 * ★ [3] 권세 형세 — 숨은 수치를 질적 3단으로. 연회의 모브 귀족 태도와 「기록」의 '조정의 형세'가 읽는다.
 *   '높음'의 경계를 STANDING_STRONG(=판세 축)에 맞춰, 형세가 높으면 담판 판세에도 기여함이 드러난다.
 */
export type StandingMood = 'low' | 'mid' | 'high'
export function standingMood(game: GameState): StandingMood {
  const s = game.courtStanding ?? 0
  return s >= STANDING_STRONG ? 'high' : s >= 35 ? 'mid' : 'low'
}
