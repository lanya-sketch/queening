// 게임 전체가 공유하는 타입 계약.
// data/ 의 콘텐츠와 systems/ 의 로직은 오직 이 파일을 통해 만난다.

/**
 * ★ 월 단위 (월 단위 전환 1단계). 예전엔 계절(연 4턴)이었으나,
 *   육성 시뮬로는 너무 성겨서 월(연 12턴)로 바꿨다.
 *   year 는 즉위 후 경과 연차(0 = 즉위년), month 는 1..12.
 *   나이 기반 로직은 그대로 — 한 나이 안의 턴 수만 4→12 로 늘었다.
 */
export interface GameDate {
  year: number
  month: number
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
  | 'courtInfluence'
  | 'regentSuspicion'
  | 'regentRapport'
  | 'actionPoints'

/** 플레이어에게 수치를 미리 보여주지 않는 게이지. 선택지 미리보기에서 가려진다. */
export type GaugeKey = Exclude<ResourceKey, 'actionPoints'>

export type EffectTarget =
  | { kind: 'stat'; key: StatKey }
  | { kind: 'resource'; key: ResourceKey }
  | { kind: 'affection'; charId: string }
  /**
   * 계절 단위 타이머. 규칙은 하나뿐 — **매 턴 1씩 줄고 0에서 멈춘다.**
   * 체류 기간 같은 "몇 계절 뒤에 끝나는 것"을 엔진 코드 없이 데이터로만 쓴다.
   */
  | { kind: 'counter'; key: string }

/** 군주·캐릭터의 성별. 마나 설정상 사회적 위치에는 차이가 없다(배경일 뿐). */
export type Gender = 'male' | 'female'

/** 연애 대상 정의. 실제 성격·대사는 M2b-3b. */
export interface Character {
  id: string
  name: string
  role: string
  /** ★ 하드코딩하지 않고 데이터로 둔다 — (다) 전면 성별 선택 대비. */
  gender: Gender
  startingAffection: number
  /** 로맨스 해금 조건(영구 관문). 한 번 열리면 닫히지 않는다. */
  romanceUnlock: Condition
  /**
   * 상주하지 않는 인물의 현재 체류 여부.
   *
   * ★ romanceUnlock 과 일부러 분리했다. "아직 조건이 안 됐다"(잠금)와
   *   "열렸지만 지금 궁에 없다"(부재)는 플레이어에게 전혀 다른 정보다.
   *   이 필드가 없으면 지금까지처럼 상주 인물로 취급한다.
   */
  presence?: { flag: string; awayNote: string }
  portraitId: string
}

/** 대사 씬 한 줄. speaker 는 'narration' | 'monarch' | charId. */
export interface SceneLine {
  speaker: string
  /** 토큰({왕} 등)을 포함할 수 있다. 렌더 직전에 치환된다. */
  text: string
  /** 표정·컷 키(선택). 지금은 표시에만 쓴다. */
  portrait?: string
}

export interface Scene {
  id: string
  lines: SceneLine[]
}

/**
 * 엔딩 조립 (M3-2).
 *
 * ★ 조합 폭발(tier×disposal×truth×romance×nation×modifier = 수백)을
 *   골격(뼈대) + 삽입(문단)으로 감당한다. 골격은 tier 로 갈리고, 나머지 축은
 *   골격 안의 anchor 자리에 삽입이 조건부로 끼워진다.
 *
 * 판정(M3-1)은 건드리지 않는다. 조립은 EndingResult 를 **읽기만** 한다.
 */
export type EndingAnchor =
  | 'opening' | 'truth' | 'disposal' | 'special' | 'romance' | 'nation' | 'purge' | 'closing'

/** 골격의 한 줄. text 면 고정 문장, anchor 면 삽입이 들어갈 자리. */
export interface EndingLine {
  speaker: 'narration' | 'monarch'
  text?: string
  anchor?: EndingAnchor
}

export interface EndingSkeleton {
  id: string
  /** 이 골격이 받는 조건. catch-all 골격은 () => true. */
  match: (r: EndingResult) => boolean
  /** 여러 골격이 매칭되면 큰 값이 이긴다. catch-all 은 0. */
  priority: number
  lines: EndingLine[]
}

export interface EndingInsert {
  anchor: EndingAnchor
  match: (r: EndingResult) => boolean
  /** 전용 삽입이 일반 삽입을 이긴다. */
  priority: number
  lines: SceneLine[]
}

/**
 * 대화 중 해금되는 고정 화제 (M2b-3c-2).
 *
 * ★ 엔진에 캐릭터 분기가 없다. ①의 아버지 이야기든 ④의 전장 이야기든
 *   `TOPICS` 배열에 객체 하나를 더하는 것으로 끝나야 한다.
 *
 * AI 감지가 아니라 **결정론적 해금**이다 — 관계가 깊어지면 그 사람의 핵심 화제에
 * 닿을 수 있고, 열린 화제는 고정 대사로 재생된다. 그래서 effects 는 코드가 소유하는
 * 확실한 보상이고, 모델 응답 품질에 좌우되지 않는다.
 */
export interface TalkTopic {
  id: string
  charId: string
  /** 대화 화면에 뜰 선택지 문구. */
  label: string
  /** 해금 조건. 이벤트와 같은 Condition 을 그대로 쓴다. */
  unlock: Condition
  sceneId: string
  /** 고른 뒤 확정 적용되는 효과. AI 와 무관한 고정값. */
  effects?: Effect[]
  setFlags?: FlagSet
}

export interface Effect {
  target: EffectTarget
  /** 음수 가능. */
  amount: number
  /** ±편차. 지정 시 amount 에 [-variance, +variance] 정수를 더한다. */
  variance?: number
}

export type FlagSet = Record<string, boolean>

/**
 * 확률 발동 규칙.
 *
 * ★ 이건 특정 이벤트를 위한 장치가 아니다. condition 을 통과한 이벤트가
 *   "그래서 이번 계절에 실제로 터지는가"를 정하는 **일반 틀**이며,
 *   M2b-4 의 AI 돌발 현안(흉년·귀족 파벌)이 그대로 이 필드를 쓴다.
 *
 * 주사위는 항상 코드가 굴린다(엔진에 rng 주입). AI 는 이 계산에 관여하지 않는다.
 *
 * 순수 무작위를 쓰지 않는 이유는 pity 에 있다 — 운이 나빠도 반드시 도달하고,
 * lures 로 "운이 아니라 자원을 지불해 확률을 사는" 길을 연다.
 */
export interface ChanceRule {
  /** 계절당 기본 확률 0~1. */
  base: number
  /** 호감도가 100 일 때 더해지는 양. 선형 보간한다. */
  perAffection?: { charId: string; at100: number }
  /** 그 턴에 수행한 활동 id → 가산량. 여러 개면 모두 더한다. */
  lures?: Record<string, number>
  /**
   * 천장. 조건은 맞았는데 판정에 떨어진 횟수가 after 를 넘으면 매회 step 씩
   * 오르고, guarantee 회에 도달하면 무조건 발동한다.
   */
  pity?: { after: number; step: number; guarantee: number }
  /** 발동 후 이만큼의 계절 동안 재발동하지 않는다. */
  cooldown?: number
}

/** 활동·이벤트가 공유하는 선언적 발동 조건. 지정한 항목만 검사한다. */
export interface Condition {
  minYear?: number
  maxYear?: number
  /** 특정 월(1..12)에만. 예전 계절 조건의 대체 — 봄=3·여름=6·가을=9·겨울=12 임시 매핑. */
  month?: number
  minAge?: number
  maxAge?: number
  stats?: Partial<Record<StatKey, { min?: number; max?: number }>>
  resources?: Partial<Record<GaugeKey, { min?: number; max?: number }>>
  /** 계절 타이머 검사. 없는 카운터는 0 으로 본다. */
  counters?: Record<string, { min?: number; max?: number }>
  /** 캐릭터별 호감도 검사. 키는 charId. 없으면 startingAffection 으로 본다. */
  affection?: Record<string, { min?: number; max?: number }>
  /** 해당 flag 가 지정한 값과 일치해야 한다. */
  flags?: FlagSet
}

/**
 * 수업 등급 (밸런스 재설계 1단계).
 *
 * ★ 카드는 스탯당 한 장 그대로 두고, **현재 스탯에 따라 등급이 자동 전환**된다.
 *   활동 목록이 불어나지 않으면서 "밀어준 스탯만 고급에 닿는다"가 성립한다 —
 *   벌이 아니라 특화에 복리를 주는 방식이고, 균형 육성은 스스로 비효율이 된다.
 */
export interface ActivityTier {
  /** 이 등급이 열리는 기준 스탯 하한. */
  min: number
  /** 카드에 붙는 배지(초급·중급·고급). */
  label: string
  effects: Effect[]
}

export interface Activity {
  id: string
  name: string
  description: string
  apCost: number
  /** 등급이 없을 때 쓰는 기본 효과. tiers 가 있으면 등급 효과가 이걸 대체한다. */
  effects: Effect[]
  /** 등급 판정 기준 스탯. tiers 와 함께 쓴다. */
  tierStat?: StatKey
  /** 있으면 tierStat 수준에 따라 하나가 선택된다(min 내림차순으로 최초 일치). */
  tiers?: ActivityTier[]
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
  /**
   * 히든 게이지(의심·신망)만 움직이는 선택지에 붙이는 질적 힌트.
   * 수치는 계속 감추되 "뭔가 바뀌었다"는 신호는 준다.
   */
  hint?: string
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
  /** 큰 값이 먼저 발동. 기본 0. 대역 규칙은 data/events/priority.ts 참고. */
  priority?: number
  /**
   * 있으면 condition 을 통과해도 확률 판정을 한 번 더 거친다.
   * 없으면 지금까지와 완전히 동일하게 조건만으로 발동한다.
   */
  chance?: ChanceRule
  effects?: Effect[]
  setFlags?: FlagSet
  choices?: Choice[]
  /**
   * 있으면 대사 씬으로 재생한다(한 줄씩 진행 → 마지막에 choices).
   * 없으면 지금까지와 완전히 동일하게 text 를 그대로 보여준다.
   */
  sceneId?: string
  /**
   * 기본 'scripted'.
   *
   * ★ 'ai_generated' 는 **내용을 AI 가 채우는 자리표시자**다(M2b-4).
   *   엔진은 이 값을 딱 한 가지 목적으로만 읽는다 — 키가 없으면 후보에서 제외.
   *   "발동은 했는데 보여줄 게 없다"를 막기 위해서다. 그 외의 판단은 하지 않는다.
   */
  source?: 'scripted' | 'ai_generated'
  /**
   * 기본 'story'. 'state_affair' = 정치 현안 — 새 시스템이 아니라 이벤트의 한 유형이다.
   * 엔진은 이 값을 읽지 않고, 화면에서 라벨만 다르게 표시한다.
   */
  category?: 'story' | 'state_affair'
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

/**
 * 나이×성별×착장 초상 해석 규칙 (콘텐츠·에셋 배선 1).
 *
 * ★ M2a 원칙 유지 — 런타임 JSON, 하위호환. 이 섹션이 **없는** 옛 매니페스트도 그대로
 *   로드되고, 그때는 각 Outfit 의 thumbSrc/fullSrc(단일 이미지)로 폴백한다.
 *   있으면 monarch_{code}_{outfit}_{age} 크롭본/원본을 성별·나이·착장으로 해석한다.
 */
export interface PortraitConfig {
  /** 크롭본(초상 썸네일) 베이스 경로. */
  thumbBase: string
  /** 원본(전신, 확대 모달) 베이스 경로. */
  fullBase: string
  /** 성별 → 하위 폴더명. */
  genderDir: Record<Gender, string>
  /** 성별 → 파일명 코드(m/f). */
  code: Record<Gender, string>
  /** 파일명 틀. {code}/{outfit}/{age} 치환. */
  file: string
  ageMin: number
  ageMax: number
  /** 경로를 만들 수 있는 착장 코드들. */
  outfits: string[]
  /** 특정 나이에만 있는 착장(예: debut=[16]). 벗어나면 fallbackOutfit 로. */
  restrict?: Record<string, number[]>
  /** 조합이 없을 때 대체 착장. */
  fallbackOutfit: string
}

/**
 * 캐릭터(5인 + 모후·섭정공) 초상 해석 (콘텐츠·에셋 배선 2).
 *
 * ★ 두 지점에 쓴다 — 대화창 크롭(thumb)과 이벤트 씬 전신(full).
 *   경로 틀 {gdir}(male/female)·{code}(m/f)·{age} 를 치환한다. aged:false 면 {age} 없음.
 *   gender 가 있으면(모후·섭정공처럼 CHARACTERS 밖) 그 성별 고정, 없으면 호출자가 넘긴 성별.
 */
export interface CharPortraitEntry {
  /** thumbBase/fullBase 아래 상대 경로 틀. */
  path: string
  /** 나이축이 있는가(있으면 {age} clamp). hero·모후·섭정공은 false. */
  aged: boolean
  /** CHARACTERS 밖 인물의 고정 성별(모후=female, 섭정공=male). */
  gender?: Gender
}

export interface CharacterPortraitConfig {
  thumbBase: string
  fullBase: string
  code: Record<Gender, string>
  ageMin: number
  ageMax: number
  chars: Record<string, CharPortraitEntry>
}

export interface OutfitManifest {
  version: number
  outfits: Outfit[]
  /** 있으면 나이×성별×착장으로 군주 초상을 해석한다. 없으면 outfit 의 단일 이미지 사용. */
  portraits?: PortraitConfig
  /** 있으면 5인·모후·섭정공 초상을 charId×성별×나이로 해석한다. */
  characterPortraits?: CharacterPortraitConfig
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

/**
 * 엔딩 판정 결과 (M3-1).
 *
 * ★ 여기에는 연출이 없다. "이 세이브가 어떤 엔딩 조합인가"라는 **구조**만 담는다.
 *   텍스트와 씬은 M3-2 가 이 구조를 받아서 만든다.
 */
export type EndingTier =
  | '친정' | '공존' | '허수아비'
  | '배드:꼭두각시' | '배드:군부종속' | '배드:제국복속'

export type EndingDisposal = '정당' | '폭군' | '회유' | '못함'

export type EndingTruth = '모름' | '섭정관여' | '모후주모'

export interface EndingResult {
  tier: EndingTier
  disposal: EndingDisposal
  truthLevel: EndingTruth
  /** 깊은 관계인 캐릭터 중 호감도가 가장 높은 하나. 없으면 'none'. */
  romance: string | 'none'
  /** 나라의 향방을 이루는 flag 들. 배타가 아니라 수집이다. */
  nationFlags: string[]
  /** 엔딩의 색을 정하는 수식들. 역시 복수 수집. */
  modifiers: string[]
  /** 어느 위기를 한 번의 유예로 면했는지. 판정을 사후에 설명하기 위해 남긴다. */
  reprieve: { used: boolean; from: string | null }
  /** 국력. 판정 근거를 남긴다. */
  power: number
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
  /**
   * ★ 내구도 — 숨은 상태 (월 단위 전환 1단계). UI 에 막대가 없고 상세창에서만 보인다.
   *   두 역할: (1) 낮으면 심신 소모가 커지고(어릴 때 혹독), (2) 높으면 성장이 빨라진다
   *   (잘 관리한 만큼 후반 가속). 나이 기본값 + 심신을 잘 유지한 달의 누적.
   */
  durability: number
  tutorTrust: number
  regentSuspicion: number
  /** 섭정이 군주를 통치자로 인정하는 정도. 회유 루트의 열쇠. */
  regentRapport: number
  /** 군주가 실제로 국정을 장악한 정도. 허수아비(10)에서 시작한다. */
  courtInfluence: number
  actionPoints: number
  /** 현재 입고 있는 착장 id. 매니페스트에 없으면 기본 착장으로 되돌린다. */
  currentOutfitId: string
  /** 군주의 성별. 연애 대상들의 성별은 데이터(CHARACTERS)에 있다. */
  monarchGender: Gender
  /** 캐릭터별 호감도 0~100. 키는 charId. */
  affection: Record<string, number>
  plannedActivityIds: string[]
  /**
   * 계절 타이머. 매 턴 전부 1씩 줄고 0 에서 멈춘다.
   * `__pity:<id>` / `__cooldown:<id>` 는 확률 엔진이 스스로 관리하는 내부 키다.
   */
  counters: Record<string, number>
  flags: FlagSet
  phase: Phase
  lastTurnReport: TurnReport | null
  /** 결과 화면 이후 순차로 보여줄 이벤트 id 큐. */
  pendingEventIds: string[]
  // 확장 예약: affection / relationships / seenScenes 는 M2 이후에 추가한다.
}
