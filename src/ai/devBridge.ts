import { EVENTS, EVENT_BY_ID } from '../data/events'
import { BLOOD_OATH_EVENTS } from '../data/events/bloodoath'
import { DEVICE_EVENTS } from '../data/events/devices'
import { TOPICS, TOPIC_BY_ID } from '../data/topics'
import { useAi } from '../store/aiStore'
import { useGame } from '../store/gameStore'
import { useTalk } from '../store/talkStore'
import { chanceOf } from '../systems/chance'
import { findTriggeredEvents } from '../systems/eventEngine'
import { availableTopics } from '../systems/topics'
import type { TalkTopic } from '../types/game'
import { resolveText } from '../systems/text'
import { buildPersona } from './characterPersona'
import { buildMonarchPrompt } from './persona'
import { AI_PROVIDERS } from './providers'
import type { AiProviderId } from './types'

/**
 * 개발 전용 테스트 시임.
 *
 * 검증 스크립트가 "어느 제공자든 같은 형태의 델타가 나오는지"를 관측하려면
 * 브라우저 안에서 send() 를 직접 부를 수 있어야 한다. 프로덕션 번들에는
 * 포함되지 않는다(import.meta.env.DEV 가드 + main.tsx 에서만 호출).
 */
export function installDevBridge(): void {
  if (!import.meta.env.DEV) return

  // eslint 없는 프로젝트라 window 확장은 캐스팅으로 처리한다.
  ;(window as unknown as Record<string, unknown>).__queeningAi = {
    /** 제공자·모델·키를 한 번에 세팅한다(저장은 하지 않는다). */
    configure(providerId: AiProviderId, apiKey: string, model?: string, baseUrl?: string) {
      const provider = AI_PROVIDERS[providerId]
      useAi.setState({
        providerId,
        apiKey,
        model: model ?? provider?.defaultModel ?? '',
        baseUrl: baseUrl ?? provider?.defaultBaseUrl ?? '',
      })
    },
    /** 구조화 호출 → clamp 까지 통과한 결과를 그대로 돌려준다. */
    async send(prompt: string) {
      return useAi.getState().send({
        systemPrompt: '테스트',
        messages: [{ role: 'user', content: prompt }],
      })
    },
    providers: Object.keys(AI_PROVIDERS),

    /** 지금 게임 상태를 그대로 읽는다(카운터·flag 관측용). */
    get state() {
      return useGame.getState().game
    },
    /** 전 이벤트의 우선순위 — 동률 검사용. */
    priorities() {
      return EVENTS.map((e) => ({ id: e.id, priority: e.priority ?? 0 }))
    },
    /**
     * 이벤트 정의를 그대로 넘긴다.
     * 검증이 "새 콘텐츠가 기존 flag 를 쓰는가"를 조건식에서 직접 읽기 위한 것 —
     * 플레이해서 관찰하는 대신 의존 관계를 정적으로 대조한다.
     */
    events() {
      return JSON.parse(JSON.stringify(EVENTS))
    },
    /** 혈서 계열 이벤트 id (의존 단방향성 대조에서 "새 콘텐츠"의 정의). */
    bloodOathIds() {
      return BLOOD_OATH_EVENTS.map((e) => e.id)
    },
    /** 정치 고유장치 이벤트 id. */
    deviceIds() {
      return DEVICE_EVENTS.map((e) => e.id)
    },
    /** 캐릭터 대화창을 연다(라이브 호감도 실측용). */
    openTalk(charId?: string) {
      useTalk
        .getState()
        .openTalk(charId ? { kind: 'character', charId } : { kind: 'monarch' })
    },
    /** 지금 이 캐릭터에게 열린 화제들. */
    topics(charId: string) {
      return availableTopics(charId, useGame.getState().game).map((t) => ({
        id: t.id,
        label: t.label,
      }))
    },
    /**
     * ★ 런타임에 화제를 얹고 걷어낸다 — "키워드 틀이 일반적이다"를 시연하기 위한 것.
     *   일반적이라고 주장하는 대신 검증이 실제로 다른 캐릭터에 얹어 본다.
     */
    addTopic(topic: TalkTopic) {
      TOPICS.push(topic)
      TOPIC_BY_ID[topic.id] = topic
    },
    removeTopic(topicId: string) {
      const index = TOPICS.findIndex((t) => t.id === topicId)
      if (index >= 0) TOPICS.splice(index, 1)
      delete TOPIC_BY_ID[topicId]
    },
    /** 지금 상태에서 발동 가능한 이벤트 id — 우선순위 순. */
    triggerable() {
      return findTriggeredEvents(useGame.getState().game).map((e) => e.id)
    },

    /** 게임 상태를 갈아끼운다(검증에서 대조적인 두 군주를 만들 때). */
    setGame(patch: Record<string, unknown>) {
      useGame.setState({ game: { ...useGame.getState().game, ...patch } as never })
    },
    /** 지금 상태로 조립된 시스템 프롬프트. 숫자가 없는지 검증에서 확인한다. */
    prompt() {
      return buildMonarchPrompt(useGame.getState().game)
    },
    /** 토큰 치환 결과를 직접 확인한다(복합어가 안 깨지는지). */
    resolve(text: string) {
      return resolveText(text, useGame.getState().game)
    },
    /** 연애 대상의 조립된 시스템 프롬프트. */
    persona(charId: string) {
      return buildPersona(charId, useGame.getState().game)
    },

    /**
     * 확률 발동 실측용.
     *
     * ★ 확률 곡선은 "이럴 것이다"로 보고할 수 없는 종류의 주장이라
     *   검증 스크립트가 실제 함수를 시행해 분포를 직접 세게 한다.
     *   여기서 굴리는 주사위도 전부 코드 소유다.
     */
    chance: {
      /** 지금 상태에서의 계절당 발동 확률. */
      of(eventId: string, activityIds: string[] = []) {
        const event = EVENT_BY_ID[eventId]
        if (!event?.chance) return null
        return chanceOf(event.chance, useGame.getState().game, eventId, activityIds)
      },
      /**
       * 등장까지 걸리는 계절 수를 trials 회 시뮬레이션한다.
       * pity 를 포함한 실제 규칙을 그대로 돌린다(별도 구현이 아니라 같은 함수).
       */
      waitSamples(eventId: string, affection: number, activityIds: string[] = [], trials = 10000) {
        const event = EVENT_BY_ID[eventId]
        if (!event?.chance) return null
        const base = useGame.getState().game
        const samples: number[] = []
        for (let t = 0; t < trials; t++) {
          let misses = 0
          for (let season = 1; season <= 100; season++) {
            const state = {
              ...base,
              affection: { ...base.affection, prince: affection },
              counters: { [`__pity:${eventId}`]: misses },
            }
            if (Math.random() < chanceOf(event.chance!, state as never, eventId, activityIds)) {
              samples.push(season)
              break
            }
            misses++
          }
        }
        return samples
      },
    },
  }
}
