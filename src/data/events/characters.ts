import { ROMANCE_UNLOCK_FLAG } from '../characters'
import type { GameEvent } from '../../types/game'

/** ③ 왕족이 궁에 머무는 동안 켜지는 flag. 「인연」의 체류 판정이 이걸 본다. */
export const PRINCE_PRESENT_FLAG = 'prince_present'
/** 남은 체류 계절 수. 매 턴 1씩 줄고, 0 이 되면 퇴장 이벤트가 조건을 만족한다. */
export const PRINCE_STAY_COUNTER = 'prince_stay'

/** 체류 기간(계절). 등장한 계절의 다음 두 턴 동안 대화할 수 있다. */
const STAY_SEASONS = 2

/**
 * ③ 제국 왕족의 등장/퇴장 사이클 (M2b-3b-3).
 *
 * ★ 엔진에는 "왕족"이라는 개념이 없다. 여기 있는 건 전부 일반 부품이다 —
 *   ChanceRule 로 확률 발동, counter 로 체류 시간, flag 로 현재 상태.
 *   M2b-4 의 돌발 현안도 같은 부품으로 조립된다.
 *
 * 확률 3층(설계 승인분):
 *   기본 15% + 호감도 100 일 때 +35% + 사냥 대회 +45% / 연회 +10%
 *   + 4회 헛탕부터 매회 +15%, 7회 헛탕이면 다음은 확정.
 *
 * 순수 무작위를 쓰지 않는 이유가 이 세 줄에 다 있다:
 *   바닥이 0 이 아니라 아무것도 안 해도 결국 오고(base),
 *   천장이 있어 최악의 운도 2년 안에 끝나며(pity),
 *   만나고 싶으면 AP 와 심신을 지불해 확률을 산다(lures).
 */
export const CHARACTER_EVENTS: GameEvent[] = [
  {
    id: 'prince-arrival',
    title: '방문',
    sceneId: 'scene-prince-arrival',
    text: '제국의 왕족이 예고 없이 궁에 들었다. 사냥철이라 했다.',
    condition: { flags: { [ROMANCE_UNLOCK_FLAG]: true, [PRINCE_PRESENT_FLAG]: false } },
    once: false,
    chance: {
      base: 0.15,
      perAffection: { charId: 'prince', at100: 0.35 },
      lures: { 'royal-hunt': 0.45, 'attend-banquet': 0.1 },
      pity: { after: 4, step: 0.15, guarantee: 7 },
      /**
       * ★ 쿨다운은 **등장 시점부터** 센다(카운터가 그때 세팅되므로).
       *   체류 2계절이 이 안에서 먼저 흘러가니, 떠난 뒤의 공백을 2계절 두려면
       *   체류분을 더해 4 로 잡아야 한다. 2 로 두면 체류 중에 전부 소진되어
       *   떠난 다음 계절에 곧바로 재등장할 수 있다(검증에서 실제로 잡혔다).
       */
      cooldown: STAY_SEASONS + 2,
    },
    setFlags: { [PRINCE_PRESENT_FLAG]: true },
    effects: [{ target: { kind: 'counter', key: PRINCE_STAY_COUNTER }, amount: STAY_SEASONS }],
  },

  {
    id: 'prince-departure',
    title: '출발',
    sceneId: 'scene-prince-departure',
    text: '왕족의 수행단이 새벽에 짐을 실었다. 작별 인사는 없었다.',
    condition: {
      flags: { [PRINCE_PRESENT_FLAG]: true },
      counters: { [PRINCE_STAY_COUNTER]: { max: 0 } },
    },
    once: false,
    // 확률 없음 — 체류가 끝나면 반드시 떠난다.
    setFlags: { [PRINCE_PRESENT_FLAG]: false },
  },
]
