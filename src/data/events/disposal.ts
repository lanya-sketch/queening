import type { GameEvent } from '../../types/game'

/**
 * 섭정공 처분 (M3-1).
 *
 * ★ 이 이벤트가 존재하는 이유는 `tyrant_purge` 를 세울 곳이 필요해서다.
 *   폭군은 **새 지표가 아니라 행동의 결과**여야 하므로, 어딘가에서 실제로
 *   "명분 없이 힘으로 처분한다"를 골라야 한다. 그 자리가 여기다.
 *
 *   엔딩 판정은 이 flag 를 기존 값들과 **조합**해서 폭군 성향을 읽는다
 *   (tyrant_purge × 국정 영향도 × 회유 아님). 새 게이지는 하나도 늘지 않는다.
 *
 * 실제 처분 연출(그 뒤 궁정이 어떻게 되는가)은 M3-2 다. 여기서는 갈림길까지만.
 */
export const DISPOSAL_EVENTS: GameEvent[] = [
  {
    id: 'regent-disposal',
    title: '숙부의 처분',
    text:
      '이제 힘으로는 가능하다. 위병도, 어전도, 문서도 {왕}의 손 안에 있다.\n' +
      '남은 문제는 명분이다 — 무엇을 근거로 숙부를 치는가.\n' +
      '\n' +
      '증거가 있으면 그것은 심판이 된다. 없으면 그저 힘이다.\n' +
      '궁정은 둘을 구분하지 못하지만, 역사는 구분한다.',
    condition: {
      minAge: 19,
      resources: { courtInfluence: { min: 60 } },
      flags: {
        regent_alliance: false,
        regent_disposed: false,
      },
    },
    choices: [
      {
        // 명분 있는 심판 — 확증(혈서)이 있어야만 열린다.
        id: 'just',
        label: '명분을 들어 심판한다',
        requires: { flags: { blood_oath_complete: true } },
        setFlags: { regent_disposed: true, just_purge: true },
        effects: [{ target: { kind: 'resource', key: 'courtInfluence' }, amount: 5 }],
        hint: '증거가 있으니 궁정이 따를 것이다',
        resultText:
          '{왕}은 어전에 반쪽씩 찢겼던 종이를 나란히 놓았다. 붉은 글씨가 문장이 되어 있었다.\n' +
          '섭정공은 변명하지 않았다. 변명할 수 없는 종류의 물건이었기 때문이다.\n' +
          '그날 어전에 있던 누구도 이것을 찬탈이라 부르지 못했다.',
      },
      {
        /**
         * ★ 명분 없이 강행. 확증이 없어도 언제나 열려 있다 —
         *   힘만 있으면 할 수 있다는 것이 이 선택지의 요점이다.
         */
        id: 'tyrant',
        label: '명분 없이 처분한다',
        setFlags: { regent_disposed: true, tyrant_purge: true },
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -20 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 15 },
        ],
        hint: '궁정은 따르겠지만, 이유를 묻지 못해서 따르는 것이다',
        resultText:
          '{왕}은 아무것도 증명하지 않았다. 그저 명했다.\n' +
          '반대하는 자가 없었던 것은 옳아서가 아니라 힘이 이미 기울어서였고, ' +
          '{왕}도 그것을 알고 있었다.\n' +
          '그날 이후 어전에서 누구도 먼저 입을 열지 않게 되었다.',
      },
      {
        id: 'leave',
        label: '그대로 둔다',
        resultText:
          '{왕}은 아무 말도 하지 않고 자리를 떴다.\n' +
          '숙부는 그 뒷모습을 오래 보았다. 무엇을 참은 것인지 그도 알고 있었다.',
      },
    ],
  },
]
