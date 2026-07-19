import { create } from 'zustand'
import { ACTIVITY_BY_ID } from '../data/activities'
import type { GameState } from '../types/game'
import { clearSave, getSavedAt, loadGame, saveGame } from '../systems/save'
import { createInitialState, endTurn } from '../systems/turn'

interface GameStore {
  game: GameState
  savedAt: string | null
  /** 세이브/로드 결과를 알리는 짧은 안내문. */
  notice: string | null

  addActivity: (activityId: string) => void
  removeActivityAt: (index: number) => void
  clearPlan: () => void
  endTurn: () => void
  /** 결과 화면 → 이벤트 or 스케줄. */
  continueFromResult: () => void
  /** 이벤트 하나를 소화한다. */
  dismissEvent: () => void

  save: () => void
  load: () => void
  reset: () => void
  clearNotice: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  game: createInitialState(),
  savedAt: getSavedAt(),
  notice: null,

  addActivity: (activityId) => {
    const { game } = get()
    const activity = ACTIVITY_BY_ID[activityId]
    if (!activity || game.phase !== 'schedule') return
    if (activity.apCost > game.actionPoints) return
    set({
      game: {
        ...game,
        actionPoints: game.actionPoints - activity.apCost,
        plannedActivityIds: [...game.plannedActivityIds, activityId],
      },
    })
  },

  removeActivityAt: (index) => {
    const { game } = get()
    const activityId = game.plannedActivityIds[index]
    const activity = ACTIVITY_BY_ID[activityId]
    if (!activity) return
    const plannedActivityIds = game.plannedActivityIds.filter((_, i) => i !== index)
    set({
      game: {
        ...game,
        actionPoints: game.actionPoints + activity.apCost,
        plannedActivityIds,
      },
    })
  },

  clearPlan: () => {
    const { game } = get()
    const refund = game.plannedActivityIds.reduce(
      (sum, id) => sum + (ACTIVITY_BY_ID[id]?.apCost ?? 0),
      0,
    )
    set({
      game: { ...game, actionPoints: game.actionPoints + refund, plannedActivityIds: [] },
    })
  },

  endTurn: () => set({ game: endTurn(get().game) }),

  continueFromResult: () => {
    const { game } = get()
    set({ game: { ...game, phase: game.pendingEventIds.length ? 'event' : 'schedule' } })
  },

  dismissEvent: () => {
    const { game } = get()
    const pendingEventIds = game.pendingEventIds.slice(1)
    set({
      game: {
        ...game,
        pendingEventIds,
        phase: pendingEventIds.length ? 'event' : 'schedule',
      },
    })
  },

  save: () => {
    const ok = saveGame(get().game)
    set({
      savedAt: ok ? getSavedAt() : get().savedAt,
      notice: ok ? '저장했습니다.' : '저장에 실패했습니다.',
    })
  },

  load: () => {
    const loaded = loadGame()
    if (!loaded) {
      set({ notice: '불러올 기록이 없습니다.' })
      return
    }
    set({ game: loaded, notice: '기록을 불러왔습니다.' })
  },

  reset: () => {
    clearSave()
    set({ game: createInitialState(), savedAt: null, notice: '처음부터 다시 시작합니다.' })
  },

  clearNotice: () => set({ notice: null }),
}))
