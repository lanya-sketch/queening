import { CHARACTERS, CHARACTER_BY_ID, DEEP_BOND_THRESHOLD } from '../data/characters'
import type { Character, GameState } from '../types/game'
import { matchesCondition } from './eventEngine'

/**
 * 연애 게이팅과 배타성 (M2b-3a).
 *
 * 배타성은 **느슨하다** — 여러 캐릭터와 동시에 호감도를 쌓을 수 있고,
 * 여러 명이 동시에 "깊은 관계"가 될 수도 있다. 하드 잠금은 두지 않는다.
 * 고유장치·엔딩급 결과의 조율은 M2b-3c 와 M3 의 몫이다.
 */

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
