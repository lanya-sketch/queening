import { useEffect, useState } from 'react'
import { ONBOARDING } from '../data/onboarding'
import { resolveText } from '../systems/text'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'

/**
 * 온보딩 오버레이 (D-1).
 *
 * 선왕을 모셨던 노귀족의 대사를 한 줄씩. 게임 화면(스탯 패널·스케줄)이 뒤에 보이고,
 * 대사에 툴팁이 달리면 그 UI 요소에 하이라이트를 얹는다 — 서사가 "왜"를, 툴팁이 "어디"를.
 *
 * 스킵 가능(재플레이용). 스킵/완료 시 온보딩만 닫히고 1년차 플레이가 그대로 진행된다.
 */
export function OnboardingOverlay() {
  const game = useGame((s) => s.game)
  const dismiss = useApp((s) => s.dismissOnboarding)
  const [index, setIndex] = useState(0)

  const line = ONBOARDING[index]
  const atEnd = index >= ONBOARDING.length - 1

  // 툴팁 대상에 하이라이트 링을 얹는다(픽셀 계산 대신 data 속성 + 클래스 토글).
  useEffect(() => {
    const target = line?.tip?.target
    if (!target) return
    const el = document.querySelector<HTMLElement>(`[data-onboard="${target}"]`)
    if (!el) return
    el.classList.add('onboard-highlight')
    // 상세 패널이 접혀 있으면 게이지가 안 보이므로, 보이게 스크롤한다.
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return () => el.classList.remove('onboard-highlight')
  }, [line])

  if (!line) return null

  const advance = () => (atEnd ? dismiss() : setIndex((i) => i + 1))

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/*
        위쪽은 게임 화면이 비치도록 살짝만 어둡게 — 툴팁이 가리키는 UI 가 보여야 한다.
        탭하면 진행하는 편의 영역이지만, 접근 가능한 컨트롤은 아래 "다음" 버튼이다
        (role/aria 를 두면 그 버튼과 중복된다).
      */}
      <div className="flex-1 bg-slate-950/30" onClick={advance} />

      {/* 대사 상자 */}
      <div className="border-t border-amber-900/50 bg-slate-950/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            {line.speaker && (
              <p className="text-xs font-medium text-amber-300">{line.speaker}</p>
            )}
            <button
              onClick={dismiss}
              className="ml-auto text-[11px] text-slate-500 active:text-slate-300"
            >
              건너뛰기
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {resolveText(line.text, game).split('\n').map((part, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-100">
                {part}
              </p>
            ))}
          </div>

          {line.tip && (
            <p className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
              {line.tip.text}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] tabular-nums text-slate-600">
              {index + 1} / {ONBOARDING.length}
            </span>
            <Button variant="primary" className="px-6" onClick={advance}>
              {atEnd ? '시작한다' : '다음'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
