import type { Scene, SceneLine } from '../../types/game'

/**
 * 조기 데드엔딩 씬 (월 단위 전환 2단계).
 *
 * ★ 정식 엔딩(골격×삽입 조립)과 다르다 — 데드는 짧고 손으로 쓴 고정 씬 하나다.
 *   AI 없음, 판정(judgeEnding) 우회. EndedScreen 이 dead_end 이유로 이 씬을 고른다.
 *
 * ★ 이번 단계는 대표 2종. 나머지 확장은 후속 라운드(구조가 이미 열려 있다 —
 *   DEAD_END_SCENES 에 이유 하나를 더하면 끝).
 */

const N = (text: string): SceneLine => ({ speaker: 'narration', text })

export const DEAD_END_SCENES: Record<string, { title: string; lines: SceneLine[] }> = {
  심신파탄: {
    title: '스러진 그릇',
    lines: [
      N('어린 몸은 아홉 해를 버티지 못했다.'),
      N('무리에 무리를 거듭한 나날이, 결국 병으로 돌아왔다.'),
      N('열이 며칠을 태우는 동안 궁은 숨을 죽였고, 스승은 문 밖을 떠나지 못했다.'),
      N('… 그릇은 나이와 함께, 잘 돌본 만큼 자란다 했다. 너무 이른 재촉이었다.'),
      N('옥좌는 다시 비었다. 왕이 되기도 전에.'),
    ],
  },
  의심무방비: {
    title: '먼저 온 밤',
    lines: [
      N('의심은 오래전부터 자라고 있었다. 지켜 줄 것을 아무것도 마련하지 못한 채로.'),
      N('섭정은 기다려 주지 않았다. 무방비한 밤을 골라 먼저 손을 썼다.'),
      N('실권도, 등을 맡길 사람도, 마지막 저항도 없었다.'),
      N('훗날 기록은 짧게만 적었다 — "어린 왕은 병으로 승하하였다."'),
      N('그 병의 이름을 아는 이는 아무도 말하지 않았다.'),
    ],
  },
}

/** 데드엔딩 씬을 조립한다. 알 수 없는 이유면 범용 안전망(빈 씬 방지). */
export function buildDeadEndScene(reason: string): { scene: Scene; title: string } {
  const found = DEAD_END_SCENES[reason]
  const title = found?.title ?? '아홉 해를 채우지 못하고'
  const lines = found?.lines ?? [N('어린 왕의 치세는 스무 살에 이르지 못하고 끝났다.')]
  return { scene: { id: `deadend:${reason}`, lines }, title }
}
