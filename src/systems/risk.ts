import { RISK } from '../data/config'
import type { GameState } from '../types/game'

/**
 * 조기 데드엔딩 위험 누적 (월 단위 전환 2단계).
 *
 * ★ 두 축을 숨은 카운터로 쌓는다: `__risk:strain`(심신 파탄), `__risk:exposure`(의심 무방비).
 *   `__risk:` 접두사라 tickCounters 가 매 턴 깎지 않는다 — 이건 "남은 시간"이 아니라
 *   "쌓인 방치"라서다(pity 카운터와 같은 이유).
 *
 * ★ 원칙 "가혹하되 좌절 아닌": 위험은 **방치가 지속될 때만** 쌓이고, 회복하면 리셋된다.
 *   관리형 정상 플레이는 문턱(RISK.*Dead)에 닿지 않는다 — 문턱을 느슨하게(높게) 잡았다.
 *   경고(RISK.*Warn)가 데드(RISK.*Dead)보다 먼저 떠서 "몰라서 당한"이 아니게 한다.
 *
 * 상태를 직접 만지지 않고 counter 패치만 돌려준다 — turn.ts 한 곳에서만 쓰기가 일어나게.
 */

export const RISK_STRAIN = '__risk:strain'
export const RISK_EXPOSURE = '__risk:exposure'

const flag = (state: GameState, name: string): boolean => state.flags?.[name] === true

/** 의심에 대한 "대비"가 있는가 — 실권이 붙었거나, 혈서·동맹·군사노선 중 하나라도. */
function isDefended(state: GameState): boolean {
  return (
    (state.courtInfluence ?? 0) >= RISK.exposureDefendedInfluence ||
    flag(state, 'blood_oath_given') ||
    flag(state, 'blood_oath_seized') ||
    flag(state, 'regent_alliance') ||
    flag(state, 'military_route_open') ||
    flag(state, 'military_king_led')
  )
}

/**
 * 이번 턴이 끝난 상태(next)를 받아 위험 카운터 패치를 돌려준다.
 * turn.ts 가 심신·내구도·날짜를 이미 갱신한 뒤 호출한다.
 */
export function updateRisk(state: GameState): Record<string, number> {
  const counters = state.counters ?? {}
  const patch: Record<string, number> = {}

  // ── 심신 파탄
  const strain = counters[RISK_STRAIN] ?? 0
  if ((state.wellbeing ?? 100) < RISK.strainDanger) {
    const step = (state.durability ?? 0) < RISK.strainFragileDurability ? 2 : 1
    patch[RISK_STRAIN] = strain + step
  } else if ((state.wellbeing ?? 0) >= RISK.strainReset) {
    if (strain !== 0) patch[RISK_STRAIN] = 0
  }

  // ── 의심 무방비
  const exposure = counters[RISK_EXPOSURE] ?? 0
  if ((state.regentSuspicion ?? 0) >= RISK.exposureSuspicion && !isDefended(state)) {
    patch[RISK_EXPOSURE] = exposure + 1
  } else if (exposure !== 0) {
    patch[RISK_EXPOSURE] = 0
  }

  return patch
}
