import type { GameEvent } from '../../types/game'

/**
 * 유년기 인물 등장 (실플레이 피드백: 11~13세에 사람이 안 나온다).
 *
 * 두 묶음이다.
 *   · 11~12세 위화감 씨앗 — 섭정공·모후가 **다정한 숙부·어머니**로 보이는 씬.
 *     둘은 미스터리의 두 진범이라, 초반에 따뜻하게 보여야 나중에 진실이 뒤집힐 때 무게가 실린다.
 *     분기도 수치 게이트도 없다 — 서술만. 회차에서 "아 그때 그거"가 되면 충분하다.
 *     스프라이트를 켠다(showSprites) — 전신 초상이 뜬다는 것 자체가 "이 인물은 중요하다"는 신호다.
 *   · 13세 첫 등장 — ①②③⑤ 가 각자 다른 이유로 판에 올라온다. **전부 로맨스 아님.**
 *     met_<id> flag 를 세워 인연 창이 "만난 사람"으로 보여줄 수 있게 한다.
 *     ③ 은 지금까지 romance_unlocked(16세)를 요구해 16세까지 안 나왔다 — 여기서 13세로 앞당긴다.
 *
 * ★ 로맨스 해금은 여전히 16세(데뷔탕트)다. 여기서 만나는 것은 관계의 시작이지 연애가 아니다.
 */

/** 인연 창·안내가 "이 인물을 만났는가"를 읽는 flag. */
export const MET_FLAG = (id: string) => `met_${id}`

export const CHILDHOOD_EVENTS: GameEvent[] = [
  // ── 11~12세 위화감 씨앗 (섭정공·모후, 스프라이트) ────────────
  {
    id: 'child-uncle-evening',
    text: '늦은 밤, 숙부가 문서를 대신 봐 주었다.',
    title: '숙부의 저녁',
    sceneId: 'scene-child-uncle-evening',
    // 11세 봄 — 즉위 첫해. 올라온 문서를 숙부가 대신 봐 준다.
    condition: { minAge: 11, month: 4 },
    once: true,
  },
  {
    id: 'child-mother-room',
    text: '어머니가 방으로 불러 약을 권했다.',
    title: '어머니의 방',
    sceneId: 'scene-child-mother-room',
    condition: { minAge: 11, month: 8 },
    once: true,
  },
  {
    id: 'child-uncle-corridor',
    text: '회랑에서 숙부와 마주쳤다.',
    title: '회랑에서',
    sceneId: 'scene-child-uncle-corridor',
    condition: { minAge: 12, month: 3 },
    once: true,
  },
  {
    id: 'child-mother-dinner',
    text: '어머니와 겸상하는 저녁이었다.',
    title: '어머니와의 저녁',
    sceneId: 'scene-child-mother-dinner',
    condition: { minAge: 12, month: 9 },
    once: true,
  },

  // ── 13세 첫 등장 (①②③⑤, 스프라이트, 로맨스 아님) ──────────
  {
    id: 'child-meet-heir',
    text: '섭정공이 {자식:heir}을 데려왔다.',
    title: '또래',
    sceneId: 'scene-meet-heir',
    // 섭정공이 아들을 데려온다 — 정략. 봄에.
    condition: { minAge: 13, month: 2 },
    once: true,
    setFlags: { [MET_FLAG('heir')]: true },
  },
  {
    id: 'child-meet-loyalist',
    text: '낯익은 아이가 걸음을 멈췄다.',
    title: '늘 곁에 있던',
    sceneId: 'scene-meet-loyalist',
    condition: { minAge: 13, month: 5 },
    once: true,
    setFlags: { [MET_FLAG('loyalist')]: true },
  },
  {
    id: 'child-meet-commander',
    text: '문 앞을 지켜온 사람과 눈이 마주쳤다.',
    title: '문 앞의 사람',
    sceneId: 'scene-meet-commander',
    condition: { minAge: 13, month: 7 },
    once: true,
    setFlags: { [MET_FLAG('commander')]: true },
  },
  {
    /**
     * ★ ③ 제국 왕족의 **첫 등장** — romance_unlocked 를 요구하지 않는다.
     *   조공을 받으러 온 사절단에 끼어 어린 왕을 구경하러 온다. 16세 이후의 방문 사이클
     *   (characters.ts)과는 별개의 일회성 첫 만남이다. met_prince 만 세운다.
     */
    id: 'child-meet-prince',
    text: '제국의 사절단에 어린 왕족이 섞여 있었다.',
    title: '구경 온 손님',
    sceneId: 'scene-meet-prince',
    condition: { minAge: 13, month: 10 },
    once: true,
    setFlags: { [MET_FLAG('prince')]: true },
  },
]
