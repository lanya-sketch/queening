// 월 단위 전환 2단계 — 소소 밀도 · 2달 보장 · 조기 데드엔딩 파이프라인.
//
// ★ 두 방식을 섞는다:
//   - 밀도/누적: devBridge.stepTurn 으로 엔진 endTurn 을 직접 결정론적으로 돌린다.
//   - 회피/종료: 실제 UI(forceEvent → EventScreen → 선택지 클릭)로 렌더까지 확인한다.
//     "정의 검증 ≠ 렌더 검증" — 데드엔딩이 화면에서 실제로 끝나는지를 본다.
import {
  APP_URL, advanceScene, choiceButtons, enterGame, launch, log, ok, phaseOf, shotsDir,
} from './helpers.mjs'

const OUT = shotsDir('stage2')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await enterGame(page)

const freshGame = async () => {
  await page.evaluate(() => {
    localStorage.clear()
    window.__queeningAi.setMinorEnabled(true)
    window.__queeningAi.setDeterministic(true)
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  await enterGame(page)
  await page.evaluate(() => {
    window.__queeningAi.setDeterministic(true)
    window.__queeningAi.setMinorEnabled(true)
  })
}

const isMinor = (id) => id.startsWith('daily-') || id.startsWith('ai-incident')

// ─────────────────────────────────────────────────────────────
log('=== A. 소소 밀도 + "2달에 1번" 보장 (결정론 108턴) ===')
await freshGame()
const dist = await page.evaluate(() => {
  const q = window.__queeningAi
  const months = []
  for (let i = 0; i < 108; i++) {
    const r = q.stepTurn([]) // 활동 없이 진행 — 빈 달 분포를 본다
    const ids = r.triggeredEventIds ?? []
    months.push({
      any: ids.length > 0,
      minor: ids.some((x) => x.startsWith('daily-') || x.startsWith('ai-incident')),
      ids,
    })
    if (r.phase === 'ended') break
  }
  return months
})

// 빈 달(아무 이벤트도 없는 달)의 최대 연속 길이.
let maxGap = 0, cur = 0, minorCount = 0, anyCount = 0
for (const m of dist) {
  if (m.any) { cur = 0; anyCount++ } else { cur++; maxGap = Math.max(maxGap, cur) }
  if (m.minor) minorCount++
}
log(`   108달 중 이벤트 있는 달 ${anyCount} · 소소 뜬 달 ${minorCount} · 최대 빈 달 연속 ${maxGap}`)
log('A1 ★ 빈 달이 2달을 넘지 않음 (pity 보장):', maxGap, ok(maxGap <= 2))
log('A2 ★ 소소가 실제로 뜸 (손 풀 작동, 키 없이):', minorCount, ok(minorCount > 0))
log('A3 ★ 매달 과다 아님 (대부분 활동만 — 소소 < 60%):',
  `${minorCount}/108`, ok(minorCount < 65))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 심신 파탄 — 누적 → 경고 → 위기 ===')
await freshGame()
const strainRun = await page.evaluate((danger) => {
  const q = window.__queeningAi
  const seen = []
  let warnAt = -1, deadAt = -1, strainMax = 0
  for (let i = 0; i < 60; i++) {
    // 어릴 때 무리형 — 심신을 위험선 아래로 계속 눌러 둔다.
    const g = q.state
    q.setGame({ wellbeing: 5 })
    const r = q.stepTurn([])
    const strain = r.counters['__risk:strain'] ?? 0
    strainMax = Math.max(strainMax, strain)
    for (const id of r.triggeredEventIds ?? []) {
      if (!seen.includes(id)) seen.push(id)
      if (id === 'strain-warning' && warnAt < 0) warnAt = i
      if (id === 'strain-collapse' && deadAt < 0) deadAt = i
    }
    if (deadAt >= 0) break
  }
  return { seen, warnAt, deadAt, strainMax }
}, 25)
log(`   strain 최고 ${strainRun.strainMax} · 경고 턴 ${strainRun.warnAt} · 위기 턴 ${strainRun.deadAt}`)
log('B1 ★ strain 누적 (방치가 쌓임):', ok(strainRun.strainMax >= 6))
log('B2 ★ 경고가 위기보다 먼저:', `경고 ${strainRun.warnAt} < 위기 ${strainRun.deadAt}`,
  ok(strainRun.warnAt >= 0 && strainRun.deadAt >= 0 && strainRun.warnAt < strainRun.deadAt))

// ── B-회피: 신망 높으면 요양으로 넘긴다 (실제 UI)
await freshGame()
await page.evaluate(() => {
  window.__queeningAi.setGame({ tutorTrust: 60, wellbeing: 10, flags: { strain_averted: false } })
  window.__queeningAi.forceEvent('strain-collapse')
})
await page.waitForTimeout(200)
await advanceScene(page)
const restBtn = choiceButtons(page).filter({ hasText: '요양' })
const restEnabled = (await restBtn.count()) > 0 && (await restBtn.first().isEnabled())
log('B3 ★ 신망 60 → 요양(회피) 선택지 열림:', ok(restEnabled))
if (restEnabled) {
  await restBtn.first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /다음 달로|계속/ }).click()
  await page.waitForTimeout(200)
}
const afterRest = await page.evaluate(() => {
  const g = window.__queeningAi.state
  return { averted: g.flags.strain_averted === true, dead: !!g.flags['dead_end:심신파탄'], phase: g.phase }
})
log('B4 ★ 회피 성공 — averted, 데드 아님:',
  ok(afterRest.averted && !afterRest.dead && afterRest.phase !== 'ended'))

// ── B-파국: 신망 낮으면 회피 불가 → succumb → 데드엔딩 (실제 UI)
await freshGame()
await page.evaluate(() => {
  window.__queeningAi.setGame({ tutorTrust: 20, wellbeing: 8, flags: { strain_averted: false } })
  window.__queeningAi.forceEvent('strain-collapse')
})
await page.waitForTimeout(200)
await advanceScene(page)
const restLocked = choiceButtons(page).filter({ hasText: '요양' })
const restDisabled = (await restLocked.count()) === 0 || !(await restLocked.first().isEnabled())
log('B5 ★ 신망 20 → 요양 잠김 (수치 미달):', ok(restDisabled))
const succumb = choiceButtons(page).filter({ hasText: '멈추지 않는다' })
await succumb.first().click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: /다음 달로|계속/ }).click()
await page.waitForTimeout(300)
const afterDead = await page.evaluate(() => {
  const g = window.__queeningAi.state
  return { dead: !!g.flags['dead_end:심신파탄'], phase: g.phase, age: g.age }
})
log('B6 ★ succumb → dead_end flag + ended:',
  ok(afterDead.dead && afterDead.phase === 'ended'))
log('B7 ★ 데드는 20세 전 (경계 분명):', `${afterDead.age}세`, ok(afterDead.age < 20))
// 데드엔딩 씬이 실제로 렌더되는지
await advanceScene(page)
await page.waitForTimeout(200)
const deadTitle = await page.getByText('스러진 그릇').isVisible().catch(() => false)
log('B8 ★ 손으로 쓴 데드 씬 렌더:', ok(deadTitle))
await page.screenshot({ path: `${OUT}/01-strain-deadend.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 의심 무방비 — 누적 → 경고 → 위기 → 회피 ===')
await freshGame()
const expRun = await page.evaluate(() => {
  const q = window.__queeningAi
  const seen = []
  let warnAt = -1, deadAt = -1, expMax = 0
  for (let i = 0; i < 40; i++) {
    // 경계도 최대 + 무방비(실권 낮음, 대비 flag 없음) 유지.
    q.setGame({ regentSuspicion: 100, courtInfluence: 10 })
    const r = q.stepTurn([])
    const e = r.counters['__risk:exposure'] ?? 0
    expMax = Math.max(expMax, e)
    for (const id of r.triggeredEventIds ?? []) {
      if (!seen.includes(id)) seen.push(id)
      if (id === 'exposure-warning' && warnAt < 0) warnAt = i
      if (id === 'exposure-strike' && deadAt < 0) deadAt = i
    }
    if (deadAt >= 0) break
  }
  return { seen, warnAt, deadAt, expMax }
})
log(`   exposure 최고 ${expRun.expMax} · 경고 턴 ${expRun.warnAt} · 위기 턴 ${expRun.deadAt}`)
log('C1 ★ exposure 누적:', ok(expRun.expMax >= 6))
log('C2 ★ 경고가 위기보다 먼저:', `${expRun.warnAt} < ${expRun.deadAt}`,
  ok(expRun.warnAt >= 0 && expRun.deadAt >= 0 && expRun.warnAt < expRun.deadAt))

// ── C-회피: 무예 40+ 로 자객을 물리친다
await freshGame()
await page.evaluate(() => {
  const g = window.__queeningAi.state
  window.__queeningAi.setGame({
    stats: { ...g.stats, martial: 45 }, regentSuspicion: 100, courtInfluence: 10,
    flags: { exposure_averted: false },
  })
  window.__queeningAi.forceEvent('exposure-strike')
})
await page.waitForTimeout(200)
await advanceScene(page)
const fightBtn = choiceButtons(page).filter({ hasText: '자객을 물리친다' })
const fightEnabled = (await fightBtn.count()) > 0 && (await fightBtn.first().isEnabled())
log('C3 ★ 무예 45 → 물리침(회피) 열림:', ok(fightEnabled))
if (fightEnabled) {
  await fightBtn.first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /다음 달로|계속/ }).click()
  await page.waitForTimeout(200)
}
const afterFight = await page.evaluate(() => {
  const g = window.__queeningAi.state
  return { averted: g.flags.exposure_averted === true, dead: !!g.flags['dead_end:의심무방비'], phase: g.phase }
})
log('C4 ★ 회피 성공 — averted, 데드 아님:',
  ok(afterFight.averted && !afterFight.dead && afterFight.phase !== 'ended'))

// ── C-파국: 무예·실권 둘 다 미달 → succumb → 데드
await freshGame()
await page.evaluate(() => {
  const g = window.__queeningAi.state
  window.__queeningAi.setGame({
    stats: { ...g.stats, martial: 6 }, regentSuspicion: 100, courtInfluence: 10,
    flags: { exposure_averted: false },
  })
  window.__queeningAi.forceEvent('exposure-strike')
})
await page.waitForTimeout(200)
await advanceScene(page)
const fightLocked = choiceButtons(page).filter({ hasText: '자객을 물리친다' })
const suppressLocked = choiceButtons(page).filter({ hasText: '눌러낸다' })
const bothLocked =
  !((await fightLocked.count()) > 0 && (await fightLocked.first().isEnabled())) &&
  !((await suppressLocked.count()) > 0 && (await suppressLocked.first().isEnabled()))
log('C5 ★ 무예·실권 미달 → 회피 둘 다 잠김:', ok(bothLocked))
const cSuccumb = choiceButtons(page).filter({ hasText: '아무도 오지 않는다' })
await cSuccumb.first().click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: /다음 달로|계속/ }).click()
await page.waitForTimeout(300)
const cDead = await page.evaluate(() => {
  const g = window.__queeningAi.state
  return { dead: !!g.flags['dead_end:의심무방비'], phase: g.phase, age: g.age }
})
log('C6 ★ succumb → dead_end + ended, 20세 전:',
  ok(cDead.dead && cDead.phase === 'ended' && cDead.age < 20))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 관리형은 데드가 안 터진다 (느슨함 실증) ===')
await freshGame()
const managed = await page.evaluate(() => {
  const q = window.__queeningAi
  let strainMax = 0, expMax = 0, deaded = false
  for (let i = 0; i < 108; i++) {
    // 관리형 — 심신 높게, 경계 낮게 유지.
    q.setGame({ wellbeing: 80, regentSuspicion: 20 })
    const r = q.stepTurn([])
    strainMax = Math.max(strainMax, r.counters['__risk:strain'] ?? 0)
    expMax = Math.max(expMax, r.counters['__risk:exposure'] ?? 0)
    if (Object.keys(r.flags).some((f) => f.startsWith('dead_end:'))) deaded = true
    if (r.phase === 'ended' && r.age > 20) break
  }
  return { strainMax, expMax, deaded }
})
log(`   관리형 strain 최고 ${managed.strainMax} · exposure 최고 ${managed.expMax}`)
log('D1 ★ 관리형은 위험이 안 쌓임:', ok(managed.strainMax === 0 && managed.expMax === 0))
log('D2 ★ 관리형은 데드엔딩 없음:', ok(!managed.deaded))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
