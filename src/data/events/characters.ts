import { ROMANCE_UNLOCK_FLAG } from '../characters'
import type { Effect, GameEvent } from '../../types/game'

const aff = (charId: string, amount: number): Effect => ({ target: { kind: 'affection', charId }, amount })

/** ③ 왕족이 궁에 머무는 동안 켜지는 flag. 「인연」의 체류 판정이 이걸 본다. */
export const PRINCE_PRESENT_FLAG = 'prince_present'
/** 남은 체류 계절 수. 매 턴 1씩 줄고, 0 이 되면 퇴장 이벤트가 조건을 만족한다. */
export const PRINCE_STAY_COUNTER = 'prince_stay'

/**
 * 체류 기간(월). ★ [5-b] 2 유지 — ③은 "드물되 큰 델타". 체류 자체는 짧게(희소) 두고,
 *   밴드 +12 와 호감 피드백(perAffection: 친해질수록 더 자주 옴)으로 집중 공략이 닿게 한다.
 *   실측: 초반 rare(~15%) → 투자하면 잦아짐, 48개월 집중으로 70 도달(다른 넷보다 느림).
 */
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

  {
    // ★ [7] ③ 겨루기 (#14) — 오만한 제국 왕족에게 정답은 "맞섬"이고, 겨루기는 그 극단이다.
    //   무예든 전략이든 굽히지 않고 덤빈다. 이기면 인정과 호감, 져도 "덤빈 것"은 인정.
    //   사냥 대회(등장 유도)와는 다른 자리 — 조우로 데운 관계를 시험하는 비트. 체류 중 한 번(once).
    id: 'prince-duel',
    title: '겨루기',
    sceneId: 'scene-prince-duel',
    text: '{이름:prince}이 심심한 낯으로 {왕}을 넘겨다보았다. "겨뤄 볼 텐가? 지루하던 참인데."',
    condition: {
      minAge: 17,
      flags: { [PRINCE_PRESENT_FLAG]: true, [ROMANCE_UNLOCK_FLAG]: true },
      affection: { prince: { min: 25 } },
    },
    once: true,
    priority: 59,
    choices: [
      {
        id: 'martial',
        label: '무예로 겨룬다',
        tierStat: 'martial',
        effects: [],
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [aff('prince', 3)],
            resultText:
              '{왕}은 목검을 들었고, 몇 합 만에 바닥을 보았다. 그러나 끝까지 물러서지 않았다.\n' +
              '{이름:prince}이 검을 거두며 웃었다. "…졌으면서 눈은 안 죽는군. 그건 인정하지."',
          },
          {
            min: 45,
            effects: [aff('prince', 8)],
            resultText:
              '{왕}의 목검이 {이름:prince}의 손목을 스쳐 지나갔다. 제국의 왕족이 반 발 물러섰다.\n' +
              '"…허." {이름:prince}이 처음으로 {왕}을 대등한 자로 보았다. "네가 이겼다. 다음엔 안 봐준다."',
          },
        ],
      },
      {
        id: 'strategy',
        label: '병략으로 겨룬다 (모의전)',
        tierStat: 'statecraft',
        effects: [],
        resultText: '',
        tiers: [
          {
            min: 0,
            effects: [aff('prince', 3)],
            resultText:
              '{왕}은 말판 위에서 오래 버텼지만 끝내 밀렸다. 그러나 판을 엎지는 않았다.\n' +
              '{이름:prince}이 말을 쓸어 담으며 말했다. "겁 없이 덤비는 건 재주다. 그것도 재능이지."',
          },
          {
            min: 45,
            effects: [aff('prince', 8)],
            resultText:
              '{왕}이 마지막 수로 {이름:prince}의 퇴로를 끊었다. 왕족이 말판을 오래 들여다보았다.\n' +
              '"…이 판을 읽었다고?" {이름:prince}이 눈을 가늘게 떴다. 얕보던 기색은 어디에도 없었다.',
          },
        ],
      },
      {
        id: 'decline',
        label: '겨루기를 사양한다',
        effects: [aff('prince', -2)],
        resultText:
          '{왕}은 겨루기를 사양했다. {이름:prince}이 흥미를 잃고 돌아섰다.\n' +
          '"…뭐, 그럴 줄 알았지." 굽히는 자에게 그는 눈길을 오래 두지 않았다.',
      },
    ],
  },
]
