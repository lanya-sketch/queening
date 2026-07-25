import { useEffect } from 'react'
import { ACTIVITY_BY_ID } from '../data/activities'
import { monthLabel } from '../data/config'
import { EVENT_BY_ID } from '../data/events'
import { deltaView } from '../systems/display'
import { resolveText } from '../systems/text'
import { resolveCharacterPortrait } from '../systems/outfits'
import { CHARACTER_BY_ID } from '../data/characters'
import { useGame } from '../store/gameStore'
import { useIncidents } from '../store/incidentStore'
import type { Delta } from '../types/game'
import { EffectPill, Lozenge, Panel, PrimaryAction, Rule, SectionLabel } from './ui/Chrome'

/**
 * ★ 결과 델타도 활동 카드와 **같은 어법**으로 (UI 리디자인).
 *   예전에는 스탯은 "자랐다", 자원은 "+6" 이 섞여 나와, 같은 화면에서 두 어법이 싸웠다.
 *   이제 전부 ▲▼ + 정도다. 정확한 값은 사이드바의 상세(내부값)에만 있다.
 */
function DeltaList({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) {
    return <p className="text-[13px] italic text-faint">변화 없음</p>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {deltas.map((delta) => {
        const v = deltaView(delta)
        return (
          <li key={delta.label} data-delta={delta.label}>
            <EffectPill {...v} />
          </li>
        )
      })}
    </ul>
  )
}

export function TurnResultScreen() {
  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)
  const report = useGame((s) => s.game.lastTurnReport)
  const pendingEventIds = useGame((s) => s.game.pendingEventIds)
  const continueFromResult = useGame((s) => s.continueFromResult)
  const generateIncident = useIncidents((s) => s.generate)
  const byEvent = useIncidents((s) => s.byEvent)

  // ★ AI 돌발은 여기서 **미리** 생성한다 (#7). 플레이어가 결과를 읽는 동안 만들어 두고,
  //   실패하면 generate 가 큐에서 빼므로 "사건이 있었다"는 알림도 함께 사라진다.
  //   내용이 나올 때만 사건으로 남는다.
  useEffect(() => {
    for (const id of pendingEventIds) {
      if (EVENT_BY_ID[id]?.source === 'ai_generated') void generateIncident(id)
    }
  }, [pendingEventIds, generateIncident])

  /** 예고된 AI 돌발 가운데 아직 생성 결과가 정해지지 않은 것이 있는가. */
  const incidentPending = pendingEventIds.some(
    (id) => EVENT_BY_ID[id]?.source === 'ai_generated' && !(id in byEvent),
  )

  if (!report) return null

  return (
    <div data-screen="result" className="pb-28 lg:pb-6">
      <header className="mb-5">
        <h1 className="font-title text-[24px] font-bold leading-tight text-parchment lg:text-[30px]">
          즉위 {report.date.year}년 {monthLabel(report.date.month)}의 결과
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <SectionLabel tone="muted">The Month Past</SectionLabel>
          <Rule />
        </div>
      </header>

      <Panel className="mb-4">
        <div className="mb-3 flex items-center gap-2.5">
          <Lozenge />
          <h2 className="font-title text-[15px] font-bold" style={{ color: 'var(--color-gold-300)' }}>
            수행한 활동
          </h2>
        </div>
        {report.activityIds.length === 0 ? (
          <p className="mb-3 text-[13px] italic text-faint">
            아무것도 하지 않고 한 달을 보냈습니다.
          </p>
        ) : (
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {report.activityIds.map((id, i) => (
              <li
                key={`${id}-${i}`}
                className="rounded border px-2.5 py-1 font-title text-[12.5px] text-parchment/85"
                style={{
                  borderColor: 'rgba(212,176,106,.22)',
                  background: 'rgba(212,176,106,.06)',
                }}
              >
                {ACTIVITY_BY_ID[id]?.name ?? id}
              </li>
            ))}
          </ul>
        )}
        <DeltaList deltas={report.activityDeltas} />
      </Panel>

      {report.triggeredEventIds.length > 0 && (
        <Panel className="mb-4" tone="gold">
          <div className="mb-3 flex items-center gap-2.5">
            <Lozenge />
            <h2
              className="font-title text-[15px] font-bold"
              style={{ color: 'var(--color-gold-300)' }}
            >
              일어난 일
            </h2>
          </div>
          {/*
            ★ 조용한 소소는 제목 + 본문을 **여기서 바로** 펼친다(원인+결과 한 화면).
              선택지·씬이 있는 큰 이벤트(pendingEventIds)는 제목만 짚고 다음 화면에서 본다.
          */}
          <ul className="mb-4 space-y-2.5">
            {report.triggeredEventIds.map((id) => {
              const ev = EVENT_BY_ID[id]
              const inline = report.inlineEventIds.includes(id)
              // ★ 노귀족처럼 portrait 를 둔 소소는 대화 크롭(얼굴)을 작게 얹는다.
              //   VN 전신은 없지만 "누구"인지는 얼굴로 잇는다. 모브는 portrait 가 없어 텍스트만.
              const face =
                inline && ev?.portrait && manifest.characterPortraits
                  ? resolveCharacterPortrait(
                      manifest.characterPortraits,
                      ev.portrait,
                      CHARACTER_BY_ID[ev.portrait]?.gender ?? 'male',
                      game.age,
                    )?.thumbSrc ?? null
                  : null
              return (
                <li key={id} data-report-event={id}>
                  <p className="font-title text-[13.5px] text-parchment/90">
                    · {ev?.title ?? id}
                  </p>
                  {inline && ev?.text && (
                    <div className="mt-1 flex items-start gap-2.5 pl-3">
                      {face && (
                        <img
                          src={face}
                          alt=""
                          data-report-face={ev.portrait}
                          className="h-11 w-9 shrink-0 rounded border border-line-gold/40 object-cover object-top"
                        />
                      )}
                      <p className="text-[12.5px] leading-relaxed text-parchment/60">
                        {resolveText(ev.text, game)}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <DeltaList deltas={report.eventDeltas} />
        </Panel>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-ink-950/95 p-3 backdrop-blur lg:static lg:mt-7 lg:border-0 lg:bg-transparent lg:p-0"
        style={{ borderColor: 'rgba(212,176,106,.15)' }}
      >
        <div className="flex justify-center">
          {/*
            ★ 예고한 돌발이 아직 만들어지는 중이면 여기서 기다린다.
              넘어가 버리면 "소식이 올라오고 있습니다" 를 본 뒤 아무 일도 없이 끝나는
              빈 예고가 된다. 여기서 기다리면 내용이 오거나(사건이 뜬다),
              실패해 예고가 조용히 사라지거나(다음 달로) 둘 중 하나로 끝난다.
          */}
          {/* ★ "본다"는 **선택지·씬이 남았을 때만**. 소소만 있으면 이미 위에서 다 봤으니 "다음 달로". */}
          <PrimaryAction onClick={continueFromResult} disabled={incidentPending}>
            {incidentPending
              ? '소식을 기다리는 중…'
              : pendingEventIds.length > 0
                ? '무슨 일이 있었는지 본다'
                : '다음 달로'}
          </PrimaryAction>
        </div>
      </div>
    </div>
  )
}
