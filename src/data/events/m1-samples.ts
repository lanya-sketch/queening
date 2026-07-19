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
      '섭정공이 병을 핑계로 자리를 비운 아침, 왕이 처음으로 홀로 옥좌에 앉는다.\n' +
      '신하들의 시선이 열두 살짜리 아이에게 쏠린다. 왕은 당신이 가르친 대로 ' +
      '먼저 묻고, 그 다음에 답한다. 짧은 회의였지만 아무도 웃지 않았다.',
    condition: {
      minYear: 1,
      season: 'summer',
      stats: { statecraft: { min: 20 } },
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
      '당신에게가 아니라 왕에게 말한다.\n' +
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
