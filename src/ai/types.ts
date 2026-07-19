import type { GaugeKey, StatKey } from '../types/game'

/**
 * AI 인프라의 공용 계약 (M2b-1).
 *
 * 역할 경계 — M2b 전체에서 불변:
 *   코드가 소유: 모든 수치(스탯·게이지·flag), 큰 분기, 진실의 골격.
 *   AI가 생성: 그 상태에 놓인 인물의 대사·반응·태도.
 * AI 는 델타를 "제안"할 뿐이고, 반영 여부와 크기는 코드가 정한다(clamp.ts).
 */

/** 제공자 어댑터. 1차는 anthropic 만 구현하고 나머지는 자리만 예약한다. */
export type AiProviderId = 'anthropic' | 'openai' | 'google' | 'local'

/** AI 가 제안할 수 있는 델타의 대상. 스탯과 게이지만 허용한다. */
export type AiDeltaTarget = StatKey | GaugeKey

export interface AiDelta {
  target: AiDeltaTarget
  amount: number
}

/** 모델이 돌려주는 구조화 응답. */
export interface AiReply {
  /** 인물의 대사·서술. 이것이 화면에 나간다. */
  reply: string
  /** 상태 변화 제안. 코드가 clamp 한 뒤에만 반영된다. */
  deltas: AiDelta[]
}

/** 델타가 clamp 를 거친 결과. 무엇이 잘렸는지까지 남긴다. */
export interface ClampedReply {
  reply: string
  deltas: AiDelta[]
  /** 버려지거나 축소된 제안. 디버깅·감사용. */
  rejected: { target: string; amount: number; reason: string }[]
}

export interface AiRequest {
  /** 인물 시트 + 규칙. 매 호출 주입되어 일관성을 유지한다. */
  systemPrompt: string
  /** 지금까지의 대화. 코드가 소유한다(모델이 기억하지 않는다). */
  messages: { role: 'user' | 'assistant'; content: string }[]
  /** 구조화 응답을 요구할지. false 면 평문만 받는다(연결 테스트 등). */
  structured?: boolean
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

export interface AiResult {
  reply: AiReply
  usage: AiUsage
  model: string
}

/** 제공자 구현이 지켜야 할 인터페이스. */
export interface AiProvider {
  id: AiProviderId
  label: string
  /** 키 형식에 대한 간단한 사전 검사(오타 조기 발견용, 인증이 아님). */
  looksLikeKey: (key: string) => boolean
  /** 실제 호출. 실패는 AiError 로 던진다. */
  send: (key: string, request: AiRequest) => Promise<AiResult>
}

export type AiErrorKind =
  | 'no_key'
  | 'auth'
  | 'rate_limit'
  | 'network'
  | 'refusal'
  | 'bad_response'
  | 'unknown'

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AiError'
  }
}

/** 사용자에게 보여줄 한국어 안내. */
export function describeAiError(error: AiError): string {
  switch (error.kind) {
    case 'no_key':
      return 'API 키가 없습니다. 설정에서 키를 입력하세요.'
    case 'auth':
      return '키가 거부되었습니다. 값을 다시 확인하세요.'
    case 'rate_limit':
      return '요청이 너무 잦습니다. 잠시 뒤 다시 시도하세요.'
    case 'network':
      return '연결에 실패했습니다. 네트워크를 확인하세요.'
    case 'refusal':
      return '모델이 응답을 거절했습니다.'
    case 'bad_response':
      return '응답 형식이 올바르지 않습니다.'
    default:
      return '알 수 없는 오류입니다.'
  }
}
