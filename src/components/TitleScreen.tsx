import { useState } from 'react'
import { Lozenge } from './ui/Chrome'
import { TITLE, TITLE_BACKGROUND } from '../data/title'
import { getSavedAt } from '../systems/save'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'

/**
 * 타이틀 화면 (D-1).
 *
 * 빈 옥좌 위에 제목과 메뉴. 화려하지 않게, 무게와 절제로.
 * 진입 흐름: 타이틀 → [새 게임 → 온보딩 → 플레이] / [이어하기 → 이어서].
 */
export function TitleScreen() {
  const startGame = useApp((s) => s.startGame)
  const startNewGame = useApp((s) => s.startNewGame)
  const openSettings = useApp((s) => s.openSettings)
  const openGallery = useApp((s) => s.openGallery)
  const reset = useGame((s) => s.reset)
  const load = useGame((s) => s.load)
  // 세이브는 현재 단일 슬롯이다(queening.save). 다중 슬롯은 별도 라운드.
  const [hasSave] = useState(() => getSavedAt() !== null)

  const onNew = () => {
    reset()
    startNewGame() // 새 게임은 인트로(선왕 배경 → 성별) → 온보딩 순.
  }
  const onContinue = () => {
    if (!hasSave) return
    load()
    startGame(false) // 이어하기는 온보딩 없이
  }

  return (
    <div data-screen="title" className="relative min-h-dvh overflow-hidden bg-ink-950">
      {/* 빈 옥좌 배경 */}
      <img
        src={TITLE_BACKGROUND}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
      />
      {/* 어둠으로 가라앉히는 그라디언트 — 타이포가 배경 위에서 읽히게 */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/40 to-ink-950/90" />

      <div className="relative flex min-h-dvh flex-col items-center px-6 py-10">
        {/* 제목 */}
        <header className="mt-6 flex flex-col items-center text-center">
          {/* 금빛 실선 + 마름모 — 게임 전체가 쓰는 구획 장식 */}
          <div className="mb-5 flex items-center gap-3.5 opacity-70">
            <span aria-hidden className="h-px w-14" style={{ background: 'linear-gradient(90deg,transparent,var(--color-gold-400))' }} />
            <Lozenge size={7} />
            <span aria-hidden className="h-px w-14" style={{ background: 'linear-gradient(90deg,var(--color-gold-400),transparent)' }} />
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-[0.12em] text-gold-300 sm:text-6xl">
            {TITLE.main}
          </h1>
          <p
            className="mt-4 font-display text-[13px] uppercase text-gold-400/80"
            style={{ letterSpacing: '.42em' }}
          >
            {TITLE.sub}
          </p>
          <p className="mt-6 max-w-sm text-[12.5px] italic leading-relaxed text-parchment/70">
            {TITLE.tagline}
          </p>
        </header>

        {/* 메뉴 — 빈 옥좌가 화면의 핵심 이미지라, 아래로 내려 온전히 보이게 한다. */}
        <nav className="mt-auto flex w-full max-w-xs flex-col gap-2.5">
          <TitleButton label={TITLE.menu.newGame} onClick={onNew} primary />
          <TitleButton label={TITLE.menu.continue} onClick={onContinue} disabled={!hasSave} />
          <div className="grid grid-cols-2 gap-2.5">
            <TitleButton label={TITLE.menu.settings} onClick={openSettings} small />
            <TitleButton label={TITLE.menu.gallery} onClick={openGallery} small />
          </div>
        </nav>
      </div>
    </div>
  )
}

function TitleButton({
  label,
  onClick,
  primary,
  disabled,
  small,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[52px] rounded-panel border font-title tracking-[0.14em] transition-colors ${
        small ? 'text-xs' : 'text-sm'
      } ${
        disabled
          ? 'cursor-not-allowed border-line/60 bg-ink-900/30 text-faint'
          : primary
            ? 'border-line-gold/60 bg-ink-700/40 text-gold-300 active:bg-ink-700/50'
            : 'border-line/70 bg-ink-900/50 text-parchment active:bg-ink-800/60'
      }`}
    >
      {label}
    </button>
  )
}
