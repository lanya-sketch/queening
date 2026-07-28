/**
 * 아이를 살피는 층 검증 — 신뢰 선호 + 심신 상태 ([2]).
 *
 * A. 선호 신뢰 — 선호 활동만 오르고 비선호는 안 오르거나 내린다.
 * B. ★★ 게이트 도달(핵심 판정) — "절반쯤 맞추는" 플레이가 15~16세에 신뢰 50 에 닿고,
 *    "완전 무시"는 <50 이되 죽지는 않는다(rest 로 위험 회피). 3 게이트(40·50·50).
 * C. 심신 상태 — 감기 학습 ×0.8, 병 강제 휴식 1달, 밴드 파생.
 * D. ★ 관리형 vs 무리형 — BAL 은 상태에 거의 안 걸리고 PUSH 만 자주(빌드 대조).
 * E. 스케줄 wish 한 줄(수치 없음). F. 수확철 people flag(AI 없이).
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

// ── A. 선호 신뢰 델타 ──
log('=== A. 선호 신뢰 ===')
const A = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const run = (temp, plan, month) => {
    q.setGame({ phase: 'schedule', age: 14, actionPoints: 3, date: { year: 1, month }, wellbeing: 70, tutorTrust: 40,
      stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 },
      flags: { [`temperament_${temp}`]: true }, counters: {} })
    const b = q.state.tutorTrust; q.stepTurn(plan); return q.state.tutorTrust - b
  }
  return {
    brightLike: run('bright', ['lecture-statecraft', 'rest', 'rest'], 3),   // 통치학 like/wish + rest
    brightDislike: run('bright', ['sword-training', 'sword-training', 'rest'], 3), // 검술 dislike×2 + rest
    cunningNeutral: run('cunning', ['sword-training', 'rest'], 3),   // 영악은 검술 무관(dislike 없음) — rest baseline +1 만
    tenderOverload: run('tender', ['lecture-statecraft', 'lecture-finance', 'debate-practice'], 3), // 3활동 무리
  }
})
log('A1 ★ 선호(통치학) → 신뢰↑:', A.brightLike, ok(A.brightLike >= 3))
log('A2 ★ 비선호(검술) → 신뢰↓:', A.brightDislike, ok(A.brightDislike < 0))
log('A3 무관 활동 → 신뢰 미미(rest baseline 만):', A.cunningNeutral, ok(A.cunningNeutral <= 1))
log('A4 ★ 여린 3활동 무리 → 신뢰 손해:', A.tenderOverload, ok(A.tenderOverload < 0))

// ── B. ★★ 게이트 도달 ──
log('')
log('=== B. ★★ 신뢰 게이트 도달 (핵심 판정) ===')
const B = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const play = (mode) => {
    q.setGame({ phase: 'schedule', age: 11, date: { year: 0, month: 1 }, actionPoints: 3, wellbeing: 70, tutorTrust: 20,
      durability: 0, stats: { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 },
      flags: { temperament_bright: true }, counters: {}, affection: {} })
    let trust15 = null, trust16 = null, died = false
    for (let i = 0; i < 120; i++) {
      const g = q.state
      if (g.age > 16) break
      const w = g.wellbeing
      // 심신 관리(무리 금지) — 위험에 안 빠지게 rest 를 낀다.
      let plan
      if (g.flags.forced_rest) plan = []
      else if (w < 35) plan = ['rest', 'rest', 'rest']
      // attentive: 아이가 좋아하는 통치학(like/때때로 wish)을 매달 한 칸. ignore: 싫어하는 검술.
      else plan = mode === 'attentive' ? ['lecture-statecraft', 'rest'] : ['sword-training', 'rest']
      const r = q.stepTurn(plan)
      if (r.phase === 'ended' && q.state.age <= 20) { died = true; break }
      if (q.state.age === 15 && trust15 === null) trust15 = q.state.tutorTrust
      if (q.state.age === 16 && trust16 === null) trust16 = q.state.tutorTrust
    }
    return { trust15, trust16, final: q.state.tutorTrust, died }
  }
  return { attentive: play('attentive'), ignore: play('ignore') }
})
// ★ 스펙 "15~16세에 50 도달" — 15세에 근접(≥45), 16세엔 확실히 50+. 50 게이트(해고·strain)는
//   16세+에 걸리므로 그때 신뢰 56 으로 닿는다.
log('B1 ★★ "절반쯤 맞추는" 플레이 15세 신뢰(50 근접):', B.attentive.trust15, ok((B.attentive.trust15 ?? 0) >= 45))
log('B2 ★★ 16세엔 확실히 50+ (해고·strain 게이트 도달):', B.attentive.trust16, ok((B.attentive.trust16 ?? 0) >= 50))
log('B3 ★ 완전 무시 플레이는 <50:', B.ignore.final, ok(B.ignore.final < 50))
log('B4 ★ 완전 무시도 죽지는 않는다(rest 로 위험 회피):', B.ignore.died, ok(!B.ignore.died))

// ── C. 심신 상태 ──
log('')
log('=== C. 심신 상태 ===')
const C = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  // 감기 학습 저하
  const grow = (wb) => {
    q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, date: { year: 5, month: 3 }, wellbeing: wb, durability: 30,
      stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 }, flags: {}, counters: {} })
    const b = q.state.stats.statecraft; q.stepTurn(['lecture-statecraft']); return q.state.stats.statecraft - b
  }
  const healthy = grow(70), cold = grow(15)
  // 병 강제 휴식 cycle
  q.setGame({ phase: 'schedule', age: 12, actionPoints: 3, date: { year: 1, month: 3 }, wellbeing: 14, durability: 0,
    stats: { statecraft: 20, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 }, flags: {}, counters: {} })
  q.stepTurn(['lecture-statecraft', 'lecture-finance', 'debate-practice'])
  const bottomed = q.state.wellbeing < 8 && q.state.flags.forced_rest === true
  const wbBefore = q.state.wellbeing
  q.stepTurn([])
  const recovered = q.state.wellbeing - wbBefore > 15 && q.state.flags.forced_rest !== true
  return { healthy, cold, bottomed, recovered }
})
log('C1 ★ 감기(15) 학습 < 정상(70):', `${C.cold.toFixed(2)}<${C.healthy.toFixed(2)}`, ok(C.cold < C.healthy * 0.95))
log('C2 ★ 무리 → 바닥(<8) → forced_rest:', ok(C.bottomed))
log('C3 ★ 강제 휴식 → 회복 + 1달 후 해제:', ok(C.recovered))

// ── D. ★ 관리형 vs 무리형 (상태 걸림 대조) ──
log('')
log('=== D. ★ 관리형 vs 무리형 ===')
const D = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const count = (mode) => {
    q.setGame({ phase: 'schedule', age: 11, date: { year: 0, month: 1 }, actionPoints: 3, wellbeing: 70, tutorTrust: 20,
      durability: 0, stats: { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 }, flags: {}, counters: {}, affection: {} })
    let cold = 0, ill = 0
    for (let i = 0; i < 120; i++) {
      const g = q.state
      if (g.age > 20) break
      if (g.wellbeing < 20) cold++
      if (g.flags.forced_rest) ill++
      let plan
      if (g.flags.forced_rest) plan = []
      else if (mode === 'manage') plan = g.wellbeing < 40 ? ['rest', 'rest'] : ['lecture-statecraft', 'rest']
      else plan = ['lecture-statecraft', 'lecture-finance', 'debate-practice'] // 무리: 매달 3 학습
      if (q.stepTurn(plan).phase === 'ended' && q.state.age <= 20) break
    }
    return { cold, ill }
  }
  return { manage: count('manage'), push: count('push') }
})
log('D1 관리형 감기/병 달 수:', JSON.stringify(D.manage))
log('D2 무리형 감기/병 달 수:', JSON.stringify(D.push))
log('D3 ★ 관리형은 병에 거의 안 걸림:', ok(D.manage.ill <= 1))
log('D4 ★ 무리형이 관리형보다 상태에 훨씬 자주 걸림:',
  ok(D.push.cold + D.push.ill > D.manage.cold + D.manage.ill + 5))

// ── E. wish 힌트 (UI, 수치 없음) ──
log('')
log('=== E. 스케줄 wish 한 줄 ===')
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 14, flags: { temperament_robust: true }, date: { year: 2, month: 4 } }))
await page.waitForTimeout(150)
const hint = await page.locator('[data-wish-hint]').innerText().catch(() => '')
log('E1 ★ wish 한 줄 뜸:', JSON.stringify(hint.replace(/\s+/g, ' ').trim()), ok(hint.length > 3))
log('E2 ★ 수치 없음:', ok(!/\d/.test(hint)))

// ── F. 수확 people flag (AI 없이) ──
log('')
log('=== F. 수확철 민심 flag (AI 없이) ===')
const F = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(false); q.setMinorEnabled(true)
  q.setGame({ phase: 'schedule', age: 11, actionPoints: 3, date: { year: 0, month: 1 }, wellbeing: 70,
    stats: { statecraft: 20, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 }, flags: {}, counters: {} })
  for (let i = 0; i < 120; i++) { if (q.state.age > 20) break; q.stepTurn(['rest', 'rest', 'rest']) }
  const f = q.state.flags
  return { good: f.people_relieved_harvest === true, poor: f.people_burdened_harvest === true }
})
log('F1 ★ 9년간 수확철 → people flag(AI 없이):', JSON.stringify(F), ok(F.good || F.poor))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
