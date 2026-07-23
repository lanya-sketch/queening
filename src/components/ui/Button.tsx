import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

/** 토큰만 참조한다 — 화면마다 다른 금빛이 나오지 않도록. */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 font-title font-bold tracking-wide disabled:from-ink-700 disabled:to-ink-700 disabled:text-muted',
  ghost: 'border border-line-gold/70 text-parchment active:bg-ink-800 disabled:text-faint',
  danger: 'border border-peril/50 text-peril-soft active:bg-peril/10',
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
