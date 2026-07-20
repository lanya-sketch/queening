import { CHARACTER_BY_ID } from '../data/characters'
import { SEASON_LABEL } from '../data/config'
import { EVENTS } from '../data/events'
import { RESOURCE_META, STAT_META } from '../data/stats'
import type { Condition, GameEvent, GameState, GaugeKey, StatKey } from '../types/game'

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
      if (!inRange(state[key as GaugeKey], range)) return false
    }
  }

  if (c.counters) {
    for (const [key, range] of Object.entries(c.counters)) {
      if (!inRange(state.counters?.[key] ?? 0, range)) return false
    }
  }

  if (c.affection) {
    for (const [charId, range] of Object.entries(c.affection)) {
      const value =
        state.affection?.[charId] ?? CHARACTER_BY_ID[charId]?.startingAffection ?? 0
      if (!inRange(value, range)) return false
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
 * 조건을 사람이 읽는 문장 조각으로 바꾼다.
 * 착장 잠금 사유 표시에 쓰고, 앞으로 활동·이벤트 해금 안내에도 재사용한다.
 */
export function describeCondition(c: Condition | undefined): string[] {
  if (!c) return []
  const parts: string[] = []

  if (c.minYear !== undefined) parts.push(`즉위 ${c.minYear}년 이후`)
  if (c.maxYear !== undefined) parts.push(`즉위 ${c.maxYear}년 이내`)
  if (c.season !== undefined) parts.push(`${SEASON_LABEL[c.season]}에만`)
  if (c.minAge !== undefined) parts.push(`${c.minAge}세 이상`)
  if (c.maxAge !== undefined) parts.push(`${c.maxAge}세 이하`)

  for (const [key, range] of Object.entries(c.stats ?? {})) {
    const label = STAT_META[key as StatKey]?.label ?? key
    if (range?.min !== undefined) parts.push(`${label} ${range.min} 이상`)
    if (range?.max !== undefined) parts.push(`${label} ${range.max} 이하`)
  }

  for (const [key, range] of Object.entries(c.resources ?? {})) {
    const label = RESOURCE_META[key as keyof typeof RESOURCE_META]?.label ?? key
    if (range?.min !== undefined) parts.push(`${label} ${range.min} 이상`)
    if (range?.max !== undefined) parts.push(`${label} ${range.max} 이하`)
  }

  if (c.flags && Object.keys(c.flags).length > 0) parts.push('특정 사건을 겪은 뒤')

  return parts
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
