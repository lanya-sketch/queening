import { useState } from 'react'
import { Rule } from './ui/Chrome'
import { listSlots, type SlotSummary } from '../systems/save'
import { useApp } from '../store/appStore'
import { useGame } from '../store/gameStore'

/**
 * 세이브 슬롯 화면 (다중 슬롯).
 *
 * 저장 모드: 빈 칸은 바로 저장, 찬 칸은 인라인으로 한 번 더 묻고 덮어쓴다.
 * 불러오기 모드: 찬 칸만 누를 수 있다. 타이틀에서 열렸으면 불러온 뒤 게임으로 들어간다.
 * ★ 슬롯은 세이브 키(queening.save.slotN)만 만진다 — 갤러리·읽음기록·옵션은 별개 키라 무관.
 */
export function SlotScreen() {
  const mode = useApp((s) => s.slotScreen)
  const close = useApp((s) => s.closeSlotScreen)
  const screen = useApp((s) => s.screen)
  const startGame = useApp((s) => s.startGame)
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const activeSlot = useGame((s) => s.activeSlot)

  // 리스트는 저장/삭제 때마다 다시 읽는다(요약은 저장 안 하고 파생하므로).
  const [slots, setSlots] = useState<SlotSummary[]>(() => listSlots())
  const [confirmSlot, setConfirmSlot] = useState<number | null>(null)

  if (!mode) return null
  const isSave = mode === 'save'

  const doSave = (slot: number) => {
    save(slot)
    setSlots(listSlots())
    setConfirmSlot(null)
    close()
  }
  const doLoad = (slot: number) => {
    load(slot)
    close()
    // 타이틀에서 불러왔으면 온보딩 없이 게임으로 진입.
    if (screen === 'title') startGame(false)
  }

  const onPick = (s: SlotSummary) => {
    if (isSave) {
      if (s.empty) doSave(s.slot)
      else setConfirmSlot(s.slot)
      return
    }
    // 불러오기 — 비었거나 호환 불가면 무시.
    if (!s.empty && !s.incompatible) doLoad(s.slot)
  }

  return (
    <div
      data-screen="slots"
      data-slot-mode={mode}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-sm font-semibold tracking-wide text-gold-300">
            {isSave ? '저장' : '불러오기'}
          </h2>
          <button
            onClick={close}
            aria-label="닫기"
            data-slot-close
            className="text-xs text-muted active:text-parchment"
          >
            닫기
          </button>
        </div>

        <Rule />

        <div className="mt-4 space-y-2">
          {slots.map((s) => (
            <SlotRow
              key={s.slot}
              summary={s}
              mode={mode}
              active={s.slot === activeSlot}
              confirming={confirmSlot === s.slot}
              onPick={() => onPick(s)}
              onConfirm={() => doSave(s.slot)}
              onCancel={() => setConfirmSlot(null)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SlotRow({
  summary,
  mode,
  active,
  confirming,
  onPick,
  onConfirm,
  onCancel,
}: {
  summary: SlotSummary
  mode: 'save' | 'load'
  active: boolean
  confirming: boolean
  onPick: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const { slot, empty, monarchName, age, reignYear, reignMonth, savedAt, incompatible } = summary
  const isSave = mode === 'save'
  // 불러오기에선 빈 칸·호환 불가 칸은 누를 수 없다.
  const disabled = !isSave && (empty || !!incompatible)

  if (confirming) {
    return (
      <div
        data-slot={slot}
        className="rounded-xl border border-peril/50 bg-peril/10 px-3.5 py-3"
      >
        <p className="text-[12px] text-peril-soft">
          {slot + 1}번 슬롯을 덮어쓸까요? 이 슬롯의 기록은 사라집니다.
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            onClick={onConfirm}
            data-slot-overwrite
            className="min-h-[40px] rounded-lg border border-peril/50 text-xs text-peril-soft active:bg-peril/20"
          >
            덮어쓰기
          </button>
          <button
            onClick={onCancel}
            className="min-h-[40px] rounded-lg border border-line bg-ink-800/60 text-xs text-parchment active:bg-ink-700"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onPick}
      disabled={disabled}
      data-slot={slot}
      data-slot-empty={empty ? 'true' : 'false'}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
        disabled
          ? 'cursor-not-allowed border-line/50 bg-ink-900/30'
          : active
            ? 'border-line-gold/70 bg-ink-700/40 active:bg-ink-700/50'
            : 'border-line bg-ink-800/50 active:bg-ink-700'
      }`}
    >
      <span
        className={`font-title text-[11px] tracking-widest ${
          active ? 'text-gold-300' : 'text-muted'
        }`}
      >
        슬롯 {slot + 1}
      </span>
      <span className="min-w-0 flex-1">
        {empty ? (
          <span className="text-[12px] text-faint">비어 있음</span>
        ) : incompatible ? (
          <span className="text-[12px] text-peril-soft">호환 불가 (최신 버전 세이브)</span>
        ) : (
          <>
            <span className="block truncate text-[13px] text-parchment">
              {monarchName} · {age}세 · 즉위 {reignYear}년 {reignMonth}월
            </span>
            {savedAt && (
              <span className="mt-0.5 block text-[10.5px] text-faint">
                {new Date(savedAt).toLocaleString('ko-KR')}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  )
}
