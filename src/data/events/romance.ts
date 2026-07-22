import { ROMANCE_UNLOCK_FLAG } from '../characters'
import type { GameEvent } from '../../types/game'

/**
 * 연애 게이팅 이벤트 (M2b-3a).
 *
 * 이번 단계에서는 데뷔탕트가 **게이팅 트리거 역할만** 한다 —
 * romance_unlocked 를 열고, 대사 씬 시스템이 도는지 보여줄 뿐이다.
 * 캐릭터 등장·소개 연출은 M2b-3b.
 *
 * 배치: 하원 현안(16세 여름) **뒤**인 16세 가을.
 * 큰 정치 시련을 먼저 겪고 사교계에 데뷔하는 순서다.
 */
export const ROMANCE_EVENTS: GameEvent[] = [
  {
    id: 'debut-ball',
    title: '데뷔탕트',
    sceneId: 'scene-debut-ball',
    // sceneId 가 있어도 text 는 남겨둔다 — 씬을 못 찾을 때의 안전망.
    text: '{왕}의 성년을 알리는 연회가 열렸다.',
    condition: { minAge: 16, minYear: 5, month: 9 },
    priority: 35,
    setFlags: { [ROMANCE_UNLOCK_FLAG]: true },
  },

  {
    // ④ 평민 영웅의 입궁 — 지금은 **게이팅 트리거 스텁**이다.
    // 마왕 토벌 → 포상이라는 이름의 족쇄 → 냉소의 첫 만남까지의 실제 서사는 M2b-3b-2.
    // 데뷔탕트(16세 가을)와 겹치지 않게 겨울에 둔다.
    id: 'hero-at-court',
    title: '입궁',
    text:
      '지난겨울 변경에서 마왕의 목을 벤 자가 있었다. 징집된 평민 병졸이었고, ' +
      '삼 년 동안 아무도 그를 찾지 않았다.\n' +
      '포상을 논하는 자리에서 누군가 말했다. "궁에 두는 편이 낫겠습니다."\n' +
      '{왕}은 그 말이 포상이 아니라 족쇄라는 것을 알아들었다. 그리고 재가했다.',
    condition: { minAge: 17, month: 12 },
    priority: 33,
    setFlags: { hero_at_court: true },
  },
]
