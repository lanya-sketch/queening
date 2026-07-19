import type { GameEvent } from '../../types/game'

/**
 * 정치 현안(state affair) — 새 시스템이 아니라 이벤트의 한 유형이다.
 *
 * 공통 패턴:
 *   "직접 결정한다"  → 국정 영향도 상승. 스탯 요구가 붙고, 결정에는 대가가 따른다.
 *   "섭정공에게 맡긴다" → 국정 영향도 하락 + 섭정 의심 감소. 안전한 위임.
 *
 * 위임 선택지는 조건 없이 항상 열린다 — 막다른 길을 만들지 않되 대가를 물린다
 * (「첫 친정」과 동일 원칙).
 *
 * 백성에게 미치는 영향은 지표를 만들지 않고 flag 로만 기록한다.
 * people_relieved / people_burdened 는 지금 어떤 수치에도 영향을 주지 않는다 —
 * 평민 캐릭터·엔딩·민심 지표가 붙을 때를 위한 예약분.
 */
export const AFFAIR_EVENTS: GameEvent[] = [
  {
    id: 'issue-frontier-raid',
    title: '변경의 불빛',
    category: 'state_affair',
    text:
      '변경 너머에서 넘어온 것들이 국경 마을 셋을 태웠다. 사흘이 지나서야 소식이 닿았다.\n' +
      '살아남은 자들이 성벽 앞에 모여 있다. 이백 명쯤 된다고 했고, 실제로는 더 될 것이다. ' +
      '궁정은 구호와 방어 중 무엇이 먼저인지를 놓고 아침 내내 다투었다. 곡물을 풀면 ' +
      '곳간이 비고, 병력을 올리면 국경에 비는 자리가 생긴다.\n' +
      '섭정공은 이미 답을 정해두었다. 다만 오늘은 말하지 않고, 왕의 입을 본다.',
    condition: { minAge: 13, minYear: 2 },
    priority: 25,
    choices: [
      {
        id: 'relief',
        label: '국고를 열어 구호부터 한다',
        requires: { stats: { finance: { min: 30 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 5 },
        ],
        setFlags: { people_relieved: true },
        resultText:
          '왕은 곡물과 담요를 먼저 내려보냈다. 숫자를 아는 자만 할 수 있는 결정이었다 — ' +
          '곳간이 이번 겨울을 버틸 수 있다는 것을 알고 내린 것이니까.\n' +
          '열흘 뒤 변경에서 올라온 문서에는 사망자 수가 적혀 있었다. 예상보다 적었다. ' +
          '그 차이가 몇 명인지 왕은 굳이 세어보았다.',
      },
      {
        id: 'garrison',
        label: '변경에 병력을 보낸다',
        requires: { stats: { martial: { min: 30 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 8 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 10 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -3 },
        ],
        resultText:
          '왕은 수비대를 북쪽으로 올렸다. 다시 넘어오지 못하게 하는 것이 결국 가장 값싼 ' +
          '구호라고 했다. 틀린 말은 아니다.\n' +
          '다만 그 겨울, 성벽 앞의 사람들은 스스로 버텨야 했다. 병력이 국경에 닿았다는 ' +
          '소식과 굶어 죽은 자의 수가 같은 날 궁에 도착했다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -8 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
        ],
        setFlags: { people_burdened: true },
        hint: '섭정공은 익숙한 얼굴로 고개를 끄덕인다',
        resultText:
          '"숙부께 맡기겠습니다." 섭정공은 그 말을 기다렸다는 듯 고개를 끄덕였다. ' +
          '익숙한 얼굴이었다.\n' +
          '처리는 무난했다. 다만 결재가 세 사람의 손을 거치는 동안 구호가 보름 늦었고, ' +
          '그 보름을 변경 사람들이 감당했다. 궁정에서는 아무도 그 이야기를 하지 않았다.',
      },
    ],
  },
]
