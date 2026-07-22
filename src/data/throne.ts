/**
 * 진행 가시성 — 실권(국정 영향도) 구간에 따른 초상 배경 (D-2).
 *
 * ★ 타이틀의 빈 옥좌가 게임 내내 배경으로 이어지며 "채워지는" 상징. 실권이 오를수록
 *   초상 뒤가 밝아지고 옥좌의 온기가 돈다. 숫자가 아니라 **분위기**로 느끼게 한다.
 *
 * ★ 배경 에셋은 아직 없다 — 지금은 CSS 시각효과(effectClass)로 대체한다. 나중에 구간별
 *   배경 그림을 뽑으면 assetSrc 만 채우면 되도록 분리해 둔다(착장 매니페스트와 같은 구조).
 *   "영향도 구간 → 배경 상태" 연결 로직은 지금 완성한다.
 */
export type ThroneTier = 'puppet' | 'coexist' | 'autonomy'

// ENDING_THRESHOLDS 와 같은 경계(친정 70 / 공존 45). 초상 배경도 같은 구간을 쓴다.
export function throneTier(influence: number): ThroneTier {
  if (influence >= 70) return 'autonomy'
  if (influence >= 45) return 'coexist'
  return 'puppet'
}

export interface ThroneBackdrop {
  /** 초상 프레임 테두리·글로우. */
  ring: string
  /** 초상 뒤(옥좌) 분위기 그라디언트. */
  backdrop: string
  /** 초상 이미지 밝기/채도 필터. */
  imgFilter: string
  /** 접근성·검증용 라벨(숨은 상태라 화면 텍스트로는 안 쓴다). */
  label: string
  /** 나중에 배경 그림을 뽑으면 여기에 경로를 채운다. 지금은 없음 → effect 로 대체. */
  assetSrc?: string
}

export const THRONE_BACKDROP: Record<ThroneTier, ThroneBackdrop> = {
  // 허수아비 — 옥좌에서 멀리·어둡게. 실권이 없다.
  puppet: {
    ring: 'border-slate-700',
    backdrop: 'bg-gradient-to-b from-slate-900 to-slate-950',
    imgFilter: 'brightness-[0.78] saturate-[0.8]',
    label: '허수아비 — 실권 없음',
  },
  // 공존 — 옥좌 앞·중간. 반쯤 쥠.
  coexist: {
    ring: 'border-amber-800/50',
    backdrop: 'bg-gradient-to-b from-slate-800 to-amber-950/30',
    imgFilter: 'brightness-[0.92]',
    label: '공존 — 반쯤 쥔 실권',
  },
  // 친정 — 옥좌에 앉음·밝게. 실권을 장악했다.
  autonomy: {
    ring: 'border-amber-500/70 shadow-[0_0_18px_-2px_rgba(245,158,11,0.5)]',
    backdrop: 'bg-gradient-to-b from-amber-800/40 to-amber-600/10',
    imgFilter: 'brightness-[1.06]',
    label: '친정 — 실권 장악',
  },
}
