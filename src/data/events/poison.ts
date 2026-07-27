import type { GameEvent } from '../../types/game'

/**
 * 모후의 약 — 중반 전개 (M3-pending #3 회수).
 *
 * 침실 수색 발각(chamber-caught)이 queen_poison_path 를 세운 뒤, 20세 사이에 실제로
 * 무슨 일이 일어나는가. 그전까지는 flag 만 서고 20세에 갑자기 「배드:꼭두각시」로 판정됐다
 * — 결과만 있고 과정이 없었다. 여기서 과정을 채운다.
 *
 * ★ 설계 불변식(M3-pending #3): 발각의 대가는 **지속 손해가 아니라 시간·확증 상실**이고,
 *   재기의 여지를 남긴다. 그래서 이 전개는 **수치 출혈 없이 서사 압박만** 준다 —
 *   출혈을 넣으면 20세 유예 게이트(심신/궁정처세 60)가 막혀 재기 여지가 깨진다.
 *   막을 기회를 잡으면 queen_poison_averted(배드 회피), 못 잡아도 20세 유예에 걸 수 있다.
 *   방치로 심신이 바닥나면 기존 「심신파탄」 데드로 자연 연결된다(별도 독 데드 없음).
 *
 * ★ 전부 queen_poison_path 게이트 → 이 경로를 안 탄 플레이(대부분)에겐 아무것도 안 뜬다.
 */
const PATH = 'queen_poison_path'
const AVERTED = 'queen_poison_averted'

export const POISON_EVENTS: GameEvent[] = [
  // ── E1. 발각 직후 — 탕약이 다시 오른다 (11세 「어머니의 방」 씨앗 회수) ──
  {
    id: 'poison-resumes',
    title: '탕약이 다시',
    sceneId: 'scene-poison-resumes',
    text: '왕대비궁에서 익숙한 향의 약이 다시 상에 올랐다.',
    // 발각 직후 — 나이 게이트 없이 flag 만. 다음 계절에 곧바로.
    condition: { flags: { [PATH]: true, [AVERTED]: false, queen_dosing: false } },
    setFlags: { queen_dosing: true },
  },

  // ── E2. 중반 압박 — 가라앉는 날들 (꼭두각시화의 시작) ──
  {
    id: 'poison-fog',
    title: '가라앉는 날들',
    text:
      '며칠은 머리가 맑았고, 며칠은 안개 속이었다. 어느 쪽이 약 탓인지 분간이 서지 않았다.\n' +
      '결재를 미루는 날이 늘었다. 이상하게도, 누군가는 그것을 편히 여기는 눈치였다.',
    // 발각 직후(E1)에서 한 해쯤 지나 — 서사 압박이 무르익는 자리.
    condition: { minAge: 18, flags: { queen_dosing: true, poison_fog: false, [AVERTED]: false } },
    setFlags: { poison_fog: true },
  },

  // ── E3. 위기 — 끊어낼 기회 (막을 기회, 3종 게이트) ──
  {
    id: 'poison-crisis',
    title: '끊어낼 기회',
    text:
      '탕약을 끊어야 한다. 그러나 왕대비궁은 궁정의 관할 밖이고, ' +
      '어머니를 정면으로 의심하는 순간 — 돌아갈 길은 없다.',
    condition: { minAge: 19, flags: { poison_fog: true, [AVERTED]: false } },
    choices: [
      {
        // 궁정처세 — 약을 직접 알아챈다.
        id: 'detect',
        label: '약을 직접 알아본다',
        requires: { stats: { courtcraft: { min: 45 } } },
        hint: '궁정처세 45 이상 — 성분을 짚어낸다',
        setFlags: { [AVERTED]: true },
        effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: 8 }],
        resultText:
          '{왕}은 의관을 은밀히 불러 성분을 짚었다. 잔은 입에 닿기 전에 물러났다.\n' +
          '안개가 걷혔다. 왕대비는 알아챘고, 아무 말도 하지 않았다 — 이제 둘 다 안다.',
      },
      {
        // ★ ② 시녀장 사촌 씨앗의 두 번째 회수. 13~15세 "제 사촌이 왕대비궁 시녀장입니다".
        id: 'cousin',
        label: '충신 가문에 기댄다',
        requires: { affection: { loyalist: { min: 45 } } },
        hint: '충신 가문과의 신뢰 — 그 궁 안에 사람이 있다',
        setFlags: { [AVERTED]: true },
        effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: 8 }],
        resultText:
          '오래전 그 아이가 흘리듯 말했었다 — 사촌이 왕대비궁 시녀장이라고. ' +
          '"필요하시면… 아닙니다, 나중에요"라던 그 "나중"이, 이제 왔다.\n' +
          '탕약은 상에 오르기 전에 바뀌었다. 왕대비는 끝내 누가 손을 썼는지 알지 못했다.',
      },
      {
        // 신뢰 — 오래 곁을 지킨 가정교사가 막는다.
        id: 'tutor',
        label: '가정교사에게 맡긴다',
        requires: { resources: { tutorTrust: { min: 40 } } },
        hint: '튜터를 향한 신뢰 — 오래 곁을 지킨 손',
        setFlags: { [AVERTED]: true },
        effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: 8 }],
        resultText:
          '{왕}은 오래 곁을 지킨 이에게 조용히 일렀다. 그 손이 왕대비궁 사람보다 빨랐다.\n' +
          '누구도 소리 내지 않았고, 잔은 며칠 뒤부터 비어 있었다.',
      },
      {
        // 무게이트 최후 안전망 — 못 막아도 20세 유예에 건다(재기 여지).
        id: 'endure',
        label: '버틴다',
        resultText:
          '끊어낼 방도가 없었다. {왕}은 잔을 밀어 두는 것 말고는 할 수 있는 게 없었다.\n' +
          '몸이 버텨 주기를 바랄 뿐. — 아직 끝난 것은 아니다.',
      },
    ],
  },
]
