// 게임 전체가 공유하는 타입 계약.
// data/ 의 콘텐츠와 systems/ 의 로직은 오직 이 파일을 통해 만난다.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** year 는 즉위 후 경과 연차(0 = 즉위년). */
export interface GameDate {
  year: number
  season: Season
}

export type StatKey = 'statecraft' | 'finance' | 'rhetoric' | 'martial' | 'courtcraft'

export type Stats = Record<StatKey, number>

/**
 * 스탯이 아닌 자원·게이지. 0~100 으로 다루되 actionPoints 만 예외.
 * regentSuspicion(경계도)과 regentRapport(통치자로 인정하는 정도)는 별개 축이다.
 */
export type ResourceKey =
  | 'wellbeing'
  | 'tutorTrust'
  | 'regentSuspicion'
  | 'regentRapport'
  | 'actionPoints'

/** 플레이어에게 수치를 미리 보여주지 않는 게이지. 선택지 미리보기에서 가려진다. */
export type GaugeKey = Exclude<ResourceKey, 'actionPoints'>

export type EffectTarget =
  | { kind: 'stat'; key: StatKey }
  | { kind: 'resource'; key: ResourceKey }
// 확장 예약: | { kind: 'affection'; charId: string }

export interface Effect {
  target: EffectTarget
  /** 음수 가능. */
  amount: number
  /** ±편차. 지정 시 amount 에 [-variance, +variance] 정수를 더한다. */
  variance?: number
}

export type FlagSet = Record<string, boolean>

/** 활동·이벤트가 공유하는 선언적 발동 조건. 지정한 항목만 검사한다. */
export interface Condition {
  minYear?: number
  maxYear?: number
  season?: Season
  minAge?: number
  maxAge?: number
  stats?: Partial<Record<StatKey, { min?: number; max?: number }>>
  resources?: Partial<Record<GaugeKey, { min?: number; max?: number }>>
  /** 해당 flag 가 지정한 값과 일치해야 한다. */
  flags?: FlagSet
}

export interface Activity {
  id: string
  name: string
  description: string
  apCost: number
  effects: Effect[]
  setFlags?: FlagSet
  /** 미해금 활동을 붙일 자리. M1 데이터에는 아직 없다. */
  requires?: Condition
  tags?: string[]
}

/**
 * 이벤트 선택지.
 * 기본 effects 는 턴 종료 시 일괄 적용되지만, 선택지 effects 는
 * 플레이어가 고른 순간 적용되고 그 자리에서 결과를 보여준다.
 */
export interface Choice {
  id: string
  label: string
  /** 미충족이면 비활성 + describeCondition() 으로 사유를 표시한다. */
  requires?: Condition
  effects?: Effect[]
  setFlags?: FlagSet
  /** 고른 뒤 이어지는 후일담. */
  resultText: string
}

export interface GameEvent {
  id: string
  title: string
  /** 확장 예약: 나중에 scene: Scene 으로 승격될 자리. */
  text: string
  condition: Condition
  /** 기본 true. 발동 시 flag `event:<id>` 가 자동 기록된다. */
  once?: boolean
  /** 큰 값이 먼저 발동. 기본 0. */
  priority?: number
  effects?: Effect[]
  setFlags?: FlagSet
  choices?: Choice[]
  /**
   * 기본 'scripted'. 엔진은 이 값을 읽지 않는다 —
   * M2b 에서 AI 가 같은 구조로 돌발 이벤트를 주입할 때를 위한 표식일 뿐.
   */
  source?: 'scripted' | 'ai_generated'
}

/**
 * 착장 한 벌. 이미지는 public/assets/outfits/ 아래에 두고 경로만 가리킨다.
 * unlockCondition 은 이벤트와 동일한 Condition 을 재사용한다.
 */
export interface Outfit {
  id: string
  name: string
  description: string
  thumbSrc: string
  fullSrc: string
  unlockCondition?: Condition
}

export interface OutfitManifest {
  version: number
  outfits: Outfit[]
}

/** 결과 화면이 그대로 렌더할 수 있도록, 실제 적용된 변화량만 담는다. */
export interface TurnReport {
  /** 방금 소화한 턴의 날짜(진행 전). */
  date: GameDate
  activityIds: string[]
  /** 활동으로 인한 변화. clamp 후 실제 변화량. */
  activityDeltas: Delta[]
  /** 이벤트로 인한 변화. */
  eventDeltas: Delta[]
  triggeredEventIds: string[]
}

export interface Delta {
  label: string
  amount: number
}

/** 'ended' = 20세를 넘겨 이번 단계의 끝점에 도달한 상태(엔딩은 M3). */
export type Phase = 'schedule' | 'result' | 'event' | 'ended'

/** 선택지를 고른 직후 이벤트 화면이 보여줄 결과. 세이브에 넣지 않는 UI 상태. */
export interface ChoiceOutcome {
  eventId: string
  choiceId: string
  deltas: Delta[]
}

export interface GameState {
  date: GameDate
  age: number
  stats: Stats
  wellbeing: number
  tutorTrust: number
  regentSuspicion: number
  /** 섭정이 군주를 통치자로 인정하는 정도. 회유 루트의 열쇠. */
  regentRapport: number
  actionPoints: number
  /** 현재 입고 있는 착장 id. 매니페스트에 없으면 기본 착장으로 되돌린다. */
  currentOutfitId: string
  plannedActivityIds: string[]
  flags: FlagSet
  phase: Phase
  lastTurnReport: TurnReport | null
  /** 결과 화면 이후 순차로 보여줄 이벤트 id 큐. */
  pendingEventIds: string[]
  // 확장 예약: affection / relationships / seenScenes 는 M2 이후에 추가한다.
}
