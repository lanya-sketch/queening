import type { GameEvent } from '../../types/game'

/**
 * 정치 고유장치 — ④ 두루마리 / ⑤ 군사노선 / ③ 공동왕조 (M2b-3c-2).
 *
 * 셋은 서로 독립적이다(미스터리처럼 얽히지 않는다). 공통점은 **로맨스 전용**이라는 것 —
 * 관계를 끝까지 끌고 가지 않으면 이벤트 자체가 존재하지 않는다.
 *
 * ★★ ③⑤ 는 **경로가 열렸다는 flag 까지만** 세운다.
 *
 *   최종 판정(동등/복속, 왕 주도/군부 종속)은 국력과 국정 영향도가 마지막 순간까지
 *   변하기 때문에 엔딩 시점에 해야 한다. 지금 가르면 남은 3년의 플레이가 판정에
 *   반영되지 않는다. 그래서 여기서는 문만 연다.
 *
 *   이 예약이 지켜지는지는 검증이 그래프로 확인한다 — `union_possible` 과
 *   `military_route_open` 을 **condition 으로 읽는 이벤트가 0건**이어야 한다.
 *   읽는 곳이 생기는 순간 판정이 앞당겨진 것이므로 테스트가 잡는다.
 *   (docs/M3-pending.md 에 인수인계 명세가 있다)
 */

export const DEVICE_FLAGS = {
  scrollOffered: 'scroll_offered',
  unionPossible: 'union_possible',
  militaryRouteOpen: 'military_route_open',
} as const

/** 깊은 관계 문턱. data/characters 의 DEEP_BOND_THRESHOLD 와 같은 값이다. */
const DEEP = 70

export const DEVICE_EVENTS: GameEvent[] = [
  {
    /**
     * ④ 성스러운 두루마리 — ①의 혈서와 대칭이다.
     * 혈서는 남을 무너뜨리는 증거, 두루마리는 자신을 세우는 근거.
     *
     * 세 장치 중 유일하게 즉시 효과가 있다. 가장 늦게 열리고(18세 + 입궁 + 깊은 관계)
     * 가장 얻기 어려운 보상이라 규모를 크게 잡았다.
     */
    id: 'hero-sacred-scroll',
    title: '두루마리',
    sceneId: 'scene-sacred-scroll',
    text: '평민 영웅이 삼 년 동안 아무에게도 주지 않았던 것을 내려놓았다.',
    condition: {
      minAge: 18,
      affection: { hero: { min: DEEP } },
      flags: { hero_at_court: true, [DEVICE_FLAGS.scrollOffered]: false },
    },
    effects: [{ target: { kind: 'resource', key: 'courtInfluence' }, amount: 18 }],
    setFlags: {
      [DEVICE_FLAGS.scrollOffered]: true,
      legitimacy_sacred: true,
      church_support: true,
    },
  },

  {
    /**
     * ⑤ 아버지 만남 — 가문 역사 화제(키워드)를 거쳐야만 열린다.
     * 화제 → 만남 → 경로 개방의 3단이라, 대화 시스템과 이벤트 시스템이 맞물리는 지점.
     */
    id: 'commander-father-audience',
    title: '문 앞에 선 가문',
    sceneId: 'scene-commander-father',
    text: '무관 가문의 수장이 알현을 청했다. 아홉 대 만에 처음 있는 일이라 했다.',
    condition: {
      minAge: 18,
      affection: { commander: { min: 65 } },
      flags: {
        commander_house_known: true,
        [DEVICE_FLAGS.militaryRouteOpen]: false,
      },
    },
    setFlags: { [DEVICE_FLAGS.militaryRouteOpen]: true },
  },

  {
    /**
     * ③ 공동왕조 — 체류 중에만 열린다.
     * 상주하지 않는 사람과의 경로라, 그가 궁에 있을 때만 이야기가 성립한다.
     */
    id: 'union-possible',
    title: '두 개의 왕관',
    sceneId: 'scene-union-possible',
    text: '제국의 왕족이 처음으로 정치 이야기를 꺼냈다.',
    condition: {
      minAge: 17,
      affection: { prince: { min: DEEP } },
      flags: { prince_present: true, [DEVICE_FLAGS.unionPossible]: false },
    },
    setFlags: { [DEVICE_FLAGS.unionPossible]: true },
  },
]
