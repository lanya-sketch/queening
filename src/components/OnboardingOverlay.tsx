import { useLayoutEffect, useRef, useState } from 'react'
import { ONBOARDING } from '../data/onboarding'
import { resolveText } from '../systems/text'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'

/**
 * 온보딩 오버레이 (D-1 마무리 — 하단 팝업 → 말풍선).
 *
 * ★ 예전엔 하단 대사 바가 활동 목록을 통째로 가려, AP 를 설명하는데 그 AP 요소가
 *   안 보였다. 이제:
 *     · UI 를 가리키는 줄  → 그 요소(data-onboard) **바로 옆 말풍선** + 하이라이트 링.
 *       요소의 getBoundingClientRect 로 공간이 넉넉한 쪽(우/좌/하/상)에 붙이고,
 *       화면 밖으로 나가지 않게 클램프한다(375px 대응).
 *     · UI 타깃이 없는 순수 서사 → 화면 **중앙 하단 카드**(가릴 요소가 없다).
 *
 * 서사가 "왜"를, 말풍선이 "어디"를 맡는 구조는 그대로. 스킵 가능(재플레이용).
 */

type Placement = 'right' | 'left' | 'top' | 'bottom'
interface BubblePos {
  top: number
  left: number
  place: Placement
  /** 화살표가 요소를 가리키도록 하는 교차축 오프셋(말풍선 기준 px). */
  arrow: number
}

const GAP = 12
const MARGIN = 12

export function OnboardingOverlay() {
  const game = useGame((s) => s.game)
  const dismiss = useApp((s) => s.dismissOnboarding)
  const [index, setIndex] = useState(0)

  const line = ONBOARDING[index]
  const atEnd = index >= ONBOARDING.length - 1
  const target = line?.tip?.target ?? null

  const bubbleRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<BubblePos | null>(null)

  // 1) 타깃 요소를 찾아 하이라이트하고, 위치(rect)를 잡는다. resize/scroll 에 따라 갱신.
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

  // 2) rect 와 말풍선 크기가 정해지면, 공간이 넉넉한 쪽에 붙이고 클램프한다.
  useLayoutEffect(() => {
    if (!rect || !bubbleRef.current) return
    const b = bubbleRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    let place: Placement
    if (vw - rect.right >= b.width + GAP) place = 'right'
    else if (rect.left >= b.width + GAP) place = 'left'
    else if (vh - rect.bottom >= b.height + GAP) place = 'bottom'
    else place = 'top'

    let top: number
    let left: number
    if (place === 'right' || place === 'left') {
      left = place === 'right' ? rect.right + GAP : rect.left - GAP - b.width
      top = cy - b.height / 2
    } else {
      top = place === 'bottom' ? rect.bottom + GAP : rect.top - GAP - b.height
      left = cx - b.width / 2
    }
    left = Math.max(MARGIN, Math.min(left, vw - b.width - MARGIN))
    top = Math.max(MARGIN, Math.min(top, vh - b.height - MARGIN))

    // 화살표: 요소 중심을 향하도록 교차축에서의 오프셋.
    const arrow =
      place === 'right' || place === 'left'
        ? Math.max(12, Math.min(cy - top, b.height - 12))
        : Math.max(16, Math.min(cx - left, b.width - 16))

    setPos({ top, left, place, arrow })
  }, [rect, index])

  if (!line) return null
  const advance = () => (atEnd ? dismiss() : setIndex((i) => i + 1))

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {line.speaker && <p className="text-xs font-medium text-gold-400">{line.speaker}</p>}
        <button
          onClick={dismiss}
          className="ml-auto text-[11px] text-muted active:text-parchment"
        >
          건너뛰기
        </button>
      </div>
      <div className="mt-2 space-y-1.5">
        {resolveText(line.text, game)
          .split('\n')
          .map((part, i) => (
            <p key={i} className="text-sm leading-relaxed text-parchment">
              {part}
            </p>
          ))}
      </div>
      {line.tip && (
        <p className="mt-2.5 rounded-lg border border-line-gold/50 bg-ink-700/40 px-3 py-2 text-[11px] leading-relaxed text-gold-300/90">
          {line.tip.text}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] tabular-nums text-faint">
          {index + 1} / {ONBOARDING.length}
        </span>
        <Button variant="primary" className="px-6" onClick={advance}>
          {atEnd ? '시작한다' : '다음'}
        </Button>
      </div>
    </>
  )

  // ── 타깃 없는 순수 서사 → 중앙 하단 카드.
  if (!target) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col justify-end">
        <div className="flex-1 bg-ink-950/30" onClick={advance} />
        <div className="border-t border-line-gold/50 bg-ink-950/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">{body}</div>
        </div>
      </div>
    )
  }

  // ── 타깃 있는 줄 → 요소 옆 말풍선. 배경은 살짝만 어둡게(요소가 보여야 한다).
  // 말풍선이 붙은 쪽의 반대 모서리에 화살촉을 둔다(교차축 위치는 인라인 style).
  const arrowStyle: Record<Placement, string> = {
    right: 'left-[-5px] border-l border-b',
    left: 'right-[-5px] border-r border-t',
    top: 'bottom-[-5px] border-r border-b',
    bottom: 'top-[-5px] border-l border-t',
  }
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-950/25" onClick={advance} />
      <div
        ref={bubbleRef}
        className="absolute w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-line-gold/60 bg-ink-950/97 p-3.5 shadow-2xl backdrop-blur"
        style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
      >
        {pos && (
          <span
            className={`absolute h-2.5 w-2.5 rotate-45 border-line-gold/60 bg-ink-950 ${arrowStyle[pos.place]}`}
            style={
              pos.place === 'right' || pos.place === 'left'
                ? ({ top: pos.arrow, marginTop: -5 } as React.CSSProperties)
                : ({ left: pos.arrow, marginLeft: -5 } as React.CSSProperties)
            }
          />
        )}
        {body}
      </div>
    </div>
  )
}
