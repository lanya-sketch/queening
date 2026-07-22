import { GALLERY } from '../data/gallery'
import type { EndingResult } from '../types/game'

/**
 * 엔딩 갤러리 달성 기록 (D-2).
 *
 * ★ 게임 세이브(queening.save)와 **분리된 별도 키**다. '처음부터'(clearSave)로 세이브를
 *   지워도 갤러리는 남아 회차에 걸쳐 누적된다 — 수집의 연속성이 리플레이 동력이다.
 */
const GALLERY_KEY = 'queening.gallery'

export function getAchieved(): Set<string> {
  try {
    const raw = localStorage.getItem(GALLERY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/**
 * 이번 회차 결과로 새로 달성한 항목을 기록하고, 새로 열린 id 목록을 돌려준다.
 * 정식 엔딩이면 result, 조기 데드엔딩이면 deadReason 을 넘긴다(둘 중 하나).
 */
export function recordEnding(
  result: EndingResult | null,
  deadReason: string | null,
): string[] {
  const achieved = getAchieved()
  const newly: string[] = []
  for (const item of GALLERY) {
    if (item.match(result, deadReason) && !achieved.has(item.id)) {
      achieved.add(item.id)
      newly.push(item.id)
    }
  }
  if (newly.length) {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify([...achieved]))
    } catch {
      /* 저장 실패는 조용히 무시 — 갤러리는 부가 기능이라 게임을 막지 않는다. */
    }
  }
  return newly
}

export function achievedCount(): number {
  return getAchieved().size
}

/** 검증·리셋용 — 갤러리 기록만 지운다(게임 세이브와 무관). */
export function clearGallery(): void {
  try {
    localStorage.removeItem(GALLERY_KEY)
  } catch {
    /* 무시 */
  }
}
