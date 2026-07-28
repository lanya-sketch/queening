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
    text: '먼지 앉은 청원서 한 뭉치. 문장이 눈에 들어오기 시작했다.',
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
    text: '늙은 시녀장이 예복의 매듭 여미는 법을 다시 일러 주었다.',
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
    title: '주방의 정성',
    text: '주방에서 몰래 챙겨 준 과자. 달았다.',
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
    // ★ "어린 왕" 전제라 나이 상한을 둔다 — 성년(16 데뷔탕트) 뒤엔 안 뜬다.
    condition: { minAge: 13, maxAge: 15 }, once: false, category: 'story',
    effects: [res('wellbeing', -0.5, 0.5), res('regentSuspicion', 0.5, 0.5)],
  },

  // ── 궁의 풍경 ──
  {
    id: 'daily-rain',
    title: '긴 비',
    text: '사흘째 비가 내렸다. 처마 끝의 물줄기를 오래 보았다.',
    // ★ 계절감(월 단위 전환 후속) — 장마는 여름(6월)에.
    condition: { month: 6 }, once: false, category: 'story',
    effects: [res('wellbeing', 0.5, 0.5)],
  },
  {
    id: 'daily-first-snow',
    title: '첫눈',
    text: '옥좌의 뜰에 눈이 얇게 앉았다.',
    // ★ 계절감 — 첫눈은 겨울(12월)에.
    condition: { month: 12 }, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3)],
  },
  // ── 계절 행사 (서양 중세 왕국 — 동양 소재 금지) ────────────
  // ★ 계절이 도는 게 느껴지도록 봄·여름·가을·겨울 대표 행사를 하나씩. 축제는 특정 달이라
  //   month 단일 조건이 자연스럽다. 규모는 작게(±0.5~1) — "그 계절이구나" 정도.
  {
    id: 'daily-spring-thaw',
    title: '봄맞이',
    text: '성 밖 들녘에서 파종이 시작됐다는 전갈이 올라왔다. 언 땅이 풀리고, 궁에도 볕이 길어졌다.',
    condition: { month: 3 }, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3)],
  },
  {
    id: 'daily-midsummer-bonfire',
    title: '하지의 불놓이',
    text: '한여름 밤, 강가에 백성들이 불을 피워 올렸다. 담 너머로 그 불빛이 오래 흔들렸다.',
    condition: { month: 6 }, once: false, category: 'story',
    effects: [res('wellbeing', 0.5, 0.5), stat('courtcraft', 0.3, 0.2)],
  },
  {
    // ★ [2] 풍작 — 수확철 민심 안도. AI 없이도 people_relieved_ 가 쌓이는 경로(수치 영향 0·서술만).
    id: 'daily-harvest-feast',
    title: '수확제',
    text: '성 앞 광장에 추수를 기리는 잔치가 섰다. 곳간이 차는 계절이라, 백성의 얼굴에도 웃음이 돌았다.',
    condition: { month: 9 }, once: false, category: 'story',
    effects: [res('wellbeing', 0.6, 0.3), stat('rhetoric', 0.3, 0.2)],
    setFlags: { people_relieved_harvest: true },
  },
  {
    // ★ [2] 흉작 — 수확이 시원찮은 해. people_burdened_ 를 쌓는다(수치 영향 0·서술만).
    //   month 9 에서 수확제와 함께 후보가 되어, 해마다 둘 중 하나가 갈려 뜬다.
    id: 'daily-harvest-poor',
    title: '마른 수확',
    text: '곳간이 예년만 못했다. 광장의 잔치는 조촐했고, 겨울을 걱정하는 낯빛이 오갔다.',
    condition: { month: 9 }, once: false, category: 'story',
    effects: [res('wellbeing', -0.4, 0.3)],
    setFlags: { people_burdened_harvest: true },
  },
  {
    id: 'daily-winter-mass',
    title: '성탄 미사',
    text: '한 해의 끝, 대성당의 종이 울리고 미사가 열렸다. 왕도 그 자리에 서서 백성과 같은 기도를 올렸다.',
    condition: { month: 12 }, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.3), stat('courtcraft', 0.3, 0.2)],
  },
  {
    id: 'daily-festival-noise',
    title: '거리의 노랫소리',
    text: '담 너머로 백성들의 잔치 소리가 들려왔다. 궁은 조용했다.',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 0.5, 0.5), stat('rhetoric', 0.2, 0.2)],
  },
  {
    id: 'daily-portrait-gaze',
    title: '선왕의 초상',
    text: '회랑에 걸린 아버지의 초상 앞에 오래 머물렀다.',
    condition: { minAge: 13 }, once: false, category: 'story',
    effects: [res('wellbeing', -0.5, 0.5), stat('statecraft', 0.3, 0.2)],
  },
  {
    id: 'daily-map-study',
    title: '지도 앞에서',
    text: '벽에 걸린 지도를 손끝으로 짚어 갔다. 나라가 이렇게 넓었다.',
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
  // ── 유년기 인물감 (실플레이 피드백: 11~12세에 사람이 안 나온다) ──
  // ★ 스프라이트 없는 텍스트 소소 — 노귀족·모브. 궁이 살아 있다는 감각을 채운다.
  //   섭정공·모후의 위화감 씬은 별도(events/childhood.ts, once·스프라이트).
  {
    id: 'daily-old-noble',
    title: '옛 신하의 방문',
    // ★ 노귀족만 크롭(얼굴)을 얹는다 — 온보딩의 그 사람이라는 것을 얼굴로 잇는다.
    //   모브(아래 시녀장·기사·서기)는 portrait 없이 텍스트로만 둔다(스프라이트 정책).
    portrait: 'old_noble',
    text:
      '온보딩의 그 노귀족이 이따금 들른다. 오늘도 선왕 이야기를 한 조각 흘리고 갔다.\n' +
      '"선왕께서는 이 회랑을 좋아하셨지요. …그분을 닮으셨습니다, 눈매가."',
    condition: {}, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.5), res('tutorTrust', 1, 0.5)],
  },
  {
    id: 'daily-chamberlain',
    title: '시녀장의 잔소리',
    text: '시녀장이 옷매무새를 고쳐 주며 낮게 잔소리를 했다. 궁이 아이 하나를 키우고 있었다.',
    // ★ "아이 하나를 키우고" 전제 — 성년 뒤엔 안 맞는다(20세에 뜨던 버그).
    condition: { maxAge: 15 }, once: false, category: 'story',
    effects: [res('wellbeing', 1, 0.5)],
  },
  {
    id: 'daily-training-yard',
    title: '연무장의 기사들',
    text: '연무장 난간에 기대 기사들의 대련을 구경했다. 검이 부딪는 소리가 오래 남았다.',
    condition: { minAge: 12 }, once: false, category: 'story',
    effects: [stat('martial', 0.5, 0.3), res('wellbeing', 0.5, 0.3)],
  },
  {
    id: 'daily-clerk-slip',
    title: '서기의 실수',
    text: '서기가 장부를 넘기다 한 장을 빠뜨렸다. 아무도 눈치채지 못했고, 아이만 보았다.',
    // ★ "아이만 보았다" 전제 — 성년 뒤엔 안 뜬다.
    condition: { minAge: 12, maxAge: 15 }, once: false, category: 'story',
    effects: [stat('finance', 0.5, 0.3)],
  },
]

export const DAILY_EVENT_IDS = DAILY_EVENTS.map((e) => e.id)
