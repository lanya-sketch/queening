// 착장 매니페스트 안전장치 검사.
// 유저가 손으로 고치는 파일이므로, 깨졌을 때 게임이 죽지 않는지 확인한다.
import { APP_URL, launch, log, ok, portrait } from './helpers.mjs'

const browser = await launch()

// 1) 앱이 요청하는 리소스 중 404 가 있는지
const c1 = await browser.newContext({ viewport: { width: 375, height: 812 } })
const p1 = await c1.newPage()
const failed = []
p1.on('response', (r) => { if (r.status() === 404) failed.push(r.url()) })
await p1.goto(APP_URL, { waitUntil: 'networkidle' })
await p1.waitForTimeout(400)
log('1) 404 요청:', failed.length ? failed.join(', ') : '없음', ok(failed.length === 0))

// 2) 매니페스트 JSON 이 깨졌을 때 폴백
const c2 = await browser.newContext({ viewport: { width: 375, height: 812 } })
const p2 = await c2.newPage()
await p2.route('**/assets/outfits/manifest.json', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{ 이건 JSON 이 아님' }))
await p2.goto(APP_URL, { waitUntil: 'networkidle' })
await p2.waitForTimeout(400)
await portrait(p2).click()
await p2.waitForTimeout(300)
const d2 = p2.getByRole('dialog')
log('2) 깨진 JSON → 게임 살아있음:', ok(await d2.isVisible()))
log('   내장 착장 4벌로 대체:', ok((await d2.locator('ul button').count()) === 4))
log('   폴백 경고 표시:', ok(await d2.getByText('내장 기본 착장을 쓰고').isVisible()))

// 3) 일부 착장만 망가진 경우 — 그 항목만 건너뛰는지
const c3 = await browser.newContext({ viewport: { width: 375, height: 812 } })
const p3 = await c3.newPage()
await p3.route('**/assets/outfits/manifest.json', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      outfits: [
        { id: 'casual', name: '사복', description: '테스트', thumbSrc: '/assets/outfits/casual-thumb.svg', fullSrc: '/assets/outfits/casual-full.svg' },
        { id: 'broken', name: '망가진 착장' }, // thumbSrc/fullSrc 없음
        { id: 'casual', name: '중복 id' },
      ],
    }),
  }))
await p3.goto(APP_URL, { waitUntil: 'networkidle' })
await p3.waitForTimeout(400)
await portrait(p3).click()
await p3.waitForTimeout(300)
const d3 = p3.getByRole('dialog')
const count3 = await d3.locator('ul button').count()
log('3) 잘못된 항목만 제외 → 남은 착장:', count3, ok(count3 === 1))
log('   폴백 아님(유저 매니페스트 사용):',
  ok(!(await d3.getByText('내장 기본 착장을 쓰고').isVisible().catch(() => false))))

// 4) 세이브의 착장 id 가 매니페스트에서 사라진 경우
const c4 = await browser.newContext({ viewport: { width: 375, height: 812 } })
const p4 = await c4.newPage()
await p4.goto(APP_URL, { waitUntil: 'networkidle' })
await p4.evaluate(() => {
  localStorage.setItem('queening.save', JSON.stringify({
    version: 4, savedAt: '2026-01-01T00:00:00.000Z', state: {
      date: { year: 1, season: 'spring' }, age: 12,
      stats: { statecraft: 20, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 },
      wellbeing: 50, tutorTrust: 30, regentSuspicion: 10, regentRapport: 20, courtInfluence: 10,
      actionPoints: 3, plannedActivityIds: [], flags: {}, phase: 'schedule',
      lastTurnReport: null, pendingEventIds: [], currentOutfitId: '유령착장',
    },
  }))
})
await p4.reload({ waitUntil: 'networkidle' })
await p4.waitForTimeout(400)
await p4.getByRole('button', { name: '상세' }).click()
await p4.getByRole('button', { name: '불러오기' }).click()
await p4.waitForTimeout(300)
const src4 = await portrait(p4).locator('img').getAttribute('src')
log('4) 존재하지 않는 착장 id → 기본값 복귀:', ok(src4.includes('casual-thumb')))

await browser.close()
