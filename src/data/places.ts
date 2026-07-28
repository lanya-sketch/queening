import type { GameState } from '../types/game'

/**
 * 궁 안 이동 — 장소 데이터 (2-b-1).
 *
 * ★ 텍스트는 전부 여기(데이터)에 둔다. 이동 기제(systems/visit.ts)는 이 표를 읽기만 한다.
 * ★ 스탯·__risk 0 — 장소 방문 자체는 보상이 서사·조우다. 왕대비궁 수색만 별도(bloodoath).
 * ★ 세계관 힌트(lorePool)는 flag-free — clue_* 를 절대 세우지 않는다(미스터리 타임라인 불변).
 *   확장(장소당 더 많은 조각·회전 정교화)은 2-b-2.
 */

export type PlaceId = 'library' | 'garden' | 'yard' | 'queen' | 'patrol' | 'sneak'

/** 조우 가능한 인물 — 5인 중 궁에 상주/왕래하는 넷. ④ 영웅은 제 서사로만 등장. */
export type PresenceCharId = 'heir' | 'loyalist' | 'prince' | 'commander'

export interface PlaceDef {
  id: PlaceId
  /** 목적지 카드·이벤트 제목. */
  label: string
  /** 카드 부제(짧은 결). */
  hint: string
  /** 이 장소가 발동하는 PLACE_EVENT id(왕대비궁 수색만 예외로 chamber-search). */
  eventId: string
  kind: 'place' | 'queen' | 'outing-legal' | 'outing-sneak'
  /** 씬 첫 줄(장소 서술). */
  location: string
  /** 인물 조우 가중치(charId → weight). ③은 prince_present 일 때만 counted. */
  presence?: Partial<Record<PresenceCharId, number>>
  /** 그날 아무도 없을 때의 서술. */
  emptyLine?: string
  /** flag-free 세계관/경로 힌트 — 방문 때마다 하나 회전. */
  lorePool: string[]
  /** 나이 제한(외출만). 미달이면 목적지 피커에서 잠김. */
  minAge?: number
}

/** 인물별 조우 서술(장소 무관 — 그 인물이 그 자리에 있는 그림). */
export const MEET_LINE: Record<PresenceCharId, string> = {
  heir:
    '{이름:heir}이 먼저 와 있었다. {왕}을 보고도 자리를 뜨지 않은 것은, 그 나름의 인사였다.',
  loyalist:
    '{이름:loyalist}이 책장 사이에 서 있었다. {왕}과 눈이 마주치자 읽던 것을 조용히 덮었다.',
  prince:
    '{이름:prince}이 벽에 기대 있었다. 궁에 머무는 동안은 어디에든 있고, 어디에도 매이지 않았다.',
  commander:
    '{이름:commander}이 병사들 사이에 있었다. {왕}을 보고 짧게 목례할 뿐, 하던 일을 멈추지 않았다.',
}

export const PLACES: PlaceDef[] = [
  {
    id: 'library',
    label: '서고',
    hint: '문서의 공간',
    eventId: 'visit-library',
    kind: 'place',
    location:
      '서고는 늘 한기가 돌았다. 불을 크게 때면 종이가 상한다는 이유로, 이곳만은 겨울이 길었다.',
    presence: { loyalist: 6, heir: 3, prince: 1 },
    emptyLine: '오늘은 아무도 없었다. 먼지 냄새와, 누군가 마지막으로 덮어 둔 책 한 권뿐.',
    lorePool: [
      '선왕의 서명이 든 문서철은 어느 해부터 뚝 끊겨 있었다. 그 뒤의 것은 다른 손이 정리했다.',
      '왕국의 국경은 지도마다 조금씩 달랐다. 가장 최근 것에서 동쪽 변경이 안으로 물러나 있었다.',
      '세금 장부의 여백에 누군가 옛 화폐 단위로 셈을 고쳐 적어 두었다. 오래된 습관이었다.',
    ],
  },
  {
    id: 'garden',
    label: '정원',
    hint: '고요, 회복의 결',
    eventId: 'visit-garden',
    kind: 'place',
    location:
      '정원에는 철 지난 꽃이 아직 남아 있었다. 정원사는 뽑지 않았다 — 왕대비가 그 색을 좋아한다고 했다.',
    presence: { heir: 4, commander: 1, prince: 1 },
    emptyLine: '아무도 없는 정원은 유난히 넓었다. 바람이 한 바퀴 돌고 지나갔다.',
    lorePool: [
      '분수 가장자리에 옛 왕들의 이름이 새겨져 있었다. 마지막 두 자리는 아직 비어 있었다.',
      '북쪽 담 너머로 성당의 종탑이 보였다. 종은 하루 세 번, 늘 같은 시각에 울렸다.',
      '정원 한구석의 비석은 이름이 지워져 있었다. 누구의 것인지 아는 이는 남지 않았다.',
    ],
  },
  {
    id: 'yard',
    label: '연무장',
    hint: '검과 병사',
    eventId: 'visit-yard',
    kind: 'place',
    location:
      '연무장에서는 쇠 부딪는 소리가 끊이지 않았다. 여기서만은 섭정공의 이름보다 대장의 호령이 컸다.',
    presence: { commander: 6, prince: 2 },
    emptyLine: '훈련이 끝난 연무장은 텅 비어 있었다. 세워 둔 창들이 오후 볕에 줄지어 빛났다.',
    lorePool: [
      '병사들의 문장은 왕실 것과 미묘하게 달랐다. 한 가문의 색이 그 위에 덧대어 있었다.',
      '무기고 장부에는 최근 남쪽으로 실려 나간 창칼의 수가 적혀 있었다. 명분은 "국경 보강".',
      '오래된 갑주 하나가 벽에 걸려 있었다. 선왕이 마지막으로 입었다는 것 — 아무도 손대지 않았다.',
    ],
  },
  {
    id: 'queen',
    label: '왕대비궁',
    hint: '어머니가 계신 곳',
    eventId: 'visit-queen', // 재실(문안)·부재(???/미달). 수색은 chamber-search 로 분기.
    kind: 'queen',
    location:
      '왕대비궁은 다른 어느 곳보다 조용했다. 향냄새가 옅게 배어 있었고, 그 옅음이 오래되었다는 뜻이었다.',
    lorePool: [
      '탁자 위 약사발이 늘 두 개였다. 하나는 비어 있고, 하나는 손대지 않은 채였다.',
      '왕대비는 창을 등지고 앉는 버릇이 있었다. 얼굴보다 그림자가 먼저 말을 걸었다.',
    ],
  },
  {
    id: 'patrol',
    label: '순찰 (담 안팎)',
    hint: '겉을 본다 — 떳떳하게',
    eventId: 'visit-patrol',
    kind: 'outing-legal',
    minAge: 11,
    location:
      '호위를 앞세워 성문 밖으로 나섰다. 왕의 행차이니 숨길 것이 없었고, 그래서 보이는 것도 그만큼이었다.',
    lorePool: [
      '저잣거리의 곡물값이 지난달보다 올라 있었다. 상인들은 "북쪽 길이 막혔다"고만 했다.',
      '성벽 보수에 붙은 인부가 예년보다 많았다. 누구의 명으로 시작된 공사인지는 아무도 몰랐다.',
    ],
  },
  {
    id: 'sneak',
    label: '잠행 (평복)',
    hint: '속을 본다 — 들키면 위험',
    eventId: 'visit-sneak',
    kind: 'outing-sneak',
    minAge: 13,
    location:
      '평복으로 갈아입고 쪽문으로 빠져나갔다. 이름을 숨긴 채라야 사람들은 진짜 얼굴을 보였다 — 들키지만 않는다면.',
    lorePool: [
      '뒷골목에서는 선왕의 죽음을 두고 여전히 말이 오갔다. 병이 아니라 독이라는 말이 더 많았다.',
      '한 노파가 왕대비궁에서 흘러나온 약재를 저잣거리에 판다고 수군거렸다. 진위는 알 수 없었다.',
    ],
  },
]

export const PLACE_BY_ID: Record<PlaceId, PlaceDef> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
) as Record<PlaceId, PlaceDef>

/**
 * ★ 왕대비궁 부재 시 서술 — clue_apothecary 전/후로 갈린다.
 *   전: 「???」(암시만). 후: 자격 미달이면 잠김, 충족이면 수색(chamber-search)으로 분기.
 */
export const QUEEN = {
  /** 재실 — 문안. 11~12세 「어머니의 방」의 연장(위화감 축적, 상시). */
  audience:
    '왕대비는 자리에 있었다. {왕}의 손을 잡는 손이 여전히 따뜻했고, 그 따뜻함이 어딘가 어긋나 있었다.\n' +
    '"…무리하지 말거라." 늘 같은 말이었다. 무엇을 무리하지 말라는 것인지는 한 번도 말하지 않았다.',
  /** 부재 + clue_apothecary 전 — 「???」. 암시만, 손대지 못함. */
  lockedBeforeClue:
    '왕대비는 자리를 비우고 있었다. 방은 비어 있었고, 머릿장 서랍 하나가 잠겨 있었다.\n' +
    '무언가 있다는 것은 알겠는데 — 아직, 저것에 손댈 엄두가 나지 않았다.',
  /** 부재 + clue_apothecary 후 + 자격 미달 — 잠김 + 힌트(수치 없음). */
  lockedGate:
    '왕대비는 자리에 없었다. 서랍은 저기 있는데, 지금 손을 대면 들킬 위험이 너무 크다.\n' +
    '더 능숙해지고 나서라야 한다 — 왕대비궁에서 들키는 것은 되돌릴 수 없다.',
} as const

/** ③ 왕족은 궁에 머무는 동안(prince_present)만 조우 후보에 든다. */
export function princeAvailable(game: GameState): boolean {
  return game.flags.prince_present === true
}
