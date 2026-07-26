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

/** 날짜별 컷신의 장면당 자동 진행 대기(ms). '즉시'는 컷신 자체를 건너뛴다. */
export const CUTSCENE_DWELL_MS: Record<TextSpeed, number> = {
  느리게: 2400,
  보통: 1600,
  빠르게: 900,
  즉시: 0,
}

export const TEXT_SPEEDS: TextSpeed[] = ['느리게', '보통', '빠르게', '즉시']

const KEY = 'queening.options'

interface Persisted {
  textSpeed: TextSpeed
  cutsceneEnabled: boolean
}

function load(): Persisted {
  const fallback: Persisted = { textSpeed: '보통', cutsceneEnabled: true }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw)
      return {
        textSpeed: typeof o?.textSpeed === 'string' && o.textSpeed in SPEED_MS ? o.textSpeed : fallback.textSpeed,
        cutsceneEnabled: typeof o?.cutsceneEnabled === 'boolean' ? o.cutsceneEnabled : fallback.cutsceneEnabled,
      }
    }
  } catch {
    /* 무시 — 기본값으로 */
  }
  return fallback
}

interface OptionsStore {
  textSpeed: TextSpeed
  /** 날짜별 컷신을 켤지. 끄면 턴 결과 요약으로 바로 간다. */
  cutsceneEnabled: boolean
  setTextSpeed: (s: TextSpeed) => void
  setCutsceneEnabled: (on: boolean) => void
}

function persist(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패는 무시 — 세션 내에서는 적용된다 */
  }
}

export const useOptions = create<OptionsStore>()((set, get) => ({
  ...load(),
  setTextSpeed: (textSpeed) => {
    persist({ textSpeed, cutsceneEnabled: get().cutsceneEnabled })
    set({ textSpeed })
  },
  setCutsceneEnabled: (cutsceneEnabled) => {
    persist({ textSpeed: get().textSpeed, cutsceneEnabled })
    set({ cutsceneEnabled })
  },
}))
