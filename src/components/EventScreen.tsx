import { useEffect, useState } from 'react'
import { EVENT_BY_ID } from '../data/events'
import { HIDDEN_GAUGES } from '../data/stats'
import { targetLabel } from '../systems/effects'
import { deltaView, effectView } from '../systems/display'
import { EffectPill, LockedNote, Lozenge, PrimaryAction } from './ui/Chrome'
import { describeCondition, matchesCondition } from '../systems/eventEngine'
import { activeChoiceTier, resolvedChoice } from '../systems/activityTier'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import { IncidentView } from './IncidentView'
import { ScenePlayer } from './scene/ScenePlayer'
import type { Choice, Delta, Effect } from '../types/game'

/**
 * 선택지 미리보기에서는 히든 게이지(의심·신망)를 가린다.
 * 내 능력치는 계산해서 고르되, 섭정의 속마음은 고른 뒤에야 안다.
 */
function visibleEffects(effects: Effect[] | undefined): Effect[] {
  return (effects ?? []).filter(
    (e) => !(e.target.kind === 'resource' && HIDDEN_GAUGES.includes(e.target.key)),
  )
}

/** ★ 선택지 미리보기도 수치 없이 ▲▼ + 정도. 활동 카드와 같은 어법. */
function EffectList({ effects }: { effects: Effect[] }) {
  if (effects.length === 0) return null
  return (
    <span className="mt-3 flex flex-col gap-1.5">
      {effects.map((effect, i) => (
        <EffectPill key={i} {...effectView(effect)} />
      ))}
    </span>
  )
}

function DeltaChips({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) return null
  return (
    <div
      className="mt-4 flex flex-col gap-1.5 border-t pt-4"
      style={{ borderColor: 'rgba(212,176,106,.14)' }}
    >
      {deltas.map((delta) => (
        <span key={delta.label} data-delta={delta.label}>
          <EffectPill {...deltaView(delta)} />
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
  const preview = resolvedChoice(choice, game)

  return (
    <button
      data-choice={choice.id}
      data-choice-tier={choice.tiers?.length ? (activeChoiceTier(choice, game)?.min ? '제대로' : '어설픔') : ''}
      data-locked={available ? 'false' : 'true'}
      onClick={() => chooseOption(eventId, choice.id)}
      disabled={!available}
      className="min-h-[44px] w-full rounded-panel border p-3.5 text-left"
      style={{
        borderColor: available ? 'rgba(212,176,106,.24)' : 'rgba(212,176,106,.1)',
        background: available
          ? 'linear-gradient(180deg,#181924,#141520)'
          : 'rgba(255,255,255,.015)',
        opacity: available ? 1 : 0.5,
      }}
    >
      <span
        className="font-title text-[14.5px] font-bold"
        style={{ color: available ? 'var(--color-parchment)' : 'var(--color-faint)' }}
      >
        {resolveText(choice.label, game)}
      </span>
      {available ? (
        <>
          {/* ★ 4-C: 결과 차등 선택지는 **지금 스탯의 등급**을 미리 보여준다.
              공통분만 보여주면 "무엇이 달라지는지"가 화면에서 사라진다(수업 카드와 같은 규칙). */}
          <EffectList effects={visibleEffects(preview.effects)} />
          {preview.hint && (
            <span className="mt-2.5 block text-[11px] italic text-faint">{preview.hint}</span>
          )}
        </>
      ) : (
        <LockedNote>{requirements.join(', ')} 필요</LockedNote>
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
  // ★ 큐에 있는데 정의를 못 찾으면(있어선 안 되지만) 빈 화면에 갇힌다 — 조용히 넘긴다(#7).
  useEffect(() => {
    if (eventId && !EVENT_BY_ID[eventId]) dismissEvent()
  }, [eventId, dismissEvent])
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
    <div data-screen="event" className="pb-28 lg:pb-6">
      <article
        className="rounded-panel border p-5"
        style={{
          borderColor: 'rgba(212,176,106,.34)',
          background: 'linear-gradient(180deg,rgba(212,176,106,.06),rgba(255,255,255,.012))',
          boxShadow: '0 16px 44px rgba(0,0,0,.45)',
        }}
      >
        <div className="flex items-center gap-2">
          <Lozenge size={5} />
          {/*
            ★ 카테고리는 장식이 아니라 뜻을 지닌 말이다(사건 / 국정 현안).
              라틴으로 바꿨더니 한국어 독자에게 구분이 흐려져서 되돌렸다.
              장식용 라틴 소제목은 상시 UI 가구(ACTION POINTS 등)에만 쓴다.
          */}
          <span
            data-event-category
            className="text-[11px]"
            style={{ letterSpacing: '.16em', color: 'var(--color-gold-600)' }}
          >
            {event.category === 'state_affair' ? '국정 현안' : '사건'}
          </span>
        </div>
        <h1
          data-event-title
          className="mt-2 font-title text-[22px] font-bold leading-tight"
          style={{ color: 'var(--color-gold-300)' }}
        >
          {resolveText(event.title, game)}
        </h1>

        <div className="mt-4 space-y-3">
          {event.sceneId ? (
            <ScenePlayer
              sceneId={event.sceneId}
              finished={sceneDone}
              showSprites // 이벤트 씬은 VN 전신 레이아웃(화자 스프라이트).
              onFinished={() => setSceneDone(true)}
            />
          ) : (
            <Paragraphs text={event.text} className="text-[14px] leading-relaxed text-parchment/85" />
          )}
        </div>

        {!playingScene && event.effects && event.effects.length > 0 && (
          <DeltaChips
            deltas={event.effects.map((e) => ({ label: targetLabel(e.target), amount: e.amount }))}
          />
        )}

        {chosen && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(212,176,106,.14)' }}>
            <p className="font-title text-[13px]" style={{ color: 'var(--color-gold-400)' }}>
              {resolveText(chosen.label, game)}
            </p>
            <div className="mt-2 space-y-3">
              {/* ★ 4-C: 결과 차등 선택지는 고른 순간 확정된 후일담을 쓴다(재계산 금지). */}
              <Paragraphs
                text={outcome?.resultText ?? chosen.resultText}
                className="text-[13.5px] leading-relaxed text-parchment/75"
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
        <div
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-ink-950/95 p-3 backdrop-blur lg:static lg:mt-7 lg:border-0 lg:bg-transparent lg:p-0"
          style={{ borderColor: 'rgba(212,176,106,.15)' }}
        >
          <div className="flex justify-center">
            <PrimaryAction onClick={dismissEvent}>
              {remaining > 1 ? `계속 (${remaining - 1}건 더)` : '다음 달로'}
            </PrimaryAction>
          </div>
        </div>
      )}
    </div>
  )
}
