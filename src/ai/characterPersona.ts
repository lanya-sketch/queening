import {
  CHARACTER_SHEETS,
  MAX_CHARACTER_CONTEXT,
  characterFormat,
} from '../data/persona/characters'
import { CHARACTER_BY_ID } from '../data/characters'
import { affectionOf } from '../systems/romance'
import { resolveText } from '../systems/text'
import type { GameState } from '../types/game'
import { bandText } from './persona'

/**
 * 연애 대상의 시스템 프롬프트 조립 (M2b-3b-1).
 *
 * 군주 조립(buildMonarchPrompt)의 일반화판이다:
 *   1층 고정 코어 + 2층 현재 호감도 구간 + 3층 해당 flag 반응 + 응답 형식
 *
 * ★ 인물 묘사 구간에 숫자가 들어가지 않는다 — 호감도도 flag 도 서술로만 전달된다.
 *   (응답 형식 지시에는 숫자가 정상적으로 있다. 군주 때와 같은 규칙.)
 *
 * 이번 단계는 **조립까지**다. 실제 대화 UI·AI 호출·델타 반영은 M2b-3b-2.
 */

/** 2층 — 지금 호감도 구간의 태도. */
export function describeBond(charId: string, game: GameState): string | null {
  const sheet = CHARACTER_SHEETS[charId]
  if (!sheet) return null
  return bandText(sheet.affectionBands, affectionOf(game, charId))
}

/** 3층 — 지금 서 있는 flag 들이 이 인물에게 뜻하는 것. */
export function describeCharacterContext(charId: string, game: GameState): string[] {
  const sheet = CHARACTER_SHEETS[charId]
  if (!sheet) return []
  const lines: string[] = []
  for (const entry of sheet.flagReactions) {
    if (lines.length >= MAX_CHARACTER_CONTEXT) break
    if (game.flags[entry.flag]) lines.push(entry.text)
  }
  return lines
}

/** 세 층 + 응답 형식을 붙여 최종 시스템 프롬프트를 만든다. */
export function buildPersona(charId: string, game: GameState): string | null {
  const sheet = CHARACTER_SHEETS[charId]
  const character = CHARACTER_BY_ID[charId]
  if (!sheet || !character) return null

  const bond = describeBond(charId, game)
  const context = describeCharacterContext(charId, game)

  const parts = [sheet.core]

  if (bond) parts.push('', `지금 이 사람은: ${bond}`)
  if (context.length) {
    parts.push('', '지금 서 있는 자리:', ...context.map((line) => `- ${line}`))
  }

  parts.push('', characterFormat(charId))

  // 성별 토큰 치환을 거친다 — 군주가 여왕이면 이 인물이 부르는 호칭도 바뀐다.
  return resolveText(parts.join('\n'), game)
}
