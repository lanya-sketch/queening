import { create } from 'zustand'
import { buildIncidentPrompt, parseIncident, type Incident, type IncidentChoice } from '../ai/incident'
import { incidentHasChoices } from '../data/events/incidents'
import { applyEffects } from '../systems/effects'
import type { Effect } from '../types/game'
import { useAi } from './aiStore'
import { useGame } from './gameStore'

/**
 * 돌발 현안 생성 상태 (M2b-4).
 *
 * 생성에 실패하면 **미리 쓴 사건으로 때우지 않고 그냥 건너뛴다.**
 * 돌발은 양념이라 없어도 되고, 대화 폴백에서 정한 원칙(캐릭터 일관성을 해치는
 * 대체 텍스트를 쓰지 않는다)과 같은 결이다.
 */

/** 급박 사건이 특별하게 남도록 최소 간격을 둔다(계절). */
const URGENT_MIN_GAP = 6
const URGENT_GAP_KEY = 'urgent_incident_gap'

/** 제한 시간(초). 서술을 다 읽은 뒤부터 센다. */
export const INCIDENT_TIMER_SECONDS = 10

const TIMER_PREF_KEY = 'queening.incident.timer'

function loadTimerEnabled(): boolean {
  try {
    // 기본값은 켜짐 — 꺼두면 대부분의 플레이에서 한 번도 안 보이는 죽은 기능이 된다.
    return localStorage.getItem(TIMER_PREF_KEY) !== '0'
  } catch {
    return true
  }
}

interface IncidentStore {
  /** eventId → 생성 결과. null 이면 생성 실패(건너뛴다). */
  byEvent: Record<string, Incident | null>
  loading: string | null
  timerEnabled: boolean

  setTimerEnabled: (on: boolean) => void
  generate: (eventId: string) => Promise<void>
  /** 선택지를 고른다(시간 초과 자동 선택도 이걸 쓴다). */
  choose: (eventId: string, index: number) => void
  chosen: Record<string, number>
  reset: () => void
}

export const useIncidents = create<IncidentStore>()((set, get) => ({
  byEvent: {},
  loading: null,
  timerEnabled: loadTimerEnabled(),
  chosen: {},

  setTimerEnabled: (on) => {
    try {
      localStorage.setItem(TIMER_PREF_KEY, on ? '1' : '0')
    } catch {
      /* 저장 못 해도 이번 세션은 반영된다 */
    }
    set({ timerEnabled: on })
  },

  reset: () => set({ byEvent: {}, chosen: {}, loading: null }),

  generate: async (eventId) => {
    if (get().loading || eventId in get().byEvent) return
    const withChoices = incidentHasChoices(eventId)
    const game = useGame.getState().game
    set({ loading: eventId })

    try {
      const raw = await useAi.getState().streamRaw(
        {
          systemPrompt: buildIncidentPrompt(game, withChoices),
          messages: [{ role: 'user', content: '사건 하나를 만들어라.' }],
        },
        () => {
          /* 돌발은 스트리밍을 화면에 흘리지 않는다 — JSON 이라 보여줄 것이 없다 */
        },
      )
      const incident = parseIncident(raw, withChoices)

      if (incident?.rejected.length) {
        console.warn('[incident] 모델 제안 일부를 잘라냈습니다.', incident.rejected)
      }

      // 급박함은 모델이 제안하고 코드가 허가한다.
      const gap = game.counters?.[URGENT_GAP_KEY] ?? 0
      const urgentAllowed = incident?.urgent === true && withChoices && gap === 0

      set((s) => ({
        byEvent: {
          ...s.byEvent,
          [eventId]: incident ? { ...incident, urgent: urgentAllowed } : null,
        },
        loading: null,
      }))

      // 통보형은 고를 것이 없으니 여기서 바로 반영한다.
      if (incident && !withChoices) {
        applyIncidentOutcome(incident.deltas, incident.flags)
      }
      if (urgentAllowed) bumpUrgentGap()
    } catch (error) {
      console.error('[incident]', error)
      set((s) => ({ byEvent: { ...s.byEvent, [eventId]: null }, loading: null }))
    }
  },

  choose: (eventId, index) => {
    if (get().chosen[eventId] !== undefined) return
    const incident = get().byEvent[eventId]
    const choice = incident?.choices[index]
    if (!choice) return
    applyIncidentOutcome(choice.deltas, choice.flags)
    set((s) => ({ chosen: { ...s.chosen, [eventId]: index } }))
  },
}))

/** 클램프를 통과한 것만 상태에 반영한다. */
function applyIncidentOutcome(
  deltas: Incident['deltas'],
  flags: Record<string, boolean>,
): void {
  const effects: Effect[] = deltas.map((d) => ({
    target: { kind: 'resource', key: d.target as 'wellbeing' | 'regentSuspicion' },
    amount: d.amount,
  }))
  const game = useGame.getState().game
  const { state } = applyEffects(game, effects)
  useGame.setState({ game: { ...state, flags: { ...state.flags, ...flags } } })
}

function bumpUrgentGap(): void {
  const game = useGame.getState().game
  useGame.setState({
    game: { ...game, counters: { ...game.counters, [URGENT_GAP_KEY]: URGENT_MIN_GAP } },
  })
}

/** 시간 초과 시 자동으로 갈 선택지. */
export function cautiousIndex(choices: IncidentChoice[]): number {
  const index = choices.findIndex((c) => c.cautious)
  return index >= 0 ? index : choices.length - 1
}
