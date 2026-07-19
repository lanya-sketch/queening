// M1 / M2a / M-콘텐츠 회귀 스위트.
// 착장·초상·모달, 턴 루프, 이벤트, 세이브 연쇄 마이그레이션, 반응형을 실제 브라우저로 검사한다.
import {
  card, choiceButtons, clearEvent, dateText, launch, log, ok, overflow, phaseOf,
  portrait, readGauge, shotsDir, APP_URL,
} from './helpers.mjs'

const OUT = shotsDir('regression')
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('CONSOLE: ' + m.text())
})

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

log('=== A. 초상 · 모달 · 착장 교체 (375px) ===')
log('A1 초상 상시 표시:', ok(await portrait(page).isVisible()))
const box = await portrait(page).boundingBox()
log('A2 터치 타깃 크기:', `${Math.round(box.width)}x${Math.round(box.height)}`, ok(box.height >= 44))
await shot(page, '01-portrait-mobile')

await portrait(page).click()
await page.waitForTimeout(250)
const dialog = page.getByRole('dialog')
log('A3 모달 열림:', ok(await dialog.isVisible()))
const fullSrc = await dialog.locator('img').first().getAttribute('src')
log('A4 전신 이미지:', fullSrc, ok(fullSrc.includes('-full.')))
const names = await dialog.locator('ul button').allInnerTexts()
log('A5 착장 4벌 표시:', ok(names.length === 4))
log('A6 폴백 경고 없음(=manifest.json 사용):',
  ok(!(await dialog.getByText('내장 기본 착장을 쓰고').isVisible().catch(() => false))))

const locked = []
for (const id of ['사복', '정무복', '대례복', '기사 갑주']) {
  if (await dialog.locator('ul button').filter({ hasText: id }).isDisabled()) locked.push(id)
}
log('A7 잠긴 착장:', locked.join(', '), ok(locked.join(',') === '대례복,기사 갑주'))
const lockText = await dialog.locator('ul button').filter({ hasText: '대례복' }).innerText()
log('A8 해금 조건 문구:', JSON.stringify(lockText.split('\n').pop()),
  ok(lockText.includes('궁정처세 25 이상')))
log('A9 안전 안내 노출:',
  ok(await dialog.getByText('노출 등 부적절한 이미지로 교체하지 마세요').isVisible()))
log('A10 모달 가로 오버플로:', JSON.stringify(await overflow(page)))
await shot(page, '02-modal-mobile')

await dialog.locator('ul button').filter({ hasText: '정무복' }).click()
await page.waitForTimeout(250)
log('A11 착장 교체 후 전신 이미지:',
  ok((await dialog.locator('img').first().getAttribute('src')).includes('office-full')))
await shot(page, '03-modal-outfit-changed')

await page.keyboard.press('Escape')
await page.waitForTimeout(250)
log('A12 Esc 로 닫힘:', ok(!(await dialog.isVisible().catch(() => false))))
log('A13 상단 초상도 교체됨:',
  ok((await portrait(page).locator('img').getAttribute('src')).includes('office-thumb')))

await portrait(page).click()
await page.waitForTimeout(200)
await page.mouse.click(8, 8) // 배경 탭
await page.waitForTimeout(250)
log('A14 배경 탭으로 닫힘:', ok(!(await page.getByRole('dialog').isVisible().catch(() => false))))

log('')
log('=== B. 턴 루프 · 이벤트 · 세이브/로드 ===')
log('B1 시작 상태:', await phaseOf(page), '|', await dateText(page))
for (const n of ['통치학 수업', '검술 훈련', '휴식']) await card(page, n).click()
log('B2 활동 3개 선택 후 카드 비활성:', ok(await card(page, '통치학 수업').isDisabled()))
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.waitForTimeout(250)
log('B3 턴 종료 → 결과 화면:', ok((await phaseOf(page)) === 'result'))
log('   ', (await page.locator('section').first().innerText()).replace(/\n/g, ' '))
await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
await page.waitForTimeout(200)
log('B4 결과 → 스케줄 복귀:', await dateText(page), ok((await phaseOf(page)) === 'schedule'))

await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(200)
const savedDate = await dateText(page)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('B5 저장:', savedDate, '| 세이브 버전:', saved.version, ok(saved.version === 4))
log('B6 착장이 세이브에 포함됨:', saved.state.currentOutfitId,
  ok(saved.state.currentOutfitId === 'office'))
await page.getByRole('button', { name: '닫기' }).click()

await card(page, '휴식').click()
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
await page.waitForTimeout(200)
log('B7 한 턴 더 →', await dateText(page))
await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '불러오기' }).click()
await page.waitForTimeout(250)
log('B8 불러오기 → 저장 시점 복원:', await dateText(page), ok((await dateText(page)) === savedDate))
await page.getByRole('button', { name: '닫기' }).click()

log('B9 이벤트 발동까지 진행 (1년차 여름 + 통치학 20)')
let fired = null
for (let i = 0; i < 10 && !fired; i++) {
  if ((await phaseOf(page)) !== 'schedule') break
  await card(page, '통치학 수업').click()
  await card(page, '통치학 수업').click()
  await card(page, '휴식').click()
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(150)
  const d = await dateText(page)
  await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
  await page.waitForTimeout(150)
  while ((await phaseOf(page)) === 'event') {
    const title = await page.locator('article h1').innerText()
    log(`    ${d} → 이벤트 "${title}"`)
    if (title.includes('첫 어전 회의')) fired = title
    await clearEvent(page)
  }
}
log('B10 샘플 이벤트 발동:', ok(fired === '첫 어전 회의'))

log('')
log('=== C. v1 세이브 마이그레이션 (v1 → v4 연쇄) ===')
await page.evaluate(() => {
  localStorage.setItem('queening.save', JSON.stringify({
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    state: {
      date: { year: 3, season: 'autumn' }, age: 14,
      stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 35, courtcraft: 30 },
      wellbeing: 60, tutorTrust: 45, regentSuspicion: 20, actionPoints: 3,
      plannedActivityIds: [], flags: {}, phase: 'schedule',
      lastTurnReport: null, pendingEventIds: [],
      // currentOutfitId / regentRapport / courtInfluence 없음 — M1 시절 세이브
    },
  }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '불러오기' }).click()
await page.waitForTimeout(300)
log('C1 v1 세이브 로드됨:', await dateText(page), ok((await dateText(page)) === '즉위 3년 가을'))
log('C2 나이 보존:', ok((await page.locator('aside p.text-xs').first().innerText()).includes('14세')))
const migratedOutfit = await page.evaluate(() =>
  document.querySelector('aside button[aria-label*="군주 초상"] img').getAttribute('src'))
log('C3 착장 기본값 주입:', ok(migratedOutfit.includes('casual-thumb')))
log('C4 섭정 신망 주입:', await readGauge(page, '섭정 신망'),
  ok((await readGauge(page, '섭정 신망')) === 20))
log('C5 국정 영향도 주입:', await readGauge(page, '국정 영향도'),
  ok((await readGauge(page, '국정 영향도')) === 10))
await page.getByRole('button', { name: '닫기' }).click()

await portrait(page).click()
await page.waitForTimeout(250)
const d2 = page.getByRole('dialog')
const stillLocked = []
for (const id of ['대례복', '기사 갑주']) {
  if (await d2.locator('ul button').filter({ hasText: id }).isDisabled()) stillLocked.push(id)
}
log('C6 스탯 충족 → 대례복·기사 갑주 해금:', ok(stillLocked.length === 0))
await d2.locator('ul button').filter({ hasText: '기사 갑주' }).click()
await page.waitForTimeout(250)
log('C7 잠겨있던 착장 착용:',
  ok((await d2.locator('img').first().getAttribute('src')).includes('military-full')))
await shot(page, '04-migrated-unlocked')
await page.keyboard.press('Escape')

log('')
log('=== C-2. v2 세이브 마이그레이션 (착장은 있고 신망·영향도는 없음) ===')
await page.evaluate(() => {
  localStorage.setItem('queening.save', JSON.stringify({
    version: 2,
    savedAt: '2026-02-02T00:00:00.000Z',
    state: {
      date: { year: 2, season: 'summer' }, age: 13,
      stats: { statecraft: 30, finance: 15, rhetoric: 20, martial: 12, courtcraft: 18 },
      wellbeing: 55, tutorTrust: 35, regentSuspicion: 25, actionPoints: 3,
      plannedActivityIds: [], flags: { clue_radical_edict: true }, phase: 'schedule',
      lastTurnReport: null, pendingEventIds: [], currentOutfitId: 'office',
    },
  }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '불러오기' }).click()
await page.waitForTimeout(300)
log('C8 v2 세이브 로드됨:', await dateText(page), ok((await dateText(page)) === '즉위 2년 여름'))
log('C9 신망 기본값 주입:', ok((await readGauge(page, '섭정 신망')) === 20))
log('C10 기존 착장 보존:',
  ok((await portrait(page).locator('img').getAttribute('src')).includes('office-thumb')))
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(200)
const resaved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('C11 재저장 버전:', resaved.version, ok(resaved.version === 4))
log('C12 기존 flag 보존 (clue_radical_edict):', ok(resaved.state.flags.clue_radical_edict === true))
log('C13 신망·영향도가 세이브에 기록됨:',
  resaved.state.regentRapport, '/', resaved.state.courtInfluence,
  ok(resaved.state.regentRapport === 20 && resaved.state.courtInfluence === 10))
await page.getByRole('button', { name: '닫기' }).click()

log('')
log('=== E. 정치 현안 「변경의 불빛」 ===')
// 데스크톱에서 진행한다 — 좌측 패널이 늘 펼쳐져 있어 지표 변동을 바로 읽을 수 있다.
const actx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const apage = await actx.newPage()

/** 현안 조건(13세+, 즉위 2년+)을 만족하는 세이브를 심고 불러온다. */
async function seedAffairSave(p, stats) {
  await p.goto(APP_URL, { waitUntil: 'networkidle' })
  await p.evaluate((s) => {
    localStorage.setItem('queening.save', JSON.stringify({
      version: 4, savedAt: '2026-03-03T00:00:00.000Z', state: {
        date: { year: 2, season: 'summer' }, age: 13,
        stats: s,
        wellbeing: 80, tutorTrust: 30, regentSuspicion: 30, regentRapport: 30,
        courtInfluence: 30, actionPoints: 3, plannedActivityIds: [], flags: {},
        phase: 'schedule', lastTurnReport: null, pendingEventIds: [],
        currentOutfitId: 'casual',
      },
    }))
  }, stats)
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await p.getByRole('button', { name: '불러오기' }).click()
  await p.waitForTimeout(250)
  // 한 턴 넘겨 현안 발동
  await card(p, '휴식').click()
  await p.getByRole('button', { name: /턴 종료/ }).click()
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
  await p.waitForTimeout(200)
}

// (1) 재정·무예 요구를 모두 채운 경우
await seedAffairSave(apage, { statecraft: 20, finance: 35, rhetoric: 10, martial: 35, courtcraft: 10 })
log('E1 현안 발동 (13세 + 즉위 2년):', ok((await phaseOf(apage)) === 'event'))
log('E2 제목:', await apage.locator('article h1').innerText(),
  ok((await apage.locator('article h1').innerText()) === '변경의 불빛'))
log('E3 라벨이 "국정 현안":',
  ok(await apage.getByText('국정 현안', { exact: true }).isVisible()))

const ch = choiceButtons(apage)
log('E4 선택지 3개:', await ch.count(), ok((await ch.count()) === 3))
let enabled = 0
for (let i = 0; i < 3; i++) if (await ch.nth(i).isEnabled()) enabled++
log('E5 스탯 충족 시 3개 모두 활성:', enabled, ok(enabled === 3))

const inflBefore = await readGauge(apage, '국정 영향도')
const suspBefore = await readGauge(apage, '섭정 의심')
await ch.filter({ hasText: '섭정공에게 맡긴다' }).click()
await apage.waitForTimeout(300)
const inflAfter = await readGauge(apage, '국정 영향도')
const suspAfter = await readGauge(apage, '섭정 의심')
log(`E6 위임 → 영향도 ${inflBefore}→${inflAfter} (-5 기대):`, ok(inflAfter === inflBefore - 5))
log(`E7 위임 → 의심 ${suspBefore}→${suspAfter} (-8 기대):`, ok(suspAfter === suspBefore - 8))
await apage.getByRole('button', { name: /다음 계절로|계속/ }).click()
await apage.waitForTimeout(200)
await apage.getByRole('button', { name: '저장', exact: true }).click()
await apage.waitForTimeout(250)
const affairSave = await apage.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('E8 people_burdened flag 기록:', ok(affairSave.state.flags.people_burdened === true))
log('E9 세이브 버전 그대로 (구조 변경 없음):', affairSave.version, ok(affairSave.version === 4))

// (2) 재정·무예 요구를 못 채운 경우 — 직접 결정은 잠기고 위임만 열려야 한다
await seedAffairSave(apage, { statecraft: 20, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 })
const ch2 = choiceButtons(apage)
const states = []
for (let i = 0; i < 3; i++) states.push((await ch2.nth(i).isEnabled()) ? '열림' : '잠김')
log('E10 스탯 미충족 시 선택지 상태:', states.join(' / '),
  ok(states.join(',') === '잠김,잠김,열림'))
const lockText2 = await ch2.first().innerText()
log('E11 잠금 사유 표시:', JSON.stringify(lockText2.split('\n').pop()),
  ok(lockText2.includes('재정 30 이상')))
await apage.screenshot({ path: `${OUT}/08-state-affair.png`, fullPage: false })

log('')
log('=== D. 반응형 ===')
log('D1 375x812 오버플로:', JSON.stringify(await overflow(page)))
await page.setViewportSize({ width: 812, height: 375 })
await page.waitForTimeout(200)
await portrait(page).click()
await page.waitForTimeout(250)
const landscapeFits = await page.evaluate(() => {
  const el = document.querySelector('[role="dialog"] > div')
  return el.getBoundingClientRect().height <= window.innerHeight
})
log('D2 가로모드 812x375 오버플로:', JSON.stringify(await overflow(page)))
log('D3 가로모드에서 모달이 화면 안에:', ok(landscapeFits))
await shot(page, '05-modal-landscape')
await page.keyboard.press('Escape')

const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const dpage = await dctx.newPage()
await dpage.goto(APP_URL, { waitUntil: 'networkidle' })
await dpage.waitForTimeout(400)
log('D4 데스크톱 사이드바 초상 표시:', ok(await portrait(dpage).isVisible()))
log('D5 데스크톱 스탯 상시 노출:',
  ok(await dpage.getByText('궁정처세', { exact: true }).first().isVisible()))
log('D6 1440x900 오버플로:', JSON.stringify(await overflow(dpage)))
await shot(dpage, '06-desktop')
await portrait(dpage).click()
await dpage.waitForTimeout(300)
log('D7 데스크톱 모달 오버플로:', JSON.stringify(await overflow(dpage)))
await shot(dpage, '07-desktop-modal')

log('')
log('콘솔/런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
