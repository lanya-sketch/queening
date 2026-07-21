import type { Choice, GameEvent } from '../../types/game'
import { CHARACTERS } from '../characters'

/**
 * 결정적 씬 — 하드 배타성의 확정 지점 (하드 배타성 라운드).
 *
 * ★ 호감도 70 도달 + 아직 아무도 확정 안 함(romance_settled=false) + 이 씬 미시청 →
 *   그 캐릭터의 결정적 씬이 뜬다. 순차 처리는 엔진에 맡긴다:
 *   여럿이 70 을 넘으면 우선순위로 하나씩 뜨고, **하나를 수락하면 romance_settled 가
 *   나머지 조건을 꺼서 닫힌다.** 거절하면 settled 가 안 서서 다음이 뜬다.
 *
 * 고유장치(혈서·두루마리·union)와는 별개다 — 그것들은 호감도 70 에만 게이트되어
 * 결정적 씬을 거절해도 그대로 열린다("로맨스 없이도 유지").
 */

const DEEP = 70

/** 모든 결정적 씬이 공유하는 수락/거절 선택. 확정 flag 만 캐릭터별로 다르다. */
function decisiveChoices(charId: string): Choice[] {
  return [
    {
      id: 'accept',
      label: '그 손을 잡는다',
      setFlags: {
        [`romance_confirmed:${charId}`]: true,
        romance_settled: true,
        [`decisive_seen:${charId}`]: true,
      },
      resultText:
        '{왕}은 그 손을 잡았다. 이 궁에서 처음으로, 정략도 계산도 아닌 것으로.\n' +
        '이제 다른 손들은 다른 자리로 돌아갈 것이다.',
    },
    {
      id: 'decline',
      label: '아직은 아니라고 말한다',
      // ★ settled 를 세우지 않는다 — 다른 캐릭터의 결정적 씬은 계속 열려 있다.
      setFlags: { [`decisive_seen:${charId}`]: true },
      resultText:
        '{왕}은 고개를 저었다. 미움이 아니라, 아직 그럴 자리가 아니라는 뜻이었다.\n' +
        '두 사람 사이의 것은 여기서 멈췄지만, 쌓인 것이 사라지지는 않았다.',
    },
  ]
}

/** 캐릭터별 결정적 씬. sceneId 는 data/scenes 에 있다. 정치 조건은 없고 호감도만 본다. */
const DECISIVE: Record<string, { title: string; extraFlags?: Record<string, boolean> }> = {
  heir: { title: '세 번째 궤 앞에서' },
  loyalist: { title: '늘 곁에 있던 사람' },
  // ③ 은 상주하지 않으므로 체류 중일 때만.
  prince: { title: '두 왕관의 밤', extraFlags: { prince_present: true } },
  commander: { title: '문지방을 넘어' },
  hero: { title: '줄 사람이 없었던 것' },
}

export const DECISIVE_EVENTS: GameEvent[] = CHARACTERS.map((c) => {
  const def = DECISIVE[c.id]
  return {
    id: `decisive-${c.id}`,
    title: def.title,
    sceneId: `scene-decisive-${c.id}`,
    text: `${c.name}과의 관계가 한 번의 선택을 앞에 두었다.`,
    condition: {
      affection: { [c.id]: { min: DEEP } },
      flags: {
        romance_unlocked: true,
        romance_settled: false,
        [`decisive_seen:${c.id}`]: false,
        ...def.extraFlags,
      },
    },
    choices: decisiveChoices(c.id),
  }
})
