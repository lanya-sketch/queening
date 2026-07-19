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
    condition: { minAge: 16, minYear: 5, season: 'autumn' },
    priority: 35,
    setFlags: { [ROMANCE_UNLOCK_FLAG]: true },
  },
]
