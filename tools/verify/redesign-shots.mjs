/**
 * UI 리디자인 1단계 — 실제 화면 확인용 스크린샷 + 표시 방식 실측.
 *
 * ★ "정의 검증 ≠ 렌더 검증"이라는 이 저장소의 원칙대로, 토큰·라벨이 코드에 있다는 것과
 *   화면에 제대로 나온다는 것은 별개다. 375px 과 데스크톱 둘 다 실제로 찍는다.
 */
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('redesign')

const browser = await launch()

async function open(width, height, seed) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await enterGame(page)
  if (seed) await page.evaluate((s) => window.__queeningAi.setGame(s), seed)
  await page.waitForTimeout(500)
  return { ctx, page }
}

// ── 데스크톱: 12장이 한눈에 들어오는지 ──────────────────────
{
  const { ctx, page } = await open(1440, 1100)
  await page.screenshot({ path: `${OUT}/desktop-11se.png`, fullPage: true })

  // 계획을 넣은 상태 + 등급이 오른 상태를 함께 본다.
  const { ctx: c2, page: p2 } = await open(1440, 1100, {
    age: 17,
    stats: { statecraft: 78, finance: 50, rhetoric: 30, martial: 12, courtcraft: 62 },
    courtInfluence: 52, wellbeing: 58, tutorTrust: 66, regentRapport: 41, regentSuspicion: 64,
  })
  await p2.locator('[data-activity="lecture-statecraft"]').click()
  await p2.locator('[data-activity="secret-correspondence"]').click()
  await p2.waitForTimeout(400)
  await p2.screenshot({ path: `${OUT}/desktop-17se-planned.png`, fullPage: true })

  // ── 실측 1: 화면에 수치가 남아 있지 않은가 ──────────────
  const cardText = await p2.locator('[data-activity="lecture-statecraft"]').innerText()
  const hasNumberInEffects = /[+\-]\d/.test(cardText)
  log('A1 ★ 활동 카드에 증감 수치가 없다:', JSON.stringify(cardText.replace(/\n/g, ' / ')))
  log('   →', ok(!hasNumberInEffects))

  // ── 실측 2: 등급이 별·배지·정도에 반영되는가 ─────────────
  const rows = []
  for (const [id, label] of [
    ['lecture-statecraft', '통치학 78 → 고급'],
    ['attend-banquet', '궁정처세 62 → 중급'],
    ['sword-training', '무예 12 → 초급'],
  ]) {
    const el = p2.locator(`[data-activity="${id}"]`)
    rows.push({
      label,
      tier: await el.getAttribute('data-tier'),
      text: (await el.innerText()).split('\n').slice(0, 3).join(' / '),
    })
  }
  for (const r of rows) log(`A2 ${r.label.padEnd(18)} data-tier=${r.tier}`)
  log('A2 ★ 등급이 스탯에 따라 셋으로 갈린다:',
    ok(rows[0].tier === '고급' && rows[1].tier === '중급' && rows[2].tier === '초급'))

  // ── 실측 3: 게이지 라벨이 문턱과 맞는가 ──────────────────
  const gauges = await p2.evaluate(() =>
    [...document.querySelectorAll('[data-gauge]')].map((el) => ({
      key: el.getAttribute('data-gauge'),
      value: el.getAttribute('data-value'),
      band: el.getAttribute('data-band'),
    })))
  for (const g of gauges) log(`A3 ${String(g.key).padEnd(16)} ${String(g.value).padStart(7)} → ${g.band}`)
  const infl = gauges.find((g) => g.key === 'courtInfluence')
  log('A3 ★ 영향도 52 는 공존 구간(45~69) = "저울이 맞음":', ok(infl?.band === '저울이 맞음'))

  // ── 실측 4: 화면 전체에 원시 수치가 노출되지 않는가 ───────
  const bodyText = await p2.locator('[data-screen="schedule"]').innerText()
  const leaked = bodyText.match(/[+\-]\d+(\.\d+)?/g) ?? []
  log('A4 ★ 일과 화면 전체에 증감 수치 노출 없음:', leaked.length ? JSON.stringify(leaked) : '(없음)',
    ok(leaked.length === 0))

  await ctx.close(); await c2.close()
}

// ── 모바일 375px ────────────────────────────────────────────
{
  const { ctx, page } = await open(375, 812, {
    age: 15,
    stats: { statecraft: 47, finance: 22, rhetoric: 31, martial: 9, courtcraft: 44 },
    courtInfluence: 18, wellbeing: 21, tutorTrust: 52, regentRapport: 28, regentSuspicion: 71,
  })
  /*
   * ★ 모바일은 **뷰포트 샷**으로 찍는다. fullPage 는 sticky 사이드바와 fixed 하단 바를
   *   스크롤 위치에 그대로 그려 넣어, 실제로는 겹치지 않는 것이 겹쳐 보인다.
   *   "실제 화면 확인"이 목적이면 플레이어가 보는 것과 같은 프레임이어야 한다.
   */
  await page.screenshot({ path: `${OUT}/mobile-375-collapsed.png` })
  await page.evaluate(() => window.scrollTo(0, 560))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/mobile-375-cards.png` })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  /*
   * ★ 끝까지 내렸을 때 마지막 카드가 하단 고정 CTA 에 가리지 않는가.
   *   눈으로는 "스크롤 중이라 그런가" 싶어 넘어가기 쉬운 종류라 좌표로 잰다.
   */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  const clip = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-activity]')]
    const last = cards[cards.length - 1].getBoundingClientRect()
    const bar = document.querySelector('[data-end-turn]').getBoundingClientRect()
    return { cardBottom: Math.round(last.bottom), barTop: Math.round(bar.top) }
  })
  log(`B0 ★ 맨 아래에서 마지막 카드가 CTA 에 안 가림: 카드 하단 ${clip.cardBottom} / CTA 상단 ${clip.barTop}`,
    ok(clip.cardBottom <= clip.barTop))
  await page.screenshot({ path: `${OUT}/mobile-375-bottom.png` })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  // 가로 넘침이 없어야 한다.
  const of = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }))
  log(`B1 ★ 375px 가로 넘침 없음: scrollWidth ${of.sw} / innerWidth ${of.iw}`, ok(of.sw <= of.iw + 1))

  // 사이드바 '상세'를 펼친 화면
  await page.getByRole('button', { name: '상세' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/mobile-375-panel.png` })

  // 상세(내부값)를 연 화면 — 정확 수치는 여기에만 있어야 한다.
  await page.locator('[data-detail-values] summary').click()
  await page.waitForTimeout(300)
  const detail = await page.locator('[data-detail-values]').innerText()
  log('B2 ★ 상세(내부값)에는 정확 수치가 있다:', ok(/\d+\.\d{2}/.test(detail)))
  await page.screenshot({ path: `${OUT}/mobile-375-detail.png` })

  await ctx.close()
}

// ── 2단계: 나머지 화면이 같은 톤인가 ────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/screen-title.png` })
  log('C0 타이틀 화면 훅:', await page.locator('[data-screen="title"]').count())

  // 도움말 · 갤러리 · 설정
  await page.getByRole('button', { name: /설정/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/screen-settings.png` })
  await page.getByRole('button', { name: '닫기' }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /갤러리|기록/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/screen-gallery.png` })
  await ctx.close()
}

{
  // 이벤트 · 턴 결과 — 실제로 한 턴을 돌려 화면을 띄운다.
  const { ctx, page } = await open(1280, 900, {
    age: 14, stats: { statecraft: 46, finance: 20, rhetoric: 24, martial: 10, courtcraft: 30 },
    courtInfluence: 30, wellbeing: 62, tutorTrust: 44, regentRapport: 24, regentSuspicion: 38,
  })
  await page.locator('[data-activity="lecture-statecraft"]').click()
  await page.locator('[data-activity="rest"]').click()
  await page.locator('[data-end-turn]').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/screen-result.png`, fullPage: true })
  const resultText = await page.locator('[data-screen="result"]').innerText()
  const leaked = resultText.match(/[+\-]\d+(\.\d+)?/g) ?? []
  log('C1 ★ 턴 결과에 증감 수치 노출 없음:', leaked.length ? JSON.stringify(leaked) : '(없음)',
    ok(leaked.length === 0))

  // 이벤트가 있으면 그 화면도
  const next = page.getByRole('button', { name: /무슨 일이|다음 달로/ })
  if (await next.isVisible().catch(() => false)) {
    await next.click()
    await page.waitForTimeout(600)
  }
  if ((await page.locator('[data-screen="event"]').count()) > 0) {
    await page.screenshot({ path: `${OUT}/screen-event.png`, fullPage: true })
    log('C2 이벤트 화면 제목 훅:', await page.locator('[data-event-title]').count())
  }
  await ctx.close()
}

{
  // 엔딩 결산
  const { ctx, page } = await open(1280, 1000, {
    age: 21, phase: 'ended',
    stats: { statecraft: 72, finance: 30, rhetoric: 55, martial: 8, courtcraft: 68 },
    courtInfluence: 74, wellbeing: 55, tutorTrust: 88, regentRapport: 30, regentSuspicion: 44,
  })
  await page.waitForTimeout(500)
  // 엔딩 씬을 넘겨 결산까지
  for (let i = 0; i < 60; i++) {
    const b = page.getByRole('button', { name: /^(다음|계속)$/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click()
    await page.waitForTimeout(60)
  }
  await page.screenshot({ path: `${OUT}/screen-ended.png`, fullPage: true })
  log('C3 엔딩 화면 훅:', await page.locator('[data-screen="ended"], [data-screen="dead"]').count())
  await ctx.close()
}

// ── 나이 상한 금선이 **실제로 그려지는가** ─────────────────
{
  /*
   * ★ 라벨이 맞다는 것과 금선이 화면에 있다는 것은 다른 명제다.
   *   회유 빌드는 11~14세에 신망이 30 천장에 붙는데, 금선이 없으면 이유가 안 보여
   *   "이 길은 안 되나 보다" 하고 접는다. 그래서 좌표까지 잰다.
   */
  const { ctx, page } = await open(1440, 1000, {
    age: 12, regentRapport: 30, tutorTrust: 29, courtInfluence: 10,
  })
  const ticks = await page.evaluate(() =>
    ['regentRapport', 'tutorTrust', 'courtInfluence'].map((key) => {
      const g = document.querySelector(`[data-gauge="${key}"]`)
      const track = g?.querySelector('div.relative')
      const tick = track?.querySelector('span[aria-hidden]')
      if (!track || !tick) return { key, tick: null }
      const t = track.getBoundingClientRect()
      const k = tick.getBoundingClientRect()
      return { key, pct: Math.round(((k.left - t.left) / t.width) * 100) }
    }))
  for (const t of ticks) log(`D1 ${t.key.padEnd(15)} 상한 금선 위치 ${t.tick === null ? '없음' : t.pct + '%'}`)
  const rapport = ticks.find((t) => t.key === 'regentRapport')
  // 12세 신망 상한은 30 이므로 금선이 30% 언저리에 있어야 한다.
  log('D1 ★ 12세 신망 금선이 상한 30 자리에 있다:',
    ok(rapport?.pct !== undefined && Math.abs(rapport.pct - 30) <= 3))
  await page.screenshot({ path: `${OUT}/cap-line-12se.png` })
  await ctx.close()
}

await browser.close()
log('\n스크린샷:', OUT)
