import { create } from 'zustand'

/**
 * 앱 레벨 화면 라우팅 (D-1).
 *
 * ★ 게임 엔진(gameStore.phase)과 분리한다. 타이틀·온보딩은 턴 파이프라인 밖의
 *   진입부라, game.phase 에 섞으면 엔진이 그 존재를 알아야 한다. 여기 두면
 *   엔진은 여전히 schedule/result/event/ended 만 안다.
 *
 *   screen: 'title' → 타이틀 화면 / 'game' → 기존 게임 루프.
 *   온보딩은 game 안에서 별도 오버레이로 뜬다(D-1 온보딩 조각).
 */
export type AppScreen = 'title' | 'game'

/**
 * ★ 시점별 안내(코치마크) — 온보딩과 별개.
 *
 *   온보딩에 다 넣으면 첫 화면이 설명 폭탄이 된다. 대신 그 기능이 **처음 의미를 갖는
 *   시점**에 짧게 한 번 안내한다(인연은 13세 첫 등장, 착장은 연회복이 필요할 때 등).
 *   각 1회, 건너뛰기 가능. 본 것은 localStorage 에 남겨 다시 뜨지 않는다.
 */
export type CoachKey = 'bond' | 'outfit' | 'talk'

const COACH_STORE_KEY = 'queening.coachSeen'

function loadCoachSeen(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(COACH_STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function saveCoachSeen(seen: Record<string, true>): void {
  try {
    localStorage.setItem(COACH_STORE_KEY, JSON.stringify(seen))
  } catch {
    /* 저장 불가 환경은 이번 세션만 기억 */
  }
}

interface AppStore {
  screen: AppScreen
  /** 인트로 시퀀스(선왕 배경 → 성별 선택) 표시 중인지 — 온보딩보다 앞선다. */
  intro: boolean
  /** 새 게임 진입 직후인지 — 온보딩을 띄울지 결정한다. */
  onboarding: boolean
  /** 타이틀 설정 메뉴 오버레이. */
  settingsOpen: boolean
  /** 도움말 화면. 타이틀 설정·게임 중 '?' 양쪽에서 연다. */
  help: boolean
  /** 엔딩 갤러리 화면. 타이틀 '엔딩 기록'에서 연다. */
  gallery: boolean
  /** AI 설정 모달(D-3: 게임 화면에서 설정 오버레이로 이동). */
  aiSettings: boolean

  /** 지금 떠 있는 코치마크(없으면 null). */
  coach: CoachKey | null
  /** 이미 본 코치마크. */
  coachSeen: Record<string, true>
  /** 조건이 되면 아직 안 본 코치마크를 띄운다(한 번에 하나). 이미 봤으면 무시. */
  maybeCoach: (key: CoachKey) => void
  /** 현재 코치마크를 닫고 본 것으로 기록한다. */
  dismissCoach: () => void

  goTitle: () => void
  /** 새 게임 — 인트로(선왕 배경 → 성별)부터 시작한다. */
  startNewGame: () => void
  /** 인트로 종료 → 온보딩으로. */
  dismissIntro: () => void
  startGame: (withOnboarding: boolean) => void
  dismissOnboarding: () => void
  openSettings: () => void
  closeSettings: () => void
  openHelp: () => void
  closeHelp: () => void
  openGallery: () => void
  closeGallery: () => void
  openAiSettings: () => void
  closeAiSettings: () => void
}

/**
 * 초기 화면. 보통은 타이틀이지만, 검증이 sessionStorage 플래그를 심어 두면 바로 게임에서
 * 시작한다 — 스위트가 reload 를 여러 번 해도(그때마다 localStorage.clear) sessionStorage 는
 * 살아남아 타이틀에 다시 막히지 않는다. 프로덕션에는 이 플래그가 없다.
 */
function initialScreen(): AppScreen {
  try {
    if (sessionStorage.getItem('queening.enterGame') === '1') return 'game'
  } catch {
    /* sessionStorage 불가 환경은 그냥 타이틀 */
  }
  return 'title'
}

export const useApp = create<AppStore>()((set) => ({
  // 앱은 이제 타이틀에서 시작한다 — 예전엔 게임 중간으로 바로 떨어졌다.
  screen: initialScreen(),
  intro: false,
  onboarding: false,
  settingsOpen: false,
  help: false,
  gallery: false,
  aiSettings: false,
  coach: null,
  coachSeen: loadCoachSeen(),

  maybeCoach: (key) =>
    set((s) => {
      // 이미 봤거나, 다른 코치마크·오버레이가 떠 있으면 지금은 띄우지 않는다.
      if (s.coachSeen[key] || s.coach || s.intro || s.onboarding) return s
      return { coach: key }
    }),
  dismissCoach: () =>
    set((s) => {
      if (!s.coach) return s
      const coachSeen = { ...s.coachSeen, [s.coach]: true as const }
      saveCoachSeen(coachSeen)
      return { coach: null, coachSeen }
    }),

  goTitle: () =>
    set({ screen: 'title', intro: false, onboarding: false, settingsOpen: false, help: false, gallery: false, aiSettings: false }),
  // 새 게임: 게임 화면으로 들어가되 먼저 인트로 오버레이를 띄운다(온보딩은 그 다음).
  startNewGame: () => set({ screen: 'game', intro: true, onboarding: false }),
  dismissIntro: () => set({ intro: false, onboarding: true }),
  startGame: (withOnboarding) => set({ screen: 'game', intro: false, onboarding: withOnboarding }),
  dismissOnboarding: () => set({ onboarding: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  // 도움말을 열면 설정 메뉴는 접는다(도움말이 위에 겹치지 않게).
  openHelp: () => set({ help: true, settingsOpen: false }),
  closeHelp: () => set({ help: false }),
  openGallery: () => set({ gallery: true }),
  closeGallery: () => set({ gallery: false }),
  // AI 설정을 열면 설정 메뉴는 접는다(중첩 방지 — 앱 최상위 모달로 뜬다).
  openAiSettings: () => set({ aiSettings: true, settingsOpen: false }),
  closeAiSettings: () => set({ aiSettings: false }),
}))
