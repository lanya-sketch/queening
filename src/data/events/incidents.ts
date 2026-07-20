import type { GameEvent } from '../../types/game'

/**
 * 돌발 현안 자리표시자 (M2b-4).
 *
 * ★ 여기 있는 것은 **자리**일 뿐 내용이 아니다.
 *   `endTurn` 은 동기 순수 함수라 그 안에서 AI 를 부를 수 없다. 그래서
 *   빈도·우선순위·쿨다운은 기존 chance 틀(코드 소유)이 정하고,
 *   내용은 화면이 들어온 뒤 incidentStore 가 채운다.
 *
 *   source: 'ai_generated' 라서 **키가 없으면 아예 발동하지 않는다**
 *   (systems/aiGate + findTriggeredEvents). 코어는 키 없이 완전하다.
 *
 * 우선순위는 배경 대역의 **바닥**이다. 굶어도 되는 자리 —
 * 돌발은 양념이라 진실 회수나 캐릭터 사건에 절대 앞서면 안 된다.
 * 쿨다운 3계절, 합쳐 계절당 ~14% → 9년에 4~5회 정도를 노린 값이다.
 */
export const INCIDENT_EVENTS: GameEvent[] = [
  {
    id: 'ai-incident-choice',
    title: '현안',
    // 생성 실패 시 이 텍스트는 쓰이지 않는다 — 사건 자체를 건너뛴다.
    text: '',
    condition: { minAge: 12 },
    once: false,
    source: 'ai_generated',
    category: 'state_affair',
    chance: { base: 0.06, cooldown: 3 },
  },
  {
    id: 'ai-incident-notice',
    title: '소식',
    text: '',
    condition: { minAge: 12 },
    once: false,
    source: 'ai_generated',
    category: 'state_affair',
    chance: { base: 0.08, cooldown: 3 },
  },
]

/** 선택지형인지 — 화면과 생성기가 같은 판단을 쓰도록 한곳에 둔다. */
export function incidentHasChoices(eventId: string): boolean {
  return eventId === 'ai-incident-choice'
}

export const INCIDENT_EVENT_IDS = INCIDENT_EVENTS.map((e) => e.id)
