import { create } from 'zustand'
import { ACTIVITY_BY_ID } from '../data/activities'
import { EVENT_BY_ID } from '../data/events'
import { DEFAULT_MONARCH_NAME } from '../data/lexicon'
import { FALLBACK_MANIFEST } from '../data/outfits'
import { TEMPERAMENTS, TEMPERAMENT_BY_ID, temperamentFlag } from '../data/temperaments'
import type { ChoiceOutcome, GameState, Gender, OutfitManifest, Phase } from '../types/game'
import { applyEffects } from '../systems/effects'
import { resolvedChoice } from '../systems/activityTier'
import { matchesCondition } from '../systems/eventEngine'
import { isOutfitUnlocked, loadOutfitManifest, resolveOutfit } from '../systems/outfits'
import { rng } from '../systems/rng'
import { getSlotSummary, loadGame, saveGame } from '../systems/save'
import { createInitialState, endTurn, hasReachedEnd } from '../systems/turn'
import { canVisit, planVisit, SCENE_PLACE_VISIT } from '../systems/visit'
import { SCENE_BY_ID } from '../data/scenes'
import type { PlaceId } from '../data/places'

/** 이벤트 큐를 다 비운 뒤 돌아갈 화면. 20세를 넘겼으면 스케줄 대신 종료 화면. */
function idlePhase(game: GameState): Phase {
  return hasReachedEnd(game) ? 'ended' : 'schedule'
}

interface GameStore {
  game: GameState
  savedAt: string | null
  /** 현재 게임이 걸려 있는 슬롯(저장/로드로 정해진다). 없으면 아직 어느 슬롯에도 안 묶임. */
  activeSlot: number | null
  /** 세이브/로드 결과를 알리는 짧은 안내문. */
  notice: string | null
  /** 방금 고른 선택지의 결과. 이벤트 화면이 후일담을 보여주는 데 쓴다. */
  lastChoiceOutcome: ChoiceOutcome | null

  outfitManifest: OutfitManifest
  manifestSource: 'manifest' | 'fallback'
  manifestProblems: string[]
  /** 초상 확대 모달 열림 여부. 게임 상태가 아니라 UI 상태라 세이브에 넣지 않는다. */
  portraitOpen: boolean

  initOutfits: () => Promise<void>
  setOutfit: (outfitId: string) => void
  openPortrait: () => void
  closePortrait: () => void

  addActivity: (activityId: string) => void
  removeActivityAt: (index: number) => void
  clearPlan: () => void
  /**
   * ★ 궁 안 이동(2-b-1) — AP 무소모·월 1회. 목적지 방문 계획을 세우고 그 장소 이벤트를
   *   온디맨드로 발동한다(기존 EventScreen 재사용). 왕대비궁 부재+자격이면 chamber-search 로 분기.
   */
  visitDestination: (place: PlaceId) => void
  endTurn: () => void
  /** 결과 화면 → 이벤트 or 스케줄. */
  continueFromResult: () => void
  /** 군주 성별. 새 게임을 시작하기 전에만 바꾸는 것을 권한다. */
  setMonarchGender: (gender: Gender) => void
  /** 군주 이름. 인트로에서 정한다(빈칸이면 성별 기본값이 표시됨). */
  setMonarchName: (name: string) => void
  /** 시작 기질. 인트로에서 정한다 — 시작 스탯·신뢰를 심고 flag 로 기록. */
  setTemperament: (id: string) => void
  /** 연애 대상 성별. 인트로 '인연' 스텝에서 정한다(성별 개방 2차). */
  setCharacterGender: (charId: string, gender: Gender) => void
  /** 이벤트 선택지를 고른다. 효과는 이 시점에 적용된다. */
  chooseOption: (eventId: string, choiceId: string) => void
  /** 이벤트 하나를 소화한다. */
  dismissEvent: () => void
  /**
   * ★ 큐에서 이벤트를 **없던 일로** 뺀다 (실플레이 피드백 #7).
   *   AI 돌발은 내용이 생성돼야 비로소 사건이다 — 생성이 실패하면 결과 화면의
   *   알림 목록에서도 지워, "이벤트가 있다더니 아무 일도 없더라"를 원천 차단한다.
   */
  dropPendingEvent: (eventId: string) => void

  /** 현재 게임을 지정 슬롯에 저장한다. */
  save: (slot: number) => void
  /** 지정 슬롯을 불러온다. */
  load: (slot: number) => void
  /** 진행 중인 게임만 새로 시작한다 — ★ 저장된 슬롯 기록은 건드리지 않는다. */
  reset: () => void
  clearNotice: () => void
}

export const useGame = create<GameStore>()((set, get) => ({
  game: createInitialState(),
  savedAt: null,
  activeSlot: null,
  notice: null,
  lastChoiceOutcome: null,

  outfitManifest: FALLBACK_MANIFEST,
  manifestSource: 'fallback',
  manifestProblems: [],
  portraitOpen: false,

  initOutfits: async () => {
    const { manifest, source, problems } = await loadOutfitManifest()
    const { game } = get()
    // 저장된 착장이 매니페스트에서 사라졌을 수 있으니 여기서 한 번 정리한다.
    const resolved = resolveOutfit(manifest, game.currentOutfitId)
    set({
      outfitManifest: manifest,
      manifestSource: source,
      manifestProblems: problems,
      game: resolved.id === game.currentOutfitId ? game : { ...game, currentOutfitId: resolved.id },
    })
  },

  setOutfit: (outfitId) => {
    const { game, outfitManifest } = get()
    const outfit = outfitManifest.outfits.find((o) => o.id === outfitId)
    if (!outfit) return
    if (!isOutfitUnlocked(outfit, game)) return
    set({ game: { ...game, currentOutfitId: outfit.id }, notice: `${outfit.name}(으)로 갈아입었습니다.` })
  },

  openPortrait: () => set({ portraitOpen: true }),
  closePortrait: () => set({ portraitOpen: false }),

  addActivity: (activityId) => {
    const { game } = get()
    const activity = ACTIVITY_BY_ID[activityId]
    if (!activity || game.phase !== 'schedule') return
    if (activity.apCost > game.actionPoints) return
    if (activity.requires && !matchesCondition(game, activity.requires)) return
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

  // ★ 궁 안 이동 — 방문 계획(rng)을 세워 장소 이벤트를 그 자리에서 발동한다(AP 무소모).
  visitDestination: (place) => {
    const { game } = get()
    if (!canVisit(game)) return
    const plan = planVisit(place, game, rng)
    const event = EVENT_BY_ID[plan.eventId]
    if (!event) return
    // 조립 씬(장소)이면 고정 슬롯에 얹는다. chamber-search 는 제 씬을 쓰므로 null.
    if (plan.scene) SCENE_BY_ID[SCENE_PLACE_VISIT] = plan.scene
    set({
      game: {
        ...game,
        // 방문 flag + 이벤트 기본 setFlags(예: chamber-search 의 queen_chamber_searched)를 함께 적용.
        flags: { ...game.flags, ...plan.setFlags, ...event.setFlags },
        counters: { ...(game.counters ?? {}), ...plan.counters },
        pendingEventIds: [plan.eventId],
        phase: 'event',
      },
      lastChoiceOutcome: null,
    })
  },

  // 난수는 systems/rng 한 곳에서만 나온다 — 검증이 갈아끼울 수 있도록.
  endTurn: () => set({ game: endTurn(get().game, rng), lastChoiceOutcome: null }),

  continueFromResult: () => {
    const { game } = get()
    set({ game: { ...game, phase: game.pendingEventIds.length ? 'event' : idlePhase(game) } })
  },

  setMonarchGender: (monarchGender) => {
    const game = get().game
    // 이름을 손대지 않았으면(이전 성별의 기본값 그대로면) 새 성별 기본값으로 따라가게 한다.
    // 플레이어가 직접 입력한 이름이면 성별을 바꿔도 유지한다.
    const wasDefault = game.monarchName.trim() === DEFAULT_MONARCH_NAME[game.monarchGender]
    const monarchName = wasDefault ? DEFAULT_MONARCH_NAME[monarchGender] : game.monarchName
    set({ game: { ...game, monarchGender, monarchName } })
  },
  setMonarchName: (name) => set({ game: { ...get().game, monarchName: name } }),
  setCharacterGender: (charId, gender) => {
    const game = get().game
    set({ game: { ...game, characterGenders: { ...game.characterGenders, [charId]: gender } } })
  },
  setTemperament: (id) => {
    const t = TEMPERAMENT_BY_ID[id]
    if (!t) return
    const game = get().game
    // 이전 기질 flag 를 걷어내고(재선택 대비) 새 것만 남긴다. 시작 스탯·신뢰를 심는다.
    const flags = { ...game.flags }
    for (const other of TEMPERAMENTS) delete flags[temperamentFlag(other.id)]
    flags[temperamentFlag(id)] = true
    set({ game: { ...game, stats: { ...t.stats }, tutorTrust: t.tutorTrust, flags } })
  },

  chooseOption: (eventId, choiceId) => {
    const { game } = get()
    const event = EVENT_BY_ID[eventId]
    const choice = event?.choices?.find((c) => c.id === choiceId)
    if (!choice) return
    if (choice.requires && !matchesCondition(game, choice.requires)) return

    // ★ 4-C 결과 차등 — 잠그는 대신 스탯에 따라 결과가 갈리는 선택지가 있다.
    //   등급은 **효과를 적용하기 전 상태**로 확정한다(효과가 기준 스탯을 움직이므로).
    const resolved = resolvedChoice(choice, game)
    const { state, deltas } = applyEffects(game, resolved.effects, rng)
    set({
      game: { ...state, flags: { ...state.flags, ...resolved.setFlags } },
      lastChoiceOutcome: { eventId, choiceId, deltas, resultText: resolved.resultText },
    })
  },

  dismissEvent: () => {
    const { game } = get()
    const pendingEventIds = game.pendingEventIds.slice(1)
    set({
      game: {
        ...game,
        pendingEventIds,
        phase: pendingEventIds.length ? 'event' : idlePhase(game),
      },
      lastChoiceOutcome: null,
    })
  },

  dropPendingEvent: (eventId) => {
    const { game } = get()
    if (!game.pendingEventIds.includes(eventId)) return
    const pendingEventIds = game.pendingEventIds.filter((id) => id !== eventId)
    // 결과 화면의 "무슨 일이 있었는지" 목록에서도 뺀다 — 알림과 실제가 어긋나지 않게.
    const report = game.lastTurnReport
      ? {
          ...game.lastTurnReport,
          triggeredEventIds: game.lastTurnReport.triggeredEventIds.filter((id) => id !== eventId),
        }
      : game.lastTurnReport
    set({
      game: {
        ...game,
        pendingEventIds,
        lastTurnReport: report,
        // 이벤트 화면에 머물러 있었다면 다음 이벤트 or 평상 화면으로 옮긴다(빈 화면 방지).
        phase:
          game.phase === 'event' && pendingEventIds.length === 0 ? idlePhase(game) : game.phase,
      },
      lastChoiceOutcome: null,
    })
  },

  save: (slot) => {
    const ok = saveGame(get().game, slot)
    set({
      savedAt: ok ? (getSlotSummary(slot).savedAt ?? get().savedAt) : get().savedAt,
      activeSlot: ok ? slot : get().activeSlot,
      notice: ok ? `${slot + 1}번 슬롯에 저장했습니다.` : '저장에 실패했습니다.',
    })
  },

  load: (slot) => {
    const loaded = loadGame(slot)
    if (!loaded) {
      set({ notice: '불러올 기록이 없습니다.' })
      return
    }
    // 옛 세이브의 착장 id 가 지금 매니페스트에 없을 수 있다.
    const resolved = resolveOutfit(get().outfitManifest, loaded.currentOutfitId)
    set({
      game: { ...loaded, currentOutfitId: resolved.id },
      savedAt: getSlotSummary(slot).savedAt ?? null,
      activeSlot: slot,
      lastChoiceOutcome: null,
      notice: `${slot + 1}번 슬롯을 불러왔습니다.`,
    })
  },

  // ★ 슬롯 보존 — 저장된 기록은 지우지 않고, 진행 중인 게임만 새로 시작한다.
  //   갤러리·읽음기록·옵션도 그대로다(애초에 세이브 키와 분리돼 있다).
  reset: () => {
    set({
      game: createInitialState(),
      savedAt: null,
      activeSlot: null,
      portraitOpen: false,
      lastChoiceOutcome: null,
      notice: '처음부터 다시 시작합니다.',
    })
  },

  clearNotice: () => set({ notice: null }),
}))
