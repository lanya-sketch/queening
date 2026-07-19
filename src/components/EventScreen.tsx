import { EVENT_BY_ID } from '../data/events'
import { formatEffect } from '../systems/effects'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'

/** M2 에서 비주얼 노벨 씬으로 승격될 자리. 지금은 텍스트만 보여준다. */
export function EventScreen() {
  const eventId = useGame((s) => s.game.pendingEventIds[0])
  const dismissEvent = useGame((s) => s.dismissEvent)
  const remaining = useGame((s) => s.game.pendingEventIds.length)

  const event = eventId ? EVENT_BY_ID[eventId] : undefined
  if (!event) return null

  return (
    <div className="pb-28 lg:pb-6">
      <article className="rounded-xl border border-amber-900/60 bg-slate-900/60 p-5">
        <p className="text-xs text-amber-500">사건</p>
        <h1 className="mt-1 text-xl font-semibold text-amber-100">{event.title}</h1>
        <div className="mt-4 space-y-3">
          {event.text.split('\n').map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-200">
              {line}
            </p>
          ))}
        </div>

        {event.effects && event.effects.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-800 pt-4">
            {event.effects.map((effect, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
                  effect.amount > 0 ? 'bg-slate-800 text-emerald-300' : 'bg-slate-800 text-rose-300'
                }`}
              >
                {formatEffect(effect)}
              </span>
            ))}
          </div>
        )}
      </article>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <Button variant="primary" className="w-full" onClick={dismissEvent}>
          {remaining > 1 ? `계속 (${remaining - 1}건 더)` : '다음 계절로'}
        </Button>
      </div>
    </div>
  )
}
