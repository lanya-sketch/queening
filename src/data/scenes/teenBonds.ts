import type { Scene } from '../../types/game'

/**
 * 13~15세 관계 씬 (events/teenBonds.ts 와 짝). **전부 로맨스 아님.**
 *
 * 화자 id 로 스프라이트를 켠다: heir/loyalist/commander/prince (5인 데이터).
 * 톤: 13세 첫인상(평가·늘곁·문앞·얕봄)이 3년에 걸쳐 조금씩 흔들리되, 아직 로맨스 아님.
 *   미성년 구간 — 신체·연정 묘사 없이 **관계의 결**만 바꾼다.
 * 각 마지막 줄은 데뷔탕트의 낙차를 위해 "아직/반쯤/그늘"의 여지를 남긴다.
 */
export const TEEN_BOND_SCENES: Scene[] = [
  // ── ① 섭정공 아들 — 정략·반감, "위에 아무도 없다" ──────────
  {
    id: 'scene-bond-heir-appraise',
    lines: [
      {
        speaker: 'narration',
        text: '섭정공이 또 {자식:heir}을 {왕}의 곁에 앉혀 두었다. 함께 배우라는 명분으로.',
      },
      { speaker: 'heir', text: '"바둑이나 두시겠습니까. 아버지께서 권하셨습니다."' },
      {
        speaker: 'narration',
        text:
          '돌을 놓는 손이 정확했다. 봐주지도, 무리하지도 않았다.\n' +
          '{왕}은 알았다. 이 애도 알고 있다. 우리가 왜 마주 앉혀졌는지.',
      },
      { speaker: 'heir', text: '"…이건 제 뜻이 아닙니다. 폐하의 뜻도 아니겠지요."' },
      {
        speaker: 'narration',
        text: '처음으로 둘의 셈이 맞은 순간이었다. 바둑판만 사이에 둔 채, 아무도 이기려 하지 않았다.',
      },
    ],
  },
  {
    id: 'scene-bond-heir-shadow',
    lines: [
      {
        speaker: 'narration',
        text: '늦은 오후, 그 애가 드물게 먼저 입을 열었다. 복기하던 손이 멈춰 있었다.',
      },
      { speaker: 'heir', text: '"아버지는 제가 진 판을 밤마다 다시 두게 하십니다. 이길 때까지."' },
      {
        speaker: 'narration',
        text: '{왕}은 답하지 않았다. 아버지를 잃은 자와, 아버지가 너무 큰 자가 한 방에 있었다.',
      },
      { speaker: 'heir', text: '"…폐하는 편하시겠습니다. 위에 아무도 안 계시니."' },
      {
        speaker: 'narration',
        text:
          '부러움이었다. 아버지를 여읜 왕을 부러워하는, 뒤틀린 부러움.\n' +
          '둘 다 아버지 때문에 여기 묶여 있었다. 없어서, 그리고 너무 커서.',
      },
    ],
  },

  // ── ② 충신 딸 — 곁을 지킴, 신중함, "시녀장 사촌"(flag 없음) ──
  {
    id: 'scene-bond-loyalist-beside',
    lines: [
      {
        speaker: 'narration',
        text: '회의가 길어진 밤이었다. 다들 물러갔는데, 그 애만 문 안쪽에 조용히 남아 있었다.',
      },
      { speaker: 'loyalist', text: '"…등을 켜 두겠습니다. 아직 문서가 남으셨으니." ' },
      {
        speaker: 'narration',
        text: '시키지 않은 일이었다. 그 애는 늘 이렇게, 시키기 전에 곁을 지켰다.',
      },
      { speaker: 'loyalist', text: '"제 사촌이 왕대비궁 시녀장입니다. 필요하시면… 아닙니다. 나중에요."' },
      {
        speaker: 'narration',
        text:
          '무언가를 말하려다 삼켰다. {왕}도 캐묻지 않았다.\n' +
          '그저, 이 궁에서 저 애가 어디까지 닿아 있는지를 처음으로 가늠해 보았다.',
      },
    ],
  },
  {
    id: 'scene-bond-loyalist-caution',
    lines: [
      {
        speaker: 'narration',
        text: '{왕}이 섭정공의 장부를 몰래 들춰 보려 했다. 그 애가 소맷자락을 잡았다.',
      },
      { speaker: 'loyalist', text: '"안 됩니다. 지금은 아닙니다, 전하."' },
      {
        speaker: 'narration',
        text: '처음으로 {왕}을 말린 것이었다. 손이 떨렸지만 놓지 않았다.',
      },
      { speaker: 'loyalist', text: '"…한 번 들키시면, 다신 기회가 없습니다. 저는 그게 무섭습니다."' },
      {
        speaker: 'narration',
        text: '겁이 아니라 신중함이었다. 그 애는 {왕}보다 이 궁의 무서움을 먼저 알고 있었다.',
      },
    ],
  },
  {
    id: 'scene-bond-loyalist-father',
    lines: [
      {
        speaker: 'narration',
        text: '아버지 기일에 다녀온 그 애의 눈이 붉었다. 묻지 않았는데 먼저 말했다.',
      },
      { speaker: 'loyalist', text: '"제 아버지도 그 무렵 가셨습니다. 전하의 아버님과… 같은 해에요."' },
      {
        speaker: 'narration',
        text: '{왕}은 처음 알았다. 이 애도 같은 시기에 아버지를 잃었다는 것을.',
      },
      { speaker: 'loyalist', text: '"우연이겠지요. …우연이어야 할 텐데요."' },
      {
        speaker: 'narration',
        text:
          '왕대비궁 쪽으로 잠깐 눈이 갔다가, 그 애는 서둘러 말을 거뒀다.\n' +
          '무언가 아는 눈이었다. 하지만 아직은, 아직은 아무 말도 하지 않았다.',
      },
    ],
  },

  // ── ⑤ 무관 가문 자녀 — 문 밖, 격을 허묾, "아직" ───────────
  {
    id: 'scene-bond-commander-outside',
    lines: [
      {
        speaker: 'narration',
        text: '처소를 나설 때마다 그는 문 밖에 있었다. 눈이 마주치면 시선을 내리고, 한 걸음 물러섰다.',
      },
      { speaker: 'commander', text: '"안이 아니라 밖을 지키는 것이 제 소임입니다, 전하."' },
      {
        speaker: 'narration',
        text:
          '{왕}이 들어오라 해도 그는 문지방 앞에서 멈췄다. 모시는 것과 곁에 있는 것은 다르다는 듯이.\n' +
          '아직은, 문 하나가 둘 사이에 있었다.',
      },
    ],
  },
  {
    id: 'scene-bond-commander-threshold',
    lines: [
      {
        speaker: 'narration',
        text: '비 오는 새벽, 문 밖의 무관이 젖은 채로 서 있었다. 늘 그렇듯 안으로는 한 발도 들이지 않고.',
      },
      { speaker: 'commander', text: '"괘념치 마십시오. 이 자리가 제 자리입니다, 전하."' },
      {
        speaker: 'narration',
        text: '{왕}은 처음으로 그를 직책이 아니라 이름으로 불렀다. 그가 잠깐 굳었다.',
      },
      { speaker: 'commander', text: '"…이름으로 불러 주신 것은, 아버지 이후 처음입니다."' },
      {
        speaker: 'narration',
        text:
          '그래도 그는 문지방을 넘지 않았다. 격을 지키는 것이 그의 충성이었다.\n' +
          '왕이 격을 허물어도, 그는 아직 제자리에 서 있었다.',
      },
    ],
  },
  {
    id: 'scene-bond-commander-restraint',
    lines: [
      {
        speaker: 'narration',
        text: '훈련이 끝난 뒤, 무관이 어린 병사에게 검을 잡는 법을 낮게 일러 주고 있었다.',
      },
      {
        speaker: 'narration',
        text: '{왕}을 보자 그는 곧 자세를 고쳤다. 방금의 부드러움이 순식간에 절도 아래로 들어갔다.',
      },
      { speaker: 'commander', text: '"흐트러진 꼴을 보이셨습니다. 송구합니다, 전하."' },
      { speaker: 'commander', text: '"…이 가문은 무를 것을 안으로 넣어 두는 법부터 배웁니다."' },
      {
        speaker: 'narration',
        text:
          '단단한 절도였다. 다만 그 단단함 아래 무엇이 눌려 있는지, {왕}은 아주 잠깐 보았다.\n' +
          '아직 넘지 않은 문지방 안쪽에.',
      },
    ],
  },

  // ── ③ 제국 왕족 — 재방문, 얕봄 흔들림 (romance 아님, "반쯤은") ──
  {
    id: 'scene-bond-prince-revisit',
    lines: [
      {
        speaker: 'narration',
        text: '사냥철에 맞춰 제국의 왕족이 또 예고 없이 들었다. 아무도 부르지 않았는데.',
      },
      { speaker: 'prince', text: '"아직 안 망했네요? 솔직히 반쯤은 구경 왔는데."' },
      {
        speaker: 'narration',
        text: '그는 지난번보다 오래 머물렀다. 구경거리치고는, 발길이 잦았다.',
      },
      { speaker: 'prince', text: '"…뭐, 나머지 반은. 어떻게 버티나 궁금해서요. 그건 인정."' },
      {
        speaker: 'narration',
        text: '얕봄이 반으로 줄어 있었다. 나머지 반은, 아직 얕봄이라 부르기 애매한 무언가였다.',
      },
    ],
  },
  {
    id: 'scene-bond-prince-spar',
    lines: [
      {
        speaker: 'narration',
        text: '왕족이 연무장을 기웃거리다, 처음으로 정치가 아닌 것을 물었다.',
      },
      { speaker: 'prince', text: '"그 진형, 누구한테 배웠어요? 제국 교본이랑 다르던데."' },
      {
        speaker: 'narration',
        text: '{왕}이 답하자, 그는 팔짱을 풀고 되물었다. 이번엔 값을 매기는 눈이 아니었다.',
      },
      { speaker: 'prince', text: '"의외네요. …이 나라, 사람은 제대로 키우는 모양이에요."' },
      {
        speaker: 'narration',
        text: '처음으로 이 나라를 구경거리가 아니라 상대로 보는 말이었다. 반쯤은, 동등하게.',
      },
    ],
  },
]
