import { useEffect, useState } from 'react'
import { activityName, diaryLine } from '../../data/activityDiary'
import { ACTIVITY_BY_ID } from '../../data/activities'
import { monthLabel } from '../../data/config'
import { TEMPERAMENTS } from '../../data/temperaments'
import { CUTSCENE_DWELL_MS, useOptions } from '../../store/optionsStore'
import { useGame } from '../../store/gameStore'
import { monthlyWish, prefRelation } from '../../systems/parenting'
import { isPostAutonomy, standingMood } from '../../systems/rebellion'
import { resolveMonarchPortrait } from '../../systems/outfits'
import { SceneBackground } from './SceneBackground'
import { activityBgUrl, bgUrl } from '../../data/backgrounds'
import type { FlagSet } from '../../types/game'

/**
 * 날짜별 컷신 — 한 달이 눈앞에서 지나가게 (표현 층).
 *
 * ★ 고른 활동 수만큼 장면이 흐른다: 날짜 + 활동 + 한 줄 + 초상.
 *   자동 진행(장면당 dwell, 속도 옵션 연동) + 클릭하면 즉시 다음. '즉시'/끄기는 상위에서 건너뛴다.
 *   델타는 여기 안 뜬다 — 요약(ledger)과 중복을 피하고 분위기만 남긴다.
 */
function currentTemperament(flags: FlagSet): string | null {
  const t = TEMPERAMENTS.find((x) => flags[`temperament_${x.id}`])
  return t?.id ?? null
}

/** 민심 — people_relieved_ / people_burdened_ flag 의 균형. 외출 서술이 "장부가 아니라 얼굴"을 읽는다. */
function peopleMoodOf(flags: FlagSet): 'relieved' | 'burdened' | 'mixed' {
  const n = (prefix: string) => Object.keys(flags).filter((k) => k.startsWith(prefix) && flags[k]).length
  const relieved = n('people_relieved_')
  const burdened = n('people_burdened_')
  if (relieved > burdened) return 'relieved'
  if (burdened > relieved) return 'burdened'
  return 'mixed'
}

export function CutsceneScreen({ onDone }: { onDone: () => void }) {
  const game = useGame((s) => s.game)
  const manifest = useGame((s) => s.outfitManifest)
  const speed = useOptions((s) => s.textSpeed)
  const report = game.lastTurnReport
  const diary = report?.diary ?? []
  // ★ [2] 병(강제 휴식) 회복 월 — 고른 활동이 없으니 "앓아누웠다" 한 장면을 그린다.
  const bedrest = Boolean(report?.forcedRest) && diary.length === 0
  const count = bedrest ? 1 : diary.length
  const [i, setI] = useState(0)

  // 자동 진행 — dwell 후 다음 장면. 끝을 넘으면 요약으로.
  useEffect(() => {
    if (i >= count) {
      onDone()
      return
    }
    const dwell = CUTSCENE_DWELL_MS[speed] ?? 1600
    const t = setTimeout(() => setI((n) => n + 1), dwell)
    return () => clearTimeout(t)
  }, [i, count, speed, onDone])

  if (!report || i >= count) return null
  const entry = diary[i]
  // ★ [2] 선호 일치는 그 활동을 시킨 시점(report.date)의 wish 로 판정한다(현재 date 가 아니라).
  const playedGame = { ...game, date: report.date }
  const wish = monthlyWish(playedGame)
  const line = bedrest
    ? '결국 몸이 버티지 못했다. 이 달은 내내 자리보전을 했다. 곁에서 이마의 열을 짚어 줄 뿐이었다.'
    : diaryLine(entry.activityId, {
        tier: entry.tier,
        wellbeing: entry.wellbeing,
        durability: report.startDurability,
        age: report.startAge,
        luck: entry.luck,
        temperamentId: currentTemperament(game.flags),
        peopleMood: peopleMoodOf(game.flags),
        preferenceMatch: prefRelation(ACTIVITY_BY_ID[entry.activityId]?.pref, playedGame, wish),
        postAutonomy: isPostAutonomy(game),
        standing: standingMood(game),
      })
  const headerActivity = bedrest ? '앓아누운 달' : activityName(entry.activityId)
  const dateDay = bedrest ? 1 : entry.day
  const portrait = manifest.portraits
    ? resolveMonarchPortrait(manifest.portraits, game.monarchGender, report.startAge, game.currentOutfitId).fullSrc
    : null
  // ★ [10] 활동별 배경(컷신). 같은 달 같은 컷(안정 선택). 병(bedrest)은 처소. 없으면 폴백.
  const bgSrc = bedrest
    ? bgUrl('chamber', 'bedrest')
    : activityBgUrl(entry.activityId, `${entry.activityId}-${report.date.year}-${report.date.month}`)

  return (
    <div
      data-screen="cutscene"
      data-cutscene-index={i}
      onClick={() => setI((n) => n + 1)}
      className="relative flex min-h-[70vh] cursor-pointer select-none flex-col items-center justify-center overflow-hidden lg:min-h-0 lg:flex-1"
    >
      {/* ★ [10] 배경 그림(있으면) + 가독성 스크림. 없으면 상위 ink-950 그대로(폴백). */}
      <SceneBackground url={bgSrc} className="rounded-2xl" />
      {bgSrc && <div aria-hidden className="absolute inset-0 rounded-2xl bg-ink-950/55" />}
      {portrait && (
        <img
          key={(bedrest ? 'bedrest' : entry.activityId) + i}
          src={portrait}
          alt=""
          draggable={false}
          className="relative z-10 h-52 w-auto rounded-xl object-cover object-top opacity-95 lg:h-64"
          style={{ animation: 'cutscene-fade .4s ease-out' }}
        />
      )}
      <div key={i} className="relative z-10 mt-6 max-w-md text-center" style={{ animation: 'cutscene-fade .5s ease-out' }}>
        <p data-cutscene-date className="font-title text-sm tracking-wide text-gold-300">
          즉위 {report.date.year}년 {monthLabel(report.date.month)} {dateDay}일
        </p>
        <p data-cutscene-activity className="mt-1 font-title text-lg font-bold text-parchment">
          {headerActivity}
        </p>
        <p data-cutscene-line className="mt-3 text-[15px] leading-relaxed text-parchment/80">{line}</p>
      </div>
      <p className="relative z-10 mt-8 text-[11px] tabular-nums text-faint">
        {i + 1} / {count} · 눌러서 넘기기
      </p>
      <style>{`@keyframes cutscene-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
