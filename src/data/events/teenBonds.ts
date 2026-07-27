import type { Effect, GameEvent } from '../../types/game'

/**
 * 13~15세 관계 이벤트 (로드맵 콘텐츠) — **전부 로맨스 아님.**
 *
 * 13세 첫 등장(childhood.ts)에서 잡은 첫인상이 3년에 걸쳐 조금씩 움직이되,
 * 로맨스로는 넘어가지 않는 구간이다. 데뷔탕트(16세)에서 로맨스로 전환될 때 낙차가 생기도록,
 * 지금은 로맨스 뉘앙스를 쓰지 않는다(13~15세 미성년 — 관계 서술만).
 *
 * ★ 호감도가 소폭 오른다 = 데뷔탕트의 출발점. 단 ① 은 최저에서 시작하는 설계를 지킨다
 *   (+2 씩, 3년에 ~4). ②⑤ 는 +4 씩(~32), ③ 는 +3 씩(~11).
 *
 * ★ 발동은 met_<id>(13세 첫 등장) 이후로 게이트하고, 캐릭터별로 다른 달에 걸어 몰림을 막는다.
 *   priority 는 캐릭터 대역(events/priority.ts)에서 유일값으로 받는다.
 *
 * ★ 각 씬은 나중 결정적 씬·청산을 겨냥한다:
 *   ① "위에 아무도 없다"(아버지 그늘) → "결국 저는 섭정공의 아들이었을 뿐"
 *   ② "시녀장 사촌"(flag 없이 서술만) → 16세 「길을 터 두었습니다」(hint_queen_chamber)
 *   ⑤ "아직"(문 밖) → 결정적 씬 "그 예법을 오늘 처음으로 어기겠습니다"
 *   ③ "반쯤은"(얕봄 흔들림) → 동등한 상대로 인정
 */
const met = (id: string) => ({ [`met_${id}`]: true })
const bond = (charId: string, amount: number): Effect => ({
  target: { kind: 'affection', charId },
  amount,
})

export const TEEN_BOND_EVENTS: GameEvent[] = [
  // ── ① 섭정공 아들 — 정략·반감, 호감도 최저 유지 ────────────
  {
    id: 'bond-heir-appraise',
    title: '바둑판을 사이에 두고',
    sceneId: 'scene-bond-heir-appraise',
    text: '섭정공이 또 {자식:heir}을 붙여 놓았다. 둘 다 알면서, 바둑판만 사이에 두었다.',
    condition: { minAge: 14, month: 6, flags: met('heir') },
    once: true,
    effects: [bond('heir', 2)],
  },
  {
    id: 'bond-heir-shadow',
    title: '위에 아무도 없다',
    sceneId: 'scene-bond-heir-shadow',
    text: '복기를 시키는 아버지 이야기를 그 애가 처음으로 했다.',
    condition: { minAge: 15, month: 4, flags: met('heir') },
    once: true,
    effects: [bond('heir', 2)],
  },

  // ── ② 충신 딸 — 곁을 지킴, 신중함, 아버지 이야기(flag 없음) ──
  {
    id: 'bond-loyalist-beside',
    title: '말없이 곁에',
    sceneId: 'scene-bond-loyalist-beside',
    text: '충신 가문의 {자식:loyalist}이 오늘도 말없이 곁을 지켰다.',
    condition: { minAge: 13, month: 9, flags: met('loyalist') },
    once: true,
    effects: [bond('loyalist', 4)],
  },
  {
    id: 'bond-loyalist-caution',
    title: '말리는 사람',
    sceneId: 'scene-bond-loyalist-caution',
    text: '{왕}이 위험한 일을 하려 하자, 그 애가 처음으로 말렸다.',
    condition: { minAge: 14, month: 6, flags: met('loyalist') },
    once: true,
    effects: [bond('loyalist', 4)],
  },
  {
    id: 'bond-loyalist-father',
    title: '기일',
    sceneId: 'scene-bond-loyalist-father',
    // ★ 침전 실마리의 씨앗 — 서술만. hint_queen_chamber 는 16세에 별도로 선다.
    text: '아버지 기일에 다녀온 그 애가, 왕대비궁 이야기에 잠깐 멈칫했다.',
    condition: { minAge: 15, month: 2, flags: met('loyalist') },
    once: true,
    effects: [bond('loyalist', 4)],
  },

  // ── ⑤ 무관 가문 자녀 — 문 밖, 왕이 격을 허묾, "아직" ───────
  {
    id: 'bond-commander-outside',
    title: '문 밖',
    sceneId: 'scene-bond-commander-outside',
    text: '처소를 나설 때마다 그가 문 밖에 서 있었다. 늘 딱 한 걸음 바깥에.',
    condition: { minAge: 13, month: 12, flags: met('commander') },
    once: true,
    effects: [bond('commander', 4)],
  },
  {
    id: 'bond-commander-threshold',
    title: '문지방',
    sceneId: 'scene-bond-commander-threshold',
    text: '{왕}이 처음으로 그를 이름으로 불렀다.',
    condition: { minAge: 14, month: 3, flags: met('commander') },
    once: true,
    effects: [bond('commander', 4)],
  },
  {
    id: 'bond-commander-restraint',
    title: '절도 안의 것',
    sceneId: 'scene-bond-commander-restraint',
    text: '가문의 절도가 단단한 만큼, 그 안에 눌린 것이 아주 잠깐 보였다.',
    condition: { minAge: 15, month: 8, flags: met('commander') },
    once: true,
    effects: [bond('commander', 4)],
  },

  // ── ③ 제국 왕족 — 이따금 재방문, 얕봄 흔들림 (romance_unlocked 없이) ──
  {
    id: 'bond-prince-revisit',
    title: '또 오셨습니까',
    sceneId: 'scene-bond-prince-revisit',
    // 사냥철 재방문. 16세 이후의 방문 사이클(characters.ts)과 별개의 13~15 전용.
    text: '제국의 왕족이 또 예고 없이 들었다. "아직 안 망했네요?"',
    condition: { minAge: 14, month: 9, flags: met('prince') },
    once: true,
    effects: [bond('prince', 3)],
  },
  {
    id: 'bond-prince-spar',
    title: '무예 이야기',
    sceneId: 'scene-bond-prince-spar',
    text: '왕족이 처음으로 정치가 아닌 것 — 무예와 전술 — 을 물었다.',
    condition: { minAge: 15, month: 10, flags: met('prince') },
    once: true,
    effects: [bond('prince', 3)],
  },

  // ── ④ 미래의 인물(영웅) — 입궁 전 소문으로 먼저 존재하게 한다 ──────
  // 18세에 갑자기 나타나는 인물을, 13~15세 3년에 걸쳐 "버려진 전선의 소문"으로 흘려
  // 등장 때 '아, 그 사람'이 되게 한다. 만난 게 아니라 소문일 뿐 — 호감도 변화 없음,
  // 스프라이트·씬 없음(얼굴은 입궁 때 처음 나온다). 순수 서술 카드 한 장씩.
  // 조용한 달에 걸어 두어 밀릴 일이 거의 없고, 배경 대역 바닥이라 무엇에도 자리를 내준다.
  {
    id: 'rumor-frontier-1',
    title: '변경의 소문',
    text:
      '조공 문서 틈에 섞여 변경 이야기가 올라왔다. 선왕이 수비대를 반으로 줄인 그 전선을, ' +
      '누군가 남은 병력만으로 아직 지키고 있다고 했다.\n' +
      '이름은 적혀 있지 않았다. 궁정은 그 줄을 대수롭지 않게 넘겼다.',
    condition: { minAge: 13, minYear: 2, month: 11 },
    once: true,
    setFlags: { heard_frontier_rumor: true },
  },
  {
    id: 'rumor-frontier-2',
    title: '버려진 전선',
    text:
      '변경에서 또 소식이 왔다. 보급도 증원도 끊긴 채 두 해째라고 했다. ' +
      '그런데도 국경선은 밀리지 않았다.\n' +
      '"거기 아직 사람이 있긴 한 겁니까?" 누군가 물었고, 아무도 답을 몰랐다.',
    condition: { minAge: 14, minYear: 3, month: 12 },
    once: true,
    setFlags: { heard_frontier_rumor: true },
  },
  {
    id: 'rumor-frontier-3',
    title: '이름 없는 이름',
    text:
      '변경을 지키는 그 사람에게 병사들이 붙인 별명이 궁에까지 흘러들었다. ' +
      '조정에서 준 직함이 아니라, 살아남은 자들이 지어 부른 이름이었다.\n' +
      '{왕}은 그 이름을 처음으로 기억해 두었다. 얼굴도 모르는 채로.',
    condition: { minAge: 15, minYear: 4, month: 6 },
    once: true,
    setFlags: { heard_frontier_rumor: true },
  },
]
