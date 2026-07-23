import { useMemo } from 'react'
import { LockIcon } from './ui/Chrome'
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
    <div data-screen="gallery" className="fixed inset-0 z-50 flex flex-col bg-ink-950/97 backdrop-blur">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-title text-base font-semibold tracking-wide text-gold-300">엔딩 기록</h1>
          <span className="text-xs tabular-nums text-muted">
            {count} / {GALLERY_TOTAL} 달성
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="엔딩 기록 닫기"
          className="rounded-lg px-3 py-1 text-sm text-muted active:text-parchment"
        >
          닫기
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-3xl space-y-6">
          {GROUPS.map((group) => (
            <section key={group}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-title text-[17px] font-bold" style={{ color: '#E6C06E', letterSpacing: '.03em' }}>
                  {group}
                </h2>
                <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(214,179,96,.5),transparent)' }} />
              </div>
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

      <footer className="border-t border-line p-3">
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
      <div className="rounded-panel border border-line-gold/50 bg-ink-900/60 p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-title text-sm font-semibold text-gold-300">{item.title}</h3>
          <span
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: 'rgba(212,176,106,.12)', color: 'var(--color-gold-300)', letterSpacing: '.1em' }}
          >
            달성
          </span>
        </div>
        <p className="mt-2 text-[13px] italic leading-relaxed text-parchment">
          “{resolveText(item.scene, game)}”
        </p>
        <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-muted">
          {resolveText(item.summary, game)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-panel border border-line bg-ink-900/30 p-3.5">
      {/* 실루엣 — 잠긴 결말. */}
      {/*
        ★ 잠김은 앱 전체가 자물쇠 하나로 말한다.
          마름모는 이미 행동력(◆◆◆)과 구획 표식(◆)에 쓰이므로, 잠김까지 얹으면
          한 기호가 세 뜻을 갖게 된다. 활동 카드·선택지·착장·인연이 모두 자물쇠다.
      */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel text-muted"
        style={{ border: '1px solid rgba(212,176,106,.16)', background: 'rgba(255,255,255,.02)' }}
      >
        <LockIcon size={16} />
      </div>
      <div className="min-w-0">
        <h3 className="font-title truncate text-sm font-medium text-muted">
          {showTitle ? item.title : '???'}
        </h3>
        <p className="text-[11px] text-faint">아직 보지 못한 결말입니다.</p>
      </div>
    </div>
  )
}
