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
]

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
)
