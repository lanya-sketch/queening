import type { Gender } from '../types/game'

/**
 * 성별에 따라 갈리는 호칭·대명사 (M2b-3a).
 *
 * 한국어는 대명사보다 **호칭**이 문제다(왕/여왕, 왕자/왕녀). 서사 텍스트는
 * 토큰을 품고 있다가 렌더 직전에 치환된다 — 그래서 (다) 전면 성별 선택이 열려도
 * 텍스트를 다시 쓰지 않아도 된다. 동양판 이식 때도 이 파일만 갈아끼우면 된다.
 *
 * ★ 복합어(왕국·선왕·왕당파·왕대비·옥좌)는 토큰이 아니다. 그대로 둔다.
 */
export interface Terms {
  /** 군주의 호칭. 왕 / 여왕 */
  title: string
  /** 부를 때. 성별 무관 */
  address: string
  /** 즉위 전 표기. 왕자 / 왕녀 */
  child: string
  /** 3인칭. 그 / 그녀 */
  third: string
}

export const MONARCH_TERMS: Record<Gender, Terms> = {
  male: { title: '왕', address: '전하', child: '왕자', third: '그' },
  female: { title: '여왕', address: '전하', child: '왕녀', third: '그녀' },
}

export const CHARACTER_TERMS: Record<Gender, Terms> = {
  male: { title: '공자', address: '경', child: '아들', third: '그' },
  female: { title: '영애', address: '경', child: '딸', third: '그녀' },
}

/**
 * 토큰 문법
 *   {왕}          군주의 호칭      → 왕 / 여왕
 *   {전하}        군주를 부를 때
 *   {그}          군주 3인칭       → 그 / 그녀
 *   {그:heir}     캐릭터 3인칭     → 해당 캐릭터의 gender 로 결정
 *   {이름:heir}   캐릭터 표시 이름
 */
export const TOKEN_PATTERN = /\{([^}:]+)(?::([^}]+))?\}/g
