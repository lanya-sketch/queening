import type { GameState } from '../types/game'

/**
 * 조기 데드엔딩 (월 단위 전환 2단계).
 *
 * ★ 정식 엔딩(judgeEnding, 20세 초과)과 **경계가 분명**하다. 데드엔딩은 20세 전에
 *   `dead_end:<이유>` flag 하나로 성립하고, 손으로 쓴 데드 씬으로 끝난다 —
 *   judgeEnding 을 거치지 않는다. GameState 에 새 필드가 없어(flag 뿐) 세이브 v7 그대로다.
 *
 * flag 는 boolean 만 담으므로(FlagSet), 이유는 `romance_confirmed:<id>` 와 같은 방식으로
 * 키에 실어 둔다. deadEndReason 이 그 키에서 이유를 뽑는다.
 */
export const DEAD_END_PREFIX = 'dead_end:'

/** 대표 2종 — surprises.ts 의 데드 이벤트가 이 flag 를 세운다. */
export const DEAD_END = {
  strain: `${DEAD_END_PREFIX}심신파탄`,
  exposure: `${DEAD_END_PREFIX}의심무방비`,
} as const

/** dead_end:* flag 가 서 있으면 그 이유를, 없으면 null. */
export function deadEndReason(state: GameState): string | null {
  for (const [key, on] of Object.entries(state.flags ?? {})) {
    if (on && key.startsWith(DEAD_END_PREFIX)) return key.slice(DEAD_END_PREFIX.length)
  }
  return null
}
