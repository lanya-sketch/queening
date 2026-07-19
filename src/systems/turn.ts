import { ACTIVITY_BY_ID } from '../data/activities'
import { GAME_CONFIG, INITIAL_RESOURCES, INITIAL_STATS, SEASON_ORDER } from '../data/config'
import type { Delta, GameDate, GameState } from '../types/game'
import { applyEffects, type Rng } from './effects'
import { findTriggeredEvents, seenFlagId } from './eventEngine'

export function createInitialState(): GameState {
  return {
    date: { ...GAME_CONFIG.startDate },
    age: GAME_CONFIG.startAge,
    stats: { ...INITIAL_STATS },
    ...INITIAL_RESOURCES,
    actionPoints: GAME_CONFIG.actionPointsPerTurn,
    plannedActivityIds: [],
    flags: {},
    phase: 'schedule',
    lastTurnReport: null,
    pendingEventIds: [],
  }
}

/** 겨울 다음은 새해 봄이고, 그때 군주는 한 살 먹는다. */
export function advanceDate(date: GameDate, age: number): { date: GameDate; age: number } {
  const index = SEASON_ORDER.indexOf(date.season)
  const nextIndex = (index + 1) % SEASON_ORDER.length
  const wrapped = nextIndex === 0
  return {
    date: { year: date.year + (wrapped ? 1 : 0), season: SEASON_ORDER[nextIndex] },
    age: age + (wrapped ? 1 : 0),
  }
}

function mergeDeltas(into: Delta[], from: Delta[]): void {
  for (const delta of from) {
    const existing = into.find((d) => d.label === delta.label)
    if (existing) existing.amount += delta.amount
    else into.push({ ...delta })
  }
}

/**
 * 턴 종료 파이프라인.
 * 활동 효과 → 날짜/나이 진행 → 이벤트 조건 검사 및 적용 → 결과 리포트.
 */
export function endTurn(state: GameState, rng: Rng = Math.random): GameState {
  const activities = state.plannedActivityIds
    .map((id) => ACTIVITY_BY_ID[id])
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  // 1. 활동 효과
  const applied = applyEffects(state, activities.flatMap((a) => a.effects), rng)
  let next = applied.state
  for (const activity of activities) {
    if (activity.setFlags) next.flags = { ...next.flags, ...activity.setFlags }
  }

  // 2. 날짜 / 나이
  const advanced = advanceDate(state.date, state.age)
  next.date = advanced.date
  next.age = advanced.age

  // 3. 이벤트
  const triggered = findTriggeredEvents(next)
  const eventDeltas: Delta[] = []
  for (const event of triggered) {
    const result = applyEffects(next, event.effects, rng)
    next = result.state
    mergeDeltas(eventDeltas, result.deltas)
    next.flags = { ...next.flags, ...event.setFlags, [seenFlagId(event.id)]: true }
  }

  // 4. 다음 턴 준비 + 리포트
  next.actionPoints = GAME_CONFIG.actionPointsPerTurn
  next.plannedActivityIds = []
  next.pendingEventIds = triggered.map((e) => e.id)
  next.phase = 'result'
  next.lastTurnReport = {
    date: state.date,
    activityIds: state.plannedActivityIds,
    activityDeltas: applied.deltas,
    eventDeltas,
    triggeredEventIds: next.pendingEventIds,
  }

  return next
}
