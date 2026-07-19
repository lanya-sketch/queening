import type { Activity } from '../types/game'

/**
 * 활동 추가는 이 배열에 객체 하나 넣는 것으로 끝난다.
 * tags 의 'independence' 는 "군주를 홀로 서게 하는" 계열 —
 * 성장 효율이 좋은 대신 섭정 의심도를 올린다.
 *
 * 표시 텍스트는 서양 중세 왕국 궁정 톤. 나중에 다른 세계관을 얹더라도
 * id / apCost / effects / requires 는 그대로 두고 이 문자열만 갈아끼우면 된다.
 */
export const ACTIVITIES: Activity[] = [
  {
    id: 'lecture-statecraft',
    name: '통치학 수업',
    description: '역대 칙령과 선례를 함께 읽는다. 지루하지만 이것이 뼈대다.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'statecraft' }, amount: 6, variance: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -8 },
    ],
    tags: ['study'],
  },
  {
    id: 'lecture-finance',
    name: '국고 장부 열람',
    description: '재무청의 장부를 직접 넘겨보게 한다. 숫자에 익숙해져야 속지 않는다.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'finance' }, amount: 6, variance: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -7 },
    ],
    tags: ['study'],
  },
  {
    id: 'debate-practice',
    name: '문답 훈련',
    description: '반론을 던지고 되받게 한다. 어전 회의에서 말문이 막히면 끝이다.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'rhetoric' }, amount: 5, variance: 2 },
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -6 },
    ],
    tags: ['study'],
  },
  {
    id: 'sword-training',
    name: '검술 훈련',
    description: '기사를 붙여 몸을 쓰게 한다. 선왕도 이 나이엔 목검을 들었다.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'martial' }, amount: 6, variance: 3 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
    ],
    tags: ['physical'],
  },
  {
    id: 'attend-banquet',
    name: '연회 참석',
    description: '공작과 백작들 사이에 세워둔다. 누가 누구에게 인사하는지 보게 하려고.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'courtcraft' }, amount: 5, variance: 2 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 2 },
      { target: { kind: 'resource', key: 'regentRapport' }, amount: 1 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -4 },
    ],
    tags: ['court'],
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
      '섭정공을 거치지 않고 왕의 이름으로 서명한다. 한 건마다 궁정이 술렁이고, 한 건마다 정무가 조금씩 제자리로 돌아온다.',
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
    description: '아무것도 시키지 않는다. 아직 열한 살이다.',
    apCost: 1,
    effects: [
      { target: { kind: 'resource', key: 'wellbeing' }, amount: 20, variance: 3 },
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 1 },
    ],
    tags: ['rest'],
  },
]

export const ACTIVITY_BY_ID: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
)
