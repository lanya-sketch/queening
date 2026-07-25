import { GALLERY } from '../data/gallery'
import type { EndingResult } from '../types/game'

/**
 * 엔딩 갤러리 달성 기록 (D-2).
 *
 * ★ 게임 세이브(queening.save)와 **분리된 별도 키**다. '처음부터'(clearSave)로 세이브를
 *   지워도 갤러리는 남아 회차에 걸쳐 누적된다 — 수집의 연속성이 리플레이 동력이다.
 */
const GALLERY_KEY = 'queening.gallery'
// ★ 이름 기록은 **별도 키**로 둔다 — 기존 달성 Set(문자열 배열)의 형식·마이그레이션을
//   건드리지 않고 얹기 위해. 각 엔딩을 **처음 달성한 회차의 군주 이름**을 기록한다
//   (한 엔딩을 여러 군주가 달성할 수 있어 "누구"가 모호하므로 첫 달성자로 못박는다).
const GALLERY_NAMES_KEY = 'queening.gallery.names'

export function getAchieved(): Set<string> {
  try {
    const raw = localStorage.getItem(GALLERY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** 엔딩 id → 처음 달성한 군주 이름. GalleryScreen 이 달성 카드에 "○○의 치세"로 쓴다. */
export function getAchievedNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GALLERY_NAMES_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? (obj as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/**
 * 이번 회차 결과로 새로 달성한 항목을 기록하고, 새로 열린 id 목록을 돌려준다.
 * 정식 엔딩이면 result, 조기 데드엔딩이면 deadReason 을 넘긴다(둘 중 하나).
 */
export function recordEnding(
  result: EndingResult | null,
  deadReason: string | null,
  monarchName?: string,
): string[] {
  const achieved = getAchieved()
  const names = getAchievedNames()
  const newly: string[] = []
  for (const item of GALLERY) {
    if (item.match(result, deadReason) && !achieved.has(item.id)) {
      achieved.add(item.id)
      if (monarchName) names[item.id] = monarchName
      newly.push(item.id)
    }
  }
  if (newly.length) {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify([...achieved]))
      localStorage.setItem(GALLERY_NAMES_KEY, JSON.stringify(names))
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
    localStorage.removeItem(GALLERY_NAMES_KEY)
  } catch {
    /* 무시 */
  }
}
