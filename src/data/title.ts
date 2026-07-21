/**
 * 타이틀 화면 텍스트 (D-1).
 *
 * ★ 컴포넌트 하드코딩 금지 — 동양판·성별 대비. 제목/부제/메뉴 라벨을 여기 둔다.
 */
export const TITLE = {
  main: 'Queening',
  sub: '옥좌의 주인',
  /** 제목 아래 한 줄 — 톤을 잡는 문장. */
  tagline: '열한 살에 아버지를 잃고 옥좌에 앉은 아이가 있었다.',
  menu: {
    newGame: '새 게임',
    continue: '이어하기',
    settings: '설정',
    gallery: '엔딩 기록',
  },
} as const

export const TITLE_BACKGROUND = '/assets/background/title.png'
