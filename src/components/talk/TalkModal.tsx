import { useEffect, useRef, useState } from 'react'
import { SEASON_LABEL } from '../../data/config'
import { RESOURCE_META } from '../../data/stats'
import { resolveOutfit } from '../../systems/outfits'
import { useGame } from '../../store/gameStore'
import { CALL_SOFT_LIMIT, useTalk } from '../../store/talkStore'
import { Button } from '../ui/Button'

/** 군주와의 자유 대화 (M2b-2). 게임 상태를 진행시키지 않으므로 오버레이로 둔다. */
export function TalkModal() {
  const open = useTalk((s) => s.open)
  const close = useTalk((s) => s.closeTalk)
  const turns = useTalk((s) => s.turns)
  const streaming = useTalk((s) => s.streaming)
  const busy = useTalk((s) => s.busy)
  const error = useTalk((s) => s.error)
  const callCount = useTalk((s) => s.callCount)
  const ask = useTalk((s) => s.ask)
  const retry = useTalk((s) => s.retry)
  const skip = useTalk((s) => s.skipStreaming)

  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)
  const [draft, setDraft] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
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
  }, [open, close])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [turns, streaming])

  if (!open) return null

  const outfit = resolveOutfit(manifest, game.currentOutfitId)

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
      aria-label="군주와의 대화"
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리 */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <img
            src={outfit.thumbSrc}
            alt=""
            draggable={false}
            className="h-11 w-9 shrink-0 rounded object-cover object-top"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-200">왕과의 대화</p>
            <p className="text-xs text-slate-400">
              즉위 {game.date.year}년 {SEASON_LABEL[game.date.season]} · 왕 {game.age}세
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

        {/* 대화 로그 */}
        <div
          ref={logRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          onClick={() => streaming !== null && skip()}
        >
          {turns.length === 0 && streaming === null && !error && (
            <p className="py-8 text-center text-sm text-slate-500">
              무엇이든 물어보세요. 왕은 지금까지 자란 대로 답합니다.
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
                    {turn.deltas.map((d) => (
                      <span
                        key={d.target}
                        className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
                          d.amount > 0
                            ? 'bg-slate-800 text-emerald-300'
                            : 'bg-slate-800 text-rose-300'
                        }`}
                      >
                        {RESOURCE_META[d.target as 'tutorTrust' | 'wellbeing'].label}{' '}
                        {d.amount > 0 ? '+' : ''}
                        {d.amount}
                      </span>
                    ))}
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
              placeholder={busy ? '왕이 생각하고 있습니다…' : '무엇을 물어볼까요'}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 disabled:opacity-60"
            />
            <Button variant="primary" className="px-4" onClick={submit} disabled={busy || !draft.trim()}>
              보내기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
