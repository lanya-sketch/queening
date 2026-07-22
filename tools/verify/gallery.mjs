// D-2 엔딩 갤러리 + 진행 가시성 검증 (작동 + 실제 화면).
//
// ★ 갤러리(달성/미달성·스포일러·달성률·회차 누적), 초상 배경 구간, 결산 차등을 본다.
import { APP_URL, advanceScene, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('gallery')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => { localStorage.clear() })
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const galleryIds = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('queening.gallery') ?? '[]'))
const throneOf = () =>
  page.evaluate(() => document.querySelector('[data-throne]')?.getAttribute('data-throne'))

// ─────────────────────────────────────────────────────────────
log('=== A. 초상 배경 — 실권 구간별 변화 ===')
await setGame({ courtInfluence: 20 })
await page.waitForTimeout(200)
const t1 = await throneOf()
await page.screenshot({ path: `${OUT}/throne-puppet.png`, clip: { x: 0, y: 0, width: 340, height: 260 } })
await setGame({ courtInfluence: 55 })
await page.waitForTimeout(200)
const t2 = await throneOf()
await page.screenshot({ path: `${OUT}/throne-coexist.png`, clip: { x: 0, y: 0, width: 340, height: 260 } })
await setGame({ courtInfluence: 85 })
await page.waitForTimeout(200)
const t3 = await throneOf()
await page.screenshot({ path: `${OUT}/throne-autonomy.png`, clip: { x: 0, y: 0, width: 340, height: 260 } })
log(`   영향도 20→${t1} · 55→${t2} · 85→${t3}`)
log('A1 ★ 허수아비(<45) 구간:', ok(t1 === 'puppet'))
log('A2 ★ 공존(45~69) 구간:', ok(t2 === 'coexist'))
log('A3 ★ 친정(70+) 구간:', ok(t3 === 'autonomy'))
log('A4 ★ 구간마다 배경 상태가 실제로 다름:', ok(t1 !== t2 && t2 !== t3))

// ─────────────────────────────────────────────────────────────
// 특정 엔딩으로 종료 화면을 띄우는 도우미.
async function endWith(patch) {
  // EndedScreen 은 마운트 시 한 번만 판정·기록한다 → 먼저 schedule 로 내려 언마운트한 뒤
  // 다시 ended 로 올려 새로 마운트시킨다(엔딩을 바꿔 가며 검증하기 위함).
  await setGame({ phase: 'schedule' })
  await page.waitForTimeout(150)
  await setGame({
    age: 21, phase: 'ended', actionPoints: 0, plannedActivityIds: [], pendingEventIds: [],
    ...patch,
  })
  await page.waitForTimeout(300)
  await advanceScene(page) // 엔딩 씬을 넘겨 결산으로.
  await page.waitForTimeout(300)
}

log('')
log('=== B. 엔딩 기록 + 결산 차등 ===')
await page.evaluate(() => localStorage.removeItem('queening.gallery'))
// 친정 — 영향도 80 + 깊은 진실 + 정당 심판.
await endWith({
  courtInfluence: 80,
  flags: { truth_regent_involved: true, truth_mother_mastermind: true, just_purge: true },
})
const afterAutonomy = await galleryIds()
log('B1 ★ 엔딩 도달 → 갤러리에 기록됨:', afterAutonomy.join(','),
  ok(afterAutonomy.includes('autonomy') && afterAutonomy.includes('just-purge')))
log('B2 ★ 결산 차등 — 도달한 자리·진실·처분 행 표시:',
  ok((await page.getByText('도달한 자리').isVisible()) &&
     (await page.getByText('아버지의 죽음').isVisible()) &&
     (await page.getByText('숙부의 처분').isVisible())))
await page.screenshot({ path: `${OUT}/summary-autonomy.png`, fullPage: true })

// 배드 엔딩(제국복속) — 다른 톤.
await endWith({
  courtInfluence: 30, stats: { statecraft: 20, finance: 20, martial: 20, rhetoric: 10, courtcraft: 10 },
  flags: { union_possible: true },
})
const afterBad = await galleryIds()
log('B3 ★ 배드 엔딩도 기록:', afterBad.join(','), ok(afterBad.includes('bad-subjugated')))
log('B4 결산 표시(배드):', ok(await page.getByText('아홉 해가 남긴 것').isVisible()))
await page.screenshot({ path: `${OUT}/summary-bad.png`, fullPage: true })

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 갤러리 화면 — 달성/미달성·스포일러·달성률 ===')
// 타이틀로 돌아가 '엔딩 기록'을 연다(갤러리 기록은 localStorage 라 리로드에도 남는다).
await page.evaluate(() => { sessionStorage.removeItem('queening.enterGame') })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.getByRole('button', { name: '엔딩 기록' }).click()
await page.waitForTimeout(300)
log('C1 ★ 타이틀 엔딩 기록 → 갤러리 열림:',
  ok(await page.getByRole('heading', { name: '엔딩 기록' }).isVisible()))
const total = await page.evaluate(() => document.body.innerText.match(/(\d+)\s*\/\s*(\d+)\s*달성/)?.[0])
log('C2 ★ 달성률 표시:', total, ok(/\/\s*12\s*달성/.test(total ?? '')))
log('C3 ★ 달성 항목(친정) 제목+대표 장면:',
  ok((await page.getByText('친정', { exact: true }).isVisible()) &&
     (await page.getByText(/서명하지 않는다/).isVisible())))
log('C4 ★ 미달성 실권 제목은 보임(허수아비):',
  ok(await page.getByText('허수아비', { exact: true }).isVisible()))
log('C5 ★ 미달성 스포일러 변주는 제목 가림(사랑을 삼킴 안 보임):',
  ok(!(await page.getByText('사랑을 삼킴').isVisible().catch(() => false))))
const hasLock = await page.evaluate(() => document.body.innerText.includes('아직 보지 못한 결말'))
log('C6 미달성 실루엣 잠금 표시:', ok(hasLock))
await page.screenshot({ path: `${OUT}/gallery.png`, fullPage: true })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 회차 누적 — 세이브 지워도 갤러리 유지 ===')
const before = await galleryIds()
await page.evaluate(() => localStorage.removeItem('queening.save'))
const after = await galleryIds()
log('D1 ★ 게임 세이브 삭제 후에도 갤러리 기록 유지:',
  `${before.length}개 → ${after.length}개`, ok(after.length === before.length && after.length > 0))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 반응형 (375px) ===')
const m = await browser.newPage({ viewport: { width: 375, height: 812 } })
await m.goto(APP_URL, { waitUntil: 'networkidle' })
await m.waitForTimeout(300)
await m.getByRole('button', { name: '엔딩 기록' }).click()
await m.waitForTimeout(300)
const ofg = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E1 갤러리 375px 오버플로 없음:', ok(ofg.sw <= ofg.iw))
await m.screenshot({ path: `${OUT}/gallery-mobile.png` })

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
