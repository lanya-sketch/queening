import { EVENTS } from '../data/events'
import type { Condition, GameEvent, GameState } from '../types/game'

export function seenFlagId(eventId: string): string {
  return `event:${eventId}`
}

function inRange(value: number, range?: { min?: number; max?: number }): boolean {
  if (!range) return true
  if (range.min !== undefined && value < range.min) return false
  if (range.max !== undefined && value > range.max) return false
  return true
}

/** 지정된 항목만 검사한다. 아무것도 지정하지 않은 조건은 항상 참. */
export function matchesCondition(state: GameState, c: Condition): boolean {
  if (c.minYear !== undefined && state.date.year < c.minYear) return false
  if (c.maxYear !== undefined && state.date.year > c.maxYear) return false
  if (c.season !== undefined && state.date.season !== c.season) return false
  if (c.minAge !== undefined && state.age < c.minAge) return false
  if (c.maxAge !== undefined && state.age > c.maxAge) return false

  if (c.stats) {
    for (const [key, range] of Object.entries(c.stats)) {
      if (!inRange(state.stats[key as keyof typeof state.stats], range)) return false
    }
  }

  if (c.resources) {
    for (const [key, range] of Object.entries(c.resources)) {
      if (!inRange(state[key as 'wellbeing' | 'tutorTrust' | 'regentSuspicion'], range)) {
        return false
      }
    }
  }

  if (c.flags) {
    for (const [flag, expected] of Object.entries(c.flags)) {
      if ((state.flags[flag] ?? false) !== expected) return false
    }
  }

  return true
}

/**
 * 지금 상태에서 발동 가능한 이벤트를 priority 내림차순으로 돌려준다.
 * once(기본 true) 이벤트는 이미 본 것이면 제외한다.
 */
export function findTriggeredEvents(state: GameState): GameEvent[] {
  return EVENTS.filter((event) => {
    const once = event.once ?? true
    if (once && state.flags[seenFlagId(event.id)]) return false
    return matchesCondition(state, event.condition)
  }).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}
