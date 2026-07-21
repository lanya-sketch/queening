import type { GameEvent } from '../../types/game'
import { ADULT_EVENTS } from './adult'
import { AFFAIR_EVENTS } from './affairs'
import { BLOOD_OATH_EVENTS } from './bloodoath'
import { CHARACTER_EVENTS } from './characters'
import { DECISIVE_EVENTS } from './decisive'
import { DEVICE_EVENTS } from './devices'
import { DISPOSAL_EVENTS } from './disposal'
import { RECKONING_AFTERMATH, RECKONING_EVENTS } from './reckoning'
import { INCIDENT_EVENTS } from './incidents'
import { M1_EVENTS } from './m1-samples'
import { PRIORITY } from './priority'
import { ROMANCE_EVENTS } from './romance'
import { TEEN_EVENTS } from './teen'
import { TRUTH_EVENTS } from './truth'
import { YOUTH_EVENTS } from './youth'

/** 이벤트 팩을 여기에 추가하면 엔진이 자동으로 검사한다. */
const RAW_EVENTS: GameEvent[] = [
  ...M1_EVENTS,
  ...YOUTH_EVENTS,
  ...TEEN_EVENTS,
  ...ADULT_EVENTS,
  ...TRUTH_EVENTS,
  ...AFFAIR_EVENTS,
  ...ROMANCE_EVENTS,
  ...CHARACTER_EVENTS,
  ...BLOOD_OATH_EVENTS,
  ...DEVICE_EVENTS,
  ...DISPOSAL_EVENTS,
  ...DECISIVE_EVENTS,
  ...RECKONING_EVENTS,
  ...RECKONING_AFTERMATH,
  ...INCIDENT_EVENTS,
]

/**
 * ★ priority 는 각 이벤트 파일이 아니라 priority.ts 한 곳에서만 온다.
 *
 * 이벤트 정의 옆에 숫자를 흩어 두면 "이게 저것보다 먼저인가"를 볼 수가 없어서
 * 동률이 조용히 쌓였다. 한 표에 모아 두면 대역과 순서가 한눈에 보이고,
 * 새 이벤트를 표에 등록하지 않으면 아래 경고가 바로 잡아낸다.
 */
export const EVENTS: GameEvent[] = RAW_EVENTS.map((event) => ({
  ...event,
  priority: PRIORITY[event.id] ?? event.priority ?? 0,
}))

if (import.meta.env?.DEV) {
  const missing = RAW_EVENTS.filter((e) => PRIORITY[e.id] === undefined).map((e) => e.id)
  if (missing.length > 0) {
    console.error(`[priority] 표에 없는 이벤트: ${missing.join(', ')}`)
  }
}

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
)
