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

/**
 * 군주 기본 이름(성별별). 인트로에서 빈칸이면 이 값이 쓰이고, 플레이어가 고쳐 쓸 수 있다.
 * 이름은 역할 호칭과 별개라 여기(호칭 표)와 나란히 두되 Terms 구조 밖에 둔다.
 */
export const DEFAULT_MONARCH_NAME: Record<Gender, string> = {
  male: '카이로스',
  female: '아일라',
}

/**
 * ★ 연애 대상 5인의 3인칭은 성별과 무관하게 '그'로 통일한다(그녀 안 씀).
 *   건조·관찰자적 서술 톤이 '그'를 성별 무관 3인칭으로 쓰고, 성별을 바꿔도 서술이
 *   한 글자도 안 변한다. (군주는 MONARCH_TERMS 로 여전히 그/그녀를 가른다.)
 *   성별로 갈리는 것은 호칭(공자/영애)과 관계어(아들/딸)뿐이다.
 */
export const CHARACTER_TERMS: Record<Gender, Terms> = {
  male: { title: '공자', address: '경', child: '아들', third: '그' },
  female: { title: '영애', address: '경', child: '딸', third: '그' },
}

/**
 * 토큰 문법
 *   {왕}          군주의 호칭      → 왕 / 여왕
 *   {전하}        군주를 부를 때
 *   {그}          군주 3인칭       → 그 / 그녀
 *   {이름}        군주 고유명      → 플레이어가 정한 이름(빈칸이면 성별 기본값)
 *   {그:heir}     캐릭터 3인칭     → 해당 캐릭터의 gender 로 결정 (그/그녀)
 *   {이름:heir}   캐릭터 표시 이름  → 성별 가변이면 그 성별의 이름
 *   {호칭:heir}   캐릭터 호칭       → 공자 / 영애
 *   {자식:heir}   아들/딸 보통명사  → "섭정공이 {자식:heir}을 데려왔다"
 *
 * ★ 캐릭터 토큰의 성별은 세이브(characterGenders)가 우선, 없으면 기본 배치.
 *   systems/text.ts 의 characterGender() 한 곳에서만 결정한다.
 */
export const TOKEN_PATTERN = /\{([^}:]+)(?::([^}]+))?\}/g
