import { useState } from 'react'
import {
  exportSlot,
  importCode,
  listSlots,
  writeImportedToSlot,
  type ImportResult,
  type SlotSummary,
} from '../systems/save'
import type { GameState } from '../types/game'

/**
 * 세이브 내보내기 / 가져오기 (설정 오버레이 내부).
 *
 * 내보내기: 찬 슬롯을 한 줄 텍스트 코드로 → 파일 저장 / 클립보드 복사.
 * 가져오기: 코드 붙여넣기 / 파일 선택 → 검증(사유별 거부) → 슬롯 골라 쓰기(덮어쓰기 확인).
 * ★ 코어는 문자열 ↔ 슬롯이라 OS 파일창 없이도 왕복 검증이 된다.
 */
export function SaveTransferPanel() {
  const [open, setOpen] = useState<null | 'export' | 'import'>(null)

  return (
    <div className="rounded-xl border border-line bg-ink-900/40 p-3">
      <p className="mb-2 text-[11px] font-medium text-muted">세이브 내보내기 · 가져오기</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOpen(open === 'export' ? null : 'export')}
          aria-pressed={open === 'export'}
          data-transfer-export
          className={`min-h-[40px] rounded-lg border text-xs transition-colors ${
            open === 'export'
              ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
              : 'border-line bg-ink-800/60 text-parchment active:bg-ink-700'
          }`}
        >
          내보내기
        </button>
        <button
          onClick={() => setOpen(open === 'import' ? null : 'import')}
          aria-pressed={open === 'import'}
          data-transfer-import
          className={`min-h-[40px] rounded-lg border text-xs transition-colors ${
            open === 'import'
              ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
              : 'border-line bg-ink-800/60 text-parchment active:bg-ink-700'
          }`}
        >
          가져오기
        </button>
      </div>

      {open === 'export' && <ExportBody />}
      {open === 'import' && <ImportBody />}
    </div>
  )
}

// ── 내보내기 ───────────────────────────────────────────────
function ExportBody() {
  const [slots] = useState<SlotSummary[]>(() => listSlots())
  const [code, setCode] = useState<string | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const filled = slots.filter((s) => !s.empty)

  const onExport = (slot: number) => {
    const c = exportSlot(slot)
    if (!c) {
      setMsg('내보낼 수 없습니다.')
      return
    }
    setCode(c)
    setPicked(slot)
    setMsg(null)
  }

  const onDownload = () => {
    if (code == null || picked == null) return
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `queening-save-slot${picked + 1}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onCopy = async () => {
    if (code == null) return
    try {
      await navigator.clipboard.writeText(code)
      setMsg('복사했습니다.')
    } catch {
      setMsg('복사에 실패했습니다. 아래 코드를 직접 선택해 복사하세요.')
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {filled.length === 0 ? (
        <p className="text-[11px] text-faint">내보낼 세이브가 없습니다.</p>
      ) : (
        <>
          <p className="text-[11px] text-muted">내보낼 슬롯</p>
          <div className="space-y-1.5">
            {filled.map((s) => (
              <button
                key={s.slot}
                onClick={() => onExport(s.slot)}
                aria-pressed={picked === s.slot}
                data-export-slot={s.slot}
                className={`block w-full truncate rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${
                  picked === s.slot
                    ? 'border-line-gold/70 bg-ink-700/40 text-gold-300'
                    : 'border-line bg-ink-800/50 text-parchment active:bg-ink-700'
                }`}
              >
                슬롯 {s.slot + 1} · {s.monarchName} · {s.age}세
              </button>
            ))}
          </div>
        </>
      )}

      {code != null && (
        <>
          <textarea
            readOnly
            value={code}
            data-export-code
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 h-16 w-full resize-none rounded-lg border border-line bg-black/30 p-2 text-[10px] text-parchment/80"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onDownload}
              className="min-h-[38px] rounded-lg border border-line bg-ink-800/60 text-xs text-parchment active:bg-ink-700"
            >
              파일로 저장
            </button>
            <button
              onClick={onCopy}
              className="min-h-[38px] rounded-lg border border-line bg-ink-800/60 text-xs text-parchment active:bg-ink-700"
            >
              복사
            </button>
          </div>
        </>
      )}
      {msg && <p className="text-[11px] text-gold-300/80">{msg}</p>}
    </div>
  )
}

// ── 가져오기 ───────────────────────────────────────────────
function ImportBody() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [slots, setSlots] = useState<SlotSummary[]>(() => listSlots())
  const [confirmSlot, setConfirmSlot] = useState<number | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const onFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const onValidate = () => {
    setDone(null)
    setConfirmSlot(null)
    const r = importCode(text)
    setResult(r)
    setState(r.ok ? (r.state ?? null) : null)
  }

  const writeTo = (slot: number) => {
    if (!state) return
    writeImportedToSlot(slot, state)
    setSlots(listSlots())
    setConfirmSlot(null)
    setDone(`${slot + 1}번 슬롯에 저장했습니다.`)
  }

  const onPickSlot = (s: SlotSummary) => {
    if (s.empty) writeTo(s.slot)
    else setConfirmSlot(s.slot)
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="세이브 코드를 붙여넣으세요"
        data-import-code
        className="h-16 w-full resize-none rounded-lg border border-line bg-black/30 p-2 text-[10px] text-parchment/90 placeholder:text-faint"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-line bg-ink-800/60 text-xs text-parchment active:bg-ink-700">
          파일 선택
          <input
            type="file"
            accept=".txt,.json,text/plain,application/json"
            data-import-file
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <button
          onClick={onValidate}
          disabled={!text.trim()}
          data-import-validate
          className="min-h-[38px] rounded-lg border border-line-gold/60 bg-ink-700/40 text-xs text-gold-300 disabled:border-line/50 disabled:text-faint active:bg-ink-700/50"
        >
          가져오기
        </button>
      </div>

      {/* 검증 실패 — 사유를 그대로 보여준다. */}
      {result && !result.ok && (
        <p data-import-error className="text-[11px] text-peril-soft">
          {result.reason}
        </p>
      )}

      {/* 검증 통과 — 요약 + 쓸 슬롯 선택. */}
      {result?.ok && state && !done && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gold-300/80">
            불러올 수 있습니다 — {(state as any).monarchName} · {(state as any).age}세. 저장할 슬롯을 고르세요.
          </p>
          {slots.map((s) =>
            confirmSlot === s.slot ? (
              <div
                key={s.slot}
                className="rounded-lg border border-peril/50 bg-peril/10 px-2.5 py-2"
              >
                <p className="text-[11px] text-peril-soft">{s.slot + 1}번 슬롯을 덮어쓸까요?</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => writeTo(s.slot)}
                    data-import-overwrite
                    className="min-h-[34px] rounded border border-peril/50 text-[11px] text-peril-soft active:bg-peril/20"
                  >
                    덮어쓰기
                  </button>
                  <button
                    onClick={() => setConfirmSlot(null)}
                    className="min-h-[34px] rounded border border-line bg-ink-800/60 text-[11px] text-parchment"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={s.slot}
                onClick={() => onPickSlot(s)}
                data-import-slot={s.slot}
                className="block w-full truncate rounded-lg border border-line bg-ink-800/50 px-3 py-2 text-left text-[12px] text-parchment active:bg-ink-700"
              >
                슬롯 {s.slot + 1} ·{' '}
                {s.empty ? (
                  <span className="text-faint">비어 있음</span>
                ) : (
                  <span className="text-muted">
                    {s.monarchName} · {s.age}세
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}

      {done && <p className="text-[11px] text-gold-300/80">{done}</p>}
    </div>
  )
}
