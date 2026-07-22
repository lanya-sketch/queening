import { useEffect } from 'react'
import { EndedScreen } from './components/EndedScreen'
import { EventScreen } from './components/EventScreen'
import { PortraitModal } from './components/portrait/PortraitModal'
import { ScheduleScreen } from './components/ScheduleScreen'
import { StatusPanel } from './components/StatusPanel'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { HelpScreen } from './components/HelpScreen'
import { SettingsMenu } from './components/SettingsMenu'
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
      <p className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg">
        {notice}
      </p>
    </div>
  )
}

export default function App() {
  const screen = useApp((s) => s.screen)
  const onboarding = useApp((s) => s.onboarding)
  const settingsOpen = useApp((s) => s.settingsOpen)
  const help = useApp((s) => s.help)
  const closeHelp = useApp((s) => s.closeHelp)
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
        <div className="min-h-dvh">
          <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:gap-6 lg:p-6">
            <StatusPanel />
            <main className="min-w-0 flex-1 px-4 py-5 lg:px-0 lg:py-0">
              {phase === 'schedule' && <ScheduleScreen />}
              {phase === 'result' && <TurnResultScreen />}
              {phase === 'event' && <EventScreen />}
              {phase === 'ended' && <EndedScreen />}
            </main>
          </div>
          <PortraitModal />
          <TalkModal />
          {/* 온보딩은 새 게임 첫 진입에만 뜬다. 게임 화면 위 오버레이. */}
          {onboarding && <OnboardingOverlay />}
          <Notice />
        </div>
      )}

      {/* 설정·도움말은 타이틀·게임 어디서나 열린다(앱 최상위 오버레이). */}
      {settingsOpen && <SettingsMenu />}
      {help && <HelpScreen onClose={closeHelp} />}
    </>
  )
}
