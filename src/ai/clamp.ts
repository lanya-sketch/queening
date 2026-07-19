import { RESOURCE_META, STAT_KEYS, STAT_META } from '../data/stats'
import type { AiDelta, AiDeltaTarget, AiReply, ClampedReply } from './types'

/**
 * 델타 클램핑 — AI 역할 경계의 집행 지점.
 *
 * 모델이 "호감도 +40" 을 뱉어도 코드가 잘라낸다. 이 파일이 없으면
 * AI 가 게임 상태의 소유권을 가져가는 셈이 된다.
 */

/** 제안이 허용되는 대상. 여기 없는 이름은 통째로 버린다. */
const ALLOWED_TARGETS: AiDeltaTarget[] = [
  ...STAT_KEYS,
  'wellbeing',
  'tutorTrust',
  'courtInfluence',
  'regentSuspicion',
  'regentRapport',
]

/**
 * 대상별 1회 상한. 서사적 반응은 작게만 움직인다 —
 * 큰 변화는 코드가 소유한 이벤트·활동의 몫이다.
 */
const MAX_ABS: Record<AiDeltaTarget, number> = {
  statecraft: 2,
  finance: 2,
  rhetoric: 2,
  martial: 2,
  courtcraft: 2,
  wellbeing: 5,
  tutorTrust: 3,
  // 국정 영향도는 통치의 핵심 축이라 AI 가 건드리지 못하게 한다.
  courtInfluence: 0,
  regentSuspicion: 3,
  regentRapport: 3,
}

/** 한 응답에서 받아들일 델타 개수 상한. */
const MAX_DELTAS = 4

/** 대사 길이 상한. 넘치면 자른다(모델이 폭주해도 UI 가 깨지지 않게). */
const MAX_REPLY_CHARS = 1200

function labelOf(target: AiDeltaTarget): string {
  return target in STAT_META
    ? STAT_META[target as keyof typeof STAT_META].label
    : RESOURCE_META[target as keyof typeof RESOURCE_META].label
}

export interface ClampOptions {
  /**
   * 화면별로 더 좁힌 허용 목록.
   * 전역 규칙(ALLOWED_TARGETS·MAX_ABS) 위에 한 겹 더 좁히는 용도다.
   * 예: 군주 대화는 tutorTrust·wellbeing 만 허용.
   */
  allow?: AiDeltaTarget[]
}

/** 모델 제안을 게임이 받아들일 수 있는 형태로 깎는다. */
export function clampReply(raw: AiReply, options: ClampOptions = {}): ClampedReply {
  const rejected: ClampedReply['rejected'] = []
  const deltas: AiDelta[] = []
  const seen = new Set<string>()
  const allow = options.allow

  for (const delta of raw.deltas ?? []) {
    const target = delta?.target as AiDeltaTarget
    const amount = Number(delta?.amount)

    if (allow && !allow.includes(target)) {
      rejected.push({ target: String(delta?.target), amount, reason: '이 화면에서 허용되지 않은 대상' })
      continue
    }
    if (!ALLOWED_TARGETS.includes(target)) {
      rejected.push({ target: String(delta?.target), amount, reason: '허용되지 않은 대상' })
      continue
    }
    if (!Number.isFinite(amount) || amount === 0) {
      rejected.push({ target, amount, reason: '숫자가 아니거나 0' })
      continue
    }
    if (seen.has(target)) {
      rejected.push({ target, amount, reason: '같은 대상 중복' })
      continue
    }
    if (deltas.length >= MAX_DELTAS) {
      rejected.push({ target, amount, reason: `한 응답에 ${MAX_DELTAS}개까지` })
      continue
    }

    const limit = MAX_ABS[target]
    if (limit === 0) {
      rejected.push({ target, amount, reason: `${labelOf(target)}는 AI 가 바꿀 수 없음` })
      continue
    }

    const clamped = Math.max(-limit, Math.min(limit, Math.trunc(amount)))
    if (clamped !== Math.trunc(amount)) {
      rejected.push({ target, amount, reason: `상한 ±${limit} 로 축소` })
    }
    seen.add(target)
    deltas.push({ target, amount: clamped })
  }

  const reply = String(raw.reply ?? '').slice(0, MAX_REPLY_CHARS)
  return { reply, deltas, rejected }
}

/**
 * 모델이 돌려준 텍스트에서 JSON 을 뽑아 AiReply 로 좁힌다.
 *
 * **모든 제공자가 이 함수를 통과한다.** 구조화 출력을 지원하지 않거나 무시하는
 * 모델이 ```json 펜스로 감싸 보내는 경우가 흔해서, 펜스와 앞뒤 잡문을 걷어낸다.
 * 제공자별 응답 봉투(content 블록 / choices[].message.content)를 벗기는 일까지가
 * 어댑터의 몫이고, 그 안의 문자열부터는 여기서 공통으로 처리한다.
 */
export function parseReplyText(text: string): AiReply | null {
  return coerceReply(extractJson(text))
}

/** 코드펜스와 앞뒤 잡문을 걷어내고 첫 JSON 객체만 건져낸다. */
export function extractJson(text: string): unknown | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim()

  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  try {
    return JSON.parse(stripped.slice(start, end + 1))
  } catch {
    return null
  }
}

/** 모델이 돌려준 임의의 JSON 을 AiReply 형태로 좁힌다. */
export function coerceReply(value: unknown): AiReply | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<AiReply>
  if (typeof candidate.reply !== 'string') return null
  return {
    reply: candidate.reply,
    deltas: Array.isArray(candidate.deltas) ? (candidate.deltas as AiDelta[]) : [],
  }
}

/** 대사와 메타(JSON)를 가르는 구분자. 스트리밍 중 JSON 이 화면에 새지 않게 한다. */
export const META_MARKER = '<<<META>>>'

/** 스트리밍으로 받은 원문에서 화면에 보일 부분만 잘라낸다(스트림 도중에도 호출된다). */
export function visiblePart(raw: string): string {
  const index = raw.indexOf(META_MARKER)
  return (index === -1 ? raw : raw.slice(0, index)).trimEnd()
}

/**
 * 구분자 방식 응답을 대사 + 델타로 가른다.
 * META 가 없으면 대사는 멀쩡하고 델타만 0건이 된다(우아한 실패).
 */
export function parseMetaReply(raw: string): AiReply {
  const reply = visiblePart(raw)
  const index = raw.indexOf(META_MARKER)
  if (index === -1) return { reply, deltas: [] }

  // META 꼬리에는 deltas 만 있으므로 coerceReply(reply 필수)를 쓰지 않는다.
  const meta = extractJson(raw.slice(index + META_MARKER.length)) as { deltas?: unknown } | null
  return { reply, deltas: Array.isArray(meta?.deltas) ? (meta.deltas as AiDelta[]) : [] }
}

/** 구조화 응답에 요구할 JSON Schema. */
export const REPLY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: '인물의 대사 또는 서술. 한국어. 게임 화면에 그대로 표시된다.',
    },
    deltas: {
      type: 'array',
      description:
        '상태 변화 제안. 없으면 빈 배열. 실제 반영 여부와 크기는 코드가 정한다.',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ALLOWED_TARGETS },
          amount: { type: 'integer' },
        },
        required: ['target', 'amount'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'deltas'],
  additionalProperties: false,
} as const
