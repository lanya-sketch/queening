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

/** surprises.ts 의 데드 이벤트가 이 flag 를 세운다. */
export const DEAD_END = {
  strain: `${DEAD_END_PREFIX}심신파탄`,
  exposure: `${DEAD_END_PREFIX}의심무방비`,
  // ★ 세 번째 축 — 왕이 아니라 튜터(플레이어)가 쫓겨난다. 외출 발각 등으로 tutorRisk 누적.
  tutor: `${DEAD_END_PREFIX}해고`,
  // ★ [3] 넷째 축 — 친정 후 반란을 못 막아 폐위된다. 성격이 다르다: 앞의 셋은 못 이룬 것이고
  //   이건 실권 70을 찍고도 지키지 못한 것(성공했다가 무너진 것)이라 가장 아플 수 있다.
  rebellion: `${DEAD_END_PREFIX}폐위`,
  // ★ [3] 다섯째 축 — 반란(세력)보다 먼저 오는 암살(개인). 반란 모의가 차오르는 중,
  //   아무 대비(무예·궁정처세·신뢰·⑤·권세)도 없는 왕에게 칼이 온다. 스탯으로 막는 데드.
  assassination: `${DEAD_END_PREFIX}암살`,
} as const

/** dead_end:* flag 가 서 있으면 그 이유를, 없으면 null. */
export function deadEndReason(state: GameState): string | null {
  for (const [key, on] of Object.entries(state.flags ?? {})) {
    if (on && key.startsWith(DEAD_END_PREFIX)) return key.slice(DEAD_END_PREFIX.length)
  }
  return null
}
