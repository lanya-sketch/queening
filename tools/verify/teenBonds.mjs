/**
 * 13~15세 관계 이벤트 검증 (로드맵 콘텐츠, 실플레이 피드백).
 *
 * A. 등록·구조 — 관계 12건(호감 9 + 소문 3)이 등록되고,
 *    ③ 은 romance_unlocked 를 요구하지 않으며, ★ ② 는 hint_queen_chamber 를 세우지 않는다.
 * B. 실제 발동 — 13→15세를 결정론으로 돌려 인물별 호감 씬이 전부 뜨고, 소문 3건이 뜬다.
 * C. ★ 호감도 낙차 설계 — 데뷔탕트 출발점: ① 이 넷 중 최저(≈4), ②⑤ ≈32, ③ ≈11.
 *    ④(영웅)는 만난 게 아니라 소문일 뿐 — 호감도 0, 인연 창엔 아직 ???.
 * D. VN — 각 관계 씬이 스프라이트 화자로 재생되고, 소문은 씬 없는 서술 카드다.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const BONDS = {
  heir: ['bond-heir-appraise', 'bond-heir-shadow'],
  loyalist: ['bond-loyalist-beside', 'bond-loyalist-caution', 'bond-loyalist-father'],
  commander: ['bond-commander-outside', 'bond-commander-threshold', 'bond-commander-restraint'],
  prince: ['bond-prince-revisit', 'bond-prince-spar'],
}
const RUMORS = ['rumor-frontier-1', 'rumor-frontier-2', 'rumor-frontier-3']
const ALL_BONDS = Object.values(BONDS).flat()

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// ── A. 등록·구조 ──────────────────────────────────────────
const defs = await page.evaluate(({ ALL_BONDS, RUMORS, BONDS }) => {
  const events = window.__queeningAi.events()
  const byId = Object.fromEntries(events.map((e) => [e.id, e]))
  const ids = new Set(events.map((e) => e.id))
  const flagsOf = (id) => Object.keys(byId[id]?.condition?.flags ?? {})
  const setFlagsOf = (id) => Object.keys(byId[id]?.setFlags ?? {})
  return {
    bondsAll: ALL_BONDS.every((id) => ids.has(id)),
    rumorsAll: RUMORS.every((id) => ids.has(id)),
    // ③ 재방문 2씬 — romance_unlocked 를 조건으로 걸지 않는다.
    princeNoRomance: BONDS.prince.every((id) => !flagsOf(id).includes('romance_unlocked')),
    // ★ ② 아버지/시녀장 씨앗이 침전 실마리 flag 를 미리 세우면 16세 회수와 충돌한다.
    loyalistNoChamber: BONDS.loyalist.every((id) => !setFlagsOf(id).includes('hint_queen_chamber')),
    // 전부 met_<id> 게이트 — 13세 첫 등장 이후에만.
    bondGates: ALL_BONDS.map((id) => flagsOf(id).find((f) => f.startsWith('met_')) ?? null),
    // 호감 씬은 sceneId 를 갖고(VN), 소문은 안 갖는다(서술 카드).
    bondsHaveScene: ALL_BONDS.every((id) => Boolean(byId[id]?.sceneId)),
    rumorsNoScene: RUMORS.every((id) => !byId[id]?.sceneId),
    // priority 유일값(12건이 서로 다른가).
    prios: [...ALL_BONDS, ...RUMORS].map((id) => byId[id]?.priority),
  }
}, { ALL_BONDS, RUMORS, BONDS })

log('=== A. 등록·구조 ===')
log('A1 호감 9씬 등록:', ok(defs.bondsAll))
log('A2 소문 3건 등록:', ok(defs.rumorsAll))
log('A3 ★ ③ 재방문이 romance_unlocked 를 요구하지 않음:', ok(defs.princeNoRomance))
log('A4 ★ ② 씨앗이 hint_queen_chamber 를 세우지 않음(16세 회수와 무충돌):', ok(defs.loyalistNoChamber))
log('A5 호감 씬은 met_<id> 로 게이트:', JSON.stringify(defs.bondGates),
  ok(defs.bondGates.every((f) => f && f.startsWith('met_'))))
log('A6 호감=VN(sceneId 있음) · 소문=서술(sceneId 없음):',
  ok(defs.bondsHaveScene && defs.rumorsNoScene))
const prioUnique = new Set(defs.prios).size === defs.prios.length && defs.prios.every((p) => p != null)
log('A7 priority 12건 전부 유일값:', JSON.stringify(defs.prios), ok(prioUnique))

// ── B. 실제 발동 (결정론, 13→15세) ─────────────────────────
// 13세 첫 등장은 childhood 가 담당하므로 여기선 met 를 미리 세워 관계 씬만 본다.
const run = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setDeterministic(true)
  q.setMinorEnabled(false)
  q.setGame({
    phase: 'schedule',
    age: 13,
    date: { year: 2, month: 1 },
    flags: { met_heir: true, met_loyalist: true, met_commander: true, met_prince: true },
    affection: {},
  })
  const fired = []
  for (let i = 0; i < 60; i++) {
    const g = q.state
    if (g.age > 15) break
    const plan = g.wellbeing < 40 ? ['rest', 'rest', 'rest'] : ['lecture-statecraft', 'rest', 'rest']
    const r = q.stepTurn(plan)
    for (const id of r.triggeredEventIds ?? []) fired.push(id)
    if (r.phase === 'ended') break
  }
  const s = q.state
  return { fired, affection: s.affection, chamber: s.flags.hint_queen_chamber === true, rumorFlag: s.flags.heard_frontier_rumor === true }
})

log('')
log('=== B. 실제 발동 (결정론, 13→15세) ===')
for (const [char, ids] of Object.entries(BONDS)) {
  const got = ids.filter((id) => run.fired.includes(id))
  log(`   ${char}: ${got.length}/${ids.length}  (${got.join(', ')})`)
}
log('B1 호감 9씬 전부 발동:', ok(ALL_BONDS.every((id) => run.fired.includes(id))))
const rumorsFired = RUMORS.filter((id) => run.fired.includes(id))
log('B2 소문 3건 발동:', `${rumorsFired.length}/3`, ok(rumorsFired.length === 3))
log('B3 소문이 heard_frontier_rumor 를 세움:', ok(run.rumorFlag))
log('B4 ★ 13~15세 구간에 hint_queen_chamber 가 서지 않음:', ok(!run.chamber))

// ── C. ★ 호감도 낙차 설계 ─────────────────────────────────
const aff = run.affection
const A = { heir: aff.heir ?? 0, loyalist: aff.loyalist ?? 0, commander: aff.commander ?? 0, prince: aff.prince ?? 0 }
log('')
log('=== C. 호감도 낙차 (데뷔탕트 출발점) ===')
log(`   ① heir=${A.heir}  ② loyalist=${A.loyalist}  ⑤ commander=${A.commander}  ③ prince=${A.prince}  ④ hero=${aff.hero ?? 0}`)
const heirLowest = A.heir < A.loyalist && A.heir < A.commander && A.heir < A.prince
log('C1 ★ ① 이 넷 중 최저(메인 로맨스는 바닥에서 출발):', A.heir, ok(heirLowest))
log('C2 ① ≈ 4 (0 + 2×2):', ok(A.heir === 4))
log('C3 ② ≈ 32 (20 + 4×3):', ok(A.loyalist === 32))
log('C4 ⑤ ≈ 32 (20 + 4×3):', ok(A.commander === 32))
log('C5 ③ ≈ 11 (5 + 3×2):', ok(A.prince === 11))
log('C6 ★ ④(영웅)는 만난 게 아니라 소문 — 호감도 0:', ok((aff.hero ?? 0) === 0))

// ④ 인연 창에서 아직 ??? 인지(소문만으론 met 아님).
await page.evaluate(() => {
  window.__queeningAi.setGame({
    phase: 'schedule', age: 15,
    flags: { met_heir: true, met_loyalist: true, met_commander: true, met_prince: true, heard_frontier_rumor: true },
  })
})
await page.waitForTimeout(200)
const coach = page.locator('[data-coach="bond"]')
if (await coach.isVisible().catch(() => false)) {
  await page.getByRole('button', { name: '알겠어요' }).click().catch(() => {})
  await page.waitForTimeout(150)
}
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(250)
const dialog = page.getByRole('dialog', { name: '인연' })
const names = (await dialog.locator('ul > li').allInnerTexts()).map((n) => n.split('\n')[0])
await page.keyboard.press('Escape')
log('C7 ★ 소문만으론 ④ 가 인연 창에 아직 ??? (얼굴은 입궁 때):',
  JSON.stringify(names), ok(names.includes('???')))

// ── D. VN 재생 ────────────────────────────────────────────
log('')
log('=== D. 관계 씬 VN 재생 ===')
const vn = await page.evaluate(() => {
  const q = window.__queeningAi
  q.forceEvent('bond-heir-appraise')
  return q.state.phase
})
await page.waitForTimeout(300)
const speakerVisible = await page.locator('[data-screen="event"]').isVisible().catch(() => false)
log('D1 관계 이벤트가 씬(event) 화면으로 재생:', ok(vn === 'event' && speakerVisible))

await browser.close()
