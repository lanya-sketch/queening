import type { GameState, Scene, SceneLine } from '../types/game'
import {
  MEET_LINE, OFFICE, PLACE_BY_ID, QUEEN, princeAvailable,
  type PlaceId, type PresenceCharId,
} from '../data/places'
import { chamberSearchEligible, CHAMBER } from '../data/events/bloodoath'
import { knowsTreason, officeSearchEligible, OFFICE_SEARCH_OPEN } from '../data/events/treason'
import { encounterFor } from '../data/events/encounters'
import { RISK_TUTOR } from './risk'
import type { Rng } from './effects'

/**
 * 궁 안 이동 — 방문 판정 (2-b-1).
 *
 * ★ 순수 로직: (place, game, rng) → 방문 계획(발동할 이벤트 id · 조립 씬 · 세울 flag · counter).
 *   gameStore.visitDestination 이 이 계획을 적용한다. 스탯·__risk 0.
 * ★ 세계관 힌트는 flag-free. 왕대비궁 수색만 chamber-search(bloodoath)로 분기.
 */

// ── transient flag (turn.ts 가 턴 종료에 소거) ──
export const VISITED_MONTH = 'visited_this_month'
export const visitedFlag = (place: PlaceId) => `visited_${place}`
/** chamber-search 자동발동 차단 게이트 — 방문이 세우고, 그 자리에서만 수색이 열린다. */
export const QUEEN_CHAMBER_OPEN = 'queen_chamber_open'

/** 조립 씬이 얹히는 고정 슬롯(EndedScreen 패턴 — 한 번에 하나만 활성이라 덮어써도 안전). */
export const SCENE_PLACE_VISIT = 'scene-place-visit'

// ── 인물 조우 pity(회전) — 조우 시 세팅, 매 턴 감소하는 counter ──
const SEEN_FRESH = 10
const seenCounter = (id: PresenceCharId) => `__seen:${id}`
const PITY_SLOPE = 1.5 // 오래 못 만날수록 가중(seen 0 → ×2.5, 방금 봄 → ×1)
const EMPTY_FRACTION = 0.35 // 아무도 없을 여지(약 1/4)

export interface VisitPlan {
  eventId: string
  /** 조립 씬(chamber-search 처럼 제 씬을 쓰는 경우 null). */
  scene: Scene | null
  setFlags: Record<string, boolean>
  counters: Record<string, number>
}

/** ★ [5] 궁 밖 외출 월 1회. 궁 안 이동은 자유(횟수 제한 없음). */
export function outingsPerMonth(game: GameState): number {
  return game.flags[OUTING_MONTH] === true ? 0 : 1
}

/** ★ [5] 궁 밖 외출은 그 달에 나갔으면 잠긴다(큰 결심·위험). 궁 안 이동은 자유. */
export const OUTING_MONTH = 'outing_this_month'
/** ★ [5] 소득 1회 — 그 달 이미 만난 인물. 재방문해도 조우 대화·호감도 없이 짧은 인사만. */
export const metMonthFlag = (charId: string) => `met_month:${charId}`
/**
 * ★ [5] "자유롭되 소득은 1회" — 궁 안을 하루에도 여러 곳 돌 수 있으나, 마음을 나누는 깊은 만남
 *   (조우 대화·호감도)은 그 달에 하나뿐. 이것이 집중(빠르고 안전) vs 분산(느리고 흔들림)을
 *   가르는 축이다 — 자유 이동으로 만남 기회가 몇 배가 돼도 소득은 한 번뿐.
 */
export const CONNECTED_MONTH = 'connected_this_month'
/** ★ [5] 그 달 깊이 만난 인물(X) — 질투의 '달래기'가 '다른 쪽 하락' 대상으로 읽는다. transient. */
export const connectedWithFlag = (charId: string) => `connected_with:${charId}`

/**
 * ★ [5] 방문 가능 여부. 궁 안(서고/정원/연무장/왕대비궁/집무실)은 자유(일상),
 *   궁 밖(순찰/잠행)은 월 1회(큰 결심). place 없이 부르면 화면 진입 가능 여부(궁 안이 늘 있으니 true).
 */
export function canVisit(game: GameState, place?: PlaceId): boolean {
  if (game.phase !== 'schedule') return false
  if (!place) return true
  const kind = PLACE_BY_ID[place]?.kind
  if (kind === 'outing-legal' || kind === 'outing-sneak') return game.flags[OUTING_MONTH] !== true
  return true // 궁 안은 자유
}

/** 그날 그 장소에 누가 있나 — 가중치 × pity. 없을 수도 있다(null). */
function rollPresence(place: PlaceId, game: GameState, rng: Rng): PresenceCharId | null {
  const weights = PLACE_BY_ID[place].presence
  if (!weights) return null
  const entries: [PresenceCharId, number][] = []
  let total = 0
  for (const [id, base] of Object.entries(weights) as [PresenceCharId, number][]) {
    if (id === 'prince' && !princeAvailable(game)) continue
    const seen = game.counters?.[seenCounter(id)] ?? 0
    const pity = 1 + PITY_SLOPE * ((SEEN_FRESH - Math.min(seen, SEEN_FRESH)) / SEEN_FRESH)
    const w = (base ?? 0) * pity
    entries.push([id, w])
    total += w
  }
  if (total <= 0) return null
  const pick = rng() * (total * (1 + EMPTY_FRACTION))
  let acc = 0
  for (const [id, w] of entries) {
    acc += w
    if (pick < acc) return id
  }
  return null // empty slot
}

/**
 * ★ 검증 전용 부재 강제(결정론을 안 깨고 방문 경로를 밟기 위해).
 *   null 이면 정상 롤. simulate/ablation 은 rng 를 건드리지 않고 이걸로 부재를 만든다.
 */
let forceAbsent: boolean | null = null
export function setForceQueenAbsent(v: boolean | null): void {
  forceAbsent = v
}

/** 왕대비 부재 롤 — clue_apothecary 전 15% / 후 50%. */
function rollQueenAbsent(game: GameState, rng: Rng): boolean {
  if (forceAbsent !== null) return forceAbsent
  const p = game.flags.clue_apothecary ? 0.5 : 0.15
  return rng() < p
}

/** ★ [4] 섭정공 집무실 부재 롤 — 연판장 존재를 알면 50% / 모르면 15%. (검증 override 는 forceAbsent 공유) */
function rollOfficeAbsent(game: GameState, rng: Rng): boolean {
  if (forceAbsent !== null) return forceAbsent
  const p = knowsTreason(game) ? 0.5 : 0.15
  return rng() < p
}

/** 로테이션용 한 조각 — flag-free(clue_* 안 세움). 소소 반복은 허용. */
function pickLore(place: PlaceId, rng: Rng): string {
  const pool = PLACE_BY_ID[place].lorePool
  if (!pool.length) return ''
  return pool[Math.floor(rng() * pool.length) % pool.length]
}

const N = (text: string): SceneLine => ({ speaker: 'narration', text })

/** 장소 조립 씬 — 장소 서술 + (조우 인물 or 조용함) + 세계관 한 조각. */
function buildPlaceScene(place: PlaceId, present: PresenceCharId | null, lore: string): Scene {
  const def = PLACE_BY_ID[place]
  const lines: SceneLine[] = [N(def.location)]
  if (present) {
    // 화자를 그 인물로 두어 반신 스프라이트가 뜨게 한다("누가 있는지 보이는 것"까지 — 대화는 2-b-2).
    lines.push({ speaker: present, text: MEET_LINE[present] })
  } else if (def.emptyLine) {
    lines.push(N(def.emptyLine))
  }
  if (lore) lines.push(N(lore))
  return { id: SCENE_PLACE_VISIT, lines }
}

/** 왕대비궁 — 재실(문안)·부재(???/미달/수색)로 분기. */
function planQueen(game: GameState, rng: Rng, base: VisitPlan): VisitPlan {
  const absent = rollQueenAbsent(game, rng)
  const loc = PLACE_BY_ID.queen.location
  if (!absent) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), { speaker: 'queen_mother', text: QUEEN.audience }] } }
  }
  // 부재.
  if (!game.flags.clue_apothecary) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N(QUEEN.lockedBeforeClue)] } }
  }
  const elig = chamberSearchEligible(game)
  if (elig) {
    // ★ 그 자리에서 수색 발동 — 게이트를 열고 chamber-search 를 enqueue(제 씬·선택 재사용).
    return { eventId: elig, scene: null, setFlags: { ...base.setFlags, [QUEEN_CHAMBER_OPEN]: true }, counters: base.counters }
  }
  if (game.flags[CHAMBER.searched]) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N('서랍은 이미 지난 일이 되었다. 빈 방에는 향냄새만 남아 있었다.')] } }
  }
  return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N(QUEEN.lockedGate)] } }
}

/** ★ [4] 섭정공 집무실 — 재실(정무)·부재(???/미달/수색)로 분기. 왕대비궁 planQueen 미러. */
function planOffice(game: GameState, rng: Rng, base: VisitPlan): VisitPlan {
  const absent = rollOfficeAbsent(game, rng)
  const loc = PLACE_BY_ID.office.location
  if (!absent) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), { speaker: 'regent', text: OFFICE.audience }] } }
  }
  // 부재.
  if (!knowsTreason(game)) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N(OFFICE.lockedBeforeClue)] } }
  }
  const elig = officeSearchEligible(game)
  if (elig) {
    // ★ 그 자리에서 수색 발동 — 게이트를 열고 office-search 를 enqueue.
    return { eventId: elig, scene: null, setFlags: { ...base.setFlags, [OFFICE_SEARCH_OPEN]: true }, counters: base.counters }
  }
  if (game.flags.collective_treason) {
    return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N('문갑은 이미 열렸던 자리가 되었다. 빈 서랍에는 먼지만 앉아 있었다.')] } }
  }
  return { ...base, scene: { id: SCENE_PLACE_VISIT, lines: [N(loc), N(OFFICE.lockedGate)] } }
}

/**
 * 방문 계획을 세운다(적용은 gameStore). 여기서 rng 를 다 뽑는다 — 결정론/검증이 갈아끼울 수 있게.
 */
export function planVisit(place: PlaceId, game: GameState, rng: Rng): VisitPlan {
  const def = PLACE_BY_ID[place]
  // ★ [5] 궁 안은 자유 — VISITED_MONTH 를 안 세운다(여러 번 방문 가능). visited_<place> 만 기록.
  const setFlags: Record<string, boolean> = { [visitedFlag(place)]: true }
  const counters: Record<string, number> = {}
  const base: VisitPlan = { eventId: def.eventId, scene: null, setFlags, counters }

  if (def.kind === 'queen') return planQueen(game, rng, base)
  if (def.kind === 'office') return planOffice(game, rng, base)

  if (def.kind === 'outing-legal') {
    // ★ [5] 궁 밖은 월 1회 — OUTING_MONTH 를 세워 이 달 추가 외출을 막는다.
    setFlags.outing_legal = true
    setFlags[OUTING_MONTH] = true
    return { ...base, scene: buildPlaceScene(place, null, pickLore(place, rng)) }
  }
  if (def.kind === 'outing-sneak') {
    // ★ went_out 을 세워 기존 발각(outing-caught) 체인을 그대로 탄다 — 턴 종료에 판정·소거.
    setFlags.went_out = true
    setFlags.outing_sneak = true
    setFlags[OUTING_MONTH] = true
    // ★ 흔적 — 몰래 다닐 때마다 __risk:tutor 가 +1(예전 sneak 활동의 역할). 튜터 해고 데드의 공급원.
    //   (__risk: 는 누적기라 tickCounters 가 안 깎는다 — 여기서 현재값+1 로 세운다.)
    counters[RISK_TUTOR] = (game.counters?.[RISK_TUTOR] ?? 0) + 1
    return { ...base, scene: buildPlaceScene(place, null, pickLore(place, rng)) }
  }

  // 일반 장소(서고/정원/연무장) — 인물 유동 조우.
  const present = rollPresence(place, game, rng)
  // ★ [5] 소득 1회 — 그 달 이미 만난 인물이거나, 이미 이 달의 깊은 만남을 썼으면 조우 대화 없이 짧게.
  const alreadyMet = present ? game.flags[metMonthFlag(present)] === true : false
  const connectedAlready = game.flags[CONNECTED_MONTH] === true
  if (present && !alreadyMet) {
    counters[seenCounter(present)] = SEEN_FRESH
    setFlags[metMonthFlag(present)] = true
    // ★ [5] 선택지 대화 — 이 달의 깊은 만남을 아직 안 썼고 조우 대화가 있으면 enqueue. 그 만남을 소진한다.
    const enc = connectedAlready ? null : encounterFor(present, game)
    if (enc) {
      setFlags[CONNECTED_MONTH] = true
      setFlags[connectedWithFlag(present)] = true // ★ [5] 질투 달래기의 '다른 쪽' 대상
      return { eventId: enc, scene: null, setFlags, counters }
    }
    // 이미 이 달의 깊은 만남을 썼거나(다른 인물), 조우 대화가 없음 → meet-line(소득 없음).
    return { ...base, scene: buildPlaceScene(place, present, pickLore(place, rng)) }
  }
  // 이미 만났거나 아무도 없음 — 조용한 장소(소득 없음).
  return { ...base, scene: buildPlaceScene(place, null, pickLore(place, rng)) }
}
