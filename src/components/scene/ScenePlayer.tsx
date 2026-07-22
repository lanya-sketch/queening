import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_BY_ID } from '../../data/characters'
import { SCENE_BY_ID } from '../../data/scenes'
import { resolveText } from '../../systems/text'
import { isRead, markRead } from '../../systems/readlog'
import {
  resolveCharacterPortrait, resolveMonarchPortrait, resolveOutfit,
} from '../../systems/outfits'
import { useGame } from '../../store/gameStore'
import { SPEED_MS, useOptions } from '../../store/optionsStore'
import { Button } from '../ui/Button'
import { useTypewriter } from './useTypewriter'
import type { GameState, OutfitManifest, Scene } from '../../types/game'

/**
 * 대사 씬 재생기 (M2b-3a → D-3 타이핑·스킵 → 배선2 VN 전신).
 *
 *   · 현재 줄을 옵션 속도로 **타이핑**. 타이핑 중 진행 버튼 → 그 줄 즉시 완성.
 *   · 씬을 끝까지 본 적 있으면(readlog) **스킵** 활성. 씬 끝까지 보면 markRead.
 *   · showSprites 면 **말하는 캐릭터의 전신 스프라이트**를 위에 얹는다(이벤트 씬 VN 레이아웃).
 *     narration 은 직전 캐릭터를 유지하고, 튜터(플레이어)는 뜨지 않는다.
 */
export function ScenePlayer({
  sceneId,
  finished = false,
  showSprites = false,
  onFinished,
}: {
  sceneId: string
  /** true 면 전체 대사를 한 번에 보여주고 진행 버튼을 감춘다(씬을 이미 본 상태). */
  finished?: boolean
  /** true 면 이벤트 씬 VN 레이아웃 — 화자 전신 스프라이트를 표시한다. */
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
    return CHARACTER_BY_ID[speaker]?.name ?? speaker
  }

  const renderLines = finished ? scene.lines.map((l) => resolveText(l.text, game)) : null

  // ★ 이벤트 씬 전신: 현재(index)까지 거슬러 마지막으로 "스프라이트가 있는 화자"를 찾는다.
  //   화자가 narration/튜터면 직전 캐릭터를 유지. finished(이미 본 씬)면 마지막 화자.
  const spriteSrc = showSprites
    ? activeSprite(scene, finished ? scene.lines.length - 1 : index, game, manifest)
    : null

  return (
    <div>
      {spriteSrc && (
        <div className="relative mb-3 flex h-[34dvh] items-end justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-800/60 to-slate-950 lg:h-[46dvh]">
          {/* 배경 에셋은 후속 — 지금은 어두운 기본 위에 전신 스프라이트만. */}
          <img
            src={spriteSrc}
            alt=""
            draggable={false}
            className="h-full w-auto object-contain object-bottom drop-shadow-2xl"
          />
        </div>
      )}
      <div className="space-y-3">
        {finished
          ? scene.lines.map((l, i) => (
              <LineBlock key={i} label={speakerLabel(l.speaker)} text={renderLines![i]} dim={false} />
            ))
          : scene.lines.slice(0, index + 1).map((l, i) => (
              <LineBlock
                key={i}
                label={speakerLabel(l.speaker)}
                // 현재 줄만 타이핑 중인 부분 텍스트, 지난 줄은 전체.
                text={i === index ? tw.shown : resolveText(l.text, game)}
                dim={i !== index}
              />
            ))}
      </div>

      {!finished && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            {/* 타이핑 중 클릭 → 그 줄 즉시 완성, 완성 후 클릭 → 진행. 라벨은 진행 기준. */}
            <Button variant="primary" className="flex-1" onClick={advance}>
              {atEnd ? '계속' : '다음'}
            </Button>
            {alreadyRead && (
              <Button className="shrink-0 px-4" onClick={skip}>
                씬 스킵
              </Button>
            )}
          </div>
          <p className="mt-1 text-center text-[11px] text-slate-600">
            {index + 1} / {scene.lines.length}
          </p>
        </div>
      )}
    </div>
  )
}

/** 한 화자의 전신 스프라이트 경로. 튜터/narration/미등록이면 null. */
function spriteFor(speaker: string, game: GameState, manifest: OutfitManifest): string | null {
  if (speaker === 'narration' || speaker === 'tutor') return null
  if (speaker === 'monarch') {
    if (!manifest.portraits) return null
    const outfit = resolveOutfit(manifest, game.currentOutfitId)
    return resolveMonarchPortrait(manifest.portraits, game.monarchGender, game.age, outfit.id).fullSrc
  }
  if (!manifest.characterPortraits) return null
  // 5인은 데이터 성별, 모후·섭정공은 config 에 성별이 박혀 있어(호출 성별은 무시됨).
  const gender = CHARACTER_BY_ID[speaker]?.gender ?? 'male'
  return resolveCharacterPortrait(manifest.characterPortraits, speaker, gender, game.age)?.fullSrc ?? null
}

/** index 부터 거슬러 올라가 마지막으로 스프라이트가 있는 화자를 찾는다(narration 은 유지). */
function activeSprite(
  scene: Scene,
  index: number,
  game: GameState,
  manifest: OutfitManifest,
): string | null {
  for (let i = Math.min(index, scene.lines.length - 1); i >= 0; i--) {
    const src = spriteFor(scene.lines[i].speaker, game, manifest)
    if (src) return src
  }
  return null
}

function LineBlock({ label, text, dim }: { label: string | null; text: string; dim: boolean }) {
  return (
    <div className={dim ? 'opacity-60' : ''}>
      {label && <p className="text-xs text-amber-400">{label}</p>}
      {text.split('\n').map((part, j) => (
        <p key={j} className="text-sm leading-relaxed text-slate-200">
          {part}
        </p>
      ))}
    </div>
  )
}
