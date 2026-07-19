import type { Activity } from '../types/game'

/**
 * 활동 추가는 이 배열에 객체 하나 넣는 것으로 끝난다.
 * tags 의 'independence' 는 "군주를 홀로 서게 하는" 계열 —
 * 성장 효율이 좋은 대신 섭정 의심도를 올린다.
 */
export const ACTIVITIES: Activity[] = [
  {
    id: 'lecture-statecraft',
    name: '제왕학 강의',
    description: '역대 조칙과 선례를 함께 읽는다. 지루하지만 이것이 뼈대다.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'statecraft' }, amount: 6, variance: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -8 },
    ],
    tags: ['study'],
  },
  {
    id: 'lecture-finance',
    name: '호부 장부 열람',
    description: '국고 장부를 직접 넘겨보게 한다. 숫자에 익숙해져야 속지 않는다.',
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
    description: '반론을 던지고 되받게 한다. 어전에서 말문이 막히면 끝이다.',
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
    description: '무관을 붙여 몸을 쓰게 한다. 선황도 이 나이엔 목검을 들었다.',
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
    description: '귀족들 사이에 세워둔다. 누가 누구에게 인사하는지 보게 하려고.',
    apCost: 1,
    effects: [
      { target: { kind: 'stat', key: 'courtcraft' }, amount: 5, variance: 2 },
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 2 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -4 },
    ],
    tags: ['court'],
  },
  {
    id: 'secret-correspondence',
    name: '밀서 작성',
    description: '섭정을 거치지 않고 지방관에게 직접 글을 보내게 한다. 위험하지만 필요한 일.',
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
