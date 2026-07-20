import type { Character } from '../../types/game'

/**
 * 연애 대상 5인 (바이블 docs/M2b-0 §2 의 ①~⑤).
 *
 * ★ M2b-3a 에서는 **뼈대만** 등록한다 — id·성별·시작 호감도·해금 조건은 확정이고,
 *   이름·소개·초상은 플레이스홀더다. 실제 성격·대사·고유장치는 M2b-3b/3c.
 *
 * ★ gender 를 하드코딩하지 않고 데이터로 두는 이유: (다) 전면 성별 선택이
 *   열릴 때 이 필드만 바꾸면 되고, 코드는 어디에도 "heir 는 남자"를 알지 못한다.
 */
export const CHARACTERS: Character[] = [
  {
    id: 'heir',
    name: '섭정공의 아들',
    role: '귀족파 핵심. 정략으로 붙여졌고, 처음엔 서로 반감.',
    gender: 'male',
    // 5명 중 최저 시작 — "제일 공들여야 하는 메인 로맨스"
    startingAffection: 0,
    romanceUnlock: { flags: { romance_unlocked: true } },
    portraitId: 'heir',
  },
  {
    id: 'loyalist',
    name: '충신 가문의 딸',
    role: '왕당파. 어릴 때부터 곁에 있었다.',
    gender: 'female',
    startingAffection: 20,
    romanceUnlock: { flags: { romance_unlocked: true } },
    portraitId: 'loyalist',
  },
  {
    id: 'prince',
    name: '제국의 왕족',
    role: '외부 축. 상주하지 않고 이따금 나타난다.',
    gender: 'male',
    startingAffection: 5,
    romanceUnlock: { flags: { romance_unlocked: true } },
    // ★ 해금(영구)과 체류(현재)를 분리한다 — "아직 조건이 안 됐다"와
    //   "열렸지만 지금 궁에 없다"는 플레이어에게 전혀 다른 정보다.
    presence: {
      flag: 'prince_present',
      awayNote: '지금은 궁에 없다. 사냥철이 되면 예고 없이 들른다.',
    },
    portraitId: 'prince',
  },
  {
    id: 'commander',
    name: '친위 지휘관',
    role: '오래된 무관 가문. 가장 오래 곁을 지켰다.',
    gender: 'female',
    startingAffection: 20,
    romanceUnlock: { flags: { romance_unlocked: true } },
    portraitId: 'commander',
  },
  {
    id: 'hero',
    name: '평민 영웅',
    role: '버려졌던 병졸. 등장 자체가 뒤늦다.',
    gender: 'male',
    startingAffection: 0,
    // ④ 만 별도 조건 — 18세 + 입궁
    romanceUnlock: { minAge: 18, flags: { hero_at_court: true } },
    portraitId: 'hero',
  },
]

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
)

/** 호감도가 이 값 이상이면 "깊은 관계" — 고유장치·엔딩급 결과가 열리는 문턱. */
export const DEEP_BOND_THRESHOLD = 70

/** 데뷔탕트에서 열리는 flag. ①②③⑤ 의 해금 조건. */
export const ROMANCE_UNLOCK_FLAG = 'romance_unlocked'
