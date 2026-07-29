import { RISK } from '../data/config'
import type { GameState } from '../types/game'
import { isPostAutonomy, RISK_REBELLION, STANDING_STRONG } from './rebellion'

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
/**
 * ★ 튜터 해고 위험 — "섭정공이 이 가정교사를 얼마나 위험하게 보는가". 숨은 누적기.
 *   strain·exposure 와 달리 **상태 조건이 아니라 사건이 값을 넣는다**(외출 발각·흔적).
 *   여러 경로가 여기에 붙을 수 있게 열어 두되, 이번 라운드는 외출만 실제로 쌓는다.
 */
export const RISK_TUTOR = '__risk:tutor'

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

  // ── 의심 무방비 (★ [3] 친정 전에만 — 친정 후엔 같은 게이지가 '반란 모의'가 되어 아래 축이 대신 읽는다)
  const exposure = counters[RISK_EXPOSURE] ?? 0
  if ((state.regentSuspicion ?? 0) >= RISK.exposureSuspicion && !isDefended(state) && !isPostAutonomy(state)) {
    patch[RISK_EXPOSURE] = exposure + 1
  } else if (exposure !== 0) {
    patch[RISK_EXPOSURE] = 0
  }

  // ── 반란 모의 (★ [3] 친정 후) — 같은 의심 게이지가 반란 모의가 된다. 밀려난 섭정공의 반격.
  //   의심을 높게(≥rebellionSuspicion) 오래 방치하면 실제 반란으로 번진다. 의심이 내리면 리셋.
  //   ★ 권세가 강하면(조정이 왕 편) 반란이 힘을 못 얻어 문턱이 높아진다 — 느리게 끓는다.
  const rebellion = counters[RISK_REBELLION] ?? 0
  const rebellionThreshold =
    RISK.rebellionSuspicion + ((state.courtStanding ?? 0) >= STANDING_STRONG ? RISK.rebellionStandingGuard : 0)
  if (isPostAutonomy(state) && (state.regentSuspicion ?? 0) >= rebellionThreshold) {
    patch[RISK_REBELLION] = rebellion + 1
  } else if (rebellion !== 0) {
    patch[RISK_REBELLION] = 0
  }

  // ── 튜터 해고 (__risk:tutor)
  // ★ 이 라운드의 누적원은 **외출 발각**뿐이고, 그건 이벤트(effects 의 counter)가 직접 넣는다.
  //   여기(상태 기반 누적)에는 **나머지 경로의 자리만** 열어 둔다 — 값은 0(아직 안 켠다):
  //     · 밀서 등 위험 활동 반복    · 섭정 의심이 장기간 높게 유지
  //     · 왕에게 급진적인 것을 가르침 · 진실 추적이 들킴
  //   좁게 만든 걸 넓히는 것보다, 붙일 자리를 먼저 두는 편이 싸다. 켤 때 여기 한 줄씩 더한다.

  return patch
}
