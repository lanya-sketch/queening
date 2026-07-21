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
      '섭정공은 처분되었다. 그러나 그 아들이 남아 있다.\n' +
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
        id: 'spare',
        label: '아버지의 죄를 아들에게 묻지 않는다',
        setFlags: { heir_reckoned: true, heir_spared: true },
        hint: '역적의 아들이 살아남는다. 언젠가의 불씨로',
        resultText:
          '{왕}은 아들을 건드리지 않았다. 죄는 아버지의 것이지 핏줄의 것이 아니라고 했다.\n' +
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
      '충신 가문의 딸이 그 자리에 가장 알맞다고, 누군가 말한다.',
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
]
