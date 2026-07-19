import Anthropic from '@anthropic-ai/sdk'
import { REPLY_JSON_SCHEMA, parseReplyText } from '../clamp'
import { AiError, type AiCallConfig, type AiProvider, type AiRequest, type AiResult } from '../types'

/**
 * Anthropic 어댑터 (M2b-1 의 유일한 구현).
 *
 * BYOK — 키는 유저 것이고 브라우저에서 직접 API 를 호출한다.
 * 그래서 두 가지가 반드시 필요하다:
 *   dangerouslyAllowBrowser        SDK 의 브라우저 사용 차단을 해제
 *   anthropic-dangerous-direct-browser-access  CORS 허용 헤더
 *
 * 이 구조의 대가는 분명하다 — 키가 브라우저에 노출된다. 공용 PC 경고를
 * 설정 화면에 붙여두는 이유이며, 키는 세이브 파일이 아니라 별도 항목에 둔다.
 */

const MAX_TOKENS = 2048

function client(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
    maxRetries: 1,
  })
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiError('auth', '키가 거부되었습니다.', error)
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new AiError('auth', '이 키로는 접근할 수 없습니다.', error)
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiError('rate_limit', '요청 한도를 넘었습니다.', error)
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiError('network', '연결에 실패했습니다.', error)
  }
  if (error instanceof Anthropic.APIError) {
    return new AiError('unknown', `API 오류 (${error.status ?? '?'})`, error)
  }
  return new AiError('unknown', '알 수 없는 오류', error)
}

/** 응답에서 첫 텍스트 블록을 꺼낸다. thinking 블록은 건너뛴다. */
function firstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === 'text') return block.text
  }
  return ''
}

export const anthropicProvider: AiProvider = {
  id: 'anthropic',
  label: 'Anthropic (Claude)',
  models: [
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — 가장 유능' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — 균형' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — 가장 저렴' },
  ],
  defaultModel: 'claude-opus-4-8',
  note: '키는 console.anthropic.com 에서 발급합니다.',

  // 형식만 훑는 사전 검사다. 유효성은 실제 호출로만 알 수 있다.
  looksLikeKey: (key) => /^sk-ant-/.test(key.trim()) && key.trim().length > 20,

  async send(config: AiCallConfig, request: AiRequest): Promise<AiResult> {
    const apiKey = config.apiKey
    if (!apiKey.trim()) throw new AiError('no_key', 'API 키가 없습니다.')

    try {
      const message = await client(apiKey).messages.create({
        model: config.model,
        max_tokens: MAX_TOKENS,
        system: request.systemPrompt,
        // 짧은 대사에 과한 지연을 주지 않으면서, 상태를 고려한 판단은 하게 한다.
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'low',
          ...(request.structured
            ? { format: { type: 'json_schema' as const, schema: REPLY_JSON_SCHEMA } }
            : {}),
        },
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      })

      if (message.stop_reason === 'refusal') {
        throw new AiError('refusal', '모델이 응답을 거절했습니다.')
      }

      const text = firstText(message)
      const usage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      }

      if (!request.structured) {
        return { reply: { reply: text, deltas: [] }, usage, model: message.model }
      }

      // 봉투를 벗긴 뒤부터는 OpenAI 호환 경로와 완전히 같은 함수를 탄다.
      const reply = parseReplyText(text)
      if (!reply) throw new AiError('bad_response', '응답에서 JSON 을 찾지 못했습니다.')

      return { reply, usage, model: message.model }
    } catch (error) {
      throw toAiError(error)
    }
  },
}
