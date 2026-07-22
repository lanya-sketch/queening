// M1 / M2a / M-콘텐츠 회귀 스위트.
// 착장·초상·모달, 턴 루프, 이벤트, 세이브 연쇄 마이그레이션, 반응형을 실제 브라우저로 검사한다.
import {
  card, choiceButtons, clearEvent, dateText, enterGame, launch, log, ok, overflow, phaseOf,
  portrait, readGauge, readPanel, shotsDir, APP_URL, SAVE_VERSION,
} from './helpers.mjs'

const OUT = shotsDir('regression')
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
// 404 는 콘솔 메시지에 URL 이 안 실려 원인을 못 찾는다. 응답을 직접 본다.
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})
page.on('console', (m) => {
  // 콘솔의 리소스 404 메시지는 URL 이 없어 그 자체로는 쓸모가 없다.
  // 진짜 404 는 위 response 리스너가 URL 과 함께 잡으므로 여기서는 버린다.
  // (오래 정체불명이던 이 404 는 favicon 미설정이 원인이었다)
  const resource404 = /Failed to load resource.*404/.test(m.text())
  if (m.type() === 'error' && !m.text().includes('favicon') && !resource404) {
    errors.push('CONSOLE: ' + m.text())
  }
})

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page) // 타이틀 건너뛰기 (이후 reload 도 sessionStorage 로 유지)
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
// ★ 에셋 배선: 전신은 원본 PNG(크롭 아님).
log('A4 전신 이미지(원본 PNG):', fullSrc,
  ok(fullSrc.includes('/monarch/') && fullSrc.includes('.png') && !fullSrc.includes('/portraits/')))
const names = await dialog.locator('ul button').allInnerTexts()
log('A5 착장 5벌 표시:', ok(names.length === 5))
log('A6 폴백 경고 없음(=manifest.json 사용):',
  ok(!(await dialog.getByText('내장 기본 착장을 쓰고').isVisible().catch(() => false))))

const locked = []
for (const id of ['사복', '정무복', '대례복', '갑주', '연회복']) {
  if (await dialog.locator('ul button').filter({ hasText: id }).isDisabled()) locked.push(id)
}
// 11세 시작: 대례복(궁정처세25)·갑주(무예30)·연회복(16세) 잠김.
log('A7 잠긴 착장:', locked.join(', '), ok(locked.join(',') === '대례복,갑주,연회복'))
const lockText = await dialog.locator('ul button').filter({ hasText: '대례복' }).innerText()
log('A8 해금 조건 문구:', JSON.stringify(lockText.split('\n').pop()),
  ok(lockText.includes('궁정처세 25 이상')))
log('A9 안전 안내 노출:',
  ok(await dialog.getByText('노출 등 부적절한 이미지로 교체하지 마세요').isVisible()))
log('A10 모달 가로 오버플로:', JSON.stringify(await overflow(page)))
await shot(page, '02-modal-mobile')

await dialog.locator('ul button').filter({ hasText: '정무복' }).click()
await page.waitForTimeout(250)
log('A11 착장 교체 후 전신 이미지(정무복):',
  ok((await dialog.locator('img').first().getAttribute('src')).includes('_office_')))
await shot(page, '03-modal-outfit-changed')

await page.keyboard.press('Escape')
await page.waitForTimeout(250)
log('A12 Esc 로 닫힘:', ok(!(await dialog.isVisible().catch(() => false))))
log('A13 상단 초상도 교체됨:',
  ok((await portrait(page).locator('img').getAttribute('src')).includes('_office_')))

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
await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
await page.waitForTimeout(200)
log('B4 결과 → 스케줄 복귀:', await dateText(page), ok((await phaseOf(page)) === 'schedule'))

await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(200)
const savedDate = await dateText(page)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('B5 저장:', savedDate, '| 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('B6 착장이 세이브에 포함됨:', saved.state.currentOutfitId,
  ok(saved.state.currentOutfitId === 'office'))
await page.getByRole('button', { name: '닫기' }).click()

await card(page, '휴식').click()
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
await page.waitForTimeout(200)
log('B7 한 턴 더 →', await dateText(page))
await page.getByRole('button', { name: '상세' }).click()
await page.getByRole('button', { name: '불러오기' }).click()
await page.waitForTimeout(250)
log('B8 불러오기 → 저장 시점 복원:', await dateText(page), ok((await dateText(page)) === savedDate))
await page.getByRole('button', { name: '닫기' }).click()

log('B9 이벤트 발동까지 진행 (1년차 6월 + 통치학 20)')
let fired = null
// 월 단위: 첫 어전 회의는 1년차 6월(턴 ~17)이라 넉넉히 돈다.
// ★ 2단계 데드엔딩: 통치학×2+휴식은 11세(내구도 0)에 순 심신 −5.6/월이라 계속하면
//   심신 파탄으로 죽는다(= 무리형). 여기선 first-audience 도달을 보는 게 목적이므로
//   통치학 20 을 채우는 초반만 밀고, 이후엔 쉬어 심신을 지키는 **관리형**으로 논다.
for (let i = 0; i < 22 && !fired; i++) {
  if ((await phaseOf(page)) !== 'schedule') break
  const sc = (await readPanel(page)).stats['통치학'] ?? 0
  if (sc < 22) {
    await card(page, '통치학 수업').click()
    await card(page, '통치학 수업').click()
    await card(page, '휴식').click()
  } else {
    await card(page, '휴식').click()
    await card(page, '휴식').click()
    await card(page, '휴식').click()
  }
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(150)
  const d = await dateText(page)
  await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
  // ★ 고정 대기 대신 화면이 실제로 전환될 때까지 기다린다.
  //   부하가 걸리면 150ms 안에 렌더가 안 끝나 이벤트 화면을 놓쳐, 15종 스윕에서
  //   B10 이 가짜로 실패했다(단독 4/4 통과). 조건 대기로 그 취약성을 없앤다.
  await page.waitForFunction(() => {
    const settled = ['활동 선택', '9년', '세가 되었다', '아홉 해의 끝']
    if (document.querySelector('article h1')) return true
    return settled.some((t) => document.body.innerText.includes(t))
  }, { timeout: 8000 }).catch(() => {})
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
log('C1 v1 세이브 로드됨:', await dateText(page), ok((await dateText(page)) === '즉위 3년 9월'))
log('C2 나이 보존:', ok((await page.locator('aside p.text-xs').first().innerText()).includes('14세')))
const migratedOutfit = await page.evaluate(() =>
  document.querySelector('aside button[aria-label*="군주 초상"] img').getAttribute('src'))
log('C3 착장 기본값 주입:', ok(migratedOutfit.includes('_casual_')))
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
log('C8 v2 세이브 로드됨:', await dateText(page), ok((await dateText(page)) === '즉위 2년 6월'))
log('C9 신망 기본값 주입:', ok((await readGauge(page, '섭정 신망')) === 20))
log('C10 기존 착장 보존:',
  ok((await portrait(page).locator('img').getAttribute('src')).includes('_office_')))
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(200)
const resaved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('C11 재저장 버전:', resaved.version, ok(resaved.version === SAVE_VERSION))
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

/** 현안 조건을 만족하는 세이브를 심고 불러온 뒤, 한 턴 넘겨 현안을 발동시킨다. */
// ★ 월 단위: 월-게이팅 이벤트(제국=9월·하원=6월)를 발동시키려면 그 달 직전을 심고
//   한 턴 넘긴다. when.month 는 "이 달에서 한 턴 넘기면 이벤트가 뜨는" 달이다.
async function seedAffairSave(p, stats, when = { year: 2, month: 6, age: 13 }, seen = []) {
  await p.goto(APP_URL, { waitUntil: 'networkidle' })
  await p.evaluate(({ s, w, seenIds }) => {
    // 이미 지나간 이벤트는 seen flag 를 심어 재발동을 막는다(실제 플레이와 동일한 상태).
    const flags = {}
    for (const id of seenIds) flags[`event:${id}`] = true
    localStorage.setItem('queening.save', JSON.stringify({
      version: 7, savedAt: '2026-03-03T00:00:00.000Z', state: {
        date: { year: w.year, month: w.month }, age: w.age,
        stats: s, durability: (w.age - 11) * 6,
        wellbeing: 80, tutorTrust: 30, regentSuspicion: 30, regentRapport: 30,
        courtInfluence: 30, actionPoints: 3, plannedActivityIds: [], flags,
        phase: 'schedule', lastTurnReport: null, pendingEventIds: [],
        currentOutfitId: 'casual', monarchGender: 'male', affection: {}, counters: {},
      },
    }))
  }, { s: stats, w: when, seenIds: seen })
  await p.reload({ waitUntil: 'networkidle' })
  await enterGame(p)
  await p.waitForTimeout(300)
  await p.getByRole('button', { name: '불러오기' }).click()
  await p.waitForTimeout(250)
  // 한 턴 넘겨 현안 발동
  await card(p, '휴식').click()
  await p.getByRole('button', { name: /턴 종료/ }).click()
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
  await p.waitForTimeout(200)
}

// (1) 재정·무예 요구를 모두 채운 경우
// ★ 변경의 불빛은 이제 3월(해빙기)에만 — 2월을 심어 한 턴 넘기면 3월에 뜬다.
const FRONTIER_WHEN = { year: 2, month: 2, age: 13 }
await seedAffairSave(apage, { statecraft: 20, finance: 35, rhetoric: 10, martial: 35, courtcraft: 10 }, FRONTIER_WHEN)
log('E1 현안 발동 (13세 + 즉위 2년 3월):', ok((await phaseOf(apage)) === 'event'))
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
log(`E7 위임 → 의심 ${suspBefore}→${suspAfter} (-4 기대):`, ok(suspAfter === suspBefore - 4))
await apage.getByRole('button', { name: /다음 달로|계속/ }).click()
await apage.waitForTimeout(200)
await apage.getByRole('button', { name: '저장', exact: true }).click()
await apage.waitForTimeout(250)
const affairSave = await apage.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('E8 people_burdened_frontier flag 기록:',
  ok(affairSave.state.flags.people_burdened_frontier === true))
log('E9 세이브 버전 그대로 (구조 변경 없음):', affairSave.version,
  ok(affairSave.version === SAVE_VERSION))

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

// --- 현안 2: 제국의 청구서 (15세+, 즉위 4년+, 가을) ---
const EMPIRE_WHEN = { year: 4, month: 8, age: 15 } // 8월+1턴=9월(제국 발동)
await seedAffairSave(apage,
  { statecraft: 20, finance: 44, rhetoric: 10, martial: 45, courtcraft: 10 }, EMPIRE_WHEN, ['issue-frontier-raid'])
log('E12 제국의 청구서 발동 (15세 + 즉위 4년 + 가을):',
  await apage.locator('article h1').innerText(),
  ok((await apage.locator('article h1').innerText()) === '제국의 청구서'))
const ec = choiceButtons(apage)
let eEnabled = 0
for (let i = 0; i < 4; i++) if (await ec.nth(i).isEnabled()) eEnabled++
log('E13 선택지 4개 · 스탯 충족 시 전부 활성:', `${await ec.count()}개 / ${eEnabled}활성`,
  ok((await ec.count()) === 4 && eEnabled === 4))
const eInflBefore = await readGauge(apage, '국정 영향도')
const eFinBefore = await readGauge(apage, '재정')
await ec.filter({ hasText: '교역 조건' }).click()
await apage.waitForTimeout(300)
log(`E14 교역 → 영향도 ${eInflBefore}→${await readGauge(apage, '국정 영향도')} (+8):`,
  ok((await readGauge(apage, '국정 영향도')) === eInflBefore + 8))
log(`E15 교역 → 재정 ${eFinBefore}→${await readGauge(apage, '재정')} (+4):`,
  ok((await readGauge(apage, '재정')) === eFinBefore + 4))

await seedAffairSave(apage,
  { statecraft: 20, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 }, EMPIRE_WHEN, ['issue-frontier-raid'])
const ec2 = choiceButtons(apage)
const eStates = []
for (let i = 0; i < 4; i++) eStates.push((await ec2.nth(i).isEnabled()) ? '열림' : '잠김')
log('E16 스탯 미충족 시:', eStates.join(' / '), ok(eStates.join(',') === '잠김,잠김,열림,열림'))

// --- 현안 3: 선왕이 남긴 방 (16세+, 즉위 5년+, 여름) ---
const COMMONS_WHEN = { year: 5, month: 5, age: 16 } // 5월+1턴=6월(하원 발동)
await seedAffairSave(apage,
  { statecraft: 20, finance: 10, rhetoric: 50, martial: 10, courtcraft: 50 }, COMMONS_WHEN, ['issue-frontier-raid', 'issue-empire-tribute'])
log('E17 선왕이 남긴 방 발동 (16세 + 즉위 5년 + 여름):',
  await apage.locator('article h1').innerText(),
  ok((await apage.locator('article h1').innerText()) === '선왕이 남긴 방'))
const hc = choiceButtons(apage)
let hEnabled = 0
for (let i = 0; i < 4; i++) if (await hc.nth(i).isEnabled()) hEnabled++
log('E18 선택지 4개 · 스탯 충족 시 전부 활성:', `${await hc.count()}개 / ${hEnabled}활성`,
  ok((await hc.count()) === 4 && hEnabled === 4))
const hInflBefore = await readGauge(apage, '국정 영향도')
await hc.filter({ hasText: '어전에서 존속을 선포' }).click()
await apage.waitForTimeout(300)
log(`E19 선포 → 영향도 ${hInflBefore}→${await readGauge(apage, '국정 영향도')} (+15):`,
  ok((await readGauge(apage, '국정 영향도')) === hInflBefore + 15))
await apage.getByRole('button', { name: /다음 달로|계속/ }).click()
await apage.waitForTimeout(250)
await apage.getByRole('button', { name: '저장', exact: true }).click()
await apage.waitForTimeout(250)
const hSave = await apage.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('E20 house_commons_defended + people_relieved_commons 기록:',
  ok(hSave.state.flags.house_commons_defended === true &&
     hSave.state.flags.people_relieved_commons === true))
log('E21 세이브 버전 그대로:', hSave.version, ok(hSave.version === SAVE_VERSION))

await seedAffairSave(apage,
  { statecraft: 20, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 }, COMMONS_WHEN, ['issue-frontier-raid', 'issue-empire-tribute'])
const hc2 = choiceButtons(apage)
const hStates = []
for (let i = 0; i < 4; i++) hStates.push((await hc2.nth(i).isEnabled()) ? '열림' : '잠김')
log('E22 스탯 미충족 시:', hStates.join(' / '), ok(hStates.join(',') === '잠김,잠김,열림,열림'))
await apage.screenshot({ path: `${OUT}/09-house-of-commons.png`, fullPage: false })

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
await enterGame(dpage)
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
