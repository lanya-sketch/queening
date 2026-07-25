import type { Scene } from '../../types/game'

/**
 * 유년기 인물 씬 (events/childhood.ts 와 짝).
 *
 * 화자 id 로 스프라이트를 켠다:
 *   regent(섭정공)·queen_mother(모후) — 매니페스트 characterPortraits 에 성별 고정으로 등록됨.
 *   heir/loyalist/commander/prince — 5인 데이터.
 * 톤: 11~12세는 **다정함 속의 위화감**, 13세는 **각자 다른 첫인상**(①평가·②늘곁·⑤문앞·③얕봄).
 */
export const CHILDHOOD_SCENES: Scene[] = [
  // ── 11~12세 위화감 ────────────────────────────────────────
  {
    id: 'scene-child-uncle-evening',
    lines: [
      {
        speaker: 'narration',
        text:
          '올라온 문서가 책상에 쌓였다. 열한 살에게는 글자보다 무게가 먼저 느껴지는 것들이다.\n' +
          '문이 열리고 섭정공이 들어왔다. 웃는 얼굴이었다.',
      },
      { speaker: 'regent', text: '"이 늦은 시각까지. 어려운 것은 숙부가 봐 드리지요."' },
      {
        speaker: 'narration',
        text:
          '그는 익숙한 손길로 문서를 가져갔다. 정말로 어려운 대목만 골라내는 솜씨였다.\n' +
          '{왕}의 손이 가벼워졌다. 편안했다. 그리고 그 편안함이, 뒤늦게 조금 이상했다.',
      },
      { speaker: 'regent', text: '"쉬십시오, 전하. 이런 일로 밤을 새우실 나이가 아닙니다."' },
      {
        speaker: 'narration',
        text: '다정한 말이었다. 다만 그 말대로 하면, 이 나라의 무엇도 {왕}의 손을 거치지 않게 된다.',
      },
    ],
  },
  {
    id: 'scene-child-mother-room',
    lines: [
      {
        speaker: 'narration',
        text: '왕대비가 {왕}을 방으로 불렀다. 향이 은은했고, 창은 두꺼운 천으로 반쯤 가려져 있었다.',
      },
      { speaker: 'queen_mother', text: '"요즘 잠은 잘 자니. 안색이 좋지 않구나."' },
      {
        speaker: 'narration',
        text: '어머니는 작은 병을 꺼내 따뜻한 물에 몇 방울 떨어뜨렸다. 익숙한 손이었다.',
      },
      { speaker: 'queen_mother', text: '"의관이 지어 준 것이다. 마시면 마음이 가라앉아."' },
      {
        speaker: 'narration',
        text:
          '{왕}은 잔을 비웠다. 어머니가 주는 것을 의심할 이유는 없었다.\n' +
          '…없었다. 지금은.',
      },
    ],
  },
  {
    id: 'scene-child-uncle-corridor',
    lines: [
      {
        speaker: 'narration',
        text: '회랑 끝에서 섭정공이 누군가와 낮게 이야기하고 있었다. {왕}을 보자 대화가 멈췄다.',
      },
      {
        speaker: 'narration',
        text: '그의 손에 든 문서가 소매 안으로 사라졌다. 자연스러웠지만, 자연스럽기에 더 눈에 띄었다.',
      },
      { speaker: 'regent', text: '"산책이십니까. 이런 것은 아이가 볼 것이 아닙니다, 전하."' },
      {
        speaker: 'narration',
        text:
          '그는 웃으며 {왕}의 어깨를 짚고 방향을 돌렸다. 다정한 손이었다.\n' +
          '무엇을 감췄는지 묻지 못한 채, {왕}은 온 길을 되돌아 걸었다.',
      },
    ],
  },
  {
    id: 'scene-child-mother-dinner',
    lines: [
      {
        speaker: 'narration',
        text: '드물게 어머니와 겸상하는 저녁이었다. 왕대비는 {왕}의 접시에 먼저 음식을 놓아 주었다.',
      },
      { speaker: 'queen_mother', text: '"숙부께는 늘 예를 갖추어라. 이 궁에서 너를 지키는 사람이다."' },
      {
        speaker: 'narration',
        text: '{왕}은 고개를 들었다. 아버지를 잃은 궁에서, 어머니가 숙부를 그렇게 말한 것은 처음이었다.',
      },
      { speaker: 'queen_mother', text: '"…어미 말을 새겨 두렴. 다 너를 위한 것이야."' },
      {
        speaker: 'narration',
        text: '따뜻한 목소리였다. 다만 그 문장은, 누구의 편에서 나온 것인지 알 수 없게 지어져 있었다.',
      },
    ],
  },

  // ── 13세 첫 등장 ──────────────────────────────────────────
  {
    id: 'scene-meet-heir',
    lines: [
      {
        speaker: 'narration',
        text: '섭정공이 아들을 데려와 {왕} 앞에 나란히 세웠다. 같은 해에 태어난 아이라고 했다.',
      },
      { speaker: 'regent', text: '"또래가 있어야 하지 않겠습니까. 함께 배우면 좋을 것입니다."' },
      {
        speaker: 'narration',
        text:
          '아이는 인사를 하지 않았다. 대신 {왕}을 천천히 훑어보았다.\n' +
          '그 눈에 담긴 것은 호기심이 아니라 평가였다 — 아버지 밑에서 사람을 값매기며 자란 눈.',
      },
      { speaker: 'heir', text: '"…폐하께서는, 생각보다 작으시군요."' },
      {
        speaker: 'narration',
        text: '첫마디였다. 같이 자랄 아이가 첫마디로 {왕}의 값을 매겼다.',
      },
    ],
  },
  {
    id: 'scene-meet-loyalist',
    lines: [
      {
        speaker: 'narration',
        text: '문서를 나르던 아이가 {왕} 앞에서 걸음을 멈췄다. 낯이 익었다 — 어디서 봤더라.',
      },
      {
        speaker: 'narration',
        text:
          '아버지의 장례. 그 긴 줄 어딘가에 이 아이도 서 있었다.\n' +
          '그 애의 아버지도 그 무렵 세상을 떠났다고, 누군가 지나가듯 말했었다.',
      },
      { speaker: 'loyalist', text: '"…실례했습니다, 전하. 지나가던 길이라." ' },
      {
        speaker: 'narration',
        text:
          '늘 이 궁에 있던 아이였다. 문서를 나르고, 자리를 지키고, 눈에 띄지 않게.\n' +
          '{왕}은 오늘에서야 그 애의 이름을 물었다.',
      },
    ],
  },
  {
    id: 'scene-meet-commander',
    lines: [
      {
        speaker: 'narration',
        text: '처소 문을 지키는 무관이 오늘따라 눈에 들어왔다. 아니, 늘 그 자리에 있던 사람이었다.',
      },
      {
        speaker: 'narration',
        text: '그 가문이 아홉 대째 이 문을 지켜 왔다고 했다. {왕}이 태어나기 훨씬 전부터.',
      },
      { speaker: 'commander', text: '"이 문은, 제 가문이 지킵니다. 아홉 대째입니다, 전하."' },
      {
        speaker: 'narration',
        text:
          '낮고 짧은 말이었다. 곁에 있었으나 이름을 몰랐던 사람.\n' +
          '오늘 처음으로 눈이 마주쳤다.',
      },
    ],
  },
  {
    id: 'scene-meet-prince',
    lines: [
      {
        speaker: 'narration',
        text: '조공을 받으러 온 제국의 사절단에, 어린 왕족 하나가 섞여 있었다.',
      },
      { speaker: 'prince', text: '"조공 바치는 나라가 어떻게 굴러가는지, 한번 보고 싶었거든요."' },
      {
        speaker: 'narration',
        text:
          '웃으며 한 말이었지만 웃음이 아니었다.\n' +
          '그는 {왕}의 옥좌를, 궁을, 나라를 구경거리 보듯 둘러보았다.',
      },
      { speaker: 'prince', text: '"작고 조용하네요. …나쁘지 않아요. 심심하진 않겠어요."' },
      {
        speaker: 'narration',
        text: '어린 왕을 앞에 두고, 그는 이 나라를 이미 다 본 사람처럼 굴었다.',
      },
    ],
  },
]
