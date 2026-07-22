import { ACTIVITY_BY_ID } from '../data/activities'
import { DURABILITY, GAME_CONFIG, INITIAL_RESOURCES, INITIAL_STATS, MONTH_SCALE } from '../data/config'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import { durabilityGain, growthFactor, wellbeingCostFactor } from './durability'
import { initialAffection } from './romance'
import type { Delta, Effect, GameDate, GameEvent, GameState } from '../types/game'

/**
 * 한 턴에 처리할 이벤트 상한.
 *
 * 페이싱 장치이자 안전장치다. 나이는 1월에 오르므로 minAge 조건이 걸린 이벤트가
 * 그 달에 몰려 터지기 쉽다. 상한을 두면 나머지는 다음 턴에 다시 검사되어
 * 자연히 여러 달에 흩어진다.
 *
 * 2 로 잡은 이유: 단서를 심는 이벤트와 그 단서를 회수하는 진실 이벤트가
 * 같은 턴에 연쇄할 여지는 남기되, 그 이상은 한 달에 몰지 않기 위해.
 */
const MAX_EVENTS_PER_TURN = 2
import { applyEffects, type Rng } from './effects'
import { rollChance, tickCounters } from './chance'
import { findTriggeredEvents, seenFlagId } from './eventEngine'

export function createInitialState(): GameState {
  return {
    date: { ...GAME_CONFIG.startDate },
    age: GAME_CONFIG.startAge,
    stats: { ...INITIAL_STATS },
    ...INITIAL_RESOURCES,
    durability: DURABILITY.initial,
    actionPoints: GAME_CONFIG.actionPointsPerTurn,
    currentOutfitId: DEFAULT_OUTFIT_ID,
    monarchGender: 'male',
    affection: initialAffection(),
    plannedActivityIds: [],
    counters: {},
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

/**
 * 활동 효과를 월 단위로 스케일하고 내구도 계수를 얹는다.
 *
 * ★ MONTH_SCALE(÷3)은 **스탯에만** 적용한다 — 스탯은 게임 내내 쌓아 올리는 것이라
 *   턴이 3배면 매 턴 성장이 1/3 이어야 최종치가 비슷하다.
 *   심신·의심 같은 자원은 **매 행동의 즉각적 대가**라 그대로 둔다(계절판과 같은 세기).
 *   그래야 내구도 낮은 초반에 "무리한 활동 2~3번이면 심신 위험"이 성립한다.
 *
 *   그 위에 내구도 계수:
 *     스탯 증가(+) → growthFactor(높으면 상)
 *     심신 소모(−) → wellbeingCostFactor(낮으면 벌)
 */
function scaleByDurability(effects: Effect[], durability: number): Effect[] {
  const grow = growthFactor(durability)
  const cost = wellbeingCostFactor(durability)
  return effects.map((e) => {
    let factor = 1
    if (e.target.kind === 'stat') {
      factor = MONTH_SCALE * (e.amount > 0 ? grow : 1)
    } else if (e.target.kind === 'resource' && e.target.key === 'wellbeing' && e.amount < 0) {
      factor = cost
    }
    if (factor === 1) return e
    return {
      ...e,
      amount: e.amount * factor,
      ...(e.variance ? { variance: e.variance * factor } : {}),
    }
  })
}

/** 12월 다음은 새해 1월이고, 그때 군주는 한 살 먹는다. */
export function advanceDate(date: GameDate, age: number): { date: GameDate; age: number } {
  const wrapped = date.month >= GAME_CONFIG.monthsPerYear
  return {
    date: {
      year: date.year + (wrapped ? 1 : 0),
      month: wrapped ? 1 : date.month + 1,
    },
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

  // 1. 활동 효과 — ★ 내구도 계수는 **활동에만** 적용한다(서사/이벤트 효과는 그대로).
  //   낮은 내구도 → 심신 소모 증가, 높은 내구도 → 성장 증가.
  const scaled = scaleByDurability(activities.flatMap((a) => a.effects), state.durability)
  const applied = applyEffects(state, scaled, rng)
  let next = applied.state
  for (const activity of activities) {
    if (activity.setFlags) next.flags = { ...next.flags, ...activity.setFlags }
  }

  // 2. 날짜 / 나이
  const advanced = advanceDate(state.date, state.age)
  const gotOlder = advanced.age > state.age
  next.date = advanced.date
  next.age = advanced.age

  // 2-a. 내구도 갱신 — 관리 누적(이번 달 심신) + 생일이면 그릇이 자란다(BASE_PER_AGE).
  next.durability =
    next.durability + durabilityGain(next) + (gotOlder ? DURABILITY.BASE_PER_AGE : 0)

  // 2-b. 계절 타이머 감소.
  // 이벤트 검사보다 **먼저** 돌려야 "체류가 끝났다"를 퇴장 이벤트가 조건으로 볼 수 있다.
  next.counters = tickCounters(next.counters ?? {})

  // 3. 이벤트
  // 한 번에 목록을 뽑지 않고 하나씩 적용하며 다시 검사한다.
  // 앞선 이벤트가 세운 flag 를 뒤 이벤트가 조건으로 볼 수 있어야
  // 단서 → 진실 회수 같은 연쇄가 같은 턴 안에서도 성립한다.
  const triggered: GameEvent[] = []
  const eventDeltas: Delta[] = []
  const settled = new Set<string>()

  while (triggered.length < MAX_EVENTS_PER_TURN) {
    const event = findTriggeredEvents(next).find((e) => !settled.has(e.id))
    if (!event) break

    // ★ 확률 판정에 떨어진 이벤트는 이번 턴 상한을 소모하지 않는다.
    //   소모시키면 확률 이벤트가 늘어날수록 실제 서사 이벤트가 굶는다.
    const roll = rollChance(event, next, state.plannedActivityIds, rng)
    next.counters = { ...next.counters, ...roll.counters }
    settled.add(event.id)
    if (!roll.fired) continue

    const result = applyEffects(next, event.effects, rng)
    next = result.state
    mergeDeltas(eventDeltas, result.deltas)
    next.flags = { ...next.flags, ...event.setFlags, [seenFlagId(event.id)]: true }

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
