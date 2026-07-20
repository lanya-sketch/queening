import { useEffect, useState } from 'react'
import { incidentHasChoices } from '../data/events/incidents'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import {
  cautiousIndex,
  INCIDENT_TIMER_SECONDS,
  useIncidents,
} from '../store/incidentStore'
import { RESOURCE_META } from '../data/stats'
import { Button } from './ui/Button'

/**
 * 돌발 현안 화면 (M2b-4).
 *
 * 생성이 실패하면 아무것도 보여주지 않고 넘긴다 — 미리 쓴 사건으로 때우지 않는다.
 *
 * ★ 타이머는 **서술이 화면에 다 뜬 뒤에** 시작한다.
 *   읽는 중에 시간이 가면 빨리 읽는 사람에게만 유리한 게임이 된다.
 */
export function IncidentView({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const game = useGame((s) => s.game)
  const incident = useIncidents((s) => s.byEvent[eventId])
  const loading = useIncidents((s) => s.loading === eventId)
  const generate = useIncidents((s) => s.generate)
  const choose = useIncidents((s) => s.choose)
  const chosenIndex = useIncidents((s) => s.chosen[eventId])
  const timerEnabled = useIncidents((s) => s.timerEnabled)

  const [left, setLeft] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    void generate(eventId)
  }, [eventId, generate])

  const awaiting =
    incident !== null && incident !== undefined &&
    incidentHasChoices(eventId) && chosenIndex === undefined

  /**
   * ★ 사건이 바뀌면 카운트다운 상태를 반드시 초기화한다.
   *
   *   이게 없으면 앞 사건이 시간 초과로 끝났을 때 left 가 0 인 채로 남고,
   *   다음 사건에서 타이머가 꺼져 있어 아래 effect 가 early-return 하면
   *   0 이 그대로 유지되어 **고를 기회도 없이 즉시 자동 선택**된다.
   *   (검증 F11 이 이 상태 누수를 잡았다)
   */
  useEffect(() => {
    setLeft(null)
    setTimedOut(false)
  }, [eventId])

  // 타이머 시작 — 서술이 렌더된 다음 프레임부터.
  useEffect(() => {
    if (!awaiting || !incident?.urgent || !timerEnabled) {
      setLeft(null)
      return
    }
    setLeft(INCIDENT_TIMER_SECONDS)
    const id = setInterval(() => {
      setLeft((v) => {
        if (v === null) return null
        if (v <= 1) {
          clearInterval(id)
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [awaiting, incident?.urgent, timerEnabled])

  // 시간 초과 → 신중한 쪽으로 자동 선택. 추가 벌점은 없다.
  useEffect(() => {
    if (left !== 0 || !awaiting || !incident) return
    setTimedOut(true)
    choose(eventId, cautiousIndex(incident.choices))
  }, [left, awaiting, incident, choose, eventId])

  if (loading) {
    return (
      <article className="rounded-xl border border-amber-900/60 bg-slate-900/60 p-5">
        <p className="text-sm text-slate-500">소식이 올라오고 있습니다…</p>
      </article>
    )
  }

  // 생성 실패 — 조용히 넘어간다.
  if (incident === null) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="text-sm text-slate-500">별다른 일 없이 계절이 지났습니다.</p>
        <Button variant="primary" className="mt-4 w-full" onClick={onDone}>
          다음 계절로
        </Button>
      </div>
    )
  }
  if (!incident) return null

  const chosen = chosenIndex !== undefined ? incident.choices[chosenIndex] : undefined

  return (
    <div className="pb-28 lg:pb-6">
      <article className="rounded-xl border border-amber-900/60 bg-slate-900/60 p-5">
        <p className="text-xs text-amber-500">
          국정 현안
          {incident.urgent && <span className="ml-2 text-rose-400">급보</span>}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-amber-100">
          {resolveText(incident.title, game)}
        </h1>

        <div className="mt-4 space-y-3">
          {resolveText(incident.text, game).split('\n').map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-200">
              {line}
            </p>
          ))}
        </div>

        {chosen && (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="text-xs text-amber-500">{resolveText(chosen.label, game)}</p>
            {timedOut && (
              <p className="mt-1 text-xs italic text-slate-500">
                머뭇거리는 사이 일은 그렇게 흘러갔다.
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {resolveText(chosen.resultText, game)}
            </p>
            <Deltas deltas={chosen.deltas} />
          </div>
        )}

        {!incidentHasChoices(eventId) && <Deltas deltas={incident.deltas} />}
      </article>

      {awaiting && (
        <div className="mt-4 space-y-2">
          {left !== null && (
            <p className="text-center text-xs tabular-nums text-rose-300">
              {left}초 안에 결정해야 합니다
            </p>
          )}
          {incident.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => choose(eventId, i)}
              className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-left active:border-amber-500 active:bg-slate-800"
            >
              <span className="text-sm font-medium text-slate-100">
                {resolveText(choice.label, game)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!awaiting && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
          <Button variant="primary" className="w-full" onClick={onDone}>
            다음 계절로
          </Button>
        </div>
      )}
    </div>
  )
}

function Deltas({ deltas }: { deltas: { target: string; amount: number }[] }) {
  if (!deltas.length) return null
  return (
    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-4">
      {deltas.map((d) => (
        <span
          key={d.target}
          className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
            d.amount > 0 ? 'bg-slate-800 text-emerald-300' : 'bg-slate-800 text-rose-300'
          }`}
        >
          {RESOURCE_META[d.target as 'wellbeing' | 'regentSuspicion']?.label ?? d.target}{' '}
          {d.amount > 0 ? '+' : ''}
          {d.amount}
        </span>
      ))}
    </div>
  )
}
