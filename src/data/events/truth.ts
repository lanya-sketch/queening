import type { GameEvent } from '../../types/game'

/**
 * 암살 미스터리 회수 지점.
 *
 * 진실은 코드에 고정되어 있다 — 설계자는 왕대비, 공모자는 그의 오라비인 섭정공,
 * 동기는 선왕의 급진 개혁. 플레이어는 그 진실에 "도달"할 뿐 바꾸지 못한다.
 *
 * 도달 깊이는 두 단계다.
 *   truth_regent_involved   (얕은 진실) — 소년기부터 가능
 *   truth_mother_mastermind (깊은 진실) — 청년기, 얕은 진실을 거쳐야만
 *
 * 두 회수 이벤트에는 maxAge 를 걸지 않는다. 조건을 채웠는데 나이 때문에
 * 영구히 막히는 일이 없어야 한다.
 */
export const TRUTH_EVENTS: GameEvent[] = [
  {
    id: 'truth-shallow-ledger',
    title: '덮인 밤',
    text:
      '봉인된 진료 기록과, 여섯 달 동안 네 배로 뛴 명목 없는 지출.\n' +
      '숫자는 사람보다 정직하다. 돈이 어디로 갔는지 따라가면 누가 무엇을 ' +
      '해주었는지가 나온다 — 그 여섯 달에 값을 치른 항목이 스물셋이고, ' +
      '그중 아홉이 선왕의 침실에 드나들 수 있는 자리였다.\n' +
      '기록을 덮는 데에도, 입을 막는 데에도 값이 든다. 그 값이 여기 적혀 있다.\n' +
      '선왕은 병으로 돌아가시지 않았다. 그리고 그 뒤를 덮은 것은 섭정공과 ' +
      '귀족파의 손이다.\n' +
      '{왕}은 오래 아무 말도 하지 않다가, 아주 조용히 물었다.\n' +
      '"스승님은 언제부터 아셨습니까."',
    // 재정 특화 빌드의 대체 경로.
    // 목격자 단서(궁정처세 35)를 "대신한다" — 함께 요구하면 대체 경로가 아니다.
    condition: {
      minAge: 15,
      stats: { statecraft: { min: 38 } },
      flags: {
        clue_sealed_report: true,
        clue_noble_ledger: true,
        truth_regent_involved: false,
      },
    },
    effects: [{ target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 }],
    setFlags: { truth_regent_involved: true },
    priority: 51,
    choices: [
      {
        id: 'swallow',
        label: '혼자 삼킨다',
        effects: [
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
        ],
        resultText:
          '"아직 아무것도 하지 마십시오. 아는 것이 무기가 되려면, 상대가 ' +
          '내가 안다는 걸 몰라야 합니다."\n' +
          '{왕}은 고개를 끄덕였다. 그날 이후 아이는 섭정공 앞에서 조금 더 ' +
          '어린아이처럼 굴기 시작했다. 당신이 가르치지 않은 것이었다.',
      },
      {
        id: 'probe',
        label: '섭정공을 떠본다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 12 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 15 },
        ],
        hint: '섭정공이 이 아이를 다시 저울에 올린다',
        resultText:
          '{왕}은 변경 수비대에서 죽은 시종 이야기를 지나가듯 꺼냈다. 섭정공은 눈 하나 ' +
          '깜짝하지 않고 애도를 표했고, 젊은 나이의 죽음을 안타까워했다.\n' +
          '완벽했다. 너무 완벽해서, 그가 그 이름을 기억하고 있었다는 사실만 ' +
          '남았다.\n' +
          '그는 이 아이를 다시 평가하기 시작했다. 양쪽 모두에게 그렇다.',
      },
    ],
  },
  {
    id: 'truth-shallow',
    title: '덮인 밤',
    text:
      '봉인된 진료 기록과, 변경 수비대에서 죽은 시종.\n' +
      '두 가지를 나란히 놓기까지 3년이 걸렸다. 하나만으로는 우연이고 ' +
      '둘이면 조치다. 병으로 죽은 사람의 기록을 봉하고, 그 곁을 지킨 자를 ' +
      '치울 이유는 하나뿐이다.\n' +
      '선왕은 병으로 돌아가시지 않았다. 그리고 그 뒤를 덮은 것은 섭정공과 ' +
      '귀족파의 손이다.\n' +
      '{왕}은 오래 아무 말도 하지 않다가, 아주 조용히 물었다.\n' +
      '"스승님은 언제부터 아셨습니까."',
    condition: {
      minAge: 15,
      stats: { statecraft: { min: 45 } },
      flags: {
        clue_sealed_report: true,
        clue_witness_gone: true,
        truth_regent_involved: false,
      },
    },
    effects: [{ target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 }],
    setFlags: { truth_regent_involved: true },
    priority: 50,
    choices: [
      {
        id: 'swallow',
        label: '혼자 삼킨다',
        effects: [
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
        ],
        resultText:
          '"아직 아무것도 하지 마십시오. 아는 것이 무기가 되려면, 상대가 ' +
          '내가 안다는 걸 몰라야 합니다."\n' +
          '{왕}은 고개를 끄덕였다. 그날 이후 아이는 섭정공 앞에서 조금 더 ' +
          '어린아이처럼 굴기 시작했다. 당신이 가르치지 않은 것이었다.',
      },
      {
        id: 'probe',
        label: '섭정공을 떠본다',
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 12 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 15 },
        ],
        hint: '섭정공이 이 아이를 다시 저울에 올린다',
        resultText:
          '{왕}은 변경 수비대에서 죽은 시종 이야기를 지나가듯 꺼냈다. 섭정공은 눈 하나 ' +
          '깜짝하지 않고 애도를 표했고, 젊은 나이의 죽음을 안타까워했다.\n' +
          '완벽했다. 너무 완벽해서, 그가 그 이름을 기억하고 있었다는 사실만 ' +
          '남았다.\n' +
          '그는 이 아이를 다시 평가하기 시작했다. 양쪽 모두에게 그렇다.',
      },
    ],
  },
  {
    id: 'truth-deep',
    title: '어머니의 필적',
    text:
      '왕대비궁의 재고에서 나온 약. 두 달 전부터 시작된 남매의 서찰. ' +
      '그리고 반포되지 못한 칙령 — 봉토를 나누고, 사병을 거두고, 세습을 끊는다.\n' +
      '왕대비의 친정은 그 칙령이 반포되면 사라질 가문이었다.\n' +
      '섭정공은 손이었다. 손을 움직인 것은 그의 누이다.\n' +
      '\n' +
      '{왕}은 서찰 한 통을 끝까지 읽고, 다시 처음부터 읽었다. 열두 살에 ' +
      '받았던 찻잔이 그 방에 다시 놓인 것처럼.\n' +
      '"…어머님의 필적입니다."\n' +
      '당신은 아무 말도 하지 못했다. 9년 동안 이 아이에게 모든 것을 ' +
      '가르쳤지만, 이것을 어떻게 견디는지는 가르친 적이 없다.',
    condition: {
      minAge: 18,
      stats: { rhetoric: { min: 55 } },
      flags: {
        truth_regent_involved: true,
        clue_radical_edict: true,
        clue_mother_letter: true,
        clue_apothecary: true,
      },
    },
    effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: -20 }],
    setFlags: { truth_mother_mastermind: true },
    priority: 60,
    choices: [
      {
        id: 'silence',
        label: '아무에게도 말하지 않는다',
        effects: [
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 15 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
        ],
        setFlags: { truth_kept_silent: true },
        resultText:
          '{왕}은 서찰을 원래 자리에 돌려놓게 했다.\n' +
          '이듬해 알현에서 왕대비는 여전히 아들의 소맷단을 나무랐고, {왕}은 ' +
          '여전히 예를 갖추었다. 아무것도 달라지지 않은 한 시간이었다.\n' +
          '돌아오는 길에 아이가 말했다. "스승님. 저는 오늘 아무렇지 않았습니다."\n' +
          '그 말이 당신은 가장 무서웠다.',
      },
      {
        id: 'confront-regent',
        label: '섭정공에게 들이민다',
        effects: [
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 25 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -15 },
          { target: { kind: 'stat', key: 'rhetoric' }, amount: 5 },
        ],
        setFlags: { truth_confronted_regent: true },
        resultText:
          '{왕}은 섭정공 앞에 서찰을 놓았다.\n' +
          '그는 오래 그것을 보다가, 처음으로 변명하지 않았다. ' +
          '"신은 말렸습니다." 그 한마디가 자백이었다.\n' +
          '"…그리고 말리지 못했습니다."\n' +
          '이제 두 사람 사이에 남은 것은 서로가 무엇을 아는지에 대한 계산뿐이다. ' +
          '숙부와 조카가 아니라, 아는 자와 아는 자로서.',
      },
    ],
  },
]
