import { CHARACTERS, CHARACTER_BY_ID, DEEP_BOND_THRESHOLD } from '../data/characters'
import type { Character, GameState } from '../types/game'
import { matchesCondition } from './eventEngine'

/**
 * 연애 게이팅과 배타성 (M2b-3a → 하드 배타성).
 *
 * ★ 배타성은 이제 **하드**다. 결정적 씬을 수락하면 한 명으로 확정되고
 *   나머지 로맨스는 닫힌다(romance_settled 마스터 게이트). 호감도는 여전히 여러 명과
 *   동시에 쌓을 수 있지만(탐색기), "확정"은 최대 하나다.
 *
 *   호감도(affectionOf·isDeepBond)와 확정(isRomanceConfirmed)은 별개다 —
 *   고유장치는 호감도 70 에만 게이트되어 로맨스 확정과 무관하게 열린다.
 */

/** 한 명이라도 확정됐으면 모든 결정적 씬이 닫힌다. */
export function isRomanceSettled(game: GameState): boolean {
  return game.flags['romance_settled'] === true
}

/** 이 캐릭터로 로맨스가 확정됐는지. */
export function isRomanceConfirmed(game: GameState, charId: string): boolean {
  return game.flags[`romance_confirmed:${charId}`] === true
}

/** 지금 확정된 캐릭터 id. 없으면 null. romance_settled 가 최대 하나를 보장한다. */
export function confirmedRomance(game: GameState): string | null {
  return CHARACTERS.find((c) => isRomanceConfirmed(game, c.id))?.id ?? null
}

export function affectionOf(game: GameState, charId: string): number {
  return game.affection[charId] ?? CHARACTER_BY_ID[charId]?.startingAffection ?? 0
}

/** 데뷔탕트(①②③⑤) 또는 별도 조건(④)을 충족했는지. */
export function isRomanceUnlocked(character: Character, game: GameState): boolean {
  return matchesCondition(game, character.romanceUnlock)
}

/**
 * 지금 궁에 있는지. presence 가 없는 인물(상주)은 언제나 true.
 *
 * ★ isRomanceUnlocked 와 일부러 나눠 둔다. 해금은 영구적이고 되돌아가지 않지만
 *   체류는 계절마다 바뀐다. 둘을 하나로 합치면 "잠김"과 "부재"가 구분되지 않는다.
 */
export function isPresent(character: Character, game: GameState): boolean {
  if (!character.presence) return true
  return game.flags[character.presence.flag] === true
}

/** 실제로 지금 대화를 걸 수 있는지 — 해금됐고, 궁에 있고. */
export function canConverse(character: Character, game: GameState): boolean {
  return isRomanceUnlocked(character, game) && isPresent(character, game)
}

/** 호감도가 문턱을 넘었는지. 고유장치가 열리는 기준. */
export function isDeepBond(game: GameState, charId: string): boolean {
  return affectionOf(game, charId) >= DEEP_BOND_THRESHOLD
}

/** 지금 깊은 관계인 캐릭터들. 하나로 제한하지 않는다. */
export function deepBonds(game: GameState): Character[] {
  return CHARACTERS.filter((c) => isDeepBond(game, c.id))
}

/** 지금 로맨스가 열려 있는 캐릭터들. */
export function unlockedCharacters(game: GameState): Character[] {
  return CHARACTERS.filter((c) => isRomanceUnlocked(c, game))
}

/** 새 게임의 호감도 초기값. */
export function initialAffection(): Record<string, number> {
  return Object.fromEntries(CHARACTERS.map((c) => [c.id, c.startingAffection]))
}
