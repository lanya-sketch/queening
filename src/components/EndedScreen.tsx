import { useMemo, useState } from 'react'
import { GAME_CONFIG, courtInfluenceCap } from '../data/config'
import { STAT_KEYS, STAT_META } from '../data/stats'
import { buildEndingScene } from '../systems/endingScene'
import { judgeEnding, describeEnding } from '../systems/ending'
import { SCENE_BY_ID } from '../data/scenes'
import { useGame } from '../store/gameStore'
import { resolveText } from '../systems/text'
import { ScenePlayer } from './scene/ScenePlayer'
import { Button } from './ui/Button'

/**
 * 엔딩 화면 (M3-2).
 *
 * ★ 두 단계다: 먼저 조립된 엔딩 씬을 기존 VN 시스템(ScenePlayer)으로 재생하고,
 *   씬이 끝나면 결산 요약을 보여준다. 씬은 M3-1 판정을 읽어 조립되고, AI 는 쓰지 않는다.
 *
 * 새 렌더러를 만들지 않는다 — buildEndingScene 이 Scene 을 돌려주므로
 * SCENE_BY_ID 에 잠깐 등록해 ScenePlayer 가 그대로 재생하게 한다.
 */
export function EndedScreen() {
  const game = useGame((s) => s.game)
  const reset = useGame((s) => s.reset)
  const save = useGame((s) => s.save)
  const [sceneDone, setSceneDone] = useState(false)

  // 판정과 씬 조립은 상태에 의존하지만 게임 진행 중에 바뀌지 않는다.
  const { sceneId, summary } = useMemo(() => {
    const result = judgeEnding(game)
    const scene = buildEndingScene(result)
    // ScenePlayer 는 SCENE_BY_ID 에서 씬을 찾는다 — 조립된 씬을 그 자리에 얹는다.
    SCENE_BY_ID[scene.id] = scene
    return { sceneId: scene.id, summary: result }
    // eslint 없는 프로젝트. 마운트 시 한 번만 조립한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clueCount = Object.keys(game.flags).filter(
    (f) => f.startsWith('clue_') && game.flags[f],
  ).length

  if (!sceneDone) {
    return (
      <div className="pb-28 lg:pb-6">
        <article className="rounded-xl border border-amber-900/60 bg-slate-900/60 p-5">
          <p className="text-xs text-amber-500">즉위 {game.date.year}년 · 아홉 해의 끝</p>
          <div className="mt-4">
            <ScenePlayer sceneId={sceneId} onFinished={() => setSceneDone(true)} />
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="pb-28 lg:pb-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-amber-100">
          {resolveText('{왕}', game)}은 {GAME_CONFIG.endAge}세가 되었다
        </h1>
        <p className="mt-2 text-xs text-amber-200/70">{describeEnding(summary)}</p>
      </header>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">결산</h2>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-300">국정 영향도</span>
          <span className="tabular-nums text-lg font-semibold text-yellow-500">
            {game.courtInfluence}
            <span className="ml-1 text-xs font-normal text-slate-500">
              / 상한 {courtInfluenceCap(game.age)}
            </span>
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">모은 단서 {clueCount}개 · 국력 {summary.power}</p>
      </section>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-300">
          스무 살의 {resolveText('{왕}', game)}
        </h2>
        <ul className="space-y-1.5">
          {STAT_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{STAT_META[key].label}</span>
              <span className="tabular-nums text-slate-100">{game.stats[key]}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={save}>이 기록 저장</Button>
        <Button variant="danger" onClick={reset}>
          처음부터
        </Button>
      </div>
    </div>
  )
}
