import type { GameEvent } from '../../types/game'
import { M1_EVENTS } from './m1-samples'

/** 이벤트 팩을 여기에 추가하면 엔진이 자동으로 검사한다. */
export const EVENTS: GameEvent[] = [...M1_EVENTS]

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
)
