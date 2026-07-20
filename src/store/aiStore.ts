import { create } from 'zustand'
import { clampReply } from '../ai/clamp'
import { setAiAvailable } from '../systems/aiGate'
import {
  clearKey,
  loadBaseUrl,
  loadKey,
  loadModel,
  loadProviderId,
  saveBaseUrl,
  saveKey,
  saveModel,
  saveProviderId,
} from '../ai/keyStore'
import { loadGeneration, saveGeneration } from '../ai/keyStore'
import { DEFAULT_PROVIDER_ID, getProvider } from '../ai/providers'
import { AiError, DEFAULT_GENERATION, describeAiError } from '../ai/types'
import type {
  AiGenerationSettings,
  AiProviderId,
  AiRequest,
  AiStreamHandler,
  ClampedReply,
} from '../ai/types'

/**
 * AI 인프라 스토어 (M2b-1).
 *
 * 게임 스토어(gameStore)와 분리한다 — 키가 없거나 호출이 실패해도
 * 코어 게임은 완전히 동작해야 하기 때문이다. gameStore 는 이 파일을
 * 참조하지 않는다.
 *
 * 제공자별 분기는 어댑터 안에만 있다. 이 파일은 어느 제공자든
 * 같은 AiReply 를 받아 같은 clamp 를 태운다.
 */

export type AiStatus = 'idle' | 'testing' | 'sending'

interface AiStore {
  providerId: AiProviderId
  apiKey: string
  model: string
  baseUrl: string
  generation: AiGenerationSettings
  status: AiStatus
  /** 마지막 연결 테스트 결과. null = 아직 시험하지 않음. */
  lastTestOk: boolean | null
  lastMessage: string | null
  /** 마지막 호출에서 clamp 가 잘라낸 내역. 개발 중 확인용. */
  lastRejected: ClampedReply['rejected']

  setProviderId: (id: AiProviderId) => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setBaseUrl: (baseUrl: string) => void
  setGeneration: (patch: Partial<AiGenerationSettings>) => void
  persistSettings: () => void
  forgetKey: () => void
  testConnection: () => Promise<void>
  /** 실제 호출. 델타는 clamp 를 거친 뒤 반환된다. */
  send: (request: AiRequest) => Promise<ClampedReply | null>
  /**
   * 원문(대사 + META)을 그대로 돌려주는 스트리밍 호출.
   * 대화 화면이 쓰며, 파싱·클램핑은 호출자가 화면별 규칙으로 수행한다.
   */
  streamRaw: (request: AiRequest, onDelta: AiStreamHandler) => Promise<string>
  /** 현재 모델이 샘플링 파라미터를 받는지. */
  samplingSupported: () => boolean
}

function settingsFor(id: AiProviderId) {
  const provider = getProvider(id)
  return {
    apiKey: loadKey(id),
    model: loadModel(id) || provider?.defaultModel || '',
    baseUrl: loadBaseUrl(id) || provider?.defaultBaseUrl || '',
  }
}

const initialProvider = loadProviderId() ?? DEFAULT_PROVIDER_ID

export const useAi = create<AiStore>()((set, get) => ({
  providerId: initialProvider,
  ...settingsFor(initialProvider),
  generation: { ...DEFAULT_GENERATION, ...loadGeneration() },
  status: 'idle',
  lastTestOk: null,
  lastMessage: null,
  lastRejected: [],

  setProviderId: (id) => {
    saveProviderId(id)
    set({ providerId: id, ...settingsFor(id), lastTestOk: null, lastMessage: null })
  },

  setApiKey: (apiKey) => set({ apiKey, lastTestOk: null, lastMessage: null }),
  setModel: (model) => set({ model, lastTestOk: null, lastMessage: null }),
  setBaseUrl: (baseUrl) => set({ baseUrl, lastTestOk: null, lastMessage: null }),
  setGeneration: (patch) => set({ generation: { ...get().generation, ...patch } }),

  persistSettings: () => {
    const { providerId, apiKey, model, baseUrl, generation } = get()
    const ok = saveKey(providerId, apiKey)
    saveModel(providerId, model)
    saveBaseUrl(providerId, baseUrl)
    saveGeneration(generation)
    set({ lastMessage: ok ? '설정을 저장했습니다.' : '저장하지 못했습니다.' })
  },

  samplingSupported: () => {
    const { providerId, model } = get()
    return getProvider(providerId)?.supportsSampling(model) ?? false
  },

  forgetKey: () => {
    const { providerId } = get()
    clearKey(providerId)
    set({ apiKey: '', lastTestOk: null, lastMessage: '키를 삭제했습니다.' })
  },

  testConnection: async () => {
    const { providerId, apiKey, model, baseUrl } = get()
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
      const result = await provider.send(
        { apiKey, model, baseUrl, generation: get().generation },
        {
          systemPrompt:
            '너는 연결 확인용 응답기다. 다른 말 없이 정확히 "연결됨" 이라고만 답하라.',
          messages: [{ role: 'user', content: '연결 확인' }],
          structured: false,
        },
      )
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

  streamRaw: async (request, onDelta) => {
    const { providerId, apiKey, model, baseUrl, generation } = get()
    const provider = getProvider(providerId)
    if (!provider || !apiKey.trim()) throw new AiError('no_key', 'API 키가 없습니다.')

    set({ status: 'sending' })
    try {
      let full = ''
      await provider.send(
        { apiKey, model, baseUrl, generation },
        { ...request, structured: false },
        (chunk, accumulated) => {
          full = accumulated
          onDelta(chunk, accumulated)
        },
      )
      return full
    } finally {
      set({ status: 'idle' })
    }
  },

  send: async (request) => {
    const { providerId, apiKey, model, baseUrl, generation } = get()
    const provider = getProvider(providerId)
    if (!provider || !apiKey.trim()) {
      set({ lastMessage: 'API 키가 없어 AI 기능을 쓸 수 없습니다.' })
      return null
    }

    set({ status: 'sending', lastMessage: null })
    try {
      const result = await provider.send(
        { apiKey, model, baseUrl, generation },
        { ...request, structured: true },
      )
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

/**
 * 키 유무를 엔진 쪽 게이트에 흘려보낸다.
 *
 * 이벤트 엔진은 순수 함수라 스토어를 볼 수 없다. 그래서 키가 바뀔 때마다
 * 불리언 하나만 건너편에 놓아 준다 — 돌발 현안이 키 없이 발동하지 않도록.
 * 구독을 한 곳에 두면 setApiKey·clearKey·saveSettings 를 각각 손댈 필요가 없다.
 */
setAiAvailable(useAi.getState().apiKey.trim().length > 0)
useAi.subscribe((state) => setAiAvailable(state.apiKey.trim().length > 0))
