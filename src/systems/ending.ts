import { CHARACTERS } from '../data/characters'
import type { EndingDisposal, EndingResult, EndingTier, EndingTruth, GameState } from '../types/game'

/**
 * 엔딩 판정 (M3-1).
 *
 * ★★ 이 함수는 **전함수(total function)** 다. 어떤 세이브를 넣어도 정확히 하나의
 *    EndingResult 를 돌려준다. "엔딩 없음"이 원리적으로 불가능한 이유는
 *    분기 사슬이 전부 catch-all 로 끝나기 때문이다:
 *
 *      tier      : 배드 3종 → 친정 → 공존 → (나머지 전부) 허수아비
 *      disposal  : 정당 → 폭군 → 회유 → (나머지 전부) 못함
 *
 *    허수아비와 '못함'은 조건이 아니라 **나머지**다. 조건을 가진 분기가 하나도
 *    안 걸리는 상태가 곧 그 결과다. (verify:ending A절이 무작위 1만 세이브로 확인한다)
 *
 * ★ 난수를 쓰지 않는다. 같은 세이브는 항상 같은 엔딩이다.
 * ★ AI 와 무관하다. 엔딩은 전적으로 코드 소유다.
 */

// ── 임계값. 한곳에 모아 두어 조정이 쉽도록 한다.
export const ENDING_THRESHOLDS = {
  /** 친정 — 국정을 실제로 장악했다고 볼 선. */
  autonomy: 70,
  /** 공존 — 섭정과 저울이 맞는 구간의 아래 끝. */
  coexist: 45,
  /** 허수아비 중에서도 아무것도 못 쥔 상태. */
  puppetTotal: 20,

  /** 군부에 먹히지 않으려면 필요한 실권. */
  juntaSafe: 70,
  /** 군부 유예 — 아슬아슬하게 눌러 앉힌다. */
  juntaReprieve: 55,

  /** 대등한 결합에 필요한 국력. */
  unionEqual: 140,
  /** 결합 유예 — 협상으로 대등을 끌어낸다. */
  unionReprieve: 120,

  /** 독을 알아채는 데 필요한 심신 또는 궁정처세. */
  poisonReprieveWellbeing: 60,
  poisonReprieveCourtcraft: 60,

  /** 불신의 공치 — 동맹인데 서로 못 믿는 선. */
  distrust: 60,

  /** 두루마리(정통성)가 국력에 보태는 양. */
  scrollPower: 10,
} as const

const flag = (state: GameState, name: string): boolean => state.flags?.[name] === true

/**
 * 국력 — 결합 판정의 저울.
 * 재정·무예는 나라의 실체이고, 국정 영향도는 그것을 실제로 쓸 수 있는지다.
 */
export function nationalPower(state: GameState): number {
  return (
    (state.stats?.finance ?? 0) +
    (state.stats?.martial ?? 0) +
    (state.courtInfluence ?? 0) +
    (flag(state, 'scroll_offered') ? ENDING_THRESHOLDS.scrollPower : 0)
  )
}

interface BadCandidate {
  tier: EndingTier
  /** 유예 게이트를 통과하는가. */
  canReprieve: boolean
  /** 유예에 성공했을 때 얻는 나라 향방 flag. */
  reprieveGrants: string | null
  label: string
}

/** 배드 후보를 **고정된 순서로** 모은다. 순서가 곧 유예의 우선순위다. */
function badCandidates(state: GameState, power: number): BadCandidate[] {
  const T = ENDING_THRESHOLDS
  const out: BadCandidate[] = []

  if (flag(state, 'queen_poison_path') && !flag(state, 'queen_poison_averted')) {
    out.push({
      tier: '배드:꼭두각시',
      canReprieve:
        (state.wellbeing ?? 0) >= T.poisonReprieveWellbeing ||
        (state.stats?.courtcraft ?? 0) >= T.poisonReprieveCourtcraft,
      reprieveGrants: null,
      label: '모후의 약',
    })
  }

  if (flag(state, 'military_route_open') && (state.courtInfluence ?? 0) < T.juntaSafe) {
    out.push({
      tier: '배드:군부종속',
      canReprieve: (state.courtInfluence ?? 0) >= T.juntaReprieve,
      reprieveGrants: 'military_king_led',
      label: '군부',
    })
  }

  if (flag(state, 'union_possible') && power < T.unionEqual) {
    out.push({
      tier: '배드:제국복속',
      canReprieve: power >= T.unionReprieve,
      reprieveGrants: 'union_equal',
      label: '제국',
    })
  }

  return out
}

function tierOf(influence: number): EndingTier {
  const T = ENDING_THRESHOLDS
  if (influence >= T.autonomy) return '친정'
  if (influence >= T.coexist) return '공존'
  return '허수아비' // ← catch-all. 조건이 아니라 나머지다.
}

/**
 * 처분 경로.
 *
 * ★ '정당'은 **실제로 처분했을 때만** 성립한다(`just_purge`).
 *   진실과 확증을 손에 쥐고도 숙부를 그대로 둔 군주는 처분한 것이 아니다 —
 *   그건 '못함'이다. 처음에는 진실+확증 조건만 보고 판정했는데, 시뮬 H 빌드가
 *   「그대로 둔다」를 고르고도 '정당'으로 기록되면서 이 구멍이 드러났다.
 *   (단위 테스트는 flag 만 세워서 이걸 못 잡았다 — 실제 플레이가 잡았다)
 */
function disposalOf(state: GameState): EndingDisposal {
  if (flag(state, 'just_purge')) return '정당'
  if (flag(state, 'tyrant_purge')) return '폭군'
  if (flag(state, 'regent_alliance')) return '회유'
  return '못함' // ← catch-all
}

function truthOf(state: GameState): EndingTruth {
  if (flag(state, 'truth_mother_mastermind')) return '모후주모'
  if (flag(state, 'truth_regent_involved')) return '섭정관여'
  return '모름'
}

/**
 * 확정된 로맨스 하나. 하드 배타성(결정적 씬)에서 romance_confirmed:<id> 가
 * 최대 하나만 참이므로(romance_settled 마스터 게이트가 보장), 스캔이 아니라 조회다.
 *
 * ★ 예전엔 "깊은 관계 중 최고치"(여러 명 가능)였다. 하드 배타성으로 바뀌면서
 *   확정 flag 를 읽는다 — 호감도 70 을 넘겨도 결정적 씬을 수락해야 확정이다.
 */
function romanceOf(state: GameState): { charId: string | 'none' } {
  const confirmed = CHARACTERS.find((c) => flag(state, `romance_confirmed:${c.id}`))
  return { charId: confirmed?.id ?? 'none' }
}

/** 실행된 숙청의 수. 엔딩 수식이 조합으로 읽는다. */
function purgeCount(state: GameState): number {
  return ['heir_executed', 'loyalist_scapegoat', 'hero_isolated', 'commander_purged'].filter(
    (f) => flag(state, f),
  ).length
}

export function judgeEnding(state: GameState): EndingResult {
  const T = ENDING_THRESHOLDS
  const power = nationalPower(state)
  const influence = state.courtInfluence ?? 0
  const romance = romanceOf(state)
  const truthLevel = truthOf(state)

  // ── 1~2단계. 배드 후보와 유예(총 1회).
  const candidates = badCandidates(state, power)
  let reprieve: EndingResult['reprieve'] = { used: false, from: null }
  const granted: string[] = []
  const survived: BadCandidate[] = []

  for (const candidate of candidates) {
    if (!reprieve.used && candidate.canReprieve) {
      reprieve = { used: true, from: candidate.label }
      if (candidate.reprieveGrants) granted.push(candidate.reprieveGrants)
      continue
    }
    survived.push(candidate)
  }

  // ── 나라 향방. 유예로 얻은 것 + 애초에 위기가 아니었던 것.
  const nationFlags: string[] = [...granted]
  if (flag(state, 'military_route_open') && influence >= T.juntaSafe) {
    nationFlags.push('military_king_led')
  }
  if (flag(state, 'union_possible') && power >= T.unionEqual) {
    nationFlags.push('union_equal')
  }
  for (const name of [
    'house_commons_defended',
    'house_commons_dissolved',
    'scroll_offered',
    'legitimacy_sacred',
    'church_support',
    // 숙청/관용 결과 — 엔딩 @purge 삽입이 개별로 읽는다.
    'heir_executed', 'heir_spared',
    'loyalist_scapegoat', 'loyalist_spared',
    'hero_isolated', 'hero_spared',
    'commander_purged', 'commander_spared',
  ]) {
    if (flag(state, name)) nationFlags.push(name)
  }

  // ── 3단계. 실권 구간 — 단 배드가 살아남았으면 그것이 tier 다.
  const tier: EndingTier = survived.length > 0 ? survived[0].tier : tierOf(influence)

  // ── 4단계. 처분 경로.
  const disposal = disposalOf(state)

  // ── 5단계. 수식. 배타가 아니라 수집이다.
  const modifiers: string[] = []
  if (influence <= T.puppetTotal && tier === '허수아비') modifiers.push('허수아비:완전')
  // ★ 폭군은 새 지표가 아니다 — 행동의 결과 flag × 기존 값의 조합이다.
  if (flag(state, 'tyrant_purge') && influence >= T.autonomy && !flag(state, 'regent_alliance')) {
    modifiers.push('폭정')
  }
  if (flag(state, 'tyrant_purge') && romance.charId === 'none') modifiers.push('고립')
  if (flag(state, 'regent_alliance') && (state.regentSuspicion ?? 0) >= T.distrust) {
    modifiers.push('불신의 공치')
  }
  if (flag(state, 'blood_oath_given')) modifiers.push('연인의 희생')
  if (flag(state, 'blood_oath_seized')) modifiers.push('정복의 전리품')
  if (flag(state, 'queen_poison_averted')) modifiers.push('독을 알아챘다')

  // ★ 숙청 수식 — 새 지표 없이 실행된 숙청의 수로 조합한다.
  const purges = purgeCount(state)
  if (purges >= 2) modifiers.push('청산')
  if (purges >= 2 && romance.charId === 'none') modifiers.push('고독한 옥좌')
  if (purges >= 1 && flag(state, 'tyrant_purge')) modifiers.push('피 묻은 손')

  return {
    tier,
    disposal,
    truthLevel,
    romance: romance.charId,
    nationFlags,
    modifiers,
    reprieve,
    power,
  }
}

/** 판정 결과를 한 줄로 — 검증과 디버깅에 쓴다. */
export function describeEnding(result: EndingResult): string {
  const parts: string[] = [result.tier, result.disposal, result.truthLevel]
  if (result.romance !== 'none') parts.push(`인연:${result.romance}`)
  if (result.modifiers.length) parts.push(`[${result.modifiers.join('·')}]`)
  return parts.join(' / ')
}
