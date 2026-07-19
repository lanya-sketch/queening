import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-amber-500 text-slate-950 font-semibold active:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500',
  ghost: 'border border-slate-700 text-slate-200 active:bg-slate-800 disabled:text-slate-600',
  danger: 'border border-red-900 text-red-300 active:bg-red-950',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** hover 에 의존하지 않는다. 상태 표현은 active/aria 로만. */
export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`min-h-[44px] rounded-lg px-4 text-sm transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  )
}
