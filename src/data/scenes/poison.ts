import type { Scene } from '../../types/game'

/**
 * 모후의 약 — 발각 직후 씬 (M3-pending #3).
 *
 * ★ 11세 「어머니의 방」(scene-child-mother-room)의 회수. 그때 "익숙한 손"으로
 *   "다정"이라 불렀던 것이, 발각 뒤에는 정반대로 읽힌다. 같은 향·같은 손, 뒤집힌 의미.
 */
export const POISON_SCENES: Scene[] = [
  {
    id: 'scene-poison-resumes',
    lines: [
      {
        speaker: 'narration',
        text: '왕대비는 그날 소리를 지르지 않았다. 그리고 그날 이후로, 오히려 아무것도 묻지 않았다.',
      },
      { speaker: 'queen_mother', text: '"안색이 좋지 않구나. 예전 그 약을 다시 올리라 일렀다."' },
      {
        speaker: 'narration',
        text: '은은한 향. 따뜻한 물에 몇 방울. 열한 살의 그 방과 똑같은 손이었다.',
      },
      {
        speaker: 'narration',
        text:
          '그때는 그 손을 다정이라 불렀다.\n' +
          '지금은 아니다. 이제 {왕}은 그 병 안에 무엇이 들었는지 안다.',
      },
    ],
  },
]
