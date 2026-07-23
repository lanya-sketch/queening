import { useEffect } from 'react'
import { LockIcon } from '../ui/Chrome'
import { CHARACTERS, DEEP_BOND_THRESHOLD } from '../../data/characters'
import { CHARACTER_TERMS } from '../../data/lexicon'
import { affectionOf, isDeepBond, isPresent, isRomanceUnlocked } from '../../systems/romance'
import { resolveCharacterPortrait } from '../../systems/outfits'
import { resolveText } from '../../systems/text'
import { useAiEnabled } from '../../store/aiStore'
import { useGame } from '../../store/gameStore'
import { talkLocked, useTalk } from '../../store/talkStore'
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
  const manifest = useGame((s) => s.outfitManifest)
  const aiEnabled = useAiEnabled()
  const openTalk = useTalk((s) => s.openTalk)
  const locked = talkLocked(game.phase)

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
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-ink-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-title text-lg font-semibold text-parchment">인연</h1>
            <p className="mt-1 text-xs text-muted">
              {aiEnabled
                ? '해금된 사람을 누르면 대화가 시작됩니다.'
                : 'AI 설정에서 키를 넣으면 대화할 수 있습니다.'}{' '}
              호감도 {DEEP_BOND_THRESHOLD} 에 이르면 결정적 순간이 찾아오고, 그때 한 사람을
              택하면 나머지 인연은 닫힙니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-parchment active:bg-ink-800"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {CHARACTERS.map((character) => {
            const unlocked = isRomanceUnlocked(character, game)
            const present = isPresent(character, game)
            const away = unlocked && !present
            const deep = isDeepBond(game, character.id)
            const terms = CHARACTER_TERMS[character.gender]
            const canTalk = unlocked && present && aiEnabled && !locked
            return (
              <li
                key={character.id}
                role={canTalk ? 'button' : undefined}
                tabIndex={canTalk ? 0 : undefined}
                onClick={() => {
                  if (!canTalk) return
                  openTalk({ kind: 'character', charId: character.id })
                  onClose()
                }}
                className={`rounded-xl border p-3 ${
                  deep
                    ? 'border-gold-400 bg-ink-700/20'
                    : 'border-line bg-ink-900/60'
                } ${canTalk ? 'cursor-pointer active:border-line-gold active:bg-ink-800' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={
                      manifest.characterPortraits
                        ? resolveCharacterPortrait(
                            manifest.characterPortraits, character.id, character.gender, game.age,
                          )?.thumbSrc ?? `/assets/characters/${character.portraitId}.svg`
                        : `/assets/characters/${character.portraitId}.svg`
                    }
                    alt=""
                    draggable={false}
                    className={`h-12 w-9 shrink-0 rounded object-cover object-top ${
                      unlocked ? '' : 'opacity-40 grayscale'
                    }`}
                  />
                  <span className="text-sm font-medium text-parchment">
                    {resolveText(character.name, game)}
                  </span>
                  <span className="text-[11px] text-muted">
                    {character.gender === 'male' ? '남' : '여'} · {terms.title}
                  </span>
                  {deep && (
                    <span className="rounded bg-gold-400 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">
                      깊은 관계
                    </span>
                  )}
                  {!unlocked && (
                    <span
                      data-romance-locked
                      className="ml-auto flex items-center gap-1 text-[11px] text-muted"
                    >
                      <LockIcon size={11} /> 잠김
                    </span>
                  )}
                  {/* 부재는 잠금이 아니다 — 조건은 이미 채웠고 지금 자리에 없을 뿐. */}
                  {away && (
                    <span className="ml-auto text-[11px] text-sky-300/80">✈ 부재</span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {resolveText(character.role, game)}
                </p>
                {away && character.presence && (
                  <p className="mt-1 text-xs leading-relaxed text-sky-300/70">
                    {resolveText(character.presence.awayNote, game)}
                  </p>
                )}
                <div className="mt-2">
                  <StatBar
                    label="호감도"
                    value={affectionOf(game, character.id)}
                    bar={unlocked ? 'bg-pink-400' : 'bg-ink-600'}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
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
