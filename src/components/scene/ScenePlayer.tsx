import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { CHARACTER_BY_ID } from '../../data/characters'
import { SCENE_BY_ID } from '../../data/scenes'
import { characterGender, characterName, resolveText } from '../../systems/text'
import { isRead, markRead } from '../../systems/readlog'
import {
  resolveCharacterPortrait, resolveMonarchPortrait, resolveOutfit,
} from '../../systems/outfits'
import { useGame } from '../../store/gameStore'
import { SPEED_MS, useOptions } from '../../store/optionsStore'
import { useTypewriter } from './useTypewriter'
import type { GameState, OutfitManifest, Scene } from '../../types/game'

/**
 * 대사 씬 재생기 — VN 대화창 (완주 피드백 2, 대화창 라운드).
 *
 * ★ 프메(오토메) 방식: **고정 프레임** 안에서 한 단락씩 갈아끼운다.
 *   · 상단에 화자 **반신 스프라이트**(배경 슬롯 위). 안 말하는 쪽은 회색 명암.
 *   · 그 아래 **고정 너비·고정 높이** 대화창 — 대사 길이와 무관하게 위치·높이 불변.
 *     예전처럼 줄을 아래로 **쌓지 않는다**(누적 로그 → 화면 출렁임 제거).
 *   · ★ 「다음」 버튼 없음 — **대화창 전체가 클릭 대상**. 한 동작으로 통일:
 *     타이핑 중 클릭=그 줄 즉시 완성, 완성 후 클릭=다음 단락, 마지막 줄 클릭=씬 종료.
 *   · "더 있다" 신호는 우하단 **▼**(완성 후 깜빡) + 진행 표시(3/7).
 *   · 이미 끝까지 본 씬(readlog)이면 **씬 스킵** 활성.
 *   · finished(이미 본 상태)면 전 대사를 조용한 기록으로 펼쳐 선택지와 함께 다시 읽게 한다.
 *
 * ★ 씬 데이터(Scene/SceneLine)·showSprites 계약은 건드리지 않는다 — 렌더러만 바뀐다.
 */
export function ScenePlayer({
  sceneId,
  finished = false,
  showSprites = false,
  onFinished,
}: {
  sceneId: string
  /** true 면 전체 대사를 조용한 기록으로 펼치고 진행 UI를 감춘다(씬을 이미 본 상태). */
  finished?: boolean
  /** true 면 이벤트 씬 VN 레이아웃 — 화자 반신 스프라이트를 표시한다. */
  showSprites?: boolean
  onFinished: () => void
}) {
  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)
  const textSpeed = useOptions((s) => s.textSpeed)
  const [index, setIndex] = useState(0)
  const scene = SCENE_BY_ID[sceneId]
  // 이 씬을 예전에 끝까지 본 적이 있는가(스킵 허용 여부). 마운트 시 한 번 읽는다.
  const alreadyRead = useMemo(() => isRead(sceneId), [sceneId])

  const line = scene?.lines[index]
  const curText = line ? resolveText(line.text, game) : ''
  // 이미 다 본 씬(finished)이면 타이핑하지 않는다.
  const tw = useTypewriter(curText, finished ? 0 : SPEED_MS[textSpeed])

  const lastIndex = (scene?.lines.length ?? 1) - 1
  const atEnd = index >= lastIndex

  // 끝 줄까지 타이핑을 마치면(또는 이미 본 씬이면) 읽음으로 기록한다.
  useEffect(() => {
    if (scene && (finished || (atEnd && tw.done))) markRead(sceneId)
  }, [scene, finished, atEnd, tw.done, sceneId])

  if (!scene) return null

  const advance = () => {
    if (!tw.done) {
      tw.complete() // 타이핑 중 → 그 줄 즉시 완성.
      return
    }
    if (atEnd) onFinished()
    else setIndex((i) => i + 1)
  }
  const skip = () => {
    markRead(sceneId)
    onFinished()
  }

  const speakerLabel = (speaker: string): string | null => {
    if (speaker === 'narration') return null
    if (speaker === 'monarch') return resolveText('{왕}', game)
    // CHARACTERS 밖 인물(섭정공·모후) — 스프라이트만 매니페스트에 있고 데이터엔 없어 라벨을 여기 둔다.
    if (speaker === 'regent') return '섭정공'
    if (speaker === 'queen_mother') return '왕대비'
    // 주변 인물(배선 3) — 스프라이트만 매니페스트에 있고 CHARACTERS 엔 없어 라벨을 여기 둔다.
    if (speaker === 'commander_father') return '가문의 수장'
    return CHARACTER_BY_ID[speaker] ? characterName(speaker, game) : speaker
  }

  // ── finished: 조용한 기록 — 선택지와 함께 다시 읽는 완결된 대화(진행 UI 없음). ──
  if (finished) {
    return (
      <div className="rounded-2xl border border-line-gold/40 bg-ink-950/60 p-4 sm:p-5">
        <div className="space-y-2.5">
          {scene.lines.map((l, i) => {
            const label = speakerLabel(l.speaker)
            return (
              <div key={i}>
                {label && <p className="text-[11px] font-medium tracking-wide text-gold-400/80">{label}</p>}
                {resolveText(l.text, game).split('\n').map((part, j) => (
                  <p key={j} className="text-[13.5px] leading-relaxed text-parchment/75">{part || ' '}</p>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 재생 중: 프메 대화창 ──
  const name = speakerLabel(line?.speaker ?? '')
  // 씬 안의 화자를 등장 순서로 모은다(스프라이트 있는 인물만). 현재 화자 + 상대까지 최대 둘.
  const cast = showSprites ? sceneCast(scene, game, manifest) : []
  const activeKey = showSprites ? activeSpriteKey(scene, index, game, manifest) : null
  const activeFace = activeKey ? faceFor(activeKey, game, manifest) : null

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      advance()
    }
  }
  const skipCorner = alreadyRead && (
    <button
      onClick={(e) => {
        e.stopPropagation()
        skip()
      }}
      className="rounded-full border border-line-gold/40 bg-ink-950/70 px-2.5 py-1 text-[10px] text-muted backdrop-blur-sm active:bg-ink-800"
    >
      씬 스킵 ⏭
    </button>
  )
  const progressRow = (
    <div className="mt-1.5 flex items-center justify-end gap-2 text-faint">
      <span className="text-[11px] tabular-nums">{index + 1} / {scene.lines.length}</span>
      <span
        aria-hidden
        className={`text-[11px] text-gold-300 transition-opacity duration-200 ${tw.done ? 'animate-pulse opacity-100' : 'opacity-0'}`}
      >
        ▼
      </span>
    </div>
  )

  // ── ★ [대화창-2] 인물 대화(스프라이트 있음) → 전체화면 VN.
  //   컷씬(스프라이트 무대)이 화면을 채우고, 하단 대화바에 화자 얼굴을 왼쪽에 둔다(온보딩 결).
  if (cast.length > 0) {
    return (
      <div
        data-scene-advance
        data-scene-fullscreen
        role="button"
        tabIndex={0}
        aria-label="대화 진행"
        onClick={advance}
        onKeyDown={onKey}
        className="fixed inset-0 z-50 cursor-pointer select-none overflow-hidden bg-ink-950"
      >
        {/* 무대 배경 — 그라데이션 + 상단 금빛 비네트 */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink-700/25 via-ink-950 to-black" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(120% 70% at 50% 0%, rgba(247,215,145,0.06), transparent 62%)' }}
        />
        {/* 스프라이트 — 화면을 채운다(하단 정렬). 둘이면 나란히, 안 말하는 쪽 회색 명암.
             ★ 혼자면 늘 밝게(대비할 상대가 없다). 내레이션(활성 화자 없음)이면 첫 인물을 밝게. */}
        <div className={`absolute inset-0 flex items-end justify-center ${cast.length > 1 ? 'gap-2 sm:gap-10' : ''}`}>
          {cast.map((c) => {
            const active = cast.length === 1 || c.key === (activeKey ?? cast[0]?.key)
            return (
              <img
                key={c.key}
                src={c.src}
                alt=""
                draggable={false}
                className={`h-[95%] w-auto max-w-none object-contain object-bottom drop-shadow-2xl transition-all duration-300 ${
                  active ? 'opacity-100 saturate-100 brightness-100' : 'opacity-80 saturate-0 brightness-[0.4]'
                }`}
              />
            )
          })}
        </div>
        {/* 하단 가독성 그라데이션 — 대화바 뒤를 어둡게 */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/85 to-transparent" />

        {/* 하단 대화바 — 왼쪽 얼굴 + 이름 + 텍스트 + 진행 */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-4 sm:px-6 sm:pb-6">
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-line-gold/60 bg-ink-950/85 px-4 py-3.5 shadow-[0_12px_44px_-10px_rgba(0,0,0,0.9)] backdrop-blur-md sm:px-6 sm:py-4">
            {skipCorner && <div className="absolute right-2.5 top-2.5">{skipCorner}</div>}
            <div className="flex items-stretch gap-3.5 sm:gap-5">
              {activeFace && (
                // ★ 왼쪽 얼굴 — 대화바 한쪽 구석을 꽉 채운다(바 높이만큼 stretch, 정사각형에 가깝게).
                <img
                  src={activeFace}
                  alt=""
                  draggable={false}
                  className="aspect-square w-20 shrink-0 self-center rounded-2xl border border-line-gold/50 object-cover object-top shadow-[0_8px_28px_-6px_rgba(0,0,0,0.85)] sm:w-32"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex min-h-[1.15rem] items-center gap-2.5">
                  {name && (
                    <>
                      <span aria-hidden className="text-gold-400">◈</span>
                      <span className="font-title text-[13.5px] font-semibold tracking-wide text-gold-300">{name}</span>
                    </>
                  )}
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line-gold/70 via-line-gold/30 to-transparent" />
                </div>
                <div className="mt-2 h-[4.5rem] overflow-y-auto pr-1 sm:h-[5rem]">
                  {tw.shown.split('\n').map((part, j) => (
                    <p key={j} className="text-[15px] leading-relaxed text-parchment sm:text-[15.5px]">
                      {part || ' '}
                    </p>
                  ))}
                </div>
                {progressRow}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 스프라이트 없는 대화(내레이션·튜터만) → 기존 인라인 대화창 ──
  return (
    <div
      data-scene-advance
      role="button"
      tabIndex={0}
      aria-label="대화 진행"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          advance()
        }
      }}
      className="cursor-pointer select-none"
    >
      {/* ── 무대(컷신): 배경 슬롯(지금은 어두운 그라데이션, 나중에 배경 그림) + 반신 스프라이트.
             ★ 대화창과 붙이지 않고 독립 패널로 둔다 — 아래 대화창은 따로. ── */}
      {cast.length > 0 && (
        <div
          className={`relative flex h-[34dvh] items-start justify-center overflow-hidden rounded-2xl border border-line-gold/40 bg-gradient-to-b from-ink-700/40 via-ink-900 to-ink-950 sm:h-[42dvh] ${
            cast.length > 1 ? 'gap-1 sm:gap-3' : ''
          }`}
        >
          {/* 배경 비네트 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(247,215,145,0.05), transparent 60%)' }}
          />
          {cast.map((c) => {
            const active = c.key === activeKey
            return (
              // ★ 반신 크롭: 전신 스프라이트를 상단 정렬로 클립 — 허벅지 위만 크게 보인다(#28 초상 크게).
              //   안 말하는 쪽은 회색 명암(#8) — 흑백(saturate-0) + 어둡게(brightness).
              <div
                key={c.key}
                className={`relative h-full shrink-0 overflow-hidden ${
                  cast.length > 1 ? 'w-[48%] max-w-[430px]' : 'w-[64%] max-w-[520px]'
                }`}
              >
                <img
                  src={c.src}
                  alt=""
                  draggable={false}
                  className={`absolute left-1/2 top-0 w-full max-w-none -translate-x-1/2 drop-shadow-2xl transition-all duration-300 ${
                    active
                      ? 'opacity-100 saturate-100 brightness-100'
                      : 'opacity-90 saturate-0 brightness-[0.45]'
                  }`}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ── 대화창: ★ 무대와 분리된 독립 패널. 무대만큼 가로로 꽉 찬 풀 너비.
             고정 높이 프레임 (대사 길이 무관 — 위치·높이 불변). ── */}
      <div className="relative mt-2.5 w-full rounded-2xl border border-line-gold/70 bg-gradient-to-b from-ink-900 to-ink-950 px-4 py-3.5 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.7)] sm:px-6 sm:py-4">
        {/* 씬 스킵 — 코너. 클릭이 진행으로 새지 않게 stopPropagation. */}
        {alreadyRead && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              skip()
            }}
            className="absolute right-2.5 top-2.5 rounded-full border border-line-gold/40 bg-ink-950/70 px-2.5 py-1 text-[10px] text-muted backdrop-blur-sm active:bg-ink-800"
          >
            씬 스킵 ⏭
          </button>
        )}
        {/* 화자 이름 + 금빛 실선 */}
        <div className="flex min-h-[1.15rem] items-center gap-2.5">
          {name && (
            <>
              <span aria-hidden className="text-gold-400">◈</span>
              <span className="font-title text-[13.5px] font-semibold tracking-wide text-gold-300">{name}</span>
            </>
          )}
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line-gold/70 via-line-gold/30 to-transparent" />
        </div>

        {/* 텍스트 — 고정 높이(출렁임 0), 한 단락. 긴 대사는 이 안에서만 스크롤. */}
        <div className="mt-2.5 h-[5.5rem] overflow-y-auto pr-1 sm:h-[6rem]">
          {tw.shown.split('\n').map((part, j) => (
            <p key={j} className="text-[14.5px] leading-relaxed text-parchment">
              {part || ' '}
            </p>
          ))}
        </div>

        {/* 진행 표시(N/M) + ▼ */}
        <div className="mt-1.5 flex items-center justify-end gap-2 text-faint">
          <span className="text-[11px] tabular-nums">{index + 1} / {scene.lines.length}</span>
          <span
            aria-hidden
            className={`text-[11px] text-gold-300 transition-opacity duration-200 ${
              tw.done ? 'animate-pulse opacity-100' : 'opacity-0'
            }`}
          >
            ▼
          </span>
        </div>
      </div>
    </div>
  )
}

/** 한 화자의 반신 스프라이트 경로. 튜터/narration/미등록이면 null. */
function spriteFor(speaker: string, game: GameState, manifest: OutfitManifest): string | null {
  if (speaker === 'narration' || speaker === 'tutor') return null
  if (speaker === 'monarch') {
    if (!manifest.portraits) return null
    const outfit = resolveOutfit(manifest, game.currentOutfitId)
    return resolveMonarchPortrait(manifest.portraits, game.monarchGender, game.age, outfit.id).fullSrc
  }
  if (!manifest.characterPortraits) return null
  // 5인은 데이터 성별, 모후·섭정공은 config 에 성별이 박혀 있어(호출 성별은 무시됨).
  const gender = CHARACTER_BY_ID[speaker] ? characterGender(speaker, game) : 'male'
  return resolveCharacterPortrait(manifest.characterPortraits, speaker, gender, game.age)?.fullSrc ?? null
}

/** ★ [대화창-2] 한 화자의 얼굴 크롭(thumbSrc) — 전체화면 VN 하단 대화바의 왼쪽 얼굴. */
function faceFor(speaker: string, game: GameState, manifest: OutfitManifest): string | null {
  if (speaker === 'narration' || speaker === 'tutor') return null
  if (speaker === 'monarch') {
    if (!manifest.portraits) return null
    const outfit = resolveOutfit(manifest, game.currentOutfitId)
    return resolveMonarchPortrait(manifest.portraits, game.monarchGender, game.age, outfit.id).thumbSrc
  }
  if (!manifest.characterPortraits) return null
  const gender = CHARACTER_BY_ID[speaker] ? characterGender(speaker, game) : 'male'
  return resolveCharacterPortrait(manifest.characterPortraits, speaker, gender, game.age)?.thumbSrc ?? null
}

/**
 * 씬에 등장하는 화자(스프라이트 있는 인물)를 **등장 순서대로 최대 둘** 모은다.
 * ★ 둘이면 무대에 나란히 세우고, 안 말하는 쪽을 회색 명암 처리한다.
 */
function sceneCast(
  scene: Scene,
  game: GameState,
  manifest: OutfitManifest,
): { key: string; src: string }[] {
  const seen = new Map<string, string>()
  for (const l of scene.lines) {
    if (seen.has(l.speaker)) continue
    const src = spriteFor(l.speaker, game, manifest)
    if (src) seen.set(l.speaker, src)
    if (seen.size >= 2) break
  }
  return [...seen].map(([key, src]) => ({ key, src }))
}

/** 현재(index) 줄 기준 "말하는 화자" 키 — narration/튜터면 직전 화자를 유지. */
function activeSpriteKey(
  scene: Scene,
  index: number,
  game: GameState,
  manifest: OutfitManifest,
): string | null {
  for (let i = Math.min(index, scene.lines.length - 1); i >= 0; i--) {
    if (spriteFor(scene.lines[i].speaker, game, manifest)) return scene.lines[i].speaker
  }
  return null
}
