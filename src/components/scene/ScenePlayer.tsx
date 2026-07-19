import { useState } from 'react'
import { CHARACTER_BY_ID } from '../../data/characters'
import { SCENE_BY_ID } from '../../data/scenes'
import { resolveText } from '../../systems/text'
import { useGame } from '../../store/gameStore'
import { Button } from '../ui/Button'

/**
 * 대사 씬 재생기 (M2b-3a).
 *
 * 미리 쓴 고정 대사를 한 줄씩 진행한다. M2b-2 의 AI 스트리밍과는 별개 경로다.
 * 마지막 줄에 닿으면 onFinished 를 불러 기존 선택지 UI 로 넘긴다 —
 * 그래서 sceneId 가 없는 기존 이벤트 15건은 아무 영향을 받지 않는다.
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
  const [index, setIndex] = useState(0)
  const scene = SCENE_BY_ID[sceneId]

  if (!scene) return null

  const shown = finished ? scene.lines : scene.lines.slice(0, index + 1)
  const atEnd = index >= scene.lines.length - 1

  const advance = () => {
    if (atEnd) onFinished()
    else setIndex((i) => i + 1)
  }

  const speakerLabel = (speaker: string): string | null => {
    if (speaker === 'narration') return null
    if (speaker === 'monarch') return resolveText('{왕}', game)
    return CHARACTER_BY_ID[speaker]?.name ?? speaker
  }

  return (
    <div>
      <div className="space-y-3">
        {shown.map((line, i) => {
          const label = speakerLabel(line.speaker)
          return (
            <div key={i} className={!finished && i !== index ? 'opacity-60' : ''}>
              {label && <p className="text-xs text-amber-400">{label}</p>}
              {resolveText(line.text, game)
                .split('\n')
                .map((part, j) => (
                  <p key={j} className="text-sm leading-relaxed text-slate-200">
                    {part}
                  </p>
                ))}
            </div>
          )
        })}
      </div>

      {!finished && (
        <div className="mt-4">
          <Button variant="primary" className="w-full" onClick={advance}>
            {atEnd ? '계속' : '다음'}
          </Button>
          <p className="mt-1 text-center text-[11px] text-slate-600">
            {index + 1} / {scene.lines.length}
          </p>
        </div>
      )}
    </div>
  )
}
