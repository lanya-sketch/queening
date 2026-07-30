import type { Effect, GameEvent, GameState, Scene, SceneLine } from '../../types/game'

/**
 * ★ [5] 선택지 대화 — 호감도의 주 경로(손으로 쓴 텍스트, AI-free, 키 없이 됨).
 *
 * 장소 방문 시 인물을 조우하면(visit.ts) 이 조우 대화 이벤트를 enqueue 한다(planQueen 패턴).
 * 전체화면 VN 이 씬을 재생 → 2~3 선택지 → 결과. EventScreen 의 scene→choices 경로 그대로.
 *
 * ★ 캐릭터마다 정답이 다르다(바이블 1층 코어). 정답 +8 / 무난 +2 / 명백한 오답 −(구간별).
 *   오답 페널티는 구간별로 커진다(0~25 −1 / 25~45 −3 / 45~70 −5): 처음엔 배우는 시간, 나중엔
 *   알 만한데 틀린 게 더 아프다. ★ 마이너스는 있되 폭을 좁게 — 한 번 더 맞추면 만회된다.
 * ★ 구간별 대화: 서먹(표면) → 열림(개인적) → 깊음(결정적 씬 직전). 관계 깊이가 내용으로 드러난다.
 * ★ 단발(아크 비트, 한 번 쓰면 소진) + 반복 「짧은 안부」 필러(climb). used-flag 로테이션.
 * ★ (나) 방침 — ①heir·②loyalist 를 구간별로 완성해 톤 잡고, ③⑤ 는 필러, ④hero 는 후속(presence 밖).
 */

const N = (text: string): SceneLine => ({ speaker: 'narration', text })
const aff = (charId: string, amount: number): Effect => ({ target: { kind: 'affection', charId }, amount })

/** 구간별 오답 페널티 — 0~25 −1 / 25~45 −3 / 45~70 −5. */
const PENALTY = [1, 3, 5]
export const encUsedFlag = (id: string) => `enc_used:${id}`

interface Opt { label: string; result: string }
/** 단발 구간 대화 — 정답 +8 / 무난 +2 / 오답 −PENALTY[band]. 어느 선택이든 소진(used). */
function band(charId: string, b: 0 | 1 | 2, title: string, setup: SceneLine[], right: Opt, mid: Opt, wrong: Opt) {
  const id = `enc-${charId}-b${b}`
  const sceneId = `scene-${id}`
  const used = { [encUsedFlag(id)]: true }
  const event: GameEvent = {
    id, title, sceneId, text: '', condition: {}, once: false, category: 'story',
    choices: [
      { id: 'right', label: right.label, effects: [aff(charId, 8)], setFlags: used, resultText: right.result },
      { id: 'mid', label: mid.label, effects: [aff(charId, 2)], setFlags: used, resultText: mid.result },
      { id: 'wrong', label: wrong.label, effects: [aff(charId, -PENALTY[b])], setFlags: used, resultText: wrong.result },
    ],
  }
  return { event, scene: { id: sceneId, lines: setup } as Scene }
}
/** 반복 「짧은 안부」 필러 — 정답 +3 / 무난 +1 / 오답 −1. 소진 안 함(climb 이음). */
function filler(charId: string, title: string, setup: SceneLine[], right: Opt, mid: Opt, wrong: Opt) {
  const id = `enc-${charId}-filler`
  const sceneId = `scene-${id}`
  const event: GameEvent = {
    id, title, sceneId, text: '', condition: {}, once: false, category: 'story',
    choices: [
      { id: 'right', label: right.label, effects: [aff(charId, 3)], resultText: right.result },
      { id: 'mid', label: mid.label, effects: [aff(charId, 1)], resultText: mid.result },
      { id: 'wrong', label: wrong.label, effects: [aff(charId, -1)], resultText: wrong.result },
    ],
  }
  return { event, scene: { id: sceneId, lines: setup } as Scene }
}

const BUILT = [
  // ─────────── ① heir — 정답: 아버지의 대리가 아닌 그 자신으로·대등하게 (동정→반발) ───────────
  band('heir', 0, '서고에서, 섭정공의 아이', [
    N('책장 사이에서 마주쳤다. {이름:heir}은 {왕}을 보고도 자리를 뜨지 않았다 — 그 나름의 인사였다.'),
    { speaker: 'heir', text: '"…무얼 찾으십니까. 도와드릴 것도 아니지만." 말끝이 차가웠다.' },
  ],
    { label: '"혼자 찾을 수 있다. 너도 네 것을 찾아라."', result: '{이름:heir}은 잠깐 {왕}을 다시 보았다. 동정도 명령도 아닌 말투가, 뜻밖이었던 모양이다.' },
    { label: '"…그냥 둘러보는 중이다."', result: '{이름:heir}은 짧게 목례하고 제 책으로 돌아갔다. 나쁘지 않은 침묵이었다.' },
    { label: '"네 아버지 밑에서 힘들지. 안됐다."', result: '{이름:heir}의 눈빛이 굳었다. "…제 걱정은 마십시오." 동정은 이 아이에게 가장 잘못 짚은 손이었다.' },
  ),
  band('heir', 1, '한 발 가까이', [
    N('{이름:heir}이 창가에 서 있었다. 이번엔 먼저 말을 건 쪽은 {왕}이었다.'),
    { speaker: 'heir', text: '"…아버지는 저를 전하께 붙이셨습니다. 그것이 제 쓸모라고." 자조가 옅게 배어 있었다.' },
  ],
    { label: '"네 쓸모는 네가 정한다. 나한테는 그렇다."', result: '{이름:heir}은 오래 말이 없었다. 그러나 그 침묵은 이전의 것과 달랐다 — 밀어내는 것이 아니라, 재는 것이었다.' },
    { label: '"정략인 건 나도 안다. 서로 알고 하자."', result: '{이름:heir}은 옅게 웃었다. "…솔직하시군요." 최소한 거짓은 없는 자리였다.' },
    { label: '"아버지가 시켰어도, 곁에 있어 줘서 고맙다."', result: '{이름:heir}의 표정이 닫혔다. "고마울 일이 아닙니다." 아버지의 그림자를 상기시키는 말은, 늘 문을 닫았다.' },
  ),
  band('heir', 2, '아버지라는 이름', [
    N('{이름:heir}이 먼저 {왕}을 찾아왔다. 그런 일은 처음이었다.'),
    { speaker: 'heir', text: '"…만약 제 아버지가 전하의 적이라면. 저는 어느 쪽입니까." 오래 참았던 물음이었다.' },
  ],
    { label: '"너는 네 편이다. 그거면 된다."', result: '{이름:heir}은 무언가를 내려놓은 얼굴이었다. 아버지의 아들도, 왕의 도구도 아닌 — 처음으로 그 자신이었다.' },
    { label: '"그건 그때 가서 정하자. 지금은 너와 나뿐이다."', result: '{이름:heir}은 고개를 끄덕였다. 답을 미룬 것이 아니라, 함께 지기로 한 것이었다.' },
    { label: '"아버지를 버려라. 나를 택해."', result: '{이름:heir}의 얼굴이 하얗게 질렸다. "…그렇게 쉽게 말씀하십니까." 선택을 강요하는 것은, 이 아이를 가장 아프게 하는 방식이었다.' },
  ),
  filler('heir', '스치는 인사', [
    N('{이름:heir}과 짧게 마주쳤다. 오가는 말은 길지 않았다.'),
  ],
    { label: '눈을 맞추고 가볍게 인사한다', result: '{이름:heir}도 짧게 답했다. 별것 아닌 인사가, 쌓이면 익숙함이 된다.' },
    { label: '고개만 까딱한다', result: '{이름:heir}도 목례로 답했다. 데면데면하지만 나쁘지 않았다.' },
    { label: '아버지 안부를 묻는다', result: '{이름:heir}은 미간을 좁혔다. "…글쎄요." 하필 그 이름이었다.' },
  ),

  // ─────────── ② loyalist — 정답: 신중히·헌신을 허락 (무모→걱정) ───────────
  band('loyalist', 0, '서고의 그림자', [
    N('{이름:loyalist}이 책장 사이에 서 있었다. {왕}과 눈이 마주치자 읽던 것을 조용히 덮었다.'),
    { speaker: 'loyalist', text: '"…늦은 시간입니다, {전하}. 무리하고 계신 건 아닌지요."' },
  ],
    { label: '"염려해 줘서 고맙다. 조금만 더 보고 쉬마."', result: '{이름:loyalist}은 안심한 듯 고개를 숙였다. 그녀의 염려를 받아 주는 것이, 그녀에게는 곧 허락이었다.' },
    { label: '"괜찮다. 익숙한 일이다."', result: '{이름:loyalist}은 더 말하지 않고 곁에 등을 하나 더 밝혔다.' },
    { label: '"이 정도로 지치겠느냐. 밤을 새워도 된다."', result: '{이름:loyalist}의 낯에 근심이 스쳤다. "…그러지 마십시오." 무모함은 이 아이가 가장 못 견디는 것이었다.' },
  ),
  band('loyalist', 1, '아버지의 자리', [
    N('{이름:loyalist}이 선왕의 문서철을 정리하고 있었다. 그녀의 아버지가 마지막으로 만졌던 것들이다.'),
    { speaker: 'loyalist', text: '"…제 아버지도 이 방에서 일하셨습니다. 진실에 너무 가까이 가셨던 탓에." 목소리가 낮았다.' },
  ],
    { label: '"네 아버지의 몫까지, 무리하진 마라. 너를 잃고 싶지 않다."', result: '{이름:loyalist}은 잠깐 손을 멈췄다. "…{전하}." 그 한마디에 많은 것이 담겨 있었다.' },
    { label: '"…그분의 일은 내가 기억하마."', result: '{이름:loyalist}은 조용히 고개를 숙였다. 위로가 서툴러도, 진심은 전해졌다.' },
    { label: '"그럼 너도 진실을 캐라. 위험 따위."', result: '{이름:loyalist}의 얼굴이 어두워졌다. "…아버지처럼 되라는 말씀입니까." 잘못 짚은 말이었다.' },
  ),
  band('loyalist', 2, '하겠다는 말', [
    N('{이름:loyalist}이 {왕}의 앞을 가로막듯 섰다. 위험한 일을 앞둔 참이었다.'),
    { speaker: 'loyalist', text: '"…이번 일은, 제가 하겠습니다. {전하}께서 하실 일이 아닙니다."' },
  ],
    { label: '"함께 하자. 너를 방패로 세우진 않겠다."', result: '{이름:loyalist}의 눈이 흔들렸다. 지키려는 그녀를, 오히려 {왕}이 지키겠다 했다 — 그녀가 가장 바라던 말이었다.' },
    { label: '"…알겠다. 네게 맡기마. 조심해라."', result: '{이름:loyalist}은 깊이 고개를 숙였다. 믿어 주는 것이 그녀에게는 가장 큰 신뢰였다.' },
    { label: '"네가 뭐라고 나를 막느냐."', result: '{이름:loyalist}은 물러섰다. "…송구합니다." 그녀의 헌신을 밀어낸 말은, 오래 남았다.' },
  ),
  filler('loyalist', '곁의 안부', [
    N('{이름:loyalist}이 곁을 지나며 {왕}의 안색을 살폈다.'),
  ],
    { label: '"괜찮다. 네 덕이다."', result: '{이름:loyalist}은 옅게 웃었다. 곁에 있음을 알아주는 것이, 그녀에게는 충분했다.' },
    { label: '가볍게 눈인사한다', result: '{이름:loyalist}도 목례했다. 조용한 익숙함이 쌓였다.' },
    { label: '"내 걱정은 됐다."', result: '{이름:loyalist}은 잠깐 서운한 낯이었다. 그녀의 염려를 물린 셈이었다.' },
  ),

  // ─────────── ③ prince — 필러(맞섬→흥미 / 굽힘→얕봄) ───────────
  filler('prince', '연무장 가에서', [
    N('{이름:prince}이 벽에 기대 {왕}을 훑어보았다. 그 눈에는 늘 얕보는 기색이 옅게 깔려 있었다.'),
    { speaker: 'prince', text: '"네가? …뭐, 구경이나 하든지." 반쯤 비웃음이었다.' },
  ],
    { label: '"구경? 겨뤄 볼 텐가."', result: '{이름:prince}이 눈썹을 들어 올렸다. "…호오." 맞서는 자에게만, 그는 잠깐이라도 흥미를 보였다.' },
    { label: '어깨를 나란히 하고 지켜본다', result: '{이름:prince}은 별말 없었다. 굽히지도 나서지도 않은 것이, 그럭저럭이었다.' },
    { label: '"과연 명성대로시군요. 배우고 싶습니다."', result: '{이름:prince}이 코웃음 쳤다. "…역시." 치켜세우는 말은 그를 더 오만하게 만들 뿐이었다.' },
  ),

  // ─────────── ⑤ commander — 필러(존중하며 격 좁힘 / 격식 무시→물러남) ───────────
  filler('commander', '연무장의 인사', [
    N('{이름:commander}이 병사들 사이에 있었다. {왕}을 보고 짧게 목례할 뿐, 하던 일을 멈추지 않았다.'),
    { speaker: 'commander', text: '"…명하실 것이 있으십니까, {전하}." 보고체는 늘 반듯했다.' },
  ],
    { label: '"명이 아니라, 그냥 얼굴 보러 왔다."', result: '{이름:commander}의 어깨에서 힘이 조금 빠졌다. 격을 명령이 아니라 사람으로 좁히는 것 — 그가 오래 기다린 것이었다.' },
    { label: '반듯하게 격을 갖춰 답한다', result: '{이름:commander}은 예로 답했다. 흐트러짐 없는, 익숙한 거리였다.' },
    { label: '"격식은 됐고, 편하게 대하자."', result: '{이름:commander}은 오히려 한 걸음 물러섰다. "…그럴 수는 없습니다." 격을 억지로 허무는 것은, 그를 불편하게 했다.' },
  ),
]

export const ENCOUNTER_EVENTS: GameEvent[] = BUILT.map((b) => b.event)
export const ENCOUNTER_SCENES: Scene[] = BUILT.map((b) => b.scene)
const ENCOUNTER_IDS = new Set(ENCOUNTER_EVENTS.map((e) => e.id))

function bandOf(a: number): 0 | 1 | 2 {
  return a < 25 ? 0 : a < 45 ? 1 : 2
}

/**
 * ★ [5] 조우 시 발동할 선택지 대화 id — 현재 구간의 단발(안 썼으면), 없으면 반복 필러, 그것도 없으면 null.
 *   구간이 오르면 새 단발이 열려 관계 깊이가 대화 내용으로 드러난다.
 */
export function encounterFor(charId: string, game: GameState): string | null {
  // ★ [5] 선택지 대화 주 경로는 데뷔탕트(romance_unlocked, 16세) 이후. 그 전(13~15)은 teenBonds 가 맡는다.
  if (game.flags.romance_unlocked !== true) return null
  const a = game.affection[charId] ?? 0
  const singleId = `enc-${charId}-b${bandOf(a)}`
  if (ENCOUNTER_IDS.has(singleId) && game.flags[encUsedFlag(singleId)] !== true) return singleId
  const fillerId = `enc-${charId}-filler`
  return ENCOUNTER_IDS.has(fillerId) ? fillerId : null
}
