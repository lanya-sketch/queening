import type { EndingResult } from '../../types/game'
import { CHARACTERS } from '../characters'

/**
 * 엔딩 결산 차등 표시 (D-2).
 *
 * ★ 엔딩별로 다른 정보를 사후에 정리해 보여준다 — 도달 실권·진실 깊이·처분·함께한 이·
 *   나라 향방·남긴 이름. judgeEnding(M3-1)을 **읽기만** 한다(판정은 안 건드린다).
 */

const TRUTH_LABEL: Record<EndingResult['truthLevel'], string> = {
  모름: '끝내 알지 못했다',
  섭정관여: '섭정의 관여를 밝혔다',
  모후주모: '모후의 주모까지 밝혔다',
}

const DISPOSAL_LABEL: Record<EndingResult['disposal'], string> = {
  정당: '정당한 심판',
  폭군: '명분 없는 처분',
  회유: '회유하여 공존',
  못함: '끝내 처분하지 못함',
}

/** 나라의 향방 flag → 사람이 읽는 문구. 목록에 없는 flag(숙청/측실 등)는 수식이 든다. */
const NATION_LABEL: Record<string, string> = {
  union_equal: '대등한 공동왕조',
  military_king_led: '왕이 이끄는 군',
  prince_conquered: '이웃 왕국을 정복',
  house_commons_defended: '하원을 지킴',
  house_commons_dissolved: '하원을 해산',
  scroll_offered: '정통성의 두루마리',
  legitimacy_sacred: '신성한 정통성',
  church_support: '교단의 지지',
}

export interface SummaryRow {
  label: string
  value: string
}

export function isBadEnding(r: EndingResult): boolean {
  return r.tier.startsWith('배드')
}

export function endingSummaryRows(r: EndingResult): SummaryRow[] {
  const rows: SummaryRow[] = []
  rows.push({ label: '도달한 자리', value: r.tier })
  rows.push({ label: '아버지의 죽음', value: TRUTH_LABEL[r.truthLevel] })
  // '못함'은 처분 자체가 없었던 것이라 굳이 한 줄을 쓰지 않는다.
  if (r.disposal !== '못함') rows.push({ label: '숙부의 처분', value: DISPOSAL_LABEL[r.disposal] })
  rows.push({
    label: '함께한 이',
    value:
      r.romance === 'none'
        ? '홀로 — 철인통치'
        : (CHARACTERS.find((c) => c.id === r.romance)?.name ?? r.romance),
  })
  const nations = r.nationFlags.map((f) => NATION_LABEL[f]).filter(Boolean)
  if (nations.length) rows.push({ label: '나라의 향방', value: [...new Set(nations)].join(' · ') })
  if (r.modifiers.length) rows.push({ label: '남긴 이름', value: r.modifiers.join(' · ') })
  return rows
}
