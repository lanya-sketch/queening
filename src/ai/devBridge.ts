import { EVENTS, EVENT_BY_ID } from '../data/events'
import { SCENES } from '../data/scenes'
import { ENDING_INSERTS } from '../data/endings/inserts'
import { CHARACTER_SHEETS } from '../data/persona/characters'
import { BLOOD_OATH_EVENTS } from '../data/events/bloodoath'
import { CONQUEST_EVENTS } from '../data/events/conquest'
import { DECISIVE_EVENTS } from '../data/events/decisive'
import { DAILY_EVENTS } from '../data/events/daily'
import { TEMPERAMENTS } from '../data/temperaments'
import { DEVICE_EVENTS } from '../data/events/devices'
import { INCIDENT_EVENTS } from '../data/events/incidents'
import { RECKONING_AFTERMATH, RECKONING_EVENTS } from '../data/events/reckoning'
import { TOPICS, TOPIC_BY_ID } from '../data/topics'
import { useAi } from '../store/aiStore'
import { useOptions } from '../store/optionsStore'
import { useGame } from '../store/gameStore'
import { useIncidents } from '../store/incidentStore'
import { useApp } from '../store/appStore'
import { useTalk } from '../store/talkStore'
import { parseIncident } from './incident'
import { chanceOf } from '../systems/chance'
import {
  setIncidentPressure, setIncidentsAblated, setMinorEnabled, resetMinorTuning,
} from '../systems/minorEvents'
import { durabilityBase, growthFactor, wellbeingCostFactor } from '../systems/durability'
import { ENDING_THRESHOLDS, judgeEnding } from '../systems/ending'
import { buildEndingScene, endingSkeletonId } from '../systems/endingScene'
import { findTriggeredEvents } from '../systems/eventEngine'
import { resolveCharacterPortrait, resolveMonarchPortrait, validateManifest } from '../systems/outfits'
import { setDeterministic, rng } from '../systems/rng'
import {
  clearAllSlots, exportSlot, hasAnySave, importCode, listSlots, migrateLegacySave,
} from '../systems/save'
import { clearGallery, getAchieved } from '../systems/gallery'
import { clearReadlog, getRead } from '../systems/readlog'
import { endTurn } from '../systems/turn'
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
    /**
     * 엔딩 판정. state 를 주면 그것을, 없으면 현재 게임을 판정한다.
     * 무작위 세이브 전수 시행이 이 경로로 돈다.
     */
    judgeEnding(state?: Record<string, unknown>) {
      return judgeEnding((state ?? useGame.getState().game) as never)
    },
    endingThresholds() {
      return ENDING_THRESHOLDS
    },
    /** 내구도 계수 — 초반 혹독/후반 가속 곡선 검증용. */
    durabilityInfo(durability: number) {
      return {
        cost: wellbeingCostFactor(durability),
        growth: growthFactor(durability),
        base11: durabilityBase(11),
        base20: durabilityBase(20),
      }
    },
    /** 엔딩 씬을 조립해 돌려준다. 조립 완전성 검증이 이 경로로 돈다. */
    buildEndingScene(state?: Record<string, unknown>) {
      const result = judgeEnding((state ?? useGame.getState().game) as never)
      const scene = buildEndingScene(result)
      return { skeletonId: endingSkeletonId(result), scene, result }
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
    /** 돌발 현안 — 모델 응답을 클램프까지 통과시킨 결과. 방어 실험용. */
    parseIncident(raw: string, withChoices: boolean) {
      return parseIncident(raw, withChoices)
    },
    /**
     * ★ 공격 응답을 **실제로 게임 상태에 적용 시도**한다.
     *   파싱 결과만 보면 "클램프가 걸렀다"까지밖에 못 본다.
     *   진짜 확인할 것은 그 뒤 게임 상태가 정말 안 움직였는가다.
     */
    applyIncidentAttack(raw: string) {
      const incident = parseIncident(raw, true)
      if (!incident) return null
      for (const choice of incident.choices) {
        useIncidents.setState({
          byEvent: { __attack: { ...incident, choices: [choice] } },
          chosen: {},
        })
        useIncidents.getState().choose('__attack', 0)
      }
      return incident
    },
    resetIncidents() {
      useIncidents.getState().reset()
    },
    /**
     * 엔진 endTurn 을 직접 한 번 돌린다(검증용) — UI 클릭 없이 결정론적으로 턴을 진행.
     * plannedActivityIds 를 주면 그 활동을 수행한 것으로 친다. 소소-비트·위험 누적·
     * 데드엔딩 파이프라인을 그대로 탄다(실제 파이프라인과 같은 함수).
     */
    stepTurn(plannedActivityIds?: string[]) {
      const g = useGame.getState().game
      const staged = plannedActivityIds ? { ...g, plannedActivityIds } : g
      const next = endTurn(staged, rng)
      useGame.setState({ game: next })
      return {
        // ★ 인라인 소소까지 포함한 **이번 달 전체** 이벤트. pendingEventIds 는
        //   별도 화면으로 갈 것만 담으므로, 밀도·발동을 재는 검증엔 리포트 쪽을 준다.
        triggeredEventIds: next.lastTurnReport?.triggeredEventIds ?? next.pendingEventIds,
        pendingEventIds: next.pendingEventIds,
        age: next.age,
        date: next.date,
        phase: next.phase,
        counters: next.counters,
        flags: next.flags,
      }
    },
    /** 이벤트를 화면에 강제로 띄운다 — 확률과 싸우지 않고 UI 만 검증하기 위해. */
    forceEvent(eventId: string) {
      const game = useGame.getState().game
      useGame.setState({ game: { ...game, pendingEventIds: [eventId], phase: 'event' } })
    },
    setIncidentTimer(on: boolean) {
      useIncidents.getState().setTimerEnabled(on)
    },
    /** 돌발 생성을 직접 호출한다 — 재시도(stale null) 검증용. */
    genIncident(eventId: string) {
      return useIncidents.getState().generate(eventId)
    },
    /** 돌발 생성 스토어 상태 — 빈 예고 회귀 진단용. */
    incidentState() {
      const s = useIncidents.getState()
      return {
        byEvent: Object.fromEntries(
          Object.entries(s.byEvent).map(([k, v]) => [k, v === null ? null : 'incident']),
        ),
        loading: s.loading,
        chosen: s.chosen,
      }
    },
    /**
     * 돌발 발동 확률을 올린다 — ablation 전용.
     *
     * 결정론 모드는 rng 를 0.5 로 고정하므로 6~8% 확률은 절대 통과하지 않는다.
     * 그러면 "제거해도 같다"가 공허해진다(애초에 안 나오니까).
     * 확률을 0.5 위로 올려 **정상보다 훨씬 자주** 터뜨린 상태에서 대조하면,
     * 과다 투여에도 미스터리가 흔들리지 않는지를 본다. 더 센 조건이다.
     */
    /**
     * 돌발 발동 압력 — ablation 전용. 이제 돌발은 소소-비트 스케줄러가 굴리므로
     * (메인 루프 밖) 스케줄러의 압력을 올린다. rate<=0 이면 소소 채널 자체를 끈다
     * (verify:devices 처럼 돌발이 끼면 안 되는 검증용 — 손 풀 소소도 안 뜨게).
     */
    setIncidentRate(rate: number) {
      if (rate <= 0) {
        setMinorEnabled(false)
        return
      }
      setMinorEnabled(true)
      setIncidentPressure(rate)
    },
    /** 소소 채널 on/off + 튜닝 초기화 — 다른 시스템 격리 검증용. */
    setMinorEnabled(on: boolean) {
      if (on) resetMinorTuning()
      else setMinorEnabled(false)
    },
    /** 텍스트 속도 — 씬 내용 검증 스위트가 타이핑 없이(즉시) 진행하도록 격리용. */
    setTextSpeed(speed: '느리게' | '보통' | '빠르게' | '즉시') {
      useOptions.getState().setTextSpeed(speed)
    },
    /** 날짜별 컷신 on/off — 검증 스위트가 컷신을 켜서 보거나 꺼서 요약으로 바로 가기 위해. */
    setCutsceneEnabled(on: boolean) {
      useOptions.getState().setCutsceneEnabled(on)
    },
    /** 초상 경로 해석 — 성별×나이×착장 + 폴백 체인 검증용. */
    portraitSrc(gender: 'male' | 'female', age: number, outfit: string) {
      const m = useGame.getState().outfitManifest
      return m.portraits ? resolveMonarchPortrait(m.portraits, gender, age, outfit) : null
    },
    /** 캐릭터 초상 경로 해석 — charId×성별×나이 + 폴백(배선2). */
    charPortraitSrc(charId: string, gender: 'male' | 'female', age: number) {
      const m = useGame.getState().outfitManifest
      return m.characterPortraits
        ? resolveCharacterPortrait(m.characterPortraits, charId, gender, age)
        : null
    },
    /** 임의 매니페스트 객체를 검증한다 — 하위호환(축 없는 옛 매니페스트) 확인용. */
    validateManifest(raw: unknown) {
      return validateManifest(raw)
    },
    clearKey() {
      useAi.setState({ apiKey: '' })
    },

    /** 정치 고유장치 이벤트 id. */
    deviceIds() {
      return DEVICE_EVENTS.map((e) => e.id)
    },
    /** 일상 소소 풀(계절·나이 조건 검증용) — id·title·조건·본문. */
    dailyEvents() {
      return DAILY_EVENTS.map((e) => ({
        id: e.id, title: e.title, month: e.condition?.month ?? null,
        minAge: e.condition?.minAge ?? null, maxAge: e.condition?.maxAge ?? null,
        text: e.text,
      }))
    },
    /** 시작 기질 데이터(검증용) — 스탯 총합·신뢰·성향. */
    temperaments() {
      return TEMPERAMENTS.map((t) => ({
        id: t.id, name: t.name,
        stats: t.stats, statSum: Object.values(t.stats).reduce((a, b) => a + b, 0),
        tutorTrust: t.tutorTrust, up: t.up, down: t.down, trustUp: !!t.trustUp,
      }))
    },
    /** 결정적 씬 이벤트 id. */
    decisiveIds() {
      return DECISIVE_EVENTS.map((e) => e.id)
    },
    /** 청산·후일담 이벤트 id. */
    reckoningIds() {
      return [...RECKONING_EVENTS, ...RECKONING_AFTERMATH].map((e) => e.id)
    },

    /**
     * ★ 결정론 모드 — variance 를 0 으로 만든다.
     *   ablation 비교의 전제다. 난수가 살아 있으면 두 빌드의 차이가
     *   제거 때문인지 운 때문인지 가릴 수 없다.
     */
    setDeterministic(on = true) {
      setDeterministic(on)
    },

    /**
     * ★ 실제 제거(ablation) — 지정한 콘텐츠 팩을 런타임에서 들어낸다.
     *
     *   정적 대조("직접 참조 없음")는 의도를 보고, 이건 결과를 본다.
     *   우선순위 경쟁이나 턴 예산 소모 같은 **간접 영향**은 실제로 들어내 봐야만 잡힌다.
     *   EVENTS 는 배열이라 splice 로 제자리에서 비운다 — findTriggeredEvents 가
     *   매번 이 배열을 훑으므로 즉시 반영된다.
     */
    ablate(packs: string[]) {
      const removed: string[] = []
      const drop = (events: { id: string }[]) => {
        for (const e of events) {
          const index = EVENTS.findIndex((x) => x.id === e.id)
          if (index >= 0) {
            EVENTS.splice(index, 1)
            removed.push(e.id)
          }
        }
      }
      if (packs.includes('bloodoath')) drop(BLOOD_OATH_EVENTS)
      if (packs.includes('devices')) drop(DEVICE_EVENTS)
      // 돌발은 이제 메인 루프 밖(소소 스케줄러)이라 splice 로 못 뺀다 —
      // 스케줄러에서 AI 옵션을 들어내는 것으로 제거한다(손 풀은 남는다).
      if (packs.includes('incidents')) {
        setIncidentsAblated(true)
        removed.push(...INCIDENT_EVENTS.map((e) => e.id))
      }
      if (packs.includes('hardexclusive')) {
        drop([...DECISIVE_EVENTS, ...RECKONING_EVENTS, ...RECKONING_AFTERMATH, ...CONQUEST_EVENTS])
      }
      if (packs.includes('topics')) TOPICS.splice(0, TOPICS.length)
      return { removed, remainingEvents: EVENTS.length, remainingTopics: TOPICS.length }
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

    /**
     * ★ 성별 파라미터화 불변식 스냅샷 (성별 제한 해제 1차).
     *
     *   모든 서사 텍스트(씬·이벤트·엔딩 삽입·페르소나)를 **고정 기본 상태**에서 치환한
     *   결과를 순서대로 돌려준다. 리터럴을 토큰으로 바꾸는 작업이 "기본 배치에서 출력을
     *   1바이트도 안 바꾼다"를 증명하려면, 변경 전/후 이 배열이 완전히 같아야 한다.
     *   patch 로 성별을 갈아 끼우면 "성별을 바꾸면 실제로 달라지는가"도 같은 경로로 본다.
     */
    genderSnapshot(patch?: Record<string, unknown>) {
      const state = {
        ...useGame.getState().game,
        monarchGender: 'male',
        monarchName: '카이로스',
        ...patch,
      } as never
      const out: string[] = []
      // ★ 모든 문자열을 치환한다(토큰 유무로 거르지 않는다) — 리터럴이 토큰으로 바뀌어도
      //   같은 walk 위치에서 같은 결과가 나와야 배열이 정렬돼 diff 가 성립한다.
      const walk = (v: unknown) => {
        if (typeof v === 'string') {
          out.push(resolveText(v, state))
        } else if (Array.isArray(v)) {
          v.forEach(walk)
        } else if (v && typeof v === 'object') {
          Object.values(v).forEach(walk)
        }
      }
      walk(SCENES)
      walk(EVENTS)
      walk(ENDING_INSERTS)
      walk(CHARACTER_SHEETS)
      return out
    },

    /**
     * ★ 세이브 슬롯 · Export/Import 검증용 시임.
     *   슬롯은 세이브 키만 만지고 갤러리·읽음기록·옵션은 별개 키다 —
     *   「처음부터」/「전체 초기화」가 무엇을 지우고 무엇을 남기는지 실측한다.
     */
    save: {
      /** 5개 슬롯 요약. */
      slots: () => listSlots(),
      hasAny: () => hasAnySave(),
      /** 스토어 액션 그대로 — 현재 게임을 슬롯에 저장/로드(activeSlot·notice 포함). */
      saveSlot: (slot: number) => useGame.getState().save(slot),
      loadSlot: (slot: number) => useGame.getState().load(slot),
      reset: () => useGame.getState().reset(),
      activeSlot: () => useGame.getState().activeSlot,
      /** 텍스트 코드 왕복. */
      exportSlot: (slot: number) => exportSlot(slot),
      importCode: (code: string) => importCode(code),
      /** 옛 단일 세이브 → slot0 이관(부팅 로직 직접 호출). */
      migrateLegacy: () => migrateLegacySave(),
      /** 「전체 초기화」와 같은 삭제(슬롯+갤러리+읽음기록, 옵션 보존). */
      wipeAll: () => {
        clearAllSlots()
        clearGallery()
        clearReadlog()
      },
      /** 전역 키 스냅샷 — 슬롯 조작 뒤에도 남아 있는지 대조용. */
      globals: () => ({
        gallery: [...getAchieved()],
        readlog: [...getRead()],
        options: JSON.parse(localStorage.getItem('queening.options') ?? 'null'),
      }),
    },

    /**
     * ★ 타이틀 건너뛰고 게임 화면으로 진입한다 (D-1).
     *   앱이 이제 타이틀에서 시작하므로, 검증 스크립트는 이걸 불러 게임에 들어간다.
     *   온보딩 없이(검증은 게임 루프를 보므로).
     */
    enterGame() {
      useApp.getState().startGame(false)
    },
    /** 게임 상태를 갈아끼운다(검증에서 대조적인 두 군주를 만들 때). */
    setGame(patch: Record<string, unknown>) {
      // 타이틀에 막혀 있으면 자동으로 게임에 들어간다 — 검증 편의.
      if (useApp.getState().screen !== 'game') useApp.getState().startGame(false)
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
    /** 임의의 상태로 토큰을 치환한다 — 조립 검증이 세이브마다 다른 성별을 쓰기 위해. */
    resolveWith(text: string, state: Record<string, unknown>) {
      return resolveText(text ?? '', state as never)
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
