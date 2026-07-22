import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_BY_ID } from '../../data/characters'
import { SCENE_BY_ID } from '../../data/scenes'
import { resolveText } from '../../systems/text'
import { isRead, markRead } from '../../systems/readlog'
import { useGame } from '../../store/gameStore'
import { SPEED_MS, useOptions } from '../../store/optionsStore'
import { Button } from '../ui/Button'
import { useTypewriter } from './useTypewriter'

/**
 * 대사 씬 재생기 (M2b-3a → D-3 타이핑·스킵).
 *
 * 미리 쓴 고정 대사를 한 줄씩 진행한다. D-3:
 *   · 현재 줄을 옵션 속도로 **타이핑**한다. 타이핑 중 진행 버튼 → 그 줄 즉시 완성.
 *   · 씬을 끝까지 본 적이 있으면(readlog) **스킵** 버튼이 활성 — 처음 보는 씬은 스킵 불가.
 *   · 씬을 끝까지 보면 markRead 로 기록(다음 회차 스킵 대상).
 */
export function ScenePlayer({
  sceneId,
  finished = false,
  onFinished,
}: {
  sceneId: string
  /** true 면 전체 대사를 한 번에 보여주고 진행 버튼을 감춘다(씬을 이미 본 상태). */
  finished?: boolean
  onFinished: () => void
}) {
  const game = useGame((s) => s.game)
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

  return (
    <div>
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
