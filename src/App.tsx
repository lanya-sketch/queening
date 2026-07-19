import { useEffect } from 'react'
import { EventScreen } from './components/EventScreen'
import { ScheduleScreen } from './components/ScheduleScreen'
import { StatusPanel } from './components/StatusPanel'
import { TurnResultScreen } from './components/TurnResultScreen'
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
  const phase = useGame((s) => s.game.phase)

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:gap-6 lg:p-6">
        <StatusPanel />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-0 lg:py-0">
          {phase === 'schedule' && <ScheduleScreen />}
          {phase === 'result' && <TurnResultScreen />}
          {phase === 'event' && <EventScreen />}
        </main>
      </div>
      <Notice />
    </div>
  )
}
