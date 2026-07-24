// 섭정 관계 flag 배타성 검사.
// 회유 성사(regent_won_over/alliance)와 결렬(regent_hostile)이 동시에 서면
// M3 엔딩 분기가 판정 불가가 되므로, 한 플레이에서 공존하지 않아야 한다.
import {
  advanceScene, APP_URL, choiceButtons, clickCard, enterGame, launch, log, ok, phaseOf, readPanel,
} from './helpers.mjs'

const CEDE = '정무를 섭정공께 맡긴다'
const RECLAIM = '직접 재가한다'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

const order = []
// 스케줄/결과/이벤트 화면을 모두 세므로 턴 수보다 넉넉히 잡는다.
// ★ 월 단위 전환으로 108개월 × 화면 2~3개가 되어 250 으로는 끝에 못 닿는다(400 으로).
//   모자라면 조용히 중간에서 끝나고 '엔딩 저장 버튼이 없다'는 엉뚱한 증상으로 나타난다.
for (let t = 0; t < 400; t++) {
  const p = await phaseOf(page)
  if (p === 'ended') break

  if (p === 'schedule') {
    const panel = await readPanel(page)
    const s = panel.stats
    const age = parseInt((panel.age.match(/(\d+)세/) ?? [])[1] ?? '11', 10)
    const plan = []
    if ((s['심신'] ?? 100) < 30) plan.push('휴식')
    if (age <= 15) {
      while (plan.length < 3) plan.push(CEDE)
    } else {
      if ((s['통치학'] ?? 0) >= 35) plan.push(RECLAIM)
      while (plan.length < 3) plan.push('통치학 수업')
    }
    for (const n of plan) await clickCard(page, n)
    await page.getByRole('button', { name: /턴 종료/ }).click()
    await page.waitForTimeout(60)
    continue
  }

  if (p === 'result') {
    await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
    await page.waitForTimeout(60)
    continue
  }

  if (p === 'event') {
    // ★ 씬이 붙은 이벤트(데뷔탕트 등)는 대사를 다 넘겨야 선택지·진행 버튼이 나온다.
    //   이게 없어서 데뷔탕트에서 30초를 기다리다 죽었고, 크래시를 0 으로 세는 옛 집계 방식
    //   때문에 여러 라운드 동안 '통과'로 보였다.
    await advanceScene(page)
    order.push(await page.locator('[data-event-title]').innerText())
    const btns = choiceButtons(page)
    const n = await btns.count()
    for (let i = 0; i < n; i++) {
      if (await btns.nth(i).isEnabled()) {
        await btns.nth(i).click()
        await page.waitForTimeout(60)
        break
      }
    }
    await page.getByRole('button', { name: /다음 달로|계속/ }).click()
    await page.waitForTimeout(60)
    continue
  }
  break
}

// ★ 엔딩도 먼저 씬("아홉 해의 끝")을 재생한다 — 다 넘겨야 결산의 저장 버튼이 나온다.
await advanceScene(page)
await page.getByRole('button', { name: '이 기록 저장' }).click()
await page.waitForTimeout(200)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
const f = saved.state.flags

log('이벤트 순서:', order.join(' → '))
log('regent_won_over :', !!f.regent_won_over)
log('regent_alliance :', !!f.regent_alliance)
log('regent_hostile  :', !!f.regent_hostile)
const conflict = (!!f.regent_won_over || !!f.regent_alliance) && !!f.regent_hostile
log('회유와 결렬이 공존하지 않음:', ok(!conflict))
log('최종 의심/신망/영향도:',
  saved.state.regentSuspicion, saved.state.regentRapport, saved.state.courtInfluence)

await browser.close()
