import { matchesCondition, seenFlagId } from './eventEngine'
import { RECKONING_AFTERMATH, RECKONING_EVENTS } from '../data/events/reckoning'
import { DISPOSAL_EVENTS } from '../data/events/disposal'
import type { GameState } from '../types/game'

/**
 * ★ [8] 엔딩 직전 결산 — 청산을 9년의 결산으로.
 *
 * 청산(①②④⑤)과 여파는 더 이상 19세에 auto-fire 하지 않는다(RAW_EVENTS 에서 뺐다).
 * 게임이 끝나면(hasReachedEnd, 단 데드엔딩 제외) 'ended' 로 가기 전에 이 함수가
 * 다음 결산 이벤트를 하나씩 골라 준다. gameStore 의 큐-비움 전환이 이걸 호출한다.
 *
 * ★ 종료 보장: 고른 이벤트는 enqueue 시 seen flag 가 서고(청산은 X_reckoned 도), 그래서
 *   매 호출마다 후보가 단조 감소한다 → 반드시 null(=엔딩)로 수렴한다. 결산에서 막히지 않는다.
 */

/** 처분(섭정공) — 청산과 성격이 다르나(실권 장악), 치세 중 못 쳤으면 결산 맨 앞에서 한 번 더. */
const DISPOSAL = DISPOSAL_EVENTS.find((e) => e.id === 'regent-disposal')

/** 청산 이벤트 id → charId (heir-reckoning → heir). ★ [9-C2] prince 전쟁 처분(prince-war-*)은 모두 'prince'. */
const charOfReckoning = (id: string): string =>
  id.startsWith('prince-war-') ? 'prince' : id.replace(/-reckoning$/, '')

/**
 * 다음에 보여줄 결산 이벤트 id(없으면 null = 엔딩으로).
 *   우선순위: (1) 처분 폴백 → (2) 여파(방금 청산한 이 후일담) → (3) 청산(호감도 낮은 순).
 *   ★ (2)를 (3)보다 먼저 둬 "청산 → 여파 → 다음 청산" 으로 체인된다.
 */
export function nextEndgameEvent(game: GameState): string | null {
  const seen = (id: string) => game.flags[seenFlagId(id)] === true

  // (1) 처분 폴백 — 치세 중 못 친 섭정공을 결산 맨 앞에서(regent_disposed 가 ① 청산을 열기도 하니).
  //   치세 중 이미 처분 이벤트가 떴으면(seen) 다시 묻지 않는다.
  if (DISPOSAL && !seen(DISPOSAL.id) && matchesCondition(game, DISPOSAL.condition)) return DISPOSAL.id

  // (2) 여파 — 방금 청산한 이의 후일담(결과 flag + 호감 버킷). 다음 청산보다 먼저.
  for (const ev of RECKONING_AFTERMATH) {
    if (!seen(ev.id) && matchesCondition(game, ev.condition)) return ev.id
  }

  // (3) 청산 — 자격(정치 flag + romance_confirmed:X=false + X_reckoned=false) 충족분을 호감도 낮은 순으로.
  //   덜 가까운 이부터 정리하고 가장 정든 사람을 마지막에 — 결산이 갈수록 무거워진다.
  const eligible = RECKONING_EVENTS
    .filter((ev) => !seen(ev.id) && matchesCondition(game, ev.condition))
    .sort((a, b) => (game.affection[charOfReckoning(a.id)] ?? 0) - (game.affection[charOfReckoning(b.id)] ?? 0))
  return eligible[0]?.id ?? null
}

/**
 * ★ [8] 지금 상태에서 자격이 되는 청산 이벤트 id 전부(seen·순서 무시, 조건만). 검증용.
 *   자격 로직은 그대로다(정치 flag + romance_confirmed:X=false + minAge). 발동 시점만 결산으로 옮겼다.
 */
export function eligibleReckonings(game: GameState): string[] {
  return RECKONING_EVENTS.filter((ev) => matchesCondition(game, ev.condition)).map((e) => e.id)
}

/** ★ [8] 지금 상태에서 자격이 되는 청산 여파 id 전부(결과 flag + 호감 버킷). 검증용. */
export function eligibleAftermath(game: GameState): string[] {
  return RECKONING_AFTERMATH.filter((ev) => matchesCondition(game, ev.condition)).map((e) => e.id)
}
