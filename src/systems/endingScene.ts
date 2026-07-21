import { ENDING_SKELETONS } from '../data/endings/skeletons'
import { ENDING_INSERTS } from '../data/endings/inserts'
import type { EndingResult, EndingSkeleton, Scene, SceneLine } from '../types/game'

/**
 * 엔딩 씬 조립 (M3-2).
 *
 * ★★ 이 함수는 **전함수**여야 한다 — 어떤 EndingResult 든 비지 않은 Scene 을 돌려준다.
 *    "빈 엔딩"이 불가능한 이유는 골격 목록에 catch-all(match: () => true, priority 0)이
 *    반드시 하나 있기 때문이다. anchor 에 맞는 삽입이 없으면 그 줄만 조용히 건너뛴다 —
 *    빈 자리는 오류가 아니라 정상이다(그 축이 이 세이브에 해당 없음).
 *    (verify:ending-scene A절이 무작위 1만 세이브로 이 성질을 확인한다)
 *
 * 판정(M3-1)은 읽기만 한다. 새 상태를 만들지 않는다.
 */

/** 매칭되는 골격 중 priority 최고. catch-all 이 있어 항상 하나는 나온다. */
function pickSkeleton(result: EndingResult): EndingSkeleton {
  let best: EndingSkeleton | null = null
  for (const skeleton of ENDING_SKELETONS) {
    if (!skeleton.match(result)) continue
    if (!best || skeleton.priority > best.priority) best = skeleton
  }
  // 이론상 catch-all 이 항상 받지만, 방어적으로 최소 골격을 둔다.
  return best ?? FALLBACK_SKELETON
}

const FALLBACK_SKELETON: EndingSkeleton = {
  id: 'fallback',
  match: () => true,
  priority: -1,
  lines: [{ speaker: 'narration', text: '아홉 해가 지났다. 그리고 그 뒤의 이야기가 시작된다.' }],
}

/** 한 anchor 에 들어갈 삽입들. nation 만 복수, 나머지는 최고 priority 하나. */
function insertsFor(anchor: string, result: EndingResult): SceneLine[] {
  const matched = ENDING_INSERTS.filter((i) => i.anchor === anchor && i.match(result))
  if (matched.length === 0) return []

  if (anchor === 'nation') {
    // 나라 향방은 배타가 아니다 — 매칭된 것을 priority 순으로 모두 잇는다.
    return [...matched]
      .sort((a, b) => b.priority - a.priority)
      .flatMap((i) => i.lines)
  }

  const best = matched.reduce((a, b) => (b.priority > a.priority ? b : a))
  return best.lines
}

export function buildEndingScene(result: EndingResult): Scene {
  const skeleton = pickSkeleton(result)
  const lines: SceneLine[] = []

  for (const line of skeleton.lines) {
    if (line.anchor) {
      lines.push(...insertsFor(line.anchor, result))
    } else if (line.text) {
      lines.push({ speaker: line.speaker, text: line.text })
    }
  }

  // 골격이 전부 anchor 인데 삽입이 하나도 안 붙는 극단은 없어야 하지만, 방어한다.
  if (lines.length === 0) {
    lines.push({ speaker: 'narration', text: '아홉 해의 끝에서, {왕}은 자신이 걸어온 길을 돌아보았다.' })
  }

  return { id: `ending:${skeleton.id}`, lines }
}

/** 조립에 쓰인 골격 id — 검증에서 어떤 골격이 받았는지 확인용. */
export function endingSkeletonId(result: EndingResult): string {
  return pickSkeleton(result).id
}
