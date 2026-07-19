import type { GameEvent } from '../../types/game'

/**
 * 유년기 아크 (11~13세) — "섭정의 그늘, 애송이 취급"
 * 톤: 무력감, 감시, 첫 관찰. 이 구간에서는 진실 근처에도 가지 못한다.
 * 단서만 조용히 쌓이고, 그중 하나는 9년 뒤에야 의미가 드러난다.
 */
export const YOUTH_EVENTS: GameEvent[] = [
  {
    id: 'youth-archive-night',
    title: '서고의 밤',
    text:
      '선황의 유품을 정리하라는 명이 내려왔다. 군주는 굳이 직접 하겠다고 했다.\n' +
      '밤이 깊도록 서책을 넘기던 아이가 손을 멈춘다. 반포되지 않은 조칙의 초안이다. ' +
      '토지를 다시 나누고, 귀족의 사병을 거두고, 관직의 세습을 끊는다 — 어느 한 줄도 ' +
      '조정이 순순히 받아들였을 리 없는 내용이다.\n' +
      '"아바마마께서는… 이걸 정말로 하려 하셨습니까."',
    condition: { season: 'winter' },
    effects: [{ target: { kind: 'stat', key: 'statecraft' }, amount: 3 }],
    setFlags: { clue_radical_edict: true },
    priority: 20,
    choices: [
      {
        id: 'hide',
        label: '초안을 감춘다',
        effects: [
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 3 },
        ],
        resultText:
          '당신은 초안을 군주의 침소 마루 아래에 넣는다. 아이는 아무것도 묻지 않고 ' +
          '당신을 도왔다. 며칠 뒤 서고의 장서 목록이 새로 작성되었다는 말이 돌았다. ' +
          '누군가 이미 이 방을 뒤진 뒤였다.',
      },
      {
        id: 'show-regent',
        label: '섭정에게 보인다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 8 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
        ],
        resultText:
          '섭정은 초안을 오래 들여다보다가 접었다. "선황께서는 성급하셨습니다. ' +
          '나라는 하루아침에 바뀌지 않지요." 그는 군주의 어깨를 짚으며 말했다. ' +
          '"폐하께서는 그런 실수를 하지 않으실 겁니다."\n' +
          '당신은 초안의 내용을 이미 외워두었다.',
      },
    ],
  },
  {
    id: 'youth-sealed-record',
    title: '덮인 기록',
    text:
      '군주가 어의원에 선황의 마지막 진맥 기록을 청했다. 열두 살짜리가 할 법한 ' +
      '어리광으로 보이도록, 당신이 그렇게 시켰다.\n' +
      '사흘 뒤 돌아온 답은 "해당 기록은 봉함되었사옵니다"였다. 봉함을 명한 것은 ' +
      '섭정이었고, 명분은 "폐하의 심기를 어지럽히지 않기 위함"이었다.\n' +
      '어의원의 늙은 관원이 물러나며 아주 잠깐 군주의 얼굴을 보았다. 그 눈빛이 ' +
      '연민인지 두려움인지 당신은 끝내 판단하지 못했다.',
    condition: { minAge: 12, stats: { statecraft: { min: 25 } } },
    effects: [{ target: { kind: 'resource', key: 'regentSuspicion' }, amount: 5 }],
    setFlags: { clue_sealed_report: true },
    priority: 20,
    choices: [
      {
        id: 'retreat',
        label: '물러난다',
        effects: [{ target: { kind: 'resource', key: 'regentSuspicion' }, amount: -4 }],
        resultText:
          '군주는 더 묻지 않았다. 어린아이가 잊었다고 여겨지는 편이 낫다. ' +
          '다만 그날 밤, 아이는 봉함이라는 두 글자를 종이에 적어 당신에게 보였다가 ' +
          '곧바로 등불에 태웠다.',
      },
      {
        id: 'press',
        label: '계속 캐묻는다',
        effects: [
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 5 },
        ],
        resultText:
          '군주는 사흘 내리 같은 것을 물었다. 넷째 날, 어의원의 늙은 관원이 ' +
          '지방으로 자리를 옮겼다는 통보가 왔다.\n' +
          '아이는 그 소식을 듣고 오래 말이 없다가 당신에게 말했다. ' +
          '"스승님. 제가 물어서 그리 된 것입니까."',
      },
    ],
  },
  {
    id: 'youth-mother-tea',
    title: '모후의 다과',
    text:
      '모후가 군주를 처소로 불렀다. 즉위 이후 처음 있는 사사로운 자리다.\n' +
      '모후는 다정했다. 아이의 키를 재고, 소맷단이 짧아진 것을 나무라고, ' +
      '수라를 남기지 말라 이르고, 당신에게도 고맙다는 말을 잊지 않았다.\n' +
      '완벽한 어머니의 한 시진이었다. 다만 — 아무도 선황을 입에 올리지 않았다.',
    condition: { minAge: 12, flags: { clue_radical_edict: true } },
    effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: 8 }],
    priority: 15,
    choices: [
      {
        id: 'mention-father',
        label: '아버지 이야기를 꺼내게 한다',
        effects: [
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 3 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -5 },
        ],
        setFlags: { clue_mother_calm: true },
        resultText:
          '"어마마마. 아바마마께서는 어떤 분이셨습니까."\n' +
          '모후의 손이 찻잔 위에서 멈췄다. 한 박자. 그리고 웃었다. ' +
          '"훌륭한 분이셨지요. 너무 서두르신 것만 빼면."\n' +
          '그 한 박자를 본 사람은 방 안에 둘뿐이었다. 군주는 눈치채지 못했고, ' +
          '당신은 눈치챘다. 어머니를 잃은 아이의 슬픔이 아니라, 답을 고르는 자의 침묵이었다.',
      },
      {
        id: 'stay-polite',
        label: '예의만 갖추게 한다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 4 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: 5 },
        ],
        resultText:
          '군주는 배운 대로 인사하고 물러났다. 모후는 흡족해했고, 그 말은 ' +
          '섭정의 귀에도 좋게 들어갔다.\n' +
          '돌아오는 길에 아이가 말했다. "어마마마는 편안해 보이셨습니다."\n' +
          '그래. 편안해 보였다. 당신은 그 말에 어쩐지 대답하지 못했다.',
      },
    ],
  },
]
