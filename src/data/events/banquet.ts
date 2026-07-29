import type { GameEvent } from '../../types/game'

/**
 * ★ [3] 연례 가을 연회 — 해마다 10월(수확제 9월 뒤·담판 11월 전), AP 0(강제 발동).
 *
 * 두 가지를 한다:
 *   (1) 확인 — 숨은 「권세」를 모브 귀족의 태도로 드러낸다(insights: 형세 낮/중/높).
 *       연회 활동을 안 골라도 최소 연 1회는 궁정 형세를 보게 된다.
 *   (2) 쌓음 — 선택지로 권세를 능동적으로 쌓거나(어울림·대립각), 다른 것을 챙긴다(예·안전).
 *
 * 나이대로 성격이 갈린다: 11~13 구경 / 14~16 사교 시작 / 17~19 실권 다툼의 무대.
 * ★ 계절 소재는 서양 중세 궁정(수확제 뒤 귀족 회합)이라 바이블에 맞는다. 미성년 안전 — 아이 묘사 없음.
 */

/** 권세 형세를 아이/사교/실권 시선으로 각각 세 단계. requires 로 숨은 권세 구간을 읽는다. */
const moodInsights = (low: string, mid: string, high: string) => [
  { requires: { resources: { courtStanding: { max: 34 } } }, text: low },
  { requires: { resources: { courtStanding: { min: 35, max: 54 } } }, text: mid },
  { requires: { resources: { courtStanding: { min: 55 } } }, text: high },
]

export const BANQUET_EVENTS: GameEvent[] = [
  {
    id: 'autumn-banquet-child',
    title: '첫 가을 연회',
    text:
      '추수가 끝나고, 성 앞 큰 방에 가을 연회가 섰다. 공작과 백작들이 한 해의 셈을 나누러 모였다.\n' +
      '{왕}은 가장 높은 자리에 앉아 있을 뿐, 아직 이 방의 셈에는 끼지 못한다. 그래도 눈은 바쁘다.',
    insights: moodInsights(
      '누가 누구에게 먼저 인사하는지 지켜보았다. 아무도 높은 자리 쪽을 오래 보지 않았다.',
      '몇몇 늙은 귀족이 다가와 짧게 예를 표했다. 대부분의 발길은 섭정공 쪽으로 향했다.',
      '뜻밖에도 여러 사람이 높은 자리 앞에 줄을 섰다. 어린 왕에게 눈도장을 찍으려는 얼굴들이었다.',
    ),
    condition: { minAge: 11, maxAge: 13, month: 10 },
    once: false,
    choices: [
      {
        id: 'beside-regent',
        label: '섭정공 곁에 얌전히 앉아 있는다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 2 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: 3 },
        ],
        resultText: '{왕}은 숙부 곁에서 연회가 끝날 때까지 얌전했다. 섭정공은 그 얌전함을 마음에 들어 했다.',
      },
      {
        id: 'watch-alone',
        label: '혼자 좌중을 지켜본다',
        effects: [{ target: { kind: 'stat', key: 'courtcraft' }, amount: 1 }],
        resultText:
          '{왕}은 말없이 방을 읽었다. 누가 누구의 잔을 채우는지, 누가 누구의 농담에 웃는지 — ' +
          '그런 것들이 나중에 쓸모가 있으리라는 것을, 아이는 어렴풋이 알았다.',
      },
    ],
  },
  {
    id: 'autumn-banquet-youth',
    title: '사교의 계절',
    text:
      '가을 연회. 이제 {왕}도 잔을 들 나이가 되었고, 또래 귀족 자제들이 곁을 맴돌기 시작한다.\n' +
      '한 해에 한 번, 이 방에서 누가 누구와 가까운지가 새로 그려진다.',
    insights: moodInsights(
      '자제들은 곧 흥미를 잃고 섭정공 쪽 무리로 돌아갔다. 아직 이 방은 왕의 것이 아니다.',
      '몇몇이 곁에 남아 이야기를 이었다. 판이 완전히 기운 것은 아니어도, 금은 가고 있었다.',
      '어울리려는 이가 줄을 이었고, 섭정공 곁은 눈에 띄게 헐거웠다. 사람들은 힘이 어디로 가는지 안다.',
    ),
    condition: { minAge: 14, maxAge: 16, month: 10 },
    once: false,
    choices: [
      {
        id: 'mingle',
        label: '귀족 자제들과 어울린다',
        effects: [{ target: { kind: 'resource', key: 'courtStanding' }, amount: 3 }],
        resultText: '{왕}은 또래들 사이에 섞였다. 오늘 웃으며 나눈 말들이 훗날 누군가의 편이 될 것이다.',
      },
      {
        id: 'honor-regent-here',
        label: '섭정공께 예를 갖춘다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 4 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
        ],
        resultText: '{왕}은 좌중이 보는 앞에서 숙부께 예를 표했다. 섭정공의 낯이 풀렸다 — 아직은 아이라고.',
      },
      {
        id: 'withdraw',
        label: '물러나 지켜본다',
        effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: 4 }],
        resultText: '{왕}은 무리에서 한 발 떨어져 방을 읽기만 했다. 서두를 것 없다는 얼굴이었다.',
      },
    ],
  },
  {
    id: 'autumn-banquet-court',
    title: '형세를 가르는 밤',
    text:
      '가을 연회. 이제 이 방은 한 해의 힘을 셈하는 자리다. 누가 누구 곁에 서는지가 곧 나라의 형세다.\n' +
      '{왕}과 섭정공, 두 사람 사이에서 귀족들의 발끝이 미세하게 움직인다.',
    insights: moodInsights(
      '방의 무게중심은 여전히 섭정공 쪽이었다. 왕의 자리 앞은 한산했다.',
      '방이 둘로 갈리기 시작했다. 아직 어느 쪽도 확실히 이기지 못한 밤이었다.',
      '이제 방의 무게중심은 왕에게 있었다. 섭정공 곁에 남은 얼굴은 손에 꼽혔다.',
    ),
    condition: { minAge: 17, maxAge: 19, month: 10 },
    once: false,
    choices: [
      {
        id: 'court-nobles',
        label: '귀족들을 내 편으로 끌어들인다',
        effects: [
          { target: { kind: 'resource', key: 'courtStanding' }, amount: 4 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 3 },
        ],
        resultText:
          '{왕}은 잔을 들고 방을 돌았다. 이름을 부르고, 아들의 안부를 묻고, 묵은 청을 기억해 냈다. ' +
          '연회가 끝날 무렵, 몇 사람의 마음이 옮겨 앉아 있었다. 섭정공은 그것을 지켜보았다.',
      },
      {
        id: 'stay-neutral',
        label: '중립을 지키며 형세만 읽는다',
        effects: [{ target: { kind: 'stat', key: 'courtcraft' }, amount: 1 }],
        resultText: '{왕}은 어느 쪽에도 서지 않고 방을 읽었다. 서두르지 않는 것도 하나의 수다.',
      },
      {
        id: 'defy-regent',
        label: '섭정공과 공공연히 대립각을 세운다',
        effects: [
          { target: { kind: 'resource', key: 'courtStanding' }, amount: 6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
        ],
        resultText:
          '{왕}은 좌중이 다 듣는 앞에서 섭정공의 처결 하나를 정면으로 물었다. 방이 조용해졌다. ' +
          '물러서지 않는 젊은 왕을 보고, 눈치 빠른 자들은 그날 밤 자리를 옮겼다 — 그리고 섭정공은 기억했다.',
      },
    ],
  },
]
