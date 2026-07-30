import { CHARACTERS } from '../characters'
import type { EndingInsert, EndingResult, SceneLine } from '../../types/game'

/**
 * 엔딩 삽입 문단 (M3-2).
 *
 * 골격의 anchor 자리에 조건부로 끼워진다. 전용 삽입은 priority 를 높여
 * 일반 삽입을 이긴다. anchor 에 맞는 삽입이 없으면 그 자리는 비워진다(정상).
 *
 * ★ 전용은 셋만 — 명세의 "너무 많으면 조립이 무너진다"를 지킨다:
 *   1) 모후주모 + 못함 (A빌드 비극)
 *   2) blood_oath_given vs seized (① 관계 뉘앙스)
 *   3) queen_poison_averted (배드 회피 흔적)
 */

const has = (r: EndingResult, flag: string) => r.nationFlags.includes(flag)
const mod = (r: EndingResult, m: string) => r.modifiers.includes(m)

const line = (text: string): SceneLine => ({ speaker: 'narration', text })

export const ENDING_INSERTS: EndingInsert[] = [
  // ─────────────────────────────────────────── @truth
  {
    anchor: 'truth',
    match: (r) => r.truthLevel === '모후주모',
    priority: 10,
    lines: [line(
      '그는 아버지를 죽인 손과, 그 손을 움직인 사람을 안다.\n' +
      '알아서는 안 될 것까지 알아버린 채로 어른이 되었다.',
    )],
  },
  {
    anchor: 'truth',
    match: (r) => r.truthLevel === '섭정관여',
    priority: 10,
    lines: [line(
      '선왕이 병으로 죽지 않았다는 것, 그 뒤를 덮은 손이 누구였는지까지는 왔다.\n' +
      '그 위에 누가 있었는지는 끝내 닿지 못했다.',
    )],
  },
  {
    anchor: 'truth',
    match: (r) => r.truthLevel === '모름',
    priority: 10,
    lines: [line(
      '아버지의 죽음은 여전히 병사로 기록되어 있다.\n' +
      '{왕}은 통치를 배웠지만, 자신이 왜 이 자리에 앉았는지는 끝내 알지 못했다.',
    )],
  },

  // ─────────────────────────────────────────── @disposal (폭군은 골격이 처리)
  {
    // ★ [4] 정당 명분이 연판장이면 — 과거의 죄가 아니라 현재의 반역을 물증으로. 가장 직접적.
    anchor: 'disposal',
    match: (r) => r.disposal === '정당' && has(r, 'collective_treason'),
    priority: 15,
    lines: [line(
      '섭정공은 심판을 받았다. 그를 친 것은 오래된 죄가 아니라 지금 이 순간의 반역이었다.' +
      '여러 이름이 연명된 종이 한 장이, 말보다 확실했다.\n' +
      '궁정의 누구도 그것을 찬탈이라 부르지 못했다.',
    )],
  },
  {
    // ★ [4] 정당 명분이 반란 진압이면 — 현행범.
    anchor: 'disposal',
    match: (r) => r.disposal === '정당' && has(r, 'rebellion_crushed'),
    priority: 14,
    lines: [line(
      '섭정공은 심판을 받았다. 칼을 든 그 밤이 곧 명분이었다. 현행범을 치는 데에 다른 증거는 ' +
      '필요치 않았다.',
    )],
  },
  {
    anchor: 'disposal',
    match: (r) => r.disposal === '정당',
    priority: 10,
    lines: [line(
      '섭정공은 심판을 받았다. 증거가 있었고, 그래서 그것은 찬탈이 아니라 정의였다.\n' +
      '궁정의 누구도 그 이름을 다르게 부르지 못했다.',
    )],
  },
  {
    anchor: 'disposal',
    match: (r) => r.disposal === '회유',
    priority: 10,
    lines: [line(
      '섭정공은 끝내 {왕}의 손을 잡았다. 그가 무엇을 했는지 알면서도, 혹은 알기 때문에.\n' +
      '두 사람은 그날 이후 서로를 숙부와 조카라 부르지 않았다.',
    )],
  },
  {
    anchor: 'disposal',
    match: (r) => r.disposal === '못함',
    priority: 5,
    lines: [line(
      '섭정공은 여전히 그 자리에 있다. {왕}은 그를 어쩌지 못했고, 그도 그것을 알았다.',
    )],
  },

  // ─────────────────────────────────────────── @special (전용 셋)
  {
    // ★ A빌드 비극 — 진실을 다 알았으나 힘이 없어 심판하지 못한 왕.
    //   '못함' disposal 삽입을 이긴다(priority↑). 진실을 감정색으로 내린 무게.
    anchor: 'special',
    match: (r) => r.truthLevel === '모후주모' && r.disposal === '못함',
    priority: 50,
    lines: [line(
      '다 알고 있었다. 누가 찻잔에 무엇을 탔는지, 누가 그것을 덮었는지, 전부.\n' +
      '그러나 아는 것과 할 수 있는 것은 달랐다. {왕}은 진실을 손에 쥐고도\n' +
      '그것을 내려칠 힘이 없었고, 그래서 아무 일도 일어나지 않았다.\n' +
      '가장 무거운 침묵은 모르는 자의 것이 아니라 아는 자의 것이다.',
    )],
  },
  {
    // 배드를 면한 흔적 — 조용한 한 문단.
    anchor: 'special',
    match: (r) => mod(r, '독을 알아챘다'),
    priority: 20,
    lines: [line(
      '한 번, 찻잔을 앞에 두고 손이 멈춘 밤이 있었다. {왕}은 그날 그것을 마시지 않았고,\n' +
      '그 작은 멈춤이 이후의 모든 것을 갈라놓았다는 것은 나중에야 알게 되었다.',
    )],
  },

  // ─────────────────────────────────────────── @romance
  // ★ 하드 배타성: @romance 는 **확정된 사람**에게만 뜬다(r.romance 는 확정값).
  //   given/seized 의 나머지 갈래(강탈+처형/관용)는 로맨스가 아니므로 @purge 가 맡는다.
  //   여기서 갈리는 건 "확정했는데 그가 아버지까지 스스로 판(연인의 희생)" 경우다.
  {
    anchor: 'romance',
    match: (r) => r.romance === 'heir' && mod(r, '연인의 희생'),
    priority: 30,
    lines: [line(
      '곁에는 아버지를 스스로 판 사람이 있었다. {그:heir}는 {왕}을 위해 제 손으로\n' +
      '가장 무거운 것을 내려놓았고, {왕}은 그 무게를 평생 갚아야 한다는 것을 알았다.',
    )],
  },
  {
    anchor: 'romance',
    match: (r) => r.romance === 'heir',
    priority: 10,
    lines: [line('곁에는, 정략으로 붙여졌다가 정략이 아닌 것으로 남은 사람이 있었다.')],
  },
  ...otherRomanceInserts(),
  {
    // 철인통치 — 아무도 곁에 두지 않은 선택.
    anchor: 'romance',
    match: (r) => r.romance === 'none',
    priority: 10,
    lines: [line(
      '곁에 선 사람은 없었다. {왕}은 아무도 들이지 않았고,\n' +
      '그것이 약함이 아니라 선택이었다는 것을 궁정이 이해하는 데에는 오랜 시간이 걸렸다.',
    )],
  },
  {
    anchor: 'romance',
    match: (r) => mod(r, '복수의 인연'),
    priority: 5,
    lines: [line('그리고 {왕}의 마음이 한 사람에게만 머문 것은 아니었다.')],
  },

  // ─────────────────────────────────────────── @nation (복수 삽입 허용)
  {
    anchor: 'nation',
    match: (r) => has(r, 'union_equal'),
    priority: 40,
    lines: [line('제국과는 대등한 자리에서 손을 잡았다. 삼켜지지 않았고, 삼키지도 않았다.')],
  },
  {
    // ③ 정복 — 로맨스였다면 배신, 아니었다면 무감정.
    anchor: 'nation',
    match: (r) => has(r, 'prince_conquered') && mod(r, '사랑을 삼킴'),
    priority: 42,
    lines: [line(
      '{왕}은 그의 나라를 삼켰다. 한때 두 왕관을 나눠 쓰자던 사람의 땅을, 군으로 밟고 지도에 그렸다.\n' +
      '그의 마음이 어떻게 되었는지는 지도에 적히지 않았다. 사랑이었던 것을 {왕}은 스스로 정복했다.',
    )],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'prince_conquered'),
    priority: 41,
    lines: [line(
      '{왕}은 제국의 왕족이 다스리던 땅을 삼켰다. 감정도 명분도 없이, 삼킬 수 있어서 삼켰다.\n' +
      '삼켜지던 나라가 삼키는 나라가 되었다. 그것을 참칭이라 부르는 사람은 이제 없었다.',
    )],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'military_king_led'),
    priority: 35,
    lines: [line('군은 {왕}의 뒤에 섰다. 앞이 아니라 뒤에, 그 차이를 지키는 데 나라의 명운이 걸려 있었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'scroll_offered'),
    priority: 30,
    lines: [line('교단은 {왕}의 이름을 축문에 올렸다. 하늘이 세운 왕이라는 말이 저잣거리에 먼저 닿았다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'house_commons_defended'),
    priority: 20,
    lines: [line('하원은 살아남았다. {왕}이 그것을 지켰고, 백성은 그 사실을 오래 기억했다.')],
  },
  {
    // ★ [3] 반란 진압 — 친정 후 밀려난 섭정공의 반란을 막아 낸 왕.
    anchor: 'nation',
    match: (r) => has(r, 'rebellion_crushed'),
    priority: 38,
    lines: [line('밀려난 자는 마지막으로 칼을 들었고, {왕}은 그 밤을 넘겼다. 반란을 진압한 왕, 옥좌는 이제 누구의 의심도 사지 않았다.')],
  },
  {
    // ★ [3] 섭정공 명예 퇴장 — 담판으로 피 없이 정리한 왕(협상의 마무리).
    anchor: 'nation',
    match: (r) => has(r, 'regent_retired'),
    priority: 39,
    lines: [line('섭정공은 대공의 작위를 받아 스스로 인장을 내려놓았다. 피 한 방울 없이 물러난 섭정, {왕}은 힘이 아니라 협상으로 옥좌를 정리한 군주로 남았다.')],
  },
  {
    // ★ [4] 공표 — 피 없이 판을 뒤집은 왕. 왕은 피해자이자 정당한 통치자로.
    anchor: 'nation',
    match: (r) => has(r, 'treason_denounced'),
    priority: 41,
    lines: [line('{왕}은 아무도 죽이지 않고, 다만 온 나라에 알렸다. 왕을 해하려는 모의가 있었노라고. 왕은 피해자이자 정당한 통치자가 되었고, 연루된 자들은 스스로 명분을 잃었다. 피 없이 판을 뒤집은 왕.')],
  },
  {
    // ★ [4] 대숙청 — 연명한 이름을 모두 친 왕. 두려움으로 하나가 된 나라.
    anchor: 'nation',
    match: (r) => has(r, 'nobles_purged_all'),
    priority: 40,
    lines: [line('연판장에 적힌 이름은 하나도 남지 않았다. 오래된 가문이 하루아침에 무너졌고, 나라는 하나의 손아래 모였다. 두려움으로. 대숙청의 이름은 오래 기억될 것이다.')],
  },
  {
    // ★ [4] 모후 처형 — 여론이 나쁠 때: 백성이 등을 돌린 처형(더 무겁게).
    anchor: 'nation',
    match: (r) => has(r, 'queen_executed') && mod(r, '민심을 잃은 처형'),
    priority: 38,
    lines: [line('{왕}은 선왕을 죽인 자를 벴다. 그 자가 어머니였음에도. 그러나 백성은 법이 아니라 마음으로 읽었고, 어머니를 벤 왕의 이름 뒤에는 오래도록 그림자가 따랐다.')],
  },
  {
    // ★ [4] 모후 처형 — 여론이 받쳐 감당한 처형.
    anchor: 'nation',
    match: (r) => has(r, 'queen_executed'),
    priority: 37,
    lines: [line('{왕}은 선왕을 죽인 자를 벴다. 그 자가 어머니였음에도. 백성은 왕의 손을 이해했으나, {왕} 자신은 그 밤을 이해할 수 있었을까.')],
  },
  {
    // ★ [4] 모후 폐탑 유폐 — 죽이지도 용서하지도 않은 제3의 길.
    anchor: 'nation',
    match: (r) => has(r, 'queen_confined'),
    priority: 37,
    lines: [line('{왕}은 어머니를 죽이지 않았다. 다만 다시는 나올 수 없는 탑에 들였다. 죽이지도 용서하지도 않은, 가장 왕다웠으나 가장 외로웠던 선택. 그 탑의 창에 불이 켜질 때마다, 왕은 무엇을 떠올렸을까.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'house_commons_dissolved'),
    priority: 20,
    lines: [line('하원은 해산되었다. 질서는 돌아왔지만, 돌아오지 못한 목소리도 있었다.')],
  },
  // ── 후반 현안(17~19세)의 결말 서술. 각 쌍은 배타적이라 한 회차엔 최대 하나씩만 뜬다.
  {
    anchor: 'nation',
    match: (r) => has(r, 'empire_defied'),
    priority: 34,
    lines: [line('제국 앞에서 {왕}은 무릎을 꿇지 않았다. 작은 나라가 큰 나라의 눈을 마주 본 것을, 국경 너머까지 오래 이야기했다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'empire_submitted'),
    priority: 19,
    lines: [line('책봉장에는 {왕}의 이름이 있었다. 나라는 지켜졌으나, 그 위에는 이제 다른 왕관이 있었다.')],
  },
  // ★ [9-B] 신성국 — 성물이 있으면 개혁까지 지킨 왕, 없으면 개혁을 교회에 내준 왕.
  {
    anchor: 'nation',
    match: (r) => has(r, 'holy_kingdom') && has(r, 'legitimacy_sacred'),
    priority: 37,
    lines: [line('교황이 몸소 관을 씌웠다. 제국을 거치지 않고, 피 없이, 이 나라는 하늘 아래 독립했다. 손에 든 성물이 교회의 목소리를 눌렀으니, {왕}은 관을 받고도 아홉 해에 걸쳐 그린 개혁을 하나도 내주지 않았다. 관도, 나라도, 온전히 그의 것이었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'holy_kingdom') && !has(r, 'legitimacy_sacred'),
    priority: 36,
    lines: [line('교황이 관을 씌웠고, 전쟁 없이 나라는 독립했다. 그러나 하늘의 이름을 빌린 값은 노선이었다 — 지키려던 개혁은 교회의 뜻 아래 되돌려졌다. {왕}은 관을 얻고, 아버지가 가리킨 길을 잃었다.')],
  },
  // ★ [9-B/C1] 참칭 선언 — 전쟁의 설정(setup). 결과는 아래 전쟁 삽입이 이어 받는다(priority 낮아 뒤에 온다).
  {
    anchor: 'nation',
    match: (r) => has(r, 'empire_claimed'),
    priority: 38,
    lines: [line('스스로 제국의 황제를 칭한 것은, 무너지는 상국을 부정하고 그 자리를 대신하겠다는 선언이었다. 제국이 가만히 있을 리 없었다 — 국경 너머에서 군대가 모였다.')],
  },
  // ★ [9-C1] 참칭 전쟁 결과 — 명분이 "어떤 황제냐"의 결을 가른다. 승리 삽입은 {황제} 토큰(황제/여제)을 쓴다.
  {
    // 하늘이 인정한 황제 — 성물(legitimacy_sacred)이 승리에 정통성을 입힌다.
    anchor: 'nation',
    match: (r) => has(r, 'war_won') && has(r, 'legitimacy_sacred'),
    priority: 37.3,
    lines: [line('전쟁은 길고 참혹했으나, 진창에 꺾인 것은 제국의 깃발이었다. {황제}의 손에 든 성물이 하늘의 인정을 증거했으니, 사람들은 이 승리를 우연이라 부르지 않았다. 하늘이 인정한 황제 — 무너진 제국의 자리에 새 정통이 섰다.')],
  },
  {
    // 교황이 관을 씌운 황제 — 성물은 없으나 교권(church_support)이 승리에 축복을 얹는다.
    anchor: 'nation',
    match: (r) => has(r, 'war_won') && !has(r, 'legitimacy_sacred') && has(r, 'church_support'),
    priority: 37.2,
    lines: [line('전쟁은 참혹했으나 끝내 제국의 깃발이 꺾였다. 교회가 제국을 파문하고 {황제}의 편에 섰으니, 새 황관에는 교황의 축복이 얹혔다. 교황이 관을 씌운 황제 — 칼로 얻은 자리를, 하늘의 이름이 덮었다.')],
  },
  {
    // 칼로 선 황제 — 명분 없이 국력만으로 압도해 이겼다. 가장 순수하게 힘의 승리.
    anchor: 'nation',
    match: (r) => has(r, 'war_won') && !has(r, 'legitimacy_sacred') && !has(r, 'church_support'),
    priority: 37.1,
    lines: [line('명분은 없었다. 성물도, 교회의 축복도. 있는 것은 오직 국력뿐이었고, 그것으로 충분했다. {황제}는 압도적인 힘만으로 제국을 꺾고 그 자리에 섰다. 칼로 선 황제 — 하늘도 교회도 인정하지 않았으나, 아무도 그 칼 앞에 서지 못했다.')],
  },
  {
    // 패배 — 다 걸고 잃었다(tier 는 배드:참칭실패). {왕}(왕/여왕) — 끝내 황제가 되지 못했으므로.
    anchor: 'nation',
    match: (r) => has(r, 'war_lost'),
    priority: 37,
    lines: [line('국경에서 {왕}의 군대가 부서졌다. 스스로 칭한 관을 지킬 명분도, 세력도 되지 못했다. 삼켜진 것이 아니라, 다 걸고 도전했다가 무너진 것이었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'crown_centralized'),
    priority: 25,
    lines: [line('열두 조각이던 나라가 하나가 되었다. 왕관이 처음으로 나라 전체를 제 손에 쥐었고, 그 무게는 온전히 {왕}의 것이었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'lords_restored'),
    priority: 14,
    lines: [line('봉토의 권리는 지켜졌다. {왕}은 영주들 위의 영주로 남았고, 나라는 여전히 열둘의 허락 위에 앉아 있었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'late_king_reform'),
    priority: 28,
    lines: [line('선왕이 손대다 만 개혁을, 아들이 마저 그렸다. 백성에 기댄 나라, 아버지가 가리키기만 했던 그 나라가, 비로소 형태를 얻었다.')],
  },
  {
    anchor: 'nation',
    match: (r) => has(r, 'late_king_frontier'),
    priority: 13,
    lines: [line('{왕}은 변경을 다시 세우고 아버지의 도박을 접었다. 나라는 단단한 옛 모양으로 돌아갔다. 안전한, 그러나 아무것도 바꾸지 않은 모양으로.')],
  },
  {
    anchor: 'nation',
    match: (r) => mod(r, '불신의 공치'),
    priority: 15,
    lines: [line('동맹은 맺어졌으나 신뢰는 아니었다. 두 사람은 같은 편에 서서 서로의 손을 감시했다.')],
  },

  // ─────────────────────────────────────────── @purge (숙청/관용, 복수)
  // ① — given/seized × executed/spared 로 갈린다(명세의 세 갈래).
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_executed') && mod(r, '정복의 전리품'),
    priority: 40,
    lines: [line(
      '섭정공의 핏줄은 아버지와 함께 정리되었다. 강탈한 증거로 아버지를 치고,\n' +
      '그 {자식:heir}까지 남기지 않았다. {왕}은 그것을 뒷일이라 불렀고, 뒷일에는 이름이 없었다.',
    )],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_executed'),
    priority: 35,
    lines: [line('섭정공의 {자식:heir}은 역적의 핏줄로 처형되었다. 아버지의 죄가 {자식:heir}에게로 흘렀다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_spared') && (mod(r, '정복의 전리품') || mod(r, '연인의 희생')),
    priority: 35,
    lines: [line('섭정공의 {자식:heir}은 살아남았다. {왕}은 죄를 아버지에게만 물었다. 그 관용이 훗날 무엇이 될지는 몰랐다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'loyalist_scapegoat'),
    priority: 30,
    lines: [line('충신 가문의 {자식:loyalist}은 급진의 상징으로 몰려 희생되었다. 늘 옳은 편에 섰던 대가였다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'hero_isolated'),
    priority: 30,
    lines: [line('평민 영웅은 작위를 받고 어디에도 속하지 못하게 되었다. 포상이라는 이름의 두 번째 족쇄였다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'commander_purged'),
    priority: 30,
    lines: [line('친위 지휘관은 반역 혐의로 청산되었다. 아홉 대를 지킨 자리가, {왕}의 손에 무너졌다.')],
  },
  // ── 측실 — 죽임·관용 옆의 또 다른 잔혹함. 소유이지 사랑이 아니다.
  //    ★ ①②④ 도 플레이스홀더가 아니라 실제 문장이다(개요를 한 문장으로 압축).
  {
    anchor: 'purge',
    match: (r) => has(r, 'commander_concubine'),
    priority: 32,
    lines: [line(
      '친위 지휘관은 가문의 검을 왕실에 바치고 곁에 남았다. 아홉 대를 지킨 검은 창고에 눕고,\n' +
      '그 사람은 사랑도 자유도 아닌 자리에 묶였다. {왕}은 그것을 곁이라 불렀다.',
    )],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_concubine'),
    priority: 32,
    lines: [line(
      '섭정공의 {자식:heir}은 가문이 지워진 채 왕실에 편입되었다. 성도 아버지도 없이,\n' +
      '오직 {왕}의 소유로만 남았다. 벗으려던 그늘째로 삼켜져서.',
    )],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'loyalist_concubine'),
    priority: 32,
    lines: [line(
      '충신 가문의 {자식:loyalist}은 왕실에 들었다. 늘 곁에 있던 자리가, 스스로 남을 사람을 굳이 가둔 자리가 되었다.',
    )],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'hero_concubine'),
    priority: 32,
    lines: [line(
      '평민 영웅은 왕실에 묶였고, 마왕을 벤 검은 알현실 벽에 걸렸다.\n' +
      '검도 사람도, 이제 아무것도 베지 않는 장식이 되었다.',
    )],
  },

  // 관용의 대가 — 살려둔 불씨. 숙청과 겹치지 않을 때만 조용히 뜬다.
  {
    anchor: 'purge',
    match: (r) => has(r, 'commander_spared'),
    priority: 15,
    lines: [line('오랜 무관 가문은 건드리지 않았다. 갈아치울 힘은 그대로 남았고, {왕}은 그 위험을 안고 갔다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_spared') && !mod(r, '정복의 전리품') && !mod(r, '연인의 희생'),
    priority: 15,
    lines: [line('섭정공의 {자식:heir}은 살아남았다. 역적의 핏줄이 남았다는 사실을, {왕}은 안고 가기로 했다.')],
  },
  {
    anchor: 'purge',
    match: (r) => mod(r, '고독한 옥좌'),
    priority: 45,
    lines: [line('옥좌 곁에는 아무도 남지 않았다. {왕}이 하나씩 치웠고, 마지막에는 정말로 혼자였다.')],
  },
  {
    // 고독한 옥좌의 대비 — 혼자가 아니라 소유물로 채운 옥좌.
    anchor: 'purge',
    match: (r) => mod(r, '소유의 옥좌'),
    priority: 44,
    lines: [line('옥좌 곁에는 사람이 있었다. 다만 그들은 곁에 선 것이 아니라, 곁에 놓인 것이었다.')],
  },

  // ─────────────────────────────────────────── @closing (수식)
  {
    anchor: 'closing',
    match: (r) => mod(r, '허수아비:완전'),
    priority: 10,
    lines: [line('{왕}의 이름으로 나간 문서는 아홉 해 동안 단 한 건도 없었다.')],
  },
]

/** ②③④⑤ 의 @romance 삽입. heir 는 위에서 뉘앙스까지 따로 다룬다. */
function otherRomanceInserts(): EndingInsert[] {
  const texts: Record<string, string> = {
    loyalist: '곁에는 어릴 적부터 곁을 지킨 사람이 있었다. 한 번도 먼저 떠난 적이 없는 사람이었다.',
    prince: '곁에는 언제든 떠날 수 있었던 사람이 있었다. 그가 매번 다시 돌아온 것은 그래서 선택이었다.',
    commander: '곁에는 아홉 대째 왕의 뒤에 서 온 가문의 사람이 있었다. 이번 대에, 그 자리는 조금 가까워졌다.',
    hero: '곁에는 아무도 찾지 않던 병졸이 있었다. 세상이 버린 사람을 {왕}이 거두었고, 그 반대이기도 했다.',
  }
  return CHARACTERS.filter((c) => c.id !== 'heir').map((c) => ({
    anchor: 'romance' as const,
    match: (r: EndingResult) => r.romance === c.id,
    priority: 10,
    lines: [line(texts[c.id] ?? '곁에 선 사람이 있었다.')],
  }))
}
