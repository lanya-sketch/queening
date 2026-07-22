import { useEffect, useState } from 'react'
import { EVENT_BY_ID } from '../data/events'
import { HIDDEN_GAUGES } from '../data/stats'
import { formatEffect, targetLabel } from '../systems/effects'
import { describeCondition, matchesCondition } from '../systems/eventEngine'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import { IncidentView } from './IncidentView'
import { ScenePlayer } from './scene/ScenePlayer'
import type { Choice, Delta, Effect } from '../types/game'
import { Button } from './ui/Button'

/**
 * 선택지 미리보기에서는 히든 게이지(의심·신망)를 가린다.
 * 내 능력치는 계산해서 고르되, 섭정의 속마음은 고른 뒤에야 안다.
 */
function visibleEffects(effects: Effect[] | undefined): Effect[] {
  return (effects ?? []).filter(
    (e) => !(e.target.kind === 'resource' && HIDDEN_GAUGES.includes(e.target.key)),
  )
}

function EffectChips({ effects }: { effects: Effect[] }) {
  if (effects.length === 0) return null
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {effects.map((effect, i) => (
        <span
          key={i}
          className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
            effect.amount > 0 ? 'bg-slate-800 text-emerald-300' : 'bg-slate-800 text-rose-300'
          }`}
        >
          {formatEffect(effect)}
        </span>
      ))}
    </span>
  )
}

function DeltaChips({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) return null
  return (
    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-4">
      {deltas.map((delta) => (
        <span
          key={delta.label}
          className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
            delta.amount > 0 ? 'bg-slate-800 text-emerald-300' : 'bg-slate-800 text-rose-300'
          }`}
        >
          {delta.label} {delta.amount > 0 ? '+' : ''}
          {delta.amount}
        </span>
      ))}
    </div>
  )
}

function Paragraphs({ text, className }: { text: string; className: string }) {
  const game = useGame((s) => s.game)
  return (
    <>
      {resolveText(text, game).split('\n').map((line, i) =>
        line.trim() === '' ? (
          <span key={i} className="block h-2" />
        ) : (
          <p key={i} className={className}>
            {line}
          </p>
        ),
      )}
    </>
  )
}

function ChoiceButton({ eventId, choice }: { eventId: string; choice: Choice }) {
  const game = useGame((s) => s.game)
  const chooseOption = useGame((s) => s.chooseOption)

  const available = !choice.requires || matchesCondition(game, choice.requires)
  const requirements = describeCondition(choice.requires)

  return (
    <button
      onClick={() => chooseOption(eventId, choice.id)}
      disabled={!available}
      className={`w-full min-h-[44px] rounded-xl border p-3 text-left transition-colors ${
        available
          ? 'border-slate-700 bg-slate-900/60 active:border-amber-500 active:bg-slate-800'
          : 'border-slate-800 bg-slate-900/30'
      }`}
    >
      <span className={`text-sm font-medium ${available ? 'text-slate-100' : 'text-slate-500'}`}>
        {resolveText(choice.label, game)}
      </span>
      {available ? (
        <>
          <EffectChips effects={visibleEffects(choice.effects)} />
          {choice.hint && (
            <span className="mt-2 block text-[11px] italic text-slate-500">{choice.hint}</span>
          )}
        </>
      ) : (
        <span className="mt-1 block text-xs text-slate-500">
          🔒 {requirements.join(', ')} 필요
        </span>
      )}
    </button>
  )
}

/** M2b 에서 비주얼 노벨 씬으로 승격될 자리. 지금은 텍스트와 선택지만. */
export function EventScreen() {
  const eventId = useGame((s) => s.game.pendingEventIds[0])
  const remaining = useGame((s) => s.game.pendingEventIds.length)
  const outcome = useGame((s) => s.lastChoiceOutcome)
  const dismissEvent = useGame((s) => s.dismissEvent)

  const game = useGame((s) => s.game)
  // 씬이 있는 이벤트는 대사를 다 본 뒤에야 선택지/계속으로 넘어간다.
  const [sceneDone, setSceneDone] = useState(false)
  useEffect(() => setSceneDone(false), [eventId])

  const event = eventId ? EVENT_BY_ID[eventId] : undefined
  if (!event) return null

  // 돌발 현안은 내용이 데이터에 없다 — 화면이 생성해서 그린다.
  if (event.source === 'ai_generated') {
    return <IncidentView eventId={event.id} onDone={dismissEvent} />
  }

  const playingScene = Boolean(event.sceneId) && !sceneDone

  const chosen =
    outcome?.eventId === event.id
      ? event.choices?.find((c) => c.id === outcome.choiceId)
      : undefined
  const awaitingChoice = Boolean(event.choices?.length) && !chosen && !playingScene

  return (
    <div className="pb-28 lg:pb-6">
      <article className="rounded-xl border border-amber-900/60 bg-slate-900/60 p-5">
        <p className="text-xs text-amber-500">
          {event.category === 'state_affair' ? '국정 현안' : '사건'}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-amber-100">
          {resolveText(event.title, game)}
        </h1>

        <div className="mt-4 space-y-3">
          {event.sceneId ? (
            <ScenePlayer
              sceneId={event.sceneId}
              finished={sceneDone}
              onFinished={() => setSceneDone(true)}
            />
          ) : (
            <Paragraphs text={event.text} className="text-sm leading-relaxed text-slate-200" />
          )}
        </div>

        {!playingScene && event.effects && event.effects.length > 0 && (
          <DeltaChips
            deltas={event.effects.map((e) => ({ label: targetLabel(e.target), amount: e.amount }))}
          />
        )}

        {chosen && (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="text-xs text-amber-500">{resolveText(chosen.label, game)}</p>
            <div className="mt-2 space-y-3">
              <Paragraphs
                text={chosen.resultText}
                className="text-sm leading-relaxed text-slate-300"
              />
              {/* chosen.label 도 토큰 치환을 거친다 */}
            </div>
            {outcome && <DeltaChips deltas={outcome.deltas} />}
          </div>
        )}
      </article>

      {awaitingChoice && (
        <div className="mt-4 space-y-2">
          {event.choices!.map((choice) => (
            <ChoiceButton key={choice.id} eventId={event.id} choice={choice} />
          ))}
        </div>
      )}

      {!awaitingChoice && !playingScene && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
          <Button variant="primary" className="w-full" onClick={dismissEvent}>
            {remaining > 1 ? `계속 (${remaining - 1}건 더)` : '다음 달로'}
          </Button>
        </div>
      )}
    </div>
  )
}
