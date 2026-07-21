import type { GameEvent } from '../../types/game'

/**
 * ③ 정복 병합 — 능동적 야망 (측실 라운드).
 *
 * ★ 청산과 다르다. 청산은 엔딩 근처의 정리이고, 정복은 **청년기 이후 어느 때든**
 *   왕이 능동적으로 결단하는 야망이다. `배드:제국복속`의 거울상 —
 *   그건 우리가 삼켜지는 것, 이건 우리가 삼키는 것.
 *
 * ★ 로맨스와 무관하게 발동한다. 다만 실행하면 affection:prince 가 급락한다 —
 *   로맨스 중이었다면 그것이 배신이다. 엔딩이 로맨스 여부로 삽입을 가른다:
 *   로맨스+정복 = '사랑을 삼킴' / 무로맨스+정복 = '무감정 정복'.
 *
 * 조건의 국력 임계(courtInfluence·finance·martial)는 "강한 나라만 정복 가능"을
 * 노린 값이다 — 시뮬로 강빌드만 발동하는지 실측해 조정한다(M3-1 국력 140 을
 * B빌드 실측으로 잡았던 것과 같은 방식).
 */
export const CONQUEST_EVENTS: GameEvent[] = [
  {
    id: 'prince-conquest',
    title: '두 왕관, 한 손',
    sceneId: 'scene-prince-conquest',
    text: '제국의 왕족이 다스리는 땅은 넓고, 지금 {왕}의 나라는 그보다 강하다.',
    condition: {
      minAge: 17,
      resources: { courtInfluence: { min: 60 } },
      stats: { finance: { min: 45 }, martial: { min: 45 } },
      flags: { romance_unlocked: true, prince_conquered: false },
    },
    choices: [
      {
        // 삼킨다 — 로맨스 중이어도 발동. 호감도가 바닥으로 떨어진다.
        id: 'conquer',
        label: '그의 나라를 삼킨다',
        setFlags: { prince_conquered: true },
        effects: [{ target: { kind: 'affection', charId: 'prince' }, amount: -80 }],
        hint: '두 왕관을 한 손에 쥔다. 그가 무엇이었든.',
        resultText:
          '{왕}은 군을 움직였다. 명분은 나중에 만들면 되는 것이었다.\n' +
          '제국의 왕족이 다스리던 땅이 {왕}의 지도 위로 들어왔다. 그 사람의 마음이\n' +
          '어떻게 되었는지는, 지도에 적히지 않았다.',
      },
      {
        id: 'respect',
        label: '그의 나라를 존중한다',
        resultText:
          '{왕}은 군을 물렸다. 삼킬 수 있다는 것과 삼켜야 한다는 것은 다른 문제였다.\n' +
          '두 왕관은 각자의 자리에 남았다.',
      },
    ],
  },
]
