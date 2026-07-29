import type { Effect, GameEvent, ResourceKey } from '../../types/game'
import { RISK } from '../config'
import { DEAD_END } from '../../systems/deadend'
import { RISK_STRAIN, RISK_EXPOSURE, RISK_TUTOR } from '../../systems/risk'
import { RISK_REBELLION } from '../../systems/rebellion'

/**
 * 깜짝 이벤트 + 조기 데드엔딩 (월 단위 전환 2단계).
 *
 * ★ 데드엔딩 파이프라인: 위험 누적(systems/risk.ts) → 경고(먼저) → 데드 위기(회피 1회).
 *   원칙 "가혹하되 좌절 아닌" 을 세 겹으로 지킨다:
 *     1) **누적** — 방치가 지속돼야만 문턱에 닿는다(RISK.*Dead 는 느슨하게 높다).
 *     2) **경고 선행** — RISK.*Warn 에서 서술로 신호한다("위태롭다").
 *     3) **회피 1회** — 데드 위기에서 수치를 충족하면 마지막 저항으로 넘긴다.
 *   구조만 세우는 단계라 문턱은 느슨하다 — 관리형 정상 플레이는 거의 닿지 않는다.
 *
 * ★ 데드는 20세 전(maxAge 19)에만. 20세는 정식 엔딩이라 경계가 겹치지 않는다.
 *   데드 이벤트의 succumb 선택지가 dead_end:<이유> flag 를 세우면, 다음 턴 잠금 →
 *   'ended' → EndedScreen 이 손으로 쓴 데드 씬을 재생한다(judgeEnding 우회).
 */

const res = (key: ResourceKey, amount: number): Effect =>
  ({ target: { kind: 'resource', key }, amount })
const zeroCounter = (key: string): Effect =>
  ({ target: { kind: 'counter', key }, amount: -99 })

export const SURPRISE_EVENTS: GameEvent[] = [
  // ────────────────────────────────────────────────
  // 심신 파탄 — 경고 → 데드
  // ────────────────────────────────────────────────
  {
    id: 'strain-warning',
    title: '위태로운 낯빛',
    text:
      '어린 왕의 얼굴에서 핏기가 가셨다. 스승이 손목을 짚어 보고는 말을 잇지 못했다.\n' +
      '"전하… 이러다 몸이 상하십니다. 무리를 멈추셔야 합니다."\n' +
      '경고는 분명했다. 못 들은 척하는 것은 이제 왕의 몫이다.',
    condition: { maxAge: 19, counters: { [RISK_STRAIN]: { min: RISK.strainWarn } } },
    once: true,
    category: 'story',
    setFlags: { strain_warned: true },
  },
  {
    id: 'strain-collapse',
    title: '쓰러진 아침',
    text:
      '조회에 나서던 왕이 섬돌 앞에서 무너졌다. 시종들이 달려들고, 어의가 불려 왔다.\n' +
      '오래 방치된 몸이 마침내 주저앉은 것이다. 여기서 갈린다.',
    // maxAge 19 · strain 이 데드 문턱을 넘고, 아직 넘기지 않았을 때.
    condition: {
      maxAge: 19,
      counters: { [RISK_STRAIN]: { min: RISK.strainDead } },
      flags: { strain_averted: false },
    },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'rest',
        label: '스승이 억지로 자리에 눕힌다 — 요양한다',
        // ★ 회피 1회: 가정교사를 깊이 신뢰할 때(신망 50+)만 열린다.
        //   잘 돌본 관계가 아이를 붙든다. 미달이면 이 선택지는 잠긴다.
        requires: { resources: { tutorTrust: { min: 50 } } },
        effects: [res('wellbeing', 35), zeroCounter(RISK_STRAIN)],
        setFlags: { strain_averted: true },
        resultText:
          '스승이 정사를 미루고 왕을 뉘였다. 여러 날 앓았으나, 다시 눈을 떴다.\n'
          + '"살아 계셔서… 그거면 됩니다." 무리는 여기서 멈춘다.',
        hint: '위기를 넘긴다',
      },
      {
        id: 'succumb',
        label: '그래도 멈추지 않는다',
        setFlags: { [DEAD_END.strain]: true },
        resultText: '왕은 일어나려 했다. 그리고 다시 쓰러졌다. 이번에는 일어나지 못했다.',
      },
    ],
  },

  // ────────────────────────────────────────────────
  // 의심 무방비 — 경고 → 데드
  // ────────────────────────────────────────────────
  {
    id: 'exposure-warning',
    title: '드리운 그림자',
    text:
      '섭정공의 사람들이 부쩍 늘었다. 왕의 처소 앞을 지키는 얼굴이 낯설다.\n' +
      '지켜 줄 실권도, 등을 맡길 이도 없이 의심만 키운 대가가 코앞에 있다.',
    condition: { maxAge: 19, counters: { [RISK_EXPOSURE]: { min: RISK.exposureWarn } } },
    once: true,
    category: 'story',
    setFlags: { exposure_warned: true },
  },
  {
    id: 'exposure-strike',
    title: '한밤의 발소리',
    text:
      '자정이 지나 처소의 문이 소리 없이 열렸다. 섭정이 먼저 움직였다.\n' +
      '무방비하게 키운 의심이 마침내 칼이 되어 돌아왔다. 여기서 갈린다.',
    condition: {
      maxAge: 19,
      counters: { [RISK_EXPOSURE]: { min: RISK.exposureDead } },
      flags: { exposure_averted: false },
    },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'fight',
        // ★ 회피 A: 무예로 자객을 물리친다.
        label: '몸을 날려 자객을 물리친다',
        requires: { stats: { martial: { min: 28 } } },
        effects: [res('regentSuspicion', -20), zeroCounter(RISK_EXPOSURE)],
        setFlags: { exposure_averted: true },
        resultText:
          '왕은 등불을 내던지고 칼을 잡았다. 짧고 사나운 소란 끝에 자객이 물러났다.\n'
          + '섭정은 한발 물러섰다 — 이 아이는 만만치 않다.',
        hint: '위기를 넘긴다',
      },
      {
        id: 'suppress',
        // ★ 회피 B: 실권으로 눌러낸다.
        label: '조정의 힘을 불러 섭정을 눌러낸다',
        requires: { resources: { courtInfluence: { min: 30 } } },
        effects: [res('regentSuspicion', -15), zeroCounter(RISK_EXPOSURE)],
        setFlags: { exposure_averted: true },
        resultText:
          '왕이 손짓하자 회랑 곳곳에서 왕의 사람들이 나타났다. 섭정의 손발이 굳었다.\n'
          + '실권은 이런 밤을 위한 것이었다.',
        hint: '위기를 넘긴다',
      },
      {
        id: 'succumb',
        label: '아무도 오지 않는다',
        setFlags: { [DEAD_END.exposure]: true },
        resultText: '왕은 소리쳤으나 복도는 비어 있었다. 발소리가 가까워졌다.',
      },
    ],
  },

  // ────────────────────────────────────────────────
  // 튜터 해고 — 경고 → 데드 (★ 왕이 아니라 내가 쫓겨난다)
  // ────────────────────────────────────────────────
  {
    id: 'tutor-warning',
    title: '지켜보는 눈',
    text:
      '늙은 왕당파 귀족이 조용히 스승을 따로 불렀다.\n' +
      '"섭정공이 요즘 당신을 자주 입에 올리오. 어디에 다녀오는지, 무엇을 아이 귀에 넣는지." ' +
      '그가 목소리를 낮췄다. "…조심하시오. 이 궁에서 쫓겨난 스승이 당신이 처음은 아니오."\n' +
      '경고는 분명했다. 무릅쓸지 말지는 이제 당신의 몫이다.',
    condition: { maxAge: 19, counters: { [RISK_TUTOR]: { min: RISK.tutorWarn } } },
    once: true,
    category: 'story',
    setFlags: { tutor_warned: true },
  },
  {
    id: 'tutor-dismissal',
    title: '닫히는 문',
    text:
      '섭정공이 스승을 불렀다. 왕은 그 자리에 없었다 — 그것부터가 답이었다.\n' +
      '"수고 많으셨소. 다만 전하께는 이제 다른 스승이 필요할 듯하오." 문서 한 장이 놓였다. ' +
      '가정교사의 소임을 거둔다는, 이미 서명된 문서.\n' +
      '여기서 갈린다.',
    condition: {
      maxAge: 19,
      counters: { [RISK_TUTOR]: { min: RISK.tutorDead } },
      flags: { tutor_averted: false },
    },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'king-vouches',
        label: '왕이 문을 막아선다',
        // ★ 회피 1회: 잘 돌본 관계(신뢰 50+)일 때만 왕이 직접 스승을 감싼다.
        //   심신파탄의 신뢰 회피와 같은 계열 — 관계가 사람을 붙든다.
        requires: { resources: { tutorTrust: { min: 50 } } },
        effects: [{ target: { kind: 'counter', key: RISK_TUTOR }, amount: -99 }],
        setFlags: { tutor_averted: true },
        hint: '위기를 넘긴다',
        resultText:
          '문이 열리고 왕이 들어섰다. 아직 어린 왕이, 숙부 앞에 서서 고개를 젓는다.\n' +
          '"이 사람은 과인의 스승입니다. 과인이 놓지 않겠습니다."\n' +
          '섭정공은 문서를 거두었다. 오늘은. 그 아이가 스승을 놓지 않았다.',
      },
      {
        id: 'dismissed',
        label: '문서를 받아 든다',
        setFlags: { [DEAD_END.tutor]: true },
        resultText:
          '스승은 문서를 받았다. 달리 할 수 있는 것이 없었다.',
      },
    ],
  },

  // ────────────────────────────────────────────────
  // ★ [3] 반란 모의 — 경고 → 반란(진압/폐위). 친정 후에만(risk.ts 가 친정 후 의심을 여기로 쌓는다).
  // ────────────────────────────────────────────────
  {
    id: 'rebellion-warning',
    title: '술렁이는 조정',
    text:
      '밀려난 섭정공의 처소에 밤마다 사람이 든다고 했다. 옛 영주들의 이름이 그 방을 오간다.\n' +
      '이겼다 여긴 자리 밑에서 다른 판이 짜이고 있었다. 아직 늦지 않았다 — 지금이라면.',
    condition: { maxAge: 19, counters: { [RISK_REBELLION]: { min: RISK.rebellionWarn } } },
    once: true,
    category: 'story',
    setFlags: { rebellion_warned: true },
  },
  {
    // ★ [3] 암살 — 반란(세력)보다 먼저 오는 개인 노림. 반란 모의 중간(assassinAt)에 자객이 온다.
    //   회피는 운이 아니라 대비 — 다섯 중 하나라도 갖추면 살고(증거까지 얻고), 아무것도 없으면 죽는다.
    //   ★ 상태(의심·영향도)는 안 건드린다 — 반란 모의는 계속되고, 반란은 별도로 나중에 온다.
    id: 'assassination-attempt',
    title: '어둠 속의 칼',
    text:
      '반란이 판을 갖추기 전에, 밀려난 자는 더 조용한 길을 먼저 시험했다.\n' +
      '깊은 밤 침소로 통하는 회랑에 낯선 그림자가 들었다. 칼끝이 달빛을 되쏘았다.',
    condition: {
      maxAge: 19,
      counters: { [RISK_REBELLION]: { min: RISK.assassinAt } },
      flags: { assassin_resolved: false },
    },
    once: true,
    category: 'story',
    choices: [
      {
        id: 'evade-martial',
        label: '몸을 틀어 칼을 쳐낸다',
        requires: { stats: { martial: { min: 40 } } },
        setFlags: { assassin_resolved: true, assassin_evaded: true, assassin_evidence: true },
        hint: '자객을 제압한다',
        resultText:
          '{왕}의 손이 먼저 움직였다. 짧은 다툼 끝에 자객은 제압되어 바닥에 눌렸다.\n' +
          '그 품에서 나온 밀지 한 장 — 누가 이 칼을 보냈는지, 글씨가 말해 주고 있었다.',
      },
      {
        id: 'evade-courtcraft',
        label: '낌새를 미리 읽어 자리를 비운다',
        requires: { stats: { courtcraft: { min: 45 } } },
        setFlags: { assassin_resolved: true, assassin_evaded: true, assassin_evidence: true },
        hint: '함정을 피한다',
        resultText:
          '{왕}은 그날따라 침소를 비웠다. 궁의 공기가 달랐고, 그것을 읽는 눈이 있었다.\n' +
          '빈 방에 든 자객은 위병들에게 붙잡혔고, 그가 지녔던 문서가 남았다.',
      },
      {
        id: 'evade-military',
        label: '경호가 앞을 막는다',
        requires: { flags: { military_route_open: true } },
        setFlags: { assassin_resolved: true, assassin_evaded: true, assassin_evidence: true },
        hint: '군이 지킨다',
        resultText:
          '왕을 따르는 군의 경호가 회랑을 지키고 있었다. 자객은 문턱도 넘지 못했다.\n' +
          '사로잡힌 자의 입은 끝내 열리지 않았지만, 그 몸에 새겨진 문장이 대신 말했다.',
      },
      {
        id: 'evade-tutor',
        label: '스승이 먼저 알아챈다',
        requires: { resources: { tutorTrust: { min: 60 } } },
        setFlags: { assassin_resolved: true, assassin_evaded: true, assassin_evidence: true },
        hint: '곁을 지킨 이가 막는다',
        resultText:
          '가장 오래 곁을 지킨 이가 그 밤의 이상을 먼저 알아챘다. 당신은 아이를 다른 방으로 옮겼다.\n' +
          '헛되이 든 칼은 자객과 함께 붙잡혔고, 그가 지녔던 밀지가 남았다.',
      },
      {
        id: 'evade-standing',
        label: '궁정의 눈이 접근을 막는다',
        requires: { flags: { court_backing: true } },
        setFlags: { assassin_resolved: true, assassin_evaded: true, assassin_evidence: true },
        hint: '조정이 지킨다',
        resultText:
          '조정에 왕의 눈이 너무 많았다. 낯선 그림자는 회랑에 들기도 전에 여럿의 눈에 걸렸다.\n' +
          '사람을 모은 왕은, 그 사람들 덕에 이 밤을 알기도 전에 넘겼다. 붙잡힌 자가 증거를 남겼다.',
      },
      {
        id: 'succumb',
        label: '막을 것이 없다',
        setFlags: { [DEAD_END.assassination]: true, assassin_resolved: true },
        resultText:
          '칼을 막을 손도, 낌새를 읽을 눈도, 앞을 가릴 사람도 없었다.\n' +
          '실권은 왕을 왕좌에 앉혔지만, 왕을 지켜 주지는 못했다. 회랑의 달빛만이 그 밤을 보았다.',
      },
    ],
  },
  {
    id: 'rebellion-strike',
    title: '들이닥친 밤',
    text:
      '기어이 그 밤이 왔다. 성문이 안에서 열리고, 낯익은 문장을 단 병사들이 회랑으로 밀려들었다.\n' +
      '밀려났던 자가 마지막 판을 걸었다. 실권 위에 세운 옥좌를, 무엇으로 지킬 것인가.',
    condition: {
      maxAge: 19,
      counters: { [RISK_REBELLION]: { min: RISK.rebellionDead } },
      flags: { rebellion_averted: false },
    },
    once: true,
    category: 'story',
    // ★ 낮추는 수단이 여럿 — 하나라도 갖췄으면 진압한다(막으면 엔딩에 흔적). 아무것도 없으면 폐위.
    choices: [
      {
        id: 'suppress-military',
        label: '군을 풀어 반란을 짓밟는다',
        requires: { flags: { military_route_open: true } },
        effects: [res('regentSuspicion', -30), zeroCounter(RISK_REBELLION)],
        setFlags: { rebellion_averted: true, rebellion_crushed: true },
        hint: '반란을 진압한다',
        resultText:
          '왕의 군이 회랑을 메웠다. 반란은 새벽을 넘기지 못했다.\n'
          + '군을 쥐고 있던 왕에게, 이런 밤은 오히려 명분이 되었다.',
      },
      {
        id: 'suppress-people',
        label: '백성을 불러 성문을 되막는다',
        requires: { flags: { people_favor: true } },
        effects: [res('regentSuspicion', -30), zeroCounter(RISK_REBELLION)],
        setFlags: { rebellion_averted: true, rebellion_crushed: true },
        hint: '반란을 진압한다',
        resultText:
          '종이 울리자 저잣거리가 성문 앞을 메웠다. 귀족의 병사들은 백성의 벽 앞에 멈췄다.\n'
          + '왕을 지킨 것은 왕의 군이 아니라 왕의 백성이었다.',
      },
      {
        id: 'suppress-commons',
        label: '하원을 불러 왕의 편에 세운다',
        requires: { flags: { house_commons_defended: true } },
        effects: [res('regentSuspicion', -30), zeroCounter(RISK_REBELLION)],
        setFlags: { rebellion_averted: true, rebellion_crushed: true },
        hint: '반란을 진압한다',
        resultText:
          '선왕이 남긴 하원이 왕의 뒤에 섰다. 반란은 명분을 잃고 흩어졌다.\n'
          + '아버지가 세운 것이 아들을 지켰다.',
      },
      {
        id: 'suppress-standing',
        label: '조정을 움직여 반란을 고립시킨다',
        requires: { flags: { court_backing: true } },
        effects: [res('regentSuspicion', -30), zeroCounter(RISK_REBELLION)],
        setFlags: { rebellion_averted: true, rebellion_crushed: true },
        hint: '반란을 진압한다',
        resultText:
          '조정이 왕에게 등을 돌리지 않았다. 반란에 가담할 귀족은 손에 꼽혔고, 밀려난 자는 ' +
          '함께 일어설 사람을 찾지 못했다.\n왕이 쌓은 것은 군대가 아니라 사람이었고, 그것이 이 밤을 넘겼다.',
      },
      {
        id: 'fight',
        label: '몸소 칼을 들고 맞선다',
        requires: { stats: { martial: { min: 40 } } },
        effects: [res('regentSuspicion', -25), zeroCounter(RISK_REBELLION), res('wellbeing', -15)],
        setFlags: { rebellion_averted: true, rebellion_crushed: true },
        hint: '반란을 진압한다',
        resultText:
          '왕이 직접 칼을 잡았다. 짧고 사나운 밤이 지나고, 왕은 제 손으로 옥좌를 지켰다.',
      },
      {
        id: 'succumb',
        label: '막을 것이 없다',
        setFlags: { [DEAD_END.rebellion]: true },
        resultText:
          '군도, 백성도, 등을 맡길 이도 없었다. 왕은 홀로 옥좌에 앉아 있었고, 문이 열렸다.\n'
          + '실권 하나로 오른 자리를, 실권 하나로는 지킬 수 없었다.',
      },
    ],
  },

  // ────────────────────────────────────────────────
  // 데드엔딩 아닌 깜짝 — 순수 플레이버
  // ────────────────────────────────────────────────
  {
    id: 'surprise-old-nurse',
    title: '옛 유모',
    text:
      '궁을 떠났던 늙은 유모가 왕을 보러 찾아왔다. 손에는 어릴 적 좋아하던 주전부리가 들려 있었다.',
    condition: { minAge: 13, maxAge: 19 },
    once: true,
    category: 'story',
    chance: { base: 0.05, cooldown: 6 },
    effects: [res('wellbeing', 6), res('tutorTrust', 2)],
  },
  {
    id: 'surprise-stranger-letter',
    title: '이름 없는 편지',
    text:
      '아무 서명 없는 편지 한 통이 베개 밑에서 나왔다. "전하를 지켜보는 이가 있습니다." 그뿐이었다.',
    condition: { minAge: 14, maxAge: 19 },
    once: true,
    category: 'story',
    chance: { base: 0.04, cooldown: 6 },
    choices: [
      {
        id: 'keep',
        label: '간직한다',
        effects: [res('wellbeing', 2)],
        resultText: '누구인지 모를 그 한 줄을, 왕은 오래 품고 다녔다.',
      },
      {
        id: 'burn',
        label: '태운다',
        effects: [res('regentSuspicion', -2)],
        resultText: '왕은 편지를 등불에 가져갔다. 재만 남았다.',
        hint: '흔적을 지운다',
      },
    ],
  },
]

export const SURPRISE_EVENT_IDS = SURPRISE_EVENTS.map((e) => e.id)
