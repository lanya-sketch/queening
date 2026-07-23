import { useState } from 'react'
import { GAME_CONFIG, courtInfluenceCap, monthLabel } from '../data/config'
import { STAT_KEYS, STAT_META } from '../data/stats'

import { perilNotice, resourceGauge, statGauge } from '../systems/display'
import { useAiEnabled } from '../store/aiStore'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { talkLocked, useTalk } from '../store/talkStore'
import { resolveText } from '../systems/text'
import { PortraitButton } from './portrait/PortraitButton'
import { RomancePanel } from './romance/RomancePanel'
import { Button } from './ui/Button'
import { Gauge, Lozenge, SectionHead } from './ui/Chrome'

/**
 * 사이드바 (UI 리디자인 1단계).
 *
 * ★ 수치는 화면에 없다. 게이지는 질적 라벨만 보이고, 정확한 값은
 *   맨 아래 "상세 (내부값)" 접이식과 data-value 속성에만 있다.
 */
export function StatusPanel() {
  const [open, setOpen] = useState(false)
  const aiEnabled = useAiEnabled()
  const openTalk = useTalk((s) => s.openTalk)
  const openHelp = useApp((s) => s.openHelp)
  const openSettings = useApp((s) => s.openSettings)
  const [romanceOpen, setRomanceOpen] = useState(false)
  const game = useGame((s) => s.game)
  const savedAt = useGame((s) => s.savedAt)
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const reset = useGame((s) => s.reset)

  const locked = talkLocked(game.phase)
  // ★ 경고는 게이지 구간에서 나온다 — 칩과 게이지가 같은 어휘·같은 문턱을 쓰도록.
  const notices = [
    ['wellbeing', perilNotice('wellbeing', game.wellbeing)],
    ['suspicion', perilNotice('regentSuspicion', game.regentSuspicion)],
  ].filter((n): n is [string, string] => Boolean(n[1]))
  const ap = game.actionPoints
  const apMax = GAME_CONFIG.actionPointsPerTurn

  return (
    <aside className="sticky top-0 z-20 lg:static lg:w-[21rem] lg:shrink-0">
      <div
        className="border-b bg-ink-800/95 backdrop-blur lg:rounded-panel lg:border"
        style={{ borderColor: 'rgba(212,176,106,.15)', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}
      >
        {/* 요약 줄. 폰=가로 한 줄, PC=초상이 위로 올라간 세로 배치 */}
        <div className="flex items-center gap-3 px-4 py-3 lg:flex-col lg:gap-4 lg:pt-5">
          <div
            className="shrink-0 rounded-panel p-1.5 lg:p-2"
            style={{
              background: 'linear-gradient(180deg,#2a2218,#1b160f)',
              border: '1px solid #5e4d2b',
              boxShadow: 'inset 0 2px 12px rgba(0,0,0,.55)',
            }}
          >
            <PortraitButton className="h-12 w-10 lg:h-48 lg:w-40" />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-full lg:flex-none lg:flex-col lg:gap-2">
            <div className="min-w-0 lg:text-center">
              <p
                data-panel-date
                className="truncate font-title text-[15px] font-bold text-parchment lg:text-lg"
              >
                즉위 {game.date.year}년 {monthLabel(game.date.month)}
              </p>
              {/* 20세를 넘겨 잠긴 상태에서는 본문과 어긋나지 않게 끝점 나이로 고정 */}
              <p data-panel-age className="text-xs text-muted">
                {resolveText('{왕}', game)}{' '}
                {game.phase === 'ended' ? GAME_CONFIG.endAge : game.age}세
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:mt-1 lg:w-full lg:justify-center">
              <button
                onClick={openSettings}
                aria-label="설정"
                data-settings-button
                className="flex h-7 w-7 items-center justify-center rounded-full border text-sm text-muted"
                style={{ borderColor: 'rgba(212,176,106,.2)' }}
              >
                ⚙
              </button>
              <button
                onClick={openHelp}
                aria-label="도움말"
                data-help-button
                className="flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold text-muted"
                style={{ borderColor: 'rgba(212,176,106,.2)' }}
              >
                ?
              </button>
              <Button
                className="px-3 lg:hidden"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? '닫기' : '상세'}
              </Button>
            </div>
          </div>
        </div>

        {/* 행동력 — 마름모 핍. 수치도 함께 두는 유일한 예외(자원이 아니라 '칸 수'라서) */}
        <div className="px-4 pb-3 lg:px-5">
          <div
            data-onboard="ap"
            data-gauge="actionPoints"
            data-value={ap}
            className="rounded-panel border px-4 py-3 text-center"
            style={{ borderColor: 'rgba(212,176,106,.15)', background: 'rgba(255,255,255,.02)' }}
          >
            <p className="font-display text-[10px] uppercase text-muted" style={{ letterSpacing: '.24em' }}>
              Action Points
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {Array.from({ length: apMax }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="h-3 w-3 rotate-45"
                  style={
                    i < ap
                      ? { background: 'linear-gradient(135deg,#F7D791,#b8842e)' }
                      : { border: '1px solid rgba(212,176,106,.35)', opacity: 0.55 }
                  }
                />
              ))}
            </div>
            <p className="sr-only">
              행동력 {ap} / {apMax}
            </p>
          </div>
        </div>

        {/* 경고는 접혀 있어도 보인다 */}
        {notices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 lg:px-5">
            {notices.map(([key, text]) => (
              <span
                key={key}
                data-warning={key}
                className="rounded-full px-2.5 py-1 text-[11px]"
                style={{ background: 'rgba(192,90,90,.16)', color: 'var(--color-peril-soft)' }}
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* 상세: 폰에선 접힘, PC(lg)에선 항상 펼침 */}
        <div
          className={`${open ? 'block' : 'hidden'} max-h-[60vh] overflow-y-auto px-4 pb-5 lg:block lg:max-h-none lg:px-5`}
        >
          <SectionHead className="mb-3.5">Primary Attributes</SectionHead>
          <div className="flex flex-col gap-3">
            {STAT_KEYS.map((key) => (
              <Gauge key={key} view={statGauge(key, game)} />
            ))}
          </div>

          <SectionHead className="mb-3.5 mt-6">Kingdom Status</SectionHead>
          <div data-onboard="gauges" className="flex flex-col gap-3">
            <Gauge view={resourceGauge('courtInfluence', game, courtInfluenceCap(game.age))} />
            <Gauge view={resourceGauge('wellbeing', game)} />
            <Gauge view={resourceGauge('tutorTrust', game)} />
          </div>

          <SectionHead tone="peril" className="mb-3.5 mt-6">
            Regency
          </SectionHead>
          <div className="flex flex-col gap-3">
            <Gauge view={resourceGauge('regentRapport', game)} />
            <Gauge view={resourceGauge('regentSuspicion', game)} />
          </div>
          {/*
            ★ 표시 정책을 정확히 적는다 (실플레이 피드백 #5).
              활동 카드는 예상 변화를 주고(HIDDEN_GAUGES 미적용), 사건 선택지는 가린다(적용).
          */}
          <p className="mt-2.5 text-[10.5px] italic leading-relaxed text-faint">
            활동 카드에는 예상 변화가 보이지만, 사건 선택지에서는 이 두 지표의 변화가 미리
            표시되지 않습니다.
          </p>

          {/* 상세(내부값) — 화면에서 유일하게 정확한 수치가 나오는 자리 */}
          <details
            data-detail-values
            className="mt-5 rounded-panel border p-3"
            style={{ borderColor: 'rgba(212,176,106,.14)', background: 'rgba(0,0,0,.22)' }}
          >
            <summary className="cursor-pointer select-none text-[11px] text-muted">
              상세 (내부값)
            </summary>
            <div className="mt-2.5 space-y-1">
              {STAT_KEYS.map((key) => (
                <div key={key} className="flex justify-between text-[11px]">
                  <span className="text-muted">{STAT_META[key].label}</span>
                  <span className="font-display tabular-nums text-parchment/80">
                    {game.stats[key].toFixed(2)}
                  </span>
                </div>
              ))}
              {(
                [
                  ['국정 영향도', game.courtInfluence],
                  ['심신', game.wellbeing],
                  ['신뢰', game.tutorTrust],
                  ['섭정 신망', game.regentRapport],
                  ['섭정 의심', game.regentSuspicion],
                  ['내구도', game.durability],
                ] as const
              ).map(([label, v]) => (
                <div
                  key={label}
                  className="flex justify-between border-t pt-1 text-[11px]"
                  style={{ borderColor: 'rgba(212,176,106,.1)' }}
                >
                  <span className="text-muted">{label}</span>
                  <span className="font-display tabular-nums text-parchment/80">
                    {v.toFixed(label === '내구도' ? 1 : 2)}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <SectionHead className="mb-3 mt-6">Quick Actions</SectionHead>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={save}>저장</Button>
            <Button onClick={load}>불러오기</Button>
            <Button variant="danger" className="col-span-2" onClick={reset}>
              처음부터
            </Button>
            <Button className="col-span-2" onClick={() => setRomanceOpen(true)}>
              인연
            </Button>
          </div>

          {/* 군주와의 대화 — 키가 있고 이벤트 씬이 아닐 때만 */}
          {aiEnabled && (
            <>
              <Button
                variant="primary"
                className="mt-2 w-full"
                disabled={locked}
                onClick={() => openTalk({ kind: 'monarch' })}
              >
                {resolveText('{왕}', game)}과 대화하기
              </Button>
              {locked && (
                <p className="mt-1 text-[11px] text-faint">지금은 다른 일이 벌어지는 중입니다.</p>
              )}
            </>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
            <Lozenge size={4} dim />
            {savedAt
              ? `마지막 저장: ${new Date(savedAt).toLocaleString('ko-KR')}`
              : '저장된 기록 없음'}
          </p>
        </div>
      </div>

      {romanceOpen && <RomancePanel onClose={() => setRomanceOpen(false)} />}
    </aside>
  )
}
