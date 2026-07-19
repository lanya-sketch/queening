import type { GaugeKey, StatKey } from '../types/game'

/**
 * AI 인프라의 공용 계약 (M2b-1).
 *
 * 역할 경계 — M2b 전체에서 불변:
 *   코드가 소유: 모든 수치(스탯·게이지·flag), 큰 분기, 진실의 골격.
 *   AI가 생성: 그 상태에 놓인 인물의 대사·반응·태도.
 * AI 는 델타를 "제안"할 뿐이고, 반영 여부와 크기는 코드가 정한다(clamp.ts).
 */

/**
 * 제공자 어댑터.
 *   anthropic         — 공식 SDK 사용
 *   openai-compatible — /chat/completions 표준 형식. OpenRouter·로컬 서버 등이 여기 붙는다.
 *   google            — 예약. 인증 방식이 달라 브라우저 호출 가능 여부를 먼저 확인해야 한다.
 */
export type AiProviderId = 'anthropic' | 'openai-compatible' | 'google'

export interface AiModelOption {
  id: string
  label: string
}

/**
 * 생성 파라미터.
 * maxTokens·contextTurns 는 비용에 직접 영향을 주고,
 * temperature·topP·topK 는 응답 성격만 바꾼다(비용 무관).
 */
export interface AiGenerationSettings {
  maxTokens: number
  /** 모델에 함께 보낼 최근 대화 턴 수. */
  contextTurns: number
  temperature: number
  topP: number
  /** null 이면 보내지 않는다. */
  topK: number | null
}

export const DEFAULT_GENERATION: AiGenerationSettings = {
  maxTokens: 700,
  contextTurns: 12,
  temperature: 0.8,
  topP: 0.95,
  topK: null,
}

/** 한 번의 호출에 필요한 설정. 제공자마다 쓰는 항목이 다르다. */
export interface AiCallConfig {
  apiKey: string
  model: string
  /** editableBaseUrl 제공자만 사용. */
  baseUrl?: string
  generation?: AiGenerationSettings
}

/** 스트리밍 중 새 텍스트 조각이 올 때마다 호출된다. */
export type AiStreamHandler = (chunk: string, full: string) => void

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

/**
 * 제공자 구현이 지켜야 할 인터페이스.
 *
 * 어댑터의 유일한 책임은 **형식 차이 흡수**다. 호출부(aiStore)는 어느 제공자든
 * 같은 AiReply 를 받고, 같은 clamp 를 거친다. 제공자별 분기는 이 파일 밖에 없다.
 */
export interface AiProvider {
  id: AiProviderId
  label: string
  /** 추천 모델. 유저는 목록 밖의 값도 직접 입력할 수 있다. */
  models: AiModelOption[]
  defaultModel: string
  /** 기본 엔드포인트. editableBaseUrl 이 true 면 유저가 바꿀 수 있다. */
  defaultBaseUrl?: string
  editableBaseUrl?: boolean
  /** 설정 화면에 띄울 짧은 안내. */
  note?: string
  /** 키 형식에 대한 간단한 사전 검사(오타 조기 발견용, 인증이 아님). */
  looksLikeKey: (key: string) => boolean
  /**
   * 이 모델이 temperature·topP·topK 를 받는지.
   * false 면 어댑터가 **아예 전송하지 않는다** — Claude 최신 모델은 이 값을 보내면 400 이다.
   */
  supportsSampling: (model: string) => boolean
  /**
   * 실제 호출. onDelta 를 주면 스트리밍으로 받는다(제공자별 SSE 차이는 어댑터가 흡수).
   * 실패는 AiError 로 던진다.
   */
  send: (config: AiCallConfig, request: AiRequest, onDelta?: AiStreamHandler) => Promise<AiResult>
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
