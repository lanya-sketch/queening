import { ACTIVITY_BY_ID } from '../data/activities'
import { SEASON_LABEL } from '../data/config'
import { EVENT_BY_ID } from '../data/events'
import { useGame } from '../store/gameStore'
import type { Delta } from '../types/game'
import { Button } from './ui/Button'

function DeltaList({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) {
    return <p className="text-sm text-slate-500">변화 없음</p>
  }
  return (
    <ul className="space-y-1.5">
      {deltas.map((delta) => (
        <li key={delta.label} className="flex items-center justify-between text-sm">
          <span className="text-slate-300">{delta.label}</span>
          <span
            className={`tabular-nums font-medium ${
              delta.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {delta.amount > 0 ? '+' : ''}
            {delta.amount}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function TurnResultScreen() {
  const report = useGame((s) => s.game.lastTurnReport)
  const continueFromResult = useGame((s) => s.continueFromResult)

  if (!report) return null

  return (
    <div className="pb-28 lg:pb-6">
      <header className="mb-4">
        <p className="text-xs text-slate-500">지난 계절</p>
        <h1 className="text-lg font-semibold text-slate-100">
          즉위 {report.date.year}년 {SEASON_LABEL[report.date.season]}의 결과
        </h1>
      </header>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">수행한 활동</h2>
        {report.activityIds.length === 0 ? (
          <p className="text-sm text-slate-500">아무것도 하지 않고 계절을 보냈습니다.</p>
        ) : (
          <ul className="mb-3 flex flex-wrap gap-1.5">
            {report.activityIds.map((id, i) => (
              <li
                key={`${id}-${i}`}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
              >
                {ACTIVITY_BY_ID[id]?.name ?? id}
              </li>
            ))}
          </ul>
        )}
        <DeltaList deltas={report.activityDeltas} />
      </section>

      {report.triggeredEventIds.length > 0 && (
        <section className="mb-4 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
          <h2 className="mb-2 text-sm font-medium text-amber-200">일어난 일</h2>
          <ul className="mb-3 space-y-1">
            {report.triggeredEventIds.map((id) => (
              <li key={id} className="text-sm text-amber-100">
                · {EVENT_BY_ID[id]?.title ?? id}
              </li>
            ))}
          </ul>
          <DeltaList deltas={report.eventDeltas} />
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <Button variant="primary" className="w-full" onClick={continueFromResult}>
          {report.triggeredEventIds.length > 0 ? '무슨 일이 있었는지 본다' : '다음 계절로'}
        </Button>
      </div>
    </div>
  )
}
