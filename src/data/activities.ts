import type { Activity, ActivityTier, Effect, StatKey } from '../types/game'

/**
 * 활동 추가는 이 배열에 객체 하나 넣는 것으로 끝난다.
 * tags 의 'independence' 는 "군주를 홀로 서게 하는" 계열 —
 * 성장 효율이 좋은 대신 섭정 의심도를 올린다.
 *
 * 표시 텍스트는 서양 중세 왕국 궁정 톤. 나중에 다른 세계관을 얹더라도
 * id / apCost / effects / requires 는 그대로 두고 이 문자열만 갈아끼우면 된다.
 *
 * ★ 밸런스 재설계 1단계 — 칸 경쟁.
 *   수업은 **등급 자동 전환**(초·중·고)이고, 등급이 오를수록 얻는 것도 심신·의심 대가도 커진다.
 *   공부는 섭정의 경계를 부른다(의심↑) → 놀이로 씻어야 하고, 그만큼 학습 칸이 줄어든다.
 *   "빨리 크되 의심받기 vs 숨죽여 안전하기"가 매달의 저울질이 된다.
 */
const stat = (key: StatKey, amount: number, variance?: number): Effect =>
  ({ target: { kind: 'stat', key }, amount, ...(variance ? { variance } : {}) })
const res = (key: 'wellbeing' | 'tutorTrust' | 'regentSuspicion' | 'regentRapport' | 'courtInfluence',
  amount: number): Effect => ({ target: { kind: 'resource', key }, amount })

/**
 * 수업 3등급 공통 틀. 스탯이 오를수록 같은 카드가 강해지고 비싸진다.
 *   초급 <45 : +5  / 심신 −9  / 의심 +1
 *   중급 45~: +10 / 심신 −12 / 의심 +2
 *   고급 72~: +17 / 심신 −17 / 의심 +4
 *
 * ★ 문턱(45·72)이 높고 초급 이득이 낮은 게 이 표의 요점이다. 다섯 스탯에 얇게 펴 바르면
 *   어느 것도 45 에 늦게야 닿아 9년의 대부분을 초급으로 보내고, 밀어준 스탯만 복리를 받는다.
 *   벌이 아니라 특화에 대한 보상이라, 균형 육성은 스스로 비효율이 된다.
 *   (MONTH_SCALE 1/5 를 곱하면 칸당 실이득 1.0 / 2.0 / 3.4)
 *
 * sideEffect 는 "한쪽을 키우면 한쪽이 녹슨다"는 대비 쌍(#19)에만 붙인다.
 */
/**
 * ★ 등급 문턱은 여기가 단일 출처다.
 *   게이지 라벨(systems/display.ts)이 이 값을 가져다 쓴다 — 게이지가 "제법"으로 바뀌는
 *   순간이 카드가 "중급"으로 바뀌는 순간이어야 두 표시가 서로를 설명한다.
 *   양쪽에 숫자를 따로 적으면 언젠가 반드시 어긋난다.
 */
export const LESSON_TIER_MIN = { middle: 45, high: 72 } as const

function lessonTiers(key: StatKey, sideEffect?: Effect): ActivityTier[] {
  const side = sideEffect ? [sideEffect] : []
  return [
    { min: 0, label: '초급', effects: [stat(key, 5, 2), res('wellbeing', -9), res('regentSuspicion', 1), ...side] },
    { min: LESSON_TIER_MIN.middle, label: '중급', effects: [stat(key, 10, 3), res('wellbeing', -12), res('regentSuspicion', 2), ...side] },
    { min: LESSON_TIER_MIN.high, label: '고급', effects: [stat(key, 17, 4), res('wellbeing', -17), res('regentSuspicion', 4), ...side] },
  ]
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'lecture-statecraft',
    name: '통치학 수업',
    description: '역대 칙령과 선례를 함께 읽는다. 지루하지만 이것이 뼈대다.',
    apCost: 1,
    effects: [stat('statecraft', 5, 2), res('wellbeing', -9), res('regentSuspicion', 1)],
    tierStat: 'statecraft',
    tiers: lessonTiers('statecraft'),
    tags: ['study'],
  },
  {
    id: 'lecture-finance',
    name: '국고 장부 열람',
    description: '재무청의 장부를 직접 넘겨보게 한다. 숫자에 익숙해져야 속지 않는다.',
    apCost: 1,
    effects: [stat('finance', 5, 2), res('wellbeing', -9), res('regentSuspicion', 1)],
    tierStat: 'finance',
    tiers: lessonTiers('finance'),
    tags: ['study'],
  },
  {
    id: 'debate-practice',
    name: '문답 훈련',
    description: '반론을 던지고 되받게 한다. 어전 회의에서 말문이 막히면 끝이다.',
    apCost: 1,
    effects: [stat('rhetoric', 5, 2), res('wellbeing', -9), res('regentSuspicion', 1)],
    tierStat: 'rhetoric',
    tiers: lessonTiers('rhetoric', res('tutorTrust', 1)),
    tags: ['study'],
  },
  {
    id: 'sword-training',
    name: '검술 훈련',
    description: '기사를 붙여 몸을 쓰게 한다. 선왕도 이 나이엔 목검을 들었다.',
    apCost: 1,
    effects: [stat('martial', 5, 2), res('wellbeing', -9), res('regentSuspicion', 1)],
    tierStat: 'martial',
    // ★ 대비 쌍(#19): 몸을 쓰는 만큼 궁정의 결이 거칠어진다.
    tiers: lessonTiers('martial', stat('courtcraft', -1)),
    tags: ['physical'],
  },
  {
    id: 'attend-banquet',
    name: '연회 참석',
    description: '공작과 백작들 사이에 세워둔다. 누가 누구에게 인사하는지 보게 하려고.',
    apCost: 1,
    effects: [stat('courtcraft', 5, 2), res('wellbeing', -9), res('regentSuspicion', 1)],
    tierStat: 'courtcraft',
    // ★ 대비 쌍(#19) + 의심↔신망 대립(2-E): 궁정을 익힐수록 몸은 무뎌지고,
    //   섭정은 아이가 사람을 사귀는 것을 반기지 않는다(신망 −1).
    tiers: lessonTiers('courtcraft', stat('martial', -1)).map((t) => ({
      ...t, effects: [...t.effects, res('regentRapport', -1)],
    })),
    tags: ['court'],
  },
  {
    id: 'royal-hunt',
    name: '사냥 대회',
    description:
      '왕실 사냥터를 열고 각국에 전령을 보낸다. 무를 겨루는 자리에는 무를 좋아하는 자들이 모인다.',
    apCost: 2,
    requires: { minAge: 14 },
    effects: [
      { target: { kind: 'stat', key: 'martial' }, amount: 4, variance: 2 },
      // 섭정은 "정치보다 놀이"로 읽는다. 경계가 풀리는 대신 정무는 손에서 멀어진다.
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -4 },
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: -2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -18 },
    ],
    tags: ['physical', 'court'],
  },
  {
    id: 'attend-council',
    name: '정무 배석',
    description: '섭정공 옆에 앉아 정무를 지켜보게 한다. 배우는 자세를 보이면 그는 경계를 늦춘다.',
    apCost: 2,
    effects: [
      { target: { kind: 'stat', key: 'statecraft' }, amount: 4, variance: 1 },
      { target: { kind: 'resource', key: 'regentRapport' }, amount: 4 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
      // ★ 위험 회피의 대가(#23): 곁에서 배우는 동안 정무는 여전히 숙부의 손에 있다.
      //   안전한 길만 걸으면 실권은 정체가 아니라 조금씩 뒤로 간다.
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: -1 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -5 },
    ],
    tags: ['court'],
  },
  {
    id: 'secret-correspondence',
    name: '밀서 작성',
    description: '섭정공을 거치지 않고 변경 영주들에게 직접 글을 보내게 한다. 위험하지만 필요한 일.',
    apCost: 2,
    effects: [
      { target: { kind: 'stat', key: 'statecraft' }, amount: 4, variance: 2 },
      { target: { kind: 'stat', key: 'courtcraft' }, amount: 3, variance: 1 },
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 5 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -6 },
    ],
    tags: ['independence'],
  },
  {
    id: 'cede-affairs',
    name: '정무를 섭정공께 맡긴다',
    description:
      '올라온 문서 가운데 머리 아픈 것들을 골라 숙부께 넘긴다. 그편이 편하다는 걸 아이도 안다.',
    apCost: 1,
    effects: [
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -6 },
      { target: { kind: 'resource', key: 'regentRapport' }, amount: 3 },
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: -4 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: 6 },
    ],
    tags: ['court', 'cede'],
  },
  {
    id: 'direct-decree',
    name: '직접 재가한다',
    description:
      '섭정공을 거치지 않고 {왕}의 이름으로 서명한다. 한 건마다 궁정이 술렁이고, 한 건마다 정무가 조금씩 제자리로 돌아온다.',
    apCost: 2,
    requires: { minAge: 14, stats: { statecraft: { min: 35 } } },
    effects: [
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: 3 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 5 },
      { target: { kind: 'stat', key: 'statecraft' }, amount: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -8 },
    ],
    tags: ['independence', 'reclaim'],
  },
  {
    id: 'rest',
    name: '휴식',
    /**
     * ★ 밸런스 재설계: +20 → +16. 휴식 하나로 두 수업을 감당하던 널널함을 걷어낸다.
     *   회복량 자체는 **놀이보다 높게** 둔다 — 1차 실측에서 놀이(+16)가 휴식(+12)의
     *   완전 상위호환이 되어 회복 칸이 전부 놀이로 바뀌었고, 두 카드가 한 카드가 되었다.
     *   휴식 = 회복 전문, 놀이 = 의심 세탁. 그래야 매달 고를 것이 생긴다.
     */
    description: '아무것도 시키지 않는다. 쉬어야 자란다.',
    apCost: 1,
    effects: [
      { target: { kind: 'resource', key: 'wellbeing' }, amount: 16, variance: 3 },
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 1 },
    ],
    tags: ['rest'],
  },
  {
    /**
     * ★ 놀이·유희 (밸런스 재설계 #18).
     *
     *   **섭정의 경계를 늦추는 전용 칸** — "바보인 척하기"가 유효한 전략이 된다.
     *   대가는 스탯 하락이 아니라 **기회비용(칸)**이다. 공부가 의심을 부르는 구조(#12)에서
     *   놀이는 사실상 강제되므로, 강제되는 행동에 벌까지 얹지 않는다.
     *   그 대신 그 달에는 아무것도 배우지 못한다 — 그것이 이 라운드의 칸 경쟁이다.
     *
     *   회복은 휴식보다 **적다**(+10 vs +16). 심신만 급하면 휴식이 맞고,
     *   섭정의 눈이 급하면 놀이가 맞다. 둘이 서로의 상위호환이 아니게 하는 선.
     */
    id: 'play',
    name: '놀이',
    description:
      '공부를 덮고 그냥 놀게 둔다. 아이답게 구는 하루. 궁의 눈들이 잠시 아이를 어리게 본다.',
    apCost: 1,
    effects: [
      { target: { kind: 'resource', key: 'wellbeing' }, amount: 10, variance: 2 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -6 },
    ],
    tags: ['rest', 'play'],
  },
]

export const ACTIVITY_BY_ID: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
)
