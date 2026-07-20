// M2b-3b-3 확률 발동 + ③ 체류 사이클 검증.
//
// ★ 이 스크립트의 존재 이유는 A 절이다.
//   확률 곡선은 "이럴 것이다"로 보고할 수 없는 종류의 주장이라,
//   실제 게임 함수를 10,000회 시행해 분포를 직접 세고 그 숫자를 출력한다.
//   설계서에 적은 값과 실측치가 다르면 설계서가 아니라 실측치가 사실이다.
import { APP_URL, advanceScene, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('chance')
const TRIALS = 10000

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  // 콘솔 404 메시지에는 URL 이 없다. 진짜 404 는 아래 response 리스너가 잡는다.
  // (상시 뜨던 이 404 의 정체는 favicon 미설정이었다)
  const resource404 = /Failed to load resource.*404/.test(m.text())
  if (m.type() === 'error' && !resource404) errors.push('CONSOLE: ' + m.text())
})
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const chanceOf = (aff, acts) =>
  page.evaluate(
    ([a, ac]) => {
      window.__queeningAi.setGame({ affection: { ...window.__queeningAi.game?.affection, prince: a } })
      return window.__queeningAi.chance.of('prince-arrival', ac)
    },
    [aff, acts],
  )
const waits = (aff, acts) =>
  page.evaluate(
    ([a, ac, t]) => window.__queeningAi.chance.waitSamples('prince-arrival', a, ac, t),
    [aff, acts, TRIALS],
  )

const pct = (x) => (x * 100).toFixed(1) + '%'
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const quantile = (xs, q) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)]

// ─────────────────────────────────────────────────────────────
log('=== A. ★ 확률 3층 실측 (각 ' + TRIALS.toLocaleString() + '회 시행) ===')
log('')

const CASES = [
  { label: '호감도 5 · 아무것도 안 함', aff: 5, acts: [], expect: 0.168 },
  { label: '호감도 50 · 아무것도 안 함', aff: 50, acts: [], expect: 0.325 },
  { label: '호감도 80 · 아무것도 안 함', aff: 80, acts: [], expect: 0.43 },
  { label: '호감도 5 · 연회 참석', aff: 5, acts: ['attend-banquet'], expect: 0.268 },
  { label: '호감도 5 · 사냥 대회', aff: 5, acts: ['royal-hunt'], expect: 0.618 },
  { label: '호감도 80 · 사냥 대회', aff: 80, acts: ['royal-hunt'], expect: 0.88 },
]

log('   조건                          첫 계절 확률(설계/실측)   평균대기   중앙값   최악')
const rows = []
for (const c of CASES) {
  const p = await chanceOf(c.aff, c.acts)
  const w = await waits(c.aff, c.acts)
  rows.push({ ...c, p, w })
  log(
    `   ${c.label.padEnd(28)} ${pct(c.expect).padStart(6)} / ${pct(p).padStart(6)}` +
      `   ${mean(w).toFixed(2).padStart(6)}계절  ${String(quantile(w, 0.5)).padStart(4)}` +
      `   ${String(Math.max(...w)).padStart(3)}계절`,
  )
}

log('')
log('A1 설계 확률과 실측 확률이 일치:',
  ok(rows.every((r) => Math.abs(r.p - r.expect) < 0.005)))
log('A2 ★ 바닥이 0 이 아님 — 아무것도 안 해도 온다:',
  ok(rows[0].p > 0.15))
log('A3 ★ 천장이 실제로 작동 — 최악의 경우도 8계절 이내:',
  '최대 ' + Math.max(...rows.map((r) => Math.max(...r.w))) + '계절',
  ok(rows.every((r) => Math.max(...r.w) <= 8)))
log('A4 ★ 호감도가 오르면 대기가 짧아짐 (5 → 50 → 80):',
  [rows[0], rows[1], rows[2]].map((r) => mean(r.w).toFixed(2)).join(' → '),
  ok(mean(rows[0].w) > mean(rows[1].w) && mean(rows[1].w) > mean(rows[2].w)))
log('A5 ★ 유도가 실제로 확률을 삼 (무 < 연회 < 사냥):',
  [rows[0].p, rows[3].p, rows[4].p].map(pct).join(' < '),
  ok(rows[0].p < rows[3].p && rows[3].p < rows[4].p))
log('A6 ★ 사냥이면 대개 그 계절 안에 (중앙값 1계절):',
  ok(quantile(rows[4].w, 0.5) === 1))

// 데뷔탕트(16세 가을)부터 종료까지 남는 14계절 동안 몇 번 만나는가.
// 한 사이클 = 대기 + 체류 2계절 + 쿨다운 2계절.
const SEASONS_LEFT = 14
const CYCLE_OVERHEAD = 4 // 체류 2 + 공백 2. 확률로 줄일 수 없는 하한.
const visits = (w) => SEASONS_LEFT / (mean(w) + CYCLE_OVERHEAD)
const passive = visits(rows[0].w)
const active = visits(rows[4].w)
log(`A7 데뷔탕트 이후 14계절 동안 만나는 횟수 — 방치 ${passive.toFixed(1)}회 / 사냥 ${active.toFixed(1)}회`)
log('   ★ 방치로도 최소 한 번은 만난다 (시작조차 못 하는 일은 없다):', ok(passive >= 1))
// ★ 유도가 사는 것은 "총 만남 횟수"가 아니라 "다음 만남까지의 대기"다.
//   총 횟수는 체류+공백 4계절이라는 하한에 눌려 확률로는 더 못 늘린다.
log('   ★ 유도가 대기를 크게 줄임 (확률을 자원으로 산다):',
  `${mean(rows[0].w).toFixed(2)} → ${mean(rows[4].w).toFixed(2)}계절`,
  ok(mean(rows[0].w) / mean(rows[4].w) >= 2))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 쿨다운·천장 카운터가 스스로 관리되는가 ===')
// ★ A 절이 호감도를 80 으로 올려놨다. 기본 확률을 보려면 되돌려야 한다.
await setGame({ counters: {}, flags: {}, affection: { prince: 5 } })
const c0 = await page.evaluate(() => window.__queeningAi.chance.of('prince-arrival', []))
await setGame({ counters: { '__pity:prince-arrival': 5 } })
const c5 = await page.evaluate(() => window.__queeningAi.chance.of('prince-arrival', []))
await setGame({ counters: { '__pity:prince-arrival': 7 } })
const c7 = await page.evaluate(() => window.__queeningAi.chance.of('prince-arrival', []))
log(`   헛탕 0회 ${pct(c0)} → 5회 ${pct(c5)} → 7회 ${pct(c7)}`)
log('B1 4회까지는 오르지 않음:', ok(Math.abs(c0 - 0.1675) < 0.005))
log('B2 5회부터 상승:', ok(c5 > c0))
log('B3 ★ 7회 헛탕이면 확정 발동:', ok(c7 === 1))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. ★ 등장 → 체류 → 대화 → 퇴장 → 재등장 사이클 ===')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

/** 「인연」에서 ③ 카드의 상태를 읽는다. */
async function princeCard() {
  await page.getByRole('button', { name: '인연', exact: true }).click()
  await page.waitForTimeout(250)
  const dialog = page.getByRole('dialog', { name: '인연' })
  const li = dialog.locator('li').nth(2)
  const text = await li.innerText()
  const state = text.includes('🔒 잠김') ? 'locked' : text.includes('✈ 부재') ? 'away' : 'present'
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  return { state, text }
}

/**
 * 한 턴을 끝내고 그 턴에 뜬 이벤트 제목을 전부 모아 돌려준다.
 * 한 계절에 두 건까지 터질 수 있으므로 큐를 끝까지 걷는다.
 */
async function runTurn() {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: [] })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(350)
  const titles = []
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole('button', { name: /다음 계절로|무슨 일이|계속/ })
    if (!(await next.isVisible().catch(() => false))) break
    const label = await next.innerText()
    await next.click()
    await page.waitForTimeout(400)
    await advanceScene(page)
    const t = await page.locator('article h1').innerText().catch(() => null)
    if (t && !titles.includes(t)) titles.push(t)
    if (/다음 계절로/.test(label)) break
  }
  // 남은 진행 버튼을 정리한다
  for (let i = 0; i < 4; i++) {
    const b = page.getByRole('button', { name: /다음 계절로|계속/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click()
    await page.waitForTimeout(250)
  }
  return titles
}

// 데뷔탕트는 지났고 ③ 은 아직 오지 않은 상태.
// ★ 17세 봄에 겹치는 마일스톤(성년식 등)을 이미 본 것으로 둔다 —
//   그것들이 우선순위 대역에서 위인 건 정상이고, 여기서 볼 것은 체류 사이클이다.
await setGame({
  age: 17, date: { year: 6, season: 'spring' },
  flags: {
    romance_unlocked: true,
    'event:adult-coming-of-age': true,
    'event:teen-first-policy': true,
    'event:adult-inner-court': true,
    'event:regent-warning': true,
    'event:debut-ball': true,
    'event:adult-uncle-letters': true,
  },
  counters: {}, phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
})
const before = await princeCard()
log('C1 해금됐지만 아직 안 왔으면 "부재":', before.state, ok(before.state === 'away'))
log('C2 ★ 부재 사유가 잠금과 다르게 안내됨:',
  ok(before.text.includes('지금은 궁에 없다')))

// 천장을 채워 확정 발동시킨다(확률 자체는 A 절에서 이미 실측했다)
await setGame({ counters: { '__pity:prince-arrival': 7 } })
const arrivalTitles = await runTurn()
log('C3 등장 이벤트 발동:', arrivalTitles.join(' / ') || '—',
  ok(arrivalTitles.includes('방문')))
await page.screenshot({ path: `${OUT}/01-arrival.png` })

const present = await princeCard()
log('C4 ★ 체류 중이면 대화 가능 상태:', present.state, ok(present.state === 'present'))
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(250)
await page.screenshot({ path: `${OUT}/02-present.png` })
await page.keyboard.press('Escape')

const stayAfterArrival = await page.evaluate(
  () => window.__queeningAi.state?.counters?.prince_stay,
)
log('C5 체류 카운터가 세팅됨:', stayAfterArrival)

// 체류가 끝나면 떠나야 한다. 몇 턴 대화할 수 있었는지도 함께 센다.
let departed = null
let talkableTurns = 0
for (let turn = 1; turn <= 4 && !departed; turn++) {
  if ((await princeCard()).state === 'present') talkableTurns++
  const titles = await runTurn()
  if (titles.includes('출발')) departed = turn
}
log('C6 ★ 체류가 끝나면 반드시 떠남:', `${departed}턴째 퇴장`, ok(departed === 2))
log('C7 ★ 체류 중 대화 가능한 턴 수:', `${talkableTurns}턴`, ok(talkableTurns === 2))
const after = await princeCard()
log('C8 떠난 뒤 다시 "부재":', after.state, ok(after.state === 'away'))
/**
 * ★ 쿨다운은 카운터 값을 읽어서 확인하면 안 된다 — 읽는 시점에 따라 이미 줄어 있다.
 *   천장을 최대로 채워 "확률이 1 이어도 못 온다"는 상태를 만들고,
 *   실제로 몇 계절 뒤에 다시 오는지를 센다.
 */
await setGame({ counters: { ...(await page.evaluate(() => window.__queeningAi.state.counters)),
  '__pity:prince-arrival': 7 } })
let gap = null
for (let turn = 1; turn <= 5 && gap === null; turn++) {
  if ((await runTurn()).includes('방문')) gap = turn
}
log('C9 ★ 떠난 뒤 곧바로 돌아오지 않음 (재등장까지):', `${gap}계절`, ok(gap === 2))
log('C10 ★ 최소 재등장 주기 = 체류 2 + 공백 2 = 4계절:', ok(gap === 2))
await page.screenshot({ path: `${OUT}/03-departed.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 우선순위 대역제 ===')
const prio = await page.evaluate(() => window.__queeningAi.priorities?.())
if (prio) {
  const values = prio.map((e) => e.priority)
  const dupes = values.filter((v, i) => values.indexOf(v) !== i)
  log('D1 ★ 우선순위 동률 0건:', dupes.length === 0 ? '없음' : dupes.join(', '), ok(dupes.length === 0))
  log('D2 진실이 최상위 대역:',
    ok(prio.filter((e) => e.id.startsWith('truth-')).every((e) => e.priority >= 90)))
  log('D3 ★ 캐릭터 등장이 정치 현안보다 위 (체류가 굶지 않음):',
    ok(Math.min(...prio.filter((e) => e.id.startsWith('prince-')).map((e) => e.priority)) >
       Math.max(...prio.filter((e) => e.id.startsWith('issue-')).map((e) => e.priority))))
  log('D4 퇴장이 등장보다 위:',
    ok(prio.find((e) => e.id === 'prince-departure').priority >
       prio.find((e) => e.id === 'prince-arrival').priority))
  log('D5 전 이벤트가 표에 등록됨:', prio.length + '건',
    ok(prio.every((e) => typeof e.priority === 'number' && e.priority > 0)))
} else {
  log('D  *** SKIP *** priorities 브릿지 없음')
}

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
