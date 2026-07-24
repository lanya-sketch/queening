import type { ReactNode } from 'react'
import type { GaugeView } from '../../systems/display'

/**
 * ★ 리디자인 공통 조각 (UI 리디자인 1단계).
 *
 * 시안에서 반복되던 세 가지 — 금빛 실선·Cinzel 소제목·패널 — 을 컴포넌트로 뽑았다.
 * 화면마다 같은 그라데이션을 손으로 다시 쓰면 반드시 조금씩 달라진다.
 */

/** 금빛 실선 + 마름모. 제목 옆에 붙어 구획을 나눈다. */
export function Rule({ tone = 'gold' }: { tone?: 'gold' | 'peril' }) {
  const c = tone === 'peril' ? 'rgba(200,155,106,.3)' : 'rgba(212,176,106,.3)'
  return (
    <span
      aria-hidden
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, ${c}, transparent)` }}
    />
  )
}

/** Cinzel 대문자 소제목. 라틴 자간이 이 게임의 서명이다. */
export function SectionLabel({
  children,
  tone = 'gold',
}: {
  children: ReactNode
  tone?: 'gold' | 'muted' | 'peril'
}) {
  const color =
    tone === 'muted' ? 'var(--color-muted)'
    : tone === 'peril' ? '#c89b6a'
    : 'var(--color-gold-300)'
  return (
    <span
      className="font-display text-[11px] uppercase"
      style={{ letterSpacing: '.22em', color }}
    >
      {children}
    </span>
  )
}

/** 소제목 + 실선 한 줄. */
export function SectionHead({
  children,
  tone = 'gold',
  className = '',
}: {
  children: ReactNode
  tone?: 'gold' | 'muted' | 'peril'
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SectionLabel tone={tone}>{children}</SectionLabel>
      <Rule tone={tone === 'peril' ? 'peril' : 'gold'} />
    </div>
  )
}

/**
 * 패널 — 테두리 + 그림자 + 라운드. 화면마다 손으로 다시 쓰던 조합.
 *   tone='gold' 는 "사건이 일어난 자리"처럼 눈길이 가야 하는 상자.
 */
export function Panel({
  children,
  className = '',
  tone = 'plain',
}: {
  children: ReactNode
  className?: string
  tone?: 'plain' | 'gold'
}) {
  return (
    <section
      className={`rounded-panel border p-4 ${className}`}
      style={{
        borderColor: tone === 'gold' ? 'rgba(212,176,106,.34)' : 'rgba(212,176,106,.16)',
        background:
          tone === 'gold'
            ? 'linear-gradient(180deg,rgba(212,176,106,.07),rgba(212,176,106,.02))'
            : 'linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012))',
        boxShadow: '0 12px 34px rgba(0,0,0,.4)',
      }}
    >
      {children}
    </section>
  )
}

/** 금빛 주요 버튼. 화면마다 하나씩 있는 "다음으로" 자리. */
export function PrimaryAction({
  children,
  onClick,
  className = '',
  disabled,
  ...rest
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
} & Record<string, unknown>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-panel border px-10 py-3.5 font-title text-[16px] font-bold lg:w-auto ${className}`}
      style={{
        borderColor: disabled ? 'rgba(212,176,106,.2)' : 'rgba(212,176,106,.55)',
        color: disabled ? 'var(--color-muted)' : '#1a1208',
        letterSpacing: '.08em',
        background: disabled
          ? 'rgba(255,255,255,.03)'
          : 'linear-gradient(180deg,#F3DBA1,#D4B06A)',
        boxShadow: disabled ? 'none' : '0 14px 34px -12px rgba(212,176,106,.6)',
        cursor: disabled ? 'progress' : undefined,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * ★ 아이콘은 이모지가 아니라 인라인 SVG (UI 리디자인 2단계).
 *
 *   이모지(🔒·⚙)는 OS 폰트가 그리므로 색을 못 물려받고, 노란 사각으로 튀어 화면 톤을 깬다.
 *   플랫폼마다 모양도 다르다. SVG 는 currentColor 를 따르고 크기도 자유롭다.
 *   에셋 파일을 두지 않는 이유: 아이콘 두 개 때문에 네트워크 요청과 경로 관리가 생긴다.
 */
export function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block shrink-0 align-[-0.12em]"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function GearIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1" />
    </svg>
  )
}

/** 잠긴 것 — 자물쇠 + 사유. 활동 카드·선택지가 같은 모양을 쓴다. */
export function LockedNote({ children }: { children: ReactNode }) {
  return (
    <span className="mt-3 flex items-start gap-1.5 text-[11.5px] text-faint">
      <span className="mt-[1px]">
        <LockIcon />
      </span>
      <span>{children}</span>
    </span>
  )
}

/** 마름모 하나. 목록 머리표·장식에 쓴다. */
export function Lozenge({ size = 6, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rotate-45"
      style={{
        width: size,
        height: size,
        background: 'var(--color-gold-400)',
        opacity: dim ? 0.55 : 1,
      }}
    />
  )
}

/**
 * 게이지 한 줄 — **수치를 글자로 내보내지 않는다.**
 * 오른쪽에 붙는 것은 질적 라벨이고, 정확한 값은 data-value 에만 심는다
 * (하네스가 읽는 자리. 화면에는 안 보인다).
 */
export function Gauge({ view, hint }: { view: GaugeView; hint?: string }) {
  const { key, label, value, band, pct, color, capPct } = view
  return (
    <div
      data-gauge={key}
      data-value={value.toFixed(2)}
      data-band={band.label}
      className="select-none"
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] text-parchment/85">{label}</span>
        <span
          className="text-[12px]"
          style={{ color: band.peril ? 'var(--color-peril-soft)' : 'var(--color-gold-300)' }}
        >
          {band.label}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-sm bg-white/6">
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 7px ${color}` }}
        />
        {/*
          ★ 지금 나이에 닿을 수 있는 한계선.
            막대를 나이 상한에 맞춰 늘리면 "미미함(30)"인데 막대가 60% 차 보여
            같은 값을 막대와 라벨이 다르게 말한다. 그래서 막대는 항상 0~100 절대 눈금이고,
            상한은 눈금 위의 금이다 — "여기까지는 아직 갈 수 없다".
        */}
        {capPct !== undefined && capPct < 100 && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px"
            style={{ left: `${capPct}%`, background: 'rgba(212,176,106,.55)' }}
          />
        )}
      </div>
      {hint && <p className="mt-1 text-[10.5px] text-faint">{hint}</p>}
    </div>
  )
}

/** 난이도 별. 수업 등급이 자동 전환되면 이것도 따라 바뀐다. */
export function Stars({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`난이도 ${filled}/${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="text-[13px] leading-none"
          style={{ color: i < filled ? 'var(--color-gold-400)' : '#3B3325' }}
        >
          ◆
        </span>
      ))}
    </span>
  )
}

/** ▲▼ + 정도 한 조각. 수치는 절대 나오지 않는다. */
export function EffectPill({
  arrow,
  label,
  magnitude,
  good,
}: {
  arrow: string
  label: string
  magnitude: string
  good: boolean
}) {
  return (
    <span className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-parchment/70">
        <span style={{ color: good ? 'var(--color-gain)' : 'var(--color-loss)' }}>{arrow}</span>{' '}
        {label}
      </span>
      <span
        className="font-title text-[13px]"
        style={{ color: good ? 'var(--color-gain)' : 'var(--color-loss)' }}
      >
        {magnitude}
      </span>
    </span>
  )
}
