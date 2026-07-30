import type { Effect, GameEvent, GameState, Scene, SceneLine } from '../../types/game'

/**
 * ★ [5] 질투 — 문어발의 대가(제한이 아니라 대가). 측실·관용과 같은 방식.
 *
 * 결정적 씬이 하드 배타성을 지키니 만남 자체는 자유롭게 연다. 대신 여러 명과 깊어지면
 * 질투가 뜨고, 그때마다 **누구를 우선할 것인가**를 3갈래로 묻는다 — 그 누적이
 * 결정적 씬으로 흘러든다(이번 라운드는 leaning/wavered 기록만, 씬 개편은 다음).
 *
 * 3갈래(성격이 다르다):
 *   달랜다  — 질투한 쪽(Y) 회복(+), 그 달 만난 쪽(X) 소폭 하락(−). 관계 유지·Y 로 기욺.
 *   솔직히  — Y 크게 하락(−−). 정리·밀어냄. 단 '통하는' 성격은 오히려 −1(존중).
 *   넘어간다 — Y 하락(−hurt), X 그대로. 미룸 — 아무것도 정하지 않은 대가.
 *
 * ★ 같은 갈래도 사람마다 다르다(바이블 1층). 이번 라운드는 ①heir·②loyalist 만
 *   대사를 쓰고(조우 대화와 앞뒤 맞춤), ③④⑤ 는 표만 남겨 다음 라운드에 쓴다.
 *   ★ 이 표는 그대로 유지한다 — 설계가 확정됐다.
 */

const N = (text: string): SceneLine => ({ speaker: 'narration', text })
const aff = (charId: string, amount: number): Effect => ({ target: { kind: 'affection', charId }, amount })

// ── 상수 ──
/** 질투가 발동하는 최소 호감(관심 없으면 질투도 없다). */
export const JEALOUSY_MIN = 30
/** 질투 쿨다운(달) — 매달 뜨면 피곤하니 가끔. */
export const JEALOUSY_COOLDOWN = 3
/** 쿨다운 카운터 — tickCounters 가 매 턴 1 씩 깎는다(타이머). */
export const JEALOUSY_CD = '__jealousy_cd'
/** 그 달 만난 쪽(X) — 달래기의 '다른 쪽 하락' 대상. 질투 발동 시 세우고 다음 턴 소거. */
export const jealousyRivalFlag = (charId: string) => `jealousy_rival:${charId}`
export const JEALOUSY_RIVAL_PREFIX = 'jealousy_rival:'
/** ★ 기록 카운터(비-감쇠, __bond: prefix) — 결정적 씬 개편(다음 라운드) 재료. */
export const leaningCounter = (charId: string) => `__bond:leaning:${charId}`
export const WAVERED_COUNTER = '__bond:wavered'

/** 질투 대사가 있는 인물(이번 라운드 ①②). ③④⑤ 는 다음 라운드. */
export const JEALOUSY_CHARS = ['heir', 'loyalist']
/** 연애 대상 전체 — "2인 이상 30↑"(문어발 판정)의 모집단. */
const ROMANCE_IDS = ['heir', 'loyalist', 'prince', 'commander', 'hero']

/** 질투 하락 기준값 — 관심 클수록 크게. 30~49 → 3 / 50~69 → 4 / 70+ → 5. */
export function hurtOf(affection: number): number {
  return affection < 50 ? 3 : affection < 70 ? 4 : 5
}

// ── 성격 트위스트 표 (통함 / 무난 / 역효과) ──
type Tier = 'works' | 'neutral' | 'backfire'
type Branch = 'soothe' | 'honest' | 'deflect'
/**
 * ★ 확정된 트위스트 표. ③④⑤ 는 다음 라운드에 대사를 붙이되 이 표는 그대로 둔다.
 *   ③ 이 "넘어가면 경멸(역효과)" — 오만한 이에게 얼버무리는 게 제일 나쁘다.
 *   ⑤ 가 "달래면 역효과" — 격을 지키는 이에게 달래려 드는 게 오히려 무례하다.
 */
const TWIST: Record<string, Record<Branch, Tier>> = {
  heir: { soothe: 'neutral', honest: 'works', deflect: 'neutral' },
  loyalist: { soothe: 'works', honest: 'backfire', deflect: 'neutral' },
  // ── 다음 라운드(표 유지) ──
  prince: { soothe: 'neutral', honest: 'works', deflect: 'backfire' },
  hero: { soothe: 'neutral', honest: 'works', deflect: 'neutral' },
  commander: { soothe: 'backfire', honest: 'works', deflect: 'neutral' },
}

/** 갈래별 Y(질투한 쪽) 델타 — 트위스트 tier 를 반영. */
function deltaY(branch: Branch, tier: Tier, hurt: number): number {
  if (branch === 'soothe') return tier === 'works' ? 3 : tier === 'neutral' ? 1 : -hurt
  if (branch === 'honest') return tier === 'works' ? -1 : tier === 'neutral' ? -hurt : -(hurt + 2)
  // deflect — 늘 적어도 base. 역효과(③ 경멸)면 한 칸 더.
  return tier === 'backfire' ? -(hurt + 1) : -hurt
}

/**
 * ★ 질투 발동 판정 — endTurn 이 부른다(연결 flag 소거 전에 값을 잡아 넘긴다).
 *   조건: romance_unlocked · 그 달 깊은 만남 · 쿨다운 종료 · 연애 대상 2인 이상 30↑.
 *   Y = 그 달 만난 쪽(X)이 아니면서 대사가 있는 인물 중 최고 호감(≥30). 없으면 null.
 */
export function planJealousy(
  state: GameState,
  connectedThisMonth: boolean,
  rivalId: string | undefined,
): string | null {
  if (state.flags.romance_unlocked !== true) return null
  if (!connectedThisMonth) return null
  if ((state.counters?.[JEALOUSY_CD] ?? 0) > 0) return null
  const affOf = (id: string) => state.affection[id] ?? 0
  const caring = ROMANCE_IDS.filter((id) => affOf(id) >= JEALOUSY_MIN)
  if (caring.length < 2) return null
  const candidates = JEALOUSY_CHARS
    .filter((id) => id !== rivalId && affOf(id) >= JEALOUSY_MIN)
    .sort((a, b) => affOf(b) - affOf(a))
  const y = candidates[0]
  return y ? `jealousy-${y}` : null
}

/**
 * ★ 질투 선택 해소 — 동적으로 효과·카운터를 낸다(gameStore.chooseOption 이 위임).
 *   대사(label·resultText)는 정적 이벤트가 쥐고, 수치만 여기서 상태에 따라 정한다:
 *   Y 의 현재 호감으로 hurt 를, 세워진 rival flag 로 X 를 읽는다.
 */
export function resolveJealousyChoice(
  eventId: string,
  choiceId: string,
  state: GameState,
): { effects: Effect[]; counters: Record<string, number> } | null {
  const y = eventId.slice('jealousy-'.length)
  const branch = choiceId as Branch
  const twist = TWIST[y]?.[branch]
  if (!twist) return null
  const hurt = hurtOf(state.affection[y] ?? 0)
  const rival = Object.keys(state.flags).find(
    (k) => k.startsWith(JEALOUSY_RIVAL_PREFIX) && state.flags[k],
  )?.slice(JEALOUSY_RIVAL_PREFIX.length)

  const effects: Effect[] = [aff(y, deltaY(branch, twist, hurt))]
  const counters: Record<string, number> = {}
  if (branch === 'soothe') {
    if (rival && rival !== y) effects.push(aff(rival, -2)) // 다른 쪽 소폭 하락
    counters[leaningCounter(y)] = (state.counters?.[leaningCounter(y)] ?? 0) + 1
  } else if (branch === 'deflect') {
    counters[WAVERED_COUNTER] = (state.counters?.[WAVERED_COUNTER] ?? 0) + 1
  }
  return { effects, counters }
}

// ── ①② 질투 씬·이벤트 (대사·선택은 정적, 수치는 resolveJealousyChoice) ──
interface JOpt { label: string; result: string }
function jealousy(charId: string, setup: SceneLine[], soothe: JOpt, honest: JOpt, deflect: JOpt) {
  const id = `jealousy-${charId}`
  const sceneId = `scene-${id}`
  const event: GameEvent = {
    id, title: '마음의 그늘', sceneId, text: '', condition: {}, once: false, category: 'story',
    choices: [
      { id: 'soothe', label: soothe.label, effects: [], resultText: soothe.result },
      { id: 'honest', label: honest.label, effects: [], resultText: honest.result },
      { id: 'deflect', label: deflect.label, effects: [], resultText: deflect.result },
    ],
  }
  return { event, scene: { id: sceneId, lines: setup } as Scene }
}

const BUILT = [
  // ─────────── ① heir — 자존심·냉소로 감춤. 솔직함이 통한다(정략 수긍) ───────────
  jealousy('heir', [
    N('{이름:heir}이 복도 끝에 서 있었다. {왕}이 다른 이와 함께 있는 것을 본 참이었다.'),
    { speaker: 'heir', text: '"…저는 아버지가 보낸 사람이니, 전하께서 누구와 계시든 상관할 바는 아니지요." 애써 차가운 말투였다.' },
  ],
    { label: '"너를 소홀히 한 적 없다."', result: '{이름:heir}은 눈을 피했다. "…그러시겠지요." 자존심을 건드린 말이었지만, 밀어내지는 않았다.' },
    { label: '"그래. 나는 여럿을 만나고 있다. 네게 숨기지 않겠다."', result: '{이름:heir}은 잠깐 {왕}을 다시 보았다. "…차라리 솔직하시니, 그편이 낫습니다." 거짓 없는 자리가, 이 아이에게는 오히려 편했다.' },
    { label: '"…별일 아니다."', result: '{이름:heir}은 옅게 웃고 돌아섰다. "예. 별일 아니지요." 얼버무린 만큼, 냉소로 물러났다.' },
  ),

  // ─────────── ② loyalist — 헌신·신중. 말없이 삭인다. 달래야 하고 솔직하면 최악 ───────────
  jealousy('loyalist', [
    N('{이름:loyalist}이 {왕}의 곁에 사람이 늘어 가는 것을 지켜보고 있었다. 아무 말도 하지 않았다.'),
    { speaker: 'loyalist', text: '"…아닙니다. 그저, 전하 곁이 든든해져 다행이라 여겼습니다." 애써 웃어 보였다.' },
  ],
    { label: '"네 자리는 누구도 대신하지 못한다."', result: '{이름:loyalist}은 잠깐 숨을 골랐다. "…{전하}." 그 한마디에, 눌러 두었던 것이 놓였다.' },
    { label: '"너에게만은 솔직하고 싶다 — 아직 마음을 정하지 못했다."', result: '{이름:loyalist}은 조용히 고개를 숙였다. "…예. 아셨을 겁니다, 제 마음은." 그리고 말없이 물러섰다. 그 침묵이 가장 아팠다.' },
    { label: '"…신경 쓰지 마라."', result: '{이름:loyalist}은 고개를 끄덕였다. "예, {전하}." 그러고는 조용히 삭였다 — 늘 그래 왔듯이.' },
  ),
]

export const JEALOUSY_EVENTS: GameEvent[] = BUILT.map((b) => b.event)
export const JEALOUSY_SCENES: Scene[] = BUILT.map((b) => b.scene)
