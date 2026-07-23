// 월 단위 전환 — 내구도 곡선 + 성장 스케일 검증.
//
//   A 내구도 계수 곡선 (초반 혹독 / 후반 가속) — 수학으로 증명
//   B 실제 플레이 — 내구도가 쌓이고 상세창에 보이는지, 무리형이 초반에 위험한지
//   C 성장 스케일 — 108턴 최종 스탯이 의도 범위(계절판과 비슷)인지는 simulate 가 본다
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('durability')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const durInfo = (d) => page.evaluate((v) => window.__queeningAi.durabilityInfo(v), d)
const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)

// ─────────────────────────────────────────────────────────────
log('=== A. ★ 내구도 계수 곡선 ===')
const d0 = await durInfo(0) // 11세 시작
const d30 = await durInfo(30) // PIVOT
const d70 = await durInfo(70) // 잘 관리한 후반
log(`   내구도 0(11세)  심신소모 ×${d0.cost.toFixed(2)}  성장 ×${d0.growth.toFixed(2)}`)
log(`   내구도 30(중심축) 심신소모 ×${d30.cost.toFixed(2)}  성장 ×${d30.growth.toFixed(2)}`)
log(`   내구도 70(관리)  심신소모 ×${d70.cost.toFixed(2)}  성장 ×${d70.growth.toFixed(2)}`)
log('A1 ★ 초반(낮은 내구도) 심신 소모가 크다:', ok(d0.cost > 1.3))
log('A2 중심축에서 소모·성장 모두 1(벌도 상도 없음):',
  ok(Math.abs(d30.cost - 1) < 0.001 && Math.abs(d30.growth - 1) < 0.001))
// ★ 밸런스 재설계에서 GROWTH_SLOPE 를 절반(0.01→0.005)으로 내렸다 — 가속은 수업 등급이
//   맡고 내구도는 "초반 혹독 + 돌본 만큼의 보상"만 맡는 역할 분담. 그래서 문턱도 1.3→1.15.
//   (역할이 줄었을 뿐 방향은 그대로여서 A5 단조성이 여전히 이 항목의 본체다)
log('A3 ★ 후반(높은 내구도) 성장이 빠르다:', ok(d70.growth > 1.15))
log('A4 ★ 소모는 내구도가 오를수록 준다(단조):', ok(d0.cost > d30.cost && d30.cost >= d70.cost))
log('A5 ★ 성장은 내구도가 오를수록 는다(단조):', ok(d70.growth > d30.growth && d30.growth >= d0.growth))
log('A6 나이 그릇: 11세 base', d0.base11, '→ 20세 base', d0.base20,
  ok(d0.base11 === 0 && d0.base20 > 40))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★ 실제 플레이 — 내구도 누적 + 초반 혹독 ===')
// 새 게임 시작 상태
await setGame({
  date: { year: 0, month: 1 }, age: 11, durability: 0, wellbeing: 70,
  stats: { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 },
  flags: {}, counters: {}, phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
})
const startDur = (await stateOf()).durability
log('B1 시작 내구도 0 (11세):', startDur, ok(startDur === 0))

// ★ 무리형 — 11세에 무리한 활동(검술+통치+국고, 심신 소모 큰 것들)을 몇 턴.
async function overworkTurn() {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: ['sword-training', 'lecture-statecraft', 'lecture-finance'] })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(250)
  const b = page.getByRole('button', { name: /다음 달로|무슨 일이|계속/ })
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(200) }
}
const wb0 = (await stateOf()).wellbeing
await overworkTurn()
const wb1 = (await stateOf()).wellbeing
await overworkTurn()
const wb2 = (await stateOf()).wellbeing
log(`B2 무리형 심신 추이: ${wb0.toFixed(0)} → ${wb1.toFixed(0)} → ${wb2.toFixed(0)}`)
log('B3 ★ 11세에 무리하면 2턴 만에 심신 위험선(25) 근처:', ok(wb2 <= 30))

// 같은 무리를 잘 자란 상태(높은 내구도)에서 하면 덜 깎인다
await setGame({
  age: 18, durability: 70, wellbeing: 70,
  phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
})
const wbHi0 = (await stateOf()).wellbeing
await overworkTurn()
const wbHi1 = (await stateOf()).wellbeing
log(`B4 ★ 높은 내구도(70)에선 같은 무리도 덜 깎임: ${wbHi0.toFixed(0)} → ${wbHi1.toFixed(0)}`)
const lowDrop = wb0 - wb1
const highDrop = wbHi0 - wbHi1
log('B5 ★ 초반 소모 > 후반 소모 (혹독의 실증):',
  `초반 -${lowDrop.toFixed(1)} vs 후반 -${highDrop.toFixed(1)}`, ok(lowDrop > highDrop))

// 관리형 — 심신을 높게 유지하면 내구도가 누적된다
await setGame({
  age: 12, durability: 6, wellbeing: 90,
  stats: { statecraft: 12, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 },
  phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
})
const durBefore = (await stateOf()).durability
// 심신을 높게 유지한 채 가벼운 턴을 여러 번
for (let i = 0; i < 3; i++) {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: ['rest', 'debate-practice'], wellbeing: 90 })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(200)
  const b = page.getByRole('button', { name: /다음 달로|무슨 일이|계속/ })
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(150) }
}
const durAfter = (await stateOf()).durability
log(`B6 ★ 심신 높게 유지 → 내구도 누적: ${durBefore.toFixed(1)} → ${durAfter.toFixed(1)}`,
  ok(durAfter > durBefore))

// 상세창에 내구도가 보이는지 (숨은 상태 — 막대는 없고 상세창만)
await setGame({ durability: 42.5 })
await page.getByRole('button', { name: '상세' }).click().catch(() => {})
await page.waitForTimeout(200)
await page.getByText('상세 (내부값)').click()
await page.waitForTimeout(200)
const detailText = await page.locator('aside').innerText()
log('B7 ★ 내구도가 상세창에만 보임(숨은 상태):',
  ok(detailText.includes('내구도') && detailText.includes('42.5')))
log('B8 상세창에 스탯 소수 표시:', ok(/\d+\.\d\d/.test(detailText)))
await page.screenshot({ path: `${OUT}/01-detail.png` })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
