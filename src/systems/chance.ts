import { CHARACTER_BY_ID } from '../data/characters'
import type { ChanceRule, GameEvent, GameState } from '../types/game'
import type { Rng } from './effects'

/**
 * 확률 발동 엔진.
 *
 * ★ 여기에는 어떤 이벤트의 이름도 없다. ③ 왕족의 등장도, M2b-4 의 흉년도
 *   전부 데이터가 들고 있는 ChanceRule 일 뿐이고 이 파일은 그것을 계산만 한다.
 *
 * 상태는 두 개의 내부 카운터로만 관리한다. 이벤트를 추가하는 쪽에서
 * 따로 챙길 부기가 없다는 게 이 설계의 핵심이다.
 */

const PITY_KEY = (eventId: string) => `__pity:${eventId}`
const COOLDOWN_KEY = (eventId: string) => `__cooldown:${eventId}`

/** 상한을 두는 이유: 어떤 조합으로도 "무조건"이 되지 않게. 천장은 pity 만 준다. */
const MAX_ROLLED_CHANCE = 0.95

export function counterOf(state: GameState, key: string): number {
  return state.counters?.[key] ?? 0
}

export function pityCount(state: GameState, eventId: string): number {
  return counterOf(state, PITY_KEY(eventId))
}

export function isCoolingDown(state: GameState, eventId: string): boolean {
  return counterOf(state, COOLDOWN_KEY(eventId)) > 0
}

/**
 * 이번 계절의 발동 확률. 0~1.
 * pity 가 guarantee 에 도달했으면 1 을 돌려준다(천장).
 *
 * activityIds 는 **그 턴에 실제로 수행한 활동** — 유도(lure)는 즉발이다.
 * "사냥 대회를 연 그 계절 끝에 온다"가 플레이어에게 가장 읽히는 인과라서.
 */
export function chanceOf(
  rule: ChanceRule,
  state: GameState,
  eventId: string,
  activityIds: string[],
): number {
  const misses = pityCount(state, eventId)
  if (rule.pity && misses >= rule.pity.guarantee) return 1

  let p = rule.base

  if (rule.perAffection) {
    const { charId, at100 } = rule.perAffection
    const affection =
      state.affection?.[charId] ?? CHARACTER_BY_ID[charId]?.startingAffection ?? 0
    p += at100 * (affection / 100)
  }

  if (rule.lures) {
    for (const id of activityIds) p += rule.lures[id] ?? 0
  }

  if (rule.pity && misses > rule.pity.after) {
    p += rule.pity.step * (misses - rule.pity.after)
  }

  return Math.min(MAX_ROLLED_CHANCE, Math.max(0, p))
}

/**
 * 판정 결과와, 그에 따른 카운터 변화를 함께 돌려준다.
 * 상태를 직접 만지지 않고 patch 로 넘겨 turn.ts 한 곳에서만 쓰기가 일어나게 한다.
 */
export function rollChance(
  event: GameEvent,
  state: GameState,
  activityIds: string[],
  rng: Rng,
): { fired: boolean; counters: Record<string, number> } {
  const rule = event.chance
  // 확률 규칙이 없는 이벤트는 지금까지와 동일하게 조건만으로 발동한다.
  if (!rule) return { fired: true, counters: {} }

  // 쿨다운 중에는 주사위를 굴리지도 않고, 헛탕으로 세지도 않는다.
  if (isCoolingDown(state, event.id)) return { fired: false, counters: {} }

  const p = chanceOf(rule, state, event.id, activityIds)
  const fired = rng() < p

  if (fired) {
    return {
      fired: true,
      counters: {
        [PITY_KEY(event.id)]: 0,
        ...(rule.cooldown ? { [COOLDOWN_KEY(event.id)]: rule.cooldown } : {}),
      },
    }
  }

  // 조건은 맞았는데 떨어졌다 → 천장이 한 칸 찬다.
  return { fired: false, counters: { [PITY_KEY(event.id)]: pityCount(state, event.id) + 1 } }
}

/**
 * 계절 타이머 일괄 감소. 매 턴 정확히 한 번 호출한다.
 *
 * ★ pity 카운터만 예외로 건드리지 않는다 — 그건 "남은 시간"이 아니라
 *   "쌓인 헛탕"이라 줄어들면 안 된다. 나머지는 전부 규칙 하나로 준다.
 */
export function tickCounters(counters: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {}
  for (const [key, value] of Object.entries(counters)) {
    if (key.startsWith('__pity:')) {
      next[key] = value
      continue
    }
    if (value > 0) next[key] = value - 1
  }
  return next
}
