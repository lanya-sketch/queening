import { HELP } from '../data/help'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'

/**
 * 도움말 화면 (D-1 마무리).
 *
 * ★ 상시 참조 오버레이. 타이틀 설정 메뉴와 게임 중 '?' 버튼 양쪽에서 연다.
 *   내용은 data/help.ts(“~입니다” 톤), 성별 토큰은 여기서 치환한다.
 */
export function HelpScreen({ onClose }: { onClose: () => void }) {
  // 게임 중이 아니어도(타이틀에서 열면) 토큰은 기본 상태로 치환된다.
  const game = useGame((s) => s.game)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/97 backdrop-blur">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h1 className="text-base font-semibold tracking-wide text-amber-100">도움말</h1>
        <button
          onClick={onClose}
          aria-label="도움말 닫기"
          className="rounded-lg px-3 py-1 text-sm text-slate-400 active:text-slate-100"
        >
          닫기
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-7">
          {HELP.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold tracking-wide text-amber-200/90">
                {section.title}
              </h2>
              {section.intro && (
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {resolveText(section.intro, game)}
                </p>
              )}
              <dl className="mt-3 space-y-3">
                {section.entries.map((entry) => (
                  <div
                    key={entry.term}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-3"
                  >
                    <dt className="text-sm font-medium text-slate-100">{entry.term}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-slate-300">
                      {resolveText(entry.body, game)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>

      <footer className="border-t border-slate-800 p-3">
        <div className="mx-auto max-w-2xl">
          <Button variant="primary" className="w-full" onClick={onClose}>
            닫는다
          </Button>
        </div>
      </footer>
    </div>
  )
}
