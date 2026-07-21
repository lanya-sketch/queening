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
    anchor: 'nation',
    match: (r) => has(r, 'military_king_led'),
    priority: 35,
    lines: [line('군은 {왕}의 뒤에 섰다. 앞이 아니라 뒤에 — 그 차이를 지키는 데 나라의 명운이 걸려 있었다.')],
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
    anchor: 'nation',
    match: (r) => has(r, 'house_commons_dissolved'),
    priority: 20,
    lines: [line('하원은 해산되었다. 질서는 돌아왔지만, 돌아오지 못한 목소리도 있었다.')],
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
      '그 아들까지 남기지 않았다. {왕}은 그것을 뒷일이라 불렀고, 뒷일에는 이름이 없었다.',
    )],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_executed'),
    priority: 35,
    lines: [line('섭정공의 아들은 역적의 핏줄로 처형되었다. 아버지의 죄가 아들에게로 흘렀다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'heir_spared') && (mod(r, '정복의 전리품') || mod(r, '연인의 희생')),
    priority: 35,
    lines: [line('섭정공의 아들은 살아남았다. {왕}은 죄를 아버지에게만 물었다 — 그 관용이 훗날 무엇이 될지는 몰랐다.')],
  },
  {
    anchor: 'purge',
    match: (r) => has(r, 'loyalist_scapegoat'),
    priority: 30,
    lines: [line('충신 가문의 딸은 급진의 상징으로 몰려 희생되었다. 늘 옳은 편에 섰던 대가였다.')],
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
    lines: [line('섭정공의 아들은 살아남았다. 역적의 핏줄이 남았다는 사실을, {왕}은 안고 가기로 했다.')],
  },
  {
    anchor: 'purge',
    match: (r) => mod(r, '고독한 옥좌'),
    priority: 45,
    lines: [line('옥좌 곁에는 아무도 남지 않았다. {왕}이 하나씩 치웠고, 마지막에는 정말로 혼자였다.')],
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
