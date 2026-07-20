import type { Scene } from '../../types/game'

/**
 * 대사 씬 (M2b-3a).
 *
 * ★ 모든 씬 대사는 여기(data/)에 둔다 — 컴포넌트 하드코딩 금지.
 *   동양판 이식과 성별 토큰 치환이 텍스트를 다시 쓰지 않고 되게 하기 위함.
 *
 * 이번 단계에는 데뷔탕트 씬 하나만 있다. 캐릭터별 씬은 M2b-3b.
 */
export const SCENES: Scene[] = [
  {
    id: 'scene-debut-ball',
    lines: [
      {
        speaker: 'narration',
        text: '대연회장의 문이 열린다. 열여섯 해 만에 처음으로, 이 방의 모두가 같은 사람을 본다.',
      },
      {
        speaker: 'narration',
        text: '{왕}의 성년을 알리는 자리다. 사교계의 예법으로는 오늘부터 혼담이 오갈 수 있다.',
      },
      {
        speaker: 'monarch',
        text: '"…이 자리가 정치라는 것을, 저도 압니다."',
      },
      {
        speaker: 'narration',
        text:
          '당신은 대답하지 않았다. 아이는 이미 알고 있었고, 알면서도 걸어 들어갔다.\n' +
          '오늘 이후로 이 궁의 사람들은 {왕}을 다른 눈으로 볼 것이다.',
      },
    ],
  },

  // ── ③ 제국 왕족의 등장/퇴장 (M2b-3b-3)
  // 이 인물은 상주하지 않는다. 씬의 역할은 "왔다"가 아니라
  // **"언제든 떠날 수 있는 사람이 지금 여기 있다"**를 매번 상기시키는 것이다.
  {
    id: 'scene-prince-arrival',
    lines: [
      {
        speaker: 'narration',
        text:
          '전령보다 수행단이 먼저 도착했다. 제국의 왕족은 통보를 하지 손님이 되지 않는다.\n' +
          '사냥철이라 했고, 그 말 외에 다른 설명은 없었다.',
      },
      {
        speaker: 'prince',
        text: '"국경을 넘는 김에 들렀습니다. 며칠 신세 지지요."',
      },
      {
        speaker: 'narration',
        text: '허락을 구하는 문장이 아니었다. 이미 말에서 내린 뒤였다.',
      },
      {
        speaker: 'prince',
        text: '"이 나라 정치는 관심 없습니다. 사슴이 좋다길래 왔을 뿐이니 신경 쓰지 마시고."',
      },
      {
        speaker: 'narration',
        text:
          '무례한 말인데, 무례하려고 한 말은 아니었다. 그는 정말로 관심이 없었다.\n' +
          '{왕}은 그 점이 이 궁에서 가장 낯설다는 것을 알아차렸다.',
      },
    ],
  },
  {
    id: 'scene-prince-departure',
    lines: [
      {
        speaker: 'narration',
        text: '새벽에 수행단이 짐을 실었다. 떠난다는 말도, 다시 오겠다는 말도 남기지 않았다.',
      },
      {
        speaker: 'narration',
        text:
          '이 궁의 사람들은 {왕}의 곁을 떠나지 못한다. 자리가 그들을 붙들기 때문이다.\n' +
          '떠날 수 있는 사람은 그 하나뿐이고, 그래서 그가 다시 오는 것은 언제나 선택이다.',
      },
    ],
  },
]

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
)
