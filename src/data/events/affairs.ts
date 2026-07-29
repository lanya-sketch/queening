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
    /**
     * ★ 통치학 통찰 — 이 사태가 선왕의 어느 정책과 얽혔는지 알아챈다.
     *   대응은 재정·무예로 고르되, 통치학은 "왜 이렇게 됐는가"를 읽는다.
     */
    insights: [
      {
        requires: { stats: { statecraft: { min: 24 } } },
        text:
          '변경 수비대를 반으로 줄인 것은 선왕의 칙령이었다. 남는 비용으로 하원을 세웠고, ' +
          '그때 궁정은 그것을 관대함이라 불렀다. 오늘 타 버린 마을 셋은 그 관대함의 ' +
          '뒷면이고, 섭정공이 답을 정해 두고도 {왕}의 입을 보는 이유이기도 하다.',
      },
    ],
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
            hint: '세울 병력을 모른다',
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
            hint: '셈이 아직 여물지 않았다',
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
              // ★ [3] 하원을 지키면 왕당파가 결집한다 — 권세가 오른다(+8).
              { target: { kind: 'resource', key: 'courtStanding' }, amount: 8 },
            ],
            hint: '말이 아직 서지 않는다',
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
              // ★ [3] 하원을 지키면 왕당파가 결집한다 — 권세가 오른다(+8).
              { target: { kind: 'resource', key: 'courtStanding' }, amount: 8 },
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
          // ★ [3] 귀족을 구슬려 지키면 왕당파가 는다 — 권세가 오른다(+8).
          { target: { kind: 'resource', key: 'courtStanding' }, amount: 8 },
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

  // ═══════════════════════════════════════════════════════════════
  // 후반 현안 (17~19세) — "배우는 자리"에서 "결정하는 자리"로.
  //
  // ★ 전반 현안(변경·제국·하원)은 섭정공이 답을 정해두고 왕의 입을 보는 시험이었다.
  //   후반은 **실권(국정 영향도) 게이트**가 핵심이다 — 가장 대담한 "왕으로서의 결정"은
  //   영향도가 문턱을 넘어야 열리고(친정 45 / 정점 70), 못 넘으면 그 선택지가 잠긴 채로
  //   "친정에 닿아야 이걸 할 수 있다"가 보인다. 실권을 쌓는 목적이 후반에 생긴다.
  //
  // ★ 위임은 여전히 조건 없이 열지만(막다른 길 금지) 후반다운 무게를 얹는다:
  //   의심 감소 −4→−2(전반보다 적게), tutorTrust −4, burden flag. 열여덟에도 숨는 왕은
  //   통치를 양보하는 것이라는 대가로.
  //
  // ★ 결과는 nation flag 로 엔딩에 이어진다(empire/crown·lords/late_king).
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'issue-empire-investiture',
    title: '제국의 책봉',
    category: 'state_affair',
    text:
      '제국의 사절이 다시 왔다. 이번에 가져온 것은 청구서가 아니라 문서 한 장 — 책봉장이다.\n' +
      '황제가 {왕}을 제후로 봉한다는 것. 받으면 이 나라는 제국의 신하가 되고, {왕}은 ' +
      '황제의 이름 아래 다스리게 된다. 형식일 뿐이라고 사절은 웃으며 말했다. ' +
      '형식이 곧 전부라는 것을 이 방의 모두가 안다.\n' +
      '3년 전 청구서 때와 다른 점이 하나 있다. 그때는 섭정공이 답을 정해 두었다. ' +
      '오늘 그는 아무 말이 없다 — {왕}이 이제 스스로 설 수 있는지를 본다.',
    /**
     * ★ 통치학 통찰 — 책봉이 무엇을 묶는지 읽는다.
     */
    insights: [
      {
        requires: { stats: { statecraft: { min: 40 } } },
        text:
          '책봉은 군대를 요구하지 않는다. 다만 다음 대의 왕을 황제가 승인하게 만든다 — ' +
          '한 번 무릎을 꿇으면 그 무릎은 후대에 상속된다. 사절이 "형식"이라 부르는 것의 값이 그것이다.',
      },
    ],
    condition: { minAge: 17, minYear: 6, month: 6 },
    priority: 43,
    choices: [
      {
        id: 'defy',
        label: '대등을 선포하고 책봉을 거부한다',
        // ★ 실권 게이트 — 친정(45)에 닿아야 열린다. 못 넘으면 잠긴 채 사유가 보인다.
        //   열린 뒤에도 그 말이 서는지는 변론(tierStat)에 달렸다(4-C).
        requires: { resources: { courtInfluence: { min: 45 } } },
        tierStat: 'rhetoric',
        setFlags: { empire_defied: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 },
              { target: { kind: 'resource', key: 'wellbeing' }, amount: -8 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 8 },
            ],
            hint: '말은 섰으나 손끝이 떨렸다',
            resultText:
              '"이 나라는… 누구의 신하도 아닙니다."\n' +
              '{왕}의 목소리가 조금 흔들렸지만 문장은 끝까지 갔다. 사절은 웃음을 거두고 책봉장을 ' +
              '도로 말았다. 거절은 관철됐다 — 다만 제국은 이 어린 왕을 이제 기억해 두었을 것이다.',
          },
          {
            min: 30,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 14 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 8 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
            ],
            setFlags: { people_relieved_empire: true },
            resultText:
              '"황제께 전하시오. 과인은 제국의 벗이 될 수는 있으나, 신하는 될 수 없다고."\n' +
              '사절이 잠시 {왕}을 다시 보았다. 어린 왕이 아니라 왕을 본 눈이었다.\n' +
              '그날의 말이 국경 너머까지 흘렀고, 백성들은 제 왕이 누구 앞에서도 무릎 꿇지 않았다는 것을 알았다.',
          },
        ],
      },
      {
        id: 'trade',
        label: '책봉을 받되 실리를 챙긴다',
        requires: { stats: { courtcraft: { min: 30 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
          { target: { kind: 'stat', key: 'finance' }, amount: 5 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 4 },
        ],
        setFlags: { empire_submitted: true, people_relieved_empire: true },
        resultText:
          '{왕}은 책봉장에 서명하는 대신 조건을 걸었다 — 국경 관세의 절반, 곡물 교역의 우선권.\n' +
          '형식으로는 무릎을 꿇었고, 실질로는 곳간을 채웠다. 사절은 남는 장사가 아니라고 여겼지만, ' +
          '이미 도장은 찍힌 뒤였다.\n' +
          '아무도 이겼다 하지 않았고, {왕}은 굳이 이겼다 말하지 않았다.',
      },
      {
        id: 'submit',
        label: '책봉을 받는다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -4 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -6 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -6 },
        ],
        setFlags: { empire_submitted: true, people_burdened_empire: true },
        resultText:
          '{왕}은 책봉장에 이름을 올렸다. 사절은 만족했고, 섭정공도 만족했다 — 안전한 선택은 ' +
          '언제나 그를 안심시킨다.\n' +
          '그날 밤 당신은 아이가 오래 창밖을 보는 것을 보았다. 국경 너머 어딘가, 이제 그 위에 ' +
          '다른 왕관이 있었다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        // ★ 후반 무게 — 의심 −2(전반 −4보다 적게) + tutorTrust −4.
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -4 },
        ],
        setFlags: { empire_submitted: true, people_burdened_empire: true },
        hint: '섭정공이 붓을 든다',
        resultText:
          '"숙부께서 정하십시오."\n' +
          '섭정공은 책봉장을 받았다. 절차는 매끄러웠다.\n' +
          '열일곱의 왕이 여전히 숙부의 등 뒤에 선다는 것을, 사절은 문서보다 정확히 읽어 갔다.',
      },
    ],
  },

  {
    id: 'issue-lords-season',
    title: '영주들의 계절',
    category: 'state_affair',
    text:
      '하원이 선 뒤로 영주들이 조용할 리 없었다. 이번 회기에 그들이 들고 온 것은 청원이 아니라 ' +
      '경고다 — 왕관이 조세와 징병을 직접 거두려 하니, 봉토의 오랜 권리가 위태롭다는 것.\n' +
      '영주 연합의 이름으로 열두 개의 인장이 찍힌 문서가 어전에 올랐다. 물러서면 왕은 ' +
      '영주들 위의 영주로 남고, 밀어붙이면 왕관이 나라를 직접 쥔다.\n' +
      '봉건과 중앙집권 — 선왕도 끝내 넘지 못한 선이다. 그 선 앞에 이제 {왕}이 섰다.',
    insights: [
      {
        requires: { stats: { statecraft: { min: 45 } } },
        text:
          '조세권과 징병권은 나라의 두 기둥이다. 그것이 영주의 손에 있는 한 왕은 언제나 ' +
          '열둘의 허락 위에 앉아 있다. 왕관이 그 둘을 거두는 날, 이 나라는 비로소 하나가 된다 — ' +
          '그 하나됨을 열두 영주가 순순히 볼 리 없다는 것이 문제일 뿐.',
      },
    ],
    condition: { minAge: 18, minYear: 7, month: 4 },
    priority: 41,
    choices: [
      {
        id: 'reclaim',
        label: '조세·징병권을 왕관으로 회수한다',
        // ★ 실권 정점 게이트(70) — 가장 유능한 왕만 여는 결정.
        requires: { resources: { courtInfluence: { min: 70 } } },
        tierStat: 'statecraft',
        setFlags: { crown_centralized: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 8 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -12 },
              { target: { kind: 'resource', key: 'wellbeing' }, amount: -8 },
            ],
            hint: '영주들이 물러섰으나 이를 갈았다',
            resultText:
              '{왕}은 회수를 명했다. 영주들은 인장을 거두고 물러났지만, 그 물러섬은 승복이 아니라 ' +
              '계산이었다. 왕관은 두 기둥을 쥐었고, 그 무게에 아직 손이 익지 않았다.',
          },
          {
            min: 40,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 18 },
              { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 12 },
              { target: { kind: 'resource', key: 'regentRapport' }, amount: -14 },
              { target: { kind: 'stat', key: 'statecraft' }, amount: 5 },
            ],
            setFlags: { people_relieved_lords: true },
            resultText:
              '{왕}은 열두 영주를 하나씩 이름으로 불러, 각자의 봉토가 왕관 아래 무엇을 얻고 무엇을 ' +
              '내놓는지를 셈해 보였다. 반박할 자가 없었다.\n' +
              '그날 이 나라는 열두 조각에서 하나가 되었다. 왕관이 처음으로 나라 전체의 무게를 ' +
              '제 손에 느꼈다.',
          },
        ],
      },
      {
        id: 'via-commons',
        label: '하원을 통해 영주를 견제한다',
        // ★ 서사 연쇄 — 16세에 하원을 지켰을 때만 열린다. 없앴으면 이 길이 막혀 있다.
        requires: { flags: { house_commons_defended: true } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 10 },
          { target: { kind: 'stat', key: 'courtcraft' }, amount: 4 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 6 },
        ],
        setFlags: { crown_centralized: true, people_relieved_lords: true },
        resultText:
          '{왕}은 영주들과 직접 부딪지 않았다. 대신 하원의 평민 대표들에게 조세 장부를 열었다.\n' +
          '영주가 얼마를 거두고 얼마를 숨기는지 백성이 알게 되자, 열두 인장의 힘이 소리 없이 빠졌다.\n' +
          '아버지가 남긴 방이, 아버지가 넘지 못한 선을 아들에게 넘겨 주었다.',
      },
      {
        id: 'appease',
        label: '영주들에게 양보한다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -4 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 8 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -6 },
        ],
        setFlags: { lords_restored: true, people_burdened_lords: true },
        resultText:
          '{왕}은 봉토의 권리를 확인하는 칙서에 서명했다. 열두 영주는 만족했고, 궁정은 조용해졌다.\n' +
          '나라는 여전히 열두 조각이다. 다만 그 조각들이 오늘은 왕에게 웃어 보였다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -4 },
        ],
        setFlags: { lords_restored: true, people_burdened_lords: true },
        hint: '영주들이 안도한다',
        resultText:
          '"숙부께서 정하십시오."\n' +
          '섭정공은 영주들과 오래 이야기했다. 그는 그들의 언어를 안다 — 자신도 그중 하나였으니까.\n' +
          '봉토는 지켜졌고, 왕관은 열둘 위에 앉은 채로 남았다.',
      },
    ],
  },

  {
    id: 'issue-late-king',
    title: '선왕의 미완',
    category: 'state_affair',
    text:
      '문서고 깊은 곳에서 선왕의 미완의 칙령 초안이 나왔다. 변경 수비대를 줄여 그 비용으로 ' +
      '하원을 세운 그 정책 — 절반만 완성된 채 선왕이 떠났다.\n' +
      '변경은 그만큼 얇아졌고, 3년 전 국경 마을 셋이 탄 것도 그 얇음의 대가였다. 그러나 ' +
      '하원은 그 대가로 섰고, 백성이 처음으로 왕과 직접 이어졌다.\n' +
      '{왕}은 이제 열아홉, 아버지가 손대다 만 것을 완성할 수도, 되돌릴 수도, 덮어 둘 수도 있다.\n' +
      '아버지가 왜 그 위험을 감수했는지 — 그 답을 아는 사람은 이제 {왕}뿐이다.',
    insights: [
      {
        requires: { stats: { statecraft: { min: 50 } } },
        text:
          '선왕의 도박은 이것이었다: 영주의 군대에 기대는 나라를, 백성에 기대는 나라로 바꾼다. ' +
          '변경을 얇게 한 것은 실수가 아니라 지불이었다. 그 지불을 완성하면 나라의 축이 영영 바뀌고, ' +
          '되돌리면 아버지의 도박은 미완의 실패로 역사에 적힌다.',
      },
    ],
    condition: { minAge: 19, minYear: 8, month: 5 },
    priority: 39,
    choices: [
      {
        id: 'complete',
        label: '선왕의 개혁을 완성한다',
        // ★ 실권 정점 게이트(70). 완성은 정통성(친정 엔딩 재료)으로 남는다.
        requires: { resources: { courtInfluence: { min: 70 } } },
        tierStat: 'statecraft',
        setFlags: { late_king_reform: true },
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 8 },
              { target: { kind: 'resource', key: 'wellbeing' }, amount: -6 },
            ],
            hint: '길은 이었으나 아직 거칠다',
            resultText:
              '{왕}은 아버지의 초안을 마저 그렸다. 완성된 개혁은 거칠었지만, 방향만은 아버지가 ' +
              '가리킨 그대로였다. 미완의 유산이 비로소 한 문장으로 끝맺음을 얻었다.',
          },
          {
            min: 40,
            effects: [
              { target: { kind: 'resource', key: 'courtInfluence' }, amount: 12 },
              { target: { kind: 'resource', key: 'tutorTrust' }, amount: 10 },
              { target: { kind: 'stat', key: 'statecraft' }, amount: 5 },
            ],
            setFlags: { people_relieved_reform: true },
            resultText:
              '{왕}은 변경의 얇음을 백성의 두터움으로 메웠다 — 상비군 대신 향병을, 영주의 징집 대신 ' +
              '하원의 동의를. 아버지가 시작한 나라가, 아들의 손에서 형태를 갖췄다.\n' +
              '그날 당신은 선왕의 초상 앞에 오래 선 아이를 보았다. 이제 그 눈이 아버지를 원망하지 않았다.',
          },
        ],
      },
      {
        id: 'restore-frontier',
        label: '되돌려 변경을 다시 세운다',
        requires: { stats: { martial: { min: 30 } } },
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: 6 },
          { target: { kind: 'stat', key: 'martial' }, amount: 5 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: 4 },
        ],
        setFlags: { late_king_frontier: true, people_relieved_frontier: true },
        resultText:
          '{왕}은 변경 수비대를 다시 채웠다. 국경 마을은 다시 병사의 그림자 아래 잠들었고, ' +
          '아버지가 얇게 만든 선이 두꺼워졌다.\n' +
          '하원의 재정은 그만큼 줄었다. 아버지의 도박을 접는 대신, {왕}은 나라를 다시 단단한 ' +
          '옛 모양으로 되돌렸다. 안전한 모양이었다.',
      },
      {
        id: 'leave',
        label: '덮어 둔다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -2 },
          { target: { kind: 'resource', key: 'wellbeing' }, amount: -2 },
        ],
        resultText:
          '{왕}은 초안을 도로 문서고에 넣었다. 완성할 만큼 확신이 서지 않았고, 되돌릴 만큼 ' +
          '단념하지도 못했다.\n' +
          '미완은 미완인 채로 남았다. 언젠가 다른 손이 이것을 다시 꺼낼 것이다 — 그것이 ' +
          '{왕}의 손이 아닐 수도 있다는 것을, 아이도 어렴풋이 알았다.',
      },
      {
        id: 'delegate',
        label: '섭정공에게 맡긴다',
        effects: [
          { target: { kind: 'resource', key: 'courtInfluence' }, amount: -6 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: -2 },
          { target: { kind: 'resource', key: 'regentRapport' }, amount: 5 },
          { target: { kind: 'resource', key: 'tutorTrust' }, amount: -4 },
        ],
        setFlags: { late_king_frontier: true },
        hint: '섭정공이 초안을 덮는다',
        resultText:
          '"숙부께서 정하십시오."\n' +
          '섭정공은 초안을 잠깐 들여다보더니 변경 쪽으로 손을 들었다. 그에게 백성의 방보다 ' +
          '영주의 군대가 익숙했다.\n' +
          '선왕의 미완은 선왕의 실패로 정리되었다. 아들의 이름으로.',
      },
    ],
  },
]
