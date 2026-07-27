/**
 * 시작 기질 검증 (바이블 M2b-0 예약 항목).
 *
 * A. 데이터 — 5 기질, 스탯 총합(균형·영민·강건·영악=41 / 여린=38), 여린 신뢰 30, 심신·내구도 미포함.
 * B. 인트로 적용 — 기질 선택 시 시작 스탯·신뢰가 심어지고 flag temperament_<id> 설정.
 * C. ★ 여린 신뢰 우위 — clamp 상한 예외로 11세에 신뢰 30 이 20 으로 안 잘린다(균형은 20).
 * D·E. ★ 데드 안전 + 밸런스 — 각 기질 관리형 플레이로 20세 도달(사망 0), 최종 5스탯 합 250~300.
 * F. ★ 루트 열림 — 최악 시작(강건 궁정 1)도 성장으로 미스터리 게이트(궁정 55)에 닿는다.
 * G. 인트로 흐름 — 서사→성별/이름→기질→온보딩, 375px 무오버플로.
 */
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('temperament')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// ── A. 데이터 ─────────────────────────────────────────────
log('=== A. 기질 데이터 ===')
const temps = await page.evaluate(() => window.__queeningAi.temperaments())
const byId = Object.fromEntries(temps.map((t) => [t.id, t]))
log('A1 5 기질 등록:', temps.map((t) => t.name).join(', '), ok(temps.length === 5))
const sums = Object.fromEntries(temps.map((t) => [t.id, t.statSum]))
log('A2 균형·영민·강건·영악 스탯합 41:', JSON.stringify(sums),
  ok(['balanced', 'bright', 'robust', 'cunning'].every((id) => sums[id] === 41)))
log('A3 ★ 여린 스탯합 38(−3):', sums.tender, ok(sums.tender === 38))
log('A4 ★ 여린 신뢰 30 / 나머지 20:', temps.map((t) => t.tutorTrust).join(','),
  ok(byId.tender.tutorTrust === 30 && ['balanced', 'bright', 'robust', 'cunning'].every((id) => byId[id].tutorTrust === 20)))
log('A5 ★ 심신·내구도는 안 건드림(스탯 5개만):',
  ok(temps.every((t) => Object.keys(t.stats).length === 5 && !('wellbeing' in t.stats) && !('durability' in t.stats))))

// ── B. 인트로 적용 ────────────────────────────────────────
log('')
log('=== B. 인트로에서 기질 선택 → 시작값·flag ===')
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: '건너뛰기' }).click().catch(() => {})
await page.waitForTimeout(150)
await page.getByRole('button', { name: /왕이 될 소년/ }).click()
await page.waitForTimeout(120)
await page.getByRole('button', { name: '다음' }).click() // 정체성 → 기질
await page.waitForTimeout(200)
const tempScreen = await page.getByText('어떤 아이였는가').isVisible().catch(() => false)
log('B1 기질 선택 화면 진입:', ok(tempScreen))
await page.locator('[data-temperament="cunning"]').click() // 영악
await page.waitForTimeout(150)
await page.screenshot({ path: `${OUT}/intro-temperament.png` })
await page.getByRole('button', { name: '다음', exact: true }).click() // 기질 → 인연
await page.waitForTimeout(150)
await page.getByRole('button', { name: '그대로 시작' }).click() // 인연 → 온보딩
await page.waitForTimeout(200)
await page.getByRole('button', { name: '건너뛰기' }).click().catch(() => {})
await page.waitForTimeout(250)
const applied = await page.evaluate(() => {
  const g = window.__queeningAi.state
  return { stats: g.stats, trust: g.tutorTrust, flag: g.flags.temperament_cunning === true }
})
log('B2 ★ 영악 시작 스탯 심어짐(궁정11·재정12·통치5):',
  JSON.stringify(applied.stats),
  ok(applied.stats.courtcraft === 11 && applied.stats.finance === 12 && applied.stats.statecraft === 5))
log('B3 ★ flag temperament_cunning 설정:', ok(applied.flag))

// ── C. 여린 신뢰 우위 (clamp 상한 예외) ────────────────────
log('')
log('=== C. 여린 신뢰 우위 — 11세 상한(20) 위 유지 ===')
const trust = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false)
  const run = (startTrust) => {
    q.setGame({ age: 11, date: { year: 0, month: 1 }, tutorTrust: startTrust, wellbeing: 70,
      stats: { statecraft: 11, finance: 8, rhetoric: 9, martial: 6, courtcraft: 4 }, flags: {}, phase: 'schedule',
      plannedActivityIds: [] })
    // rest 는 tutorTrust +1 을 준다 → 11세(상한 20)에서 clamp 를 실제로 태운다.
    q.stepTurn(['rest', 'rest', 'rest'])
    return q.state.tutorTrust
  }
  return { tender: run(30), balanced: run(20) }
})
log('C1 ★ 여린(신뢰 30)이 11세에 20 으로 안 잘림:', trust.tender, ok(trust.tender === 30))
log('C2 균형(신뢰 20)은 상한 20 그대로:', trust.balanced, ok(trust.balanced === 20))
log('C3 ★ 여린이 실제 신뢰 우위(> 균형):', ok(trust.tender > trust.balanced))

// ── D·E. 데드 안전 + 밸런스 (각 기질 관리형 11→20) ─────────
log('')
log('=== D·E. 데드 안전 + 20세 곡선 (관리형 플레이) ===')
const results = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false)
  const LESSON = { statecraft: 'lecture-statecraft', finance: 'lecture-finance', rhetoric: 'debate-practice', martial: 'sword-training', courtcraft: 'attend-banquet' }
  const STATS = ['statecraft', 'finance', 'rhetoric', 'martial', 'courtcraft']
  // ★ balance.mjs 의 균형 전략을 그대로 옮긴다(3AP 를 채우되 심신 30 밑으론 안 떨어지게 휴식).
  const planFor = (g) => {
    const w = g.wellbeing
    const p = []
    let lessons = 0
    if (w < 18) { p.push('rest'); p.push('rest') }
    else if (w < 40) { p.push('rest') }
    const low = [...STATS].sort((a, b) => (g.stats[a] ?? 0) - (g.stats[b] ?? 0))[0]
    while (p.length < 3) {
      if (w - 14 * lessons < 30 && lessons >= 1) p.push('rest')
      else { p.push(LESSON[low]); lessons++ }
    }
    return p
  }
  const presets = window.__queeningAi.temperaments()
  const out = {}
  for (const t of presets) {
    q.setGame({ age: 11, date: { year: 0, month: 1 }, phase: 'schedule', wellbeing: 70, tutorTrust: t.tutorTrust,
      regentSuspicion: 10, regentRapport: 0, courtInfluence: 10, durability: 0,
      stats: { ...t.stats }, flags: {}, affection: {}, counters: {}, plannedActivityIds: [] })
    let died = false
    for (let i = 0; i < 130; i++) {
      const g = q.state
      if (g.age > 20) break
      const r = q.stepTurn(planFor(g))
      if (r.phase === 'ended' && q.state.age <= 20) { died = true; break }
      if (r.phase === 'ended') break
    }
    const s = q.state
    out[t.id] = { sum: Math.round(STATS.reduce((a, k) => a + (s.stats[k] ?? 0), 0)), age: s.age, died }
  }
  return out
})
for (const [id, r] of Object.entries(results)) {
  log(`   ${id}: 20세 5스탯합 ${r.sum} · 도달나이 ${r.age} · 사망 ${r.died}`,
    ok(!r.died && r.age > 20 && r.sum >= 250 && r.sum <= 300))
}
log('D1 ★ 모든 기질 사망 0(여린 포함):', ok(Object.values(results).every((r) => !r.died)))
log('E1 ★ 모든 기질 20세 곡선 250~300:', ok(Object.values(results).every((r) => r.sum >= 250 && r.sum <= 300)))

// ── F. 루트 열림 (최악 시작도 성장으로 게이트에 닿음) ──────
log('')
log('=== F. 루트 열림 — 강건(궁정 1)도 궁정 게이트(55)에 닿음 ===')
const grow = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false)
  const robust = window.__queeningAi.temperaments().find((t) => t.id === 'robust')
  q.setGame({ age: 11, date: { year: 0, month: 1 }, phase: 'schedule', wellbeing: 70, tutorTrust: 20,
    stats: { ...robust.stats }, flags: {}, affection: {}, counters: {}, plannedActivityIds: [] })
  let peak = 0
  for (let i = 0; i < 120; i++) {
    if (q.state.age > 20) break
    const plan = q.state.wellbeing < 40 ? ['rest', 'rest', 'rest'] : ['attend-banquet', 'rest', 'rest']
    q.stepTurn(plan)
    peak = Math.max(peak, q.state.stats.courtcraft ?? 0)
  }
  return { start: robust.stats.courtcraft, peak: Math.round(peak) }
})
log('F1 ★ 강건 궁정 1에서 시작해도 성장으로 55+ 도달(궁정 게이트 안 막힘):',
  `시작 ${grow.start} → 정점 ${grow.peak}`, ok(grow.peak >= 55))

// ── G. 인트로 375px ───────────────────────────────────────
log('')
log('=== G. 인트로 375px ===')
const mp = await browser.newPage({ viewport: { width: 375, height: 812 } })
await mp.goto(APP_URL, { waitUntil: 'networkidle' })
await mp.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await mp.reload({ waitUntil: 'networkidle' })
await mp.waitForTimeout(250)
await mp.getByRole('button', { name: '새 게임' }).click()
await mp.waitForTimeout(150)
await mp.getByRole('button', { name: '건너뛰기' }).click().catch(() => {})
await mp.waitForTimeout(150)
await mp.getByRole('button', { name: /왕이 될 소년/ }).click()
await mp.waitForTimeout(120)
await mp.getByRole('button', { name: '다음' }).click()
await mp.waitForTimeout(200)
const of = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('G1 기질 화면 375px 무오버플로:', `${of.sw}/${of.iw}`, ok(of.sw <= of.iw))
await mp.screenshot({ path: `${OUT}/temperament-375.png` })
await mp.close()

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
