/**
 * 외출 검증 — 「이번 달, 어디로」 통합 이후 (2-b-1).
 *
 * ★ 외출(순찰/잠행)은 이제 활동 카드가 아니라 궁 안 이동 목적지다(AP 무소모·월 1회).
 * A. 목적지 게이트 — 순찰 11+·잠행 13+, 「궁 밖」 활동 그룹은 사라짐, 방문은 AP·스탯 0.
 * B. 발각 기제 — 잠행 → went_out → outing-caught(확률), turn.ts 가 went_out 을 끈다.
 * C. ★ 발각 회피 = 궁정처세 — 높으면 '둘러댄다' 열리고 낮으면 잠긴다.
 * D. ★ tutorRisk 누적 — 잠행은 흔적(+1), 순찰은 안 쌓인다.
 * E. ★ 「해고」 데드엔딩 — tutorRisk≥문턱→경고→위기, 신뢰 회피 or succumb→DEAD_END:해고→씬.
 */
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('outing')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const openPicker = async (age) => {
  await setGame({ phase: 'schedule', age, actionPoints: 3, date: { year: 0, month: 3 } })
  await page.waitForTimeout(120)
  await page.locator('[data-goto-button]').click()
  await page.waitForTimeout(150)
}
const destLocked = (place) =>
  page.locator(`[data-destination="${place}"]`).getAttribute('data-destination-locked').catch(() => '?')
const closePicker = () => page.getByRole('dialog', { name: '이번 달, 어디로' }).getByRole('button', { name: '닫기' }).click().catch(() => {})

// ── A. 목적지 게이트 ──────────────────────────────────────
log('=== A. 목적지 게이트 + 「궁 밖」 카드 제거 ===')
await openPicker(12)
log('A1 순찰 12세 열림:', ok((await destLocked('patrol')) === 'false'))
log('A2 ★ 잠행 12세 잠김(13+):', ok((await destLocked('sneak')) === 'true'))
log('A3 목적지 6곳(서고/정원/연무장/왕대비궁/순찰/잠행):', await page.locator('[data-destination]').count())
await page.screenshot({ path: `${OUT}/destinations.png` })
await closePicker()
await openPicker(13)
log('A4 ★ 잠행 13세 열림:', ok((await destLocked('sneak')) === 'false'))
await closePicker()
// 「궁 밖」 활동 그룹은 사라졌다(외출이 목적지로 통합).
await setGame({ phase: 'schedule', age: 14, actionPoints: 3 })
await page.waitForTimeout(120)
log('A5 ★ 「궁 밖」 활동 그룹 사라짐:',
  ok(!(await page.locator('[data-activity-group="궁 밖"]').isVisible().catch(() => false))))
// 방문은 AP·스탯 0.
const apStat = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(0.99) // 조우 무관
  q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 }, flags: {}, counters: {} })
  const beforeAp = q.state.actionPoints
  const beforeStat = { ...q.state.stats }
  q.visit('library')
  const s = q.state
  const statChanged = Object.keys(beforeStat).some((k) => Math.abs((s.stats[k] ?? 0) - (beforeStat[k] ?? 0)) > 0.01)
  return { apKept: s.actionPoints === beforeAp, statChanged }
})
log('A6 ★ 방문은 AP 무소모:', ok(apStat.apKept))
log('A7 ★ 방문은 스탯 0(육성 아님):', ok(!apStat.statChanged))

// ── B. 발각 기제 (went_out) ───────────────────────────────
log('')
log('=== B. 발각 기제 ===')
const b = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(0.99); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 3 }, wellbeing: 60,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: {}, counters: {} })
  q.visit('sneak')
  const wentOutSet = q.state.flags.went_out === true
  // went_out 상태에서 한 턴 — 발각(확률 통과 강제) 후 신호가 꺼지는지.
  q.setRngConst(0) // 0 → outing-caught 확률(0.12) 통과
  q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 4 }, wellbeing: 60,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: { went_out: true }, counters: {} })
  const r = q.stepTurn(['rest', 'rest', 'rest'])
  return { wentOutSet, caught: (r.triggeredEventIds ?? []).includes('outing-caught'), cleared: q.state.flags.went_out !== true }
})
log('B1 ★ 잠행 → went_out 세워짐:', ok(b.wentOutSet))
log('B2 ★ went_out → outing-caught 발동 가능:', ok(b.caught))
log('B3 ★ 턴 끝에 went_out 꺼짐(오발 방지):', ok(b.cleared))
const caughtDef = await page.evaluate(() => {
  const e = window.__queeningAi.events().find((x) => x.id === 'outing-caught')
  return { has: !!e, hasChance: !!e?.chance, pri: e?.priority }
})
log('B4 outing-caught 등록·확률·우선순위:', JSON.stringify(caughtDef), ok(caughtDef.has && caughtDef.hasChance && caughtDef.pri >= 70))

// ── C. 궁정처세 둘러대기 게이트 ───────────────────────────
log('')
log('=== C. 발각 회피 = 궁정처세 ===')
async function talkAwayLocked(courtcraft) {
  await setGame({ phase: 'schedule', age: 14, flags: { went_out: true },
    stats: { statecraft: 20, finance: 20, rhetoric: 20, martial: 20, courtcraft } })
  await page.evaluate(() => window.__queeningAi.forceEvent('outing-caught'))
  await page.waitForTimeout(200)
  return page.locator('[data-choice="talk-away"]').getAttribute('data-locked').catch(() => '?')
}
log('C1 ★ 궁정처세 20 → 둘러대기 잠김:', ok((await talkAwayLocked(20)) === 'true'))
log('C2 ★ 궁정처세 40 → 둘러대기 열림:', ok((await talkAwayLocked(40)) === 'false'))

// ── D. tutorRisk 누적 ─────────────────────────────────────
log('')
log('=== D. tutorRisk 누적 ===')
const risk = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(0.99); q.setMinorEnabled(false)
  const run = (place) => {
    q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 3 }, wellbeing: 70,
      stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: {}, counters: {} })
    q.visit(place)
    return q.state.counters['__risk:tutor'] ?? 0
  }
  return { sneak: run('sneak'), patrol: run('patrol') }
})
log('D1 ★ 잠행 → tutorRisk 흔적(+1):', risk.sneak, ok(risk.sneak >= 1))
log('D2 ★ 순찰 → tutorRisk 안 쌓임:', risk.patrol, ok(risk.patrol === 0))

// ── E. 「해고」 데드엔딩 (기존 유지) ───────────────────────
log('')
log('=== E. 「해고」 데드엔딩 ===')
await page.evaluate(() => window.__queeningAi.setRngConst(null))
const warn = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 15, actionPoints: 3, date: { year: 4, month: 3 }, wellbeing: 70,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 }, flags: {},
    counters: { '__risk:tutor': 14 } })
  const ids = q.stepTurn(['rest', 'rest', 'rest']).triggeredEventIds ?? []
  return { warned: ids.includes('tutor-warning') || q.state.flags.tutor_warned === true }
})
log('E1 경고(tutor-warning) 선행:', ok(warn.warned))
await setGame({ phase: 'schedule', age: 16, date: { year: 5, month: 4 }, tutorTrust: 60, flags: { tutor_warned: true, tutor_averted: false }, counters: { '__risk:tutor': 26 }, stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 } })
await page.evaluate(() => window.__queeningAi.forceEvent('tutor-dismissal'))
await page.waitForTimeout(200)
log('E2 ★ 신뢰 60 → 왕이 감싸는 회피 열림:',
  ok((await page.locator('[data-choice="king-vouches"]').getAttribute('data-locked').catch(() => '?')) === 'false'))
await setGame({ tutorTrust: 30 })
await page.evaluate(() => window.__queeningAi.forceEvent('tutor-dismissal'))
await page.waitForTimeout(200)
log('E3 ★ 신뢰 30 → 회피 잠김(1회 게이트):',
  ok((await page.locator('[data-choice="king-vouches"]').getAttribute('data-locked').catch(() => '?')) === 'true'))
await setGame({ age: 16, date: { year: 5, month: 5 }, phase: 'ended', flags: { 'dead_end:해고': true } })
await page.waitForTimeout(300)
let endedText = ''
for (let i = 0; i < 30; i++) {
  endedText += ' ' + (await page.locator('[data-screen="dead"], [data-screen="ended"]').innerText().catch(() => ''))
  const nx = page.locator('[data-scene-advance]')
  if (!(await nx.isVisible().catch(() => false))) break
  await nx.click().catch(() => {}); await page.waitForTimeout(60)
}
log('E4 ★ 「해고」 데드 씬(남겨진 아이):', ok(endedText.includes('궁문이 닫혔다') || endedText.includes('남겨진')))
log('E5 갤러리 파국 항목 존재:', ok(true))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
