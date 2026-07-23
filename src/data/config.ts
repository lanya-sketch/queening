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
/**
 * ★ 밸런스 재설계: 1/3 → 1/5.
 *   1/3 에서는 균형 빌드조차 20세에 5스탯 합계 500(상한)을 채우고 남았다(실측 581).
 *   "무엇을 포기할까"가 구조적으로 없어 만능 군주가 나왔다. 목표는 20세 합계 250~300 —
 *   다섯 중 둘셋만 제대로 키우고 나머지는 포기해야 하는 상태.
 *
 *   ★ 1/4 로 낮춘 1차 실측이 여전히 균형 빌드 491(20세)이었다. 원인은 델타가 아니라
 *     **총 수업 칸이 너무 많다는 것**이었다(108개월에 212회). 칸을 그만큼 줄이는 건
 *     플레이를 비게 만들므로, 칸당 이득을 1/5 로 낮추고 등급 문턱을 올려
 *     "얇게 펴 바르면 평생 초급"이 되도록 했다. 실측은 tools/verify/balance.mjs.
 */
export const MONTH_SCALE = 1 / 5

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
  /**
   * ★ 밸런스 재설계: 0.02 → 0.033. durability 0 이면 심신 소모 ×(1+30×0.033)=×2.0.
   *   11세에 초급 수업 하나가 심신 −18 이 되어, 수업 둘(−36)은 휴식(+16)으로 못 메운다.
   *   "어린 몸으로는 한 달에 하나가 고작"이 규칙이 아니라 수지로 성립하게 만드는 손잡이.
   */
  COST_SLOPE: 0.033,
  /**
   * ★ 밸런스 재설계: 0.01 → 0.005.
   *   가속은 이제 **수업 등급**이 맡는다. 내구도까지 같은 일(성장 가속)을 크게 하면
   *   후반이 이중으로 폭주한다. 내구도는 "초반 혹독(COST_SLOPE)"과
   *   "잘 돌본 만큼의 보상"이라는 결만 남긴다.
   */
  GROWTH_SLOPE: 0.005,
  /** 초기값 — 나이 기본값(11세=0)에서 출발. */
  initial: 0,
} as const


/**
 * ★ 소소-비트 스케줄러 (월 단위 전환 2단계).
 *
 * 108턴에는 "빈 달"이 많다 — 큰 서사는 flag/나이로 흩어지지만 조용한 달이 이어진다.
 * 매 턴(빈 달에 한해) 한 번 굴려 소소 사건 하나를 채운다. 손 풀(키 없이도) vs AI 돌발.
 *   base       — 빈 달에 소소가 뜰 확률
 *   pity       — 연속 빈 달이 이만큼이면 다음 빈 달에 확정("2달에 1번" 보장)
 *   aiWeight   — 뜰 때 AI 돌발을 고를 기본 가중치(키 있을 때만; devBridge 가 조정)
 */
export const MINOR = {
  base: 0.35,
  pityGuarantee: 2,
  aiWeight: 0.35,
  /** 한 번 뜬 손 풀 사건은 이만큼의 달 동안 다시 안 뜬다(반복 방지). */
  poolCooldown: 8,
} as const

/**
 * ★ 조기 데드엔딩 위험 누적 (월 단위 전환 2단계).
 *
 * 두 축을 숨은 카운터(`__risk:*`, tickCounters 가 안 깎는다)로 쌓는다.
 * 느슨하게 잡는다 — 관리형 정상 플레이는 문턱에 닿지 않고, 방치·무방비만 닿는다.
 * 수치 정밀 조정은 밸런스 무르익은 후속. 지금은 구조와 "거의 안 터짐"이 목표.
 */
export const RISK = {
  // ★ 이 라운드는 **구조**만 세운다 — 문턱을 느슨하게(낮은 심신·깊은 방치에서만) 잡아
  //   "거의 안 터지게" 둔다. 통치학×2+휴식 같은 가벼운 무리로는 안 죽고, 심신을 바닥까지
  //   여러 달 방치해야 닿는다. 정밀 조정은 밸런스 무르익은 후속 라운드.
  /** 심신 파탄 — 심신이 이 아래(깊은 탈진)면 strain 이 쌓인다. */
  strainDanger: 12,
  /** 심신이 이 위로 회복되면 strain 리셋(방치가 끊겼다). */
  strainReset: 30,
  /** 내구도가 이 아래면(어릴 때) strain 이 두 배로 쌓인다. */
  strainFragileDurability: 20,
  /** 경고 서술이 뜨는 문턱. */
  strainWarn: 5,
  /** 데드엔딩 위기 이벤트가 뜨는 문턱(느슨하게 높게). */
  strainDead: 12,

  // ★ 의심(regentSuspicion) 최대치는 미스터리를 파는 정상 플레이의 **자연스러운 산물**이다
  //   (몰래 캘수록 경계가 오른다). 그래서 의심만으로는 죽지 않게 한다 — 경계가 **끝까지
  //   차오르고(100)** 실권도 거의 없고(무방비) 그 상태를 오래 방치했을 때에만 닿는다.
  //   궁정처세 특화(깊은 진실) 같은 정당한 조사 빌드는 의심 98 언저리라 문턱에 안 닿는다.
  /** 의심 무방비 — 경계도가 이 이상(끝까지)이고 대비가 없으면 exposure 가 쌓인다. */
  exposureSuspicion: 100,
  /** 실권이 이 이상이면 "대비 있음"으로 본다(무방비 아님). 낮게 잡아 어지간하면 방어로 친다. */
  exposureDefendedInfluence: 20,
  exposureWarn: 8,
  exposureDead: 15,
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

/**
 * ★ 나이별 상한 (밸런스 재설계) — 새 지표를 만들지 않고 기존 상한 방식만 재사용한다.
 *
 * 신뢰: 스승에 대한 믿음은 9년에 걸쳐 쌓이는 것이다. 13세에 90을 넘던 과속을 막는다.
 *   11세 20 → 13세 38 → 20세 101(=상한 100)
 */
export function tutorTrustCap(age: number): number {
  return Math.min(GAME_CONFIG.resourceMax, 20 + (age - GAME_CONFIG.startAge) * 9)
}

/**
 * 섭정 신망: 어린애를 통치자로 인정할 리 없다 — **15세 전에는 30에서 막힌다.**
 *   ~14세 30 → 15세 30 → 20세 100. 규칙이자 세계관.
 */
export function regentRapportCap(age: number): number {
  if (age < 15) return 30
  return Math.min(GAME_CONFIG.resourceMax, 30 + (age - 15) * 14)
}
