import type { Effect, GameEvent, ResourceKey } from '../../types/game'
import { RISK_TUTOR } from '../../systems/risk'

/**
 * 외출 — 궁 밖 (시스템 뼈대).
 *
 * ★ 합법 시찰(patrol-town)은 안전하고 발각이 없다 — 여기 이벤트가 없다(활동 효과로 끝).
 *   불법 잠행(sneak-town/slum)만 **발각 위험**을 진다. 활동이 `went_out` 을 세우면
 *   그 턴에 이 이벤트가 확률로 떠 발각을 판정한다(turn.ts 가 턴 끝에 went_out 을 끈다).
 *
 * ★ 발각 회피 = **궁정처세**(반복 가능한 둘러대기). 「해고」 데드엔딩의 회피(신뢰, 파국 직전 1회)와는
 *   **다른 층**이다 — 이건 매번의 둘러대기이고, 그건 마지막 한 번의 감쌈이다.
 * ★ 반복하면 위험해진다: pity 로 발동 확률이 오르고(안 걸린 잠행마다 감시가 쌓임), 걸리면 리셋.
 */
const res = (key: ResourceKey, amount: number): Effect =>
  ({ target: { kind: 'resource', key }, amount })
const tutorRisk = (amount: number): Effect =>
  ({ target: { kind: 'counter', key: RISK_TUTOR }, amount })

export const OUTING_EVENTS: GameEvent[] = [
  {
    id: 'outing-caught',
    title: '낯선 눈',
    text:
      '뒷골목을 돌아 나오던 길, 익숙한 얼굴 하나가 걸음을 멈추고 이쪽을 보았다. ' +
      '섭정공의 사람이다. 남루한 옷차림의 아이와, 그 곁의 스승.\n' +
      '그가 무엇을 보았는지, 무엇을 보았다 여길지 — 다음 한마디에 달렸다.',
    // 몰래 나간 그 턴에만. 20세 전(데드 경계와 안 겹치게).
    condition: { maxAge: 19, flags: { went_out: true } },
    once: false,
    category: 'story',
    // ★ 확률: 낮은 base + 잠행 유도(lure) + 반복(pity). 안 걸리면 pity 가 쌓여 다음이 위험.
    chance: {
      base: 0.12,
      lures: { 'sneak-town': 0.05, 'sneak-slum': 0.06 },
      pity: { after: 2, step: 0.06, guarantee: 10 },
    },
    choices: [
      {
        id: 'talk-away',
        label: '둘러댄다',
        // ★ 궁정처세 게이트 — 몰래 다니는 재주. 충족하면 넘어가되, 흔적(tutorRisk)은 남는다.
        requires: { stats: { courtcraft: { min: 30 } } },
        effects: [res('regentSuspicion', 4), tutorRisk(1)],
        setFlags: { outing_talked_away: true },
        hint: '재주껏 넘긴다 — 다만 흔적은 남는다',
        resultText:
          '스승이 앞으로 나서 웃으며 몇 마디를 건넸다. 심부름 나온 궁의 아이라 했던가, ' +
          '그 자리는 그렇게 지나갔다.\n' +
          '넘어갔다. 다만 그 얼굴이 오늘 본 것을 아주 잊지는 않을 것이다 — 흔적은 남는다.',
      },
      {
        id: 'exposed',
        label: '말문이 막힌다',
        // 궁정처세가 모자라면 이 길뿐이다(둘러대기가 잠긴다).
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
