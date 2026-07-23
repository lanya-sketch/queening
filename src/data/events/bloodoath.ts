import type { Choice, GameEvent } from '../../types/game'

/**
 * 혈서 반쪽 — 확증 루트 (M2b-3c-1).
 *
 * ★★ 이 파일의 가장 중요한 성질은 **의존이 단방향**이라는 것이다.
 *
 *   진실(clue_* / truth_*)  ──읽기만──▶  혈서(blood_oath_* / queen_* / hint_*)
 *
 *   여기 있는 어떤 이벤트도 clue_* 나 truth_* 를 setFlags 하지 않는다.
 *   기존 22개 이벤트 중 어떤 것도 여기서 만든 flag 를 condition 으로 읽지 않는다.
 *   → 이 파일을 통째로 삭제해도 기존 미스터리 도달 조건은 글자 하나 바뀌지 않는다.
 *   (verify:bloodoath 의 A 절이 이 성질을 코드로 대조한다)
 *
 * 설계의 핵심은 **"안다 ≠ 증명할 수 있다"** 이다.
 * 깊은 진실(truth_mother_mastermind)은 혈서 없이 기존 경로로 그대로 도달한다.
 * 혈서는 그 앎을 물증으로 바꾸는 별개의 축이고, 실패해도 앎은 남는다.
 */

// ── 상태 flag
export const BLOOD_OATH = {
  halfMonarch: 'blood_oath_half_monarch',
  halfHeir: 'blood_oath_half_heir',
  complete: 'blood_oath_complete',
} as const

export const CHAMBER = {
  hint: 'hint_queen_chamber',
  searched: 'queen_chamber_searched',
  /**
   * ★ 두 선택지가 공통으로 세우는 flag. 발각 판정의 진입 조건이다.
   *
   *   이게 없으면 발각이 **선택보다 먼저** 터진다 — 수색 이벤트가 setFlags 로
   *   queen_chamber_searched 를 세우는 건 턴 종료 시점이지만, 선택지 flag 는
   *   플레이어가 화면에서 고를 때(그 뒤) 세워진다. 그 사이에 턴 예산이 남아 있으면
   *   같은 턴의 재평가에서 발각이 조건을 만족해 버린다.
   *   (시뮬 H 빌드가 실제로 이 순서로 발각당해 잡혔다)
   */
  attempted: 'chamber_attempted',
  attemptHide: 'chamber_attempt_hide',
  attemptTalk: 'chamber_attempt_talk',
  resolved: 'chamber_resolved',
  alertMax: 'queen_alert_max',
  poisonPath: 'queen_poison_path',
} as const

/**
 * 침실 수색의 궁정처세 요구.
 *
 * ★ 선행 조건인 clue_apothecary(왕대비궁의 약재)가 이미 궁정처세 55 를 요구한다.
 *   그래서 요구치를 55 이하로 잡으면 실마리가 **아무것도 낮추지 못하는 장식**이 된다.
 *   실마리 있음 = 선행 조건 이상 아무것도 필요 없음(55),
 *   실마리 없음 = 13 을 더 쌓아야 함(68). 이래야 보조가 보조로 작동한다.
 */
const COURTCRAFT_PLAIN = 60
const COURTCRAFT_HINTED = 30

/** 발각당한 뒤 빠져나가는 체크. 진입은 궁정처세지만 탈출은 스탯을 고를 수 있다. */
const ESCAPE_COURTCRAFT = 40
const ESCAPE_RHETORIC = 35

/** 수색에 진입할 수 있는 공통 조건. 두 벌로 나뉘는 건 궁정처세 요구뿐이다. */
const searchBase = {
  minAge: 17,
  flags: {
    clue_apothecary: true,
    [CHAMBER.searched]: false,
    [BLOOD_OATH.halfMonarch]: false,
  },
}

const searchChoices: Choice[] = [
  {
    id: 'hide',
    label: '숨는다',
    setFlags: { [CHAMBER.attempted]: true, [CHAMBER.attemptHide]: true },
    hint: '몸을 숨기고 발소리가 지나가기를 기다린다',
    resultText:
      '{왕}은 휘장 뒤로 물러섰다. 숨을 멈추는 법은 가르친 적이 없는데도 알고 있었다.\n' +
      '발소리가 방 안을 한 바퀴 돌았다. 그리고 멈췄다.',
  },
  {
    id: 'talk',
    label: '둘러댄다',
    setFlags: { [CHAMBER.attempted]: true, [CHAMBER.attemptTalk]: true },
    hint: '먼저 걸어 나가 말로 상황을 만든다',
    resultText:
      '{왕}은 오히려 휘장 밖으로 걸어 나갔다. 놀란 쪽은 시녀였다.\n' +
      '"…어머님께 드릴 말씀이 있어 기다리고 있었다."\n' +
      '거짓말은 빠를수록 좋고, 그보다 좋은 것은 먼저 하는 것이다.',
  },
]

export const BLOOD_OATH_EVENTS: GameEvent[] = [
  // ── ② 의 실마리. 말리던 사람이 처음으로 등을 떠민다.
  {
    id: 'loyalist-chamber-hint',
    title: '길을 터 두었습니다',
    sceneId: 'scene-loyalist-hint',
    text: '충신 가문의 딸이 처음으로, 말리는 대신 길을 알려주었다.',
    condition: {
      minAge: 16,
      affection: { loyalist: { min: 45 } },
      flags: { romance_unlocked: true, [CHAMBER.hint]: false },
    },
    setFlags: { [CHAMBER.hint]: true },
  },

  // ── 군주 반쪽: 침실 수색. 실마리 유무로 두 벌 (truth-shallow / -ledger 와 같은 패턴)
  {
    id: 'chamber-search',
    title: '달이 없는 밤',
    sceneId: 'scene-chamber-search',
    text: '{왕}은 왕대비궁 침전에 들었다. 그리고 발소리를 들었다.',
    condition: { ...searchBase, stats: { courtcraft: { min: COURTCRAFT_PLAIN } } },
    setFlags: { [CHAMBER.searched]: true },
    choices: searchChoices,
  },
  {
    id: 'chamber-search-hinted',
    title: '달이 없는 밤',
    sceneId: 'scene-chamber-search',
    text: '{왕}은 왕대비궁 침전에 들었다. 그리고 발소리를 들었다.',
    condition: {
      ...searchBase,
      stats: { courtcraft: { min: COURTCRAFT_HINTED } },
      flags: { ...searchBase.flags, [CHAMBER.hint]: true },
    },
    setFlags: { [CHAMBER.searched]: true },
    choices: searchChoices,
  },

  // ── 발각 판정. 선택지 flag 는 이벤트 화면에서 세워지므로 다음 계절에 회수된다.
  {
    id: 'chamber-escape-hide',
    title: '지나간 발소리',
    text:
      '발소리는 침상 앞에서 오래 머물다가, 결국 돌아 나갔다.\n' +
      '{왕}이 휘장에서 나왔을 때 손에는 봉함이 뜯긴 것 하나가 들려 있었다.\n' +
      '반으로 찢긴 종이. 붉은 글씨. 남은 절반이 어디 있는지는 적혀 있지 않았다.',
    condition: {
      flags: { [CHAMBER.attemptHide]: true, [CHAMBER.resolved]: false },
      stats: { courtcraft: { min: ESCAPE_COURTCRAFT } },
    },
    setFlags: { [CHAMBER.resolved]: true, [BLOOD_OATH.halfMonarch]: true },
    effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: -12 }],
  },
  {
    id: 'chamber-escape-talk',
    title: '먼저 한 거짓말',
    text:
      '시녀는 끝내 왕대비를 부르지 못했다. {왕}이 먼저 꾸짖었기 때문이다 — ' +
      '어찌 왕의 앞을 막느냐고.\n' +
      '소맷단 안에서 종이가 접히는 소리가 났지만 아무도 듣지 못했다.\n' +
      '반으로 찢긴 종이. 붉은 글씨. 남은 절반이 어디 있는지는 적혀 있지 않았다.',
    condition: {
      flags: { [CHAMBER.attemptTalk]: true, [CHAMBER.resolved]: false },
      stats: { rhetoric: { min: ESCAPE_RHETORIC } },
    },
    setFlags: { [CHAMBER.resolved]: true, [BLOOD_OATH.halfMonarch]: true },
    effects: [{ target: { kind: 'resource', key: 'wellbeing' }, amount: -12 }],
  },
  {
    /**
     * 위 둘 중 어느 것도 조건을 못 채우면 여기로 떨어진다(우선순위가 더 낮다).
     *
     * ★ 대가의 성격: 스탯을 깎지 않고, 진실 도달을 취소하지 않고, 게임을 끝내지 않는다.
     *   잃는 것은 시간과 여유다. queen_poison_path 는 이번 단계에서 **아무도 읽지 않는
     *   순수한 씨앗**이라 지속 손해가 없다 — M3 가 여기서 이어받는다.
     */
    id: 'chamber-caught',
    title: '들켰다',
    sceneId: 'scene-chamber-caught',
    text: '왕대비는 소리를 지르지 않았다. 그편이 훨씬 나빴다.',
    // ★ searched 가 아니라 attempted 를 본다 — 플레이어가 탈출 방법을 고른 **뒤에만**
    //   판정이 열린다. searched 로 두면 선택 전에 발각이 먼저 터진다.
    condition: {
      flags: { [CHAMBER.attempted]: true, [CHAMBER.resolved]: false },
    },
    setFlags: {
      [CHAMBER.resolved]: true,
      [CHAMBER.alertMax]: true,
      [CHAMBER.poisonPath]: true,
    },
    effects: [
      { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 25 },
      { target: { kind: 'resource', key: 'wellbeing' }, amount: -30 },
      { target: { kind: 'resource', key: 'courtInfluence' }, amount: -8 },
    ],
  },

  // ── 나머지 반쪽: 로맨스 경로가 먼저 제시된다(되돌릴 수 없는 적대보다 앞).
  {
    id: 'half-heir-romance',
    title: '세 번째 궤',
    sceneId: 'scene-heir-confession',
    text: '섭정공의 아들이 제 아버지의 서고를 말했다.',
    condition: {
      minAge: 17,
      affection: { heir: { min: 70 } },
      flags: { heir_knows_truth: true, [BLOOD_OATH.halfHeir]: false },
    },
    setFlags: { [BLOOD_OATH.halfHeir]: true, blood_oath_given: true },
  },
  {
    /**
     * 적대 경로. **되돌릴 수 없는 결렬**이라 안전장치를 세 겹 건다:
     *   1) 영향도 45 이상 — 실제로 강행할 힘이 있어야 한다
     *   2) 신망 55 이하 — 회유 트랙을 달리는 플레이어에게는 아예 뜨지 않는다
     *   3) 선택지로 옵트인 — 떠도 "물러난다"로 아무 일 없이 지나갈 수 있다
     * 2) 가 없으면 회유 빌드가 원치 않게 regent_hostile 을 맞아 D 빌드가 깨진다.
     */
    id: 'half-heir-hostile',
    title: '가문 수색',
    condition: {
      minAge: 17,
      resources: { courtInfluence: { min: 35 }, regentRapport: { max: 55 } },
      flags: {
        regent_alliance: false,
        regent_won_over: false,
        [BLOOD_OATH.halfHeir]: false,
      },
    },
    text:
      '섭정공의 저택을 수색할 명분은 이미 충분하다. 문제는 명분이 아니라 그 다음이다.\n' +
      '한 번 위병을 보내면 숙부와 조카로 돌아갈 길은 없다.',
    choices: [
      {
        id: 'raid',
        label: '수색을 강행한다',
        setFlags: {
          [BLOOD_OATH.halfHeir]: true,
          blood_oath_seized: true,
          regent_hostile: true,
        },
        effects: [
          { target: { kind: 'resource', key: 'regentRapport' }, amount: -25 },
          { target: { kind: 'resource', key: 'regentSuspicion' }, amount: 20 },
        ],
        hint: '숙부와 조카로 돌아갈 길이 닫힌다',
        resultText:
          '위병들이 문을 부수는 동안 그는 마당에 서 있었다. 막지 않았고, 보지도 않았다.\n' +
          '궤가 실려 나갈 때 단 한 번 {왕}을 보았다. 원망은 없었다. 그것이 더 나빴다.\n' +
          '반으로 찢긴 종이. 붉은 글씨. 이제 두 조각이 한자리에 있다.',
      },
      {
        id: 'withdraw',
        label: '물러난다',
        resultText:
          '{왕}은 위병을 물렸다. 아직은 아니다 — 라고 스스로에게 말했지만, ' +
          '아직이 언제까지인지는 아무도 몰랐다.',
      },
    ],
  },

  // ── 합체 = 확증
  {
    id: 'blood-oath-complete',
    title: '맞춰진 반쪽',
    sceneId: 'scene-blood-oath-complete',
    text: '두 조각의 찢긴 자리가 맞았다.',
    condition: {
      flags: {
        [BLOOD_OATH.halfMonarch]: true,
        [BLOOD_OATH.halfHeir]: true,
        [BLOOD_OATH.complete]: false,
      },
    },
    setFlags: { [BLOOD_OATH.complete]: true },
  },
]
