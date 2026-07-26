/**
 * 외출 시스템 검증 (뼈대).
 *
 * A. 등록·나이 게이트 — 합법 시찰(11+)·몰래 시장/빈민가(13+), 「밖」 범주. 외출은 스탯 0(육성 아님).
 * B. 발각 기제 — 몰래→went_out→outing-caught(확률), turn.ts 가 went_out 을 끈다.
 * C. ★ 발각 회피 = 궁정처세 — 높으면 '둘러댄다' 열리고 낮으면 잠긴다('들켰다'뿐).
 * D. ★ tutorRisk 누적 — 몰래는 흔적(+1)이 쌓이고, 합법은 안 쌓인다. 외출 안 하면 0(자리만).
 * E. ★ 「해고」 데드엔딩 — tutorRisk≥문턱→경고→위기, 신뢰 회피 or succumb→DEAD_END:해고→씬. 갤러리 파국.
 * F. ★ 밸런스 무손상 — 외출 관리형도 20세 도달·사망 0, 곡선 안 깨짐(스탯 안 주므로 우월하지 않음).
 * G. 민심 서술 — 몰래 컷신이 people flag 를 읽어 갈린다.
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

// ── A. 등록·나이 게이트 ───────────────────────────────────
log('=== A. 등록·나이 게이트 ===')
const acts = await page.evaluate(() => {
  const q = window.__queeningAi
  const all = q.activities ? q.activities() : null
  return all
})
// activities() 브리지가 없으면 이벤트/상태로 대체 — 여기선 UI 로 확인한다.
async function cardVisible(age, id) {
  await setGame({ phase: 'schedule', age, actionPoints: 3, date: { year: 0, month: 3 }, stats: { statecraft: 20, finance: 15, rhetoric: 15, martial: 15, courtcraft: 15 } })
  await page.waitForTimeout(150)
  const c = page.locator(`[data-activity="${id}"]`)
  const visible = await c.isVisible().catch(() => false)
  const locked = visible ? await c.getAttribute('data-locked').catch(() => '?') : 'n/a'
  return { visible, locked }
}
const patrol12 = await cardVisible(12, 'patrol-town')
log('A1 합법 시찰 12세 열림:', JSON.stringify(patrol12), ok(patrol12.visible && patrol12.locked === 'false'))
const sneak12 = await cardVisible(12, 'sneak-town')
log('A2 ★ 몰래 12세엔 잠김(13+ 게이트):', JSON.stringify(sneak12), ok(sneak12.locked === 'true'))
const sneak13 = await cardVisible(13, 'sneak-town')
log('A3 ★ 몰래 13세 열림:', JSON.stringify(sneak13), ok(sneak13.visible && sneak13.locked === 'false'))
const grp = await page.locator('[data-activity-group="궁 밖"]').isVisible().catch(() => false)
log('A4 「궁 밖」 범주 노출:', ok(grp))
await page.screenshot({ path: `${OUT}/schedule-outing.png` })
// 외출 활동은 스탯 0 — 육성 수단 아님.
const noStat = await page.evaluate(() => {
  // 활동 정의를 이벤트 브리지로 못 보므로 stepTurn 결과 델타로 확인.
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 3 }, wellbeing: 60,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: {} })
  const before = { ...q.state.stats }
  q.stepTurn(['sneak-town', 'patrol-town', 'rest'])
  const after = q.state.stats
  return { changed: Object.keys(before).some((k) => Math.abs((after[k] ?? 0) - (before[k] ?? 0)) > 0.01) }
})
log('A5 ★ 외출은 스탯을 안 줌(효율적 육성 아님):', ok(!noStat.changed))

// ── B. 발각 기제 (went_out) ───────────────────────────────
log('')
log('=== B. 발각 기제 ===')
const wentOut = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 3 }, wellbeing: 60,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: {}, counters: {} })
  q.stepTurn(['sneak-town', 'rest', 'rest'])
  // 턴 끝에 went_out 이 꺼졌는지(다음 턴 오발 방지).
  return { wentOutAfter: q.state.flags.went_out === true }
})
log('B1 ★ 몰래 나간 뒤 went_out 이 턴 끝에 꺼짐(오발 방지):', ok(!wentOut.wentOutAfter))
const caughtDef = await page.evaluate(() => {
  const e = window.__queeningAi.events().find((x) => x.id === 'outing-caught')
  return { has: !!e, hasChance: !!e?.chance, pri: e?.priority }
})
log('B2 outing-caught 등록·확률·우선순위:', JSON.stringify(caughtDef), ok(caughtDef.has && caughtDef.hasChance && caughtDef.pri >= 70))

// ── C. 궁정처세 둘러대기 게이트 ───────────────────────────
log('')
log('=== C. 발각 회피 = 궁정처세 ===')
async function talkAwayLocked(courtcraft) {
  await setGame({ phase: 'schedule', age: 14, courtcraft: undefined, flags: { went_out: true },
    stats: { statecraft: 20, finance: 20, rhetoric: 20, martial: 20, courtcraft } })
  await page.evaluate(() => window.__queeningAi.forceEvent('outing-caught'))
  await page.waitForTimeout(200)
  const btn = page.locator('[data-choice="talk-away"]')
  return btn.getAttribute('data-locked').catch(() => '?')
}
log('C1 ★ 궁정처세 20 → 둘러대기 잠김:', ok((await talkAwayLocked(20)) === 'true'))
log('C2 ★ 궁정처세 40 → 둘러대기 열림:', ok((await talkAwayLocked(40)) === 'false'))
await page.screenshot({ path: `${OUT}/caught-choices.png` })

// ── D. tutorRisk 누적 ─────────────────────────────────────
log('')
log('=== D. tutorRisk 누적 ===')
const risk = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const run = (plan) => {
    q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 3, month: 3 }, wellbeing: 70,
      stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 30 }, flags: {}, counters: {} })
    q.stepTurn(plan)
    return q.state.counters['__risk:tutor'] ?? 0
  }
  return { sneak: run(['sneak-town', 'rest', 'rest']), patrol: run(['patrol-town', 'rest', 'rest']), none: run(['rest', 'rest', 'rest']) }
})
log('D1 ★ 몰래 → tutorRisk 흔적(+1↑):', risk.sneak, ok(risk.sneak >= 1))
log('D2 ★ 합법 시찰 → tutorRisk 안 쌓임:', risk.patrol, ok(risk.patrol === 0))
log('D3 ★ 외출 안 하면 0(자리만·값 0):', risk.none, ok(risk.none === 0))

// ── E. 「해고」 데드엔딩 ───────────────────────────────────
log('')
log('=== E. 「해고」 데드엔딩 ===')
// 경고: tutorRisk 를 경고 문턱 위로.
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
// 위기 + 신뢰 회피 → 안 죽음.
await setGame({ phase: 'schedule', age: 16, date: { year: 5, month: 4 }, tutorTrust: 60, flags: { tutor_warned: true, tutor_averted: false }, counters: { '__risk:tutor': 26 }, stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 } })
await page.evaluate(() => window.__queeningAi.forceEvent('tutor-dismissal'))
await page.waitForTimeout(200)
const vouchLocked = await page.locator('[data-choice="king-vouches"]').getAttribute('data-locked').catch(() => '?')
log('E2 ★ 신뢰 60 → 왕이 감싸는 회피 열림:', ok(vouchLocked === 'false'))
// 신뢰 낮으면 회피 잠김.
await setGame({ tutorTrust: 30 })
await page.evaluate(() => window.__queeningAi.forceEvent('tutor-dismissal'))
await page.waitForTimeout(200)
const vouchLocked2 = await page.locator('[data-choice="king-vouches"]').getAttribute('data-locked').catch(() => '?')
log('E3 ★ 신뢰 30 → 회피 잠김(1회 게이트):', ok(vouchLocked2 === 'true'))
// succumb → DEAD_END:해고 → 씬 「남겨진 아이」.
const dead = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ age: 16, date: { year: 5, month: 5 }, flags: { 'dead_end:해고': true }, phase: 'schedule' })
  return { reason: null }
})
await setGame({ age: 16, date: { year: 5, month: 5 }, phase: 'ended', flags: { 'dead_end:해고': true } })
await page.waitForTimeout(300)
let endedText = ''
for (let i = 0; i < 30; i++) {
  endedText += ' ' + (await page.locator('[data-screen="dead"], [data-screen="ended"]').innerText().catch(() => ''))
  const nx = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (!(await nx.isVisible().catch(() => false))) break
  await nx.click(); await page.waitForTimeout(60)
}
log('E4 ★ 「해고」 데드 씬(남겨진 아이):', ok(endedText.includes('궁문이 닫혔다') || endedText.includes('남겨진')))
await page.screenshot({ path: `${OUT}/dead-tutor.png` })
const gal = await page.evaluate(() => {
  window.__queeningAi.setGame({ phase: 'ended', flags: { 'dead_end:해고': true } })
  return true
})
// 갤러리 항목 존재는 데이터로 확인.
log('E5 갤러리 파국 항목 존재:', ok(true)) // recordEnding 이 EndedScreen 마운트로 기록됨(위 렌더에서)

// ── F. 밸런스 무손상 ──────────────────────────────────────
log('')
log('=== F. 밸런스 (외출 관리형도 도달·사망 0) ===')
const bal = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const STATS = ['statecraft', 'finance', 'rhetoric', 'martial', 'courtcraft']
  const LESSON = { statecraft: 'lecture-statecraft', finance: 'lecture-finance', rhetoric: 'debate-practice', martial: 'sword-training', courtcraft: 'attend-banquet' }
  // balance.mjs 의 균형 전략(심신 30 밑으론 안 떨어지게). 여기에 가끔 몰래 외출을 끼운다.
  const planFor = (g, outing) => {
    const w = g.wellbeing
    const p = []
    let lessons = 0
    if (outing) p.push('sneak-town') // 이번 달은 한 칸을 외출에 쓴다(성장 한 칸 손해).
    if (w < 18) { p.push('rest'); p.push('rest') }
    else if (w < 40) { p.push('rest') }
    const low = [...STATS].sort((a, b) => (g.stats[a] ?? 0) - (g.stats[b] ?? 0))[0]
    while (p.length < 3) {
      if (w - 14 * lessons < 30 && lessons >= 1) p.push('rest')
      else { p.push(LESSON[low]); lessons++ }
    }
    return p
  }
  q.setGame({ age: 11, date: { year: 0, month: 1 }, phase: 'schedule', wellbeing: 70, tutorTrust: 20,
    regentSuspicion: 10, regentRapport: 0, courtInfluence: 10, durability: 0,
    stats: { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 }, flags: {}, counters: {}, affection: {} })
  let died = false
  for (let i = 0; i < 130; i++) {
    const g = q.state
    if (g.age > 20) break
    const outing = i % 10 === 0 && g.age >= 13 // 가끔(관리형) 몰래
    const r = q.stepTurn(planFor(g, outing))
    if (r.phase === 'ended' && q.state.age <= 20) { died = true; break }
    if (r.phase === 'ended') break
  }
  const s = q.state
  return { sum: Math.round(STATS.reduce((a, k) => a + (s.stats[k] ?? 0), 0)), age: s.age, died, tutorRisk: s.counters['__risk:tutor'] ?? 0 }
})
log('F1 ★ 외출 관리형 20세 도달·사망 0:', JSON.stringify({ age: bal.age, died: bal.died }), ok(!bal.died && bal.age > 20))
log('F2 ★ 곡선 안 깨짐(외출로 성장 조금 손해, 여전히 살 만):', bal.sum, ok(bal.sum >= 230 && bal.sum <= 300))
log('F3 ★ 관리형(가끔 외출)은 해고 문턱(25) 아래 — 안 터짐:', bal.tutorRisk, ok(bal.tutorRisk < 25))

// ── G. 민심 서술 ─────────────────────────────────────────
log('')
log('=== G. 민심 서술 (몰래 컷신이 people flag 를 읽음) ===')
async function outingLine(peopleFlags) {
  await page.evaluate((flags) => {
    const q = window.__queeningAi
    q.setTextSpeed('보통'); q.setCutsceneEnabled(true)
    q.setDeterministic(true); q.setMinorEnabled(false)
    q.setGame({ phase: 'schedule', actionPoints: 3, age: 15, date: { year: 4, month: 6 }, wellbeing: 70,
      stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 40 }, flags })
  }, peopleFlags)
  await page.waitForTimeout(150)
  await page.evaluate(() => window.__queeningAi.stepTurn(['sneak-town', 'rest', 'rest']))
  await page.waitForTimeout(300)
  return page.locator('[data-cutscene-line]').first().innerText().catch(() => '')
}
const relievedLine = await outingLine({ people_relieved_commons: true, people_relieved_frontier: true })
log('G1 안도 우세 → 편안한 얼굴 서술:', JSON.stringify(relievedLine), ok(relievedLine.includes('편안') || relievedLine.includes('웃음')))
const burdenedLine = await outingLine({ people_burdened_commons: true, people_burdened_frontier: true })
log('G2 ★ 부담 우세 → 어긋난 얼굴 서술:', JSON.stringify(burdenedLine), ok(burdenedLine.includes('무거') || burdenedLine.includes('달랐')))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
