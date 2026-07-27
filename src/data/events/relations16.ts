import type { Effect, GameEvent } from '../../types/game'

/**
 * 16~19세 관계 심화 — 데뷔탕트(로맨스 개방)와 결정적 씬(호감도 70) 사이.
 *
 * ★ 13~15세(teenBonds, 로맨스 아님)와 결이 다르다: 여기는 **로맨스로 기울어가는 과정**이다.
 *   13~15세에 심은 씨앗이 자라 결정적 씬의 前조가 되되, **확정은 안 한다** — "이 사람과
 *   함께하겠는가"의 답은 오직 결정적 씬(70)에서 나온다. 여기서 미리 답이 나오면 안 된다.
 *
 * ★ 호감도 게이트(진행형)로 **관계가 실제로 쌓인 캐릭터만** 뜬다. AI 대화가 관계의 엔진이고,
 *   이 씬들은 그 위의 이정표다 — 씬만으론 70 에 못 닿는다(각 +6 로 경로를 얇게 깐다).
 *   ★ ① 은 최저(≈4)에서 출발하되 게이트는 다른 캐릭터와 **같은 기준(25/45/60)** — 그래서
 *     바닥에서 60까지 가장 많이 대화해야 하고, "제일 공들여야 하는 메인"이 수치로 성립한다.
 *
 * ★ 달 분산: 후반 현안(제국 m6·영주 m4·선왕 m5)·마일스톤(성년식 m3·담판 m11)·debut(m9) 회피.
 *   romance_unlocked(데뷔탕트 16세 m9 이후)와 romance_settled:false(아직 아무도 확정 안 함) 게이트.
 * ★ 미성년 안전: 16+이나 절제 — 신체 묘사 없이 관계·감정으로.
 */
const bond = (charId: string, amount: number): Effect => ({
  target: { kind: 'affection', charId },
  amount,
})
/** 공통 게이트 — 로맨스 열림 + 아직 확정 전. */
const OPEN = { romance_unlocked: true, romance_settled: false }

export const RELATIONS16_EVENTS: GameEvent[] = [
  // ── ① 섭정공 아들 (메인) — 아버지 그늘에서 흔들려, 자기 이름으로 ──────
  {
    id: 'relation-heir-1',
    title: '복기',
    sceneId: 'scene-relation-heir-1',
    text: '섭정공이 시킨 계략을 실행하던 그 애가 처음으로 손을 멈췄다.',
    condition: { minAge: 17, month: 2, flags: OPEN, affection: { heir: { min: 25 } } },
    once: true,
    effects: [bond('heir', 6)],
  },
  {
    id: 'relation-heir-2',
    title: '어느 편',
    sceneId: 'scene-relation-heir-2',
    text: '섭정공이 {자식:heir}에게 {왕}을 시험하라 일렀다. 그 애의 눈이 처음으로 갈렸다.',
    condition: { minAge: 18, month: 8, flags: OPEN, affection: { heir: { min: 45 } } },
    once: true,
    effects: [bond('heir', 6)],
  },
  {
    id: 'relation-heir-3',
    title: '제 이름으로',
    sceneId: 'scene-relation-heir-3',
    text: '그 애가 아버지 이야기를 하다 말고, 처음으로 "저는"이라 말했다.',
    condition: { minAge: 19, month: 3, flags: OPEN, affection: { heir: { min: 60 } } },
    once: true,
    effects: [bond('heir', 6)],
  },

  // ── ⑤ 무관 자녀 — 문지방을 어길 뻔한 순간들(반걸음 → 한 걸음) ─────
  {
    id: 'relation-commander-1',
    title: '반걸음',
    sceneId: 'scene-relation-commander-1',
    text: '비바람 치는 밤, 문 밖의 그가 처음으로 문지방에 발을 걸쳤다가 거뒀다.',
    condition: { minAge: 17, month: 5, flags: OPEN, affection: { commander: { min: 25 } } },
    once: true,
    effects: [bond('commander', 6)],
  },
  {
    id: 'relation-commander-2',
    title: '눌린 것',
    sceneId: 'scene-relation-commander-2',
    text: '단단한 절도 아래 눌려 있던 것이, 오늘은 조금 더 오래 보였다.',
    condition: { minAge: 18, month: 6, flags: OPEN, affection: { commander: { min: 45 } } },
    once: true,
    effects: [bond('commander', 6)],
  },
  {
    id: 'relation-commander-3',
    title: '한 걸음 앞',
    sceneId: 'scene-relation-commander-3',
    text: '그가 무언가를 말하려다, 아홉 대의 예법 앞에서 다시 삼켰다. 이번엔 오래 망설였다.',
    condition: { minAge: 19, month: 8, flags: OPEN, affection: { commander: { min: 60 } } },
    once: true,
    effects: [bond('commander', 6)],
  },

  // ── ② 충신 딸 — 곁에 있던 것이 곁에 서려 한다 ────────────────
  {
    id: 'relation-loyalist-1',
    title: '눈에 띄게',
    sceneId: 'scene-relation-loyalist-1',
    text: '늘 조용히 뒤에 서던 그 애가, 오늘은 {왕}이 알아챌 만큼 앞으로 나섰다.',
    condition: { minAge: 17, month: 7, flags: OPEN, affection: { loyalist: { min: 45 } } },
    once: true,
    effects: [bond('loyalist', 6)],
  },
  {
    id: 'relation-loyalist-2',
    title: '있는 것과 서는 것',
    sceneId: 'scene-relation-loyalist-2',
    text: '그 애가 처음으로, 곁에 "있는" 것 말고 곁에 "서는" 것을 생각하는 눈을 했다.',
    condition: { minAge: 18, month: 10, flags: OPEN, affection: { loyalist: { min: 60 } } },
    once: true,
    effects: [bond('loyalist', 6)],
  },

  // ── ③ 제국 왕족 — 얕봄이 인정으로, 떠날 수 있는 자가 머문다 ──────
  {
    id: 'relation-prince-1',
    title: '반쯤이 아니라',
    sceneId: 'scene-relation-prince-1',
    // 체류 중일 때만.
    text: '"아직 안 망했네요?"가 오늘은 웃음이 아니었다. 반쯤 농담이 진담으로 기울었다.',
    condition: { minAge: 17, month: 9, flags: { ...OPEN, prince_present: true }, affection: { prince: { min: 40 } } },
    once: true,
    effects: [bond('prince', 6)],
  },
  {
    id: 'relation-prince-2',
    title: '안 떠난 사람',
    sceneId: 'scene-relation-prince-2',
    text: '사절단이 돌아가는 날, 그만 남았다. 떠날 수 있는 사람이 안 떠난 것은 처음이었다.',
    condition: { minAge: 18, month: 2, flags: { ...OPEN, prince_present: true }, affection: { prince: { min: 58 } } },
    once: true,
    effects: [bond('prince', 6)],
  },

  // ── ④ 평민 영웅 (18세 입궁 후) — 소문의 그 사람, 냉소의 첫 균열 ──────
  {
    id: 'relation-hero-1',
    title: '그 사람',
    sceneId: 'scene-relation-hero-1',
    text: '변경의 소문으로만 알던 그 사람이 눈앞에 있었다. 실물은 소문보다 말이 없었다.',
    condition: { minAge: 18, month: 3, flags: { ...OPEN, hero_at_court: true }, affection: { hero: { min: 20 } } },
    once: true,
    effects: [bond('hero', 6)],
  },
  {
    id: 'relation-hero-2',
    title: '줄 사람',
    sceneId: 'scene-relation-hero-2',
    text: '아무에게도 아무것도 안 주던 사람이, {왕}에게만 이따금 무언가를 남기기 시작했다.',
    condition: { minAge: 19, month: 9, flags: { ...OPEN, hero_at_court: true }, affection: { hero: { min: 45 } } },
    once: true,
    effects: [bond('hero', 6)],
  },
]
