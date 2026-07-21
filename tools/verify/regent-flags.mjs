// 섭정 관계 flag 배타성 검사.
// 회유 성사(regent_won_over/alliance)와 결렬(regent_hostile)이 동시에 서면
// M3 엔딩 분기가 판정 불가가 되므로, 한 플레이에서 공존하지 않아야 한다.
import { APP_URL, choiceButtons, enterGame, launch, log, ok, phaseOf, readPanel } from './helpers.mjs'

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
// 스케줄/결과/이벤트 화면을 모두 세므로 턴 수보다 넉넉히 잡는다
for (let t = 0; t < 250; t++) {
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
    for (const n of plan) {
      const c = page.locator('ul.grid').getByRole('button', { name: new RegExp(n) })
      if (await c.isEnabled().catch(() => false)) await c.click()
    }
    await page.getByRole('button', { name: /턴 종료/ }).click()
    await page.waitForTimeout(60)
    continue
  }

  if (p === 'result') {
    await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
    await page.waitForTimeout(60)
    continue
  }

  if (p === 'event') {
    order.push(await page.locator('article h1').innerText())
    const btns = choiceButtons(page)
    const n = await btns.count()
    for (let i = 0; i < n; i++) {
      if (await btns.nth(i).isEnabled()) {
        await btns.nth(i).click()
        await page.waitForTimeout(60)
        break
      }
    }
    await page.getByRole('button', { name: /다음 계절로|계속/ }).click()
    await page.waitForTimeout(60)
    continue
  }
  break
}

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
