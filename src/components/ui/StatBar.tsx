interface StatBarProps {
  label: string
  value: number
  bar: string
  max?: number
  /** 값 옆에 붙는 짧은 경고 문구. */
  warning?: string
}

export function StatBar({ label, value, bar, max = 100, warning }: StatBarProps) {
  const ratio = Math.max(0, Math.min(1, value / max))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-400">
          {warning && <span className="mr-1.5 text-amber-400">{warning}</span>}
          {value}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
