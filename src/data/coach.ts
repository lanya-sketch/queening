import type { CoachKey } from '../store/appStore'

/**
 * 시점별 안내 문구 (store/appStore 의 CoachKey 와 짝).
 *
 * ★ 텍스트는 여기 data/ 에 둔다 — 컴포넌트 하드코딩 금지(동양판·성별 토큰 대비).
 *   target 은 가리킬 UI 의 data-onboard 값이다(온보딩 툴팁과 같은 훅을 재사용).
 */
export interface CoachLine {
  target: string
  text: string
}

export const COACH: Record<CoachKey, CoachLine> = {
  bond: {
    target: 'bond',
    text: '이제 궁에 사람이 생겼습니다. 「인연」에서 만난 이들을 볼 수 있어요 — 아직 그저 아는 사이지만.',
  },
  talk: {
    target: 'talk',
    text: '{왕}과 직접 이야기할 수 있습니다. 곁을 내어줄 만큼 믿게 되었으니, 속을 물어보세요.',
  },
  outfit: {
    target: 'outfit',
    text: '자리에 맞는 옷이 있습니다. 초상을 눌러 갈아입혀 보세요 — 어떤 자리엔 어떤 옷이 필요합니다.',
  },
}
