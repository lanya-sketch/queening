import type { GameEvent } from '../../types/game'

/**
 * 소년기 아크 (14~16세) — "첫 친정 시도, 견제"
 * 톤: 시험, 반격, 의심의 싹. 얕은 진실 도달이 이 구간에서 열린다.
 */
export const TEEN_EVENTS: GameEvent[] = [
  {
    id: 'teen-first-policy',
    title: '첫 친정',
    text:
      '가뭄이 들었다. 궁정은 늘 하던 대로 곳간을 열자고 했고, 섭정공은 늘 하던 대로 ' +
      '재가했다. 그리고 처음으로, {왕}이 입을 열었다.\n' +
      '"그 곳간은 작년에도 열었습니다. 올해도 열면 내년에는 무엇을 엽니까."\n' +
      '회의실이 조용해졌다. 섭정공이 천천히 고개를 돌린다. "그러면 전하께서는 ' +
      '어찌하시겠습니까."\n' +
      '9년 만에 처음으로, 이 방의 모두가 어린 군주의 대답을 기다리고 있다.',
    condition: { minAge: 14, stats: { statecraft: { min: 20 } } },
    priority: 30,
    choices: [
      {
        /**
         * ★ 4-C 결과 차등. 첫 친정의 세 갈래는 **잠그지 않는다** — 왕은 서툴러도
         *   무엇 하나는 정해야 하고, 셋 다 잠기면 "아직 준비되지 않았음" 하나만 남아
         *   친정이라는 마일스톤이 선택 없는 통과의례가 된다.
         *   대신 스탯이 받쳐 주면 개혁이 서고, 아니면 시늉만 하고 물러난다.
         */
        id: 'treasury',
        label: '국고를 개혁한다',
        tierStat: 'finance',
        // 공통분: 어느 등급이든 "직접 나섰다"는 사실은 남는다.
        effects: [{ target: { kind: 'resource', key: 'tutorTrust' }, amount: 8 }],
        setFlags: { first_policy_treasury: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'stat', key: 'finance' }, amount: 3 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 3 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -4 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 4 },
            ],
            hint: '장부를 아직 못 읽는다',
            resultText:
              '{왕}은 장부를 펼쳤지만 어디를 짚어야 할지 몰랐다. 재무청의 관리가 ' +
              '공손한 얼굴로 항목을 하나하나 설명했고, 설명이 길어질수록 어전은 조용해졌다.\n' +
              '개혁은 문서상으로만 남았다. 회의가 끝난 뒤 섭정공이 한 마디를 남겼다. ' +
              '"애쓰셨습니다." 그 말이 가장 아팠다.',
          },
          {
            min: 24,
            effects: [
              { target: { kind: 'stat', key: 'finance' }, amount: 6 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: 10 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
            ],
            resultText:
              '{왕}은 장부의 항목을 하나씩 짚어가며 어디가 새는지 말했다. 재무청의 관리들이 ' +
              '얼굴을 붉혔다. 숫자 앞에서는 나이가 무기가 되지 않는다.\n' +
              '섭정공은 반대하지 않았다. 회의가 끝난 뒤 그는 딱 한 마디를 남겼다. ' +
              '"누가 가르쳤습니까." 당신을 보지 않고 한 말이었다.',
          },
        ],
      },
      {
        id: 'military',
        label: '군제를 손본다',
        tierStat: 'martial',
        effects: [{ target: { kind: 'resource', key: 'tutorTrust' }, amount: 8 }],
        setFlags: { first_policy_military: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'stat', key: 'martial' }, amount: 3 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 3 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 10 },
            ],
            hint: '병무를 아직 모른다',
            resultText:
              '{왕}은 구휼을 수비대에 맡기라 명했다. 병무청은 명을 받들었으나, ' +
              '누구를 어디에 세울지는 아무도 {왕}에게 묻지 않았다.\n' +
              '명은 내려갔고 이름만 바뀌었다. 그래도 섭정공은 그날 저녁 병무청의 명단을 ' +
              '다시 살폈다고 한다. 서툰 칼도 칼이다.',
          },
          {
            min: 24,
            effects: [
              { target: { kind: 'stat', key: 'martial' }, amount: 6 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 14 },
            ],
            resultText:
              '{왕}은 구휼을 변경 수비대의 손으로 옮기게 했다. 굶는 자에게 빵을 주는 일이 ' +
              '누구의 이름으로 이루어지는가 — 그것이 권력이라는 걸 아이는 이미 안다.\n' +
              '섭정공은 그날 저녁 병무청의 명단을 다시 살폈다고 한다. 경계가 시작되었다.',
          },
        ],
      },
      {
        id: 'personnel',
        label: '인사를 개편한다',
        tierStat: 'courtcraft',
        effects: [{ target: { kind: 'resource', key: 'tutorTrust' }, amount: 8 }],
        setFlags: { first_policy_personnel: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'stat', key: 'courtcraft' }, amount: 3 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 3 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -2 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
            ],
            hint: '사람을 아직 못 읽는다',
            resultText:
              '{왕}은 몇 사람의 자리를 바꿨다. 이름은 바뀌었으나 누가 누구의 사람인지까지는 ' +
              '읽지 못했고, 밀려난 자리에 앉은 것은 결국 같은 편의 다른 얼굴이었다.\n' +
              '궁정은 하루 술렁이고 이틀 만에 잠잠해졌다. 아무것도 바뀌지 않았다는 뜻이다.',
          },
          {
            min: 24,
            effects: [
              { target: { kind: 'stat', key: 'courtcraft' }, amount: 6 },
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: 6 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 },
            ],
            resultText:
              '{왕}은 곳간을 여는 대신 곳간을 지키는 사람을 바꿨다. 누가 누구의 사람인지 ' +
              '읽어내지 못하면 할 수 없는 수다.\n' +
              '밀려난 자들은 귀족파였고, 그 자리에 앉은 자들은 아직 아무의 사람도 아니었다. ' +
              '아직은.',
          },
        ],
      },
      {
        id: 'unprepared',
        label: '아직 준비되지 않았음을 인정한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -8 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -8 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -6 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -12 },
        ],
        setFlags: { first_policy_failed: true },
        resultText:
          '"…아직, 생각이 부족했습니다."\n' +
          '궁정이 다시 움직이기 시작했다. 아무도 웃지 않았지만, 아무도 놀라지도 않았다. ' +
          '그게 더 나빴다.\n' +
          '그날 밤 {왕}은 당신에게 아무것도 묻지 않았다. 처음 있는 일이었다.',
      },
    ],
  },
  {
    id: 'teen-noble-check',
    title: '귀족들의 견제',
    text:
      '청원서가 올라왔다. 표면은 예법 문제다 — {왕}의 교육이 "지나치게 한쪽에 치우쳐" ' +
      '있으며, 시학관을 늘려 균형을 잡아야 한다는 것.\n' +
      '이름은 거론되지 않았지만 모두가 당신을 보고 있었다. 당신을 떼어내겠다는 뜻이다.\n' +
      '{왕}이 당신을 한 번 보고, 청원서를 다시 본다.',
    condition: { minAge: 15, resources: { regentSuspicion: { min: 40 } } },
    effects: [{ target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 }],
    priority: 25,
    choices: [
      {
        id: 'refute',
        label: '정면으로 반박하게 한다',
        // ★ 4-C: 반박은 잠그지 않는다. 말문이 막히는 것도 어전에서 벌어지는 일이다.
        tierStat: 'rhetoric',
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: -4 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -4 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 3 },
              { target: { kind: 'stat', key: 'rhetoric' }, amount: 4 },
              { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
            ],
            hint: '말이 아직 여물지 않았다',
            resultText:
              '"경들이 말하는 균형이란, 그러니까, 과인이…"\n' +
              '{왕}은 문장을 끝맺지 못했다. 청원서를 올린 백작이 기다려 주었고, ' +
              '그 기다림이 어전에서 가장 잔인한 것이었다.\n' +
              '섭정공은 끝까지 개입하지 않았다. 그것이 이날의 유일한 자비였다. ' +
              '{왕}은 그날 밤 문답 책을 오래 들여다보았다.',
          },
          {
            min: 26,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: 10 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
              { target: { kind: 'stat', key: 'rhetoric' }, amount: 4 },
            ],
            resultText:
              '"경들이 말하는 균형이란, 과인이 아무것도 배우지 않는 것입니까."\n' +
              '{왕}은 청원서의 문장을 그대로 인용해 되돌려주었다. 문답 훈련에서 수백 번 ' +
              '해본 일이다. 청원서를 올린 백작이 말을 더듬었다.\n' +
              '섭정공은 끝까지 개입하지 않았다. 그리고 그날 이후, 그가 {왕}을 부르는 ' +
              '호칭이 조금 달라졌다.',
          },
        ],
      },
      {
        id: 'yield',
        label: '한발 굽히게 한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -12 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -5 },
        ],
        resultText:
          '{왕}은 시학관을 늘리는 데 동의했다. 새 시학관들은 당신의 수업에 ' +
          '배석하기 시작했고, 밀서를 쓰던 시간은 사라졌다.\n' +
          '대신 아무도 당신을 쫓아내려 하지 않게 되었다. 당분간은.',
      },
    ],
  },
  {
    id: 'teen-missing-eunuch',
    title: '사라진 시종',
    text:
      '연회에서 주워들은 이야기다. 선왕이 승하하던 밤 침실을 지킨 시종이 ' +
      '있었고, 그는 이듬해 봄 남쪽 변경 수비대로 자리를 옮겼다.\n' +
      '거기서 겨울을 넘기지 못했다. 병사(病死)로 기록되었다. 서른둘이었다.\n' +
      '변경으로 보내는 인사는 보통 죄를 지은 자에게 내린다. 그는 아무 죄도 짓지 않았다.',
    condition: { minAge: 15, stats: { courtcraft: { min: 24 } } },
    effects: [
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 4 },
      { target: { kind: 'stat', key: 'courtcraft' }, amount: 3 },
    ],
    setFlags: { clue_witness_gone: true },
    priority: 20,
  },
  {
    id: 'teen-audit-ledger',
    title: '국고의 장부',
    text:
      '{왕}이 재무청의 3년치 장부를 다시 뽑게 했다. 숫자를 읽을 줄 아는 {왕}은 ' +
      '궁정에서 가장 성가신 존재다.\n' +
      '한 항목이 걸린다. 선왕 승하 직후 여섯 달 동안, 명목 없는 지출이 ' +
      '평년의 네 배로 뛰었다. 받은 쪽은 전부 귀족파의 가문들이다.\n' +
      '누군가 그 시기에 사람을 샀다는 뜻이다.',
    condition: { minAge: 15, stats: { finance: { min: 24 } } },
    effects: [{ target: { kind: 'stat', key: 'finance' }, amount: 4 }],
    setFlags: { clue_noble_ledger: true },
    priority: 20,
    choices: [
      {
        id: 'bury',
        label: '덮어둔다',
        effects: [{ target: { kind: 'resource', key: 'regentRapport' }, amount: 8 }],
        hint: '섭정공은 조용히 끝난 감사를 반긴다',
        resultText:
          '{왕}은 장부를 원래 자리에 돌려놓게 했다. 아는 것과 아는 척하는 것은 ' +
          '다르다 — 당신이 가르친 그대로다.\n' +
          '섭정공은 감사가 조용히 끝난 것을 반겼다. 그는 이 아이가 다루기 쉽다고 ' +
          '여기기 시작했다. 그게 이쪽의 이득이다.',
      },
      {
        id: 'report',
        label: '어전 회의에서 밝히게 한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 10 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 6 },
        ],
        resultText:
          '{왕}은 숫자만 읽었다. 누구를 지목하지도, 죄를 묻지도 않았다. ' +
          '그저 "이 여섯 달이 이상합니다"라고만 했다.\n' +
          '회의실이 얼어붙었다. 그날 이후 그 여섯 달을 입에 올리는 자가 없어졌고, ' +
          '누군가는 이 아이가 위험하다고 판단했다.',
      },
    ],
  },
]
