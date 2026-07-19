import { ACTIVITY_BY_ID } from '../data/activities'
import { GAME_CONFIG, INITIAL_RESOURCES, INITIAL_STATS, SEASON_ORDER } from '../data/config'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import type { Delta, GameDate, GameEvent, GameState } from '../types/game'

/**
 * 한 턴에 처리할 이벤트 상한.
 *
 * 페이싱 장치이자 안전장치다. 나이는 봄에 오르므로 minAge 조건이 걸린 이벤트가
 * 한 계절에 몰려 터지기 쉽다. 상한을 두면 나머지는 다음 턴에 다시 검사되어
 * 자연히 여러 계절에 흩어진다.
 *
 * 2 로 잡은 이유: 단서를 심는 이벤트와 그 단서를 회수하는 진실 이벤트가
 * 같은 턴에 연쇄할 여지는 남기되, 그 이상은 한 계절에 몰지 않기 위해.
 */
const MAX_EVENTS_PER_TURN = 2
import { applyEffects, type Rng } from './effects'
import { findTriggeredEvents, seenFlagId } from './eventEngine'

export function createInitialState(): GameState {
  return {
    date: { ...GAME_CONFIG.startDate },
    age: GAME_CONFIG.startAge,
    stats: { ...INITIAL_STATS },
    ...INITIAL_RESOURCES,
    actionPoints: GAME_CONFIG.actionPointsPerTurn,
    currentOutfitId: DEFAULT_OUTFIT_ID,
    plannedActivityIds: [],
    flags: {},
    phase: 'schedule',
    lastTurnReport: null,
    pendingEventIds: [],
  }
}

/** 20세를 넘기면 이번 단계의 끝점. 이후 턴 진행을 잠근다(엔딩은 M3). */
export function hasReachedEnd(state: GameState): boolean {
  return state.age > GAME_CONFIG.endAge
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
  // 한 번에 목록을 뽑지 않고 하나씩 적용하며 다시 검사한다.
  // 앞선 이벤트가 세운 flag 를 뒤 이벤트가 조건으로 볼 수 있어야
  // 단서 → 진실 회수 같은 연쇄가 같은 턴 안에서도 성립한다.
  const triggered: GameEvent[] = []
  const eventDeltas: Delta[] = []
  const firedThisTurn = new Set<string>()

  for (let guard = 0; guard < MAX_EVENTS_PER_TURN; guard++) {
    const event = findTriggeredEvents(next).find((e) => !firedThisTurn.has(e.id))
    if (!event) break

    const result = applyEffects(next, event.effects, rng)
    next = result.state
    mergeDeltas(eventDeltas, result.deltas)
    next.flags = { ...next.flags, ...event.setFlags, [seenFlagId(event.id)]: true }

    firedThisTurn.add(event.id)
    triggered.push(event)
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
