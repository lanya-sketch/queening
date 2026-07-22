import type { Effect, GameEvent, ResourceKey, StatKey } from '../../types/game'

/**
 * 일상 소소 사건 풀 (월 단위 전환 2단계).
 *
 * ★ 이 배열은 메인 이벤트 루프(EVENTS)에 **들어가지 않는다.** 108턴의 빈 달을
 *   채우는 별도 채널이라, systems/minorEvents.ts 의 스케줄러가 매 턴(빈 달에 한해)
 *   한 번 굴려 이 풀에서 조건 통과분 중 하나를 rng 로 고른다. 손 풀이라 **키가 없어도**
 *   완전히 작동한다(대원칙). AI 돌발은 스케줄러가 확률로 섞는다.
 *
 * ★ 크기: 자잘한 플레이버. ±0.5~1 수준. 활동처럼 MONTH_SCALE 을 곱하지 않는다
 *   (활동만 스케일 대상 — turn.ts scaleByDurability 참고). variance 로 유기적으로.
 *
 * ★ once:false — 다시 뜰 수 있다. 대신 스케줄러가 발동분에 짧은 쿨다운(MINOR.poolCooldown)을
 *   걸어 연달아 같은 게 뜨지 않게 한다. priority 는 안 쓴다(스케줄러가 고르므로).
 */
const stat = (key: StatKey, amount: number, variance = 0): Effect =>
  ({ target: { kind: 'stat', key }, amount, variance })
const res = (key: ResourceKey, amount: number, variance = 0): Effect =>
  ({ target: { kind: 'resource', key }, amount, variance })

export const DAILY_EVENTS: GameEvent[] = [
  // ── 배움의 소소 ──
  {
    id: 'daily-good-book',
    title: '좋은 책',
    text: '서고에서 손에 익는 책 한 권을 만났다. 밤이 짧았다.',
    condition: {}, once: false, category: 'story',
    effects: [stat('statecraft', 0.6, 0.3)],
  },
  {
    id: 'daily-old-document',
    title: '옛 문서',
    text: '먼지 앉은 상소문 한 뭉치. 문장이 눈에 들어오기 시작했다.',
    condition: {}, once: false, category: 'story',
    effects: [stat('statecraft', 0.4, 0.2), stat('rhetoric', 0.3, 0.2)],
  },
  {
    id: 'daily-poem-practice',
    title: '시 한 수',
    text: '운을 맞춰 보다가 저도 모르게 소리 내어 읽었다.',
    condition: {}, once: false, category: 'story',
    effects: [stat('rhetoric', 0.7, 0.3)],
  },
  {
    id: 'daily-ledger-glance',
    title: '장부 한 장',
    text: '창고지기가 흘린 장부를 무심코 들여다보았다. 숫자가 말을 걸었다.',
    condition: { minAge: 13 }, once: false, category: 'story',
    effects: [stat('finance', 0.6, 0.3)],
  },
  {
    id: 'daily-drill-watch',
    title: '연무장 구경',
    text: '병사들의 창끝이 아침 햇살에 번졌다. 한참을 서서 보았다.',
    condition: {}, once: false, category: 'story',
    effects: [stat('martial', 0.6, 0.3)],
  },
  {
    id: 'daily-court-manner',
    title: '궁의 예법',
    text: '늙은 상궁이 옷고름 매는 법을 다시 일러 주었다.',
    condition: {}, once: false, category: 'story',
    effects: [stat('courtcraft', 0.6, 0.3)],
  },
  {
    id: 'daily-overheard-council',
    title: '엿들은 의논',
    text: '문틈으로 대신들의 언성이 새어 나왔다. 무엇을 다투는지 알 것 같았다.',
    condition: { minAge: 14 }, once: false, category: 'story',
    effects: [stat('statecraft', 0.5, 0.2), stat('courtcraft', 0.3, 0.2)],
  },

  // ── 심신의 소소 ──
  {
    id: 'daily-garden-walk',
    title: '정원 산책',
    text: '아무도 부르지 않는 오후. 회랑을 천천히 걸었다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.5)],
  },
  {
    id: 'daily-good-sleep',
    title: '깊은 잠',
    text: '오랜만에 꿈 없이 잤다. 아침이 가벼웠다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.5)],
  },
  {
    id: 'daily-cold',
    title: '감기 기운',
    text: '환절기의 오한. 코끝이 시큰했다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', -1, 0.5)],
  },
  {
    id: 'daily-bad-dream',
    title: '뒤숭숭한 꿈',
    text: '선왕의 얼굴이 흐릿하게 지나갔다. 새벽에 깼다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', -1, 0.5)],
  },
  {
    id: 'daily-sweet-treat',
    title: '수라간의 정성',
    text: '수라간에서 몰래 챙겨 준 다과. 달았다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3), res('tutorTrust', 1, 0.5)],
  },
  {
    id: 'daily-restless',
    title: '잠 못 드는 밤',
    text: '해야 할 일이 자꾸 눈앞에 어른거렸다.',
    condition: { minAge: 15 }, once: false, category: 'story',
    effects: [res('wellbeing', -1, 0.5)],
  },

  // ── 관계·긴장의 소소 ──
  {
    id: 'daily-tutor-talk',
    title: '스승과의 한담',
    text: '수업이 끝난 뒤에도 스승은 자리를 뜨지 않았다. 사소한 이야기가 오래 이어졌다.',
    condition: {}, once: false, category: 'story',
    effects: [res('tutorTrust', 1, 0.5)],
  },
  {
    id: 'daily-regent-gaze',
    title: '섭정의 시선',
    text: '복도 끝에서 섭정공이 잠깐 이쪽을 보았다. 곧 고개를 돌렸다.',
    condition: { minAge: 12 }, once: false, category: 'story',
    effects: [res('regentSuspicion', 1, 0.5)],
  },
  {
    id: 'daily-servant-whisper',
    title: '시종의 귀띔',
    text: '시종 하나가 지나가며 나직이 궁 안의 소문을 흘렸다.',
    condition: { minAge: 12 }, once: false, category: 'story',
    effects: [stat('courtcraft', 0.4, 0.2), res('regentSuspicion', 0.5, 0.5)],
  },
  {
    id: 'daily-kind-word',
    title: '다정한 말',
    text: '누군가 지나가며 건넨 한마디가 하루를 데웠다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3)],
  },
  {
    id: 'daily-cold-shoulder',
    title: '외면',
    text: '인사를 건넸으나 대신은 못 본 척 지나쳤다. 어린 왕에게는 그런 날도 있다.',
    condition: { minAge: 13 }, once: false, category: 'story',
    effects: [res('wellbeing', -0.5, 0.5), res('regentSuspicion', 0.5, 0.5)],
  },

  // ── 궁의 풍경 ──
  {
    id: 'daily-rain',
    title: '긴 비',
    text: '사흘째 비가 내렸다. 처마 끝의 물줄기를 오래 보았다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 0.5, 0.5)],
  },
  {
    id: 'daily-first-snow',
    title: '첫눈',
    text: '옥좌의 뜰에 눈이 얇게 앉았다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3)],
  },
  {
    id: 'daily-festival-noise',
    title: '저잣거리의 풍악',
    text: '담 너머로 백성들의 잔치 소리가 들려왔다. 궁은 조용했다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 0.5, 0.5), stat('rhetoric', 0.2, 0.2)],
  },
  {
    id: 'daily-portrait-gaze',
    title: '선왕의 초상',
    text: '전각에 걸린 아버지의 초상 앞에 오래 머물렀다.',
    condition: { minAge: 13 }, once: false, category: 'story',
    effects: [res('wellbeing', -0.5, 0.5), stat('statecraft', 0.3, 0.2)],
  },
  {
    id: 'daily-map-study',
    title: '지도 앞에서',
    text: '벽에 걸린 강역도를 손끝으로 짚어 갔다. 나라가 이렇게 넓었다.',
    condition: { minAge: 14 }, once: false, category: 'story',
    effects: [stat('statecraft', 0.4, 0.2), stat('martial', 0.3, 0.2)],
  },
  {
    id: 'daily-horse-ride',
    title: '말 위에서',
    text: '오랜만에 고삐를 잡았다. 바람이 뺨을 스쳤다.',
    condition: { minAge: 13 }, once: false, category: 'story',
    effects: [stat('martial', 0.5, 0.3), res('wellbeing', 0.5, 0.3)],
  },
]

export const DAILY_EVENT_IDS = DAILY_EVENTS.map((e) => e.id)
