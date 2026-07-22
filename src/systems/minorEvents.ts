import { MINOR } from '../data/config'
import { DAILY_EVENTS } from '../data/events/daily'
import { INCIDENT_EVENTS } from '../data/events/incidents'
import type { GameEvent, GameState } from '../types/game'
import { isAiAvailable } from './aiGate'
import { counterOf } from './chance'
import type { Rng } from './effects'
import { matchesCondition } from './eventEngine'

/**
 * 통합 소소-비트 스케줄러 (월 단위 전환 2단계).
 *
 * ★ 매 턴(빈 달에 한해) **딱 한 번** 굴린다:
 *     ① 소소 사건이 뜨는가 (base + pity 천장 — "2달에 1번" 보장)
 *     ② 뜨면 손 풀 vs AI 돌발 중 하나를 확률로 고른다 (AI 는 키 있을 때만)
 *     ③ 손 풀이면 조건 통과분 중 rng 로 하나
 *
 *   손 풀은 키가 없어도 완전히 작동한다(대원칙). AI 는 다양성을 얹을 뿐이다.
 *
 * ★ 이 채널은 메인 이벤트 루프의 턴 상한(MAX_EVENTS_PER_TURN)과 **별개**다.
 *   큰 서사가 뜬 달에는 굴리지 않고(빈 달만 채운다), 굴려도 서사를 굶기지 않는다.
 *   그래서 계절판에서 돌발이 턴을 점유해 클루를 밀던 문제가 여기선 생기지 않는다.
 *
 * ★ 엔진에 이벤트 이름이 없다 — 풀은 데이터(DAILY_EVENTS), 선택기는 범용이다.
 *   상태는 두 카운터로만: `__pity:minor`(연속 빈 달), `__cooldown:<id>`(반복 방지).
 */

const PITY_KEY = '__pity:minor'
const COOLDOWN_KEY = (id: string) => `__cooldown:${id}`

/**
 * ablation·검증 훅. aiGate 와 같은 패턴 — 스토어(React)가 아니라 여기 모듈 변수를
 * devBridge 가 조정한다. 엔진은 이 값만 읽는다.
 */
let aiWeight: number = MINOR.aiWeight
let baseOverride: number | null = null
let incidentsAblated = false
let enabled = true

/** 소소 채널 자체를 끈다 — 다른 시스템을 격리 검증할 때(실게임은 항상 켜짐). */
export function setMinorEnabled(on: boolean): void {
  enabled = on
}

/** 돌발 압력 설정 — ablation 전용. rate 를 올리면 AI 돌발을 강제로 자주 터뜨린다. */
export function setIncidentPressure(rate: number): void {
  baseOverride = rate
  aiWeight = 1
}
/** 돌발을 스케줄러에서 들어낸다 — ablation('incidents') 전용. 손 풀만 남는다. */
export function setIncidentsAblated(on: boolean): void {
  incidentsAblated = on
}
/** 검증 사이 상태 초기화. */
export function resetMinorTuning(): void {
  aiWeight = MINOR.aiWeight
  baseOverride = null
  incidentsAblated = false
  enabled = true
}

export interface MinorBeat {
  event: GameEvent
  /** AI 돌발 자리표시자면 true — 효과는 없고 incidentStore 가 내용을 채운다. */
  isAi: boolean
}

/** 이번 빈 달의 소소-비트 결정. event 가 null 이면 이번엔 아무 일도 없다. */
export interface MinorResult {
  beat: MinorBeat | null
  /** turn.ts 가 그대로 병합할 카운터 패치(pity/쿨다운). */
  counters: Record<string, number>
}

function eligibleHandEvents(state: GameState): GameEvent[] {
  return DAILY_EVENTS.filter(
    (e) => counterOf(state, COOLDOWN_KEY(e.id)) <= 0 && matchesCondition(state, e.condition),
  )
}

/**
 * 빈 달에 호출한다. bigCount>0 인 달(큰 이벤트가 뜬 달)에는 호출하지 않는다 —
 * 그 판단은 turn.ts 가 한다(빈 달만 채운다는 규칙을 한곳에 둔다).
 */
export function scheduleMinor(state: GameState, rng: Rng): MinorResult {
  if (!enabled) return { beat: null, counters: {} }
  const pity = counterOf(state, PITY_KEY)
  const base = baseOverride ?? MINOR.base
  const p = pity >= MINOR.pityGuarantee ? 1 : base

  if (rng() >= p) {
    // 이번 빈 달도 조용하다 → 천장이 한 칸 찬다.
    return { beat: null, counters: { [PITY_KEY]: pity + 1 } }
  }

  // 소소가 떴다 → 천장 리셋.
  const counters: Record<string, number> = { [PITY_KEY]: 0 }

  // 이 자리가 "AI 돌발 자리"인지 먼저 정한다(rng 를 늘 소비해 결정론 스트림을 고정).
  const wantAi = aiWeight > 0 && rng() < aiWeight
  if (wantAi) {
    if (incidentsAblated) {
      // ★ ablation('incidents'): 돌발 자리를 **대체 없이 비운다**(순수 제거).
      //   손 풀로 메우면 정상 빌드엔 없던 콘텐츠가 끼어 대조가 흐려진다.
      return { beat: null, counters }
    }
    if (isAiAvailable()) {
      // 자리표시자 둘 중 하나. rng 로 갈라 결정론에서도 재현된다.
      const placeholder = INCIDENT_EVENTS[rng() < 0.5 ? 0 : 1] ?? INCIDENT_EVENTS[0]
      if (placeholder) return { beat: { event: placeholder, isAi: true }, counters }
    }
    // AI 를 원했으나 키가 없다(키리스) → 손 풀로 메운다(밀도 유지). 아래로 떨어진다.
  }

  const pool = eligibleHandEvents(state)
  if (pool.length === 0) return { beat: null, counters }
  const chosen = pool[Math.floor(rng() * pool.length)] ?? pool[0]
  counters[COOLDOWN_KEY(chosen.id)] = MINOR.poolCooldown
  return { beat: { event: chosen, isAi: false }, counters }
}
