// D-3 옵션(타이핑·속도·읽은 것만 스킵·설정 오버레이) + 인트로 구조 검증.
import {
  APP_URL, advanceScene, enterGame, launch, log, ok, openSettingsOverlay, passIntro, shotsDir,
} from './helpers.mjs'

const OUT = shotsDir('options')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

const setSpeed = (s) =>
  page.evaluate((v) => localStorage.setItem('queening.options', JSON.stringify({ textSpeed: v })), s)
const freshTitle = async () => {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
}

await page.goto(APP_URL, { waitUntil: 'networkidle' })

// ─────────────────────────────────────────────────────────────
log('=== A. 인트로 구조 — 선왕 배경 → 성별 → 온보딩 ===')
await setSpeed('즉시')
await freshTitle()
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(300)
log('A1 ★ 새 게임 → 인트로(선왕 배경):',
  ok(await page.getByText('선왕이 스러졌다').isVisible()))
await page.screenshot({ path: `${OUT}/intro-prologue.png` })
// narration 을 넘겨 성별 선택 화면이 뜰 때까지 '다음' 을 누른다.
for (let i = 0; i < 8; i++) {
  if (await page.getByText('당신이 키울 이는').isVisible().catch(() => false)) break
  const next = page.getByRole('button', { name: /^다음$/ })
  if (!(await next.isVisible().catch(() => false))) break
  await next.click(); await page.waitForTimeout(150)
}
log('A2 ★ 성별 선택 화면:',
  ok((await page.getByText('당신이 키울 이는').isVisible()) &&
     (await page.getByRole('button', { name: /여왕이 될 소녀/ }).isVisible())))
await page.screenshot({ path: `${OUT}/intro-gender.png` })
await page.getByRole('button', { name: /여왕이 될 소녀/ }).click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: '시작한다' }).click()
await page.waitForTimeout(300)
log('A3 ★ 성별 선택 → 온보딩 진입:', ok(await page.getByText('노귀족').isVisible()))
// 온보딩 스킵하고 게임으로.
await page.getByRole('button', { name: '건너뛰기' }).click()
await page.waitForTimeout(300)
log('A4 ★ 게임 화면 성별 버튼 제거됨(인트로로 이동):',
  ok(!(await page.getByRole('button', { name: '여왕', exact: true }).isVisible().catch(() => false))))
const genderSaved = await page.evaluate(() => window.__queeningAi.state.monarchGender)
log('A5 ★ 인트로에서 고른 성별이 적용됨(여왕):', genderSaved, ok(genderSaved === 'female'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 타이핑 연출 + 속도 ===')
// 즉시: 첫 줄이 바로 전체 표시.
await setSpeed('즉시')
await freshTitle()
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(250)
log('B1 ★ 즉시 속도 → 첫 줄 바로 전체 표시:',
  ok(await page.getByText('선왕이 스러졌다').isVisible()))

// 느리게: 타이핑 중 클릭 → 그 줄 즉시 완성(다음 줄로 안 넘어감).
await setSpeed('느리게')
await freshTitle()
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(120) // 타이핑 진행 중
await page.getByRole('button', { name: /^다음$/ }).click() // 첫 클릭 → 현재 줄 완성
await page.waitForTimeout(120)
const afterComplete = await page.evaluate(() => document.body.innerText)
log('B2 ★ 타이핑 중 클릭 → 그 줄 완성(다음 줄 아직):',
  ok(afterComplete.includes('선왕이 스러졌다') && !afterComplete.includes('독이라')))
await page.getByRole('button', { name: /^다음$/ }).click() // 두번째 클릭 → 다음 줄
await page.waitForTimeout(400)
log('B3 ★ 완성 후 클릭 → 다음 줄로 진행:',
  ok(await page.getByText(/독이라/).isVisible()))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 읽은 것만 스킵 (씬 단위) ===')
await setSpeed('즉시')
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
// 엔딩 씬(친정)을 띄운다 — ScenePlayer 로 재생된다. schedule 로 내려 EndedScreen 을
// 언마운트한 뒤(배치 방지 위해 나눠서) 다시 ended 로 올려 새로 마운트시킨다.
const endScene = async () => {
  await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule' }))
  await page.waitForTimeout(150)
  await page.evaluate(() =>
    window.__queeningAi.setGame({ age: 21, phase: 'ended', courtInfluence: 80, flags: {}, counters: {} }))
  await page.waitForTimeout(300)
}
await endScene()
log('C1 ★ 처음 보는 씬은 스킵 불가(씬 스킵 버튼 없음):',
  ok(!(await page.getByRole('button', { name: '씬 스킵' }).isVisible().catch(() => false))))
// 끝까지 넘겨 읽음 기록.
await advanceScene(page)
await page.waitForTimeout(200)
const readlog = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.readlog') ?? '[]'))
log('C2 ★ 씬을 끝까지 봄 → 읽음 기록:', readlog.join(','), ok(readlog.some((x) => x.startsWith('ending:'))))
// 다시 같은 씬 → 스킵 버튼 활성.
await endScene()
await page.waitForTimeout(300)
log('C3 ★ 읽은 씬 재생 → 씬 스킵 버튼 활성:',
  ok(await page.getByRole('button', { name: '씬 스킵' }).isVisible()))
await page.getByRole('button', { name: '씬 스킵' }).click()
await page.waitForTimeout(200)
log('C4 ★ 씬 스킵 → 결산으로 바로:', ok(await page.getByText('아홉 해가 남긴 것').isVisible()))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 설정 오버레이 구성 ===')
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
await openSettingsOverlay(page)
const settingsText = await page.evaluate(() => document.body.innerText)
log('D1 ★ 설정에 도움말·텍스트 속도·AI 설정·읽음 기록·사운드:',
  ok(['도움말', '텍스트 속도', 'AI 설정', '읽음 기록', '사운드'].every((t) => settingsText.includes(t))))
log('D2 ★ 텍스트 속도 4단계:',
  ok(['느리게', '보통', '빠르게', '즉시'].every((s) =>
    /* 버튼으로 존재 */ settingsText.includes(s))))
log('D3 사운드 준비 중(비활성 자리):', ok(settingsText.includes('준비 중')))
await page.screenshot({ path: `${OUT}/settings.png` })
// 속도 바꾸면 저장(별도 키).
await page.getByRole('button', { name: '빠르게', exact: true }).click()
await page.waitForTimeout(150)
const savedSpeed = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.options')).textSpeed)
log('D4 ★ 속도 선택이 별도 키에 저장:', savedSpeed, ok(savedSpeed === '빠르게'))
// AI 설정이 설정 오버레이 안에서 열림.
await page.getByRole('button', { name: /AI 설정/ }).click()
await page.waitForTimeout(200)
log('D5 ★ 설정 → AI 설정 모달 열림:',
  ok(await page.getByRole('dialog', { name: 'AI 설정' }).isVisible()))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 반응형 375px (인트로) ===')
const m = await browser.newPage({ viewport: { width: 375, height: 812 } })
await m.goto(APP_URL, { waitUntil: 'networkidle' })
await m.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await m.reload({ waitUntil: 'networkidle' })
await m.waitForTimeout(300)
await m.getByRole('button', { name: '새 게임' }).click()
await m.waitForTimeout(300)
const ofi = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E1 인트로 375px 오버플로 없음:', ok(ofi.sw <= ofi.iw))
await passIntro(m)
await m.waitForTimeout(200)
const ofg = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('E2 인트로 뒤 375px 오버플로 없음:', ok(ofg.sw <= ofg.iw))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
