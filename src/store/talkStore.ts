import { create } from 'zustand'
import { clampReply, parseMetaReply, visiblePart } from '../ai/clamp'
import { buildMonarchPrompt } from '../ai/persona'
import { AiError, describeAiError } from '../ai/types'
import type { AiDeltaTarget, ClampedReply } from '../ai/types'
import { applyEffects } from '../systems/effects'
import type { Effect } from '../types/game'
import { useAi } from './aiStore'
import { useGame } from './gameStore'

/**
 * 군주 자율 대화 (M2b-2).
 *
 * 대화 이력은 **코드가 소유**하고 세션 메모리에만 둔다 — 세이브에 넣지 않으므로
 * 세이브 버전은 4 그대로다.
 *
 * 군주 대화가 움직일 수 있는 값은 신뢰와 심신뿐이다. 스탯·의심·신망·국정 영향도는
 * 여기서 바뀌지 않는다(전역 클램프 위에 화면별 허용 목록을 한 겹 더 좁힌다).
 */

/** 이 화면에서만 허용되는 델타 대상. */
const TALK_ALLOW: AiDeltaTarget[] = ['tutorTrust', 'wellbeing']

/** 세션당 호출 상한. 넘으면 경고만 하고 막지는 않는다. */
export const CALL_SOFT_LIMIT = 60

export interface TalkTurn {
  role: 'user' | 'assistant'
  content: string
  /** 이 턴에서 반영된 변화(어시스턴트 턴만). */
  deltas?: ClampedReply['deltas']
}

interface TalkStore {
  open: boolean
  turns: TalkTurn[]
  /** 스트리밍 중인 대사(화면에 보이는 부분만). */
  streaming: string | null
  /** 스트림 원문 — 건너뛰기와 파싱에 쓴다. */
  rawBuffer: string
  busy: boolean
  /** 실패했을 때만 채워진다. 재시도 버튼에 쓰인다. */
  error: { message: string; detail: string } | null
  callCount: number

  openTalk: () => void
  closeTalk: () => void
  reset: () => void
  ask: (text: string) => Promise<void>
  /** 마지막 사용자 발화로 다시 시도한다. */
  retry: () => Promise<void>
  /** 스트리밍 애니메이션을 건너뛰고 즉시 완성한다. */
  skipStreaming: () => void
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
  return {
    message: '응답을 받지 못했습니다. 다시 시도해 주세요.',
    detail: String(error),
  }
}

export const useTalk = create<TalkStore>()((set, get) => ({
  open: false,
  turns: [],
  streaming: null,
  rawBuffer: '',
  busy: false,
  error: null,
  callCount: 0,

  openTalk: () => set({ open: true, error: null }),
  closeTalk: () => set({ open: false }),
  reset: () => set({ turns: [], streaming: null, rawBuffer: '', error: null, callCount: 0 }),

  skipStreaming: () => {
    const { rawBuffer, streaming } = get()
    if (streaming === null) return
    set({ streaming: visiblePart(rawBuffer) })
  },

  ask: async (text) => {
    const trimmed = text.trim()
    if (!trimmed || get().busy) return

    set((s) => ({
      turns: [...s.turns, { role: 'user', content: trimmed }],
      error: null,
    }))
    await runTurn(set, get)
  },

  retry: async () => {
    if (get().busy) return
    set({ error: null })
    await runTurn(set, get)
  },
}))

/** 실제 호출 — ask 와 retry 가 공유한다(재시도가 같은 맥락을 쓰도록). */
async function runTurn(
  set: (partial: Partial<TalkStore> | ((s: TalkStore) => Partial<TalkStore>)) => void,
  get: () => TalkStore,
) {
  const game = useGame.getState().game
  const ai = useAi.getState()
  const contextTurns = ai.generation.contextTurns

  // 최근 N턴만 보낸다 — 컨텍스트가 곧 비용이다.
  const history = get()
    .turns.slice(-contextTurns)
    .map((t) => ({ role: t.role, content: t.content }))

  set({ busy: true, streaming: '', rawBuffer: '', error: null })

  try {
    const raw = await ai.streamRaw(
      { systemPrompt: buildMonarchPrompt(game), messages: history },
      (_chunk, full) => set({ rawBuffer: full, streaming: visiblePart(full) }),
    )

    const parsed = parseMetaReply(raw)
    const clamped = clampReply(parsed, { allow: TALK_ALLOW })

    if (clamped.deltas.length) applyTalkDeltas(clamped.deltas)
    if (clamped.rejected.length) {
      console.warn('[talk] 모델 제안 일부를 잘라냈습니다.', clamped.rejected)
    }

    set((s) => ({
      turns: [
        ...s.turns,
        { role: 'assistant', content: clamped.reply, deltas: clamped.deltas },
      ],
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

/** clamp 를 통과한 델타를 게임 상태에 반영한다. */
function applyTalkDeltas(deltas: ClampedReply['deltas']): void {
  const effects: Effect[] = deltas.map((d) => ({
    target: { kind: 'resource', key: d.target as 'tutorTrust' | 'wellbeing' },
    amount: d.amount,
  }))
  const game = useGame.getState().game
  const { state } = applyEffects(game, effects)
  useGame.setState({ game: state })
}

/** 대화 진입 가능 여부 — 이벤트 씬·현안 결단 중에는 잠근다. */
export function talkLocked(phase: string): boolean {
  return phase === 'event'
}

export { describeAiError }
