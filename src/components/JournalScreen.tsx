import { Rule } from './ui/Chrome'
import {
  MYSTERY_THEMES, mysteryDanger, mysteryEntriesByTheme, mysteryHints,
} from '../data/mystery'
import { standingMood, tideHasTurned, tideSignals, TIDE_MIN } from '../systems/rebellion'
import { useGame } from '../store/gameStore'

/** ★ [3] 조정의 형세 — 숨은 권세 + 담판 판세를 수치 없이 질적으로. 연회에서 보고, 여기서 확인한다. */
const FORMATION: Record<'low' | 'mid' | 'high', string> = {
  low: '조정은 아직 섭정공의 것이다. 어전에서 왕 편에 설 사람이 드물다.',
  mid: '조정이 갈리기 시작했다. 왕과 섭정공 사이에서 저울이 흔들린다.',
  high: '조정은 왕에게 기울었다. 섭정공 곁이 눈에 띄게 헐겁다.',
}

/**
 * 「기록」 화면 — 미스터리 가시성 (완주 피드백 2, 2-a).
 *
 * ★ 지금까지 모은 단서·알아낸 진실을 3축으로 보여준다. **얻은 것만** 뜨고(못 얻은 건
 *   존재조차 안 보인다), 방향 힌트("남은 의문")가 수치 없이 다음을 가리킨다.
 *   발각 후엔 "위험" 항목이 뜬다 — 예전엔 1~9년 뒤 엔딩에서야 이름이 붙던 것을 여기서.
 */
export function JournalScreen({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)
  const hints = mysteryHints(game)
  const danger = mysteryDanger(game)
  const themes = MYSTERY_THEMES.map((t) => ({ theme: t, entries: mysteryEntriesByTheme(game, t) }))
    .filter((t) => t.entries.length > 0)
  // ★ [3] 조정의 형세 — 14세부터(사교가 시작되고 권세가 지렛대가 되는 나이). 담판 전이면 판세 힌트도.
  const showFormation = game.age >= 14 && game.flags.regent_retired !== true
  const formationLine = FORMATION[standingMood(game)]
  const tideHint = tideHasTurned(game)
    ? '판이 기울었다 — 섭정공을 협상으로 물러나게 할 자리가 열릴 것이다.'
    : game.flags.declared_rule !== true
      ? `아직 판이 덜 기울었다 — 하원·민심·신망·궁정의 지지 중 ${TIDE_MIN}가지가 갖춰져야 담판이 성사된다. (지금 ${tideSignals(game)})`
      : null
  const empty = themes.length === 0 && hints.length === 0 && !danger && !showFormation

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="기록"
    >
      <div
        data-screen="journal"
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-ink-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-title text-lg font-semibold text-parchment">기록</h1>
            <p className="mt-1 text-xs text-muted">
              지금까지 알아낸 것. 흩어진 단서가 하나로 꿰이면 진실이 드러난다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-parchment active:bg-ink-800"
          >
            ✕
          </button>
        </div>

        <Rule />

        {empty && (
          <p className="mt-6 text-center text-[13px] leading-relaxed text-faint">
            아직 기록할 것이 없다.<br />
            궁의 일들을 살피다 보면 무언가 걸릴지도 모른다.
          </p>
        )}

        {/* ── 위험 (발각 후) — 맨 위에, peril 색으로 ── */}
        {danger && (
          <div
            data-journal-danger
            className="mt-4 rounded-xl border border-peril/50 bg-peril/10 p-3.5"
          >
            <p className="text-[11px] font-medium tracking-wide text-peril-soft">위험</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-peril-soft/90">{danger}</p>
          </div>
        )}

        {/* ── ★ [3] 조정의 형세 (권세·판세, 수치 없음) ── */}
        {showFormation && (
          <section data-journal-formation className="mt-4 rounded-xl border border-line bg-ink-900/50 p-3.5">
            <p className="text-[11px] font-medium tracking-wide text-gold-300">조정의 형세</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-parchment/80">{formationLine}</p>
            {tideHint && <p className="mt-2 text-[12px] leading-relaxed text-muted">{tideHint}</p>}
          </section>
        )}

        {/* ── 3축 단서·진실 (얻은 것만) ── */}
        {themes.map(({ theme, entries }) => (
          <section key={theme} data-journal-theme={theme} className="mt-5">
            <h2 className="font-title text-sm font-semibold text-gold-300">{theme}</h2>
            <ul className="mt-2 space-y-2">
              {entries.map((e) => (
                <li
                  key={e.flag}
                  data-journal-entry={e.flag}
                  className={`rounded-xl border p-3 ${
                    e.kind === 'truth'
                      ? 'border-line-gold/60 bg-ink-700/20'
                      : 'border-line bg-ink-900/50'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-parchment">
                    {e.kind === 'truth' && <span className="text-[10px] text-gold-400">진실</span>}
                    {e.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{e.learned}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* ── 남은 의문 (방향 힌트, 수치 없음) ── */}
        {hints.length > 0 && (
          <section data-journal-hints className="mt-5">
            <h2 className="font-title text-sm font-semibold text-parchment">남은 의문</h2>
            <ul className="mt-2 space-y-1.5">
              {hints.map((h, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-parchment/75">
                  <span aria-hidden className="text-gold-400">—</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
