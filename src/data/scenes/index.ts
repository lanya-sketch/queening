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

  // ── 혈서 반쪽 (M2b-3c-1)
  {
    // ② 의 조력. 이 사람의 성격은 "말리는 말을 먼저" 하는 것이라,
    // 등을 떠미는 이 한 번이 그 자체로 사건이다.
    id: 'scene-loyalist-hint',
    lines: [
      {
        speaker: 'loyalist',
        text: '"…전하. 제가 드리는 말씀은 오늘이 처음이자 마지막입니다."',
      },
      {
        speaker: 'narration',
        text:
          '그는 언제나 말리는 쪽이었다. 위험합니다, 아직 이릅니다, 다시 생각하십시오.\n' +
          '그 입에서 길을 알려주는 말이 나온 적은 한 번도 없었다.',
      },
      {
        speaker: 'loyalist',
        text:
          '"왕대비궁 침전에, 달이 없는 밤마다 사람이 듭니다. ' +
          '제 어머니께서 그 궁의 시녀장과 사촌간이십니다. 길은… 제가 터 두었습니다."',
      },
      {
        speaker: 'loyalist',
        text:
          '"선왕께 입은 은혜를 갚을 방법이 제겐 이것뿐입니다. ' +
          '그러니 전하께서 가시는 게 아니라, 제가 보내드리는 것으로 해 주십시오."',
      },
      {
        speaker: 'narration',
        text: '위험을 {왕} 대신 자기 몫으로 적어 두려는 말이었다.',
      },
    ],
  },
  {
    id: 'scene-chamber-search',
    lines: [
      {
        speaker: 'narration',
        text:
          '달이 없는 밤이었다. 왕대비궁 침전은 궁정의 관할 밖이라, ' +
          '이 안에서 벌어지는 일은 기록에 남지 않는다.',
      },
      {
        speaker: 'narration',
        text:
          '문갑 세 번째 칸에서 봉함이 나왔다. 뜯긴 자리가 오래된 것이었다.\n' +
          '{왕}이 그것을 펼치려는 순간, 복도에서 발소리가 났다.',
      },
      {
        speaker: 'narration',
        text: '하나가 아니었다. 그리고 이쪽으로 오고 있었다.',
      },
    ],
  },
  {
    id: 'scene-chamber-caught',
    lines: [
      {
        speaker: 'narration',
        text:
          '왕대비는 소리를 지르지 않았다. 사람을 부르지도, 무엇을 하느냐 묻지도 않았다.\n' +
          '그저 문가에 서서 아들을 오래 보았다.',
      },
      {
        speaker: 'narration',
        text: '"…밤이 찹니다." 그리고 그것이 그 방에서 오간 말의 전부였다.',
      },
      {
        speaker: 'narration',
        text:
          '돌아오는 길에 {왕}은 아무 말도 하지 않았다.\n' +
          '이튿날부터 왕대비궁에서 탕약이 올라오기 시작했다. 몸을 보하는 것이라 했다.\n' +
          '당신은 그것을 물리게 했다. 이번에는.',
      },
    ],
  },
  {
    // ★ 3b-2 에서 세운 ①의 축 — "아버지를 부르는 방식" — 의 종착점.
    //   0~19 아버지 뒤에 숨던 아이가 여기서 아버지를 자기 몫으로 감당한다.
    id: 'scene-heir-confession',
    lines: [
      {
        speaker: 'heir',
        text: '"…서고 뒤, 세 번째 궤입니다. 아버지께서 직접 넣으시는 걸 봤습니다."',
      },
      {
        speaker: 'narration',
        text: '그 문장에는 흐림도, 끊김도 없었다. 처음이었다.',
      },
      {
        speaker: 'heir',
        text:
          '"전하께서 찾아내신 것으로 하십시오. 제가 말씀드렸다고 하시면… ' +
          '아버지께서 저를 의심하지 않으실 겁니다. 그 편이 전하께 덜 위험합니다."',
      },
      {
        speaker: 'narration',
        text:
          '그는 아버지를 판 것이 아니었다. 자신을 팔았다.\n' +
          '{왕}은 그 자리에서 아무 대답도 하지 못했고, 그것을 그도 알고 있었다.',
      },
    ],
  },
  {
    id: 'scene-blood-oath-complete',
    lines: [
      {
        speaker: 'narration',
        text:
          '두 조각을 나란히 놓자 찢긴 자리가 맞았다. 붉은 글씨가 문장이 되었다.\n' +
          '선왕의 이름과, 그 아래 두 사람의 수결.',
      },
      {
        speaker: 'narration',
        text:
          '{왕}은 그것을 오래 보았다. 알고 있던 것이 종이 위에 있는 것은 다른 일이었다.\n' +
          '아는 것으로는 아무도 벌하지 못한다. 이제는 다르다.',
      },
    ],
  },
]

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
)
