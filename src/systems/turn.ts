import { ACTIVITY_BY_ID } from '../data/activities'
import { DURABILITY, GAME_CONFIG, INITIAL_RESOURCES, INITIAL_STATS, MONTH_SCALE } from '../data/config'
import { DEFAULT_MONARCH_NAME } from '../data/lexicon'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import { durabilityGain, growthFactor, wellbeingCostFactor } from './durability'
import { initialAffection } from './romance'
import type { Delta, DiaryEntry, Effect, GameDate, GameEvent, GameState } from '../types/game'

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
import { applyEffects, targetLabel, type Rng } from './effects'
import { rollChance, tickCounters } from './chance'
import { findTriggeredEvents, seenFlagId } from './eventEngine'
import { activityEffects, activityTierLabel } from './activityTier'
import { scheduleMinor } from './minorEvents'
import { updateRisk } from './risk'
import { deadEndReason } from './deadend'

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
    monarchName: DEFAULT_MONARCH_NAME.male,
    affection: initialAffection(),
    plannedActivityIds: [],
    counters: {},
    flags: {},
    phase: 'schedule',
    lastTurnReport: null,
    pendingEventIds: [],
  }
}

/**
 * 이번 단계의 끝점 — 두 경로가 있다.
 *   정식 엔딩: 20세를 넘겼다(judgeEnding).
 *   조기 데드엔딩: 20세 전이라도 dead_end:<이유> flag 가 섰다(손으로 쓴 데드 씬).
 * 어느 쪽이든 이후 턴 진행을 잠근다. 경계는 분명하다 — age>20 이 아니면 데드다.
 */
export function hasReachedEnd(state: GameState): boolean {
  return state.age > GAME_CONFIG.endAge || deadEndReason(state) !== null
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

/**
 * 활동에 이달의 날짜를 매긴다 — 초·중·하순으로 분산. ★ rng 를 쓰지 않는다(수학 안전).
 *   달마다 살짝 흔들되(결정론적 offset) 같은 달은 항상 같은 날 → 재현 가능.
 *   1개 → 14일 / 2개 → 9·19 / 3개 → 7·14·21 근처.
 */
function diaryDay(index: number, count: number, date: GameDate): number {
  const jitter = ((date.year * 12 + date.month) % 5) - 2 // -2..2, 결정론적
  const base = Math.round(((index + 1) * 28) / (count + 1))
  return Math.max(1, Math.min(28, base + jitter))
}

/**
 * 그날의 운 — 주 스탯 델타가 기대값 대비 위/아래였나(variance 롤의 결과).
 *   결정론 모드(rng=0.5)에서는 롤이 정확히 기대값이라 항상 'normal' 이다.
 */
function luckOf(scaled: Effect[], deltas: Delta[]): DiaryEntry['luck'] {
  const primary = scaled
    .filter((e) => e.target.kind === 'stat' && e.amount > 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0]
  if (!primary || !primary.variance) return 'normal'
  const got = deltas.find((d) => d.label === targetLabel(primary.target))?.amount
  if (got == null) return 'normal'
  if (got >= primary.amount + primary.variance * 0.4) return 'good'
  if (got <= primary.amount - primary.variance * 0.4) return 'bad'
  return 'normal'
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
  // ★ 수업은 현재 스탯에 따라 등급이 자동 전환된다(초·중·고) — 효과를 여기서 해석한다.
  //
  // ★★ 활동별로 나눠 적용해 **날짜별 컷신용 일기(diary)**를 만든다. 수학은 배치 적용과
  //    완전히 동일하다: activityEffects 는 전부 **턴 시작 state** 로 해석해 등급을 고정하고
  //    (배치와 같게), 순차 적용은 배치가 효과를 하나씩 적용하던 것과 rng draw 순서가 같다.
  //    diary 는 표현 근거(날짜·등급·심신·롤 운)만 나른다 — activityDeltas 가 밸런스를 그대로 쥔다.
  const prepared = activities.map((a) => ({
    activity: a,
    scaled: scaleByDurability(activityEffects(a, state), state.durability),
    tier: activityTierLabel(a, state),
  }))
  let next = state
  const activityDeltas: Delta[] = []
  const diary: DiaryEntry[] = []
  prepared.forEach(({ activity, scaled, tier }, i) => {
    const wellbeingAt = next.wellbeing // 이 활동 시점의 심신(그달 피로 arc)
    const r = applyEffects(next, scaled, rng)
    next = r.state
    mergeDeltas(activityDeltas, r.deltas)
    diary.push({
      day: diaryDay(i, activities.length, state.date),
      activityId: activity.id,
      tier,
      wellbeing: wellbeingAt,
      luck: luckOf(scaled, r.deltas),
    })
  })
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

  // 3-a-2. 외출 신호 소거 — `went_out` 은 **그 턴에만** 유효한 신호다(활동이 세우고, 이 턴의
  //   발각 이벤트가 조건으로 읽은 뒤 여기서 끈다). 안 끄면 다음 턴에도 남아 발각이 오발한다.
  if (next.flags.went_out) next.flags = { ...next.flags, went_out: false }

  // 3-b. 위험 누적 — 조기 데드엔딩 씨앗(심신 파탄 / 의심 무방비).
  //   숨은 카운터라 UI 에 없고, surprises.ts 의 경고·데드 이벤트가 조건으로 읽는다.
  next.counters = { ...next.counters, ...updateRisk(next) }

  // 3-c. 소소-비트 — **빈 달만** 채운다. 큰 이벤트가 뜬 달엔 굴리지 않고,
  //   굴려도 턴 상한과 별개라 서사를 굶기지 않는다. 데드엔딩이 섰으면 굴리지 않는다.
  if (next.age <= GAME_CONFIG.endAge && deadEndReason(next) === null) {
    if (triggered.length > 0) {
      next.counters = { ...next.counters, '__pity:minor': 0 }
    } else {
      const minor = scheduleMinor(next, rng)
      next.counters = { ...next.counters, ...minor.counters }
      if (minor.beat) {
        const ev = minor.beat.event
        if (!minor.beat.isAi && ev.effects) {
          const applied2 = applyEffects(next, ev.effects, rng)
          next = applied2.state
          mergeDeltas(eventDeltas, applied2.deltas)
        }
        triggered.push(ev)
      }
    }
  }

  // 4. 다음 턴 준비 + 리포트
  //   ★ 조용한 소소(선택지·씬 없음)는 결과 화면에 인라인으로 펼치고 큐에 넣지 않는다.
  //     효과는 이미 적용됐으니, 남은 건 "어떻게 보여줄까"뿐이다 — 고를 게 없으면
  //     별도 페이지로 넘기지 않는다(실플레이 피드백: 원인과 결과가 갈렸다).
  //   ★ 인라인 대상은 **손 풀 소소(daily-)로 한정**한다. 그것이 사용자가 말한 "미니 이벤트"다.
  //     마일스톤 서사(첫 어전 회의 등)는 선택지가 없어도 통찰·본문이 있어 제 지면이 필요하고,
  //     AI 돌발은 IncidentView 가 그려야 하며, 씬 이벤트는 VN 으로 재생돼야 한다.
  //     그래서 "daily- 이고 선택지·씬이 없다"만 인라인으로 펼친다.
  const isQuiet = (e: GameEvent) =>
    e.id.startsWith('daily-') && !e.choices?.length && !e.sceneId
  const inline = triggered.filter(isQuiet)
  const queued = triggered.filter((e) => !isQuiet(e))

  next.actionPoints = GAME_CONFIG.actionPointsPerTurn
  next.plannedActivityIds = []
  next.pendingEventIds = queued.map((e) => e.id)
  next.phase = 'result'
  next.lastTurnReport = {
    date: state.date,
    activityIds: state.plannedActivityIds,
    diary,
    startAge: state.age,
    startDurability: state.durability,
    activityDeltas,
    eventDeltas,
    // 인라인 것까지 포함해 "이번 달에 일어난 일" 전체를 결과 화면이 안다.
    triggeredEventIds: triggered.map((e) => e.id),
    inlineEventIds: inline.map((e) => e.id),
  }

  return next
}
