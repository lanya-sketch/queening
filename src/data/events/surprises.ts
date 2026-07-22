import type { Effect, GameEvent, ResourceKey } from '../../types/game'
import { RISK } from '../config'
import { DEAD_END } from '../../systems/deadend'
import { RISK_STRAIN, RISK_EXPOSURE } from '../../systems/risk'

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
        requires: { stats: { martial: { min: 40 } } },
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
        requires: { resources: { courtInfluence: { min: 45 } } },
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
