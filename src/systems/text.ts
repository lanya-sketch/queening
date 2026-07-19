import { CHARACTER_BY_ID } from '../data/characters'
import { CHARACTER_TERMS, MONARCH_TERMS, TOKEN_PATTERN } from '../data/lexicon'
import type { GameState } from '../types/game'

/**
 * 서사 텍스트의 토큰 치환 (M2b-3a).
 *
 * 모든 표시 텍스트는 data/ 에 토큰을 품은 채로 있다가 **렌더 직전에만** 치환된다.
 * 저장되는 것은 언제나 토큰이므로, (다) 전면 성별 선택이 열려도 텍스트는 그대로다.
 *
 * ★ 복합어는 절대 건드리지 않는다 — 치환은 오직 명시적 토큰 `{...}` 에만 일어난다.
 *   "선왕", "왕국", "왕대비" 는 토큰이 아니므로 무슨 일이 있어도 안전하다.
 */
export function resolveText(text: string, game: GameState): string {
  if (!text.includes('{')) return text

  const monarch = MONARCH_TERMS[game.monarchGender]

  return text.replace(TOKEN_PATTERN, (whole, name: string, arg?: string) => {
    // 캐릭터를 가리키는 토큰 — {그:heir}, {이름:heir}
    if (arg) {
      const character = CHARACTER_BY_ID[arg]
      if (!character) return whole
      const terms = CHARACTER_TERMS[character.gender]
      switch (name) {
        case '그':
          return terms.third
        case '이름':
          return character.name
        case '호칭':
          return terms.title
        default:
          return whole
      }
    }

    // 군주를 가리키는 토큰
    switch (name) {
      case '왕':
        return monarch.title
      case '전하':
        return monarch.address
      case '그':
        return monarch.third
      case '왕자':
        return monarch.child
      default:
        return whole
    }
  })
}
