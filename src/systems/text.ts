import { CHARACTER_BY_ID } from '../data/characters'
import { CHARACTER_TERMS, DEFAULT_MONARCH_NAME, MONARCH_TERMS, TOKEN_PATTERN } from '../data/lexicon'
import type { Gender, GameState } from '../types/game'

/** 군주 표시 이름 — 비어 있으면 성별 기본값. 여러 화면이 공유하도록 한 곳에 둔다. */
export function monarchName(game: GameState): string {
  return game.monarchName?.trim() || DEFAULT_MONARCH_NAME[game.monarchGender]
}

/**
 * ★ 연애 대상의 성별(성별 제한 해제 1차). 세이브 선택이 우선, 없으면 기본 배치.
 *   코드는 어디서도 "heir 는 남자"를 직접 읽지 않고 이 함수를 통한다.
 */
export function characterGender(charId: string, game: GameState): Gender {
  return game.characterGenders?.[charId] ?? CHARACTER_BY_ID[charId]?.gender ?? 'male'
}

/** 연애 대상의 표시 이름 — 성별 가변이면(①②) 그 성별의 이름, 아니면 기본명. */
export function characterName(charId: string, game: GameState): string {
  const c = CHARACTER_BY_ID[charId]
  if (!c) return charId
  return c.nameByGender?.[characterGender(charId, game)] ?? c.name
}

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
    // 캐릭터를 가리키는 토큰 — {그:heir}, {이름:heir}, {호칭:heir}, {자식:heir}
    if (arg) {
      const character = CHARACTER_BY_ID[arg]
      if (!character) return whole
      const terms = CHARACTER_TERMS[characterGender(arg, game)]
      switch (name) {
        case '그':
          return terms.third
        case '이름':
          return characterName(arg, game)
        case '호칭':
          return terms.title
        case '자식':
          // 역할이 아닌 "아들/딸" 보통명사(예: "섭정공이 {자식:heir}을 데려왔다").
          return terms.child
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
      // ★ [9-C1] 황제 호칭 — 참칭 전쟁 승리 엔딩 삽입에서만 쓰는 전용 토큰(성별 반영: 황제/여제, 폐하).
      //   {왕}(왕/여왕)을 건드리지 않으므로 기존 텍스트의 조사(은/이/을)가 안전하다. 승리 삽입 한정이라
      //   자연히 엔딩에서만 나타난다.
      case '황제':
        return monarch.emperorTitle
      case '폐하':
        return monarch.emperorAddress
      case '그':
        return monarch.third
      case '왕자':
        return monarch.child
      case '이름':
        // {이름}(인자 없음) = 군주 고유명. {이름:heir}(인자 있음)는 위에서 처리됨.
        return monarchName(game)
      default:
        return whole
    }
  })
}
