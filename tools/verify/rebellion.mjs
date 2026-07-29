/**
 * 회유 복구 + 권세 신설 + 반란 모의 + 스탯 상한 검증 ([3] A+C 통합).
 *
 * A. 권세(權勢) — 재가 계수(f=0.5+권세/100), 쌓임/깎임 경로, 숨김(게이지·카드 델타 없음).
 * B. 연례 가을 연회 — 10월 강제 발동(연령대별) + 권세 형세 insight.
 * C. 담판 재설계 — 판세 충족→regent_retired / 미달→애매한 동맹 / 친정 후엔 담판·결렬 안 열림(ablation B1).
 * D. ★★ 공존 엔딩 — regent_retired(또는 동맹) + 영향도 45~69, ★ ① 로맨스 없이. 이번 핵심 판정.
 * E. 반란 + 권세 — 권세 강하면 느리게 끓고(문턱↑), 위기에서 '조정으로 진압'(court_backing). 관리형 안 죽음.
 * F. UI 무력화 — regent_retired 시 섭정 의심/신망 게이지 dim + "위협 소멸".
 * G. 스탯 상한 — 100 도달 수업 카드 잠김.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

// ── A. 권세 ──
log('=== A. 권세(權勢) ===')
const A = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const decreeGain = (standing) => {
    q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, courtInfluence: 40, courtStanding: standing, wellbeing: 80,
      stats: { statecraft: 50, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }, flags: {}, counters: {} })
    const before = q.state.courtInfluence
    q.stepTurn(['direct-decree', 'rest', 'rest'])
    return q.state.courtInfluence - before
  }
  const low = decreeGain(10)   // f=0.6 → +1.8 (이벤트 없으면)
  const high = decreeGain(90)  // f=1.4 → +4.2
  // 쌓임/깎임
  const standingDelta = (plan) => {
    q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, courtStanding: 40, wellbeing: 80,
      stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }, flags: {}, counters: {} })
    const b = q.state.courtStanding
    q.stepTurn(plan)
    return q.state.courtStanding - b
  }
  const banquet = standingDelta(['attend-banquet', 'rest', 'rest'])
  const cede = standingDelta(['cede-affairs', 'rest', 'rest'])
  return { low, high, banquet, cede }
})
log('A1 ★ 재가 계수 — 권세 높을수록 실권 전환 큼:', JSON.stringify({ low: +A.low.toFixed(2), high: +A.high.toFixed(2) }),
  ok(A.high > A.low + 1))
log('A2 ★ 연회는 권세를 쌓는다(+):', +A.banquet.toFixed(1), ok(A.banquet > 0))
log('A3 ★ 정무 위임은 권세를 깎는다(−):', +A.cede.toFixed(1), ok(A.cede < 0))
// 숨김 — 사이드바에 권세 막대 없음
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 16, courtStanding: 60 }))
await page.waitForTimeout(150)
log('A4 ★ 권세 게이지 숨김(사이드바 막대 없음):',
  ok(!(await page.locator('[data-gauge="courtStanding"]').count().then((c) => c > 0))))
log('A5 ★ 재가 카드에 권세 델타 안 뜸(숨은 지표):', await page.evaluate(() => {
  const card = document.querySelector('[data-activity="direct-decree"]')
  return !(card?.innerText ?? '').includes('권세')
}))

// ── B. 연례 가을 연회 ──
log('')
log('=== B. 연례 가을 연회 (10월 강제) ===')
const B = await page.evaluate(() => {
  const q = window.__queeningAi
  const at = (age) => {
    q.setGame({ phase: 'schedule', age, date: { year: age - 11, month: 10 }, courtStanding: 20, flags: {}, counters: {} })
    return q.triggerable()
  }
  return { child: at(12).includes('autumn-banquet-child'), youth: at(15).includes('autumn-banquet-youth'), court: at(18).includes('autumn-banquet-court') }
})
log('B1 11~13세 「첫 가을 연회」:', ok(B.child))
log('B2 14~16세 「사교의 계절」:', ok(B.youth))
log('B3 17~19세 「형세를 가르는 밤」:', ok(B.court))

// ── C. 담판 재설계 ──
log('')
log('=== C. 담판 재설계 (판세·친정 전 게이트) ===')
const C = await page.evaluate(() => {
  const q = window.__queeningAi
  const base = {
    phase: 'schedule', age: 18, date: { year: 7, month: 11 }, regentRapport: 60, regentSuspicion: 30, courtInfluence: 55,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 }, counters: {},
  }
  // 판세 충족(하원+민심) + 친정 전 → retire 담판
  q.setGame({ ...base, courtStanding: 20, flags: { house_commons_defended: true, people_relieved_a: true, people_relieved_b: true, people_favor: true, tide_turned: true } })
  const retireOpen = q.triggerable().includes('adult-regent-accord-retire')
  const fallbackWhenTide = q.triggerable().includes('adult-regent-accord')
  // 판세 미달 → fallback 담판
  q.setGame({ ...base, courtStanding: 20, flags: { tide_turned: false } })
  const fallbackOpen = q.triggerable().includes('adult-regent-accord')
  const retireWhenNoTide = q.triggerable().includes('adult-regent-accord-retire')
  // 친정 후(declared_rule) → 담판·결렬 안 열림 (ablation B1 근본해결)
  q.setGame({ ...base, regentSuspicion: 90, courtInfluence: 80, courtStanding: 20, flags: { declared_rule: true, tide_turned: true } })
  const t = q.triggerable()
  const gatedOut = !t.includes('adult-regent-accord') && !t.includes('adult-regent-accord-retire') && !t.includes('adult-regent-rupture')
  // 친정 전 결렬은 열림(대조)
  q.setGame({ ...base, regentSuspicion: 90, courtInfluence: 30, flags: { declared_rule: false } })
  const ruptureOpenPre = q.triggerable().includes('adult-regent-rupture')
  return { retireOpen, fallbackWhenTide, fallbackOpen, retireWhenNoTide, gatedOut, ruptureOpenPre }
})
log('C1 ★ 판세 충족 → 「명예로운 퇴장」 열림:', ok(C.retireOpen))
log('C2 ★ 판세 충족 시 fallback 배타(안 열림):', ok(!C.fallbackWhenTide))
log('C3 ★ 판세 미달 → 애매한 동맹(fallback) 열림, retire 배타:', ok(C.fallbackOpen && !C.retireWhenNoTide))
log('C4 ★★ 친정 후 담판·결렬 전부 안 열림 (ablation B1 근본해결):', ok(C.gatedOut))
log('C5 친정 전 결렬은 열림(대조):', ok(C.ruptureOpenPre))
// retire 선택 → regent_retired
await page.evaluate(() => window.__queeningAi.setGame({
  phase: 'schedule', age: 18, date: { year: 7, month: 11 }, regentRapport: 60, regentSuspicion: 30, courtInfluence: 55,
  stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 },
  flags: { house_commons_defended: true, people_favor: true, tide_turned: true }, counters: {},
}))
await page.evaluate(() => window.__queeningAi.forceEvent('adult-regent-accord-retire'))
await page.waitForTimeout(200)
await page.locator('[data-scene-advance]').click().catch(() => {})
await page.waitForTimeout(150)
await page.locator('[data-choice="retire"]').click().catch(() => {})
await page.waitForTimeout(200)
log('C6 ★ 「물러나게 한다」 → regent_retired:', ok(await page.evaluate(() => window.__queeningAi.state.flags.regent_retired === true)))

// ── D. ★★ 공존 엔딩 (①없이) ──
log('')
log('=== D. ★★ 공존 엔딩 (① 로맨스 없이) ===')
const D = await page.evaluate(() => {
  const base = { courtInfluence: 55, regentSuspicion: 30, stats: { statecraft: 50, finance: 40, rhetoric: 40, martial: 40, courtcraft: 40 }, affection: { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 } }
  const retired = window.__queeningAi.judgeEnding({ ...base, flags: { regent_retired: true, regent_alliance: true } })
  const allianceOnly = window.__queeningAi.judgeEnding({ ...base, flags: { regent_alliance: true } })
  const none = window.__queeningAi.judgeEnding({ ...base, flags: {} })
  return { retired: { t: retired.tier, d: retired.disposal }, alliance: { t: allianceOnly.tier, d: allianceOnly.disposal }, noneD: none.disposal }
})
log('D1 ★★ regent_retired + 영향도55(①없이) → 공존/회유:', JSON.stringify(D.retired), ok(D.retired.t === '공존' && D.retired.d === '회유'))
log('D2 애매한 동맹도 회유(하위 결과):', JSON.stringify(D.alliance), ok(D.alliance.t === '공존' && D.alliance.d === '회유'))
log('D3 회유 없으면 못함(대조):', D.noneD, ok(D.noneD === '못함'))

// ── E. 반란 + 권세 ──
log('')
log('=== E. 반란 + 권세 ===')
const E = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const accum = (standing) => {
    q.setGame({ phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 90, courtStanding: standing, wellbeing: 70,
      stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }, flags: { declared_rule: true }, counters: {} })
    q.stepTurn(['rest', 'rest', 'rest'])
    return q.state.counters['__risk:rebellion'] ?? 0
  }
  const weak = accum(10)    // 권세 낮음 → 문턱 85, 의심 90 ≥ → 쌓임
  const strong = accum(60)  // 권세 강함 → 문턱 100, 의심 90 < → 안 쌓임
  return { weak, strong }
})
log('E1 ★ 권세 약하면 반란 누적:', E.weak, ok(E.weak > 0))
log('E2 ★ 권세 강하면 느리게(문턱↑, 안 쌓임):', E.strong, ok(E.strong === 0))
// suppress-standing choice
await page.evaluate(() => window.__queeningAi.setGame({
  phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 90, courtStanding: 60, wellbeing: 70,
  stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 20, courtcraft: 30 },
  flags: { declared_rule: true, rebellion_averted: false, court_backing: true }, counters: { '__risk:rebellion': 15 },
}))
await page.evaluate(() => window.__queeningAi.forceEvent('rebellion-strike'))
await page.waitForTimeout(200)
await page.locator('[data-scene-advance]').click().catch(() => {})
await page.waitForTimeout(150)
log('E3 ★ 권세 보유 → 「조정으로 진압」 열림:',
  ok((await page.locator('[data-choice="suppress-standing"]').getAttribute('data-locked').catch(() => '?')) === 'false'))
// 관리형 안 죽음 — 친정 후 명예 부여로 의심(반란 모의)을 낮게 관리하면 암살·반란 둘 다 안 옴
const E4 = await page.evaluate(() => {
  const q = window.__queeningAi; q.setDeterministic(true); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 17, courtInfluence: 80, regentSuspicion: 90, courtStanding: 60, wellbeing: 70,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 20, courtcraft: 30 }, flags: { declared_rule: true }, counters: {} })
  let died = false, deadReason = null
  for (let i = 0; i < 30; i++) {
    if (q.state.age > 20) break
    const r = q.stepTurn(['honor-regent', 'honor-regent', 'rest'])
    if (r.phase === 'ended' && q.state.age <= 20) { died = true; deadReason = Object.keys(q.state.flags).find((k) => k.startsWith('dead_end:')); break }
  }
  return { died, deadReason }
})
log('E4 ★ 친정+명예 관리 → 암살·반란 안 죽음:', JSON.stringify(E4), ok(!E4.died))

// ── F. UI 무력화 ──
log('')
log('=== F. regent_retired UI 무력화 ===')
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 18, courtInfluence: 60, regentSuspicion: 40, flags: { regent_retired: true } }))
await page.waitForTimeout(200)
log('F1 ★ 섭정 의심 게이지 무력화 표시:',
  ok((await page.locator('[data-gauge="regentSuspicion"]').getAttribute('data-neutralized').catch(() => null)) === 'true'))
log('F2 ★ "위협 소멸" 문구:', ok((await page.evaluate(() => document.body.innerText)).includes('위협 소멸')))

// ── H. regent_hostile 래치 (관리형 중립 / 방치형 결렬) ──
log('')
log('=== H. 친정 후 섭정 적대 래치 (문턱 60) ===')
const H = await page.evaluate(() => {
  const q = window.__queeningAi; q.setDeterministic(true); q.setMinorEnabled(false)
  const run = (susStart, plan) => {
    q.setGame({ phase: 'schedule', age: 17, courtInfluence: 80, regentSuspicion: susStart, courtStanding: 20, wellbeing: 80,
      stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }, flags: { declared_rule: true }, counters: {} })
    for (let i = 0; i < 4; i++) q.stepTurn(plan)
    return q.state.flags.regent_hostile === true
  }
  const neglected = run(90, ['rest', 'rest', 'rest'])       // 방치 — 의심 90 ≥ 60 → 래치
  const managed = run(40, ['honor-regent', 'honor-regent', 'honor-regent'])  // 관리 — 의심 40 < 60 → 중립
  return { neglected, managed }
})
log('H1 ★ 방치형(의심 높음) → 결렬 래치:', ok(H.neglected))
log('H2 ★ 관리형(의심 낮게 유지) → 중립:', ok(!H.managed))

// ── I. 암살 (반란 전 단계) ──
log('')
log('=== I. 암살 (경고 5 → 암살 9 → 반란 15) ===')
const I = await page.evaluate(() => {
  const q = window.__queeningAi
  const setup = (counter, extra) => q.setGame({ phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 90, wellbeing: 70,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 20, courtcraft: 30 },
    flags: { declared_rule: true, assassin_resolved: false, rebellion_averted: false, ...extra }, counters: { '__risk:rebellion': counter } })
  setup(9, {})
  const at9 = q.triggerable()
  setup(5, {})
  const at5 = q.triggerable()
  return {
    warnFirst: at5.includes('rebellion-warning') && !at5.includes('assassination-attempt') && !at5.includes('rebellion-strike'),
    assassinAt9: at9.includes('assassination-attempt'),
    rebellionNotYet: !at9.includes('rebellion-strike'),
  }
})
log('I1 ★ 순서 — counter 5 는 경고만(암살·반란 아직):', ok(I.warnFirst))
log('I2 ★ counter 9 → 암살 발동:', ok(I.assassinAt9))
log('I3 ★ counter 9 엔 반란(15) 아직 안 옴:', ok(I.rebellionNotYet))
// 대비 있으면 회피(증거) — 무예 40
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 90, wellbeing: 70,
  stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 40, courtcraft: 30 },
  flags: { declared_rule: true, assassin_resolved: false }, counters: { '__risk:rebellion': 9 } }))
await page.evaluate(() => window.__queeningAi.forceEvent('assassination-attempt'))
await page.waitForTimeout(200)
await page.locator('[data-scene-advance]').click().catch(() => {})
await page.waitForTimeout(150)
log('I4 ★ 무예 보유 → 「칼을 쳐낸다」 회피 열림:',
  ok((await page.locator('[data-choice="evade-martial"]').getAttribute('data-locked').catch(() => '?')) === 'false'))
const I5 = await page.evaluate(() => {
  const q = window.__queeningAi
  // 대비 전무 — 다섯 중 아무것도 없음 → succumb 만 (데드). tutorTrust·권세도 0 으로 못박는다.
  q.setGame({ phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 90, wellbeing: 70, tutorTrust: 0, courtStanding: 0,
    stats: { statecraft: 40, finance: 30, rhetoric: 20, martial: 20, courtcraft: 20 },
    flags: { declared_rule: true, assassin_resolved: false, court_backing: false, military_route_open: false }, counters: { '__risk:rebellion': 9 } })
  q.forceEvent('assassination-attempt')
  return true
})
await page.waitForTimeout(200)
await page.locator('[data-scene-advance]').click().catch(() => {})
await page.waitForTimeout(150)
log('I6 ★ 대비 전무 → 회피 전부 잠김, succumb(데드)만:', await (async () => {
  const evades = ['evade-martial', 'evade-courtcraft', 'evade-military', 'evade-tutor', 'evade-standing']
  let allLocked = true
  for (const e of evades) { if ((await page.locator(`[data-choice="${e}"]`).getAttribute('data-locked').catch(() => 'true')) === 'false') allLocked = false }
  const succumb = await page.locator('[data-choice="succumb"]').isVisible().catch(() => false)
  return ok(allLocked && succumb)
})())
// 암살 데드 씬
await page.evaluate(() => window.__queeningAi.setGame({ age: 18, phase: 'ended', flags: { 'dead_end:암살': true } }))
await page.waitForTimeout(250)
let deadTxt = ''
for (let i = 0; i < 6; i++) { deadTxt += ' ' + (await page.locator('[data-screen="dead"], [data-screen="ended"]').innerText().catch(() => '')); const a = page.locator('[data-scene-advance]'); if (!(await a.isVisible().catch(() => false))) break; await a.click().catch(() => {}); await page.waitForTimeout(90) }
log('I7 ★ 암살 데드 씬(달빛만이 본 밤):', ok(deadTxt.includes('달빛만이') || deadTxt.includes('조용한 칼')))

// ── G. 스탯 상한 ──
log('')
log('=== G. 스탯 상한 ===')
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 18, actionPoints: 3, stats: { statecraft: 100, finance: 40, rhetoric: 40, martial: 40, courtcraft: 40 }, flags: {} }))
await page.waitForTimeout(150)
log('G1 ★ 스탯 100 수업 카드 잠김:', ok((await page.locator('[data-activity="lecture-statecraft"]').getAttribute('data-maxed').catch(() => '?')) === 'true'))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
