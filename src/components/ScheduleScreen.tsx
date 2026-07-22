import { ACTIVITIES, ACTIVITY_BY_ID } from '../data/activities'
import { MONTH_SCALE, monthLabel } from '../data/config'
import { formatEffect } from '../systems/effects'
import { describeCondition, matchesCondition } from '../systems/eventEngine'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import type { Activity } from '../types/game'
import { Button } from './ui/Button'

function EffectChips({ activity }: { activity: Activity }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {activity.effects.map((effect, i) => (
        <span
          key={i}
          className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
            effect.amount > 0 ? 'bg-slate-800 text-emerald-300' : 'bg-slate-800 text-rose-300'
          }`}
        >
          {/* 활동 카드는 월 단위 추정치 — MONTH_SCALE 을 반영해 보여준다. */}
          {formatEffect(effect, MONTH_SCALE)}
        </span>
      ))}
    </div>
  )
}

export function ScheduleScreen() {
  const game = useGame((s) => s.game)
  const addActivity = useGame((s) => s.addActivity)
  const removeActivityAt = useGame((s) => s.removeActivityAt)
  const clearPlan = useGame((s) => s.clearPlan)
  const endTurn = useGame((s) => s.endTurn)

  return (
    <div className="pb-28 lg:pb-6">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-slate-100">
          즉위 {game.date.year}년 {monthLabel(game.date.month)}의 일과
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          행동력 {game.actionPoints}만큼 활동을 고르고 이번 달을 넘기세요.
        </p>
      </header>

      {/* 선택한 활동 */}
      <section className="mb-5 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">이번 달의 계획</h2>
          {game.plannedActivityIds.length > 0 && (
            <button
              className="min-h-[44px] px-2 text-xs text-slate-400 active:text-slate-200"
              onClick={clearPlan}
            >
              전부 비우기
            </button>
          )}
        </div>

        {game.plannedActivityIds.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">아직 아무것도 정하지 않았습니다.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {game.plannedActivityIds.map((id, index) => (
              <li key={`${id}-${index}`}>
                <button
                  className="flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-800 px-3 text-sm text-slate-100 active:bg-slate-700"
                  onClick={() => removeActivityAt(index)}
                  aria-label={`${ACTIVITY_BY_ID[id]?.name} 취소`}
                >
                  {ACTIVITY_BY_ID[id]?.name}
                  <span className="text-slate-500">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 활동 목록 */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-300">활동 선택</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACTIVITIES.map((activity) => {
            const unlocked = !activity.requires || matchesCondition(game, activity.requires)
            const affordable = activity.apCost <= game.actionPoints
            const usable = unlocked && affordable
            return (
              <li key={activity.id}>
                <button
                  disabled={!usable}
                  onClick={() => addActivity(activity.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    usable
                      ? 'border-slate-700 bg-slate-900/60 active:border-amber-500 active:bg-slate-800'
                      : 'border-slate-800 bg-slate-900/30 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-100">
                    {resolveText(activity.name, game)}
                  </span>
                    <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                      {activity.apCost} AP
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {resolveText(activity.description, game)}
                  </p>
                  {unlocked ? (
                    <>
                      <EffectChips activity={activity} />
                      {activity.tags?.includes('independence') && (
                        <p className="mt-2 text-[11px] text-red-400">섭정공의 눈에 띄는 일입니다</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">
                      🔒 {describeCondition(activity.requires).join(', ')} 필요
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 턴 종료: 폰에선 하단 고정 */}
      <div data-onboard="endTurn" className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <Button variant="primary" className="w-full" onClick={endTurn}>
          턴 종료 · 이번 달 넘기기
        </Button>
      </div>
    </div>
  )
}
