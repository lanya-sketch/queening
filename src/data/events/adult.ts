import type { GameEvent } from '../../types/game'

/**
 * 청년기 아크 (17~20세) — "성인 군주, 실권 다툼"
 * 톤: 결전, 폭로, 선택. 진실 회수 이벤트는 truth.ts 에 따로 있다.
 */
export const ADULT_EVENTS: GameEvent[] = [
  {
    id: 'adult-uncle-letters',
    title: '외가의 추도식',
    text:
      '왕대비의 친정에서 추도식이 있었다. 왕은 외손으로서 참례했고, 당신은 ' +
      '수행으로 따라갔다.\n' +
      '예식이 끝나고 서고에 잠시 혼자 남았을 때, 당신은 문갑의 서찰 묶음을 보았다. ' +
      '왕대비의 필적이다. 받는 이는 그의 오라비 — 지금의 섭정공.\n' +
      '남매가 편지를 주고받는 것은 죄가 아니다. 다만 묶음이 시작되는 날짜가 ' +
      '선왕이 승하하기 두 달 전이고, 그 이전 것은 한 통도 없다는 게 마음에 걸린다.\n' +
      '발소리가 들려 당신은 문갑을 닫았다.',
    condition: {
      minAge: 16,
      flags: { clue_mother_calm: true },
      stats: { courtcraft: { min: 50 } },
    },
    effects: [{ target: { kind: 'stat', key: 'courtcraft' }, amount: 3 }],
    setFlags: { clue_mother_letter: true },
    priority: 20,
  },
  {
    id: 'adult-coming-of-age',
    title: '성년식',
    text:
      '열일곱, 이 왕국의 법이 정한 성년이다.\n' +
      '예법대로라면 오늘부로 섭정공은 정무를 왕에게 돌려주어야 한다. ' +
      '예법대로 되지 않으리라는 것을 이 자리의 누구도 의심하지 않는다.\n' +
      '관을 씌우는 손이 섭정공의 것이다. 그가 왕의 귀에만 들리게 말한다.\n' +
      '"이제 무엇을 하시겠습니까, 전하."\n' +
      '9년을 준비한 대답을 해야 할 때다.',
    condition: { minAge: 17 },
    priority: 40,
    choices: [
      {
        id: 'declare',
        label: '친정을 선포한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 25 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 20 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
          { target: { kind: 'stat', key: 'statecraft' }, amount: 5 },
        ],
        setFlags: { declared_rule: true },
        resultText:
          '"오늘부로 과인이 친정한다."\n' +
          '한 문장이었다. 궁정은 술렁였고, 섭정공은 웃으며 고개를 숙였다 — 물러나겠다는 ' +
          '예가 아니라, 받아들이겠다는 예도 아닌, 그저 예법에 맞는 예였다.\n' +
          '그날 밤 궁의 위병이 두 배로 늘었다. 명분은 성년식 경비였다.',
      },
      {
        id: 'coexist',
        label: '섭정공과의 공동 통치를 청한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 8 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 20 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -10 },
          { target: { kind: 'stat', key: 'courtcraft' }, amount: 5 },
        ],
        setFlags: { sought_coexistence: true },
        resultText:
          '"과인은 아직 배울 것이 많습니다. 숙부께서 곁에 계셔 주십시오."\n' +
          '섭정공의 표정이 처음으로 흔들렸다. 그는 이 아이가 물러선 것인지, ' +
          '아니면 자신을 더 가까운 자리에 묶어둔 것인지 판단하려 했다.\n' +
          '당신은 안다. 아이가 무엇을 한 것인지.',
      },
    ],
  },
  {
    id: 'adult-inner-court',
    title: '왕대비궁의 약재',
    text:
      '섭정공이 관여했다는 것까지는 왔다. 그런데 한 가지가 맞지 않는다.\n' +
      '선왕을 무너뜨린 것은 오래 쌓이는 종류의 약이었다. 그런 것은 바깥에서 ' +
      '들어오지 않는다. 왕실 의관의 처방이 아니라 왕대비궁의 재고에서만 나온다.\n' +
      '왕대비궁은 궁정의 관할 밖이다. 섭정공의 손이 닿는 곳이 아니라는 뜻이다.\n' +
      '그 안쪽을 관장하는 사람은 단 하나다.',
    condition: {
      minAge: 17,
      flags: { truth_regent_involved: true },
      stats: { courtcraft: { min: 55 } },
    },
    effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: -10 }],
    setFlags: { clue_apothecary: true },
    priority: 30,
  },
  {
    id: 'adult-regent-accord',
    title: '섭정공과의 담판',
    text:
      '섭정공이 사람을 물리고 당신들을 불렀다. 포도주가 나왔지만 아무도 마시지 않았다.\n' +
      '"전하께서는 이제 저를 치실 수 있습니다." 그가 먼저 말했다. ' +
      '"신도 압니다. 다만 신을 치시면 귀족파 절반이 함께 일어설 것이고, ' +
      '그 절반을 전하께서 감당하실 수 있는지는 신도 모르겠습니다."\n' +
      '그가 잔을 밀어 놓는다.\n' +
      '"신은 전하께서 애송이가 아니라는 것을 압니다. 그것이 신이 전하께 ' +
      '드릴 수 있는 전부입니다."',
    // 이미 갈라섰다면 담판의 자리가 없다.
    condition: {
      minAge: 18,
      resources: { regentRapport: { min: 60 }, regentSuspicion: { max: 45 } },
      flags: { regent_hostile: false },
    },
    effects: [{ target: { kind: 'resource', key: 'regentRapport' }, amount: 10 }],
    setFlags: { regent_won_over: true },
    priority: 45,
    choices: [
      {
        id: 'accept',
        label: '손을 잡는다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 10 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -20 },
          { target: { kind: 'stat', key: 'courtcraft' }, amount: 6 },
        ],
        setFlags: { regent_alliance: true },
        resultText:
          '왕이 잔을 들었다. 두 사람은 그날 밤 아무 약속도 문서로 남기지 않았고, ' +
          '그것이 이 궁에서 가장 확실한 종류의 약속이었다.\n' +
          '섭정공은 이 아이가 자신을 필요로 한다고 믿고 있다. 절반은 사실이다.',
      },
      {
        id: 'defer',
        label: '대답을 미룬다',
        effects: [{ target: { kind: 'resource', key: 'regentRapport' }, amount: -5 }],
        hint: '섭정공의 기대가 조금 식는다',
        resultText:
          '"숙부의 말씀, 새겨듣겠습니다."\n' +
          '왕은 잔을 들지 않았다. 섭정공은 실망하지 않았다 — 실망할 만큼 ' +
          '기대하지 않았다는 얼굴이었다.\n' +
          '문이 닫히고 나서야 아이가 말했다. "아직은 저 손이 무엇을 했는지 모릅니다."',
      },
    ],
  },
  {
    id: 'adult-regent-rupture',
    title: '결렬',
    text:
      '더 이상 서로를 시험할 필요가 없어졌다.\n' +
      '섭정공은 왕의 사람들을 하나씩 변경으로 돌리기 시작했다. 명분은 늘 ' +
      '흠잡을 데가 없었다 — 승진, 요직, 중임. 궁에서 멀어진다는 것만 빼면.\n' +
      '오늘 아침에는 당신의 이름이 목록에 올랐다는 말이 돌았다.\n' +
      '왕이 처음으로 당신 앞에서 목소리를 높였다. "과인이 지킵니다."',
    // 회유가 이미 성사됐다면 이 장면(처음 갈라서는 순간)은 성립하지 않는다.
    // 동맹이 깨지는 서사는 별도 이벤트로 다룰 자리다.
    condition: {
      minAge: 18,
      resources: { regentSuspicion: { min: 70 } },
      flags: { regent_won_over: false },
    },
    effects: [
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: -10 },
      { target: { kind: 'resource', key: 'regentRapport' }, amount: -20 },
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 12 },
    ],
    setFlags: { regent_hostile: true },
    priority: 45,
  },
]
