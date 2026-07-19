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

/** 스탯이 아닌 자원·게이지. 0~100 으로 다루되 actionPoints 만 예외. */
export type ResourceKey = 'wellbeing' | 'tutorTrust' | 'regentSuspicion' | 'actionPoints'

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
  resources?: Partial<Record<Exclude<ResourceKey, 'actionPoints'>, { min?: number; max?: number }>>
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
  // 확장 예약: choices?: Choice[]
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

export type Phase = 'schedule' | 'result' | 'event'

export interface GameState {
  date: GameDate
  age: number
  stats: Stats
  wellbeing: number
  tutorTrust: number
  regentSuspicion: number
  actionPoints: number
  plannedActivityIds: string[]
  flags: FlagSet
  phase: Phase
  lastTurnReport: TurnReport | null
  /** 결과 화면 이후 순차로 보여줄 이벤트 id 큐. */
  pendingEventIds: string[]
  // 확장 예약: affection / relationships / seenScenes 는 M2 이후에 추가한다.
}
