import { useEffect } from 'react'
import { CHARACTERS, DEEP_BOND_THRESHOLD } from '../../data/characters'
import { CHARACTER_TERMS } from '../../data/lexicon'
import { affectionOf, isDeepBond, isRomanceUnlocked } from '../../systems/romance'
import { resolveText } from '../../systems/text'
import { useGame } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { StatBar } from '../ui/StatBar'

/**
 * 연애 대상 명부 (M2b-3a).
 *
 * 이번 단계에서는 **시스템이 도는지 보여주는 창**이다 —
 * 호감도·해금 상태·깊은 관계 판정. 실제 캐릭터 대화·연출은 M2b-3b.
 */
export function RomancePanel({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="인연"
    >
      <div
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">인연</h1>
            <p className="mt-1 text-xs text-slate-400">
              깊은 관계는 호감도 {DEEP_BOND_THRESHOLD} 이상입니다. 여러 사람과 동시에
              쌓을 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {CHARACTERS.map((character) => {
            const unlocked = isRomanceUnlocked(character, game)
            const deep = isDeepBond(game, character.id)
            const terms = CHARACTER_TERMS[character.gender]
            return (
              <li
                key={character.id}
                className={`rounded-xl border p-3 ${
                  deep
                    ? 'border-amber-400 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={`/assets/characters/${character.portraitId}.svg`}
                    alt=""
                    draggable={false}
                    className={`h-12 w-9 shrink-0 rounded object-cover object-top ${
                      unlocked ? '' : 'opacity-40 grayscale'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-100">
                    {resolveText(character.name, game)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {character.gender === 'male' ? '남' : '여'} · {terms.title}
                  </span>
                  {deep && (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                      깊은 관계
                    </span>
                  )}
                  {!unlocked && (
                    <span className="ml-auto text-[11px] text-slate-500">🔒 잠김</span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {resolveText(character.role, game)}
                </p>
                <div className="mt-2">
                  <StatBar
                    label="호감도"
                    value={affectionOf(game, character.id)}
                    bar={unlocked ? 'bg-pink-400' : 'bg-slate-600'}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
          로맨스는 16세 데뷔탕트 이후에 열립니다(평민 영웅만 18세 입궁 이후). 그 전까지
          이들은 등장하더라도 다른 관계로만 존재합니다.
        </p>

        <Button className="mt-3 w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  )
}
