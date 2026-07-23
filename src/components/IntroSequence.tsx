import { useState } from 'react'
import { INTRO_GENDER, INTRO_LINES } from '../data/intro'
import { SPEED_MS, useOptions } from '../store/optionsStore'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'
import { useTypewriter } from './scene/useTypewriter'

/**
 * 인트로 시퀀스 (D-3).
 *
 * 선왕의 죽음 배경 서사(타이핑 연출) → 군주 성별 선택 → 온보딩. 스킵 가능(재플레이).
 * 게임 화면 위 오버레이. 빈 옥좌 배경톤을 이어받아 어둡게 깐다.
 */
export function IntroSequence() {
  const textSpeed = useOptions((s) => s.textSpeed)
  const dismissIntro = useApp((s) => s.dismissIntro)
  const gender = useGame((s) => s.game.monarchGender)
  const setGender = useGame((s) => s.setMonarchGender)

  const [step, setStep] = useState(0)
  const onGender = step >= INTRO_LINES.length
  const cur = INTRO_LINES[step] ?? ''
  const tw = useTypewriter(cur, onGender ? 0 : SPEED_MS[textSpeed])

  const advance = () => {
    if (!onGender && !tw.done) {
      tw.complete()
      return
    }
    setStep((s) => s + 1)
  }
  // 스킵 → 성별 선택으로 바로. 성별은 여전히 고르게 한다(표기가 갈리므로).
  const skipToGender = () => setStep(INTRO_LINES.length)

  return (
    <div data-screen="intro" className="fixed inset-0 z-40 flex flex-col justify-center bg-ink-950/97 px-6 backdrop-blur">
      <div className="mx-auto w-full max-w-lg">
        {!onGender ? (
          <>
            <div className="min-h-[7rem]">
              {tw.shown.split('\n').map((part, i) => (
                <p key={i} className="text-base leading-relaxed text-parchment">
                  {part}
                </p>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={skipToGender}
                className="text-[11px] text-muted active:text-parchment"
              >
                건너뛰기
              </button>
              <Button variant="primary" className="px-8" onClick={advance}>
                다음
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{INTRO_GENDER.prompt}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <GenderChoice
                label={INTRO_GENDER.male}
                selected={gender === 'male'}
                onClick={() => setGender('male')}
              />
              <GenderChoice
                label={INTRO_GENDER.female}
                selected={gender === 'female'}
                onClick={() => setGender('female')}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">{INTRO_GENDER.note}</p>
            <Button variant="primary" className="mt-8 w-full" onClick={dismissIntro}>
              {INTRO_GENDER.start}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function GenderChoice({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[76px] rounded-xl border px-3 text-sm tracking-wide transition-colors ${
        selected
          ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
          : 'border-line bg-ink-900/50 text-parchment active:bg-ink-800/60'
      }`}
    >
      {label}
    </button>
  )
}
