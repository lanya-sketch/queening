interface StatBarProps {
  label: string
  value: number
  bar: string
  max?: number
  /** 값 옆에 붙는 짧은 경고 문구. */
  warning?: string
  /** 굵게 강조. 핵심 지표에 쓴다. */
  emphasis?: boolean
  /** 값 뒤에 붙는 보조 표기(예: 상한). */
  suffix?: string
}

export function StatBar({ label, value, bar, max = 100, warning, emphasis, suffix }: StatBarProps) {
  const ratio = Math.max(0, Math.min(1, value / max))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={emphasis ? 'font-semibold text-slate-100' : 'text-slate-300'}>
          {label}
        </span>
        <span className={`tabular-nums ${emphasis ? 'text-slate-100' : 'text-slate-400'}`}>
          {warning && <span className="mr-1.5 text-amber-400">{warning}</span>}
          {/* 평소 UI 는 정수로 — 정확한 소수는 상세(내부값) 섹션에서 본다(월 단위 전환). */}
          {Math.round(value)}
          {suffix && <span className="text-slate-600"> {suffix}</span>}
        </span>
      </div>
      <div
        className={`mt-1 w-full overflow-hidden rounded-full bg-slate-800 ${
          emphasis ? 'h-2' : 'h-1.5'
        }`}
      >
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
