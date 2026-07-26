/**
 * 실플레이 피드백 UX 묶음 검증 (#1 이름 · #2 성별 초상 · #3 착장 게이트 · #4 계절 · #5 기본 착장).
 *
 * A. 이름 — 인트로 입력·기본값·성별 스왑, {이름} 토큰이 사이드바/엔딩에 반영, v7→v8 마이그레이션.
 * B. 성별 선택이 초상화로 — 11세 사복 초상 두 장, 클릭 선택, 375px 무오버플로.
 * C. 착장 게이트 완화 — 어린 나이에 연회복·갑주 해금, 데뷔탕트복만 상황 전용. 기본=정무복.
 * D. 계절 이벤트 — 소소 풀에 봄·여름·가을·겨울 마커가 month 로 걸리고, 동양 소재 0.
 */
import { APP_URL, enterGame, launch, log, ok, passIntro, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ux-bundle')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

async function freshTitle() {
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
}
const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)

// ── A. 이름 ───────────────────────────────────────────────
log('=== A. 군주 이름 ===')
await freshTitle()
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(300)
// narration 넘겨 성별/이름 화면으로.
for (let i = 0; i < 8; i++) {
  if (await page.getByText('당신이 키울 이는').isVisible().catch(() => false)) break
  const next = page.getByRole('button', { name: /^다음$/ })
  if (!(await next.isVisible().catch(() => false))) break
  await next.click(); await page.waitForTimeout(120)
}
const nameInput = page.locator('[data-intro-name]')
// 남 기본값 → placeholder/기본, 여 선택 시 기본값이 아일라로 따라오는지.
await page.getByRole('button', { name: /왕이 될 소년/ }).click()
await page.waitForTimeout(120)
const maleDefault = await nameInput.inputValue()
log('A1 ★ 남 선택 시 기본 이름 카이로스:', maleDefault, ok(maleDefault === '카이로스'))
await page.getByRole('button', { name: /여왕이 될 소녀/ }).click()
await page.waitForTimeout(120)
const femaleDefault = await nameInput.inputValue()
log('A2 ★ 여로 바꾸면 기본 이름이 아일라로 따라옴(안 건드렸을 때):', femaleDefault, ok(femaleDefault === '아일라'))
// 직접 입력 → 성별 바꿔도 유지.
await nameInput.fill('세라피나')
await page.waitForTimeout(80)
await page.getByRole('button', { name: /왕이 될 소년/ }).click()
await page.waitForTimeout(120)
const keptCustom = await nameInput.inputValue()
log('A3 ★ 직접 입력한 이름은 성별 바꿔도 유지:', keptCustom, ok(keptCustom === '세라피나'))
await page.screenshot({ path: `${OUT}/intro-name-gender.png` })
// 정체성 → 기질(기본 균형) → 온보딩 → 게임. 이름이 상태에 반영.
await page.getByRole('button', { name: '다음' }).click()
await page.waitForTimeout(120)
await page.getByRole('button', { name: '시작한다' }).click()
await page.waitForTimeout(250)
await page.getByRole('button', { name: '건너뛰기' }).click().catch(() => {})
await page.waitForTimeout(250)
const st = await stateOf()
log('A4 ★ 고른 이름이 상태에 반영:', st.monarchName, ok(st.monarchName === '세라피나'))
// 사이드바 표시.
const panelName = await page.locator('[data-panel-name]').first().innerText().catch(() => '')
log('A5 ★ 사이드바에 이름 표시:', panelName, ok(panelName.includes('세라피나')))

// {이름} 토큰이 빈칸이면 성별 기본값으로.
await setGame({ monarchName: '', monarchGender: 'female', phase: 'schedule' })
await page.waitForTimeout(150)
const panelDefault = await page.locator('[data-panel-name]').first().innerText().catch(() => '')
log('A6 ★ 이름 빈칸이면 성별 기본값(아일라) 표시:', panelDefault, ok(panelDefault.includes('아일라')))

// 엔딩 헤더에 이름.
await setGame({ monarchName: '카이로스', monarchGender: 'male', age: 20, phase: 'ended', date: { year: 9, month: 8 } })
await page.waitForTimeout(300)
// 엔딩 씬을 넘겨 결산 헤더까지.
for (let i = 0; i < 40; i++) {
  const nx = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (!(await nx.isVisible().catch(() => false))) break
  await nx.click(); await page.waitForTimeout(60)
}
const endedText = await page.locator('[data-screen="ended"], [data-screen="dead"]').first().innerText().catch(() => '')
log('A7 ★ 엔딩 화면에 이름 노출:', ok(endedText.includes('카이로스')))
await page.screenshot({ path: `${OUT}/ended-name.png` })

// v7 → v8 마이그레이션: 이름 없는 옛 세이브가 기본값으로 살아남는지.
// ★ 세이브를 심은 뒤에는 localStorage 를 지우지 않는다(freshTitle 금지) — 심은 걸 날린다.
await page.evaluate(() => {
  const s = { ...window.__queeningAi.state }
  delete s.monarchName
  s.monarchGender = 'female'
  localStorage.setItem('queening.save', JSON.stringify({ version: 7, savedAt: 'x', state: s }))
  sessionStorage.clear() // 타이틀이 뜨도록 enterGame 플래그 제거
})
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.getByRole('button', { name: '이어하기' }).click()
await page.waitForTimeout(400)
const loaded = await stateOf()
log('A8 ★ v7 세이브(이름 없음) → 성별 기본값으로 마이그레이션:', loaded.monarchName,
  ok(loaded.monarchName === '아일라'))
log('A9 ★ 마이그레이션 후 게임 진행 상태 정상(크래시 없음):', loaded.age, ok(typeof loaded.age === 'number'))

// ── B. 성별 초상 선택 ─────────────────────────────────────
log('')
log('=== B. 성별 선택 = 초상화 ===')
await freshTitle()
await page.getByRole('button', { name: '새 게임' }).click()
await page.waitForTimeout(250)
for (let i = 0; i < 8; i++) {
  if (await page.getByText('당신이 키울 이는').isVisible().catch(() => false)) break
  const next = page.getByRole('button', { name: /^다음$/ })
  if (!(await next.isVisible().catch(() => false))) break
  await next.click(); await page.waitForTimeout(120)
}
const choiceImgs = await page.evaluate(() =>
  [...document.querySelectorAll('[data-gender-choice] img')].map((im) => ({
    src: im.getAttribute('src'), w: im.naturalWidth,
  })))
log('B1 ★ 성별 선택지 두 장이 초상 이미지:', choiceImgs.length,
  ok(choiceImgs.length === 2 && choiceImgs.every((i) => i.w > 0)))
log('B2 ★ 11세 사복 크롭본 경로:', choiceImgs[0]?.src.split('/').pop(),
  ok(choiceImgs.some((i) => i.src.includes('monarch_m_casual_11')) &&
     choiceImgs.some((i) => i.src.includes('monarch_f_casual_11'))))
await page.getByRole('button', { name: /여왕이 될 소녀/ }).click()
await page.waitForTimeout(120)
const picked = await page.evaluate(() => window.__queeningAi.state.monarchGender)
log('B3 초상 클릭으로 성별 선택:', picked, ok(picked === 'female'))
await page.screenshot({ path: `${OUT}/gender-portraits.png` })

// 375px 무오버플로.
const mp = await browser.newPage({ viewport: { width: 375, height: 812 } })
await mp.goto(APP_URL, { waitUntil: 'networkidle' })
await mp.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await mp.reload({ waitUntil: 'networkidle' })
await mp.waitForTimeout(250)
await mp.getByRole('button', { name: '새 게임' }).click()
await mp.waitForTimeout(200)
for (let i = 0; i < 8; i++) {
  if (await mp.getByText('당신이 키울 이는').isVisible().catch(() => false)) break
  const next = mp.getByRole('button', { name: /^다음$/ })
  if (!(await next.isVisible().catch(() => false))) break
  await next.click(); await mp.waitForTimeout(120)
}
const of = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
log('B4 ★ 성별/이름 화면 375px 무오버플로:', `${of.sw}/${of.iw}`, ok(of.sw <= of.iw))
await mp.screenshot({ path: `${OUT}/gender-375.png` })
await mp.close()

// ── C. 착장 게이트 완화 + 기본 착장 ───────────────────────
log('')
log('=== C. 착장 게이트 · 기본 착장 ===')
// 새로 만든 상태의 시작 착장 = 정무복(createInitialState → DEFAULT_OUTFIT_ID).
await freshTitle()
await enterGame(page)
const defOutfit = await page.evaluate(() => window.__queeningAi.state.currentOutfitId)
log('C1 ★ 기본(시작) 착장 = 정무복(office):', defOutfit, ok(defOutfit === 'office'))

// 실제 매니페스트를 읽어 게이트를 확인한다(런타임이 쓰는 바로 그 파일).
const man = await page.evaluate(async () => (await fetch('/assets/outfits/manifest.json')).json())
const outfitById = Object.fromEntries(man.outfits.map((o) => [o.id, o]))
log('C2 ★ 연회복 게이트 제거(어린 왕도 입음):',
  ok(outfitById.ball && !outfitById.ball.unlockCondition))
log('C3 ★ 갑주 게이트 제거:',
  ok(outfitById.armor && !outfitById.armor.unlockCondition))
// 선택 가능한 착장 중 unlockCondition 이 남은 것이 있는가(있으면 안 됨 — 데뷔탕트복은 선택지 밖).
const gated = man.outfits.filter((o) => o.unlockCondition).map((o) => o.id)
log('C4 ★ 선택 착장에 남은 게이트 0(데뷔탕트복만 상황 전용):', JSON.stringify(gated), ok(gated.length === 0))
log('C5 ★ 데뷔탕트복은 여전히 16세 상황 전용(portraits.restrict):',
  JSON.stringify(man.portraits.restrict?.debut), ok(JSON.stringify(man.portraits.restrict?.debut) === '[16]'))

// UI 실측 — 12세에 착장창을 열어 연회복이 실제로 선택 가능(disabled 아님)한지.
await page.evaluate(() => window.__queeningAi.setGame({ age: 12, phase: 'schedule' }))
await page.waitForTimeout(150)
await page.getByRole('button', { name: /군주 초상/ }).click().catch(() => {})
await page.waitForTimeout(250)
const ballBtn = page.getByRole('button', { name: /연회복/ })
const ballSelectable = (await ballBtn.isVisible().catch(() => false)) && (await ballBtn.isEnabled().catch(() => false))
log('C6 ★ 12세 착장창에서 연회복이 선택 가능(disabled 아님):', ok(ballSelectable))
await page.screenshot({ path: `${OUT}/outfit-gates.png` })
await page.keyboard.press('Escape').catch(() => {})

// ── D. 계절 이벤트 ────────────────────────────────────────
log('')
log('=== D. 계절 이벤트 ===')
const daily = await page.evaluate(() => window.__queeningAi.dailyEvents())
const byMonth = (m) => daily.filter((d) => d.month === m).map((d) => d.id)
log('D1 봄(3월) 마커:', byMonth(3).join(', '), ok(byMonth(3).includes('daily-spring-thaw')))
log('D2 여름(6월) 마커:', byMonth(6).join(', '),
  ok(byMonth(6).includes('daily-rain') && byMonth(6).includes('daily-midsummer-bonfire')))
log('D3 가을(9월) 마커:', byMonth(9).join(', '), ok(byMonth(9).includes('daily-harvest-feast')))
log('D4 겨울(12월) 마커:', byMonth(12).join(', '),
  ok(byMonth(12).includes('daily-first-snow') && byMonth(12).includes('daily-winter-mass')))
// 네 계절 전부 최소 1개.
const seasonsCovered = [3, 6, 9, 12].every((m) => byMonth(m).length >= 1)
log('D5 ★ 네 계절 전부 마커 있음:', ok(seasonsCovered))
// 동양 소재 0 — 계절 이벤트 본문에 금지어가 없는지.
const EAST = ['추석', '설날', '단오', '한식', '정월', '대보름', '차례', '세배', '한복', '떡국', '송편', '부럼', '초파일', '동지팥죽']
const seasonTexts = daily.filter((d) => d.month !== null).map((d) => d.text).join(' ')
const eastHits = EAST.filter((w) => seasonTexts.includes(w))
log('D6 ★ 계절 이벤트에 동양 소재 0건:', JSON.stringify(eastHits), ok(eastHits.length === 0))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
