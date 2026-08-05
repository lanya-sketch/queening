import type { GameState } from '../types/game'

/**
 * ★ [10] 배경 에셋 배선 — 씬·컷신·장소·엔딩에 배경 그림을 매핑하는 **데이터 한 곳**.
 *
 * 원칙:
 *   · 코드 분기가 아니라 데이터로 — 에셋이 늘면 이 파일의 표만 고친다.
 *   · 폴백 — 매핑에 없으면 null → 부르는 쪽이 기존 어두운 그라데이션을 그대로 쓴다.
 *   · 여러 컷(연회 3·정원 2 등)은 배열 + hash(ctxId)%N 안정 선택 — 같은 맥락은 늘 같은 컷(깜빡임 없음).
 *   · 성능: 전부 WebP(원본 PNG 대비 2.4%). 지연 로딩은 부르는 컴포넌트가 담당(<img loading> + onError).
 *
 * ★ 에셋은 1216×832(≈3:2). object-fit:cover + object-position:center 로 깔리며, 데스크톱(가로)·
 *   모바일(세로 0.46)·컷신(정사각~세로)에서 가장자리가 잘리므로 **핵심 요소는 중앙**에 있다는 전제.
 */

const BG_DIR = '/assets/background/'

/** 배경 키 → WebP 파일 이름(확장자 제외). 배열이면 여러 컷을 hash 로 안정 선택. */
const BG_FILES: Record<string, string | string[]> = {
  banquet: ['bg_banquet_01', 'bg_banquet_02', 'bg_banquet_03'],
  hall: 'bg_hall_02', // bg_hall_01 은 title 과 동일 → 안 씀
  library: 'bg_library',
  garden: ['bg_garden_01', 'bg_garden_02'],
  yard: ['bg_training_01', 'bg_training_02'],
  chamber: 'bg_chamber',
  dowager: 'bg_dowager',
  office: 'bg_office',
  corridor: 'bg_corridor',
  chapel: 'bg_chapel',
  chapelEmpty: 'bg_chapel_empty',
  study: ['bg_study_morning', 'bg_study_night'],
  studyNight: 'bg_study_night',
  night: 'bg_night',
  market: 'bg_market',
  street: ['bg_street_01', 'bg_street_02', 'bg_street_03'],
  slum: ['bg_slum_01', 'bg_slum_02'],
  tavern: 'bg_tavern',
  battlefield: 'bg_battlefield',
  ruin: 'bg_ruin',
}

/** 안정 해시 — 같은 문자열은 늘 같은 값. 배열 컷 선택에 쓴다(난수 아님 → 재렌더에도 불변). */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 배경 키 → URL. 없으면 null(폴백). ctxId 로 여러 컷 중 하나를 안정 선택. */
export function bgUrl(key: string | null | undefined, ctxId = ''): string | null {
  if (!key) return null
  const f = BG_FILES[key]
  if (!f) return null
  const file = Array.isArray(f) ? f[hashStr(ctxId) % f.length] : f
  return `${BG_DIR}${file}.webp`
}

// ── 씬 → 배경 키 ──────────────────────────────────────────────
/** 정확히 일치하는 씬 id. (index.ts 본선 + 결정적 + 정복 + 독 + 외출) */
const SCENE_BG: Record<string, string> = {
  'scene-debut-ball': 'banquet',
  'scene-prince-arrival': 'corridor',
  'scene-prince-duel': 'yard',
  'scene-prince-departure': 'night',
  'scene-loyalist-hint': 'office',
  'scene-chamber-search': 'chamber',
  'scene-chamber-caught': 'chamber',
  'scene-heir-confession': 'library',
  'scene-blood-oath-complete': 'office',
  'scene-sacred-scroll': 'chapel',
  'scene-commander-house-history': 'office',
  'scene-commander-father': 'hall',
  'scene-union-possible': 'garden',
  'scene-prince-conquest': 'battlefield',
  'scene-poison-resumes': 'dowager',
  'scene-patrol-outing': 'street',
  'scene-sneak-outing': 'slum',
}

/**
 * 접두 일치 — 생성된 씬(조우·질투·유대·16세관계·첫등장·결정적·후일담·유년)을 몇 줄로.
 * 긴 접두부터 검사한다(장소가 인물별로 갈리므로).
 */
const SCENE_BG_PREFIX: Array<[string, string]> = [
  ['scene-enc-heir', 'library'],
  ['scene-enc-loyalist', 'library'],
  ['scene-enc-prince', 'corridor'],
  ['scene-enc-hero', 'chapel'],
  ['scene-enc-commander', 'yard'],
  ['scene-jealousy-heir', 'corridor'],
  ['scene-jealousy-loyalist', 'office'],
  ['scene-jealousy-prince', 'corridor'],
  ['scene-jealousy-hero', 'chapel'],
  ['scene-jealousy-commander', 'yard'],
  ['scene-aftermath', 'hall'], // 청산 후일담 — 반역 죄목 낭독, 대전
  ['scene-concubine', 'hall'], // 측실 후일담 — 왕실/알현실
  ['scene-bond-heir', 'library'],
  ['scene-bond-loyalist', 'office'],
  ['scene-bond-commander', 'yard'],
  ['scene-bond-prince', 'yard'],
  ['scene-relation-heir', 'library'],
  ['scene-relation-commander', 'chamber'],
  ['scene-relation-loyalist', 'hall'],
  ['scene-relation-prince', 'corridor'],
  ['scene-relation-hero', 'hall'],
  ['scene-meet-heir', 'library'],
  ['scene-meet-loyalist', 'office'],
  ['scene-meet-commander', 'chamber'],
  ['scene-meet-prince', 'hall'],
  ['scene-decisive-heir', 'library'],
  ['scene-decisive-loyalist', 'office'],
  ['scene-decisive-prince', 'garden'],
  ['scene-decisive-commander', 'hall'],
  ['scene-decisive-hero', 'chapel'],
  ['scene-child-uncle', 'office'],
  ['scene-child-mother', 'dowager'],
]

/** 씬 id → 배경 URL. 정확 일치 우선, 없으면 가장 긴 접두 일치. 그래도 없으면 null(폴백). */
export function sceneBgUrl(sceneId: string): string | null {
  const exact = SCENE_BG[sceneId]
  if (exact) return bgUrl(exact, sceneId)
  let best: string | null = null
  let bestLen = -1
  for (const [prefix, key] of SCENE_BG_PREFIX) {
    if (sceneId.startsWith(prefix) && prefix.length > bestLen) {
      best = key
      bestLen = prefix.length
    }
  }
  return best ? bgUrl(best, sceneId) : null
}

// ── 활동(컷신) → 배경 키 ──────────────────────────────────────
const ACTIVITY_BG: Record<string, string> = {
  'lecture-statecraft': 'library', // 통치학·재정·변론 → 서고
  'lecture-finance': 'library',
  'debate-practice': 'library',
  'sword-training': 'yard', // 검술 → 연무장
  'attend-banquet': 'banquet', // 연회 → 연회장
  'royal-hunt': 'garden', // 사냥 — 전용 외부 에셋 없어 정원으로
  'attend-council': 'hall', // 정무 배석·재가 → 대전
  'direct-decree': 'hall',
  'honor-regent': 'hall',
  'cede-affairs': 'office', // 정무를 맡긴다 → 집무실
  'secret-correspondence': 'studyNight', // 밀서 → 처소(밤)
  'rest': 'chamber', // 휴식 → 처소
  'play': 'garden', // 놀이 → 정원
}

/** 활동 id → 배경 URL(컷신). ctxId 로 여러 컷을 안정 선택(같은 달 같은 컷). */
export function activityBgUrl(activityId: string, ctxId = activityId): string | null {
  return bgUrl(ACTIVITY_BG[activityId], ctxId)
}

// ── 장소 방문 → 배경 키 ───────────────────────────────────────
const PLACE_BG: Record<string, string> = {
  library: 'library',
  garden: 'garden',
  yard: 'yard',
  queen: 'dowager',
  office: 'office',
  patrol: 'street',
  sneak: 'slum',
  // chapel 은 상태 함수(아래) — 성검/④ 여부로 2종.
}

/**
 * ★ 대예배당 2종 — 성검 봉송(sword_to_church) 또는 ④ 미도래+신앙 부족이면 빈 제단.
 *   기존 텍스트 분기(CHAPEL.swordGone / empty-altar 이벤트)와 같은 조건이라 서술과 배경이 일치한다.
 */
function chapelBgKey(game: GameState): string {
  const emptied =
    game.flags?.sword_to_church === true ||
    (game.flags?.hero_at_court !== true && (game.faith ?? 0) < 40)
  return emptied ? 'chapelEmpty' : 'chapel'
}

/** 장소 id → 배경 URL. ctxId(예: `${placeId}-${year}-${month}`)로 여러 컷 안정 선택. */
export function placeBgUrl(placeId: string, game: GameState, ctxId = placeId): string | null {
  if (placeId === 'chapel') return bgUrl(chapelBgKey(game), ctxId)
  return bgUrl(PLACE_BG[placeId], ctxId)
}

// ── 엔딩 → 배경 키 ────────────────────────────────────────────
const ENDING_BG: Record<string, string> = {
  tyrant: 'hall',
  autonomy: 'hall',
  puppet: 'hall',
  coexist: 'hall',
  'bad-puppet-poison': 'dowager',
  'bad-junta': 'battlefield',
  'bad-subjugated': 'battlefield',
  'bad-usurp-failed': 'ruin',
  'catch-all': 'hall',
}

/** 데드엔딩 사유 → 배경 키. */
const DEADEND_BG: Record<string, string> = {
  심신파탄: 'ruin',
  의심무방비: 'night',
  해고: 'corridor',
  폐위: 'ruin',
  암살: 'night',
}

/** 엔딩 골격 id → 배경 URL. */
export function endingBgUrl(skeletonId: string): string | null {
  return bgUrl(ENDING_BG[skeletonId], skeletonId)
}

/** 데드엔딩 사유 → 배경 URL. */
export function deadEndBgUrl(reason: string): string | null {
  return bgUrl(DEADEND_BG[reason], reason)
}

/**
 * ★ 검증용 — 모든 매핑이 가리키는 URL 집합 + 파일 없는 키 목록.
 *   verify 가 각 URL 을 fetch 해 404 0건을 확인하고, MISSING_KEY 로 오타/누락을 잡는다.
 */
export function bgAuditUrls(): { urls: string[]; missingKeys: string[] } {
  const keys = new Set<string>([
    ...Object.values(SCENE_BG),
    ...SCENE_BG_PREFIX.map((p) => p[1]),
    ...Object.values(ACTIVITY_BG),
    ...Object.values(PLACE_BG),
    'chapel', 'chapelEmpty',
    ...Object.values(ENDING_BG),
    ...Object.values(DEADEND_BG),
  ])
  const urls = new Set<string>()
  const missingKeys: string[] = []
  for (const k of keys) {
    const f = BG_FILES[k]
    if (!f) { missingKeys.push(k); continue }
    for (const file of Array.isArray(f) ? f : [f]) urls.add(`${BG_DIR}${file}.webp`)
  }
  return { urls: [...urls], missingKeys }
}
