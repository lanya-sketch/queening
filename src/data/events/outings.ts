import type { Effect, GameEvent, ResourceKey, Scene, SceneLine } from '../../types/game'
import { RISK_TUTOR } from '../../systems/risk'

/**
 * 외출 — 궁 밖 ([7] 합법/불법 분리 + 3곳 종합).
 *
 * ★ 나가느냐는 월 1회 결정(친정 후 2회), 나가서 얼마나 깊이 볼까는 그 자리의 선택이다.
 *   합법 시찰(patrol-outing) — 준비된 곳(꾸민 얼굴). 안전하나 얕다. 민심 flag 없음.
 *   불법 잠행(sneak-outing) — 날것(맨얼굴). 두루 볼수록 발각 위험↑ + 실제 민심(turn.ts 가 종합).
 *
 * ★ "위험을 감수한 왕이 진짜 판세를 안다" — 진짜 민심은 맨얼굴에서만 보인다. 준비된 거리에서
 *   본 것은 왕에게 보여주려 꾸민 것이고, 뒷골목에서 들은 것이 실제다.
 * ★ 발각(outing-caught)은 went_out 을 세운 그 턴에 확률로. 친정(실권) 후 평시엔 안전(outing_safe)이나,
 *   반란 국면(regent_hostile)이면 밀려난 섭정이 노려 위험이 돌아온다.
 */
const res = (key: ResourceKey, amount: number): Effect =>
  ({ target: { kind: 'resource', key }, amount })
const tutorRisk = (amount: number): Effect =>
  ({ target: { kind: 'counter', key: RISK_TUTOR }, amount })
const N = (text: string): SceneLine => ({ speaker: 'narration', text })

/**
 * ★ [7] 방문 resolver 가 enqueue 하는 외출 도입 이벤트(자동발동 아님 — condition 비어 있음).
 *   RAW_EVENTS(findTriggeredEvents)에 넣지 않고 EVENT_BY_ID 에만 등록한다(PLACE_EVENTS 패턴).
 */
export const OUTING_VISIT_EVENTS: GameEvent[] = [
  // ── 합법 시찰 — 준비된 곳(꾸민 얼굴). 안전·얕음. 민심 flag 없음. ──
  {
    id: 'patrol-outing',
    title: '시찰',
    sceneId: 'scene-patrol-outing',
    text: '호위를 앞세워 성문 밖으로 나섰다.',
    condition: {},
    once: false,
    category: 'story',
    choices: [
      {
        id: 'glance',
        label: '큰 거리만 둘러보고 돌아온다',
        effects: [res('wellbeing', 8)],
        resultText:
          '정돈된 상점가와 쓸어 둔 길. 사람들은 웃으며 절했다. 별일 없어 보였다.\n' +
          '별일 없어 "보였다"는 것까지가, 오늘 본 전부였다.',
      },
      {
        id: 'thorough',
        label: '시장 정문과 관청까지 두루 살핀다',
        effects: [res('wellbeing', 6)],
        hint: '준비된 곳만 도니 발각 위험은 없다',
        resultText:
          '큰 거리, 시장 정문, 관청 앞. 세 곳 모두 흠잡을 데가 없었다.\n' +
          '꾸며진 겉면은 완벽했다. 그래서 오히려, 아무것도 읽어낼 수 없었다.',
      },
    ],
  },

  // ── 불법 잠행 — 날것(맨얼굴). 두루 볼수록 발각 위험 + 실제 민심(turn.ts 종합). ──
  {
    id: 'sneak-outing',
    title: '잠행',
    sceneId: 'scene-sneak-outing',
    text: '평복으로 갈아입고 쪽문으로 빠져나갔다.',
    condition: {},
    once: false,
    category: 'story',
    choices: [
      {
        id: 'peek',
        label: '한 곳만 슬쩍 보고 돌아온다',
        effects: [res('wellbeing', 2)],
        hint: '위험은 적으나, 조각으로는 판을 못 읽는다',
        resultText:
          '뒷골목 하나를 스쳤다. 몇 마디를 주웠지만, 그것뿐이었다.\n' +
          '한 조각으로는 백성의 얼굴을 다 읽을 수 없다.',
      },
      {
        id: 'deep',
        label: '뒷골목·빈민가·주점을 두루 돈다',
        // ★ [7] 두루 볼수록 위험 — 오래 머무는 만큼 의심·흔적이 쌓인다(발각 판정은 outing-caught).
        //   실제 민심은 turn.ts 가 outing_deep_look 을 읽어 종합한다(부담 있으면 부담, 없으면 안도).
        effects: [res('regentSuspicion', 3), tutorRisk(1)],
        setFlags: { outing_deep_look: true },
        hint: '세 곳을 종합하면 진짜 판세가 보인다 · 그만큼 위험하다',
        resultText:
          '뒷골목의 욕설, 빈민가의 한숨, 주점의 취담. 왕인 줄 모르는 입에서 나온 말들이었다.\n' +
          '세 곳의 조각을 맞추자, 꾸며진 거리에서는 보이지 않던 판이 드러났다.',
      },
    ],
  },
]

/** ★ 자동발동 — 잠행한 그 턴에 확률로 발각을 판정한다. */
export const OUTING_EVENTS: GameEvent[] = [
  // ── 발각 — 몰래 나간 그 턴에만. 친정(outing_safe) 평시엔 안 뜨고, 반란 국면이면 위험이 돌아온다. ──
  {
    id: 'outing-caught',
    title: '낯선 눈',
    text:
      '뒷골목을 돌아 나오던 길, 익숙한 얼굴 하나가 걸음을 멈추고 이쪽을 보았다. ' +
      '섭정공의 사람이다. 남루한 옷차림의 아이와, 그 곁의 스승.\n' +
      '그가 무엇을 보았는지, 무엇을 보았다 여길지, 다음 한마디에 달렸다.',
    // ★ [7] went_out(잠행한 그 턴) + outing_safe:false — 친정 평시엔 안전, 반란 국면이면 재발동.
    condition: { maxAge: 19, flags: { went_out: true, outing_safe: false } },
    once: false,
    category: 'story',
    chance: {
      base: 0.12,
      pity: { after: 2, step: 0.06, guarantee: 10 },
    },
    choices: [
      {
        id: 'talk-away',
        label: '둘러댄다',
        requires: { stats: { courtcraft: { min: 30 } } },
        effects: [res('regentSuspicion', 4), tutorRisk(1)],
        setFlags: { outing_talked_away: true },
        hint: '재주껏 넘긴다 · 다만 흔적은 남는다',
        resultText:
          '스승이 앞으로 나서 웃으며 몇 마디를 건넸다. 심부름 나온 궁의 아이라 했던가, ' +
          '그 자리는 그렇게 지나갔다.\n' +
          '넘어갔다. 다만 그 얼굴이 오늘 본 것을 아주 잊지는 않을 것이다. 흔적은 남는다.',
      },
      {
        id: 'exposed',
        label: '말문이 막힌다',
        effects: [res('regentSuspicion', 14), tutorRisk(4)],
        setFlags: { outing_exposed: true },
        resultText:
          '스승의 변명이 어설펐다. 상대의 눈이 아이의 손에, 걸음걸이에, 익은 이목구비에 닿았다.\n' +
          '그날 밤 섭정공의 책상에 짧은 전갈이 올라갔다. "가정교사가 전하를 데리고 궁 밖에." ' +
          '눈이 스승에게 닿았다.',
      },
    ],
  },
]

/** 외출 씬(합법·불법 도입부). */
export const OUTING_SCENES: Scene[] = [
  {
    id: 'scene-patrol-outing',
    lines: [
      N('호위를 앞세워 성문 밖으로 나섰다. 왕의 행차이니 숨길 것이 없었고, 그래서 보이는 것도 그만큼이었다.'),
      N('왕이 지날 길은 미리 쓸어 두었다. 사람들은 왕인 줄 알고, 보여주려 꾸민 얼굴로 서 있었다.'),
    ],
  },
  {
    id: 'scene-sneak-outing',
    lines: [
      N('평복으로 갈아입고 쪽문으로 빠져나갔다. 이름을 숨긴 채라야 사람들은 진짜 얼굴을 보였다. 들키지만 않는다면.'),
      N('뒷골목과 빈민가, 그리고 등불 낮은 주점. 왕인 줄 모르는 입에서 나오는 말이 이 도시의 맨얼굴이었다.'),
    ],
  },
]
