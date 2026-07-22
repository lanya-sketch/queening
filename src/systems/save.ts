import { GAME_CONFIG, INITIAL_RESOURCES } from '../data/config'
import { DEFAULT_OUTFIT_ID } from '../data/outfits'
import { durabilityBase } from './durability'
import { initialAffection } from './romance'
import type { GameState } from '../types/game'

interface SaveFile {
  version: number
  savedAt: string
  state: GameState
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

export function saveGame(state: GameState): boolean {
  try {
    const file: SaveFile = {
      version: GAME_CONFIG.saveVersion,
      savedAt: new Date().toISOString(),
      state,
    }
    localStorage.setItem(GAME_CONFIG.saveKey, JSON.stringify(file))
    return true
  } catch {
    return false
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.saveKey)
    if (!raw) return null

    const file = JSON.parse(raw) as SaveFile
    if (typeof file?.version !== 'number' || !file.state) return null
    // 미래 버전 세이브는 되돌릴 방법이 없으므로 거절한다.
    if (file.version > GAME_CONFIG.saveVersion) return null
    if (file.version === GAME_CONFIG.saveVersion) return file.state

    return migrate(file.state, file.version)
  } catch {
    return null
  }
}

export function getSavedAt(): string | null {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.saveKey)
    if (!raw) return null
    return (JSON.parse(raw) as SaveFile).savedAt
  } catch {
    return null
  }
}

export function clearSave(): void {
  localStorage.removeItem(GAME_CONFIG.saveKey)
}
