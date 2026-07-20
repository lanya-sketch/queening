import { create } from 'zustand'
import { clampReply, parseMetaReply, visiblePart } from '../ai/clamp'
import { buildPersona } from '../ai/characterPersona'
import { buildMonarchPrompt } from '../ai/persona'
import { AiError, describeAiError } from '../ai/types'
import type { AiDeltaTarget, ClampedReply } from '../ai/types'
import { CHARACTER_BY_ID } from '../data/characters'
import { CHARACTER_SHEETS } from '../data/persona/characters'
import { TOPIC_BY_ID } from '../data/topics'
import { applyEffects } from '../systems/effects'
import { applyTopic, availableTopics } from '../systems/topics'
import { resolveText } from '../systems/text'
import type { Effect } from '../types/game'
import { useAi } from './aiStore'
import { useGame } from './gameStore'

/**
 * 대화 시스템 (M2b-2 군주 대화 → M2b-3b-2 에서 대상 중립으로 일반화).
 *
 * 군주든 연애 대상이든 **한 경로**를 쓴다. 대상마다 달라지는 것은 두 가지뿐이다:
 *   · 시스템 프롬프트를 어떤 조립기로 만드는가
 *   · 델타 허용목록이 무엇인가
 * 스트리밍·<<<META>>> 파싱·클램핑·폴백·재시도·비용 가드·샘플링 처리는 전부 공유한다.
 *
 * 대화 이력은 **대상별로 분리**해 세션 메모리에만 둔다 — 세이브 버전은 5 그대로.
 */

export type TalkTarget = { kind: 'monarch' } | { kind: 'character'; charId: string }

export function targetKey(target: TalkTarget): string {
  return target.kind === 'monarch' ? 'monarch' : `char:${target.charId}`
}

/** 세션당 호출 상한. 넘으면 경고만 하고 막지는 않는다. */
export const CALL_SOFT_LIMIT = 60

/** 첫 진입 도움말을 이미 봤는지. */
const HELP_KEY = 'queening.talk.helpSeen'

export interface TalkTurn {
  role: 'user' | 'assistant'
  content: string
  deltas?: ClampedReply['deltas']
}

interface TalkStore {
  target: TalkTarget | null
  /** 대상별 대화 이력. */
  logs: Record<string, TalkTurn[]>
  streaming: string | null
  rawBuffer: string
  busy: boolean
  error: { message: string; detail: string } | null
  callCount: number
  helpSeen: boolean

  /** 지금 재생 중인 화제 씬. null 이면 평소 대화 화면. */
  activeTopicId: string | null

  openTalk: (target?: TalkTarget) => void
  closeTalk: () => void
  /** 고정 화제를 꺼낸다 — AI 호출 없이 씬 재생 + 확정 효과. */
  pickTopic: (topicId: string) => void
  endTopic: () => void
  dismissHelp: () => void
  reset: () => void
  ask: (text: string) => Promise<void>
  retry: () => Promise<void>
  skipStreaming: () => void
}

/** 대상별 시스템 프롬프트 조립기. */
function systemPromptFor(target: TalkTarget): string {
  const game = useGame.getState().game
  if (target.kind === 'monarch') return buildMonarchPrompt(game)
  return buildPersona(target.charId, game) ?? buildMonarchPrompt(game)
}

/**
 * 대상별 델타 허용목록.
 * 전역 규칙(국정 영향도 0 등)은 clampReply 안에서 그대로 겹쳐 적용된다.
 */
function allowFor(target: TalkTarget): AiDeltaTarget[] {
  if (target.kind === 'monarch') return ['tutorTrust', 'wellbeing']
  return [`affection:${target.charId}`, 'wellbeing']
}

/** AiError.kind → 몰입을 깨지 않는 자연어 안내. raw 코드는 detail 로만 남긴다. */
function friendlyError(error: unknown): { message: string; detail: string } {
  if (error instanceof AiError) {
    const message =
      error.kind === 'auth'
        ? 'API 키를 확인해 주세요.'
        : error.kind === 'rate_limit'
          ? '잠시 후 다시 시도해 주세요.'
          : error.kind === 'network'
            ? '연결을 확인해 주세요.'
            : error.kind === 'no_key'
              ? 'API 키가 없습니다. 설정에서 키를 입력하세요.'
              : '응답을 받지 못했습니다. 다시 시도해 주세요.'
    return { message, detail: `${error.kind}: ${error.message}` }
  }
  return { message: '응답을 받지 못했습니다. 다시 시도해 주세요.', detail: String(error) }
}

function readHelpSeen(): boolean {
  try {
    return localStorage.getItem(HELP_KEY) === '1'
  } catch {
    return true
  }
}

export const useTalk = create<TalkStore>()((set, get) => ({
  target: null,
  logs: {},
  streaming: null,
  rawBuffer: '',
  busy: false,
  error: null,
  callCount: 0,
  helpSeen: readHelpSeen(),

  activeTopicId: null,

  openTalk: (target = { kind: 'monarch' }) =>
    set({ target, error: null, activeTopicId: null }),
  closeTalk: () => set({ target: null, activeTopicId: null }),

  /**
   * ★ AI 를 부르지 않는다. 화제는 미리 쓴 고정 씬이고 효과도 데이터에 적힌 값이다.
   *   그래서 키 없이도 완전히 동작하고, 모델 응답 품질에 좌우되지 않는다.
   */
  pickTopic: (topicId) => {
    if (get().busy || get().activeTopicId) return
    const topic = TOPIC_BY_ID[topicId]
    if (!topic) return
    const game = useGame.getState().game
    // 조건이 그새 바뀌었을 수 있으니 적용 직전에 한 번 더 본다.
    if (!availableTopics(topic.charId, game).some((t) => t.id === topicId)) return
    useGame.setState({ game: applyTopic(game, topic) })
    set({ activeTopicId: topicId })
  },

  endTopic: () => set({ activeTopicId: null }),

  dismissHelp: () => {
    try {
      localStorage.setItem(HELP_KEY, '1')
    } catch {
      /* 저장 못 해도 이번 세션은 넘어간다 */
    }
    set({ helpSeen: true })
  },

  reset: () =>
    set({ logs: {}, streaming: null, rawBuffer: '', error: null, callCount: 0 }),

  skipStreaming: () => {
    const { rawBuffer, streaming } = get()
    if (streaming === null) return
    set({ streaming: visiblePart(rawBuffer) })
  },

  ask: async (text) => {
    const trimmed = text.trim()
    const target = get().target
    if (!trimmed || get().busy || !target) return

    const key = targetKey(target)
    set((s) => ({
      logs: { ...s.logs, [key]: [...(s.logs[key] ?? []), { role: 'user', content: trimmed }] },
      error: null,
    }))
    await runTurn(set, get)
  },

  retry: async () => {
    if (get().busy || !get().target) return
    set({ error: null })
    await runTurn(set, get)
  },
}))

/** 실제 호출 — ask 와 retry 가 공유한다(재시도가 같은 맥락을 쓰도록). */
async function runTurn(
  set: (partial: Partial<TalkStore> | ((s: TalkStore) => Partial<TalkStore>)) => void,
  get: () => TalkStore,
) {
  const target = get().target
  if (!target) return
  const key = targetKey(target)

  const ai = useAi.getState()
  // 최근 N턴만 보낸다 — 컨텍스트가 곧 비용이다.
  const history = (get().logs[key] ?? [])
    .slice(-ai.generation.contextTurns)
    .map((t) => ({ role: t.role, content: t.content }))

  set({ busy: true, streaming: '', rawBuffer: '', error: null })

  try {
    const raw = await ai.streamRaw(
      { systemPrompt: systemPromptFor(target), messages: history },
      (_chunk, full) => set({ rawBuffer: full, streaming: visiblePart(full) }),
    )

    const clamped = clampReply(parseMetaReply(raw), { allow: allowFor(target) })

    if (clamped.deltas.length) applyTalkDeltas(clamped.deltas)
    if (clamped.rejected.length) {
      console.warn('[talk] 모델 제안 일부를 잘라냈습니다.', clamped.rejected)
    }

    set((s) => ({
      logs: {
        ...s.logs,
        [key]: [
          ...(s.logs[key] ?? []),
          { role: 'assistant', content: clamped.reply, deltas: clamped.deltas },
        ],
      },
      streaming: null,
      rawBuffer: '',
      busy: false,
      callCount: s.callCount + 1,
    }))
  } catch (error) {
    console.error('[talk]', error)
    set({ busy: false, streaming: null, rawBuffer: '', error: friendlyError(error) })
  }
}

/** clamp 를 통과한 델타를 게임 상태에 반영한다. 호감도는 복합키를 푼다. */
function applyTalkDeltas(deltas: ClampedReply['deltas']): void {
  const effects: Effect[] = deltas.map((d) => {
    if (typeof d.target === 'string' && d.target.startsWith('affection:')) {
      return {
        target: { kind: 'affection', charId: d.target.slice('affection:'.length) },
        amount: d.amount,
      }
    }
    return {
      target: { kind: 'resource', key: d.target as 'tutorTrust' | 'wellbeing' },
      amount: d.amount,
    }
  })
  const game = useGame.getState().game
  const { state } = applyEffects(game, effects)
  useGame.setState({ game: state })
}

/** 대화 진입 가능 여부 — 이벤트 씬·현안 결단 중에는 잠근다. */
export function talkLocked(phase: string): boolean {
  return phase === 'event'
}

/** 화면 머리에 쓸 대상 정보(이름·초상·프레이밍). */
export function targetInfo(target: TalkTarget) {
  const game = useGame.getState().game
  if (target.kind === 'monarch') {
    return { name: resolveText('{왕}', game), framing: null, portrait: null }
  }
  const character = CHARACTER_BY_ID[target.charId]
  const sheet = CHARACTER_SHEETS[target.charId]
  return {
    name: resolveText(character?.name ?? target.charId, game),
    framing: sheet ? resolveText(sheet.framing, game) : null,
    portrait: character ? `/assets/characters/${character.portraitId}.svg` : null,
  }
}

export { describeAiError }
