import { create } from 'zustand'
import { clampReply } from '../ai/clamp'
import { clearKey, loadKey, loadProviderId, saveKey, saveProviderId } from '../ai/keyStore'
import { DEFAULT_PROVIDER_ID, getProvider } from '../ai/providers'
import { AiError, describeAiError } from '../ai/types'
import type { AiProviderId, AiRequest, ClampedReply } from '../ai/types'

/**
 * AI 인프라 스토어 (M2b-1).
 *
 * 게임 스토어(gameStore)와 분리한다 — 키가 없거나 호출이 실패해도
 * 코어 게임은 완전히 동작해야 하기 때문이다. gameStore 는 이 파일을
 * 참조하지 않는다.
 */

export type AiStatus = 'idle' | 'testing' | 'sending'

interface AiStore {
  providerId: AiProviderId
  apiKey: string
  status: AiStatus
  /** 마지막 연결 테스트 결과. null = 아직 시험하지 않음. */
  lastTestOk: boolean | null
  lastMessage: string | null
  /** 마지막 호출에서 clamp 가 잘라낸 내역. 개발 중 확인용. */
  lastRejected: ClampedReply['rejected']

  setProviderId: (id: AiProviderId) => void
  setApiKey: (key: string) => void
  persistKey: () => void
  forgetKey: () => void
  testConnection: () => Promise<void>
  /** 실제 호출. 델타는 clamp 를 거친 뒤 반환된다. */
  send: (request: AiRequest) => Promise<ClampedReply | null>
}

const initialProvider = loadProviderId() ?? DEFAULT_PROVIDER_ID

export const useAi = create<AiStore>()((set, get) => ({
  providerId: initialProvider,
  apiKey: loadKey(initialProvider),
  status: 'idle',
  lastTestOk: null,
  lastMessage: null,
  lastRejected: [],

  setProviderId: (id) => {
    saveProviderId(id)
    set({ providerId: id, apiKey: loadKey(id), lastTestOk: null, lastMessage: null })
  },

  setApiKey: (key) => set({ apiKey: key, lastTestOk: null, lastMessage: null }),

  persistKey: () => {
    const { providerId, apiKey } = get()
    const ok = saveKey(providerId, apiKey)
    set({ lastMessage: ok ? '키를 저장했습니다.' : '키를 저장하지 못했습니다.' })
  },

  forgetKey: () => {
    const { providerId } = get()
    clearKey(providerId)
    set({ apiKey: '', lastTestOk: null, lastMessage: '키를 삭제했습니다.' })
  },

  testConnection: async () => {
    const { providerId, apiKey } = get()
    const provider = getProvider(providerId)
    if (!provider) {
      set({ lastTestOk: false, lastMessage: '지원하지 않는 제공자입니다.' })
      return
    }
    if (!apiKey.trim()) {
      set({ lastTestOk: false, lastMessage: 'API 키를 먼저 입력하세요.' })
      return
    }

    set({ status: 'testing', lastMessage: null })
    try {
      const result = await provider.send(apiKey, {
        systemPrompt: '너는 연결 확인용 응답기다. 다른 말 없이 정확히 "연결됨" 이라고만 답하라.',
        messages: [{ role: 'user', content: '연결 확인' }],
        structured: false,
      })
      set({
        status: 'idle',
        lastTestOk: true,
        lastMessage: `연결됨 · ${result.model} · ${result.usage.outputTokens} 토큰`,
      })
    } catch (error) {
      const message =
        error instanceof AiError ? describeAiError(error) : '알 수 없는 오류입니다.'
      set({ status: 'idle', lastTestOk: false, lastMessage: message })
    }
  },

  send: async (request) => {
    const { providerId, apiKey } = get()
    const provider = getProvider(providerId)
    if (!provider || !apiKey.trim()) {
      set({ lastMessage: 'API 키가 없어 AI 기능을 쓸 수 없습니다.' })
      return null
    }

    set({ status: 'sending', lastMessage: null })
    try {
      const result = await provider.send(apiKey, { ...request, structured: true })
      const clamped = clampReply(result.reply)
      set({ status: 'idle', lastRejected: clamped.rejected })
      if (clamped.rejected.length) {
        console.warn('[ai] 모델 제안 일부를 잘라냈습니다.', clamped.rejected)
      }
      return clamped
    } catch (error) {
      const message =
        error instanceof AiError ? describeAiError(error) : '알 수 없는 오류입니다.'
      set({ status: 'idle', lastMessage: message })
      return null
    }
  },
}))

/** 키가 있는지 — AI 기능 노출 여부를 가르는 유일한 기준. */
export function useAiEnabled(): boolean {
  return useAi((s) => s.apiKey.trim().length > 0)
}
