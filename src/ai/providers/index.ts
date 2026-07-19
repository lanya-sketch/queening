import type { AiProvider, AiProviderId } from '../types'
import { anthropicProvider } from './anthropic'
import { openaiCompatibleProvider } from './openaiCompatible'

/**
 * 제공자 레지스트리.
 *
 * 새 제공자를 붙일 때는 AiProvider 를 구현해 여기 등록하기만 하면 되고,
 * 호출부(aiStore)와 클램핑은 손대지 않는다.
 *
 * google(Vertex/Gemini)은 아직 넣지 않았다 — 인증 방식이 다르고 브라우저에서의
 * CORS 정책을 실제로 확인해야 하므로, 붙일 때 검증과 함께 추가한다.
 */
export const AI_PROVIDERS: Partial<Record<AiProviderId, AiProvider>> = {
  anthropic: anthropicProvider,
  'openai-compatible': openaiCompatibleProvider,
  // google: 예약 — 브라우저 직접 호출 가능 여부 확인 후 추가
}

export const DEFAULT_PROVIDER_ID: AiProviderId = 'anthropic'

export function getProvider(id: AiProviderId): AiProvider | undefined {
  return AI_PROVIDERS[id]
}
