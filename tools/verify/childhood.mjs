/**
 * 유년기 인물 등장 검증 (실플레이 피드백).
 *
 * A. 11~12세에 인물 씬이 실제로 뜨는가(24턴이 조용하지 않은가).
 * B. 13세에 ①②③⑤ 가 등장하고 met_<id> 를 세우는가. ③ 은 romance_unlocked 없이 뜨는가.
 * C. 인연 창 — 만난 사람만 보이고(로맨스 잠김), 못 만난 사람은 안 보인다. ④ 도 예외 없이
 *    등장 전까지 완전히 숨는다(A-6: ??? 슬롯 제거 — 5번째 인연 예고가 스포일러였다).
 * D. 턴 결과 — 조용한 소소는 결과 화면에 인라인, 선택지·씬은 별도.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// ── A. 이벤트 정의: 유년기 씬이 등록됐는가 ─────────────────
const defs = await page.evaluate(() => {
  const events = window.__queeningAi.events()
  const ids = new Set(events.map((e) => e.id))
  const meet = ['child-meet-heir', 'child-meet-loyalist', 'child-meet-commander', 'child-meet-prince']
  const uneasy = ['child-uncle-evening', 'child-mother-room', 'child-uncle-corridor', 'child-mother-dinner']
  const prince = events.find((e) => e.id === 'child-meet-prince')
  return {
    meetAll: meet.every((id) => ids.has(id)),
    uneasyAll: uneasy.every((id) => ids.has(id)),
    princeFlags: Object.keys(prince?.condition?.flags ?? {}),
    setFlags: meet.map((id) => Object.keys(events.find((e) => e.id === id)?.setFlags ?? {})[0]),
  }
})
log('=== A. 유년기 씬 등록 ===')
log('A1 위화감 4씬 등록(섭정공·모후):', ok(defs.uneasyAll))
log('A2 첫 등장 4씬 등록(①②③⑤):', ok(defs.meetAll))
log('A3 ★ ③ 첫 등장이 romance_unlocked 를 요구하지 않음:',
  JSON.stringify(defs.princeFlags), ok(!defs.princeFlags.includes('romance_unlocked')))
log('A4 등장이 met_<id> 를 세움:', defs.setFlags.join(', '),
  ok(defs.setFlags.every((f) => f && f.startsWith('met_'))))

// ── B. 실제로 뜨는가 — 11~13세를 관리형으로 돌려 등장 씬을 센다 ──
const seen = await page.evaluate(async () => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(true)
  const met = []
  const byYear = {}
  for (let i = 0; i < 40; i++) {
    const g = q.state
    if (g.age > 13) break
    // 관리형: 심신 낮으면 쉬고, 아니면 통치학+휴식.
    const plan = g.wellbeing < 40 ? ['rest', 'rest', 'rest'] : ['lecture-statecraft', 'rest', 'rest']
    const before = new Set(Object.keys(g.flags))
    const r = q.stepTurn(plan)
    const after = q.state.flags
    for (const f of Object.keys(after)) {
      if (!before.has(f) && f.startsWith('met_')) met.push(f)
      if (!before.has(f) && f.startsWith('event:child-')) {
        (byYear[q.state.age] ??= []).push(f.replace('event:child-', ''))
      }
    }
    if (r.phase === 'ended') break
  }
  return { met, byYear }
})
log('')
log('=== B. 실제 발동 (결정론, 11~13세) ===')
for (const [age, evs] of Object.entries(seen.byYear)) {
  log(`   ${age}세: ${evs.join(', ')}`)
}
const early = (seen.byYear[11]?.length ?? 0) + (seen.byYear[12]?.length ?? 0)
log('B1 ★ 11~12세에 인물 씬이 뜸(조용하지 않음):', early, ok(early >= 2))
log('B2 ★ 13세에 ①②③⑤ 전부 만남:', seen.met.sort().join(', '),
  ok(['met_commander', 'met_heir', 'met_loyalist', 'met_prince'].every((f) => seen.met.includes(f))))

// ── C. 인연 창 ────────────────────────────────────────────
async function bondPanel(patch) {
  // 버튼은 13세부터 노출되므로 age 13 으로 열고 flags 로 '누굴 만났나'를 갈라 본다.
  await page.evaluate((p) => {
    window.__queeningAi.setGame({ phase: 'schedule', age: 13, ...p })
  }, patch)
  await page.waitForTimeout(200)
  // ★ 13세에 뜨는 인연 코치마크가 버튼을 가리키며 클릭을 막는다(실제 동작) — 먼저 닫는다.
  const coach = page.locator('[data-coach="bond"]')
  if (await coach.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '알겠어요' }).click()
    await page.waitForTimeout(150)
  }
  await page.getByRole('button', { name: '인연', exact: true }).click()
  await page.waitForTimeout(250)
  const dialog = page.getByRole('dialog', { name: '인연' })
  const cards = await dialog.locator('ul > li').count()
  const names = await dialog.locator('ul > li').allInnerTexts()
  const locked = await dialog.locator('[data-romance-locked]').count()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  return { cards, names: names.map((n) => n.split('\n')[0]), locked }
}

log('')
log('=== C. 인연 창 ===')
// ★ 코치마크 — 13세에 인연 버튼을 가리키며 처음 한 번 뜨는가(묻힌 기능 안내).
await page.evaluate(() => {
  localStorage.removeItem('queening.coachSeen')
  window.__queeningAi.setGame({ phase: 'schedule', age: 13, flags: {} })
})
await page.waitForTimeout(300)
log('C0 ★ 13세에 인연 코치마크가 뜸:',
  ok(await page.locator('[data-coach="bond"]').isVisible().catch(() => false)))

// ★ A-6: ④ ??? 슬롯 제거 — 아무도 안 만나면 명부는 완전히 빈다(④ 도 안 뜬다).
const c11 = await bondPanel({ flags: {}, courtInfluence: 10 })
log('C1 아무도 안 만남: 카드', c11.cards, JSON.stringify(c11.names),
  ok(c11.cards === 0))
// 13세 ①②만 만남: 두 명만(④ 숨음) = 2장.
const c13 = await bondPanel({ flags: { met_heir: true, met_loyalist: true } })
log('C2 13세(①②만 만남): 카드', c13.cards, JSON.stringify(c13.names),
  ok(c13.cards === 2))
log('C3 ★ 만난 둘은 "아는 사이"(로맨스 잠김):', c13.locked, ok(c13.locked === 2))
log('C4 ★ ④ 평민 영웅은 명부에서 완전히 빠짐(??? 슬롯 없음):', ok(!c13.names.includes('???')))

// ── D. 턴 결과 인라인 ─────────────────────────────────────
log('')
log('=== D. 턴 결과: 조용한 소소는 인라인 ===')
const report = await page.evaluate(() => {
  const q = window.__queeningAi
  // 소소만 뜨도록: 큰 이벤트 조건 밖(11세 1월), 소소 강제.
  q.setGame({ age: 11, date: { year: 0, month: 1 }, phase: 'schedule', actionPoints: 3, plannedActivityIds: ['rest'], flags: {} })
  q.setDeterministic(true)
  q.setMinorEnabled(true)
  // pity 를 채워 이번 빈 달에 소소가 확정으로 뜨게.
  q.setGame({ counters: { '__pity:minor': 5 } })
  q.stepTurn(['rest'])
  const r = q.state.lastTurnReport
  return { inline: r?.inlineEventIds ?? [], pending: q.state.pendingEventIds }
})
log('D1 조용한 소소가 인라인 목록에 있음:', JSON.stringify(report.inline),
  ok(report.inline.length >= 1))
log('D2 ★ 인라인이면 별도 화면 큐(pending)엔 안 감:', JSON.stringify(report.pending),
  ok(report.pending.every((id) => !report.inline.includes(id))))

await browser.close()
