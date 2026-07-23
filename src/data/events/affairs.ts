import type { GameEvent } from '../../types/game'

/**
 * 정치 현안(state affair) — 새 시스템이 아니라 이벤트의 한 유형이다.
 *
 * 공통 패턴:
 *   "직접 결정한다"  → 국정 영향도 상승. 스탯 요구가 붙고, 결정에는 대가가 따른다.
 *   "섭정공에게 맡긴다" → 국정 영향도 −5, 섭정 의심 −4. 안전한 위임.
 *
 * 위임 선택지는 조건 없이 항상 열린다 — 막다른 길을 만들지 않되 대가를 물린다
 * (「첫 친정」과 동일 원칙).
 *
 * ★ 위임의 의심 감소는 −4 로 통일한다. 활동 「정무를 섭정공께 맡긴다」(1AP, 의심 −6)보다
 *   작아야 현안 위임이 AP 를 아끼는 우회로가 되지 않는다.
 *
 * 배치는 계절을 못박아 흩는다. 나이는 봄에 오르므로 minAge 만 걸면 봄에 몰린다.
 *   변경의 불빛 2년 봄 → 제국의 청구서 4년 가을 → 선왕이 남긴 방 5년 여름
 *
 * 백성에게 미치는 영향은 지표를 만들지 않고 현안별 고유 flag 로만 기록한다.
 * people_burdened_* / people_relieved_* 는 지금 어떤 수치에도 영향을 주지 않는다 —
 * 나중에 개수·조합을 세어 민심·평민 캐릭터·엔딩 판정에 쓸 예약분.
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
      '섭정공은 이미 답을 정해두었다. 다만 오늘은 말하지 않고, {왕}의 입을 본다.',
    // 해빙기 국경 분쟁 — 봄(3월)에 자연스럽게 자리 잡아 1월 클러스터를 피한다.
    condition: { minAge: 13, minYear: 2, month: 3 },
    priority: 25,
    choices: [
      {
        id: 'relief',
        label: '국고를 열어 구호부터 한다',
        requires: { stats: { finance: { min: 15 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: 5 },
        ],
        setFlags: { people_relieved_frontier: true },
        resultText:
          '{왕}은 곡물과 담요를 먼저 내려보냈다. 숫자를 아는 자만 할 수 있는 결정이었다 — ' +
          '곳간이 이번 겨울을 버틸 수 있다는 것을 알고 내린 것이니까.\n' +
          '열흘 뒤 변경에서 올라온 문서에는 사망자 수가 적혀 있었다. 예상보다 적었다. ' +
          '그 차이가 몇 명인지 {왕}은 굳이 세어보았다.',
      },
      {
        id: 'garrison',
        label: '변경에 병력을 보낸다',
        requires: { stats: { martial: { min: 15 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 8 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 10 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -3 },
        ],
        resultText:
          '{왕}은 수비대를 북쪽으로 올렸다. 다시 넘어오지 못하게 하는 것이 결국 가장 값싼 ' +
          '구호라고 했다. 틀린 말은 아니다.\n' +
          '다만 그 겨울, 성벽 앞의 사람들은 스스로 버텨야 했다. 병력이 국경에 닿았다는 ' +
          '소식과 굶어 죽은 자의 수가 같은 날 궁에 도착했다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -4 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
        ],
        setFlags: { people_burdened_frontier: true },
        hint: '섭정공은 익숙한 얼굴로 고개를 끄덕인다',
        resultText:
          '"숙부께 맡기겠습니다." 섭정공은 그 말을 기다렸다는 듯 고개를 끄덕였다. ' +
          '익숙한 얼굴이었다.\n' +
          '처리는 무난했다. 다만 결재가 세 사람의 손을 거치는 동안 구호가 보름 늦었고, ' +
          '그 보름을 변경 사람들이 감당했다. 궁정에서는 아무도 그 이야기를 하지 않았다.',
      },
    ],
  },

  {
    id: 'issue-empire-tribute',
    title: '제국의 청구서',
    category: 'state_affair',
    text:
      '제국의 사절이 왔다. 국경 마을 두 곳에서 벌어진 충돌을 들어 배상을 요구한다. ' +
      '충돌을 만든 쪽이 제국이라는 것은 이 방의 모두가 알고, 사절도 자신이 안다는 것을 ' +
      '숨기지 않는다.\n' +
      '요구액은 3년치 조공에 해당한다. 사절은 그것을 "왕국의 성의"라고 불렀다.\n' +
      '아무도 입 밖에 내지 않는 문장이 하나 있다. 언젠가 이 청구서를 반대 방향으로 ' +
      '내미는 날에 대한 것이다.',
    condition: { minAge: 15, minYear: 4, month: 9 },
    priority: 25,
    choices: [
      {
        // ★ 4-C: 제국의 사절 앞에서 "고를 수 없다"는 없다. 서툴게라도 답해야 한다.
        id: 'garrison',
        label: '국경에 병력을 세운다',
        tierStat: 'martial',
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 2 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -8 },
            ],
            hint: '허세였다',
            resultText:
              '{왕}은 국경에 기를 세우라 명했다. 세울 병력이 얼마나 되는지는 묻지 않았고, ' +
              '아무도 먼저 알려주지 않았다.\n' +
              '사절은 기의 수를 세고 돌아갔다. 그해 겨울 국경은 조용했으나, ' +
              '조용함을 지킨 것이 이쪽의 기는 아니었다.',
          },
          {
            min: 26,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 10 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -5 },
            ],
            resultText:
              '{왕}은 국경에 기를 세웠다. 배상은 없었고, 사절은 웃으며 돌아갔다. ' +
              '웃음의 뜻을 아는 데에는 몇 해가 더 걸릴 것이다.\n' +
              '그해 겨울 국경은 조용했다. 조용한 것이 좋은 징조인지 아닌지는 아무도 말하지 않았다.',
          },
        ],
      },
      {
        id: 'trade',
        label: '조공 대신 교역 조건을 내민다',
        tierStat: 'finance',
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 1 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
              { target: { kind: 'stat', key: 'finance' }, amount: 4 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -4 },
            ],
            hint: '계산이 어긋났다',
            resultText:
              '{왕}은 배상 대신 통행세를 걸자고 했다. 사절은 잠시 셈을 하더니 흔쾌히 받아들였다 — ' +
              '너무 흔쾌해서, 그 자리의 누구도 기뻐하지 못했다.\n' +
              '조건은 이쪽이 내밀었고 이득은 저쪽이 가져갔다. {왕}은 그 장부를 오래 들여다보았다.',
          },
          {
            min: 26,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 8 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
              { target: { kind: 'stat', key: 'finance' }, amount: 4 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -2 },
            ],
            resultText:
              '{왕}은 배상 대신 소금과 철의 통행세를 걸었다. 사절은 계산을 마치고 표정을 고쳤다 — ' +
              '이쪽이 손해가 아니라는 걸 알아차린 얼굴이었다.\n' +
              '제국은 이 왕국에 숫자를 아는 자가 있다는 것을 처음으로 기록했다.',
          },
        ],
      },
      {
        id: 'tribute',
        label: '조공을 바쳐 무마한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -2 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -12 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 2 },
        ],
        setFlags: { people_burdened_empire: true },
        resultText:
          '곳간이 열렸고, 그만큼 다른 곳이 닫혔다. 세 지방의 봄 세금이 앞당겨 걷혔다.\n' +
          '사절이 떠나던 날 {왕}은 성벽에 오르지 않았다. 배웅하지 않아도 되는 것이 ' +
          '그날 {왕}이 지킨 유일한 것이었다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -4 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
        ],
        setFlags: { people_burdened_empire: true },
        hint: '사절은 처음부터 섭정공만 보고 있었다',
        resultText:
          '섭정공이 사절을 맞았고, 협상은 사흘 만에 끝났다. 액수는 줄었다. ' +
          '그가 유능하다는 것은 사실이다.\n' +
          '다만 사절이 {왕}에게 인사한 것은 도착한 날 한 번뿐이었다. 제국은 이 왕국에서 ' +
          '누구와 이야기하면 되는지를 확인하고 돌아갔다.',
      },
    ],
  },

  {
    id: 'issue-house-of-commons',
    title: '선왕이 남긴 방',
    category: 'state_affair',
    text:
      '궁 서편에 방이 하나 있다. 선왕이 세운 하원이다.\n' +
      '영주들의 땅에서 뽑혀 온 평민들이 그 방에 앉아 조세와 부역을 논한다. {왕}이 영주를 ' +
      '거치지 않고 백성과 직접 이어지는 통로 — 그것이 선왕이 이 방을 만든 이유였고, ' +
      '영주들이 이 방을 견딜 수 없는 이유이기도 하다. 중간에 선 자의 권력은 양쪽이 ' +
      '직접 만나는 순간 사라진다.\n' +
      '선왕이 떠난 지 다섯 해, 그 방은 아직 해산되지 않았다. 이번 회기에 귀족들이 ' +
      '해산 동의안을 올렸다. 왕당파는 존속을 청한다.\n' +
      '섭정공은 이번만은 답을 정해두지 않은 얼굴이다. "폐하께서 정하실 일입니다."\n' +
      '그가 처음으로 {왕}에게 결정을 넘겼다. 그것 자체가 시험이다.',
    condition: { minAge: 16, minYear: 5, month: 6 },
    priority: 28,
    choices: [
      {
        id: 'defend-openly',
        label: '어전에서 존속을 선포한다',
        // ★ 4-C: 선포는 하되, 그 말이 궁정에 서는지는 변론에 달렸다.
        //   지키겠다는 뜻 자체는 어느 등급에서도 남는다(house_commons_defended).
        tierStat: 'rhetoric',
        setFlags: { house_commons_defended: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 4 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 25 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -14 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 12 },
              { target: { kind: 'resource', key: 'wellbeing' }, amount: -10 },
            ],
            hint: '말이 서지 않았다',
            resultText:
              '"이 방은… 선왕께서 세우신 것입니다. 그러니 과인은…"\n' +
              '{왕}은 끝을 맺지 못했지만 물러서지도 않았다. 하원은 남았다 — ' +
              '설득당해서가 아니라, 어린 왕이 끝내 고개를 젓는 것을 다들 보았기 때문이다.\n' +
              '그날 궁 서편에서는 아무 소리도 나지 않았다. 다만 섭정공은 그 침묵을 오래 들었다.',
          },
          {
            min: 30,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 15 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 25 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -10 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 12 },
            ],
            setFlags: { people_relieved_commons: true },
            resultText:
              '"이 방은 선왕께서 세우신 것이다. 과인이 지운다면, 과인이 무엇을 물려받았다 ' +
              '하겠는가."\n' +
              '그날 하원의 평민들은 {왕}의 이름을 소리 내어 불렀다. 궁 서편에서 그런 소리가 난 ' +
              '것은 처음이었다.\n' +
              '그리고 그날 이후 {왕}은 아버지가 섰던 자리에 서게 되었다. 그 자리가 어떤 자리였는지는, ' +
              '아버지가 어떻게 되었는지를 보면 안다.',
          },
        ],
      },
      {
        id: 'defend-quietly',
        label: '귀족들을 따로 구슬려 지킨다',
        requires: { stats: { courtcraft: { min: 26 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 12 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 12 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -4 },
          { target: { kind: 'stat', key: 'courtcraft' }, amount: 4 },
        ],
        setFlags: { house_commons_defended: true, people_relieved_commons: true },
        resultText:
          '{왕}은 어전에서 아무 말도 하지 않았다. 대신 동의안에 이름을 올린 백작 셋을 따로 ' +
          '만났다. 하나에게는 아들의 자리를, 하나에게는 묵은 소송의 종결을, 하나에게는 ' +
          '그저 시간을 주었다.\n' +
          '동의안은 표결에 오르지 못하고 흐지부지되었다. 하원은 남았고, 아무도 {왕}이 그것을 ' +
          '지켰다는 것을 알지 못했다.',
      },
      {
        id: 'dissolve',
        label: '하원을 해산한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -3 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -10 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 12 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -10 },
        ],
        setFlags: { house_commons_dissolved: true, people_burdened_commons: true },
        resultText:
          '{왕}은 해산에 서명했다. 손이 떨리지 않았다.\n' +
          '평민들이 방을 비우는 데 이틀이 걸렸다. 그들이 가져온 것은 많지 않았고, ' +
          '가져갈 것은 더 적었다.\n' +
          '그날 밤 {왕}이 물었다. "스승님. 아버님께서는 왜 그 방을 만드셨습니까."\n' +
          '당신은 대답할 수 있었다. 대답하지 않았다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -4 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -3 },
        ],
        setFlags: { house_commons_dissolved: true, people_burdened_commons: true },
        hint: '섭정공의 어깨에서 힘이 빠진다',
        resultText:
          '"숙부께서 정하십시오."\n' +
          '섭정공은 잠깐 {왕}을 보았다. 안도인지 실망인지 알 수 없는 얼굴이었다. ' +
          '어쩌면 둘 다였을 것이다.\n' +
          '방은 그달 안에 비었다. 절차는 흠잡을 데가 없었고, 어디에도 {왕}의 이름은 ' +
          '적히지 않았다.',
      },
    ],
  },
]
