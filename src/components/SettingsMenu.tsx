import { useState } from 'react'
import { clearReadlog } from '../systems/readlog'
import { TEXT_SPEEDS, useOptions } from '../store/optionsStore'
import { useApp } from '../store/appStore'
import { useAiEnabled } from '../store/aiStore'

/**
 * 설정 메뉴 (D-1 → D-3 확장).
 *
 * 도움말 / 텍스트 속도 / AI 설정(게임 화면에서 이동) / 읽음 기록 초기화 / 사운드(자리).
 * 타이틀 '설정' 버튼과, (게임 중에도) 필요 시 여기로 모은다.
 */
export function SettingsMenu() {
  const close = useApp((s) => s.closeSettings)
  const openHelp = useApp((s) => s.openHelp)
  const openAiSettings = useApp((s) => s.openAiSettings)
  const textSpeed = useOptions((s) => s.textSpeed)
  const setTextSpeed = useOptions((s) => s.setTextSpeed)
  const aiEnabled = useAiEnabled()
  const [readCleared, setReadCleared] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-sm font-semibold tracking-wide text-gold-300">설정</h2>
          <button
            onClick={close}
            aria-label="설정 닫기"
            className="text-xs text-muted active:text-parchment"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <button
            onClick={openHelp}
            className="min-h-[46px] w-full rounded-xl border border-line-gold/60 bg-ink-700/40 text-sm tracking-widest text-gold-300 active:bg-ink-700/50"
          >
            도움말
          </button>

          {/* 텍스트 속도 */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted">텍스트 속도</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTextSpeed(s)}
                  aria-pressed={textSpeed === s}
                  className={`min-h-[40px] rounded-lg border text-xs transition-colors ${
                    textSpeed === s
                      ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
                      : 'border-line bg-ink-800/60 text-parchment active:bg-ink-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* AI 설정 — 게임 화면에서 이곳으로 이동 */}
          <button
            onClick={openAiSettings}
            className="min-h-[44px] w-full rounded-xl border border-line bg-ink-800/60 text-sm text-parchment active:bg-ink-700"
          >
            AI 설정 · {aiEnabled ? '켜짐' : '꺼짐'}
          </button>

          {/* 읽음 기록 초기화 — 스킵 대상 리셋 */}
          <button
            onClick={() => {
              clearReadlog()
              setReadCleared(true)
            }}
            className="min-h-[44px] w-full rounded-xl border border-line bg-ink-900/60 text-xs text-muted active:bg-ink-800"
          >
            {readCleared ? '읽음 기록을 지웠습니다' : '읽음 기록 초기화 (스킵 대상 리셋)'}
          </button>

          {/* 사운드 — 자리만. 나중에 저작권 프리 음악 배선. */}
          <div className="flex items-center justify-between rounded-xl border border-line/60 bg-ink-900/30 px-3.5 py-3">
            <span className="text-xs text-muted">사운드</span>
            <span className="text-[11px] text-faint">준비 중</span>
          </div>
        </div>
      </div>
    </div>
  )
}
