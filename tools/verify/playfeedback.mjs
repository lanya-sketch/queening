/**
 * 실플레이 완주 피드백 1 — 버그 정리 검증 (A-2·A-4·A-5·A-6).
 *   A-1(빈 돌발)은 verify:incidents G5·G6, A-3(성별 누락)은 verify:gender-lint L2 에서 본다.
 *
 * A-2. 화면에 내부 식별자·빈 라벨 0건 — __counter/__risk/__pity + 빈 효과 pill.
 * A-4. 나이 게이트 — "어린 왕/아이" 소소는 maxAge 로 성년 뒤엔 안 뜬다.
 * A-5. 순서 — 혈서 확증(blood-oath-complete)이 섭정 처분(regent-disposal)보다 우선.
 * A-6. 스포일러 — 인연 창에 ④ 평민 영웅 언급·??? 슬롯 없음(등장 전 완전 숨김).
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const setGame = (p) => page.evaluate((pp) => window.__queeningAi.setGame(pp), p)
const bodyText = () => page.evaluate(() => document.body.innerText)

// ── A-2. 내부값 누출 ──────────────────────────────────────
log('=== A-2. 내부값 누출 (내부 식별자·빈 라벨) ===')
// prince-arrival 은 counter(prince_stay) 효과가 있다 — 예전엔 결과칩에 __counter:prince_stay 노출.
await setGame({ phase: 'schedule', age: 16 })
await page.evaluate(() => window.__queeningAi.forceEvent('prince-arrival'))
await page.waitForTimeout(300)
// 씬을 끝까지 넘겨 결과칩(효과 미리보기)까지.
for (let i = 0; i < 30; i++) {
  const nx = page.getByRole('button', { name: /^(다음|계속)$/ })
  if (!(await nx.isVisible().catch(() => false))) break
  await nx.click(); await page.waitForTimeout(80)
}
const t1 = await bodyText()
log('A2-1 ★ 화면에 __counter 없음:', ok(!t1.includes('__counter')))
log('A2-2 ★ 화면에 __risk/__pity/__cooldown 없음:',
  ok(!t1.includes('__risk') && !t1.includes('__pity') && !t1.includes('__cooldown')))
// ★ 몰래 저잣거리로(sneak-town)는 __risk:tutor 카운터 효과가 있어 예전엔 "▲ (빈칸) 소폭"이 떴다.
//   외출을 열고 스케줄 화면에서 그 카드의 효과 pill 에 빈 라벨(화살표만)이 없는지 본다.
await setGame({ phase: 'schedule', age: 14, flags: { outing_unlocked: true, went_out: true } })
await page.waitForTimeout(200)
const blankPills = await page.evaluate(() => {
  // EffectPill 은 화살표 span + 라벨 span + 정도 span. 라벨이 빈 pill 을 찾는다.
  const cards = [...document.querySelectorAll('[data-activity]')]
  let blanks = 0
  for (const c of cards) {
    for (const pill of c.querySelectorAll('span')) {
      const txt = pill.innerText.trim()
      // "▲"/"▼" 만 있고 그 뒤 라벨이 없는 형태를 잡는다(형제 구조는 컴포넌트마다 달라
      // 러프하게: 화살표만 있고 옆에 라벨 텍스트가 비어 pill 전체가 화살표+정도뿐).
      if (/^[▲▼]$/.test(txt)) {
        const parent = pill.parentElement
        const full = parent ? parent.innerText.replace(/[▲▼\s·]/g, '') : ''
        if (/^(소폭|중폭|대폭)?$/.test(full)) blanks++
      }
    }
  }
  return blanks
})
log('A2-3 ★ 활동 카드에 빈 효과 라벨 pill 0(몰래 저잣거리 포함):', blankPills, ok(blankPills === 0))

// ── A-4. 나이 게이트 ──────────────────────────────────────
log('')
log('=== A-4. 나이 게이트 (어린 왕/아이 소소) ===')
const dailies = await page.evaluate(() => window.__queeningAi.dailyEvents())
const YOUNG = ['daily-chamberlain', 'daily-cold-shoulder', 'daily-clerk-slip']
const youngDefs = dailies.filter((d) => YOUNG.includes(d.id))
log('A4-1 ★ 어린왕/아이 소소 3개에 maxAge 있음:',
  JSON.stringify(youngDefs.map((d) => `${d.id}:${d.maxAge}`)),
  ok(youngDefs.length === 3 && youngDefs.every((d) => d.maxAge != null && d.maxAge <= 16)))
// 성년(20)엔 조건 불충족.
log('A4-2 ★ 20세에 maxAge 15 라 발동 조건 밖:',
  ok(youngDefs.every((d) => d.maxAge < 20)))

// ── A-5. 이벤트 순서 ──────────────────────────────────────
log('')
log('=== A-5. 혈서 확증 > 섭정 처분 우선순위 ===')
const prio = await page.evaluate(() => {
  const p = Object.fromEntries(window.__queeningAi.priorities().map((e) => [e.id, e.priority]))
  return { complete: p['blood-oath-complete'], disposal: p['regent-disposal'] }
})
log('A5-1 ★ blood-oath-complete > regent-disposal:',
  `${prio.complete} > ${prio.disposal}`, ok(prio.complete > prio.disposal))

// ── A-6. 스포일러 (인연 창) ───────────────────────────────
log('')
log('=== A-6. 인연 창 스포일러 (④ 완전 숨김) ===')
// 인연 창 열기 — 13세 이상이라야 버튼이 산다.
await setGame({ phase: 'schedule', age: 15, flags: {} })
await page.waitForTimeout(150)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(250)
const panel = await page.evaluate(() => {
  const el = document.querySelector('[data-screen], body')
  return document.body.innerText
})
log('A6-1 ★ "평민 영웅" 언급 없음:', ok(!panel.includes('평민 영웅')))
log('A6-2 ★ "18세 입궁"/"입궁 이후" 스포일러 없음:',
  ok(!panel.includes('18세') && !panel.includes('입궁')))
log('A6-3 ★ ④ 미등장 시 "???" 슬롯 없음(완전 숨김):', ok(!panel.includes('???')))
// hero 입궁 후엔 나타난다.
await page.keyboard.press('Escape').catch(() => {})
await setGame({ age: 18, flags: { hero_at_court: true, romance_unlocked: true } })
await page.waitForTimeout(150)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(250)
const afterName = await page.evaluate(() => window.__queeningAi.resolve('{이름:hero}'))
const panel2 = await bodyText()
log('A6-4 ★ 입궁 후엔 ④ 가 명부에 나타남:', ok(panel2.includes(afterName)))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
