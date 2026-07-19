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
 * OpenAI 호환 어댑터 — /chat/completions 표준 형식.
 *
 * OpenRouter, 로컬 추론 서버(llama.cpp·LM Studio·Ollama 등), 그 밖에 같은 규격을
 * 노출하는 서비스가 전부 여기에 붙는다. 엔드포인트만 바꾸면 되므로 사실상
 * 다양한 모델을 이 하나로 커버한다.
 *
 * 공식 SDK 대신 fetch 를 쓴다 — 규격이 단순하고, 어느 호환 서버든 base URL 만
 * 갈아끼우면 되어야 하기 때문이다. 의존성도 늘지 않는다.
 *
 * ★ 어댑터의 책임은 형식 흡수까지다. 응답 봉투(choices[].message.content)를 벗겨
 *   문자열을 꺼내면, 그 다음부터는 Anthropic 경로와 완전히 같은 parseReplyText →
 *   clampReply 를 탄다.
 */

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
  error?: { message?: string }
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

/**
 * OpenAI 호환 SSE 를 읽어 전체 텍스트를 돌려준다.
 * 형식: `data: {json}` 줄이 이어지고 `data: [DONE]` 으로 끝난다.
 */
async function readSseStream(response: Response, onDelta: AiStreamHandler): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new AiError('bad_response', '스트림을 열지 못했습니다.')

  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data) as {
          choices?: { delta?: { content?: string | null } }[]
        }
        const piece = chunk.choices?.[0]?.delta?.content
        if (piece) {
          full += piece
          onDelta(piece, full)
        }
      } catch {
        // 부분 청크나 주석 줄은 건너뛴다
      }
    }
  }
  return full
}

export const openaiCompatibleProvider: AiProvider = {
  id: 'openai-compatible',
  label: 'OpenAI 호환 (OpenRouter · 로컬 서버 등)',
  models: [
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (OpenRouter)' },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (OpenRouter)' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (OpenRouter)' },
  ],
  defaultModel: 'anthropic/claude-sonnet-4.5',
  defaultBaseUrl: DEFAULT_BASE_URL,
  editableBaseUrl: true,
  note:
    '/chat/completions 규격이면 무엇이든 됩니다. 모델 이름은 그 서비스의 표기를 그대로 쓰세요. ' +
    '브라우저에서 직접 부르므로 해당 서버가 CORS 를 허용해야 합니다.',

  // 호환 서버마다 키 형식이 제각각이라 길이만 본다.
  looksLikeKey: (key) => key.trim().length >= 8,

  // 이 규격은 샘플링 파라미터를 표준으로 받는다.
  supportsSampling: () => true,

  async send(
    config: AiCallConfig,
    request: AiRequest,
    onDelta?: AiStreamHandler,
  ): Promise<AiResult> {
    if (!config.apiKey.trim()) throw new AiError('no_key', 'API 키가 없습니다.')

    const gen = config.generation ?? DEFAULT_GENERATION
    const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: gen.maxTokens,
      temperature: gen.temperature,
      top_p: gen.topP,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }
    if (gen.topK !== null) body.top_k = gen.topK
    if (onDelta) body.stream = true

    if (request.structured) {
      // 지원하지 않는 서버는 이 필드를 무시한다. 그래서 파싱 쪽이 관대해야 한다.
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'character_reply', strict: true, schema: REPLY_JSON_SCHEMA },
      }
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      throw new AiError('network', '연결에 실패했습니다.', e)
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AiError('auth', '키가 거부되었습니다.')
      }
      if (response.status === 429) throw new AiError('rate_limit', '요청 한도를 넘었습니다.')
      throw new AiError('unknown', `API 오류 (${response.status})`)
    }

    // 스트리밍 — SSE 를 읽어 delta.content 만 뽑는다. 봉투 차이는 여기서 끝난다.
    if (onDelta) {
      const text = await readSseStream(response, onDelta)
      const usage = { inputTokens: 0, outputTokens: 0 }
      if (!request.structured) {
        return { reply: { reply: text, deltas: [] }, usage, model: config.model }
      }
      const reply = parseReplyText(text)
      if (!reply) throw new AiError('bad_response', '응답에서 JSON 을 찾지 못했습니다.')
      return { reply, usage, model: config.model }
    }

    let payload: ChatCompletionResponse
    try {
      payload = (await response.json()) as ChatCompletionResponse
    } catch (e) {
      throw new AiError('bad_response', '응답을 해석하지 못했습니다.', e)
    }

    if (payload.error) {
      throw new AiError('unknown', payload.error.message ?? 'API 오류')
    }

    const text = payload.choices?.[0]?.message?.content ?? ''
    const usage = {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
    }
    const model = payload.model ?? config.model

    if (!request.structured) {
      return { reply: { reply: text, deltas: [] }, usage, model }
    }

    const reply = parseReplyText(text)
    if (!reply) throw new AiError('bad_response', '응답에서 JSON 을 찾지 못했습니다.')

    return { reply, usage, model }
  },
}
