import type { GameEvent } from '../../types/game'
import { ADULT_EVENTS } from './adult'
import { M1_EVENTS } from './m1-samples'
import { TEEN_EVENTS } from './teen'
import { TRUTH_EVENTS } from './truth'
import { YOUTH_EVENTS } from './youth'

/** 이벤트 팩을 여기에 추가하면 엔진이 자동으로 검사한다. */
export const EVENTS: GameEvent[] = [
  ...M1_EVENTS,
  ...YOUTH_EVENTS,
  ...TEEN_EVENTS,
  ...ADULT_EVENTS,
  ...TRUTH_EVENTS,
]

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
)
