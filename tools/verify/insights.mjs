/**
 * 지식 체크 통찰 (4-D) 검증.
 *
 * 묻는 것 셋:
 *   A. 스탯이 모자라면 안 보이고, 넘으면 **화면에 실제로 뜨는가**(정의 검증 ≠ 렌더 검증).
 *   B. 통찰이 **분기가 아닌가** — 켜고 끄고 사이에 선택지·효과가 달라지지 않아야 한다.
 *   C. 씬이 도는 중에는 감춰지는가(대사를 다 본 뒤에 얹혀야 "알아챘다"가 된다).
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

/** 이벤트 하나를 그 상태에서 띄우고 화면을 읽는다. */
async function show(stats, extra = {}) {
  await page.evaluate(([s, e]) => {
    const q = window.__queeningAi
    q.setGame({
      stats: s, phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
      flags: { ...(e.seen ?? {}) }, counters: {}, ...e,
    })
  }, [stats, extra])
  await page.waitForTimeout(120)
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(350)
  const next = page.getByRole('button', { name: /무슨 일이|다음 달로/ })
  if (await next.isVisible().catch(() => false)) {
    await next.click()
    await page.waitForTimeout(350)
  }
  const title = await page.locator('[data-event-title]').innerText().catch(() => '—')
  const insights = await page.locator('[data-insight]').allInnerTexts()
  const choices = await page.locator('[data-choice]').allInnerTexts()
  return { title, insights, choices }
}

const BASE = { statecraft: 15, finance: 8, rhetoric: 10, martial: 6, courtcraft: 5 }
const AT = (patch) => ({ ...BASE, ...patch })
const WHEN_COUNCIL = {
  age: 12,
  date: { year: 1, month: 5 },
  // 같은 달에 겨루는 이벤트를 '이미 본 것'으로 막아 첫 어전 회의만 남긴다.
  seen: { 'event:youth-sealed-record': true },
}

log('=== A. 문턱을 넘어야 보인다 (첫 어전 회의 — 통치학 20 · 변론 16) ===')

const low = await show(AT({ statecraft: 15, rhetoric: 10 }), WHEN_COUNCIL)
log(`A1 낮은 스탯: ${low.title} · 통찰 ${low.insights.length}줄`, ok(low.insights.length === 0))

const midRhetoric = await show(AT({ statecraft: 15, rhetoric: 18 }), WHEN_COUNCIL)
log(`A2 변론만 넘김: 통찰 ${midRhetoric.insights.length}줄`, ok(midRhetoric.insights.length === 1))

const both = await show(AT({ statecraft: 24, rhetoric: 18 }), WHEN_COUNCIL)
log(`A3 둘 다 넘김: 통찰 ${both.insights.length}줄`, ok(both.insights.length === 2))
for (const t of both.insights) log(`     "${t.slice(0, 40)}…"`)

log('')
log('=== B. 통찰은 분기가 아니다 — 선택지가 달라지지 않는다 ===')
log(`B1 낮은 스탯 선택지 ${low.choices.length}개 / 높은 스탯 ${both.choices.length}개`,
  ok(low.choices.length === both.choices.length))
log('B2 ★ 선택지 라벨도 동일:',
  ok(JSON.stringify(low.choices) === JSON.stringify(both.choices)))

log('')
log('=== C. 다른 이벤트에서도 뜬다 ===')
const frontier = await show(
  AT({ statecraft: 30, finance: 20, martial: 20 }),
  { age: 13, date: { year: 2, month: 2 } },
)
log(`C1 변경의 불빛(통치학 24): ${frontier.title} · 통찰 ${frontier.insights.length}줄`,
  ok(frontier.title === '변경의 불빛' && frontier.insights.length === 1))

const firstPolicy = await show(
  AT({ statecraft: 30, courtcraft: 30 }),
  { age: 14, date: { year: 3, month: 12 } },
)
log(`C2 첫 친정(궁정처세 26): ${firstPolicy.title} · 통찰 ${firstPolicy.insights.length}줄`,
  ok(firstPolicy.insights.length === 1))

await browser.close()
