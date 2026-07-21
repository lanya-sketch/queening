import type { Scene } from '../../types/game'
import { HARD_EXCLUSIVE_SCENES } from './hardExclusive'

/**
 * 대사 씬 (M2b-3a~).
 *
 * ★ 모든 씬 대사는 여기(data/)에 둔다 — 컴포넌트 하드코딩 금지.
 *   동양판 이식과 성별 토큰 치환이 텍스트를 다시 쓰지 않고 되게 하기 위함.
 *
 * 결정적 씬·청산 후일담은 분량이 커서 hardExclusive.ts 로 분리해 합친다.
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

  // ── 정치 고유장치 (M2b-3c-2)
  {
    // ④ 두루마리. ①의 혈서가 "남을 무너뜨리는 증거"라면 이건 "자신을 세우는 근거"다.
    id: 'scene-sacred-scroll',
    lines: [
      {
        speaker: 'hero',
        text: '"…제가 이걸 왜 여태 갖고 있었는지 모르겠습니다."',
      },
      {
        speaker: 'narration',
        text:
          '마왕의 목을 벤 자리에서 나온 것이라 했다. 교단이 삼 년을 찾던 물건이다.\n' +
          '그것을 가진 자를 하늘이 세운 왕으로 인정한다는, 그런 종류의 종이.',
      },
      {
        speaker: 'hero',
        text:
          '"저한테는 종이쪼가리였습니다. 팔면 평생 먹고산다길래 안 팔았고, ' +
          '바치면 작위를 준다길래 안 바쳤습니다. 왜 그랬는지도 몰랐는데."',
      },
      {
        speaker: 'narration',
        text: '그는 두루마리를 내려놓았다. 무릎은 꿇지 않았다. 한 번도 꿇은 적이 없었다.',
      },
      {
        speaker: 'hero',
        text: '"이제 알겠습니다. 줄 사람이 없었던 겁니다."',
      },
      {
        speaker: 'narration',
        text:
          '이튿날 교단이 {왕}의 이름을 축문에 올렸고, 그 소식은 궁보다 저잣거리에 먼저 닿았다.\n' +
          '섭정공이 아홉 해 동안 쌓은 것 위로, 하루 만에 다른 종류의 무게가 얹혔다.',
      },
    ],
  },
  {
    // ⑤ 가문 역사. 사적인 것을 삼키는 사람이 가문 이야기로 자기를 말한다.
    id: 'scene-commander-house-history',
    lines: [
      {
        speaker: 'narration',
        text: '그는 잠시 대답하지 않았다. 거절하는 침묵은 아니었다.',
      },
      {
        speaker: 'commander',
        text:
          '"…초대 왕께서 이 가문에 내리신 것은 봉토가 아니라 자리였습니다. ' +
          '왕의 뒤에 서는 자리. 아홉 대가 그 자리를 지켰습니다."',
      },
      {
        speaker: 'narration',
        text: '그는 늘 그렇듯 자기 이야기는 하지 않았다. 가문의 이야기만 했다.',
      },
      {
        speaker: 'commander',
        text:
          '"아홉 대 중 셋은 왕을 지키다 죽었고, 하나는 왕을 갈아치웠습니다.\n' +
          '그 하나 때문에 저희는 아직도 문 앞에 섭니다. 안으로는 들어오지 않습니다."',
      },
      {
        speaker: 'narration',
        text:
          '{왕}은 그 말이 변명이 아니라 경고라는 것을 알아들었다.\n' +
          '이 가문의 힘을 빌리는 일에는 값이 있다는 뜻이었다.',
      },
    ],
  },
  {
    // ⑤ 아버지 만남. 시험이되, 시험하는 쪽도 무언가를 걸고 있다.
    id: 'scene-commander-father',
    lines: [
      {
        speaker: 'narration',
        text:
          '노장은 갑주를 입지 않고 왔다. 아홉 대 만에 처음으로 문 안으로 들어온 자리에,\n' +
          '무장하지 않은 채로 섰다.',
      },
      {
        speaker: 'narration',
        text: '"딸아이가 전하 이야기를 한 적이 없습니다."',
      },
      {
        speaker: 'narration',
        text: '그것을 흠으로 말하는 어조가 아니었다.',
      },
      {
        speaker: 'narration',
        text:
          '"말하지 않는 것이 저희 가문의 예법입니다. 그런데 말하지 않는 것과\n' +
          '말할 것이 없는 것은 다르지요. 전하께서는 어느 쪽이라 생각하십니까."',
      },
      {
        speaker: 'narration',
        text:
          '{왕}이 무어라 답했는지는 그 방에 있던 두 사람만 안다.\n' +
          '다만 노장이 나가면서 처음으로 허리를 굽혔고, 그것을 본 위병들이\n' +
          '그날 밤 내내 그 이야기를 했다.',
      },
      {
        speaker: 'narration',
        text:
          '이제 {왕}에게는 군을 움직일 수 있는 길이 하나 생겼다.\n' +
          '그 길이 왕관을 지키는 길인지 빼앗는 길인지는, 아직 아무도 모른다.',
      },
    ],
  },
  {
    // ③ 공동왕조. 정치에 무관심한 사람이 정치를 꺼내는 것 자체가 사건이다.
    id: 'scene-union-possible',
    lines: [
      {
        speaker: 'narration',
        text: '그는 사냥 이야기를 하다가, 아무 예고 없이 말을 바꿨다.',
      },
      {
        speaker: 'prince',
        text: '"두 왕관을 한 사람이 쓰면 그건 정복입니다. 두 사람이 나눠 쓰면 그건 결혼이고요."',
      },
      {
        speaker: 'narration',
        text:
          '{왕}은 그가 이 나라 정치에 관심 없다고 한 말을 기억하고 있었다.\n' +
          '그 말은 지금도 사실이었다. 그는 이 나라에 관심이 없었다.',
      },
      {
        speaker: 'prince',
        text: '"오해는 마십시오. 저는 여전히 이 나라에 관심 없습니다."',
      },
      {
        speaker: 'narration',
        text:
          '관심 있는 것은 {왕} 하나뿐이라는 뜻이었고, 그래서 이 제안이 더 위험했다.\n' +
          '두 왕조가 만나는 자리에서 누가 위에 서는지는 사람의 마음이 정하지 않는다.',
      },
    ],
  },
  ...HARD_EXCLUSIVE_SCENES,
]

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
)
