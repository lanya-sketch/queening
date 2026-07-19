import {
  AGE_BANDS,
  FLAG_CONTEXT,
  INFLUENCE_BANDS,
  MAX_CONTEXT_LINES,
  MONARCH_CORE,
  MONARCH_FORMAT,
  STAT_BANDS,
  SUSPICION_BANDS,
  TRUST_BANDS,
  WELLBEING_BANDS,
  type PersonaBand,
} from '../data/persona/monarch'
import { STAT_KEYS } from '../data/stats'
import { resolveText } from '../systems/text'
import type { GameState } from '../types/game'

/**
 * 3층 시스템 프롬프트 조립 (M2b-2).
 *
 *   1층 불변 코어    — 인물의 뼈대, AI 역할 경계
 *   2층 상태 서술    — 현재 수치를 매핑 테이블로 번역한 인물 묘사
 *   3층 최근 맥락    — flag 를 겪은 일로
 *
 * ★ 완성된 프롬프트에는 숫자가 하나도 들어가지 않는다. 검증에서 이걸 직접 확인한다.
 */

export function bandText(bands: PersonaBand[], value: number): string | null {
  for (const band of bands) {
    if (value <= band.upTo) return band.text
  }
  return bands[bands.length - 1]?.text ?? null
}

/** 2층 — 눈에 띄는 특징만 모은다. 중간값 구간은 문장이 없어 자연히 빠진다. */
export function describeMonarch(game: GameState): string[] {
  const lines: string[] = []
  const push = (text: string | null) => {
    if (text) lines.push(text)
  }

  push(bandText(AGE_BANDS, game.age))
  for (const key of STAT_KEYS) push(bandText(STAT_BANDS[key], game.stats[key]))
  push(bandText(TRUST_BANDS, game.tutorTrust))
  push(bandText(WELLBEING_BANDS, game.wellbeing))
  push(bandText(SUSPICION_BANDS, game.regentSuspicion))
  push(bandText(INFLUENCE_BANDS, game.courtInfluence))

  return lines
}

/** 3층 — 무거운 것부터 최대 MAX_CONTEXT_LINES 줄. */
export function describeRecentContext(game: GameState): string[] {
  const lines: string[] = []
  for (const entry of FLAG_CONTEXT) {
    if (lines.length >= MAX_CONTEXT_LINES) break
    if (game.flags[entry.flag]) lines.push(entry.text)
  }
  return lines
}

/** 세 층을 붙여 최종 시스템 프롬프트를 만든다. */
export function buildMonarchPrompt(game: GameState): string {
  const persona = describeMonarch(game)
  const context = describeRecentContext(game)

  const parts = [MONARCH_CORE, '', `지금 이 {왕}은: ${persona.join(' ')}`]

  if (context.length) {
    parts.push('', '최근 겪은 일:', ...context.map((line) => `- ${line}`))
  }

  parts.push('', MONARCH_FORMAT)
  // 프롬프트도 성별 토큰을 거친다 — 여왕을 고르면 AI 도 그렇게 인식한다.
  return resolveText(parts.join('\n'), game)
}
