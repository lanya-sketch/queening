import { useEffect } from 'react'
import { resolveOutfit } from '../../systems/outfits'
import { useGame } from '../../store/gameStore'
import { OutfitPicker } from './OutfitPicker'

export function PortraitModal() {
  const open = useGame((s) => s.portraitOpen)
  const close = useGame((s) => s.closePortrait)
  const manifest = useGame((s) => s.outfitManifest)
  const outfitId = useGame((s) => s.game.currentOutfitId)

  // Esc 로 닫기 + 열려 있는 동안 뒤 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close])

  if (!open) return null

  const outfit = resolveOutfit(manifest, outfitId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="군주 초상"
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 전신 이미지 */}
        <div className="relative flex shrink-0 items-center justify-center bg-slate-900 p-3 lg:w-[46%]">
          <img
            src={outfit.fullSrc}
            alt={`${outfit.name}을 입은 군주`}
            draggable={false}
            className="max-h-[42dvh] w-auto rounded-lg object-contain lg:max-h-[80dvh]"
          />
          <button
            onClick={close}
            aria-label="닫기"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/80 text-lg text-slate-200 active:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* 착장 선택 */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-800 p-4 lg:border-l lg:border-t-0">
          <OutfitPicker />
        </div>
      </div>
    </div>
  )
}
