/**
 * 후반 정치 현안(17~19세) + 16+ 달 분산 검증.
 *
 * A. 등록 — 3 현안이 17/18/19세 + month(6/4/5)에 걸리고 priority 유일값.
 * B. ★ 실권 게이트 — 대담한 결정(대등 선포/회수/완성)이 국정 영향도 문턱 아래서 잠기고 넘으면 열린다.
 * C. 4-C 차등 — 대등 선포의 결과가 변론 등급에 따라 갈린다(어설픔/제대로).
 * D. 위임 무게 — 후반 위임은 의심 −2(전반 −4보다 적게).
 * E. nation flag → 엔딩 — empire_defied 등이 엔딩 서술에 실제로 뜬다.
 * F. ★ 달 분산 실측 — 16~20세를 결정론으로 돌려 이벤트가 달별로 흩어지는지(1월 클러스터 해소) 표로.
 */
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('late-affairs')
const AFFAIRS = {
  'issue-empire-investiture': { age: 17, year: 6, month: 6, bold: 'defy' },
  'issue-lords-season': { age: 18, year: 7, month: 4, bold: 'reclaim' },
  'issue-late-king': { age: 19, year: 8, month: 5, bold: 'complete' },
}

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

// ── A. 등록 ───────────────────────────────────────────────
log('=== A. 후반 현안 등록 ===')
const defs = await page.evaluate((ids) => {
  const events = window.__queeningAi.events()
  const byId = Object.fromEntries(events.map((e) => [e.id, e]))
  return ids.map((id) => {
    const e = byId[id]
    return { id, has: !!e, minAge: e?.condition?.minAge, month: e?.condition?.month, priority: e?.priority,
      cat: e?.category }
  })
}, Object.keys(AFFAIRS))
for (const d of defs) {
  const want = AFFAIRS[d.id]
  log(`A·${d.id}: ${d.minAge}세/m${d.month} pri${d.priority} [${d.cat}]`,
    ok(d.has && d.minAge === want.age && d.month === want.month && d.cat === 'state_affair'))
}
const prios = defs.map((d) => d.priority)
log('A· priority 유일값:', JSON.stringify(prios), ok(new Set(prios).size === prios.length && prios.every((p) => p >= 30 && p < 50)))

// ── B. 실권 게이트 ────────────────────────────────────────
log('')
log('=== B. 실권 게이트 (대담한 결정이 영향도로 잠김) ===')
async function boldLocked(id, influence) {
  const want = AFFAIRS[id]
  await setGame({ age: want.age, date: { year: want.year, month: want.month }, courtInfluence: influence,
    stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 30, courtcraft: 30 },
    flags: { house_commons_defended: true }, phase: 'schedule' })
  await page.evaluate((eid) => window.__queeningAi.forceEvent(eid), id)
  await page.waitForTimeout(200)
  // 씬이 있으면 넘긴다(현안은 씬 없음이지만 방어적으로).
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole('button', { name: /^(다음|계속)$/ })
    if (!(await next.isVisible().catch(() => false))) break
    await next.click(); await page.waitForTimeout(80)
  }
  const btn = page.locator(`[data-choice="${want.bold}"]`)
  return btn.getAttribute('data-locked').catch(() => 'missing')
}
for (const id of Object.keys(AFFAIRS)) {
  const gate = id === 'issue-empire-investiture' ? 45 : 70
  const lockedLow = await boldLocked(id, gate - 15)
  const lockedHigh = await boldLocked(id, gate + 5)
  log(`B·${id}: 영향도 ${gate - 15}→locked=${lockedLow} / ${gate + 5}→locked=${lockedHigh}`,
    ok(lockedLow === 'true' && lockedHigh === 'false'))
}
await page.screenshot({ path: `${OUT}/gate-locked.png` })

// ── C. 4-C 차등 ───────────────────────────────────────────
log('')
log('=== C. 4-C 차등 (대등 선포가 변론 등급으로 갈림) ===')
async function boldTier(rhetoric) {
  await setGame({ age: 17, date: { year: 6, month: 6 }, courtInfluence: 60,
    stats: { statecraft: 30, finance: 20, rhetoric, martial: 30, courtcraft: 30 }, flags: {}, phase: 'schedule' })
  await page.evaluate(() => window.__queeningAi.forceEvent('issue-empire-investiture'))
  await page.waitForTimeout(200)
  return page.locator('[data-choice="defy"]').getAttribute('data-choice-tier').catch(() => '?')
}
const tierLow = await boldTier(10)
const tierHigh = await boldTier(40)
log('C1 변론 10 → 어설픔:', tierLow, ok(tierLow === '어설픔'))
log('C2 변론 40 → 제대로:', tierHigh, ok(tierHigh === '제대로'))

// ── D. 위임 무게 ──────────────────────────────────────────
log('')
log('=== D. 위임 무게 (후반 −2 < 전반 −4) ===')
const delegateSusp = await page.evaluate((ids) => {
  const byId = Object.fromEntries(window.__queeningAi.events().map((e) => [e.id, e]))
  const susp = (id) => {
    const del = byId[id]?.choices?.find((c) => c.id === 'delegate')
    const e = del?.effects?.find((x) => x.target?.key === 'regentSuspicion')
    return e?.amount ?? null
  }
  return { late: ids.map((id) => susp(id)), early: susp('issue-frontier-raid') }
}, Object.keys(AFFAIRS))
log('D1 후반 현안 위임 의심 감소:', JSON.stringify(delegateSusp.late),
  ok(delegateSusp.late.every((v) => v === -2)))
log('D2 전반 현안(변경) 위임 의심 감소 −4 (대조):', delegateSusp.early, ok(delegateSusp.early === -4))

// ── E. nation flag → 엔딩 ─────────────────────────────────
log('')
log('=== E. nation flag → 엔딩 서술 ===')
await setGame({
  age: 20, date: { year: 9, month: 8 }, phase: 'ended', courtInfluence: 55,
  flags: { empire_defied: true, crown_centralized: true, late_king_reform: true },
})
await page.waitForTimeout(300)
let endingText = ''
for (let i = 0; i < 60; i++) {
  endingText += ' ' + (await page.locator('[data-screen="ended"], [data-screen="dead"]').innerText().catch(() => ''))
  const next = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (!(await next.isVisible().catch(() => false))) break
  await next.click(); await page.waitForTimeout(60)
}
log('E1 ★ empire_defied 서술 뜸:', ok(endingText.includes('무릎을 꿇지 않았다')))
log('E2 ★ crown_centralized 서술 뜸:', ok(endingText.includes('하나가 되었다')))
log('E3 ★ late_king_reform 서술 뜸:', ok(endingText.includes('아버지가 가리키기만')))
await page.screenshot({ path: `${OUT}/ending-nation.png` })

// ── F. 달 분산 실측 ───────────────────────────────────────
log('')
log('=== F. 16~20세 달 분산 실측 ===')
const dist = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false)
  // ★ 11~15세 대본을 '이미 본 것'으로 심는다(minAge<16 또는 무조건). 안 그러면 flag 백지로
  //   16세에 시작할 때 유년기~13-15 대본이 통째로 밀려와 후반 이벤트를 밀어낸다(incidents 교훈).
  //   그래서 순수 16~20세 분포만 재려면 이전 대본을 소거한다.
  const seen = {}
  for (const e of q.events()) {
    const ma = e.condition?.minAge
    if (ma === undefined || ma < 16) seen['event:' + e.id] = true
  }
  // 유능한 회유형 왕 + 후반 마일스톤 게이트 해제. 현안은 무조건 뜬다(선택지만 게이트).
  q.setGame({
    age: 16, date: { year: 5, month: 1 }, phase: 'schedule', courtInfluence: 75, wellbeing: 80,
    regentRapport: 60, regentSuspicion: 30,
    stats: { statecraft: 55, finance: 45, rhetoric: 50, martial: 40, courtcraft: 55 },
    flags: {
      ...seen,
      clue_mother_calm: true, truth_regent_involved: true, house_commons_defended: true,
    },
    affection: {}, counters: {},
  })
  const rows = []
  for (let i = 0; i < 60; i++) {
    if (q.state.age > 20) break
    const r = q.stepTurn(['rest', 'rest', 'rest'])
    // ★ 이벤트는 날짜가 오른 뒤(endTurn 2단계) 검사되므로, 발동 달 = **진행 후** 날짜다.
    const after = q.state
    for (const id of r.triggeredEventIds ?? []) {
      if (!id.startsWith('daily-')) rows.push({ y: after.date.year, m: after.date.month, age: after.age, id })
    }
    if (r.phase === 'ended') break
  }
  return rows
})
// 달별 집계.
const monthCount = {}
for (const r of dist) monthCount[r.m] = (monthCount[r.m] ?? 0) + 1
log('   달별 이벤트 수:', JSON.stringify(monthCount))
for (const r of dist) log(`   ${r.age}세 ${r.m}월: ${r.id}`)
const find = (id) => dist.find((r) => r.id === id)
log('F1 ★ 성년식이 1월이 아니라 3월:', JSON.stringify(find('adult-coming-of-age')),
  ok(find('adult-coming-of-age')?.m === 3))
log('F2 ★ 제국 책봉 17세 6월:', ok(find('issue-empire-investiture')?.m === 6 && find('issue-empire-investiture')?.age === 17))
log('F3 ★ 영주들의 계절 18세 4월:', ok(find('issue-lords-season')?.m === 4 && find('issue-lords-season')?.age === 18))
log('F4 ★ 선왕의 미완 19세 5월:', ok(find('issue-late-king')?.m === 5 && find('issue-late-king')?.age === 19))
// ★ 클러스터 해소는 (나이,달) 셀 단위로 본다 — 위 monthCount 는 5년치를 합친 값이라
//   같은 달이라도 서로 다른 해면 몰림이 아니다. 턴 상한(2) 안이면 어느 달도 폭탄이 아니다.
const perCell = {}
for (const r of dist) { const k = `${r.age}-${r.m}`; perCell[k] = (perCell[k] ?? 0) + 1 }
const maxCell = Math.max(...Object.values(perCell))
const cluster = Object.entries(perCell).filter(([, n]) => n >= 2).map(([k]) => k)
log('F5 ★ (나이,달) 셀 최대 ≤2 (턴 상한):', `최대 ${maxCell} · 2건셀 ${JSON.stringify(cluster)}`, ok(maxCell <= 2))
// 마일스톤·현안이 1월(나이 오르는 달)에서 빠졌는가 — 처분·청산 사슬(flag 자기순차)만 1월 허용.
const janScripted = dist.filter((r) => r.m === 1 && (r.id.startsWith('adult-') || r.id.startsWith('issue-')))
log('F6 ★ 성년식·현안·담판이 1월에서 빠짐(처분/청산 사슬만 1월 허용):',
  JSON.stringify(janScripted.map((r) => r.id)), ok(janScripted.length === 0))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
