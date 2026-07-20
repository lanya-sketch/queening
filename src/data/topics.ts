import type { TalkTopic } from '../types/game'

/**
 * 대화 중 해금되는 고정 화제 (M2b-3c-2).
 *
 * ★ 이 배열이 전부다. 새 화제를 다른 캐릭터에 얹는 데 필요한 코드 변경은 없다 —
 *   객체 하나를 더하고 씬을 data/scenes 에 쓰면 끝난다.
 *   (verify:devices B 절이 임시 토픽을 실제로 얹어 이 성질을 시연한다)
 *
 * 왜 결정론적 보상(effects)을 붙이는가:
 *   호감도는 AI 응답당 ±3 이 상한이라, 깊은 관계(70)까지 가는 길이 전적으로
 *   모델의 델타 제안 빈도에 달려 있었다. 화제 해금에 고정 보상을 붙이면
 *   **코드가 소유하는 확실한 진척**이 생긴다. 체류 기간을 늘리는 것보다 이쪽이 맞다 —
 *   한 턴 안의 대화 횟수에는 상한이 없어서 체류 연장은 병목을 풀지 못한다.
 */
export const TOPICS: TalkTopic[] = [
  {
    id: 'keyword_commander_house_history',
    charId: 'commander',
    label: '가문의 역사를 묻는다',
    // 격식이 단단한 사람이 사적인 것을 꺼내려면 그만한 사이여야 한다.
    unlock: { affection: { commander: { min: 55 } } },
    sceneId: 'scene-commander-house-history',
    effects: [{ target: { kind: 'affection', charId: 'commander' }, amount: 8 }],
    setFlags: { commander_house_known: true },
  },
]

export const TOPIC_BY_ID: Record<string, TalkTopic> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t]),
)

/** 이미 꺼낸 화제인지 기록하는 flag. 한 번 꺼낸 화제는 다시 뜨지 않는다. */
export function topicUsedFlag(topicId: string): string {
  return `topic:${topicId}`
}
