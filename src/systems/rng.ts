import type { Rng } from './effects'

/**
 * 게임이 쓰는 난수원 한 곳.
 *
 * 평소에는 Math.random 이다. 존재 이유는 **검증에서 갈아끼우기 위해서**다 —
 * 활동 효과의 ±variance 와 확률 발동이 난수를 쓰기 때문에, 같은 코드로 두 번 돌려도
 * 결과가 미세하게 갈린다. 그 상태로 두 빌드를 비교하면 차이가 나와도
 * 그게 코드 차이인지 난수인지 가릴 수 없다.
 *
 * ★ 상수 0.5 를 넣으면 variance 가 정확히 0 이 된다:
 *     roll = amount + floor(0.5 × (2v+1)) − v = amount + v − v = amount
 *   모든 v 에 대해 성립하므로 특수 처리가 필요 없다.
 */
let ambient: Rng = Math.random

/** 게임 코드가 부르는 난수. 항상 이걸 통해서만 뽑는다. */
export const rng: Rng = () => ambient()

/** 검증 전용. 난수원을 갈아끼운다. */
export function setRng(fn: Rng | null): void {
  ambient = fn ?? Math.random
}

/** variance 를 0 으로 만드는 결정론 모드. */
export function setDeterministic(on: boolean): void {
  setRng(on ? () => 0.5 : null)
}
