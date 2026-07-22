import type { EndingResult } from '../types/game'

/**
 * 엔딩 갤러리 (D-2).
 *
 * ★ 수집 단위는 **큰 결말**이다 — 8골격 + 주요 변주 + 조기 파국 2종(~12개).
 *   로맨스×나라향방 수백 조합은 나열하지 않는다. 한 회차가 해당하는 항목을 **여러 개
 *   동시 해금**한다(예: 친정 tier + 정당한 심판 + 소유의 옥좌).
 *
 * ★ 스포일러 균형(사용자 결정): 실권·배드·파국 제목은 늘 보여 "도전 목표"가 되고,
 *   내용을 미리 알면 김빠지는 **변주**(정당한 심판·소유의 옥좌·사랑을 삼킴)만
 *   달성 전까지 제목을 가린다(spoiler:true → "???").
 *
 * ★ 컴포넌트 하드코딩 금지 — data/ 에 둔다(동양판·성별 대비). {왕} 토큰 사용.
 *   대표 장면(scene)·조건 요약(summary)은 **달성 후에만** 보인다(사후 공개).
 */
export type GalleryGroup = '실권' | '파국' | '성향과 변주'

export interface GalleryItem {
  id: string
  title: string
  group: GalleryGroup
  /** true 면 달성 전까지 제목을 가린다(스포일러 변주). */
  spoiler?: boolean
  /** 이 회차 결과가 이 항목을 달성했는가. 정식 엔딩이면 result, 데드면 deadReason. */
  match: (result: EndingResult | null, deadReason: string | null) => boolean
  /** 달성 후 보이는 대표 장면 한 줄. */
  scene: string
  /** 달성 후 보이는 도달 조건 요약(사후 공개). */
  summary: string
}

const has = (r: EndingResult | null, m: string) => !!r && r.modifiers.includes(m)

export const GALLERY: GalleryItem[] = [
  // ── 실권 tier
  {
    id: 'autonomy',
    title: '친정',
    group: '실권',
    match: (r) => r?.tier === '친정',
    scene: '이제 이 방의 누구도 그를 대신해 서명하지 않는다.',
    summary: '국정 영향도를 70 이상으로 끌어올려, 홀로 나라를 다스리는 자리에 올랐다.',
  },
  {
    id: 'coexist',
    title: '공존',
    group: '실권',
    match: (r) => r?.tier === '공존',
    scene: '나라의 절반은 그의 것이고, 나머지 절반은 아직 숙부의 것이다.',
    summary: '영향도 45~69. 섭정과 저울이 맞은 채로 아홉 해를 마쳤다 — 지지 않은 것도 이긴 것.',
  },
  {
    id: 'puppet',
    title: '허수아비',
    group: '실권',
    match: (r) => r?.tier === '허수아비',
    scene: '{왕}도 옥좌 위에 있다. 다만 나라를 움직이는 손은 다른 곳에 있었다.',
    summary: '영향도 45 미만. 옥좌에 앉았으나 실권을 쥐지 못했다. 아직 스무 살, 시간은 남아 있다.',
  },

  // ── 배드 tier
  {
    id: 'bad-poison',
    title: '모후의 약',
    group: '파국',
    match: (r) => r?.tier === '배드:꼭두각시',
    scene: '옥좌에는 사람이 앉아 있었다. 그 손을 움직이는 것이 누구인지 아무도 입에 담지 않았다.',
    summary: '왕대비궁의 탕약을 끝내 알아채지 못했다. 몸을 빼앗긴 가장 깊은 실패.',
  },
  {
    id: 'bad-junta',
    title: '군부의 왕',
    group: '파국',
    match: (r) => r?.tier === '배드:군부종속',
    scene: '{왕}의 이름으로 칼이 움직였지만, 칼자루를 쥔 손은 다른 곳에 있었다.',
    summary: '실권 없이 군을 빌렸다. 아홉 대 만에 무관 가문이 다시 왕을 세우고 갈아치우는 자리에 섰다.',
  },
  {
    id: 'bad-subjugated',
    title: '삼켜진 왕관',
    group: '파국',
    match: (r) => r?.tier === '배드:제국복속',
    scene: '두 왕관이 만났고, 하나가 다른 하나를 삼켰다.',
    summary: '약한 나라가 강한 제국과 손잡았다. 결혼이 아니라 흡수였고, {왕}은 첫 총독으로 기록되었다.',
  },

  // ── 성향·변주 (일부 스포일러)
  {
    id: 'tyrant',
    title: '폭군',
    group: '성향과 변주',
    match: (r) => r?.disposal === '폭군',
    scene: '그가 치우라 하면 사람이 사라졌고, 아무도 이유를 묻지 않았다.',
    summary: '명분 없이 숙부를 처분하고 실권으로 눌렀다. 힘으로 무엇이든 할 수 있게 된 왕.',
  },
  {
    id: 'just-purge',
    title: '정당한 심판',
    group: '성향과 변주',
    spoiler: true,
    match: (r) => r?.disposal === '정당',
    scene: '진실과 확증을 손에 쥐고, {왕}은 명분을 들어 심판했다.',
    summary: '아버지의 죽음에 대한 진실과 확증을 모두 쥔 채 숙부를 정당하게 처분했다.',
  },
  {
    id: 'owned-throne',
    title: '소유의 옥좌',
    group: '성향과 변주',
    spoiler: true,
    match: (r) => has(r, '소유의 옥좌'),
    scene: '혼자가 아니라, 소유물로 채운 옥좌였다.',
    summary: '두 사람 이상을 측실로 삼았다. 고독한 옥좌의 거울상 — 곁을 소유로 메운 자리.',
  },
  {
    id: 'devoured-love',
    title: '사랑을 삼킴',
    group: '성향과 변주',
    spoiler: true,
    match: (r) => has(r, '사랑을 삼킴'),
    scene: '사랑한 나라를, 사랑한 채로 삼켰다.',
    summary: '연인이었던 이웃 왕국을 정복했다. 무감정한 정복과는 다른, 가장 잔인한 결합.',
  },

  // ── 조기 파국(데드엔딩)
  {
    id: 'dead-strain',
    title: '스러진 그릇',
    group: '파국',
    match: (_r, dead) => dead === '심신파탄',
    scene: '무리에 무리를 거듭한 나날이, 결국 병으로 돌아왔다.',
    summary: '어린 몸을 돌보지 않고 무리시켰다. 스무 살에 이르지 못하고 병으로 승하.',
  },
  {
    id: 'dead-exposure',
    title: '먼저 온 밤',
    group: '파국',
    match: (_r, dead) => dead === '의심무방비',
    scene: '섭정은 기다려 주지 않았다. 무방비한 밤을 골라 먼저 손을 썼다.',
    summary: '의심을 끝까지 키우고도 지킬 것을 마련하지 못했다. 섭정이 먼저 움직였다.',
  },
]

export const GALLERY_TOTAL = GALLERY.length
