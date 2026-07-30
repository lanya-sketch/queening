import type { GameEvent } from '../../types/game'

/**
 * ★ [9-B] 교권 + 선포 — 제국이 무너지는 틈에서 이 나라를 무엇이라 부를 것인가.
 *
 * · 교회와 손잡기 — 교권 지지(church_support)를 얻되 정책 간섭(church_vetoes_reform)을 진다.
 *   성물(legitimacy_sacred)이 있으면 그 대가가 엔딩에서 깎인다(개혁을 지킴). 성물=자유 / 교권=종속.
 * · 선포 결정 — 신성국(친정 변종·전쟁 없음) / 참칭(전쟁은 [9-C]) / 안 함(왕으로 남음).
 *   ★ 신성국은 church_support 필수(교황의 인정) — 성물만으론 안 된다. 친정(영향도 autonomy) 전제.
 */
export const EMPIRE_EVENTS: GameEvent[] = [
  {
    // 교회와 손잡기 — 대주교 호의(church_favor) 뒤. 명분을 얻되 노선을 저당 잡힌다.
    id: 'church-alliance',
    title: '교회의 손',
    text:
      '대주교가 다시 왔다. 이번엔 축복이 아니라 제안이었다.\n' +
      '"교회가 전하의 왕관을 하늘의 이름으로 받치겠습니다. 다만, 하늘을 받든 왕이라면 ' +
      '하늘의 뜻에 어긋나는 길을 고집하실 수는 없겠지요."\n' +
      '{왕}은 그 정중한 말 아래 걸린 것이 무엇인지 알아들었다. 명분에는 값이 있었다.',
    condition: {
      minAge: 18,
      flags: { church_favor: true, church_support: false, church_alliance_declined: false },
      resources: { courtInfluence: { min: 45 } },
    },
    once: true,
    priority: 44.1,
    insights: [
      {
        requires: { flags: { legitimacy_sacred: true } },
        text:
          '{왕}에게는 이미 하늘이 내린 성물이 있었다. 교회의 인정을 받되, 그 요구를 다 들어줄 ' +
          '필요는 없었다 — 성물을 든 왕 앞에서는 교회도 목소리를 낮춘다.',
      },
    ],
    choices: [
      {
        id: 'accept',
        label: '교회와 손잡는다',
        setFlags: { church_support: true, church_vetoes_reform: true },
        hint: '교권의 인정 · 대가로 노선이 교회의 뜻에 매인다(성물이 있으면 지킬 수 있다)',
        resultText:
          '교회가 왕의 편에 섰다. 교단의 이름이 왕의 이름 뒤에 붙었고, 다른 나라들도 그 무게를 셈했다.\n' +
          '그 대가로 교회는 왕의 노선에 손을 얹었다. 하원도, 중앙집권도, 선왕의 개혁도, ' +
          '교회의 뜻을 거스르는 것은 되돌려야 했다. 명분을 얻고, 개혁을 저당 잡혔다.',
      },
      {
        id: 'decline',
        label: '교회 없이 간다',
        setFlags: { church_alliance_declined: true },
        hint: '명분은 스스로 세워야 하나, 노선은 온전히 왕의 것으로 남는다',
        resultText:
          '{왕}은 교회의 손을 잡지 않았다. 하늘의 이름을 빌리지 않겠다는 뜻이었다.\n' +
          '명분은 스스로 세워야 했으나, 9년에 걸쳐 그린 노선은 누구에게도 저당 잡히지 않았다.',
      },
    ],
  },

  {
    // 선포 결정 — 제국이 무너진 뒤, 친정을 쥔 왕이 이 나라의 이름을 정한다.
    id: 'proclamation',
    title: '왕관의 이름',
    text:
      '제국이 안팎으로 무너지는 것을, 이제 온 나라가 보았다. 아홉 해 전 이 나라를 손바닥처럼 ' +
      '내려다보던 상국은, 제 몸조차 가누지 못했다.\n' +
      '틈이 열렸다. 그리고 그 틈 앞에, 실권을 쥔 왕이 서 있었다.\n' +
      '{왕}은 정해야 했다 — 이 나라를 무엇이라 부를 것인가.',
    condition: {
      minAge: 19,
      flags: { empire_decline_3: true, proclaimed: false },
      resources: { courtInfluence: { min: 70 } },
    },
    once: true,
    priority: 43.1,
    choices: [
      {
        id: 'holy',
        // ★ 성물만으론 안 된다 — 교황의 인정(church_support)이 있어야 신성국이 성립한다.
        label: '교황의 관을 받아 신성국을 세운다',
        requires: { flags: { church_support: true } },
        setFlags: { proclaimed: true, holy_kingdom: true },
        hint: '교권의 인정으로 전쟁 없이 독립 · 교회에 매인 노선은 그대로',
        resultText:
          '교황이 몸소 관을 씌웠다. 제국을 거치지 않고, 피 한 방울 없이, 이 나라는 하늘 아래 ' +
          '독립한 신성국이 되었다.\n' +
          '누구도 이 관을 참칭이라 부르지 못했다. 관을 씌운 것이 교회였으므로.',
      },
      {
        id: 'usurp',
        label: '스스로 황제를 칭한다',
        setFlags: { proclaimed: true, empire_claimed: true },
        hint: '제국을 부정하는 선언 · 필연적으로 전쟁이 온다',
        resultText:
          '{왕}은 스스로 황제를 칭했다. 무너지는 제국을 부정하고, 그 자리를 대신하겠다는 선언이었다.\n' +
          '제국이 가만히 있을 리 없었다. 국경 너머에서 군대가 모이기 시작했다. 전쟁이 오고 있었다.',
      },
      {
        id: 'stay',
        label: '독립하되 왕으로 남는다',
        setFlags: { proclaimed: true, empire_defied: true },
        hint: '누구의 신하도 아니되, 황제를 칭하지도 않는다',
        resultText:
          '{왕}은 제국의 책봉을 끝내 거부했으나, 스스로 황제를 칭하지도 않았다.\n' +
          '작은 나라의 왕으로, 그러나 누구의 신하도 아닌 왕으로 남았다. 그것으로 충분하다고 여겼다.',
      },
    ],
  },
]
