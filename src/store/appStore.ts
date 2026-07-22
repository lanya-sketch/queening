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

interface AppStore {
  screen: AppScreen
  /** 새 게임 진입 직후인지 — 온보딩을 띄울지 결정한다. */
  onboarding: boolean
  /** 타이틀 설정 메뉴 오버레이. */
  settingsOpen: boolean
  /** 도움말 화면. 타이틀 설정·게임 중 '?' 양쪽에서 연다. */
  help: boolean
  /** 엔딩 갤러리 화면. 타이틀 '엔딩 기록'에서 연다. */
  gallery: boolean

  goTitle: () => void
  startGame: (withOnboarding: boolean) => void
  dismissOnboarding: () => void
  openSettings: () => void
  closeSettings: () => void
  openHelp: () => void
  closeHelp: () => void
  openGallery: () => void
  closeGallery: () => void
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
  onboarding: false,
  settingsOpen: false,
  help: false,
  gallery: false,

  goTitle: () =>
    set({ screen: 'title', onboarding: false, settingsOpen: false, help: false, gallery: false }),
  startGame: (withOnboarding) => set({ screen: 'game', onboarding: withOnboarding }),
  dismissOnboarding: () => set({ onboarding: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  // 도움말을 열면 설정 메뉴는 접는다(도움말이 위에 겹치지 않게).
  openHelp: () => set({ help: true, settingsOpen: false }),
  closeHelp: () => set({ help: false }),
  openGallery: () => set({ gallery: true }),
  closeGallery: () => set({ gallery: false }),
}))
