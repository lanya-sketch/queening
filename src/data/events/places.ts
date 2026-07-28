import type { GameEvent } from '../../types/game'

/**
 * 궁 안 이동 — 장소 이벤트 (2-b-1).
 *
 * ★ 이 이벤트들은 **자동발동하지 않는다** — EVENTS(findTriggeredEvents 가 훑는 배열)에 넣지 않고
 *   EVENT_BY_ID 에만 등록한다(DAILY/INCIDENT 소소 채널과 같은 패턴). 방문 resolver가
 *   gameStore.visitDestination → triggerEvent 로 직접 enqueue 한다.
 * ★ 씬은 방문 때마다 조립되어 SCENE_BY_ID['scene-place-visit'] 에 얹힌다(systems/visit.ts).
 *   그래서 모두 같은 sceneId 를 가리키고, 제목만 장소별로 다르다. 선택지·효과 없음(스탯 0).
 *   왕대비궁 부재+자격 시의 수색은 이 팩이 아니라 bloodoath 의 chamber-search 로 분기한다.
 */
const SCENE = 'scene-place-visit'

// condition 은 타입상 필수지만 이 이벤트들은 EVENTS(자동발동)에 없어 findTriggeredEvents 가
// 훑지 않는다 — 빈 조건은 무해하다(방문 resolver가 직접 enqueue 한다).
export const PLACE_EVENTS: GameEvent[] = [
  { id: 'visit-library', title: '서고', sceneId: SCENE, text: '', condition: {} },
  { id: 'visit-garden', title: '정원', sceneId: SCENE, text: '', condition: {} },
  { id: 'visit-yard', title: '연무장', sceneId: SCENE, text: '', condition: {} },
  { id: 'visit-queen', title: '왕대비궁', sceneId: SCENE, text: '', condition: {} },
  { id: 'visit-patrol', title: '순찰', sceneId: SCENE, text: '', condition: {} },
  { id: 'visit-sneak', title: '잠행', sceneId: SCENE, text: '', condition: {} },
]
