import { useEffect } from 'react'
import { EndedScreen } from './components/EndedScreen'
import { EventScreen } from './components/EventScreen'
import { PortraitModal } from './components/portrait/PortraitModal'
import { ScheduleScreen } from './components/ScheduleScreen'
import { StatusPanel } from './components/StatusPanel'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { IntroSequence } from './components/IntroSequence'
import { HelpScreen } from './components/HelpScreen'
import { GalleryScreen } from './components/GalleryScreen'
import { SettingsMenu } from './components/SettingsMenu'
import { AiSettingsModal } from './components/ai/AiSettingsModal'
import { TalkModal } from './components/talk/TalkModal'
import { TitleScreen } from './components/TitleScreen'
import { TurnResultScreen } from './components/TurnResultScreen'
import { useApp } from './store/appStore'
import { useGame } from './store/gameStore'

function Notice() {
  const notice = useGame((s) => s.notice)
  const clearNotice = useGame((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(clearNotice, 2000)
    return () => clearTimeout(timer)
  }, [notice, clearNotice])

  if (!notice) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-8">
      <p className="rounded-full bg-ink-800 px-4 py-2 text-sm text-parchment shadow-lg">
        {notice}
      </p>
    </div>
  )
}

export default function App() {
  const screen = useApp((s) => s.screen)
  const intro = useApp((s) => s.intro)
  const onboarding = useApp((s) => s.onboarding)
  const settingsOpen = useApp((s) => s.settingsOpen)
  const help = useApp((s) => s.help)
  const closeHelp = useApp((s) => s.closeHelp)
  const gallery = useApp((s) => s.gallery)
  const closeGallery = useApp((s) => s.closeGallery)
  const aiSettings = useApp((s) => s.aiSettings)
  const closeAiSettings = useApp((s) => s.closeAiSettings)
  const phase = useGame((s) => s.game.phase)
  const initOutfits = useGame((s) => s.initOutfits)

  // 착장 매니페스트는 앱 시작 시 한 번만 읽는다.
  useEffect(() => {
    void initOutfits()
  }, [initOutfits])

  return (
    <>
      {/* 앱 진입은 이제 타이틀부터 — 예전엔 게임 중간으로 바로 떨어졌다. */}
      {screen === 'title' ? (
        <TitleScreen />
      ) : (
        /*
         * ★ 데스크톱은 **앱 레이아웃**이다 (UI 리디자인 2단계).
         *   페이지가 통째로 스크롤되면 사이드바가 위로 사라져, 스탯을 보며 카드를 고를 수 없다.
         *   뷰포트 높이를 두 열이 나눠 갖고 각 열이 **안에서** 스크롤한다 —
         *   사이드바는 항상 보이고, 턴 종료 버튼도 늘 같은 자리에 선다.
         *   폰은 지금 구조(페이지 스크롤 + 하단 고정 바)를 그대로 둔다.
         */
        <div className="min-h-dvh lg:h-dvh lg:overflow-hidden">
          <div className="mx-auto flex max-w-6xl flex-col lg:h-full lg:flex-row lg:gap-6 lg:p-6">
            <StatusPanel />
            <main className="min-w-0 flex-1 px-4 py-5 lg:flex lg:min-h-0 lg:flex-col lg:px-0 lg:py-0">
              {/* 일과 화면은 자기 안에서 스크롤 영역과 고정 CTA 를 나눈다. */}
              {phase === 'schedule' && <ScheduleScreen />}
              {phase === 'result' && (
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  <TurnResultScreen />
                </div>
              )}
              {phase === 'event' && (
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  <EventScreen />
                </div>
              )}
              {phase === 'ended' && (
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  <EndedScreen />
                </div>
              )}
            </main>
          </div>
          <PortraitModal />
          <TalkModal />
          {/* 새 게임 진입: 인트로(선왕 배경 → 성별) → 온보딩 순. 게임 화면 위 오버레이. */}
          {intro && <IntroSequence />}
          {onboarding && <OnboardingOverlay />}
          <Notice />
        </div>
      )}

      {/* 설정·도움말·갤러리는 타이틀·게임 어디서나 열린다(앱 최상위 오버레이). */}
      {settingsOpen && <SettingsMenu />}
      {help && <HelpScreen onClose={closeHelp} />}
      {gallery && <GalleryScreen onClose={closeGallery} />}
      {aiSettings && <AiSettingsModal onClose={closeAiSettings} />}
    </>
  )
}
