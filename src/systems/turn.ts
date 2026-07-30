import { ACTIVITY_BY_ID } from '../data/activities'
import { DURABILITY, GAME_CONFIG, INITIAL_RESOURCES, INITIAL_STATS, MONTH_SCALE, RISK } from '../data/config'
import { DEFAULT_MONARCH_NAME } from '../data/lexicon'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import { durabilityGain, growthFactor, wellbeingCostFactor } from './durability'
import {
  COLD_LEARN, COLD_WELLBEING, ILL_RECOVER, ILL_STRAIN, ILL_WELLBEING, preferenceTrust,
} from './parenting'
import { RISK_STRAIN, updateRisk } from './risk'
import { isPostAutonomy, PEOPLE_FAVOR_MIN, reliefCount, STANDING_STRONG, tideHasTurned } from './rebellion'
import { initialAffection, initialCharacterGenders } from './romance'
import { CONNECTED_MONTH } from './visit'
import { warOutcome } from './ending'
import { JEALOUSY_CD, JEALOUSY_COOLDOWN, jealousyRivalFlag, planJealousy } from '../data/events/jealousy'

/** ★ [5] 그 달 깊이 만난 인물(X) flag prefix — 질투 달래기의 '다른 쪽' 대상. */
const CONNECTED_WITH_PREFIX = 'connected_with:'
const JEALOUSY_RIVAL_PREFIX = 'jealousy_rival:'
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
    characterGenders: initialCharacterGenders(),
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
function scaleByDurability(effects: Effect[], durability: number, cold = false): Effect[] {
  const grow = growthFactor(durability)
  const cost = wellbeingCostFactor(durability)
  return effects.map((e) => {
    let factor = 1
    if (e.target.kind === 'stat') {
      // ★ [2] 감기(wellbeing<20)면 성장 효율 ×COLD_LEARN — "감기 기운에 집중하지 못했다"가 실제로 작동.
      factor = MONTH_SCALE * (e.amount > 0 ? grow * (cold ? COLD_LEARN : 1) : 1)
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
  // ★ [2] 병(강제 휴식) 회복 월 — forced_rest 면 활동 대신 몸을 추스른다(활동 잠금은 UI 에서).
  const forcedRest = state.flags.forced_rest === true
  const activities = forcedRest
    ? []
    : state.plannedActivityIds
        .map((id) => ACTIVITY_BY_ID[id])
        .filter((a): a is NonNullable<typeof a> => Boolean(a))

  // ★ [2] 감기 — 턴 시작 심신이 낮으면(<20) 이번 달 성장 효율이 준다(scaleByDurability 에 전달).
  const cold = (state.wellbeing ?? 100) < COLD_WELLBEING

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
    scaled: scaleByDurability(activityEffects(a, state), state.durability, cold),
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

  // ★ [2] 병 회복 / 선호 신뢰.
  if (forcedRest) {
    // 강제 휴식 한 달 — 몸을 추스르고 flag 를 끈다(1달 제한). 성장은 없다(앓아누웠다).
    const rec = applyEffects(next, [{ target: { kind: 'resource', key: 'wellbeing' }, amount: ILL_RECOVER }], rng)
    next = rec.state
    mergeDeltas(activityDeltas, rec.deltas)
    next.flags = { ...next.flags, forced_rest: false }
  } else {
    // ★ 신뢰는 이제 "이 아이가 원하는 걸 해줬는가"(선호 일치)로만 오르내린다.
    const trustDelta = preferenceTrust(state.plannedActivityIds, state)
    if (trustDelta !== 0) {
      const r = applyEffects(next, [{ target: { kind: 'resource', key: 'tutorTrust' }, amount: trustDelta }], rng)
      next = r.state
      mergeDeltas(activityDeltas, r.deltas)
    }
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

  // ★ [5] 질투 판정 재료 — 연결 flag 소거 전에 "이 달 깊은 만남이 있었나 · 상대(X)는 누구였나"를 잡는다.
  const connectedThisMonth = next.flags[CONNECTED_MONTH] === true
  const rivalId = connectedThisMonth
    ? Object.keys(next.flags)
        .find((k) => k.startsWith(CONNECTED_WITH_PREFIX) && next.flags[k])
        ?.slice(CONNECTED_WITH_PREFIX.length)
    : undefined

  // 3-a-2. 외출·방문 신호 소거 — `went_out` 과 궁 안 이동(2-b-1) transient flag 들은
  //   **그 턴에만** 유효하다. 이 턴의 발각(outing-caught)·수색(chamber-search)이 조건으로 읽은 뒤
  //   여기서 끈다. 안 끄면 다음 턴에 남아 오발한다.
  //   대상: went_out · visited_this_month · visited_<place> · queen_chamber_open.
  //   (인물 조우 pity 인 `__seen:<id>` 는 counter 라 위 tickCounters 가 매 턴 감소시킨다 — 여기서 안 만짐.)
  //   ★ [5] connected_with:* 와 jealousy_rival:* 도 그 달(→다음 달 질투 해소)까지만 — 여기서 소거.
  // ★ [7] 잠행(불법) 깊은 시찰 — 맨얼굴의 실제 민심을 종합한다. 부담이 이미 있으면 그것을 확인하고(정보),
  //   없으면 안도를(민심 flag). 위험(발각)을 감수하고 두루 돌아본 왕만 진짜 판세를 안다.
  //   ★ 합법 시찰은 이 flag 를 세우지 않는다(꾸민 얼굴 — 분위기일 뿐). 불법·깊게만 실제 민심.
  if (next.flags.outing_deep_look === true) {
    const anyBurden = Object.keys(next.flags).some(
      (k) => k.startsWith('people_burdened_') && next.flags[k],
    )
    next.flags = {
      ...next.flags,
      [anyBurden ? 'people_burdened_visit' : 'people_relieved_visit']: true,
    }
  }

  const clearedFlags = { ...next.flags }
  let flagsDirty = false
  for (const key of Object.keys(clearedFlags)) {
    if (
      clearedFlags[key] &&
      (key === 'went_out' ||
        key === 'queen_chamber_open' ||
        key === 'office_search_open' || // ★ [4] 집무실 수색 게이트도 그 턴에만
        key === 'outing_this_month' || // ★ [5] 궁 밖 월 1회 게이트 — 다음 달 리셋
        key === 'outing_this_month_2' || // ★ [7] 친정 후 두 번째 외출 게이트 — 다음 달 리셋
        key === 'outing_deep_look' || // ★ [7] 잠행 깊은 시찰 신호 — 종합 뒤 소거
        key === 'connected_this_month' || // ★ [5] 이 달의 깊은 만남(소득 1회) — 다음 달 리셋
        key.startsWith('met_month:') || // ★ [5] 소득 1회(그 달 만난 인물) — 다음 달 리셋
        key === 'chapel_faith_this_month' || // ★ [9-A] 대예배당 신앙 월 1회 게이트 — 다음 달 리셋
        key.startsWith(CONNECTED_WITH_PREFIX) || // ★ [5] 그 달 만난 상대(X) — 질투 해소 뒤 소거
        key.startsWith(JEALOUSY_RIVAL_PREFIX) || // ★ [5] 질투 rival flag — 다음 턴 소거(해소는 이번 턴 event 상)
        key.startsWith('visited_'))
    ) {
      clearedFlags[key] = false
      flagsDirty = true
    }
  }
  if (flagsDirty) next.flags = clearedFlags

  // 3-b. 위험 누적 — 조기 데드엔딩 씨앗(심신 파탄 / 의심 무방비).
  //   숨은 카운터라 UI 에 없고, surprises.ts 의 경고·데드 이벤트가 조건으로 읽는다.
  next.counters = { ...next.counters, ...updateRisk(next) }

  // ★ [2] 병(강제 휴식) 판정 — 심신이 바닥(<8)이거나 파탄(strain)이 임박(≥8)하면 다음 달은 강제 휴식.
  //   ★ 병이 파탄의 차단기다: strain 이 12(파탄)에 닿기 전에 앓아눕혀 회복·리셋시킨다. 그래서
  //     신뢰가 낮아 파탄을 회피 못 하는 플레이(선호 무시+무리)도 데드로 강제되지 않는다.
  //   회복 월(forcedRest)엔 방금 추슬렀으니 재검사하지 않는다 → 강제 휴식은 1달로 제한.
  if (!forcedRest) {
    const strain = next.counters?.[RISK_STRAIN] ?? 0
    if ((next.wellbeing ?? 100) < ILL_WELLBEING || strain >= ILL_STRAIN) {
      next.flags = { ...next.flags, forced_rest: true }
    }
  }

  // ★ [3] 권세 자연 감소 — 가만있으면 잊힌다(−1/월). 연회·정무로 쌓지 않으면 서서히 마른다.
  //   결정론적(정상·제거 동일)이라 ablation 에 영향 없다. 바닥 0.
  next.courtStanding = Math.max(0, (next.courtStanding ?? 0) - 1)

  // ★ [3] 파생 flag — 조건(matchesCondition)이 못 세는 것들을 매 턴 flag 로 굳힌다.
  //   people_favor: 민심이 왕 편(안도 ≥ MIN). tide_turned: 담판 판세가 기욺(넷 중 둘).
  const favor = reliefCount(next) >= PEOPLE_FAVOR_MIN
  const strongStanding = (next.courtStanding ?? 0) >= STANDING_STRONG
  next.flags = {
    ...next.flags,
    people_favor: favor,
    tide_turned: tideHasTurned(next),
    // court_backing: 조정이 왕 편(권세 강함) — 반란 위기의 '조정으로 진압' 선택이 조건으로 읽는다.
    court_backing: strongStanding,
    // ★ [3] 섭정 적대 래치 — 친정 후 반란 모의(의심)가 문턱을 넘은 적 있으면 결렬(밀려난 섭정공이 적대).
    //   끝까지 낮게 관리하면 중립. 한 번 켜지면 유지(래치). 비-bloodoath 라 ablation-robust(B1 근본해결).
    regent_hostile:
      next.flags.regent_hostile === true ||
      (isPostAutonomy(next) &&
        (next.regentSuspicion ?? 0) >= RISK.regentHostileLatch &&
        next.flags.regent_retired !== true),
    // ★ [4] 처분 명분 — 혈서(과거 죄)·연판장(현재 반역)·반란 진압(현행범) 중 하나면 선제 처분이 정당하다.
    //   증거가 '판단'을 '증명'으로 바꾼다. 아무것도 없이 치면 폭군.
    purge_justified:
      next.flags.blood_oath_complete === true ||
      next.flags.collective_treason === true ||
      next.flags.rebellion_crushed === true,
    // ★ [4] 공표가 먹히는 판 — 밖(민심)이든 안(권세)이든 왕을 받치면 사람들이 왕의 말을 믿는다.
    king_trusted: favor || strongStanding,
  }

  // ★ [7] 친정 후 외출 안전(#26) — 실권이 있으면 궁 밖에 나가도 눈치 볼 필요가 준다(발각 없음).
  //   단 반란 국면(regent_hostile)이면 밀려난 섭정이 노려 위험이 돌아온다(outing-caught 재발동).
  //   regent_hostile 이 이 위 블록에서 갱신되므로 그 뒤에 읽는다.
  next.flags = {
    ...next.flags,
    outing_safe: isPostAutonomy(next) && next.flags.regent_hostile !== true,
  }

  // ★★ [9-C1] 참칭 전쟁 판정 — 스스로 황제를 칭한(empire_claimed) 왕에게 20세에 제국이 온다.
  //   warOutcome 이 명분·국력·⑤·민심·권세·③를 다 읽어 승/패를 낸다(난수 없음, 한 번만).
  //   여기서 flag 만 굳히고, 서사(전쟁 장면)는 war-victory/war-defeat 이벤트가 다음 달에 자동 발동해 드러낸다.
  //   승리 시 emperor flag → 엔딩 텍스트의 {왕} 토큰이 황제/여제로 해석된다(엔딩 한정).
  if (next.flags.empire_claimed === true && next.age >= 20 && next.flags.war_resolved !== true) {
    const won = warOutcome(next) === 'won'
    next.flags = {
      ...next.flags,
      war_resolved: true,
      [won ? 'war_won' : 'war_lost']: true,
      ...(won ? { emperor: true } : {}),
    }
  }

  // ★ [5] 질투 — 문어발의 대가(제한이 아니라 대가). 이 달 깊은 만남이 있었고 다른 연애 대상도
  //   마음에 두고 있으면(2인↑ 30↑) 가끔(쿨다운) 질투가 뜬다. planJealousy 가 조건·대상(Y)을 정한다.
  //   달래기의 '다른 쪽 하락' 대상(X=rival)을 flag 로 남겨 두면(다음 턴 소거) 해소 때 읽는다.
  const jealousyId = planJealousy(next, connectedThisMonth, rivalId)
  if (jealousyId) {
    if (rivalId) next.flags = { ...next.flags, [jealousyRivalFlag(rivalId)]: true }
    next.counters = { ...next.counters, [JEALOUSY_CD]: JEALOUSY_COOLDOWN }
  }

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
        // ★ [2] 손 풀 소소도 setFlags 를 적용한다 — 수확철 풍작/흉작이 people flag 를 세운다(AI 없이).
        if (!minor.beat.isAi && ev.setFlags) next.flags = { ...next.flags, ...ev.setFlags }
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
  // ★ [5] 질투는 endTurn 이 파생 발동해 enqueue(조우 대화처럼 별지면 VN). 큐 뒤에 붙인다.
  next.pendingEventIds = [...queued.map((e) => e.id), ...(jealousyId ? [jealousyId] : [])]
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
    forcedRest, // ★ [2] 병 회복 월이면 컷신이 "앓아누웠다"를 그린다.
  }

  return next
}
