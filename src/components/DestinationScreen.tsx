import { PLACES } from '../data/places'
import { canVisit, outingsPerMonth } from '../systems/visit'
import { useGame } from '../store/gameStore'
import { Rule } from './ui/Chrome'

/**
 * 「이번 달, 어디로」 목적지 피커 (2-b-1).
 *
 * ★ 네비게이션 전용 — 서고/정원/연무장/왕대비궁, 그리고 궁 밖(순찰·잠행)이 한 층에 선다.
 *   AP 를 쓰지 않고, 이번 달에 한 번(outingsPerMonth). 고르면 그 장소 이벤트가 즉시 발동한다.
 * ★ 나중에 이 컴포넌트만 클릭 맵으로 교체할 수 있게 구조를 열어 둔다(카드 → 지도 노드).
 */
export function DestinationScreen({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)
  const visitDestination = useGame((s) => s.visitDestination)

  const go = (placeId: string) => {
    visitDestination(placeId as never)
    onClose() // 방문이 phase 를 'event' 로 옮긴다 — 피커는 닫는다.
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="이번 달, 어디로"
    >
      <div
        data-screen="destination"
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line-gold/60 bg-ink-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-title text-lg font-semibold text-parchment">이번 달, 어디로</h1>
            <p className="mt-1 text-xs text-muted">
              행동력을 쓰지 않고 한 곳을 다녀옵니다. 궁 안이든, 담 밖이든, 오늘은 누가 있을까요.
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

        <ul className="mt-3 space-y-2.5">
          {PLACES.map((place) => {
            const ageLocked = place.minAge != null && game.age < place.minAge
            const isOuting = place.kind === 'outing-legal' || place.kind === 'outing-sneak'
            // ★ [5] 궁 밖은 이 달에 이미 나갔으면 잠긴다(월 1회). 궁 안은 늘 열림(자유).
            const outingUsed = isOuting && !ageLocked && !canVisit(game, place.id)
            const locked = ageLocked || outingUsed
            return (
              <li key={place.id}>
                <button
                  data-destination={place.id}
                  data-destination-locked={locked ? 'true' : 'false'}
                  disabled={locked}
                  onClick={() => go(place.id)}
                  className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                    locked
                      ? 'border-line bg-ink-900/40 opacity-50'
                      : 'border-line-gold/40 bg-ink-900/60 active:border-line-gold active:bg-ink-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-gold-400">◈</span>
                    <span className="font-title text-[15px] font-semibold text-parchment">
                      {place.label}
                    </span>
                    {ageLocked && (
                      <span className="ml-auto text-[11px] text-faint">
                        {place.minAge}세부터
                      </span>
                    )}
                    {outingUsed && (
                      <span className="ml-auto text-[11px] text-faint">이 달엔 이미 나감</span>
                    )}
                  </div>
                  <p className="mt-1 pl-6 text-[12.5px] leading-relaxed text-muted">{place.hint}</p>
                </button>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
          궁 안은 하루에도 여러 곳을 돌 수 있습니다. 담 밖 나들이는 이 달에 {outingsPerMonth(game)}회, 
          들킬 위험이 따릅니다. (같은 사람은 그 달에 한 번만 마주칩니다.)
        </p>
      </div>
    </div>
  )
}
