import type { GameState } from '../types/game'

/**
 * 미스터리 기록 — 「기록」 화면의 데이터 (완주 피드백 2, 2-a).
 *
 * ★ 단서·진실은 game.flags 에 boolean 으로만 있고 표시 텍스트가 없다. 여기서 flag 에
 *   제목·"알아낸 것"·테마를 붙인다. **얻은 것만** 화면에 뜨고, 못 얻은 건 존재조차 안 보인다
 *   (스포일러 방지 — 예: 왕대비 테마는 왕대비 단서를 하나라도 얻어야 나타난다).
 *
 * ★ 방향 힌트는 flag 조합에서 파생하되 **정확한 수치를 말하지 않는다**(궁정처세 60 같은 것
 *   대신 "왕대비궁 쪽을 들여다볼 방법"). 무엇을 쫓는지 보이게 하되, 답을 대신 풀어 주진 않는다.
 */
export type MysteryTheme = '선왕의 죽음' | '섭정공' | '왕대비'
export const MYSTERY_THEMES: MysteryTheme[] = ['선왕의 죽음', '섭정공', '왕대비']

export interface MysteryEntry {
  flag: string
  theme: MysteryTheme
  kind: 'clue' | 'truth'
  title: string
  /** 그 단서/진실로 "알아낸 것" — 건조한 관찰 어투. */
  learned: string
}

export const MYSTERY_ENTRIES: MysteryEntry[] = [
  // ── 선왕의 죽음 ──
  {
    flag: 'clue_radical_edict', theme: '선왕의 죽음', kind: 'clue', title: '급진 칙령',
    learned: '선왕은 봉토 재분배·사병 해산·세습 폐지를 담은 칙령을 초하고 있었다. 귀족이 결코 받아들일 리 없는 것을.',
  },
  {
    flag: 'clue_sealed_report', theme: '선왕의 죽음', kind: 'clue', title: '봉인된 진료 기록',
    learned: '선왕의 마지막 진료 기록이 봉인됐다 — "왕의 심기를 헤아려"라는 명분으로, 섭정공의 손에.',
  },
  {
    flag: 'clue_witness_gone', theme: '선왕의 죽음', kind: 'clue', title: '사라진 증인',
    learned: '임종을 지킨 내관은 변경으로 유배됐고, 서른둘에 "병사"했다.',
  },
  {
    flag: 'clue_noble_ledger', theme: '선왕의 죽음', kind: 'clue', title: '귀족가 장부',
    learned: '붕어 반년 뒤 출처 모를 지출이 네 배로 뛰었다 — 전부 귀족파 가문으로. 누군가 사람을 샀다.',
  },

  // ── 섭정공 ──
  {
    flag: 'truth_regent_involved', theme: '섭정공', kind: 'truth', title: '덮인 밤',
    learned: '선왕은 병으로 죽지 않았다. 섭정공과 귀족파가 그 죽음을 덮었다.',
  },

  // ── 왕대비 ──
  {
    flag: 'clue_mother_calm', theme: '왕대비', kind: 'clue', title: '어머니의 한 박자',
    learned: '선왕을 입에 올렸을 때 왕대비의 한 박자 멈춤 — 미망인의 슬픔이 아니라, 고른 자의 슬픔이었다.',
  },
  {
    flag: 'clue_mother_letter', theme: '왕대비', kind: 'clue', title: '어머니의 서신',
    learned: '왕대비가 오라비(섭정공)에게 보낸 서신은 선왕이 죽기 정확히 두 달 전부터 시작된다. 그 전엔 한 통도 없었다.',
  },
  {
    flag: 'clue_apothecary', theme: '왕대비', kind: 'clue', title: '왕대비궁의 약재',
    learned: '선왕을 무너뜨린 것은 오래 쌓이는 독이었다. 그런 것은 왕대비궁 재고에서만 나온다 — 그 안을 관장하는 이는 단 한 사람이다.',
  },
  {
    flag: 'truth_mother_mastermind', theme: '왕대비', kind: 'truth', title: '어머니의 필적',
    learned: '모후가 주모자였다. 섭정공은 그 손이었을 뿐. 선왕의 칙령이 그녀의 친정을 지웠을 것이기에.',
  },
]

const has = (game: GameState, flag: string) => game.flags[flag] === true

/** 그 테마에서 얻은 항목들(얻은 것만). */
export function mysteryEntriesByTheme(game: GameState, theme: MysteryTheme): MysteryEntry[] {
  return MYSTERY_ENTRIES.filter((e) => e.theme === theme && has(game, e.flag))
}

/**
 * ★ 남은 의문 — 방향 힌트. flag 조합에서 파생하고 정확한 수치는 말하지 않는다.
 *   무엇을 쫓는지·다음에 어디를 볼지 정도만. (침실 수색을 실제로 여는 이동은 2-b.)
 */
export function mysteryHints(game: GameState): string[] {
  const hints: string[] = []
  const deathClues = ['clue_radical_edict', 'clue_sealed_report', 'clue_witness_gone', 'clue_noble_ledger']
    .filter((f) => has(game, f)).length

  // 선왕의 죽음에 석연찮은 것이 쌓였는데 아직 하나로 안 꿰였다.
  if (deathClues >= 2 && !has(game, 'truth_regent_involved')) {
    hints.push('선왕의 죽음엔 병사로 덮기 어려운 것들이 쌓인다. 흩어진 것을 하나로 꿰면 무언가 보일지도 모른다.')
  }
  // 섭정공이 덮은 건 알았으나, 오래 쌓이는 독의 출처가 비어 있다.
  if (has(game, 'truth_regent_involved') && !has(game, 'clue_apothecary')) {
    hints.push('섭정공이 덮었다는 데까지는 왔다. 그러나 오래 쌓이는 독을 그가 어디서 구했는지가 맞지 않는다 — 궁의 안쪽, 그의 손이 닿지 않는 곳.')
  }
  // ★ ②-비의존 발견: clue_apothecary 만으로 왕대비궁 방향이 뜬다(로맨스 불필요).
  if (has(game, 'clue_apothecary') && !has(game, 'queen_chamber_searched') && !has(game, 'queen_poison_path')) {
    hints.push('독은 왕대비궁 재고에서만 나온다. 그 안을 들여다볼 방법을 궁리해볼 수도 있겠다 — 왕대비가 자리를 비우는 때를 노린다면.')
  }
  // 모후가 주모자임을 알았다 — 남은 것은 증거와, 그것으로 무엇을 할지.
  if (has(game, 'truth_mother_mastermind')) {
    hints.push('모후가 주모자임을 알았다. 남은 것은 손에 쥔 증거와, 그것으로 무엇을 할지다.')
  }
  return hints
}

/** ★ 발각 후 "위험" — 지금은 1~9년 뒤 엔딩에서야 이름이 붙던 것을, 여기서 명확히 보인다. */
export function mysteryDanger(game: GameState): string | null {
  if (has(game, 'queen_poison_averted')) {
    return '한때 왕대비궁에서 올라오던 것을 알아챘다. 위험은 넘겼다.'
  }
  if (has(game, 'queen_poison_path')) {
    return '침전을 뒤지다 들킨 뒤로 왕대비가 경계를 굳혔다. 다시 올라오기 시작한 탕약을 조심해야 한다.'
  }
  return null
}
