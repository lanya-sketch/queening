import type { Scene } from '../../types/game'

/**
 * 결정적 씬 + 청산 후일담 (하드 배타성 라운드).
 *
 * ★ 결정적 씬 5개는 각 로맨스의 정점 — 관계가 한 번의 선택 앞에 서는 순간.
 *   수락/거절 선택은 이벤트(data/events/decisive)가 붙이므로, 여기 씬은 그 앞의 대사다.
 *   ①(아버지 감당)·⑤(격식 무너짐)를 가장 두껍게.
 *
 * ★ 청산 후일담은 호감도 구간별로 톤이 갈린다. ⑤ 3구간 전부, ①②④ 높은 구간만.
 */
export const HARD_EXCLUSIVE_SCENES: Scene[] = [
  // ────────────────────────── 결정적 씬 5
  {
    // ① 3b-2 부터 세운 "아버지를 부르는 방식" 축의 종착 — 자신으로 감당한다.
    id: 'scene-decisive-heir',
    lines: [
      {
        speaker: 'heir',
        text: '"…전하. 저는 오래 아버지의 아들로만 여기 서 있었습니다."',
      },
      {
        speaker: 'narration',
        text: '그 문장에는 흐림도, 끊김도 없었다. 이제 그는 아버지 뒤에 숨지 않았다.',
      },
      {
        speaker: 'heir',
        text:
          '"오늘은 아버지의 아들이 아니라, 제 이름으로 여쭙고 싶습니다.\n' +
          '전하 곁에 서는 사람이, 섭정공의 아들이어도 괜찮으시겠습니까."',
      },
      {
        speaker: 'narration',
        text: '그는 처음으로, 아버지를 자신의 몫으로 짊어진 채 물었다.',
      },
    ],
  },
  {
    id: 'scene-decisive-loyalist',
    lines: [
      {
        speaker: 'loyalist',
        text: '"저는 늘 곁에 있었습니다. 전하께서 알아채지 못하실 만큼 조용히."',
      },
      {
        speaker: 'narration',
        text: '그는 한 번도 먼저 나선 적이 없는 사람이었다. 오늘도 목소리는 낮았다.',
      },
      {
        speaker: 'loyalist',
        text: '"이제는 알아채 주셨으면 합니다. 곁에 있는 것과, 곁에 서는 것은 다르니까요."',
      },
    ],
  },
  {
    // ③ 상주하지 않는 사람 — 정치에 무관심하나 {왕} 하나엔 관심.
    id: 'scene-decisive-prince',
    lines: [
      {
        speaker: 'prince',
        text: '"저는 이 나라에 관심 없다고 했지요. 그건 지금도 사실입니다."',
      },
      {
        speaker: 'narration',
        text: '그는 언제든 떠날 수 있는 사람이었고, 그래서 그가 지금 여기 있는 것은 선택이었다.',
      },
      {
        speaker: 'prince',
        text: '"다만 관심 있는 것 하나를 위해, 두 왕관을 걸어볼 생각이 있습니다. 어떻습니까."',
      },
    ],
  },
  {
    // ⑤ 격식이 무너지는 순간 — 아홉 대의 예법을 처음 어긴다.
    id: 'scene-decisive-commander',
    lines: [
      {
        speaker: 'commander',
        text:
          '"…전하. 제 가문은 아홉 대째 문 앞에 섰습니다.\n' +
          '안으로 들어오지 않는 것이 예법이라 했지요."',
      },
      {
        speaker: 'narration',
        text: '그는 처음으로 그 자리에서 한 걸음 안으로 들어왔다.',
      },
      {
        speaker: 'commander',
        text: '"그 예법을, 오늘 처음으로 어기겠습니다. 허락하신다면."',
      },
    ],
  },
  {
    id: 'scene-decisive-hero',
    lines: [
      {
        speaker: 'hero',
        text: '"저는 줄 사람이 없어서 여태 아무것도 안 준 사람입니다."',
      },
      {
        speaker: 'narration',
        text: '그는 누구에게도 굽힌 적이 없었고, 지금도 무릎을 꿇지 않았다.',
      },
      {
        speaker: 'hero',
        text: '"이제 줄 사람이 생긴 것 같은데, 받아 주시겠습니까. 저 같은 걸."',
      },
    ],
  },

  // ────────────────────────── ⑤ 청산 후일담 3구간
  {
    // 높음 — 거의 사랑했던/결정적 씬 거절당한. 깊은 배신감.
    id: 'scene-aftermath-commander-high',
    lines: [
      {
        speaker: 'narration',
        text:
          '반역의 죄목이 낭독되는 동안 그는 한 번도 {왕}을 보지 않았다. 마지막에 딱 한 번 보았다.',
      },
      {
        speaker: 'commander',
        text: '"아홉 대를 지킨 자리가 이렇게 쓰이는군요."',
      },
      {
        speaker: 'narration',
        text:
          '원망도 아니고 애원도 아니었다. 그저 오래 지켜온 것이 무너지는 소리였다.\n' +
          '그 자리를, {왕}은 스스로 무너뜨렸다.',
      },
    ],
  },
  {
    // 중간 — 서먹한 배신. 약간의 씁쓸함.
    id: 'scene-aftermath-commander-mid',
    lines: [
      {
        speaker: 'narration',
        text:
          '그는 순순히 끌려갔다. 마지막에 짧게 예를 갖추었는데, 그것이 습관인지 마음인지\n' +
          '{왕}은 끝내 알지 못했다.',
      },
      {
        speaker: 'commander',
        text: '"…전하의 안녕을 빕니다."',
      },
      {
        speaker: 'narration',
        text: '오래 곁에 있었으나 끝내 가깝지는 않았던 사람의, 마지막 격식이었다.',
      },
    ],
  },
  {
    // 낮음 — 남남처럼. 담담한 정치적 제거.
    id: 'scene-aftermath-commander-low',
    lines: [
      {
        speaker: 'narration',
        text:
          '절차는 조용히 끝났다. 오래된 가문 하나가 정리되었을 뿐, {왕}에게 특별한 감정은 없었다.\n' +
          '그도 {왕}에게 그러했을 것이다. 두 사람은 끝내 서로를 잘 알지 못했다.',
      },
    ],
  },

  // ────────────────────────── ①②④ 청산 후일담 높은 구간
  {
    // ① 아버지 그늘로 되돌아가는 비극.
    id: 'scene-aftermath-heir-high',
    lines: [
      {
        speaker: 'heir',
        text: '"…괜찮습니다. 놀라지 않았습니다."',
      },
      {
        speaker: 'narration',
        text: '{그:heir}는 정말로 놀라지 않은 얼굴이었고, 그것이 가장 아팠다.',
      },
      {
        speaker: 'heir',
        text:
          '"결국 저는 섭정공의 아들이었을 뿐이지요. 전하께서 저를 그 이상으로 보신 적이 있었는지,\n' +
          '이제 와서는 저도 모르겠습니다."',
      },
    ],
  },
  {
    // ② 늘 옳은 편에 서서 죽는, 충성의 저주.
    id: 'scene-aftermath-loyalist-high',
    lines: [
      {
        speaker: 'loyalist',
        text: '"저희 가문은 늘 옳은 편에 섰습니다. 그리고 늘 그 대가를 치렀지요."',
      },
      {
        speaker: 'narration',
        text: '그는 원망하지 않았다. 원망하지 않는 것이 더 무거웠다.',
      },
      {
        speaker: 'loyalist',
        text: '"이번에도 그렇게 되는군요. 전하 곁에 있었다는 이유로."',
      },
    ],
  },
  {
    // ④ 쓰고 버리는군요, 방치의 냉소.
    id: 'scene-aftermath-hero-high',
    lines: [
      {
        speaker: 'hero',
        text: '"역시 쓰고 버리는군요."',
      },
      {
        speaker: 'narration',
        text:
          '분노는 없었다. 그는 세상이 자신을 이렇게 다룰 것을 이미 알고 있었다는 얼굴이었다.',
      },
      {
        speaker: 'hero',
        text:
          '"괜찮습니다. 원래 아무 데도 없던 놈이었으니까. 잠깐 어딘가에 있는 줄 알았을 뿐이지요."',
      },
    ],
  },

  // ────────────────────────── 측실 후일담
  // ★ 강압을 미화하지 않는다 — 당한 자의 상실이 핵심. 장면은 그리지 않고 결과와 감정만.
  {
    // ⑤ 높음 — 결정적 씬("문 안으로 들어오라")을 뒤집는 가장 잔인한 애매함.
    id: 'scene-concubine-commander-high',
    lines: [
      {
        speaker: 'narration',
        text:
          '그는 가문의 검을 왕실 창고에 내려놓고 나서야 안으로 들어올 수 있었다.\n' +
          '아홉 대가 지켜온 검이었다. 이제 벽에 걸리지도 못하고 창고에 눕는다.',
      },
      {
        speaker: 'commander',
        text: '"…이제 이 검도, 저도 전하의 것입니다."',
      },
      {
        speaker: 'narration',
        text:
          '문 안으로 들어오라던 그 말이 이렇게 쓰일 줄은 그도 {왕}도 몰랐다.\n' +
          '곁에 두었으나 곁에 선 것은 아니었다. 사랑이라 부르기에는, 그가 잃은 것이 너무 많았다.',
      },
    ],
  },
  {
    // ⑤ 중간 — 서먹한 소유. 격식이 체념으로 바뀐다.
    id: 'scene-concubine-commander-mid',
    lines: [
      {
        speaker: 'narration',
        text:
          '검을 거두는 절차는 조용했다. 그는 반항하지 않았고, 그 순응이 오히려 무거웠다.',
      },
      {
        speaker: 'commander',
        text: '"가문의 힘을 원하셨다면, 이 편이 서로 솔직하지요."',
      },
      {
        speaker: 'narration',
        text:
          '틀린 말은 아니었다. 다만 솔직함과 다정함은 다른 것이어서,\n' +
          '두 사람 사이에는 끝내 다정함이 들어설 자리가 없었다.',
      },
    ],
  },
  {
    // ⑤ 낮음 — 담담한 정치적 소유.
    id: 'scene-concubine-commander-low',
    lines: [
      {
        speaker: 'narration',
        text:
          '무관 가문의 힘을 꺾는 가장 확실한 방법은, 그 가문의 딸과 검을 함께 왕실로 들이는 것이었다.\n' +
          '{왕}은 그것을 정치라 불렀고, 그도 굳이 다른 이름을 붙이지 않았다.',
      },
    ],
  },
  {
    // ① 높음 — 아버지 그늘을 벗으려던 사람의 가문을, 통째로 지워 소유한다.
    id: 'scene-concubine-heir-high',
    lines: [
      {
        speaker: 'narration',
        text:
          '섭정공 가문의 문장은 기록에서 지워졌다. 그 아들은 이제 성도 가문도 없이,\n' +
          '오직 왕실의 사람으로만 남았다.',
      },
      {
        speaker: 'heir',
        text: '"…결국 저는 아버지의 아들도, 제 자신도 아니게 되었군요. 전하의 것일 뿐."',
      },
      {
        speaker: 'narration',
        text: '아버지 그늘을 벗으려던 사람은, 그늘째로 {왕}에게 삼켜졌다.',
      },
    ],
  },
  {
    // ② 높음 — 곁에 있던 자리가 갇힌 자리가 된다.
    id: 'scene-concubine-loyalist-high',
    lines: [
      {
        speaker: 'loyalist',
        text: '"저는 늘 곁에 있었습니다. 이렇게 붙들어 두지 않으셔도 되었는데요."',
      },
      {
        speaker: 'narration',
        text:
          '원망은 없었다. 스스로 남았을 사람을 굳이 가둔 것이라, 그 관용 없음이 더 서글펐다.',
      },
    ],
  },
  {
    // ④ 높음 — 벤 검이 장식이 되고, 그도 장식이 된다.
    id: 'scene-concubine-hero-high',
    lines: [
      {
        speaker: 'narration',
        text: '마왕을 벤 검은 알현실 벽에 걸렸다. 이제 아무것도 베지 않는 장식으로.',
      },
      {
        speaker: 'hero',
        text: '"저 검이나 저나, 이제 걸려 있는 신세는 같군요."',
      },
    ],
  },

  // ────────────────────────── ③ 정복 병합 (능동 야망)
  {
    id: 'scene-prince-conquest',
    lines: [
      {
        speaker: 'narration',
        text:
          '제국의 왕족은 언제든 떠날 수 있는 사람이었다. 그의 나라도 그러할 줄 알았다.\n' +
          '그러나 지금 {왕}의 손에는 그 나라를 삼킬 힘이 있었다.',
      },
      {
        speaker: 'prince',
        text: '"…정말로 하시려는 겁니까."',
      },
      {
        speaker: 'narration',
        text:
          '그는 화내지 않았다. 화낼 자격이 자신에게 있는지 재는 얼굴이었다.\n' +
          '이 나라에 관심 없다던 사람이, 처음으로 이 나라를 두려워하고 있었다.',
      },
    ],
  },
]
