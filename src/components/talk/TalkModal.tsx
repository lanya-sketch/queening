import { useEffect, useRef, useState } from 'react'
import { SEASON_LABEL } from '../../data/config'
import { RESOURCE_META } from '../../data/stats'
import { CHARACTER_BY_ID } from '../../data/characters'
import { resolveOutfit } from '../../systems/outfits'
import { resolveText } from '../../systems/text'
import { useGame } from '../../store/gameStore'
import { CALL_SOFT_LIMIT, targetInfo, targetKey, useTalk } from '../../store/talkStore'
import { Button } from '../ui/Button'

/**
 * 대화 화면 (M2b-2 군주 → M2b-3b-2 대상 중립).
 * 대상만 바뀌고 스트리밍·폴백·비용 가드는 전부 공유 경로다.
 */
export function TalkModal() {
  const target = useTalk((s) => s.target)
  const close = useTalk((s) => s.closeTalk)
  const logs = useTalk((s) => s.logs)
  const streaming = useTalk((s) => s.streaming)
  const busy = useTalk((s) => s.busy)
  const error = useTalk((s) => s.error)
  const callCount = useTalk((s) => s.callCount)
  const helpSeen = useTalk((s) => s.helpSeen)
  const dismissHelp = useTalk((s) => s.dismissHelp)
  const ask = useTalk((s) => s.ask)
  const retry = useTalk((s) => s.retry)
  const skip = useTalk((s) => s.skipStreaming)

  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)
  const [draft, setDraft] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [target, close])

  const turns = target ? (logs[targetKey(target)] ?? []) : []

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [turns.length, streaming])

  if (!target) return null

  const info = targetInfo(target)
  const isMonarch = target.kind === 'monarch'
  // 군주는 현재 착장 초상을, 연애 대상은 캐릭터 초상을 쓴다.
  const portraitSrc = isMonarch
    ? resolveOutfit(manifest, game.currentOutfitId).thumbSrc
    : info.portrait
  const affectionLabel =
    !isMonarch && CHARACTER_BY_ID[target.charId]
      ? `${resolveText(CHARACTER_BY_ID[target.charId].name, game)} 호감도`
      : null

  const submit = () => {
    const text = draft
    setDraft('')
    void ask(text)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="대화"
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리 */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          {portraitSrc && (
            <img
              src={portraitSrc}
              alt=""
              draggable={false}
              className="h-11 w-9 shrink-0 rounded object-cover object-top"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-amber-200">
              {isMonarch ? `${info.name}과의 대화` : info.name}
            </p>
            <p className="text-xs text-slate-400">
              즉위 {game.date.year}년 {SEASON_LABEL[game.date.season]} · {resolveText('{왕}', game)}{' '}
              {game.age}세
            </p>
          </div>
          <button
            onClick={close}
            aria-label="닫기"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* 첫 진입 도움말 — 1회만 */}
        {!helpSeen && (
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-slate-300">
              무엇이든 물어보거나 말을 걸어 보세요. 상대는 지금까지의 관계와 겪은 일에 따라
              다르게 답합니다. 말이 상대에게 가 닿으면 호감도나 심신이 조금씩 움직이고, 그
              변화는 대사 아래에 표시됩니다.
            </p>
            <Button className="mt-2 px-3" onClick={dismissHelp}>
              알겠습니다
            </Button>
          </div>
        )}

        {/* 대화 로그 */}
        <div
          ref={logRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          onClick={() => streaming !== null && skip()}
        >
          {/* 캐릭터별 맥락 프레이밍 */}
          {info.framing && (
            <p className="border-l-2 border-slate-700 pl-3 text-xs italic leading-relaxed text-slate-500">
              {info.framing}
            </p>
          )}

          {turns.length === 0 && streaming === null && !error && (
            <p className="py-6 text-center text-sm text-slate-500">
              {isMonarch
                ? `무엇이든 물어보세요. ${info.name}은 지금까지 자란 대로 답합니다.`
                : '먼저 말을 걸어 보세요.'}
            </p>
          )}

          {turns.map((turn, i) => (
            <div key={i} className={turn.role === 'user' ? 'text-right' : ''}>
              <div
                className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-left text-sm leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-slate-800 text-slate-100'
                    : 'border border-amber-900/50 bg-slate-900/60 text-slate-200'
                }`}
              >
                {turn.content.split('\n').map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
                {turn.deltas && turn.deltas.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1">
                    {turn.deltas.map((d) => {
                      const label = String(d.target).startsWith('affection:')
                        ? (affectionLabel ?? '호감도')
                        : RESOURCE_META[d.target as 'tutorTrust' | 'wellbeing'].label
                      return (
                        <span
                          key={String(d.target)}
                          className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
                            d.amount > 0
                              ? 'bg-slate-800 text-emerald-300'
                              : 'bg-slate-800 text-rose-300'
                          }`}
                        >
                          {label} {d.amount > 0 ? '+' : ''}
                          {d.amount}
                        </span>
                      )
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}

          {streaming !== null && (
            <div>
              <div className="inline-block max-w-[85%] rounded-xl border border-amber-900/50 bg-slate-900/60 px-3 py-2 text-sm leading-relaxed text-slate-200">
                {streaming || <span className="text-slate-500">…</span>}
                {busy && <span className="ml-0.5 animate-pulse text-amber-400">▌</span>}
              </div>
              {busy && (
                <p className="mt-1 text-[11px] text-slate-600">탭하면 바로 다 보입니다</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-3">
              <p className="text-sm text-red-200">{error.message}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button className="px-3" onClick={() => void retry()}>
                  다시 시도
                </Button>
                <button
                  onClick={() => setDetailOpen((v) => !v)}
                  className="min-h-[44px] px-2 text-[11px] text-slate-500 active:text-slate-300"
                >
                  자세히
                </button>
              </div>
              {detailOpen && (
                <p className="mt-2 break-all font-mono text-[10px] text-slate-500">
                  {error.detail}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 입력 */}
        <div className="border-t border-slate-800 p-3">
          {callCount >= CALL_SOFT_LIMIT && (
            <p className="mb-2 text-[11px] text-amber-400">
              이번 세션에서 {callCount}번 호출했습니다. 비용이 쌓이고 있으니 확인해 주세요.
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              disabled={busy}
              placeholder={busy ? '생각하고 있습니다…' : '무엇을 말할까요'}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 disabled:opacity-60"
            />
            <Button
              variant="primary"
              className="px-4"
              onClick={submit}
              disabled={busy || !draft.trim()}
            >
              보내기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
