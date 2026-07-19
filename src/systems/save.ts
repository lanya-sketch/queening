import { GAME_CONFIG } from '../data/config'
import type { GameState } from '../types/game'

interface SaveFile {
  version: number
  savedAt: string
  state: GameState
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
    // 버전이 다르면 지금은 그냥 거절한다. 마이그레이션은 콘텐츠가 쌓인 뒤에.
    if (file.version !== GAME_CONFIG.saveVersion) return null
    return file.state
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
