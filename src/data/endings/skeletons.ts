import type { EndingResult, EndingSkeleton } from '../../types/game'

/**
 * 엔딩 골격 (M3-2).
 *
 * 골격은 tier 로 갈린다. 단 **폭군만 예외** — disposal:폭군 은 tier 가 무엇이든
 * 왕의 성격 전체를 바꾸므로, tier 골격보다 높은 priority 로 가로챈다.
 *
 * ★ 이번 라운드는 셋만 실제 텍스트다: 친정 / 허수아비 / 폭군.
 *   나머지 다섯 tier 는 플레이스홀더 골격이고, 조립은 catch-all 이 아니라
 *   각자의 골격이 받는다(조립 완전성은 유지되고, 텍스트만 후속 라운드에서 채운다).
 *
 * anchor 순서가 곧 엔딩의 서술 순서다:
 *   opening → truth → disposal → special → romance → nation → closing
 */

const isTier = (tier: EndingResult['tier']) => (r: EndingResult) => r.tier === tier

/**
 * 모든 골격이 공유하는 몸통 — opening 뒤의 삽입 자리 순서.
 * closing anchor 는 골격 고정 마무리 문장 **앞에** 오는 수식 자리다.
 */
const body = [
  { speaker: 'narration' as const, anchor: 'truth' as const },
  { speaker: 'narration' as const, anchor: 'disposal' as const },
  { speaker: 'narration' as const, anchor: 'special' as const },
  { speaker: 'narration' as const, anchor: 'romance' as const },
  { speaker: 'narration' as const, anchor: 'nation' as const },
  { speaker: 'narration' as const, anchor: 'closing' as const },
]

export const ENDING_SKELETONS: EndingSkeleton[] = [
  // ── 폭군 — tier 를 가로챈다(priority 최고).
  {
    id: 'tyrant',
    match: (r) => r.disposal === '폭군',
    priority: 100,
    lines: [
      {
        speaker: 'narration',
        text:
          '{왕}은 강했다. 그가 명하면 궁정이 따랐고, 그가 치우라 하면 사람이 사라졌다.\n' +
          '다만 아무도 이유를 묻지 않았는데, 물어서 답이 없을 것을 모두가 알았기 때문이다.',
      },
      ...body,
      {
        speaker: 'narration',
        text:
          '가정교사가 가르친 것 중에 이것은 없었다. 힘으로 무엇이든 할 수 있게 된 사람에게\n' +
          '무엇을 하지 않을지를 가르치는 법을, 당신은 끝내 찾지 못했다.',
      },
    ],
  },

  // ── 친정 (실제 텍스트)
  {
    id: 'autonomy',
    match: isTier('친정'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text:
          '열한 살에 옥좌에 앉았던 아이가 스무 살이 되었다.\n' +
          '이제 이 방의 누구도 그를 대신해 서명하지 않는다.',
      },
      ...body,
      {
        speaker: 'narration',
        text:
          '가정교사가 가르칠 수 있는 것은 여기까지였고, 남은 것은 그가 배운 적 없는 것들이다.\n' +
          '당신은 궁을 떠나며 한 번 돌아보았다. 아이는 돌아보지 않았다. 그래도 되었다.',
      },
    ],
  },

  // ── 허수아비 (실제 텍스트)
  {
    id: 'puppet',
    match: isTier('허수아비'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text:
          '아홉 해가 지났고, 옥좌는 여전히 그 자리에 있다.\n' +
          '{왕}도 그 위에 있다. 다만 나라를 움직이는 손은 다른 곳에 있었다.',
      },
      ...body,
      {
        speaker: 'narration',
        text:
          '실패라고 부르기에는 아이가 너무 많은 것을 견뎌냈고, 성공이라기에는\n' +
          '너무 적은 것이 그의 손에 남았다. 아직 스무 살이다. 시간은 남아 있다 —\n' +
          '가정교사가 스스로에게 그렇게 되뇌며 궁을 떠났다.',
      },
    ],
  },

  // ── 공존 (플레이스홀더 골격 — 텍스트는 후속)
  {
    id: 'coexist',
    match: isTier('공존'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text: '궁정의 절반은 {왕}을 보고, 나머지 절반은 아직 다른 곳을 본다. 아홉 해의 끝이다.',
      },
      ...body,
      { speaker: 'narration', text: '저울은 아직 어느 쪽으로도 완전히 기울지 않았다.' },
    ],
  },

  // ── 배드 3종 (플레이스홀더 골격)
  {
    id: 'bad-puppet-poison',
    match: isTier('배드:꼭두각시'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text: '왕대비궁에서 올라오던 탕약은 끝내 멈추지 않았다. {왕}은 그것을 물리지 못했다.',
      },
      ...body,
      { speaker: 'narration', text: '옥좌에는 사람이 앉아 있었지만, 그를 움직이는 손은 따로 있었다.' },
    ],
  },
  {
    id: 'bad-junta',
    match: isTier('배드:군부종속'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text: '군을 빌린 대가는 컸다. {왕}의 이름으로 칼이 움직였지만, 칼자루는 다른 손에 있었다.',
      },
      ...body,
      { speaker: 'narration', text: '아홉 대 만에, 무관 가문은 다시 왕을 갈아치울 자리에 섰다.' },
    ],
  },
  {
    id: 'bad-subjugated',
    match: isTier('배드:제국복속'),
    priority: 10,
    lines: [
      {
        speaker: 'narration',
        text: '두 왕관이 만났고, 하나가 다른 하나를 삼켰다. 약한 나라가 강한 나라와 손을 잡은 결과였다.',
      },
      ...body,
      { speaker: 'narration', text: '결혼이라 불렸지만, 역사는 그것을 정복이라 적었다.' },
    ],
  },

  // ── catch-all — 어떤 결과든 받는 안전망. 빈 엔딩을 원리적으로 막는다.
  {
    id: 'catch-all',
    match: () => true,
    priority: 0,
    lines: [
      { speaker: 'narration', text: '아홉 해가 지났다. 열한 살의 아이는 이제 스무 살이 되었다.' },
      ...body,
      { speaker: 'narration', text: '그리고 가정교사가 할 수 있는 일은 여기까지였다.' },
    ],
  },
]
