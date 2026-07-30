import type { Scene } from '../../types/game'

/**
 * 16~19세 관계 심화 씬 (events/relations16.ts 와 짝).
 *
 * ★ 로맨스로 기울되 **확정 안 함** — 각 씬은 그 캐릭터 결정적 씬의 前조다:
 *   ① "제 이름으로 여쭙고 싶습니다" / ⑤ "예법을 오늘 처음으로 어기겠습니다"
 *   ② "곁에 서는 것은 다르니까요" / ③ "두 왕관을 걸어볼" / ④ "줄 사람이 생긴"
 *   ①⑤ 를 가장 두껍게(반감·격식의 낙차가 제일 크다). 미성년 안전 — 신체 묘사 없이 관계·감정.
 */
export const RELATIONS16_SCENES: Scene[] = [
  // ── ① 아버지 그늘 → 자기 이름 ──────────────────────────
  {
    id: 'scene-relation-heir-1',
    lines: [
      {
        speaker: 'narration',
        text: '섭정공이 시킨 계략이었다. {왕} 앞에서 그것을 읊던 그 애가, 문득 손을 멈췄다.',
      },
      { speaker: 'heir', text: '"…이건 아버지의 뜻입니다. 제 뜻이었으면 좋았을 텐데요."' },
      {
        speaker: 'narration',
        text:
          '13세의 그 애는 아버지 이야기를 사실로만 했다. 오늘 처음으로, 아버지의 뜻과 제 뜻을 갈랐다.\n' +
          '아직은 갈래만 냈을 뿐이지만, 금은 한번 가면 되돌지 않는다.',
      },
    ],
  },
  {
    id: 'scene-relation-heir-2',
    lines: [
      {
        speaker: 'narration',
        text: '섭정공이 {자식:heir}에게 일렀다. {왕}이 어디까지 아는지, {자식:heir}의 입으로 떠보라고.',
      },
      { speaker: 'heir', text: '"아버지께서 전하를 시험하라 하십니다. …저는 그 자리에 서고 싶지 않습니다."' },
      {
        speaker: 'narration',
        text:
          '그는 아직 아버지를 거스르지 못했다. 다만 처음으로, 아버지와 {왕} 사이에서 어느 편인지를 스스로 물었다.\n' +
          '답은 미뤘다. 하지만 물음을 낸 것만으로도, 그 애의 자리는 이미 조금 옮겨져 있었다.',
      },
    ],
  },
  {
    id: 'scene-relation-heir-3',
    lines: [
      {
        speaker: 'narration',
        text: '늦은 밤, 그 애가 드물게 아버지 이야기를 하다가 문장을 바꿨다.',
      },
      { speaker: 'heir', text: '"아버지는… 아니, 저는. 저는 그렇게 생각하지 않습니다."' },
      {
        speaker: 'narration',
        text:
          '"아버지"로 시작해 "저는"으로 끝나는 문장. 그 애가 처음으로 아버지 뒤에서 반걸음 나와 섰다.\n' +
          '아직 "제 이름으로 여쭙겠다"까지는 아니다. 다만 그 말이 이제 멀지 않다는 것을, 둘 다 알았다.',
      },
    ],
  },

  // ── ⑤ 문지방 반걸음 → 한 걸음 앞 ──────────────────────
  {
    id: 'scene-relation-commander-1',
    lines: [
      {
        speaker: 'narration',
        text: '비바람 치는 밤이었다. 처소 안으로 들라 해도 늘 문 밖이던 그가, 오늘은 문지방에 발을 걸쳤다.',
      },
      {
        speaker: 'narration',
        text: '한 박자 뒤, 그는 발을 거두고 다시 한 걸음 물러섰다.',
      },
      { speaker: 'commander', text: '"…송구합니다. 격을 잊을 뻔했습니다."' },
      {
        speaker: 'narration',
        text: '아홉 대의 예법이, 오늘 반걸음 흔들렸다. 반걸음이었지만, 아홉 대 동안 없던 반걸음이었다.',
      },
    ],
  },
  {
    id: 'scene-relation-commander-2',
    lines: [
      {
        speaker: 'narration',
        text: '{왕}이 다쳐 돌아온 날, 문 밖의 그가 평소보다 오래 자리를 뜨지 못했다.',
      },
      { speaker: 'commander', text: '"…무사하시니 됐습니다."' },
      {
        speaker: 'narration',
        text:
          '단단한 절도 아래 눌려 있던 것이, 그 한마디에 아주 잠깐 새어 나왔다.\n' +
          '그는 곧 자세를 고쳤다. 하지만 {왕}은 방금 본 것을 못 본 척할 수 없었다.',
      },
    ],
  },
  {
    id: 'scene-relation-commander-3',
    lines: [
      {
        speaker: 'narration',
        text: '그가 무언가를 말하려 입을 열었다. 아홉 대의 예법이 그 입을 다시 닫게 했다.',
      },
      { speaker: 'commander', text: '"…아닙니다. 이 자리에서 드릴 말이 아닙니다."' },
      {
        speaker: 'narration',
        text:
          '이번엔 오래 망설였다. 삼키는 데 그렇게 긴 시간이 걸린 적은 없었다.\n' +
          '문지방 하나가 아직 둘 사이에 있다. 다만 그가 그것을 어길 날이, 이제 한 걸음 앞이었다.',
      },
    ],
  },

  // ── ② 곁에 있는 것 → 곁에 서는 것 ──────────────────────
  {
    id: 'scene-relation-loyalist-1',
    lines: [
      {
        speaker: 'narration',
        text: '어전이 어수선한 자리, 늘 뒤에서 문서만 나르던 그 애가 처음으로 앞으로 나섰다.',
      },
      { speaker: 'loyalist', text: '"전하. 그건… 제가 아룁니다. 제가 아는 일입니다."' },
      {
        speaker: 'narration',
        text:
          '조용하던 목소리가 오늘은 {왕}에게 똑똑히 닿았다. 알아채 달라는 듯이.\n' +
          '늘 곁에 있었지만, 오늘은 곁에 있는 것을 봐 달라 했다.',
      },
    ],
  },
  {
    id: 'scene-relation-loyalist-2',
    lines: [
      {
        speaker: 'narration',
        text: '둘만 남은 밤, 그 애가 문서를 정리하다 손을 멈추고 {왕}을 오래 보았다.',
      },
      { speaker: 'loyalist', text: '"저는 늘 곁에 있었습니다. …그런데 요즘은, 그것만으론 부족한 것 같습니다."' },
      {
        speaker: 'narration',
        text:
          '곁에 "있는" 것과 곁에 "서는" 것, 그 애가 처음으로 그 둘을 구분하는 눈을 했다.\n' +
          '아직 서겠다 말하진 않았다. 다만 있는 것으로는 부족하다는 것을, 이제 그 애도 안다.',
      },
    ],
  },

  // ── ③ 얕봄 → 인정, 떠날 수 있는 자가 머문다 ────────────
  {
    id: 'scene-relation-prince-1',
    lines: [
      {
        speaker: 'narration',
        text: '또 예고 없이 든 왕족이, {왕}이 정무를 처리하는 것을 오래 지켜보았다.',
      },
      { speaker: 'prince', text: '"아직 안 망했네요."' },
      {
        speaker: 'narration',
        text: '늘 하던 말인데, 오늘은 웃음이 붙지 않았다.',
      },
      { speaker: 'prince', text: '"…솔직히, 이제 좀 궁금해졌어요. 이 사람이 어디까지 가나."' },
      {
        speaker: 'narration',
        text: '반쯤은 농담이라던 것에서, 오늘 그 반쯤이 떨어져 나갔다. 남은 것은 인정에 가까웠다.',
      },
    ],
  },
  {
    id: 'scene-relation-prince-2',
    lines: [
      {
        speaker: 'narration',
        text: '사절단이 제국으로 돌아가는 날이었다. 짐이 실리고 행렬이 섰는데, 그가 그 자리에 없었다.',
      },
      { speaker: 'prince', text: '"먼저 가라고 했어요. 저는… 조금 더 볼 게 있어서."' },
      {
        speaker: 'narration',
        text:
          '언제든 떠날 수 있는 사람이었다. 그래서 그가 오늘 안 떠난 것은, 처음으로 **선택**이었다.\n' +
          '무엇을 더 보려는지 그는 말하지 않았다. {왕}도 굳이 묻지 않았다.',
      },
    ],
  },

  // ── ④ 소문의 그 사람 → 냉소의 첫 균열 ──────────────────
  {
    id: 'scene-relation-hero-1',
    lines: [
      {
        speaker: 'narration',
        text:
          '변경의 소문으로만 알던 사람이 어전에 섰다. "버려진 전선을 홀로 지킨 자", 그 이름이 이 사람이었다.\n' +
          '실물은 소문보다 훨씬 말이 없었고, 눈은 아무것도 바라지 않았다.',
      },
      { speaker: 'hero', text: '"포상은 됐습니다. 궁에 두시려는 것도 압니다. …마음대로 하십시오."' },
      {
        speaker: 'narration',
        text:
          '냉소였다. 세상에 아무것도 기대하지 않는 자의.\n' +
          '{왕}은 그 냉소가 어디서 왔는지 알 것 같았다. 삼 년을 아무도 찾지 않은 사람이었으니까.',
      },
    ],
  },
  {
    id: 'scene-relation-hero-2',
    lines: [
      {
        speaker: 'narration',
        text: '아무에게도 곁을 주지 않던 사람이, 요즘 {왕}의 책상에 이따금 무언가를 놓고 갔다.',
      },
      {
        speaker: 'narration',
        text: '변경의 지형을 그린 낡은 지도. 국경 마을의 이름들. 장부에는 없는 것들이었다.',
      },
      { speaker: 'hero', text: '"…쓸모 있을까 해서요. 별건 아닙니다."' },
      {
        speaker: 'narration',
        text:
          '줄 사람이 없어서 여태 아무것도 안 주던 사람이었다. 그 냉소가, {왕} 앞에서만 조금씩 풀렸다.\n' +
          '아직 "줄 사람이 생겼다"까지는 아니다. 다만 그 말이 어디선가 시작되고 있었다.',
      },
    ],
  },
]
