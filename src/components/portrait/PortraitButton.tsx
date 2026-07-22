import { THRONE_BACKDROP, throneTier } from '../../data/throne'
import { resolveMonarchPortrait, resolveOutfit } from '../../systems/outfits'
import { useGame } from '../../store/gameStore'

interface PortraitButtonProps {
  className?: string
}

/**
 * 사이드바 상단에 상시 표시되는 작은 초상. 탭하면 확대 모달이 열린다.
 *
 * ★ 진행 가시성(D-2): 국정 영향도 구간에 따라 초상 뒤(옥좌)가 밝아지고 온기가 돈다.
 *   에셋 없이 CSS 시각효과로 — throne.ts 가 구간→분위기를 든다(나중 에셋 교체 대비).
 */
export function PortraitButton({ className = '' }: PortraitButtonProps) {
  const manifest = useGame((s) => s.outfitManifest)
  const outfitId = useGame((s) => s.game.currentOutfitId)
  const gender = useGame((s) => s.game.monarchGender)
  const age = useGame((s) => s.game.age)
  const influence = useGame((s) => s.game.courtInfluence)
  const openPortrait = useGame((s) => s.openPortrait)

  const outfit = resolveOutfit(manifest, outfitId)
  // ★ 초상 썸네일: portraits 섹션이 있으면 성별×나이×착장으로 크롭본을 해석,
  //   없으면(옛 매니페스트) 해당 outfit 의 단일 thumbSrc 로 폴백.
  const thumbSrc = manifest.portraits
    ? resolveMonarchPortrait(manifest.portraits, gender, age, outfit.id).thumbSrc
    : outfit.thumbSrc
  const tier = throneTier(influence)
  const throne = THRONE_BACKDROP[tier]

  return (
    <button
      onClick={openPortrait}
      aria-label={`군주 초상 — 현재 착장 ${outfit.name}. 눌러서 크게 보기`}
      data-throne={tier}
      className={`group relative shrink-0 overflow-hidden rounded-xl border transition-all duration-700 active:border-amber-400 ${throne.ring} ${className}`}
    >
      {/* 옥좌 분위기 — 나중에 assetSrc 가 채워지면 이 자리에 배경 <img> 가 온다. */}
      <div className={`absolute inset-0 transition-all duration-700 ${throne.backdrop}`} />
      <img
        src={thumbSrc}
        alt=""
        className={`relative h-full w-full object-cover object-top transition-all duration-700 ${throne.imgFilter}`}
        draggable={false}
      />
      <span className="absolute inset-x-0 bottom-0 z-10 hidden bg-slate-950/80 py-1 text-center text-[11px] text-slate-200 lg:block">
        {outfit.name}
      </span>
    </button>
  )
}
