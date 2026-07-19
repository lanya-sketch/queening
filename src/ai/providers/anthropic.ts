import Anthropic from '@anthropic-ai/sdk'
import { REPLY_JSON_SCHEMA, parseReplyText } from '../clamp'
import {
  AiError,
  DEFAULT_GENERATION,
  type AiCallConfig,
  type AiProvider,
  type AiRequest,
  type AiResult,
  type AiStreamHandler,
} from '../types'

/**
 * Anthropic 어댑터.
 *
 * BYOK — 키는 유저 것이고 브라우저에서 직접 API 를 호출한다.
 * 그래서 두 가지가 반드시 필요하다:
 *   dangerouslyAllowBrowser                     SDK 의 브라우저 사용 차단 해제
 *   anthropic-dangerous-direct-browser-access   CORS 허용 헤더
 *
 * 이 구조의 대가는 분명하다 — 키가 브라우저에 노출된다. 공용 PC 경고를
 * 설정 화면에 붙여두는 이유이며, 키는 세이브 파일이 아니라 별도 항목에 둔다.
 */

/** 샘플링 파라미터가 제거된 세대. 보내면 400 이 난다. */
const NO_SAMPLING = /^(claude-opus-4-[78]|claude-sonnet-5|claude-fable-5|claude-mythos-5)/
/** adaptive thinking 을 받는 세대. 그 이전 모델에 보내면 400 이다. */
const ADAPTIVE_THINKING = /^(claude-opus-4-[678]|claude-sonnet-(5|4-6)|claude-fable-5|claude-mythos-5)/

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

/** 요청 본문을 만든다. 모델이 못 받는 파라미터는 아예 넣지 않는다. */
function buildParams(config: AiCallConfig, request: AiRequest) {
  const gen = config.generation ?? DEFAULT_GENERATION
  const params: Record<string, unknown> = {
    model: config.model,
    max_tokens: gen.maxTokens,
    system: request.systemPrompt,
    messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
  }

  if (ADAPTIVE_THINKING.test(config.model)) {
    params.thinking = { type: 'adaptive' }
  }

  const outputConfig: Record<string, unknown> = { effort: 'low' }
  if (request.structured) {
    outputConfig.format = { type: 'json_schema', schema: REPLY_JSON_SCHEMA }
  }
  params.output_config = outputConfig

  // ★ 400 방지 — 이 세대는 샘플링 파라미터를 아예 받지 않는다.
  if (!NO_SAMPLING.test(config.model)) {
    params.temperature = gen.temperature
    params.top_p = gen.topP
    if (gen.topK !== null) params.top_k = gen.topK
  }

  return params
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

  supportsSampling: (model) => !NO_SAMPLING.test(model),

  async send(config: AiCallConfig, request: AiRequest, onDelta?: AiStreamHandler): Promise<AiResult> {
    const apiKey = config.apiKey
    if (!apiKey.trim()) throw new AiError('no_key', 'API 키가 없습니다.')

    try {
      const params = buildParams(config, request)
      let message: Anthropic.Message

      if (onDelta) {
        let full = ''
        const stream = client(apiKey).messages.stream(params as never)
        stream.on('text', (chunk: string) => {
          full += chunk
          onDelta(chunk, full)
        })
        message = await stream.finalMessage()
      } else {
        message = (await client(apiKey).messages.create(params as never)) as Anthropic.Message
      }

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
