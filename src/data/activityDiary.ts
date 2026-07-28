import type { DiaryEntry } from '../types/game'
import type { PrefRelation } from '../systems/parenting'
import { ACTIVITY_BY_ID } from './activities'

/**
 * 날짜별 컷신의 활동 서술 (표현 층 전용).
 *
 * ★ 튜터 시점, 짧게 한 줄, 지금 서사 톤(건조·관찰자적). 수치는 안 나온다 — 서술로만 비친다.
 * ★ 서술이 갈리는 근거는 이미 있는 것만: 수업 등급 / 심신 / 내구도(숨은 값) / 롤 운 / 나이 / 기질.
 * ★ 나이·상황 불일치 0건 — 특정 나이를 문장에 박지 않는다. 나이차는 ageMin 조건으로만 가른다.
 *
 * 대표 활동(통치학·검술·휴식)으로 톤을 잡고, 나머지는 이름+심신 톤의 fallback 으로 확장한다.
 * (12개 활동 전부의 조건별 문구를 다 만들면 분량이 5배가 되므로 절제 — 후속 확장 여지.)
 */
export interface DiaryContext {
  tier: string | null
  wellbeing: number
  durability: number
  age: number
  luck: DiaryEntry['luck']
  temperamentId: string | null
  /** 민심 — people_relieved_ / people_burdened_ flag 의 균형. 외출 서술이 읽는다("장부가 아니라 얼굴"). */
  peopleMood: 'relieved' | 'burdened' | 'mixed'
  /** ★ [2] 이 활동이 이 아이가 원하는 것이었는지(선호 일치). */
  preferenceMatch?: PrefRelation
}

interface Line {
  tier?: string
  wLow?: boolean // 심신 < 40
  wHigh?: boolean // 심신 >= 70
  durLow?: boolean // 내구도 < 10 (숨은 값 — "몸이 아직 여리다")
  luck?: 'good' | 'bad'
  ageMin?: number
  temperament?: string
  mood?: 'relieved' | 'burdened' // 민심 조건(외출 서술용)
  text: string
}

// ★ 첫 매치가 이긴다 — 구체적인 조건(기질·등급·운)을 위에, 일반적인 것을 아래에 둔다.
//   ★ 기질 문구는 **잘 맞는 조합에만** 절제해서 둔다(12활동×5기질을 다 만들지 않는다).
//     그 밖은 등급·심신·운·나이 + 아래 fallback 으로 충분하다.
const LINES: Record<string, Line[]> = {
  'lecture-statecraft': [
    { temperament: 'bright', tier: '초급', text: '영민한 아이답게 첫 장을 금세 짚었다. 다만 아직 얕다.' },
    { wLow: true, text: '눈이 자꾸 감겼다. 글자가 겉돌기만 하는 하루였다.' },
    { luck: 'good', text: '오늘은 이상하리만치 머리가 맑았다. 어려운 대목이 술술 풀렸다.' },
    { luck: 'bad', text: '같은 줄을 세 번 읽었다. 영 손에 잡히지 않는 날이었다.' },
    { tier: '고급', text: '이제는 선례를 스스로 엮어 낸다. 가르칠 것이 줄어 간다.' },
    { tier: '중급', text: '제법 는다. 묻는 말에 뜸을 덜 들인다.' },
    { text: '역대 직령과 선례를 함께 읽었다. 아직은 더듬는다.' },
  ],
  'lecture-finance': [
    { wLow: true, text: '숫자가 자꾸 겹쳐 보였다. 장부가 원망스러운 하루였다.' },
    { luck: 'good', text: '어긋난 셈 하나를 스스로 찾아냈다. 창고지기의 얼굴이 하얗게 질렸다.' },
    { tier: '고급', text: '이제 장부 한 장으로 곳간의 형편을 읽는다.' },
    { tier: '중급', text: '숫자가 말을 걸기 시작했다.' },
    { text: '국고의 장부를 넘겨 보았다. 아직 숫자가 낯설다.' },
  ],
  'debate-practice': [
    { wLow: true, text: '말문이 자꾸 막혔다. 머릿속만큼 혀가 따르지 않는 날이었다.' },
    { luck: 'good', text: '되받아치는 말이 날카로웠다. 스승도 잠깐 말을 잃었다.' },
    { tier: '고급', text: '이제 어전에서 말이 막히는 일이 없다.' },
    { text: '문답을 주고받았다. 아직은 뜸이 길다.' },
  ],
  'sword-training': [
    { temperament: 'robust', text: '몸이 먼저 움직였다. 검이 손에 붙은 아이다.' },
    { durLow: true, text: '목검 무게에 손목이 휘청였다. 몸이 아직 여리다.' },
    { wHigh: true, text: '몸이 가벼웠다. 목검이 바람을 갈랐다.' },
    { wLow: true, text: '팔이 무거웠다. 자세가 자꾸 무너지는 날이었다.' },
    { luck: 'good', text: '오늘따라 손끝이 정확했다. 사범이 처음으로 고개를 끄덕였다.' },
    { ageMin: 17, text: '이제 위병들과 겨뤄도 쉬 밀리지 않는다.' },
    { text: '연무장에서 목검을 잡았다. 아직은 흉내에 가깝다.' },
  ],
  'attend-banquet': [
    { temperament: 'cunning', text: '누가 누구에게 웃는지, 그 웃음이 진짜인지 — 아이는 자리를 읽고 있었다.' },
    { wLow: true, text: '사람들의 말소리가 웅웅거렸다. 웃는 낯을 짓는 것만도 힘겨웠다.' },
    { tier: '고급', text: '이제 아이가 좌중을 다룬다. 누구를 언제 세울지 안다.' },
    { text: '연회의 자리에 섰다. 어른들 틈에서 아직 어색하다.' },
  ],
  'royal-hunt': [
    { temperament: 'robust', text: '말을 몰아 앞장섰다. 사냥터가 제 세상인 아이다.' },
    { wLow: true, text: '몸이 무거워 뒤로 처졌다. 사냥이 즐겁지 않은 날이었다.' },
    { text: '사냥 대회에 나섰다. 말 위의 바람이 좋았다.' },
  ],
  'cede-affairs': [
    { text: '정무를 숙부께 넘겼다. 오늘은 아이의 손을 거친 것이 하나도 없다.' },
  ],
  'secret-correspondence': [
    { luck: 'bad', text: '밀서를 쓰는 손이 떨렸다. 누가 볼까, 밤이 길었다.' },
    { text: '숙부를 거치지 않고 변경에 글을 보냈다. 위험한 줄 알면서.' },
  ],
  play: [
    { text: '오랜만에 아이답게 놀았다. 이런 시간이 아이를 지킨다.' },
  ],
  // ── 궁 밖 — 합법(꾸민 얼굴) vs 몰래(맨얼굴). 민심 flag 를 읽어 "장부가 아니라 얼굴"을 본다.
  'patrol-town': [
    { text: '길은 미리 쓸려 있었다. 사람들이 왕을 알아보고 고개를 숙였다. 잘 차려진 겉이었다.' },
  ],
  'sneak-town': [
    { mood: 'relieved', text: '왕인 줄 모르는 얼굴들이 편안했다. 저잣거리의 웃음이 장부의 숫자와 어긋나지 않았다.' },
    { mood: 'burdened', text: '왕인 줄 모르고 하는 말들이 무거웠다. 장부의 숫자와 저잣거리의 얼굴이 달랐다.' },
    { text: '남루한 옷으로 저잣거리에 섞였다. 웃는 이도, 한숨짓는 이도 있었다 — 장부에는 없는 얼굴들.' },
  ],
  'sneak-slum': [
    { mood: 'burdened', text: '장부에 안 적히는 얼굴들이 거기 있었다. 보고 나니 그날 밤 잠이 얕았다.' },
    { text: '성 그늘의 뒷골목. 그래도 사람들은 살아가고 있었다. 아는 것과 모르는 것은 다르다.' },
  ],
  rest: [
    { wLow: true, text: '오랜만에 푹 잤다. 그동안 무리했던 모양이다.' },
    { durLow: true, text: '하루를 온전히 쉬게 했다. 어린 몸에는 이런 날이 약이다.' },
    { text: '아무것도 하지 않는 하루를 보냈다. 이런 날도 있어야 한다.' },
  ],
}

function matches(l: Line, c: DiaryContext): boolean {
  if (l.tier && l.tier !== c.tier) return false
  if (l.wLow && !(c.wellbeing < 40)) return false
  if (l.wHigh && !(c.wellbeing >= 70)) return false
  if (l.durLow && !(c.durability < 10)) return false
  if (l.luck && l.luck !== c.luck) return false
  if (l.ageMin !== undefined && c.age < l.ageMin) return false
  if (l.temperament && l.temperament !== c.temperamentId) return false
  if (l.mood && l.mood !== c.peopleMood) return false
  return true
}

/** 활동명(컷신 헤더용). */
export function activityName(activityId: string): string {
  return ACTIVITY_BY_ID[activityId]?.name ?? '어떤 일'
}

/** 그날의 한 줄. 대표 활동은 조건별 문구, 나머지는 이름+심신 톤 fallback. */
export function diaryLine(activityId: string, c: DiaryContext): string {
  const name = activityName(activityId)
  // ★ [2] 감기·비선호는 그달 서술을 지배한다 — 부정 신호는 활동 고유 문구보다 앞선다.
  //   (감기 <20 은 피로 <40 보다 낮은 별개 밴드 — 피로 문구를 덮지 않는다.)
  if (c.wellbeing < 20) return `${name}. 감기 기운에 좀처럼 집중하지 못했다.`
  if (c.preferenceMatch === 'dislike') return `${name}을 시켰다. 내내 내키지 않는 얼굴이었다.`
  // ★ 긍정 선호(wish/like)는 활동 고유 문구(기질·등급)를 **덮지 않는다** — 그 문구가 이미
  //   "잘 맞는다"를 전한다(영민+통치학·강건+검술). 고유 문구가 없을 때만 fallback 으로 뜬다.
  const lines = LINES[activityId]
  if (lines) {
    for (const l of lines) if (matches(l, c)) return l.text
  }
  if (c.preferenceMatch === 'wish') return `${name} — 요즘 이 아이가 바라던 것이다. 유난히 열심이었다.`
  if (c.preferenceMatch === 'like') return `오늘 ${name}에는 제법 열심이었다.`
  if (c.wellbeing < 40) return `${name}으로 하루를 보냈다. 지친 몸으로 겨우 해냈다.`
  if (c.luck === 'good') return `${name}으로 하루를 보냈다. 뜻밖에 잘 풀린 하루였다.`
  if (c.wellbeing >= 70) return `${name}으로 하루를 보냈다. 몸도 마음도 가벼웠다.`
  return `${name}으로 하루를 보냈다.`
}
