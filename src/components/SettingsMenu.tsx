import { useApp } from '../store/appStore'

/**
 * 타이틀 설정 메뉴 (D-1 마무리).
 *
 * ★ 지금은 '도움말' 하나뿐이지만, 향후 음량·기타 설정이 들어올 자리다.
 *   타이틀 '설정' 버튼이 연다.
 */
export function SettingsMenu() {
  const close = useApp((s) => s.closeSettings)
  const openHelp = useApp((s) => s.openHelp)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-amber-100">설정</h2>
          <button
            onClick={close}
            aria-label="설정 닫기"
            className="text-xs text-slate-400 active:text-slate-100"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={openHelp}
            className="min-h-[48px] w-full rounded-xl border border-amber-700/60 bg-amber-950/40 text-sm tracking-widest text-amber-100 active:bg-amber-900/50"
          >
            도움말
          </button>
          <p className="px-1 pt-1 text-[11px] leading-relaxed text-slate-500">
            음량과 그 밖의 설정은 다음에 더해집니다.
          </p>
        </div>
      </div>
    </div>
  )
}
