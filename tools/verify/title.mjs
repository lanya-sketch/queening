// D-1 타이틀 + 온보딩 검증 (작동 + 실제 화면).
//
// ★ UX 라운드라 "작동하는가"를 검증하되, "좋은가"는 스크린샷으로 사람이 본다.
//   여기서는 진입 흐름·메뉴 상태·온보딩 순차·툴팁 하이라이트·스킵을 자동 확인한다.
import { APP_URL, launch, log, ok, passIntro, shotsDir } from './helpers.mjs'

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
log('A4 설정·엔딩 기록 활성(도움말·갤러리 접근):',
  ok(!(await p.getByRole('button', { name: '설정' }).isDisabled()) &&
     !(await p.getByRole('button', { name: '엔딩 기록' }).isDisabled())))
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
await q.waitForTimeout(300)
// D-3: 새 게임 → 인트로(선왕 배경 → 성별) → 온보딩. 인트로를 통과한다.
log('B0 새 게임 → 인트로(선왕 배경) 먼저:',
  ok(await q.getByText('선왕이 스러졌다').isVisible().catch(() => false)))
await passIntro(q)
await q.waitForTimeout(300)
log('B1 인트로 뒤 온보딩 진입:', ok(await q.getByText('노귀족').isVisible()))
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
await passIntro(s) // 인트로 통과 후 온보딩에서 건너뛰기.
await s.getByRole('button', { name: '건너뛰기' }).click()
await s.waitForTimeout(300)
log('C1 ★ (온보딩) 건너뛰기 → 바로 플레이:',
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
const ofIntro = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E2 인트로 375px 오버플로 없음:', ok(ofIntro.sw <= ofIntro.iw))
await passIntro(m)
await m.waitForTimeout(300)
const of2 = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E3 온보딩 375px 오버플로 없음:', ok(of2.sw <= of2.iw))
await m.screenshot({ path: `${OUT}/mobile-onboarding.png` })

// ─────────────────────────────────────────────────────────────
// ★ 말풍선이 요소를 **가리지 않고 옆에** 붙는지 — 이 라운드의 핵심.
log('')
log('=== F. 말풍선 배치 (요소 옆, 안 가림) ===')
// AP 툴팁 줄(인덱스 4)까지 진행한다.
async function toApTip(page) {
  await page.getByRole('button', { name: '새 게임' }).click()
  await page.waitForTimeout(400)
  await passIntro(page) // 인트로 통과 후 온보딩으로.
  await page.waitForTimeout(200)
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /^다음$/ }).click()
    await page.waitForTimeout(220)
  }
  await page.waitForTimeout(300) // 말풍선 위치 계산(2차 layout effect) 안정화
}
// 말풍선 상자 + AP 요소 상자를 재서 겹치지 않는지 본다.
const boxes = (page) =>
  page.evaluate(() => {
    const ap = document.querySelector('[data-onboard="ap"]')?.getBoundingClientRect()
    // 툴팁 고유 문구로 말풍선을 찾는다("행동력"은 AP 박스 라벨에도 있어 모호하다).
    const tipP = [...document.querySelectorAll('p')].find((p) =>
      p.textContent.includes('세 가지 활동까지'))
    let node = tipP
    while (node && getComputedStyle(node).position !== 'absolute') node = node.parentElement
    const b = node?.getBoundingClientRect()
    const R = (r) => (r ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null)
    return { ap: R(ap), bubble: R(b), vw: window.innerWidth, vh: window.innerHeight,
      hi: document.querySelector('[data-onboard="ap"]')?.classList.contains('onboard-highlight') }
  })
const f = await fresh(1280, 900)
await toApTip(f)
const fb = await boxes(f)
const noOverlap = (a, c) => !a || !c || a.r <= c.l + 1 || a.l >= c.r - 1 || a.b <= c.t + 1 || a.t >= c.b - 1
log('F1 ★ AP 요소 하이라이트 + 말풍선 존재:', ok(fb.hi === true && !!fb.bubble))
log('F2 ★ 말풍선이 AP 요소를 가리지 않음(겹침 없음):', ok(noOverlap(fb.bubble, fb.ap)))
log('F3 ★ 말풍선이 화면 안(좌우 오버플로 없음):',
  ok(!!fb.bubble && fb.bubble.l >= 0 && fb.bubble.r <= fb.vw && fb.bubble.t >= 0 && fb.bubble.b <= fb.vh))
await f.screenshot({ path: `${OUT}/bubble-desktop.png` })
// 375px 에서도 말풍선이 화면 안
const fm = await fresh(375, 812)
await toApTip(fm)
const fmb = await boxes(fm)
log('F4 ★ 375px 말풍선 화면 안 + AP 안 가림:',
  ok(!!fmb.bubble && fmb.bubble.l >= 0 && fmb.bubble.r <= fmb.vw && noOverlap(fmb.bubble, fmb.ap)))
await fm.screenshot({ path: `${OUT}/bubble-mobile.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== G. 도움말 (타이틀 설정 + 게임 중 ?) ===')
const g = await fresh(1280, 900)
await g.getByRole('button', { name: '설정' }).click()
await g.waitForTimeout(200)
log('G1 ★ 타이틀 설정 → 메뉴에 도움말:',
  ok(await g.getByRole('button', { name: '도움말' }).isVisible()))
await g.getByRole('button', { name: '도움말' }).click()
await g.waitForTimeout(200)
log('G2 ★ 도움말 열림 + 스탯 내용:',
  ok((await g.getByRole('heading', { name: '도움말' }).isVisible()) &&
     (await g.getByText('통치학', { exact: true }).isVisible())))
const covers = await g.evaluate(() => {
  const t = document.body.innerText
  return ['통치학', '궁정처세', '국정 영향도', '섭정 의심', '심신', '행동력', '무리는 금물']
    .every((x) => t.includes(x))
})
log('G3 ★ 스탯·게이지·시스템·내구도 힌트 다 담음:', ok(covers))
log('G4 "~입니다" 체:',
  ok(await g.evaluate(() => /입니다|됩니다/.test(document.body.innerText))))
log('G5 ★ 내구도 이름·수치 노출 안 됨(힌트만):',
  ok(await g.evaluate(() => !document.body.innerText.includes('내구도'))))
const ofh = await g.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('G6 도움말 375 오버플로 없음(데스크톱 기준):', ok(ofh.sw <= ofh.iw))
await g.screenshot({ path: `${OUT}/help.png`, fullPage: true })
await g.getByRole('button', { name: '닫는다' }).click()
await g.waitForTimeout(200)
// 게임 중 ? 버튼
await g.getByRole('button', { name: '새 게임' }).click()
await g.waitForTimeout(300)
await g.getByRole('button', { name: '건너뛰기' }).click()
await g.waitForTimeout(300)
await g.locator('[data-help-button]').first().click()
await g.waitForTimeout(200)
log('G7 ★ 게임 중 ? 버튼 → 도움말 열림:',
  ok(await g.getByRole('heading', { name: '도움말' }).isVisible()))
await g.screenshot({ path: `${OUT}/help-ingame.png` })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
