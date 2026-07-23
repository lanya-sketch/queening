import { useEffect, useMemo, useState } from 'react'
import { GAME_CONFIG, courtInfluenceCap } from '../data/config'
import { STAT_KEYS, STAT_META } from '../data/stats'
import { buildEndingScene } from '../systems/endingScene'
import { judgeEnding, describeEnding } from '../systems/ending'
import { deadEndReason } from '../systems/deadend'
import { buildDeadEndScene } from '../data/endings/deadends'
import { endingSummaryRows, isBadEnding } from '../data/endings/summary'
import { recordEnding } from '../systems/gallery'
import { SCENE_BY_ID } from '../data/scenes'
import { useGame } from '../store/gameStore'
import { resolveText } from '../systems/text'
import { ScenePlayer } from './scene/ScenePlayer'
import { Button } from './ui/Button'
import { Gauge } from './ui/Chrome'
import { resourceGauge, statGauge } from '../systems/display'

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
  // ★ 조기 데드엔딩이면 판정(judgeEnding)을 우회하고 손으로 쓴 데드 씬을 재생한다.
  const { sceneId, summary, dead } = useMemo(() => {
    const reason = deadEndReason(game)
    if (reason) {
      const { scene, title } = buildDeadEndScene(reason)
      SCENE_BY_ID[scene.id] = scene
      return { sceneId: scene.id, summary: null, dead: { title } }
    }
    const result = judgeEnding(game)
    const scene = buildEndingScene(result)
    // ScenePlayer 는 SCENE_BY_ID 에서 씬을 찾는다 — 조립된 씬을 그 자리에 얹는다.
    SCENE_BY_ID[scene.id] = scene
    return { sceneId: scene.id, summary: result, dead: null }
    // eslint 없는 프로젝트. 마운트 시 한 번만 조립한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ★ 갤러리 기록 — 이 엔딩(정식/데드)이 해금하는 항목을 별도 키에 누적한다.
  //   마운트 시 한 번. 판정과 무관하게 안전(실패해도 게임에 영향 없음).
  useEffect(() => {
    recordEnding(summary, deadEndReason(game))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clueCount = Object.keys(game.flags).filter(
    (f) => f.startsWith('clue_') && game.flags[f],
  ).length

  if (!sceneDone) {
    return (
      <div data-screen={dead ? 'dead' : 'ended'} className="pb-28 lg:pb-6">
        <article className="rounded-xl border border-line-gold/60 bg-ink-900/60 p-5">
          <p className="text-xs text-gold-400">
            {dead ? `즉위 ${game.date.year}년 · ${game.age}세 · 채우지 못한 치세` : `즉위 ${game.date.year}년 · 아홉 해의 끝`}
          </p>
          <div className="mt-4">
            <ScenePlayer sceneId={sceneId} onFinished={() => setSceneDone(true)} />
          </div>
        </article>
      </div>
    )
  }

  // ★ 조기 데드엔딩 — 판정 결산 없이 짧은 마감만. 정식 엔딩과 화면이 갈린다.
  if (dead) {
    return (
      <div data-screen="dead" className="pb-28 lg:pb-6">
        <header className="mb-4">
          <h1 className="font-title text-xl font-semibold text-peril-soft">{dead.title}</h1>
          <p className="mt-2 text-xs text-peril-soft/60">
            {resolveText('{왕}', game)}의 치세는 {game.age}세에, 스무 살에 이르지 못하고 끝났다.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={save}>이 기록 저장</Button>
          <Button variant="danger" onClick={reset}>
            처음부터
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-screen={dead ? 'dead' : 'ended'} className="pb-28 lg:pb-6">
      <header className="mb-4">
        <h1 className="font-title text-xl font-semibold text-gold-300">
          {resolveText('{왕}', game)}은 {GAME_CONFIG.endAge}세가 되었다
        </h1>
        <p className="mt-2 text-xs text-gold-300/70">{summary && describeEnding(summary)}</p>
      </header>

      {/* ★ 결산도 같은 어법으로 — 마지막 화면이라고 수치로 돌아가면 규칙이 무너진다. */}
      <section className="mb-4 rounded-panel border border-line-gold/50 bg-ink-900/60 p-4">
        <h2 className="font-title mb-3 text-sm font-medium text-parchment">결산</h2>
        <Gauge view={resourceGauge('courtInfluence', game, courtInfluenceCap(game.age))} />
        <p className="mt-3 text-xs text-muted">모은 단서 {clueCount}개</p>
      </section>

      {/* ★ 결산 차등 — 엔딩별로 다른 행. 배드 tier 는 어두운 톤으로. */}
      {summary && (
        <section
          className={`mb-4 rounded-xl border p-4 ${
            isBadEnding(summary)
              ? 'border-peril/40 bg-peril/10'
              : 'border-line bg-ink-900/60'
          }`}
        >
          <h2 className="font-title mb-3 text-sm font-medium text-parchment">아홉 해가 남긴 것</h2>
          <dl className="space-y-2">
            {endingSummaryRows(summary).map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-xs text-muted">{row.label}</dt>
                <dd
                  className={`text-right text-sm ${
                    isBadEnding(summary) ? 'text-peril-soft/90' : 'text-parchment'
                  }`}
                >
                  {resolveText(row.value, game)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mb-4 rounded-xl border border-line bg-ink-900/60 p-4">
        <h2 className="font-title mb-3 text-sm font-medium text-parchment">
          스무 살의 {resolveText('{왕}', game)}
        </h2>
        <div className="flex flex-col gap-3">
          {STAT_KEYS.map((key) => (
            <Gauge key={key} view={statGauge(key, game)} />
          ))}
        </div>

        {/* 정확한 값은 사이드바와 같은 규칙으로 접이식에만 */}
        <details
          data-detail-values
          className="mt-4 rounded-panel border border-line/70 bg-black/25 p-3"
        >
          <summary className="cursor-pointer select-none text-[11px] text-muted">
            상세 (내부값)
          </summary>
          <div className="mt-2 space-y-1">
            {STAT_KEYS.map((key) => (
              <div key={key} className="flex justify-between text-[11px]">
                <span className="text-muted">{STAT_META[key].label}</span>
                <span className="font-display tabular-nums text-parchment/80">
                  {game.stats[key].toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-1 text-[11px]">
              <span className="text-muted">국력</span>
              <span className="font-display tabular-nums text-parchment/80">{summary?.power}</span>
            </div>
          </div>
        </details>
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
