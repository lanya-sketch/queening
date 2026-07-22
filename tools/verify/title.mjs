// D-1 타이틀 + 온보딩 검증 (작동 + 실제 화면).
//
// ★ UX 라운드라 "작동하는가"를 검증하되, "좋은가"는 스크린샷으로 사람이 본다.
//   여기서는 진입 흐름·메뉴 상태·온보딩 순차·툴팁 하이라이트·스킵을 자동 확인한다.
import { APP_URL, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('title')
const browser = await launch()
const errors = []

async function fresh(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await p.goto(APP_URL, { waitUntil: 'networkidle' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  return p
}

// ─────────────────────────────────────────────────────────────
log('=== A. 타이틀 화면 ===')
const p = await fresh(1280, 900)
log('A1 앱이 타이틀에서 시작:', ok(await p.getByText('Queening').isVisible()))
log('A2 부제·태그라인:', ok(await p.getByText('옥좌의 주인').isVisible()))
log('A3 ★ 세이브 없으면 이어하기 비활성:',
  ok(await p.getByRole('button', { name: '이어하기' }).isDisabled()))
log('A4 설정·엔딩 기록 자리(비활성):',
  ok(await p.getByRole('button', { name: '설정' }).isDisabled()))
const bgLoaded = await p.evaluate(() => {
  const img = document.querySelector('img')
  return img && img.complete && img.naturalWidth > 0
})
log('A5 옥좌 배경 이미지 로드:', ok(bgLoaded))
await p.screenshot({ path: `${OUT}/title-desktop.png` })

// 세이브가 있으면 이어하기 활성
await p.evaluate(() => localStorage.setItem('queening.save',
  JSON.stringify({ version: 6, savedAt: new Date().toISOString(), state: {} })))
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(400)
log('A6 ★ 세이브 있으면 이어하기 활성:',
  ok(!(await p.getByRole('button', { name: '이어하기' }).isDisabled())))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 온보딩 (새 게임 진입) ===')
const q = await fresh(1280, 900)
await q.getByRole('button', { name: '새 게임' }).click()
await q.waitForTimeout(500)
log('B1 새 게임 → 온보딩 진입:', ok(await q.getByText('노귀족').isVisible()))
log('B2 게임 화면이 뒤에 비침(오버레이):',
  ok(await q.getByText('활동 선택').isVisible().catch(() => false)))

// 순차 진행하며 툴팁 하이라이트 확인
const next = () => q.getByRole('button', { name: '다음', exact: true }).click()
for (let i = 0; i < 4; i++) { await next(); await q.waitForTimeout(200) }
const apHi = await q.evaluate(() =>
  document.querySelector('[data-onboard="ap"]')?.classList.contains('onboard-highlight'))
log('B3 ★ AP 대사에서 AP 요소 하이라이트:', ok(apHi === true))
await q.screenshot({ path: `${OUT}/onboarding-ap.png` })

await next(); await q.waitForTimeout(300)
const gaugeHi = await q.evaluate(() =>
  document.querySelector('[data-onboard="gauges"]')?.classList.contains('onboard-highlight'))
log('B4 ★ 게이지 대사에서 게이지 요소 하이라이트:', ok(gaugeHi === true))

// 게이지 다음 대사가 몇 개인지(툴팁 없는 서술 포함) 세지 않고, 하이라이트가
// 뜰 때까지 진행한다 — 온보딩 대사가 늘어도 안 깨진다.
let endHi = false
for (let i = 0; i < 4 && !endHi; i++) {
  await next(); await q.waitForTimeout(250)
  endHi = await q.evaluate(() =>
    document.querySelector('[data-onboard="endTurn"]')?.classList.contains('onboard-highlight'))
}
log('B5 ★ 턴 종료 대사에서 턴 종료 요소 하이라이트:', ok(endHi === true))

// 끝까지 → 시작
for (let i = 0; i < 6; i++) {
  const btn = q.getByRole('button', { name: /^(다음|시작한다)$/ })
  if (!(await btn.isVisible().catch(() => false))) break
  const label = await btn.innerText()
  await btn.click(); await q.waitForTimeout(200)
  if (label.includes('시작')) break
}
await q.waitForTimeout(300)
log('B6 ★ 온보딩 종료 후 플레이 진입:',
  ok(!(await q.getByText('노귀족').isVisible().catch(() => false)) &&
     (await q.getByText('활동 선택').isVisible())))
// 온보딩 종료 후 하이라이트가 남지 않아야 한다
const anyHi = await q.evaluate(() => !!document.querySelector('.onboard-highlight'))
log('B7 하이라이트 잔상 없음:', ok(!anyHi))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 스킵 ===')
const s = await fresh(1280, 900)
await s.getByRole('button', { name: '새 게임' }).click()
await s.waitForTimeout(400)
await s.getByRole('button', { name: '건너뛰기' }).click()
await s.waitForTimeout(300)
log('C1 ★ 건너뛰기 → 바로 플레이:',
  ok(!(await s.getByText('노귀족').isVisible().catch(() => false)) &&
     (await s.getByText('활동 선택').isVisible())))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 이어하기 (온보딩 없이) ===')
const c = await fresh(1280, 900)
await c.evaluate(() => {
  // 진행 중 세이브를 심는다(v6 스키마 최소).
  localStorage.setItem('queening.save', JSON.stringify({
    version: 6, savedAt: new Date().toISOString(),
    state: {
      date: { year: 3, season: 'autumn' }, age: 14,
      stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 35, courtcraft: 30 },
      wellbeing: 60, tutorTrust: 45, regentSuspicion: 20, regentRapport: 30,
      courtInfluence: 25, actionPoints: 3, plannedActivityIds: [], flags: {},
      phase: 'schedule', lastTurnReport: null, pendingEventIds: [],
      currentOutfitId: 'casual', monarchGender: 'male', affection: {}, counters: {},
    },
  }))
})
await c.reload({ waitUntil: 'networkidle' })
await c.waitForTimeout(400)
await c.getByRole('button', { name: '이어하기' }).click()
await c.waitForTimeout(400)
log('D1 ★ 이어하기 → 온보딩 없이 플레이:',
  ok(!(await c.getByText('노귀족').isVisible().catch(() => false)) &&
     (await c.getByText('활동 선택').isVisible())))
log('D2 세이브 상태로 이어짐(14세):',
  ok((await c.getByText(/14세/).isVisible().catch(() => false))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 반응형 (375px) ===')
const m = await fresh(375, 812)
const of1 = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E1 타이틀 375px 오버플로 없음:', ok(of1.sw <= of1.iw))
await m.getByRole('button', { name: '새 게임' }).click()
await m.waitForTimeout(400)
const of2 = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E2 온보딩 375px 오버플로 없음:', ok(of2.sw <= of2.iw))
await m.screenshot({ path: `${OUT}/mobile-onboarding.png` })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
