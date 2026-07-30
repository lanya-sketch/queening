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
 * ★ [5-b] 5인 완성 — ①heir·②loyalist·⑤commander 상주, ③prince 왕래(드물되 밴드 +12),
 *   ④hero 대예배당 억류(hero_at_court 후 확실 조우, 24개월 창). 각자 정답이 다르다(바이블 1층).
 */

const N = (text: string): SceneLine => ({ speaker: 'narration', text })
const aff = (charId: string, amount: number): Effect => ({ target: { kind: 'affection', charId }, amount })

/** 구간별 오답 페널티 — 0~25 −1 / 25~45 −3 / 45~70 −5. */
const PENALTY = [1, 3, 5]
export const encUsedFlag = (id: string) => `enc_used:${id}`

interface Opt { label: string; result: string }
/**
 * 단발 구간 대화 — 정답 +right / 무난 +mid / 오답 −PENALTY[band]. 어느 선택이든 소진(used).
 * ★ [5-b] 델타는 캐릭터별로 달라질 수 있다 — ③prince 는 드물게 만나니 밴드 +12(자주 못 봐도 한 번이 큼).
 *   기본은 ①② 공식(+8/+2). 오답 페널티는 구간별로 공통.
 */
function band(
  charId: string, b: 0 | 1 | 2, title: string, setup: SceneLine[], right: Opt, mid: Opt, wrong: Opt,
  amt: { right: number; mid: number } = { right: 8, mid: 2 },
) {
  const id = `enc-${charId}-b${b}`
  const sceneId = `scene-${id}`
  const used = { [encUsedFlag(id)]: true }
  const event: GameEvent = {
    id, title, sceneId, text: '', condition: {}, once: false, category: 'story',
    choices: [
      { id: 'right', label: right.label, effects: [aff(charId, amt.right)], setFlags: used, resultText: right.result },
      { id: 'mid', label: mid.label, effects: [aff(charId, amt.mid)], setFlags: used, resultText: mid.result },
      { id: 'wrong', label: wrong.label, effects: [aff(charId, -PENALTY[b])], setFlags: used, resultText: wrong.result },
    ],
  }
  return { event, scene: { id: sceneId, lines: setup } as Scene }
}
/** 반복 「짧은 안부」 필러 — 정답 +rightAmt / 무난 +1 / 오답 −1. 소진 안 함(climb 이음). */
function filler(charId: string, title: string, setup: SceneLine[], right: Opt, mid: Opt, wrong: Opt, rightAmt = 3) {
  const id = `enc-${charId}-filler`
  const sceneId = `scene-${id}`
  const event: GameEvent = {
    id, title, sceneId, text: '', condition: {}, once: false, category: 'story',
    choices: [
      { id: 'right', label: right.label, effects: [aff(charId, rightAmt)], resultText: right.result },
      { id: 'mid', label: mid.label, effects: [aff(charId, 1)], resultText: mid.result },
      { id: 'wrong', label: wrong.label, effects: [aff(charId, -1)], resultText: wrong.result },
    ],
  }
  return { event, scene: { id: sceneId, lines: setup } as Scene }
}

const BUILT = [
  // ─────────── ① heir — 정답: 아버지의 대리가 아닌 그 자신으로·대등하게 (동정→반발) ───────────
  band('heir', 0, '서고에서, 섭정공의 아이', [
    N('책장 사이에서 마주쳤다. {이름:heir}은 {왕}을 보고도 자리를 뜨지 않았다. 그 나름의 인사였다.'),
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
    { label: '"네 쓸모는 네가 정한다. 나한테는 그렇다."', result: '{이름:heir}은 오래 말이 없었다. 그러나 그 침묵은 이전의 것과 달랐다. 밀어내는 것이 아니라, 재는 것이었다.' },
    { label: '"정략인 건 나도 안다. 서로 알고 하자."', result: '{이름:heir}은 옅게 웃었다. "…솔직하시군요." 최소한 거짓은 없는 자리였다.' },
    { label: '"아버지가 시켰어도, 곁에 있어 줘서 고맙다."', result: '{이름:heir}의 표정이 닫혔다. "고마울 일이 아닙니다." 아버지의 그림자를 상기시키는 말은, 늘 문을 닫았다.' },
  ),
  band('heir', 2, '아버지라는 이름', [
    N('{이름:heir}이 먼저 {왕}을 찾아왔다. 그런 일은 처음이었다.'),
    { speaker: 'heir', text: '"…만약 제 아버지가 전하의 적이라면. 저는 어느 쪽입니까." 오래 참았던 물음이었다.' },
  ],
    { label: '"너는 네 편이다. 그거면 된다."', result: '{이름:heir}은 무언가를 내려놓은 얼굴이었다. 아버지의 아들도, 왕의 도구도 아닌, 처음으로 그 자신이었다.' },
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
    { label: '"함께 하자. 너를 방패로 세우진 않겠다."', result: '{이름:loyalist}의 눈이 흔들렸다. 지키려는 그녀를, 오히려 {왕}이 지키겠다 했다. 그녀가 가장 바라던 말이었다.' },
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

  // ─────────── ③ prince — 정답: 대등하게 맞섬 (굽힘·치켜세움→얕봄). 드물게 만나니 밴드 +12 ───────────
  band('prince', 0, '구경이나 하든지', [
    N('{이름:prince}이 벽에 기대 {왕}을 훑어보았다. 그 눈에는 늘 얕보는 기색이 옅게 깔려 있었다.'),
    { speaker: 'prince', text: '"네가? …뭐, 구경이나 하든지." 반쯤 비웃음이었다.' },
  ],
    { label: '"구경? 겨뤄 볼 텐가."', result: '{이름:prince}이 눈썹을 들어 올렸다. "…호오." 맞서는 자에게만, 그는 잠깐이라도 눈길을 주었다.' },
    { label: '"손님이 무례하군."', result: '{이름:prince}이 어깨를 으쓱했다. "그런가." 물러서지도 굽히지도 않은 것이, 나쁘지 않았다.' },
    { label: '"과연 명성대로시군요. 배우고 싶습니다."', result: '{이름:prince}이 코웃음 쳤다. "…역시." 치켜세우는 말은 그를 더 오만하게 만들 뿐이었다.' },
    { right: 12, mid: 3 },
  ),
  band('prince', 1, '관심 없다는 말', [
    N('{이름:prince}이 사냥 매를 팔에 얹은 채 {왕}을 돌아보았다.'),
    { speaker: 'prince', text: '"이 나라 정치엔 관심 없다고 했을 텐데. …그런데 왜 자꾸 눈에 밟히지?" 스스로도 의아한 낯이었다.' },
  ],
    { label: '"관심 없다면서 그건 왜 묻나."', result: '{이름:prince}이 피식 웃었다. "…말문 막히게 하는군." 되받아치는 상대를, 그는 오래 기억했다.' },
    { label: '"밟히면 치우든지."', result: '{이름:prince}은 잠깐 {왕}을 보았다. "…거참." 굽히지 않는 답이, 그의 심심함을 조금 덜었다.' },
    { label: '"제국의 왕족께서 저를 봐 주시니 영광입니다."', result: '{이름:prince}의 흥미가 식었다. "…또 그 소리." 우러르는 말은 그를 지루하게 했다.' },
    { right: 12, mid: 3 },
  ),
  band('prince', 2, '떠날 수 있는 사람', [
    N('{이름:prince}이 창밖의 말들을 보고 있었다. 떠날 채비가 오늘내일이라는 뜻이었다.'),
    { speaker: 'prince', text: '"나는 언제든 떠날 수 있다. 너는 이 자리에 묶여 있고. …그게 부럽나, 아니면 딱한가?" 시험하는 물음이었다.' },
  ],
    { label: '"묶인 게 아니라 택한 거다. 너와 다르게."', result: '{이름:prince}이 처음으로 웃음기를 지웠다. "…그렇게 말하는 왕은 처음이군." 대등한 자로 마주 선 순간이었다.' },
    { label: '"떠날 수 있는 자만 아는 게 있겠지."', result: '{이름:prince}은 고개를 끄덕였다. "…뭘 좀 아는군." 얕보던 눈에 다른 것이 스쳤다.' },
    { label: '"부럽습니다. 저도 그럴 수 있다면."', result: '{이름:prince}의 눈에 실망이 스쳤다. "…겨우 그 정도인가." 부러워하는 왕을, 그는 다시 얕보았다.' },
    { right: 12, mid: 3 },
  ),
  filler('prince', '스치는 왕족', [
    N('{이름:prince}과 복도에서 마주쳤다. 그는 늘 그렇듯 매인 데 없는 걸음이었다.'),
  ],
    { label: '눈을 피하지 않고 마주 본다', result: '{이름:prince}이 턱을 까딱했다. 굽히지 않는 것이, 그에게는 인사였다.' },
    { label: '가볍게 목례한다', result: '{이름:prince}은 별말 없이 지나쳤다. 그럭저럭이었다.' },
    { label: '먼저 예를 갖춰 고개 숙인다', result: '{이름:prince}이 실소했다. "…됐다." 굽히는 것을 그는 반기지 않았다.' },
    5,
  ),

  // ─────────── ④ hero — 정답: 솔직 (미사여구·치켜세움→비웃음). 대예배당 억류(18~19세) ───────────
  band('hero', 0, '모셔진 사람', [
    N('제단 아래, {이름:hero}이 성검을 등지고 앉아 있었다. {왕}이 다가가도 일어서지 않았다.'),
    { speaker: 'hero', text: '"…또 구경이오? 검이 저기 있으니 실컷 보시오. 나는 덤이고." 냉소가 뼈에 배어 있었다.' },
  ],
    { label: '"검이 아니라 너를 보러 왔다."', result: '{이름:hero}이 처음으로 {왕}을 똑바로 보았다. "…그 말, 진심이면 재밌겠군." 미사여구가 아닌 말은 드물었다.' },
    { label: '"갇힌 기분이 어떤가. 솔직히."', result: '{이름:hero}이 짧게 웃었다. "…솔직하시네. 그건 인정." 에두르지 않는 것이 그의 결이었다.' },
    { label: '"마왕을 베신 영웅을 뵙게 되어 영광입니다."', result: '{이름:hero}이 코웃음 쳤다. "…또 그 소리." 궁정의 언어를, 그는 경멸했다.' },
  ),
  band('hero', 1, '버려졌던 자리', [
    N('{이름:hero}이 제단의 촛농을 손끝으로 긁고 있었다. 지루함과 오래된 분이 섞인 손짓이었다.'),
    { speaker: 'hero', text: '"삼 년을 전선에 처박아 두더니, 이제 와 성물 취급이오. …웃기지 않소?" 궁을 향한 냉소였다.' },
  ],
    { label: '"웃기지 않다. 잘못된 거다. 내가 안다."', result: '{이름:hero}이 손을 멈췄다. "…궁에서 그걸 인정하는 입은 처음이군." 방치를 방치라 부르는 말이, 그를 열었다.' },
    { label: '"나도 이 자리에 갇혀 있다. 종류는 다르지만."', result: '{이름:hero}이 {왕}을 다시 보았다. "…하긴, 왕관도 족쇄지." 처지를 꾸미지 않은 말이었다.' },
    { label: '"교단이 당신을 얼마나 귀히 여기는데요."', result: '{이름:hero}이 낯을 굳혔다. "귀히? …가둬 놓고." 치켜세움은 그의 냉소를 굳혔다.' },
  ),
  band('hero', 2, '줄 사람이 없었다', [
    N('{이름:hero}이 성검을 오래 올려다보았다. 그것을 쥔 손이 아직 제 것인지 확인하듯이.'),
    { speaker: 'hero', text: '"이 검을, 아무한테도 안 줬소. 팔지도 바치지도. …왜 그랬는지 이제야 알겠소." 낮은 목소리였다.' },
  ],
    { label: '"줄 사람이 없었던 거겠지. 지금은 다르고."', result: '{이름:hero}이 {왕}을 오래 보았다. "…어떻게 알았소." 방치의 냉소가 처음으로 풀리는 자리였다.' },
    { label: '"이제 그 손으로 뭘 할지는 네가 정해라."', result: '{이름:hero}이 옅게 웃었다. "…명령이 아니라 그렇게 말하니." 강요하지 않는 말이 그를 움직였다.' },
    { label: '"그 검을 제게 바치시면, 큰 상을 내리겠습니다."', result: '{이름:hero}의 낯이 닫혔다. "…역시 그거였군." 값을 매기는 말은, 그를 가장 멀어지게 했다.' },
  ),
  filler('hero', '제단 아래에서', [
    N('{이름:hero}과 성검 아래에서 잠깐 말을 나눴다. 병사들은 멀찍이 서 있었다.'),
  ],
    { label: '있는 그대로, 짧게 안부를 묻는다', result: '{이름:hero}이 턱을 까딱였다. 꾸밈없는 말은 그에게 편했다.' },
    { label: '가볍게 눈인사한다', result: '{이름:hero}도 눈짓으로 답했다. 그럭저럭이었다.' },
    { label: '"영웅께서는 늘 의연하시군요."', result: '{이름:hero}이 실소했다. "…또." 빈말은 그를 물러서게 했다.' },
  ),

  // ─────────── ⑤ commander — 정답: 존중하며 격 좁힘 (허물기→물러남). 밴드 +8 ───────────
  band('commander', 0, '문 앞의 사람', [
    N('{이름:commander}이 병사들 사이에 있었다. {왕}을 보고 짧게 목례할 뿐, 하던 일을 멈추지 않았다.'),
    { speaker: 'commander', text: '"…명하실 것이 있으십니까, {전하}." 보고체는 늘 반듯했다.' },
  ],
    { label: '"명이 아니라, 그냥 얼굴 보러 왔다."', result: '{이름:commander}의 어깨에서 힘이 조금 빠졌다. 격을 명령이 아니라 사람으로 좁히는 것, 그가 오래 기다린 것이었다.' },
    { label: '반듯하게 격을 갖춰 답한다', result: '{이름:commander}은 예로 답했다. 흐트러짐 없는, 익숙한 거리였다.' },
    { label: '"격식은 됐고, 편하게 대하자."', result: '{이름:commander}은 오히려 한 걸음 물러섰다. "…그럴 수는 없습니다." 격을 억지로 허무는 것은, 그를 불편하게 했다.' },
  ),
  band('commander', 1, '아홉 대의 자리', [
    N('{이름:commander}이 가문의 낡은 갑주를 손질하고 있었다. 아홉 대가 물려 온 것이라 했다.'),
    { speaker: 'commander', text: '"저희 가문은 문 안으로 들지 않습니다. 아홉 대째, 왕의 뒤에 서는 자리를 지킬 뿐입니다." 담담했다.' },
  ],
    { label: '"그 자리를 지켜 줘서 고맙다. 네 몫을 안다."', result: '{이름:commander}이 손을 멈췄다. "…{전하}." 격을 지키되 그 무게를 알아주는 말이, 그에게 닿았다.' },
    { label: '"뒤가 아니라 곁에 서 달라면?"', result: '{이름:commander}은 잠깐 말이 없었다. "…생각해 보겠습니다." 억지가 아닌 청이라, 밀어내지 않았다.' },
    { label: '"그런 낡은 격식은 이제 그만둬라."', result: '{이름:commander}의 낯이 굳었다. "…그 자리가 저를 만듭니다." 격을 부정당하는 것을, 그는 견디지 못했다.' },
  ),
  band('commander', 2, '문 안은, 아직', [
    N('{이름:commander}이 대전 문턱 앞에 섰다. 한 발이면 안인데, 그 한 발을 두고 오래 서 있었다.'),
    { speaker: 'commander', text: '"…아홉 대 중 하나가 왕을 갈아치웠습니다. 그래서 저희는 문 안으로 들지 않습니다. 문 안은… 아직 아닙니다." 그 \'아직\'이 흔들리고 있었다.' },
  ],
    { label: '"그 하나가 너는 아니다. 내가 안다. 들어와라."', result: '{이름:commander}이 오래 {왕}을 보았다. 그리고 한 발을, 문 안으로 들였다. 아홉 대의 거리가 좁혀지는 순간이었다.' },
    { label: '"네가 준비될 때까지 기다리마."', result: '{이름:commander}이 깊이 고개를 숙였다. 재촉하지 않는 것이, 그에게는 신뢰였다.' },
    { label: '"군주의 명이다. 당장 들어와라."', result: '{이름:commander}은 예를 갖춰 물러섰다. "…명이시라면 문 앞을 지키겠습니다." 명령은 그 \'아직\'을 되돌렸다.' },
  ),
  filler('commander', '연무장의 인사', [
    N('{이름:commander}이 병사들 사이에서 {왕}을 보고 짧게 목례했다.'),
  ],
    { label: '"수고가 많다. 네 덕에 든든하다."', result: '{이름:commander}의 낯이 조금 풀렸다. 격 안에서 건네는 인정이, 그에게는 충분했다.' },
    { label: '반듯하게 목례로 답한다', result: '{이름:commander}도 예로 답했다. 익숙한 거리였다.' },
    { label: '"어깨 좀 펴라. 뭐 그리 딱딱하냐."', result: '{이름:commander}은 오히려 자세를 곧추세웠다. 격을 흐트러뜨리려는 말은, 그를 굳혔다.' },
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
