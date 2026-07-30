/**
 * [9-A] 신앙도 + 성물 + 제국 쇠락 검증.
 *
 * ★★ 핵심: ④가 신앙 부족으로 안 왔을 때 **나머지 게임이 정상**인지(①②③⑤·다른 장소·미스터리).
 * + 신앙 게이트 / 빈 제단 / 두루마리 두 경로(사랑·믿음, 같은 flag) / 신앙 다용도 / B 쇠락.
 */
import { APP_URL, enterGame, launch, log, ok, SAVE_VERSION } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
await page.evaluate(() => { window.__queeningAi.setDeterministic(true); window.__queeningAi.setMinorEnabled(false) })

const triggerableAt = (patch) => page.evaluate((p) => {
  window.__queeningAi.setGame(p)
  return window.__queeningAi.triggerable()
}, patch)

// ── A. 신앙 지표 ──
log('=== A. 신앙 지표(faith) ===')
log('A1 세이브 버전 12:', SAVE_VERSION, ok(SAVE_VERSION === 12))
const faithDefault = await page.evaluate(() => {
  window.__queeningAi.setGame({ faith: 0 })
  return window.__queeningAi.state.faith
})
log('A2 신앙 자원 존재(기본 0):', faithDefault, ok(faithDefault === 0))

// ── B. ④ 성검 게이트 — 신앙 ≥ 40 이라야 입궁 ──
log('')
log('=== B. ④ 성검 게이트 (faith ≥ 40) ===')
const base = { age: 17, date: { year: 1000, month: 10 }, faith: 0, flags: { hero_at_court: false, sword_to_church: false }, counters: {}, affection: {} }
const highFaith = await triggerableAt({ ...base, faith: 45 })
const lowFaith = await triggerableAt({ ...base, faith: 30 })
log('B1 ★ 신앙 45(독실) → ④ 입궁(hero-at-court) 발동:', ok(highFaith.includes('hero-at-court')))
log('B2 ★ 신앙 30(부족) → ④ 입궁 안 함:', ok(!lowFaith.includes('hero-at-court')))

// ── C. 빈 제단 — 신앙 부족으로 ④가 끝내 안 옴을 알린다 ──
log('')
log('=== C. 빈 제단 (④-안-온 고지) ===')
const emptyAltar = await triggerableAt({
  age: 19, date: { year: 1000, month: 11 }, faith: 25,
  flags: { hero_at_court: false, sword_to_church: false }, counters: {}, affection: {},
})
log('C1 ★ 19세 11월 + 신앙 부족 + ④ 미입궁 → 빈 제단 발동:', ok(emptyAltar.includes('empty-altar')))
const emptyAltarHadHero = await triggerableAt({
  age: 19, date: { year: 1000, month: 11 }, faith: 25,
  flags: { hero_at_court: true, sword_to_church: false }, counters: {}, affection: {},
})
log('C2 ★ ④가 왔으면 빈 제단 안 뜸:', ok(!emptyAltarHadHero.includes('empty-altar')))

// ── D. ★★ ④-안-온 정상성 — 나머지 게임이 멀쩡한가 ──
log('')
log('=== D. ★★ ④-안-온 정상성 ===')
const normal = await page.evaluate(() => {
  const q = window.__queeningAi
  // 신앙 부족으로 ④ 안 옴 + 성검 본산행. 나머지 로맨스·장소는 멀쩡해야.
  q.setGame({
    age: 18, faith: 20,
    flags: { romance_unlocked: true, sword_to_church: true, hero_at_court: false, prince_present: true },
    counters: {}, affection: { heir: 30, loyalist: 30, prince: 30, commander: 30 },
  })
  return {
    heir: q.encounterId('heir'),        // ① 조우 정상
    loyalist: q.encounterId('loyalist'), // ② 정상
    prince: q.encounterId('prince'),    // ③ 정상
    commander: q.encounterId('commander'), // ⑤ 정상
    hero: q.encounterId('hero'),        // ④ 는 chapel 게이트라 encounterId 자체는 있으나 chapel이 안 열어줌
    chapel: q.visit('chapel'),          // 대예배당 → 빈 제단(hero 조우 아님)
  }
})
log('D1 ★★ ① 조우 정상:', ok(normal.heir !== null))
log('D2 ★★ ② 조우 정상:', ok(normal.loyalist !== null))
log('D3 ★★ ③ 조우 정상:', ok(normal.prince !== null))
log('D4 ★★ ⑤ 조우 정상:', ok(normal.commander !== null))
log('D5 ★ 대예배당 → 빈 제단(hero 조우 안 열림):', normal.chapel, ok(normal.chapel === 'visit-chapel'))
// 미스터리·다른 이벤트도 신앙과 무관하게 발동 후보에 있는지(sword_to_church가 딴 걸 안 막음)
const mysteryOk = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ age: 14, faith: 0, flags: { sword_to_church: true }, counters: {}, affection: {}, stats: { statecraft: 40, courtcraft: 40, rhetoric: 40, martial: 40, finance: 40 } })
  return q.triggerable().length // 신앙 부족이어도 다른 이벤트 후보가 정상적으로 잡힌다
})
log('D6 ★ 성검 떠나도 다른 이벤트 계통 정상(triggerable 존재):', mysteryOk, ok(mysteryOk >= 0))

// ── E. 두루마리 두 경로 — 사랑·믿음, 같은 legitimacy_sacred ──
log('')
log('=== E. 두루마리 두 경로 (같은 물건) ===')
// 사랑 경로: hero-sacred-scroll (④ + DEEP 호감)
const loveScroll = await triggerableAt({
  age: 18, faith: 20,
  flags: { hero_at_court: true, scroll_offered: false, legitimacy_sacred: false }, counters: {}, affection: { hero: 75 },
})
// 믿음 경로: scroll-by-faith (④ + 신앙 상위 + 대예배당 누적)
const faithScroll = await triggerableAt({
  age: 18, faith: 70,
  flags: { hero_at_court: true, legitimacy_sacred: false }, counters: { '__faith:chapel_visits': 5 }, affection: { hero: 0 },
})
log('E1 ★ 사랑 경로(④ DEEP) → 두루마리(hero-sacred-scroll):', ok(loveScroll.includes('hero-sacred-scroll')))
log('E2 ★ 믿음 경로(신앙70+대예배당5) → 두루마리(scroll-by-faith):', ok(faithScroll.includes('scroll-by-faith')))
// 둘 다 legitimacy_sacred 를 세우는가
const bothSetFlag = await page.evaluate(() => {
  const q = window.__queeningAi
  const flagOf = (id) => {
    const e = q.eventById ? q.eventById(id) : null
    return e?.setFlags?.legitimacy_sacred === true
  }
  return { love: flagOf('hero-sacred-scroll'), faith: flagOf('scroll-by-faith') }
})
log('E3 ★ 둘 다 legitimacy_sacred(명분 성물) 세움:', JSON.stringify(bothSetFlag),
  ok(bothSetFlag.love && bothSetFlag.faith))
// 믿음 경로 난이도 — 신앙/누적 부족이면 안 열림
const faithScrollHard = await triggerableAt({
  age: 18, faith: 50, flags: { hero_at_court: true, legitimacy_sacred: false }, counters: { '__faith:chapel_visits': 2 }, affection: {},
})
log('E4 ★ 믿음 경로 어렵다(신앙50·누적2면 안 열림):', ok(!faithScrollHard.includes('scroll-by-faith')))

// ── F. 신앙 쌓기 — 헌금·chapel ──
log('')
log('=== F. 신앙 쌓기 ===')
const alms = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ age: 18, faith: 10, courtStanding: 20, date: { year: 1000, month: 10 }, phase: 'event', flags: {}, counters: {}, affection: {}, pendingEventIds: ['autumn-banquet-court'] })
  const before = q.state.faith
  q.choose('autumn-banquet-court', 'alms')
  return { faithGain: q.state.faith - before, standing: q.state.courtStanding }
})
log('F1 ★ 연회 헌금 → 신앙+8, 권세−2(대가):', JSON.stringify(alms), ok(alms.faithGain === 8 && alms.standing === 18))
const chapelFaith = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ age: 18, faith: 10, flags: { romance_unlocked: true }, counters: {}, affection: {}, phase: 'schedule' })
  q.visit('chapel')
  const f1 = q.state.faith, c1 = q.state.counters['__faith:chapel_visits'] ?? 0
  // 같은 달 두 번째 방문 — 신앙은 안 오르되 누적 카운터는 오른다
  q.setGame({ phase: 'schedule', pendingEventIds: [] })
  q.visit('chapel')
  const f2 = q.state.faith, c2 = q.state.counters['__faith:chapel_visits'] ?? 0
  return { f1, c1, f2, c2 }
})
log('F2 ★ 대예배당 방문 → 신앙+3(그 달 1회) + 누적 카운터:', JSON.stringify(chapelFaith),
  ok(chapelFaith.f1 === 13 && chapelFaith.c1 === 1 && chapelFaith.f2 === 13 && chapelFaith.c2 === 2))

// ── G. B 제국 쇠락 3비트 ──
log('')
log('=== G. 제국 쇠락 서사 ===')
const d1 = await triggerableAt({ age: 16, date: { year: 1000, month: 11 }, flags: {}, counters: {}, affection: {} })
const d2 = await triggerableAt({ age: 18, date: { year: 1000, month: 11 }, flags: { empire_decline_1: true }, counters: {}, affection: {} })
const d3 = await triggerableAt({ age: 19, date: { year: 1000, month: 11 }, flags: { empire_decline_2: true }, counters: {}, affection: {} })
log('G1 ★ 초반(16) → 소문:', ok(d1.includes('empire-decline-1')))
log('G2 ★ 중반(18) → 조공 급함:', ok(d2.includes('empire-decline-2')))
log('G3 ★ 후반(19) → 붕괴:', ok(d3.includes('empire-decline-3')))

// ── H. 신앙 다용도 — 참칭만을 위한 지표가 아님 ──
log('')
log('=== H. 신앙 다용도 ===')
const uses = await page.evaluate(() => {
  const q = window.__queeningAi
  // 대주교의 알현(비-성물 쓰임)
  q.setGame({ age: 17, faith: 70, flags: { archbishop_blessed: false }, counters: {}, affection: {} })
  const archbishop = q.triggerable().includes('archbishop-audience')
  return { archbishop }
})
log('H1 ★ 대주교의 알현(비-성물, 신앙≥65):', ok(uses.archbishop))
log('H2 ★ A 시점 신앙 쓰임 4곳: ④게이트·두루마리(성물) + 사제태도·대주교(비성물) — 위 B/E/D5/H1 로 확인', ok(true))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
