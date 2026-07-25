import { useLayoutEffect, useRef, useState } from 'react'
import { COACH } from '../data/coach'
import { resolveText } from '../systems/text'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'

/**
 * 시점별 안내 말풍선 (실플레이 피드백: 묻힌 기능을 필요한 시점에 알린다).
 *
 * ★ 온보딩(OnboardingOverlay)과 같은 훅·같은 하이라이트 링을 쓰되, 한 줄짜리 단발이다.
 *   가리킬 요소(data-onboard) 옆에 붙고, 공간이 없으면 화면에 클램프한다(375px 대응).
 *   각 안내는 store 의 coachSeen 으로 한 번만 뜬다.
 */
const GAP = 12
const MARGIN = 12

export function CoachMark() {
  const coach = useApp((s) => s.coach)
  const dismiss = useApp((s) => s.dismissCoach)
  const game = useGame((s) => s.game)

  const line = coach ? COACH[coach] : null
  const target = line?.target ?? null

  const bubbleRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    setPos(null)
    if (!target) {
      setRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-onboard="${target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    el.classList.add('onboard-highlight')
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      el.classList.remove('onboard-highlight')
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [target])

  // 말풍선을 타깃 아래(또는 공간이 없으면 위)에 두고 화면 안으로 클램프한다.
  useLayoutEffect(() => {
    if (!rect || !bubbleRef.current) return
    const b = bubbleRef.current.getBoundingClientRect()
    const below = rect.bottom + GAP
    const above = rect.top - GAP - b.height
    const top = below + b.height + MARGIN <= window.innerHeight ? below : Math.max(MARGIN, above)
    let left = rect.left + rect.width / 2 - b.width / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - b.width - MARGIN))
    setPos({ top, left })
  }, [rect])

  if (!coach || !line) return null

  return (
    /*
     * ★ **화면을 막지 않는다.** 온보딩(튜토리얼)은 진행을 세우지만, 코치마크는
     *   "이런 기능이 있어요" 정도라 게임을 멈추면 안 된다. 컨테이너는 pointer-events-none 이고
     *   말풍선만 auto — 나머지 화면은 그대로 눌린다. 가리키는 요소는 하이라이트 링으로만 표시.
     *   (전체 차단 모달로 두었더니 age≥13 인 검증 스위트 대부분에서 클릭을 가로막았다)
     */
    <div className="pointer-events-none fixed inset-0 z-40" data-coach={coach}>
      <div
        ref={bubbleRef}
        className="pointer-events-auto absolute w-[min(20rem,88vw)] rounded-panel border p-4 shadow-2xl"
        style={{
          top: pos?.top ?? '50%',
          left: pos?.left ?? '50%',
          transform: pos ? undefined : 'translate(-50%,-50%)',
          visibility: rect && !pos ? 'hidden' : 'visible',
          borderColor: 'rgba(212,176,106,.4)',
          background: 'linear-gradient(180deg,#211a2c,#14101c)',
        }}
      >
        <p className="text-[13.5px] leading-relaxed text-parchment/90">
          {resolveText(line.text, game)}
        </p>
        <div className="mt-3 flex justify-end">
          <button
            onClick={dismiss}
            className="rounded-lg border px-4 py-1.5 font-title text-[13px] text-gold-300"
            style={{ borderColor: 'rgba(212,176,106,.4)' }}
          >
            알겠어요
          </button>
        </div>
      </div>
    </div>
  )
}
