import { GAME_CONFIG, INITIAL_RESOURCES } from '../data/config'
import { DEFAULT_MONARCH_NAME } from '../data/lexicon'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import { durabilityBase } from './durability'
import { initialAffection } from './romance'
import type { GameState } from '../types/game'

interface SaveFile {
  version: number
  savedAt: string
  state: GameState
}

/** 세이브 슬롯 수. 각 슬롯은 독립된 localStorage 키를 쓴다. */
export const SLOT_COUNT = 5

/** 옛 단일 세이브 키 — 이제 slot0 이관 원본으로만 읽는다. */
const LEGACY_KEY = GAME_CONFIG.saveKey
function slotKey(slot: number): string {
  return `${GAME_CONFIG.saveKey}.slot${slot}`
}

/** 슬롯 리스트에 뿌릴 요약 — state 를 파싱해 그때그때 파생한다(따로 저장 안 함). */
export interface SlotSummary {
  slot: number
  empty: boolean
  monarchName?: string
  age?: number
  reignYear?: number
  reignMonth?: number
  savedAt?: string
  version?: number
  /** 이 게임보다 최신 버전이라 불러올 수 없음(요약만 보여주고 로드는 잠금). */
  incompatible?: boolean
}

/**
 * 세이브 마이그레이션.
 * 키 n 은 "버전 n 을 n+1 로 올리는" 변환이다. 콘텐츠가 붙을 때마다
 * GAME_CONFIG.saveVersion 을 올리고 여기에 한 줄 추가하면 옛 세이브가 살아남는다.
 */
const MIGRATIONS: Record<number, (state: any) => any> = {
  // v1 -> v2 : 착장 시스템(M2a) 도입
  1: (state) => ({ ...state, currentOutfitId: DEFAULT_OUTFIT_ID }),
  // v2 -> v3 : 섭정 신망 게이지 도입. clue/truth flag 는 기존 flags 에 들어가므로 변환 불필요.
  2: (state) => ({ ...state, regentRapport: INITIAL_RESOURCES.regentRapport }),
  // v3 -> v4 : 국정 영향도 도입.
  3: (state) => ({ ...state, courtInfluence: INITIAL_RESOURCES.courtInfluence }),
  // v4 -> v5 : 연애 기반(호감도·군주 성별) 도입. 기존 세이브는 왕(male)로 본다.
  4: (state) => ({ ...state, affection: initialAffection(), monarchGender: 'male' }),
  // v5 -> v6 : 확률 발동 + 계절 타이머 도입. 빈 카운터로 시작하면 되고,
  //            ③ 는 부재 상태에서 다음 확률 판정을 기다린다(천장도 0 부터).
  5: (state) => ({ ...state, counters: {} }),
  // v6 -> v7 : 월 단위 전환. 계절→월(봄=1·여름=4·가을=7·겨울=10 근사), 내구도 필드 추가.
  //            스탯은 이미 number 라 소수점화에 변환이 필요 없다.
  6: (state) => {
    // 이벤트 조건의 임시 매핑(봄=3·여름=6·가을=9·겨울=12)과 같은 값을 써야
    // 계절-게이팅 이벤트가 옛 세이브에서도 같은 달에 걸린다.
    const SEASON_TO_MONTH: Record<string, number> = { spring: 3, summer: 6, autumn: 9, winter: 12 }
    const month = SEASON_TO_MONTH[state.date?.season] ?? 3
    return {
      ...state,
      date: { year: state.date?.year ?? 0, month },
      durability: durabilityBase(state.age ?? GAME_CONFIG.startAge),
    }
  },
  // v7 -> v8 : 군주 고유명 도입. 옛 세이브는 성별 기본 이름으로 채운다(카이로스/아일라).
  7: (state) => ({
    ...state,
    monarchName: DEFAULT_MONARCH_NAME[(state.monarchGender as 'male' | 'female') ?? 'male'],
  }),
}

function migrate(state: any, fromVersion: number): GameState | null {
  let current = state
  for (let version = fromVersion; version < GAME_CONFIG.saveVersion; version++) {
    const step = MIGRATIONS[version]
    if (!step) {
      console.warn(`[save] v${version} → v${version + 1} 마이그레이션이 없습니다.`)
      return null
    }
    current = step(current)
  }
  return current as GameState
}

// ── 슬롯 저장/로드 ─────────────────────────────────────────
export function saveGame(state: GameState, slot: number): boolean {
  try {
    const file: SaveFile = {
      version: GAME_CONFIG.saveVersion,
      savedAt: new Date().toISOString(),
      state,
    }
    localStorage.setItem(slotKey(slot), JSON.stringify(file))
    return true
  } catch {
    return false
  }
}

export function loadGame(slot: number): GameState | null {
  const file = readSlotFile(slot)
  if (!file) return null
  // 미래 버전 세이브는 되돌릴 방법이 없으므로 거절한다.
  if (file.version > GAME_CONFIG.saveVersion) return null
  if (file.version === GAME_CONFIG.saveVersion) return file.state
  return migrate(file.state, file.version)
}

export function clearSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot))
}

/** 5개 슬롯 + 옛 단일 키까지 전부 지운다(「전체 초기화」에서만 호출). */
export function clearAllSlots(): void {
  for (let i = 0; i < SLOT_COUNT; i++) localStorage.removeItem(slotKey(i))
  localStorage.removeItem(LEGACY_KEY)
}

// ── 요약 ───────────────────────────────────────────────────
function readSlotFile(slot: number): SaveFile | null {
  try {
    const raw = localStorage.getItem(slotKey(slot))
    if (!raw) return null
    const file = JSON.parse(raw) as SaveFile
    if (typeof file?.version !== 'number' || !file.state) return null
    return file
  } catch {
    return null
  }
}

export function getSlotSummary(slot: number): SlotSummary {
  const file = readSlotFile(slot)
  if (!file) return { slot, empty: true }
  const s = file.state as any
  return {
    slot,
    empty: false,
    monarchName: s.monarchName,
    age: s.age,
    reignYear: s.date?.year,
    reignMonth: s.date?.month,
    savedAt: file.savedAt,
    version: file.version,
    incompatible: file.version > GAME_CONFIG.saveVersion,
  }
}

export function listSlots(): SlotSummary[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => getSlotSummary(i))
}

export function hasAnySave(): boolean {
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (localStorage.getItem(slotKey(i)) !== null) return true
  }
  return false
}

/**
 * 옛 단일 세이브(queening.save) → slot0 자동 이관. 앱 부팅 때 1회.
 * slot0 이 이미 있으면 건드리지 않는다(덮어쓰기 방지). 이관 뒤 옛 키는 지운다.
 * 여러 번 불러도 안전하다(옛 키가 없으면 no-op).
 */
export function migrateLegacySave(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return
    if (localStorage.getItem(slotKey(0)) === null) {
      localStorage.setItem(slotKey(0), legacy)
    }
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* 저장 불가 환경은 이관하지 않는다 */
  }
}

// ── Export / Import ────────────────────────────────────────
/** 매직 헤더 — 형식 판별과 버전 식별을 겸한다. */
const EXPORT_MAGIC = 'QUEENING1:'

/** state 무결성 확인용 32-bit 체크섬(djb2). 손상·변조를 사유와 함께 거른다. */
function checksum(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return h >>> 0
}

/** UTF-8 안전 base64(한글 상태를 온전히 실어 나른다). */
function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function fromB64(b64: string): string {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** 슬롯을 한 줄 텍스트 코드로 내보낸다. 빈 슬롯은 null. */
export function exportSlot(slot: number): string | null {
  const file = readSlotFile(slot)
  if (!file) return null
  const stateJson = JSON.stringify(file.state)
  const envelope = {
    v: file.version,
    savedAt: file.savedAt,
    state: file.state,
    crc: checksum(stateJson),
  }
  return EXPORT_MAGIC + toB64(JSON.stringify(envelope))
}

export interface ImportResult {
  ok: boolean
  /** 검증·마이그레이션을 통과한 상태(아직 슬롯에 안 씀). */
  state?: GameState
  version?: number
  savedAt?: string
  /** 실패 사유(단계별로 다르게 — UI 가 그대로 보여준다). */
  reason?: string
}

/**
 * 텍스트 코드를 검증한다. 단계별로 다른 사유를 돌려준다:
 *  헤더 없음 → 세이브 파일 아님 / 디코드·파싱 실패 → 손상 /
 *  체크섬 불일치 → 손상(변조) / 미래 버전 → 최신이라 못 읽음 / 구버전 → migrate.
 * 통과하면 state 를 돌려줄 뿐 슬롯에 쓰지는 않는다(슬롯 선택은 UI 몫).
 */
export function importCode(code: string): ImportResult {
  const trimmed = (code ?? '').trim()
  if (!trimmed.startsWith(EXPORT_MAGIC)) {
    return { ok: false, reason: '세이브 파일이 아닙니다.' }
  }
  let envelope: any
  try {
    envelope = JSON.parse(fromB64(trimmed.slice(EXPORT_MAGIC.length)))
  } catch {
    return { ok: false, reason: '손상된 파일입니다.' }
  }
  if (
    !envelope ||
    typeof envelope.v !== 'number' ||
    !envelope.state ||
    typeof envelope.crc !== 'number'
  ) {
    return { ok: false, reason: '손상된 파일입니다.' }
  }
  if (checksum(JSON.stringify(envelope.state)) !== envelope.crc) {
    return { ok: false, reason: '손상된 파일입니다 (검증 불일치).' }
  }
  if (envelope.v > GAME_CONFIG.saveVersion) {
    return { ok: false, reason: '이 게임보다 최신 세이브라 불러올 수 없습니다.' }
  }
  const state =
    envelope.v === GAME_CONFIG.saveVersion
      ? (envelope.state as GameState)
      : migrate(envelope.state, envelope.v)
  if (!state) return { ok: false, reason: '불러올 수 없는 세이브입니다.' }
  return { ok: true, state, version: envelope.v, savedAt: envelope.savedAt }
}

/** 가져오기로 검증된 상태를 슬롯에 쓴다. 현재 버전으로 승격해 저장한다. */
export function writeImportedToSlot(slot: number, state: GameState): boolean {
  return saveGame(state, slot)
}
