import type { AiProvider, AiProviderId } from '../types'
import { anthropicProvider } from './anthropic'

/**
 * 제공자 레지스트리.
 *
 * M2b-1 은 Anthropic 하나만 구현한다. 다른 제공자를 붙일 때는
 * AiProvider 를 구현한 객체를 여기 등록하기만 하면 되고,
 * 호출부(aiStore)는 손대지 않는다.
 */
export const AI_PROVIDERS: Partial<Record<AiProviderId, AiProvider>> = {
  anthropic: anthropicProvider,
  // openai:  예약
  // google:  예약
  // local:   예약
}

export const DEFAULT_PROVIDER_ID: AiProviderId = 'anthropic'

export function getProvider(id: AiProviderId): AiProvider | undefined {
  return AI_PROVIDERS[id]
}
