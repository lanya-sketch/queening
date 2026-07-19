import { resolveOutfit } from '../../systems/outfits'
import { useGame } from '../../store/gameStore'

interface PortraitButtonProps {
  className?: string
}

/** 사이드바 상단에 상시 표시되는 작은 초상. 탭하면 확대 모달이 열린다. */
export function PortraitButton({ className = '' }: PortraitButtonProps) {
  const manifest = useGame((s) => s.outfitManifest)
  const outfitId = useGame((s) => s.game.currentOutfitId)
  const openPortrait = useGame((s) => s.openPortrait)

  const outfit = resolveOutfit(manifest, outfitId)

  return (
    <button
      onClick={openPortrait}
      aria-label={`군주 초상 — 현재 착장 ${outfit.name}. 눌러서 크게 보기`}
      className={`group relative shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 active:border-amber-400 ${className}`}
    >
      <img
        src={outfit.thumbSrc}
        alt=""
        className="h-full w-full object-cover object-top"
        draggable={false}
      />
      <span className="absolute inset-x-0 bottom-0 hidden bg-slate-950/80 py-1 text-center text-[11px] text-slate-200 lg:block">
        {outfit.name}
      </span>
    </button>
  )
}
