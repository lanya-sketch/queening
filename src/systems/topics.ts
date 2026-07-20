import { TOPICS, topicUsedFlag } from '../data/topics'
import type { GameState, TalkTopic } from '../types/game'
import { applyEffects } from './effects'
import { matchesCondition } from './eventEngine'

/**
 * 화제 해금 판정 (M2b-3c-2).
 *
 * 엔진은 어떤 캐릭터가 어떤 화제를 갖는지 모른다 — data/topics.ts 를 훑을 뿐이다.
 */

/** 지금 이 캐릭터에게 꺼낼 수 있는 화제들. 미해금·기사용은 빠진다. */
export function availableTopics(charId: string, game: GameState): TalkTopic[] {
  return TOPICS.filter(
    (t) =>
      t.charId === charId &&
      !game.flags[topicUsedFlag(t.id)] &&
      matchesCondition(game, t.unlock),
  )
}

/**
 * 화제를 꺼낸 결과를 상태에 반영한다.
 * 효과는 전부 데이터에 적힌 고정값이라 rng 를 쓰지 않는다.
 */
export function applyTopic(game: GameState, topic: TalkTopic): GameState {
  const { state } = applyEffects(game, topic.effects)
  return {
    ...state,
    flags: { ...state.flags, ...topic.setFlags, [topicUsedFlag(topic.id)]: true },
  }
}
