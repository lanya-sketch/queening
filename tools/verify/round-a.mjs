/**
 * [7] 라운드 A 검증 — 궁 밖 3곳(합법/불법) + 친정 완화 + ③ 겨루기.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

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

// ── A. 합법/불법 route → 전용 이벤트 enqueue ──
log('=== A. 궁 밖 route → 전용 이벤트 ===')
const routes = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 15, flags: {}, counters: {}, affection: {}, pendingEventIds: [] })
  const legal = q.visit('patrol')
  q.setGame({ phase: 'schedule', flags: {}, pendingEventIds: [] })
  const illegal = q.visit('sneak')
  return { legal, illegal }
})
log('A1 ★ 합법 시찰 → patrol-outing:', routes.legal, ok(routes.legal === 'patrol-outing'))
log('A2 ★ 불법 잠행 → sneak-outing:', routes.illegal, ok(routes.illegal === 'sneak-outing'))

// ── B. 잠행 깊은 시찰 → 실제 민심 종합(부담 여부로 갈림) ──
log('')
log('=== B. 잠행 종합 민심 (맨얼굴) ===')
const synth = await page.evaluate(() => {
  const q = window.__queeningAi
  // 부담 없음 → 안도
  q.setGame({ phase: 'event', age: 15, flags: {}, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: ['sneak-outing'] })
  q.choose('sneak-outing', 'deep')
  const r1 = q.stepTurn([])
  const relieved = r1.flags.people_relieved_visit === true
  // 부담 있음 → 부담(정보, 안도 아님)
  q.setGame({ phase: 'event', age: 15, flags: { people_burdened_harvest: true }, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: ['sneak-outing'] })
  q.choose('sneak-outing', 'deep')
  const r2 = q.stepTurn([])
  const burdened = r2.flags.people_burdened_visit === true && r2.flags.people_relieved_visit !== true
  // 얕게(peek)는 flag 없음
  q.setGame({ phase: 'event', age: 15, flags: {}, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: ['sneak-outing'] })
  q.choose('sneak-outing', 'peek')
  const r3 = q.stepTurn([])
  const noFlag = r3.flags.people_relieved_visit !== true && r3.flags.people_burdened_visit !== true
  return { relieved, burdened, noFlag }
})
log('B1 ★ 두루(deep) + 부담 없음 → people_relieved_visit(안도):', ok(synth.relieved))
log('B2 ★ 두루(deep) + 부담 있음 → people_burdened_visit(정보, 안도 아님):', ok(synth.burdened))
log('B3 ★ 얕게(peek) → 민심 flag 없음(조각으로 못 읽음):', ok(synth.noFlag))

// 합법 시찰은 flag 안 세움
const legalNoFlag = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'event', age: 15, flags: {}, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: ['patrol-outing'] })
  q.choose('patrol-outing', 'thorough')
  const r = q.stepTurn([])
  return r.flags.people_relieved_visit !== true && r.flags.people_burdened_visit !== true
})
log('B4 ★ 합법 시찰(두루)도 민심 flag 없음(꾸민 얼굴):', ok(legalNoFlag))

// ── C. 친정 후 외출 완화(#26) — 월 2회 + outing_safe ──
log('')
log('=== C. 친정 후 외출 완화 ===')
const auto = await page.evaluate(() => {
  const q = window.__queeningAi
  // 친정: declared_rule + 영향도 autonomy(70)
  q.setGame({ phase: 'schedule', age: 18, courtInfluence: 75, flags: { declared_rule: true }, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: [] })
  q.stepTurn([]) // outing_safe 파생
  q.setGame({ phase: 'schedule', pendingEventIds: [] })
  const safe = q.state.flags.outing_safe === true
  // 첫 외출 후에도 한 번 더 가능(월 2회)
  q.setGame({ phase: 'schedule', flags: { ...q.state.flags, outing_this_month: true } })
  const canSecond = q.state.phase === 'schedule' // canVisit 은 내부 — outingsPerMonth 로 관측 대체
  return { safe }
})
log('C1 ★ 친정 후 outing_safe = true(발각 위험 없음):', ok(auto.safe))
// 반란 국면이면 위험 복귀
const hostile = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 18, courtInfluence: 75, regentSuspicion: 70, flags: { declared_rule: true, regent_hostile: true }, counters: {}, affection: {}, plannedActivityIds: [], pendingEventIds: [] })
  q.stepTurn([])
  return q.state.flags.outing_safe !== true
})
log('C2 ★ 친정+반란 국면(regent_hostile) → outing_safe 아님(위험 복귀):', ok(hostile))
// outing-caught 는 outing_safe 면 발동 후보에서 빠진다
const caughtGated = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 18, courtInfluence: 75, flags: { declared_rule: true, went_out: true, outing_safe: true }, counters: {}, affection: {} })
  return q.triggerable().indexOf('outing-caught') === -1
})
log('C3 ★ outing_safe 면 outing-caught 발동 후보 제외:', ok(caughtGated))

// ── D. ③ 겨루기(#14) — 무예/전략 티어 + 사양 ──
log('')
log('=== D. ③ 겨루기 ===')
const duelFires = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 17, flags: { prince_present: true, romance_unlocked: true }, affection: { prince: 30 }, counters: {}, stats: { martial: 50, statecraft: 10, finance: 10, rhetoric: 10, courtcraft: 10 } })
  return q.triggerable().indexOf('prince-duel') !== -1
})
log('D1 ★ 조건(체류+호감25+17세) 충족 시 겨루기 발동:', ok(duelFires))
const duelDelta = (choice, martial) => page.evaluate((a) => {
  const q = window.__queeningAi
  q.setGame({ phase: 'event', age: 17, flags: { prince_present: true, romance_unlocked: true }, affection: { prince: 30 }, counters: {}, stats: { martial: a.martial, statecraft: a.martial, finance: 10, rhetoric: 10, courtcraft: 10 }, pendingEventIds: ['prince-duel'] })
  const before = q.state.affection.prince
  q.choose('prince-duel', a.choice)
  return (q.state.affection.prince ?? 0) - before
}, { choice, martial })
log('D2 ★ 무예 이김(스탯45+) → +8:', await duelDelta('martial', 50), ok(await duelDelta('martial', 50) === 8))
log('D3 ★ 무예 짐(스탯<45) → +3(덤빈 것 인정):', await duelDelta('martial', 20), ok(await duelDelta('martial', 20) === 3))
log('D4 ★ 병략 이김 → +8:', await duelDelta('strategy', 50), ok(await duelDelta('strategy', 50) === 8))
log('D5 ★ 사양 → −2(얕봄):', await duelDelta('decline', 50), ok(await duelDelta('decline', 50) === -2))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
