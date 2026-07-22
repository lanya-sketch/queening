import { useMemo } from 'react'
import { GALLERY, GALLERY_TOTAL, type GalleryGroup, type GalleryItem } from '../data/gallery'
import { getAchieved } from '../systems/gallery'
import { resolveText } from '../systems/text'
import { useGame } from '../store/gameStore'
import { Button } from './ui/Button'

const GROUPS: GalleryGroup[] = ['실권', '성향과 변주', '파국']

/**
 * 엔딩 갤러리 (D-2).
 *
 * ★ 달성한 큰 결말을 모아 보는 곳. 미달성은 실루엣 + 제목(스포일러 변주는 제목도 가림).
 *   달성 기록은 systems/gallery(별도 localStorage 키)라 회차에 걸쳐 누적된다.
 */
export function GalleryScreen({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game)
  // 마운트 시 한 번 읽는다(이 화면이 열려 있는 동안 기록이 바뀌지 않는다).
  const achieved = useMemo(() => getAchieved(), [])
  const count = achieved.size

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/97 backdrop-blur">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold tracking-wide text-amber-100">엔딩 기록</h1>
          <span className="text-xs tabular-nums text-slate-400">
            {count} / {GALLERY_TOTAL} 달성
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="엔딩 기록 닫기"
          className="rounded-lg px-3 py-1 text-sm text-slate-400 active:text-slate-100"
        >
          닫기
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-3xl space-y-6">
          {GROUPS.map((group) => (
            <section key={group}>
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-slate-500">{group}</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GALLERY.filter((it) => it.group === group).map((item) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    done={achieved.has(item.id)}
                    game={game}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="border-t border-slate-800 p-3">
        <div className="mx-auto max-w-3xl">
          <Button variant="primary" className="w-full" onClick={onClose}>
            닫는다
          </Button>
        </div>
      </footer>
    </div>
  )
}

function GalleryCard({
  item,
  done,
  game,
}: {
  item: GalleryItem
  done: boolean
  game: Parameters<typeof resolveText>[1]
}) {
  // 스포일러 변주는 달성 전까지 제목까지 가린다. 그 외는 제목을 보여 도전 목표가 되게 한다.
  const showTitle = done || !item.spoiler

  if (done) {
    return (
      <div className="rounded-xl border border-amber-800/50 bg-slate-900/60 p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-100">{item.title}</h3>
          <span className="text-[10px] tracking-wider text-amber-500">달성</span>
        </div>
        <p className="mt-2 text-[13px] italic leading-relaxed text-slate-300">
          “{resolveText(item.scene, game)}”
        </p>
        <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">
          {resolveText(item.summary, game)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3.5">
      {/* 실루엣 — 잠긴 결말. */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
        <span className="text-lg">🔒</span>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-slate-500">
          {showTitle ? item.title : '???'}
        </h3>
        <p className="text-[11px] text-slate-600">아직 보지 못한 결말입니다.</p>
      </div>
    </div>
  )
}
