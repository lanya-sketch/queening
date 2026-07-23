import { OUTFIT_SAFETY_NOTICE } from '../../data/outfits'
import { describeCondition } from '../../systems/eventEngine'
import { isOutfitUnlocked, resolveMonarchPortrait } from '../../systems/outfits'
import { useGame } from '../../store/gameStore'

export function OutfitPicker() {
  const manifest = useGame((s) => s.outfitManifest)
  const manifestSource = useGame((s) => s.manifestSource)
  const game = useGame((s) => s.game)
  const setOutfit = useGame((s) => s.setOutfit)

  return (
    <div>
      <h2 className="text-sm font-medium text-parchment">착장</h2>

      <ul className="mt-3 space-y-2">
        {manifest.outfits.map((outfit) => {
          const unlocked = isOutfitUnlocked(outfit, game)
          const selected = outfit.id === game.currentOutfitId
          const requirements = describeCondition(outfit.unlockCondition)
          // 착장 목록 썸네일도 현재 성별·나이의 크롭본으로(portraits 있으면).
          const thumb = manifest.portraits
            ? resolveMonarchPortrait(manifest.portraits, game.monarchGender, game.age, outfit.id)
                .thumbSrc
            : outfit.thumbSrc

          return (
            <li key={outfit.id}>
              <button
                onClick={() => setOutfit(outfit.id)}
                disabled={!unlocked}
                aria-pressed={selected}
                className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                  selected
                    ? 'border-gold-400 bg-ink-700/30'
                    : unlocked
                      ? 'border-line bg-ink-900/60 active:border-line-gold active:bg-ink-800'
                      : 'border-line bg-ink-900/30'
                }`}
              >
                <img
                  src={thumb}
                  alt=""
                  draggable={false}
                  className={`h-14 w-11 shrink-0 rounded-lg object-cover object-top ${
                    unlocked ? '' : 'opacity-30 grayscale'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-medium ${unlocked ? 'text-parchment' : 'text-muted'}`}
                    >
                      {outfit.name}
                    </span>
                    {!unlocked && <span aria-hidden className="text-xs text-muted">🔒</span>}
                    {selected && (
                      <span className="rounded bg-gold-400 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">
                        착용 중
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-relaxed ${
                      unlocked ? 'text-muted' : 'text-faint'
                    }`}
                  >
                    {unlocked
                      ? outfit.description
                      : requirements.length > 0
                        ? `해금 조건: ${requirements.join(', ')}`
                        : '아직 입을 수 없습니다.'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 rounded-lg border border-line bg-ink-900/60 p-3 text-[11px] leading-relaxed text-muted">
        착장 이미지는 <code className="text-parchment">public/assets/outfits/</code> 폴더와{' '}
        <code className="text-parchment">manifest.json</code> 으로 교체할 수 있습니다.
        <br />
        <span className="text-gold-400">{OUTFIT_SAFETY_NOTICE}</span>
      </p>

      {manifestSource === 'fallback' && (
        <p className="mt-2 text-[11px] text-red-400">
          manifest.json 을 읽지 못해 내장 기본 착장을 쓰고 있습니다. 콘솔을 확인하세요.
        </p>
      )}
    </div>
  )
}
