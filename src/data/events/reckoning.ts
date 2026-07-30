import type { GameEvent } from '../../types/game'

/**
 * 청산의 시기 — 숙청/관용 선택 (하드 배타성 라운드).
 *
 * ★ 로맨스 안 한 캐릭터를 그 정체성으로 역이용하는 선택. 19~20세에 각자 다른
 *   정치 트리거로 흩어져 온다. 공통 전제는 `romance_confirmed:<id> = false` —
 *   확정한 사람은 대상이 아니다.
 *
 * ★ 관용(spared)도 선택이고 대가가 있다. 다만 **새 위협 이벤트는 만들지 않는다** —
 *   대가는 엔딩 서술 층으로만 반영한다(복잡도 억제). 여기서는 flag 까지.
 *
 * ★ 숙청 결과의 톤은 호감도 구간별 삽입(data/scenes)이 정한다. 이번 라운드는
 *   ⑤ 만 3구간(낮음/중간/높음) 전부, ①②④ 는 높은 구간만(조건부라 후속 확장).
 */
export const RECKONING_EVENTS: GameEvent[] = [
  {
    // ① 역적의 핏줄 — 혈서로 섭정을 친 그 흐름에 딸린다.
    id: 'heir-reckoning',
    title: '역적의 핏줄',
    text:
      '섭정공은 처분되었다. 그러나 그 {자식:heir}이 남아 있다.\n' +
      '역적의 핏줄을 그대로 두는 것은 위험하다고, 신하들이 입을 모은다.',
    condition: {
      minAge: 19,
      flags: { regent_disposed: true, 'romance_confirmed:heir': false, heir_reckoned: false },
    },
    choices: [
      {
        id: 'execute',
        label: '핏줄까지 정리한다',
        setFlags: { heir_reckoned: true, heir_executed: true },
        hint: '뒤탈은 없지만, 되돌릴 수도 없다',
        // 중립 한 줄. 감정 무게는 호감도 구간별 후속 씬(아래 AFTERMATH)이 맡는다.
        resultText: '명이 내려졌고, 그것은 실행되었다.',
      },
      {
        // ★ 측실 — 죽이지도 놓아주지도 않고 곁에 묶는다. 소유이지 사랑이 아니다.
        id: 'concubine',
        label: '가문을 지우고 곁에 묶는다',
        setFlags: { heir_reckoned: true, heir_concubine: true },
        hint: '섭정공 가문을 왕실에 편입시키고, 그 {자식:heir}을 소유로 남긴다',
        resultText: '섭정공 가문의 문장은 지워졌다. 그 {자식:heir}은 왕실의 사람으로 남았다.',
      },
      {
        id: 'spare',
        label: '아버지의 죄를 {자식:heir}에게 묻지 않는다',
        setFlags: { heir_reckoned: true, heir_spared: true },
        hint: '역적의 {자식:heir}이 살아남는다. 언젠가의 불씨로',
        resultText:
          '{왕}은 {자식:heir}을 건드리지 않았다. 죄는 아버지의 것이지 핏줄의 것이 아니라고 했다.\n' +
          '옳은 말이었다. 옳은 말이 늘 안전한 것은 아니다.',
      },
    ],
  },
  {
    // ② 급진 계승자 — 봉건 회귀(하원 해산) 노선에서 희생양으로.
    id: 'loyalist-reckoning',
    title: '급진의 상징',
    text:
      '옛 질서를 되세우는 데에는 본보기가 필요하다. 하원을 따르던 자들에게 겁을 줄 이름 하나.\n' +
      '충신 가문의 {자식:loyalist}이 그 자리에 가장 알맞다고, 누군가 말한다.',
    condition: {
      minAge: 19,
      flags: {
        house_commons_dissolved: true,
        'romance_confirmed:loyalist': false,
        loyalist_reckoned: false,
      },
    },
    choices: [
      {
        id: 'scapegoat',
        label: '희생양으로 세운다',
        setFlags: { loyalist_reckoned: true, loyalist_scapegoat: true },
        hint: '질서는 돌아오지만, 옳은 편에 섰던 사람을 친다',
        resultText: '이름이 명단에 올랐고, 본보기가 세워졌다.',
      },
      {
        id: 'concubine',
        label: '충성을 소유로 바꾼다',
        setFlags: { loyalist_reckoned: true, loyalist_concubine: true },
        hint: '늘 곁에 있던 사람을, 이제는 놓아주지 않는 방식으로 곁에 둔다',
        resultText: '충신 가문의 {자식:loyalist}은 왕실에 들었다. 곁에 있던 자리가, 갇힌 자리가 되었다.',
      },
      {
        id: 'spare',
        label: '본보기로 삼지 않는다',
        setFlags: { loyalist_reckoned: true, loyalist_spared: true },
        hint: '급진의 상징이 잔존한다',
        resultText:
          '{왕}은 그 이름을 명단에서 지웠다. 옳은 편에 섰던 사람을 본보기로 칠 수는 없었다.\n' +
          '그 관용이 훗날 어떤 목소리를 남길지는, 아직 알 수 없다.',
      },
    ],
  },
  {
    // ④ 작위로 고립 — 평민 세력이 커지는 것을 억제할 때.
    id: 'hero-reckoning',
    title: '포상이라는 족쇄',
    text:
      '평민 영웅의 이름이 저잣거리에서 커지고 있다. 그를 귀족으로 올리면,\n' +
      '그는 평민에게도 귀족에게도 속하지 못한 채 어디에도 없는 사람이 된다.',
    condition: {
      minAge: 19,
      flags: {
        hero_at_court: true,
        'romance_confirmed:hero': false,
        hero_reckoned: false,
      },
    },
    choices: [
      {
        id: 'isolate',
        label: '작위로 고립시킨다',
        setFlags: { hero_reckoned: true, hero_isolated: true },
        hint: '위협은 사라지지만, 다시 아무에게도 속하지 못하게 한다',
        resultText: '작위가 내려졌고, 그는 어디에도 속하지 못하게 되었다.',
      },
      {
        id: 'concubine',
        label: '왕실에 묶어 소유한다',
        setFlags: { hero_reckoned: true, hero_concubine: true },
        hint: '평민에서 떼어내 왕실에 들이고, 벤 검을 장식으로 걸어 둔다',
        resultText: '그는 왕실의 사람이 되었다. 마왕을 벤 검은 벽에 걸린 장식이 되었다.',
      },
      {
        id: 'spare',
        label: '그를 그대로 둔다',
        setFlags: { hero_reckoned: true, hero_spared: true },
        hint: '평민의 상징이 살아 있다',
        resultText:
          '{왕}은 그에게 아무 작위도 내리지 않았다. 그를 어디에도 가두지 않기로 했다.\n' +
          '세상이 버린 사람을 두 번 버리지는 않겠다는, 그런 고집이었다.',
      },
    ],
  },
  {
    // ⑤ 반역 혐의 — 군사노선을 안 탔는데 군부가 강할 때.
    id: 'commander-reckoning',
    title: '아홉 대의 자리',
    text:
      '무관 가문의 힘은 여전히 크다. {왕}이 그 힘을 자기 것으로 만들지 못한 채로.\n' +
      '언젠가 그 가문이 왕을 갈아치울 수 있다는 오랜 두려움이, 다시 고개를 든다.',
    condition: {
      minAge: 19,
      resources: { courtInfluence: { max: 60 } },
      flags: {
        'romance_confirmed:commander': false,
        military_route_open: false,
        commander_reckoned: false,
      },
    },
    choices: [
      {
        id: 'purge',
        label: '반역 혐의를 씌운다',
        setFlags: { commander_reckoned: true, commander_purged: true },
        hint: '위협을 끊지만, 아홉 대를 지킨 가문을 스스로 무너뜨린다',
        resultText: '혐의가 씌워졌고, 아홉 대의 자리가 무너졌다.',
      },
      {
        // ★ 결정적 씬("문 안으로 들어오라")을 뒤집는다 — 자발적 사랑 → 강제 소유.
        //   가문의 보검을 압수해 "네 힘도 내 것"으로. 감정 무게는 3구간 후일담이 맡는다.
        id: 'concubine',
        label: '가문의 검과 함께 곁에 묶는다',
        setFlags: { commander_reckoned: true, commander_concubine: true },
        hint: '가문 보검을 왕실이 거두고, 그 사람을 소유로 곁에 둔다',
        resultText: '아홉 대를 지켜온 검이 왕실 창고로 옮겨졌다. 그리고 그 사람도.',
      },
      {
        id: 'spare',
        label: '그 가문을 건드리지 않는다',
        setFlags: { commander_reckoned: true, commander_spared: true },
        hint: '갈아치울 힘이 그대로 남는다',
        resultText:
          '{왕}은 그 가문에 손을 대지 않았다. 두려움만으로 오랜 충신을 칠 수는 없었다.\n' +
          '그 힘이 방패로 남을지 칼로 돌아올지는, 시간이 정할 일이다.',
      },
    ],
  },

  // ── ★★ [9-C2] ③ 전쟁 처분 — 참칭 전쟁 승리(war_won)가 처분 조건을 만든다.
  //   여태 손댈 수 없던 외국 왕족이, 제국을 꺾은 순간 귀순자·포로·이미 굴복시킨 신하 중 하나가 된다.
  //   게이트 prince_in_play(turn.ts): 한 번도 안 얽힌 ③이면 이벤트 없음(익명의 적). 셋은 상호배타.
  //   ★ 측실 개념 재사용 안 함 — ③은 대등한 상대였다. 제후·인척·동맹 같은 정치 관계로만.
  //   {황제}/{폐하}: war_won 이면 emperor flag 가 서 있어 승리 호칭이 자연스럽다.
  {
    // A. 귀순 — 호감 45↑(공존선). 그가 제 황실이 아니라 새 제국을 택해 걸어 들어왔다.
    id: 'prince-war-defector',
    title: '국경을 넘어온 왕족',
    text:
      '제국이 꺾인 자리에서, 그가 왔다. 한때 사냥철마다 예고 없이 들르던 제국의 왕족이,\n' +
      '이번엔 제 나라의 깃발을 내려놓고 국경을 넘었다. 무너지는 제 황실이 아니라, ' +
      '새로 선 이 제국을 택한 것이다.\n' +
      '{폐하}는 정해야 한다 — 스스로 걸어 들어온 이 왕족을, 무엇으로 둘 것인가.',
    condition: {
      minAge: 19,
      flags: { war_won: true, prince_in_play: true, prince_conquered: false, prince_war_settled: false },
      affection: { prince: { min: 45 } },
    },
    insights: [
      {
        requires: { flags: { 'romance_confirmed:prince': true } },
        text:
          '그는 연인이었다. 두 왕관을 나눠 쓰자던 사람이, 이제 한쪽 왕관이 사라진 자리에 ' +
          '홀로 서서 {폐하}를 바라본다. 그의 나라는 없어졌고, 그는 여기 있다.',
      },
    ],
    choices: [
      {
        id: 'ally',
        label: '대등한 제후로 세운다',
        setFlags: { prince_war_settled: true, prince_fate_ally: true },
        hint: '혈통을 인정해 새 제국의 제후 왕으로 — 삼키지 않고 곁에 세운다',
        resultText:
          '{황제}는 그를 제후로 세웠다. 제국의 왕족이었던 이가, 새 제국의 신하 왕으로 제 땅을 다스린다.\n' +
          '삼킬 수도 있었으나 그러지 않았다. 스스로 걸어 들어온 이에게는, 자리로 답했다.',
      },
      {
        id: 'absorb',
        label: '황실 인척으로 들인다',
        setFlags: { prince_war_settled: true, prince_fate_absorbed: true },
        hint: '사라진 그의 혈통을 새 황실에 잇는다 — 두 왕가가 하나로',
        resultText:
          '{황제}는 그를 황실 안으로 들였다. 사라진 제 나라 대신, 새로 선 제국의 혈통 안에 그의 이름이 남았다.\n' +
          '정복이 아니라, 잇는 방식으로 두 왕가가 하나가 되었다.',
      },
    ],
  },
  {
    // B. 포로 — 호감 44↓. 끝까지 제 황실 편에 서서 싸우다 사로잡힌 적국 왕족.
    id: 'prince-war-captive',
    title: '사로잡힌 왕족',
    text:
      '제국이 꺾인 자리에서, 그가 끌려왔다. 한때 사냥철마다 들르던 제국의 왕족은 끝까지 ' +
      '제 황실 편에 서서 칼을 들었고, 국경의 전장에서 사로잡혔다.\n' +
      '이제 그는 적국의 왕족이자, {폐하}의 포로다.\n' +
      '{폐하}는 정해야 한다 — 이 사로잡힌 왕족을 어찌할 것인가.',
    condition: {
      minAge: 19,
      flags: { war_won: true, prince_in_play: true, prince_conquered: false, prince_war_settled: false },
      affection: { prince: { max: 44 } },
    },
    choices: [
      {
        id: 'execute',
        label: '처형한다',
        setFlags: { prince_war_settled: true, prince_fate_executed: true },
        hint: '적국 왕실의 마지막 불씨를 끈다 — 되돌릴 수 없다',
        resultText:
          '명이 내려졌고, 그것은 실행되었다. 제국 왕실의 이름 하나가, 새 제국의 첫 장에서 지워졌다.',
      },
      {
        id: 'spare',
        label: '유폐하되 살려 둔다',
        setFlags: { prince_war_settled: true, prince_fate_spared: true },
        hint: '죽이지 않되 힘을 거둔다 — 살아 있는 왕족은 언젠가의 불씨일 수도',
        resultText:
          '{황제}는 그를 죽이지 않았다. 다만 다시는 군을 들 수 없는 자리에 가두었다.\n' +
          '적국의 왕족을 살려 둔 것이 관용일지 화근일지는, 시간이 정할 일이다.',
      },
    ],
  },
  {
    // C. 정복됨 — 전쟁 전에 이미 그 땅을 삼켰다(prince_conquered). 굴복한 사람을 끝까지 볼 것인가 남길 것인가.
    id: 'prince-war-vassal',
    title: '이미 무릎 꿇은 자',
    text:
      '그의 나라는 이미 {황제}의 것이었다. 전쟁이 나기 전에, 그 땅을 삼켰다.\n' +
      '이제 제국마저 꺾인 자리에서, 한때 왕족이었던 그는 완전히 {황제}의 손안에 있다.\n' +
      '{폐하}는 정해야 한다 — 이미 굴복한 이 사람을, 끝까지 볼 것인가 남길 것인가.',
    condition: {
      minAge: 19,
      flags: { war_won: true, prince_conquered: true, prince_war_settled: false },
    },
    choices: [
      {
        id: 'annex',
        label: '완전히 병합해 끝을 본다',
        setFlags: { prince_war_settled: true, prince_fate_executed: true },
        hint: '혈통을 지운다 — 삼킨 땅에 옛 이름도 남기지 않는다',
        resultText:
          '{황제}는 끝을 보았다. 삼킨 땅에서 옛 왕가의 이름은 지워졌고, 그 자리엔 새 제국의 문장만 남았다.',
      },
      {
        id: 'keep',
        label: '신하 왕으로 존치한다',
        setFlags: { prince_war_settled: true, prince_fate_ally: true },
        hint: '굴복한 혈통을 남겨 신하 왕으로 둔다 — 지우지 않고 다스리게 한다',
        resultText:
          '{황제}는 그를 남겼다. 굴복한 왕족은 신하 왕이 되어, 제 옛 땅을 {황제}의 이름 아래 다스린다.\n' +
          '지울 수도 있었으나 남겼다. 다스리게 하는 것이, 지우는 것보다 오래가는 지배임을 알았다.',
      },
    ],
  },
]

/**
 * 숙청의 후일담 — 호감도 구간별 감정 무게 (하드 배타성 라운드).
 *
 * ★ 숙청 선택 직후가 아니라 **그 뒤**로 온다("며칠 뒤"). 숙청 flag + 호감도 구간을
 *   조건으로 하므로, 얼마나 가까웠던 사람을 쳤는지에 따라 다른 후일담이 뜬다.
 *   호감도는 숙청으로 바뀌지 않으므로 구간이 그대로 남는다.
 *
 * ★ (나)방침: ⑤ 만 3구간 전부, ①②④ 는 높은 구간만(중간·낮음은 후속 확장).
 *   높은 구간이 없으면 중립 결과 한 줄로 끝나므로 서사가 비지는 않는다.
 *
 * 우선순위는 청산 대역(reckoning) 바로 아래에 둔다 — 청산이 먼저, 후일담이 그 뒤.
 */
export const RECKONING_AFTERMATH: GameEvent[] = [
  // ── ⑤ 세 구간 (톤 확립)
  {
    id: 'commander-aftermath-high',
    title: '무너진 자리',
    sceneId: 'scene-aftermath-commander-high',
    text: '',
    condition: { flags: { commander_purged: true }, affection: { commander: { min: 70 } } },
  },
  {
    id: 'commander-aftermath-mid',
    title: '무너진 자리',
    sceneId: 'scene-aftermath-commander-mid',
    text: '',
    condition: {
      flags: { commander_purged: true },
      affection: { commander: { min: 40, max: 69 } },
    },
  },
  {
    id: 'commander-aftermath-low',
    title: '무너진 자리',
    sceneId: 'scene-aftermath-commander-low',
    text: '',
    condition: { flags: { commander_purged: true }, affection: { commander: { max: 39 } } },
  },

  // ── ①②④ 높은 구간만
  {
    id: 'heir-aftermath-high',
    title: '남은 이름',
    sceneId: 'scene-aftermath-heir-high',
    text: '',
    condition: { flags: { heir_executed: true }, affection: { heir: { min: 70 } } },
  },
  {
    id: 'loyalist-aftermath-high',
    title: '남은 이름',
    sceneId: 'scene-aftermath-loyalist-high',
    text: '',
    condition: { flags: { loyalist_scapegoat: true }, affection: { loyalist: { min: 70 } } },
  },
  {
    id: 'hero-aftermath-high',
    title: '남은 이름',
    sceneId: 'scene-aftermath-hero-high',
    text: '',
    condition: { flags: { hero_isolated: true }, affection: { hero: { min: 70 } } },
  },

  // ── 측실 후일담: ⑤ 3구간(대표) + ①②④ 높은 구간
  {
    id: 'commander-concubine-high',
    title: '창고로 간 검',
    sceneId: 'scene-concubine-commander-high',
    text: '',
    condition: { flags: { commander_concubine: true }, affection: { commander: { min: 70 } } },
  },
  {
    id: 'commander-concubine-mid',
    title: '창고로 간 검',
    sceneId: 'scene-concubine-commander-mid',
    text: '',
    condition: {
      flags: { commander_concubine: true },
      affection: { commander: { min: 40, max: 69 } },
    },
  },
  {
    id: 'commander-concubine-low',
    title: '창고로 간 검',
    sceneId: 'scene-concubine-commander-low',
    text: '',
    condition: { flags: { commander_concubine: true }, affection: { commander: { max: 39 } } },
  },
  {
    id: 'heir-concubine-high',
    title: '지워진 문장',
    sceneId: 'scene-concubine-heir-high',
    text: '',
    condition: { flags: { heir_concubine: true }, affection: { heir: { min: 70 } } },
  },
  {
    id: 'loyalist-concubine-high',
    title: '갇힌 자리',
    sceneId: 'scene-concubine-loyalist-high',
    text: '',
    condition: { flags: { loyalist_concubine: true }, affection: { loyalist: { min: 70 } } },
  },
  {
    id: 'hero-concubine-high',
    title: '걸린 검',
    sceneId: 'scene-concubine-hero-high',
    text: '',
    condition: { flags: { hero_concubine: true }, affection: { hero: { min: 70 } } },
  },
]
