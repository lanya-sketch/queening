import type { GameEvent } from '../../types/game'
import { GAME_CONFIG } from '../config'

/**
 * M1 수록 이벤트 2건.
 * (1) 이벤트 시스템이 도는지 증명할 샘플
 * (2) 섭정 의심도 임계 경고 — 지금은 표시만 한다.
 */
export const M1_EVENTS: GameEvent[] = [
  {
    id: 'first-audience',
    title: '첫 어전 회의',
    text:
      '섭정공이 병을 핑계로 자리를 비운 아침, {왕}이 처음으로 홀로 옥좌에 앉는다.\n' +
      '신하들의 시선이 열두 살짜리 아이에게 쏠린다. {왕}은 당신이 가르친 대로 ' +
      '먼저 묻고, 그 다음에 답한다. 짧은 회의였지만 아무도 웃지 않았다.',
    /**
     * ★ 통치학 통찰은 **가시성**을 준다.
     *   이 이벤트는 통치학 15 로 열리는데, 넘고 나면 아무 표시가 없어 그 스탯이
     *   일했다는 걸 알 수 없다. 한 줄이 조용한 게이트에게 말을 하게 한다.
     * ★ 변론은 초반에 쓰이는 자리가 0 이었다 — 여기가 첫 자리다(어전은 말이 오가는 곳).
     */
    insights: [
      {
        requires: { stats: { statecraft: { min: 20 } } },
        text:
          '{왕}이 먼저 물을 수 있었던 것은 선례를 알기 때문이다. 답을 아는 자가 묻는 것과 ' +
          '모르는 자가 묻는 것은 회의실에서 전혀 다르게 들린다 — 오늘 그것을 아는 사람은 ' +
          '이 방에서 당신과 재무경뿐이었다.',
      },
      {
        requires: { stats: { rhetoric: { min: 16 } } },
        text:
          '말의 순서를 되짚어 보면 아무도 {왕}의 물음에 곧바로 답하지 않았다. ' +
          '되묻고, 에두르고, 서로를 봤다. 대답을 미루는 방식이 저마다 달랐고 ' +
          '그 차이가 곧 누가 누구를 두려워하는지였다.',
      },
    ],
    condition: {
      minYear: 1,
      month: 6,
      stats: { statecraft: { min: 15 } },
    },
    effects: [
      { target: { kind: 'resource', key: 'tutorTrust' }, amount: 5 },
      { target: { kind: 'stat', key: 'courtcraft' }, amount: 3 },
    ],
    setFlags: { hadFirstAudience: true },
    priority: 10,
  },
  {
    id: 'regent-warning',
    title: '섭정공의 방문',
    text:
      '섭정공이 예고 없이 서재에 들어선다. 책상 위를 한참 내려다보다가, ' +
      '당신에게가 아니라 {왕}에게 말한다.\n' +
      '"전하께서는 요즘 무엇을 배우고 계십니까."\n' +
      '대답을 기다리지 않고 그는 나갔다. 감시가 한 단계 조여졌다.',
    condition: {
      resources: { regentSuspicion: { min: GAME_CONFIG.regentSuspicionWarning } },
    },
    // M1에서는 경고 표시만 — 실제 처벌은 M2 이후.
    setFlags: { regentWarned: true },
    priority: 100,
  },
]
