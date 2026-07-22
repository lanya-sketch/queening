import { create } from 'zustand'

/**
 * 옵션 (D-3) — 편의 설정. **게임 세이브와 분리된 별도 키**라 회차·기기 설정으로 남는다.
 */
export type TextSpeed = '느리게' | '보통' | '빠르게' | '즉시'

/** 글자당 밀리초. '즉시'는 타이핑 없이 바로 전체 표시. */
export const SPEED_MS: Record<TextSpeed, number> = {
  느리게: 55,
  보통: 28,
  빠르게: 12,
  즉시: 0,
}

export const TEXT_SPEEDS: TextSpeed[] = ['느리게', '보통', '빠르게', '즉시']

const KEY = 'queening.options'

function loadSpeed(): TextSpeed {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw)
      if (typeof o?.textSpeed === 'string' && o.textSpeed in SPEED_MS) return o.textSpeed
    }
  } catch {
    /* 무시 — 기본값으로 */
  }
  return '보통'
}

interface OptionsStore {
  textSpeed: TextSpeed
  setTextSpeed: (s: TextSpeed) => void
}

export const useOptions = create<OptionsStore>()((set) => ({
  textSpeed: loadSpeed(),
  setTextSpeed: (textSpeed) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ textSpeed }))
    } catch {
      /* 저장 실패는 무시 — 세션 내에서는 적용된다 */
    }
    set({ textSpeed })
  },
}))
