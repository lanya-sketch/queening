// M2b-3b-1 캐릭터 시트 조립 검증.
//
// ★ 핵심: 다섯을 각자 조립했을 때 서로 확연히 다른 인물이 나오는가.
//   (군주 두 세이브 비교와 같은 방식 — 실제 출력을 눈으로 확인한다)
// 대화 시스템은 아직 없다. 조립까지만 본다. 네트워크 불필요.
import { APP_URL, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('character-sheets')
const IDS = ['heir', 'loyalist', 'prince', 'hero', 'commander']

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const persona = (id) => page.evaluate((i) => window.__queeningAi.persona(i), id)

/** 인물 묘사 구간만 — 응답 형식 지시에는 숫자가 정상적으로 있다. */
function personaSection(prompt) {
  const end = prompt.indexOf('응답 형식:')
  return end === -1 ? prompt : prompt.slice(0, end)
}

// ─────────────────────────────────────────────────────────────
log('=== A. ★ 다섯이 서로 다른 인물인가 ===')
await setGame({ affection: { heir: 10, loyalist: 10, prince: 10, hero: 10, commander: 10 }, flags: {} })

const sheets = {}
for (const id of IDS) sheets[id] = await persona(id)

for (const id of IDS) {
  const first = personaSection(sheets[id]).trim().split('\n')[0]
  log(`   ${id.padEnd(10)} ${first}`)
}

const cores = IDS.map((id) => personaSection(sheets[id]))
const allDistinct = new Set(cores).size === IDS.length
log('A1 다섯 조립 결과가 전부 다름:', ok(allDistinct))
log('A2 정체가 각자 박혀 있음:',
  ok(cores[0].includes('섭정공의 아들') && cores[1].includes('백작가의 딸') &&
     cores[2].includes('제국의 왕족') && cores[3].includes('평민 병졸') &&
     cores[4].includes('무관 가문의 딸')))
log('A3 말투 지시가 서로 다름 (흐린다/말린다/거침없다/건조하다/삼킨다):',
  ok(cores[0].includes('문장 끝에서 흐리고') && cores[1].includes('말리는 말을 먼저') &&
     cores[2].includes('오만하고 거침없다') && cores[3].includes('짧고 건조하게') &&
     cores[4].includes('사적인 것은 삼킨다')))
log('A4 캐릭터별 고유 금기:',
  ok(cores[0].includes('혈서 반쪽') && cores[2].includes('개입하거나 훈수하지 않는다') &&
     cores[3].includes('굽신거리는 충성') && cores[4].includes('먼저 선을 넘지 않는다')))
log('A5 전원 공통 금기(호감도 델타 서술 금지):',
  ok(cores.every((c) => c.includes('호감도 변화를 말로 서술하지 않는다'))))
log('A6 ★ 인물 묘사 구간에 숫자 없음:',
  ok(cores.every((c) => !/\d/.test(c))))
log('A7 응답 형식에는 숫자가 정상적으로 있음:',
  ok(/\d/.test(sheets.heir.slice(sheets.heir.indexOf('응답 형식:')))))
log('A8 델타 대상이 캐릭터별 복합키:',
  ok(sheets.heir.includes('affection:heir') && sheets.hero.includes('affection:hero')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 2층 — 호감도 낮음 / 높음 ===')
await setGame({ affection: { heir: 5, loyalist: 5, prince: 5, hero: 5, commander: 5 } })
const low = {}
for (const id of IDS) low[id] = await persona(id)

await setGame({ affection: { heir: 90, loyalist: 90, prince: 90, hero: 90, commander: 90 } })
const high = {}
for (const id of IDS) high[id] = await persona(id)

for (const id of IDS) {
  const l = personaSection(low[id]).match(/지금 이 사람은: (.+)/)?.[1] ?? '—'
  const h = personaSection(high[id]).match(/지금 이 사람은: (.+)/)?.[1] ?? '—'
  log(`   ${id}`)
  log(`     낮음  ${l}`)
  log(`     높음  ${h}`)
}
log('B1 다섯 모두 낮음/높음이 갈림:',
  ok(IDS.every((id) => low[id] !== high[id])))
log('B2 ① 낙차 (반감 → 헌신):',
  ok(low.heir.includes('그 안에 아무것도 없다') && high.heir.includes('아버지를 버릴 각오')))
log('B3 ③ 낙차 (얕봄 → 인정):',
  ok(low.prince.includes('얕본다') && high.prince.includes('매인 데 없는 애정')))
log('B4 ⑤ 낙차 (격식 → 해방):',
  ok(low.commander.includes('격식이 단단하다') && high.commander.includes('해방에 가깝다')))
log('B5 2층에도 숫자 없음:',
  ok(IDS.every((id) => !/\d/.test(personaSection(high[id])))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 3층 — ① heir_knows_truth 전/후 ===')
await setGame({ affection: { heir: 50 }, flags: {} })
const before = await persona('heir')
await setGame({ flags: { heir_knows_truth: true } })
const after = await persona('heir')

log('C1 자각 전 3층:', ok(!before.includes('지금 서 있는 자리:')))
log('C2 자각 후 3층 등장:', ok(after.includes('지금 서 있는 자리:')))
log('C3 자각 서술:',
  personaSection(after).match(/- (.*알아버렸다.*)/)?.[1] ?? '—',
  ok(after.includes('아버지가 무엇을 했는지 알아버렸다')))
log('C4 1층은 그대로:', ok(before.includes('섭정공의 아들') && after.includes('섭정공의 아들')))

// ③ 는 국내 정치 flag 를 아예 읽지 않아야 한다
await setGame({
  flags: {
    heir_knows_truth: true, house_commons_defended: true,
    regent_hostile: true, truth_regent_involved: true, people_burdened_commons: true,
  },
})
const princeWithFlags = await persona('prince')
const heroWithFlags = await persona('hero')
log('C5 ★ ③ 는 국내 flag 를 읽지 않음 (완전 무관심):',
  ok(!princeWithFlags.includes('지금 서 있는 자리:')))
log('C6 ④ 는 하원 flag 에 반응:',
  ok(heroWithFlags.includes('자신이 상징하는 것을 군주가 지켰다')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ④ 입궁 스텁 — 조립 경로 ===')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await setGame({
  date: { year: 6, month: 9 }, age: 17, // 9월+1턴=10월(입궁 발동 — 2단계 재배치)
  // 17세 10월에 겹칠 수 있는 이벤트들을 이미 본 것으로 둔다(입궁만 검사하기 위해)
  flags: {
    romance_unlocked: true,
    'event:debut-ball': true,
    'event:adult-coming-of-age': true,
    'event:regent-warning': true,
  },
  phase: 'schedule', actionPoints: 3, plannedActivityIds: [],
})
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
await page.waitForTimeout(400)
const title = await page.locator('[data-event-title]').innerText().catch(() => '—')
log('D1 입궁 발동 (17세 10월):', title, ok(title === '입궁'))
log('D2 스텁 텍스트도 성별 토큰 사용:',
  ok((await page.locator('article').innerText()).includes('왕은 그 말이 포상이 아니라')))
await page.getByRole('button', { name: /다음 달로|계속/ }).click()
await page.waitForTimeout(300)

// ④ 는 hero_at_court **와** 18세를 동시에 요구한다 — 이중 조건을 확인한다.
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
const romance = page.getByRole('dialog', { name: '인연' })
const lockedAt17 = await romance.getByText('🔒 잠김').count()
log('D3 입궁했어도 17세면 ④ 는 아직 잠김 (나이 관문):', lockedAt17, ok(lockedAt17 === 1))
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await setGame({ age: 18 })
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
const lockedAt18 = await page.getByRole('dialog', { name: '인연' }).getByText('🔒 잠김').count()
log('D3b 18세가 되면 ④ 해금 (전원 열림):', lockedAt18, ok(lockedAt18 === 0))
await page.screenshot({ path: `${OUT}/01-all-unlocked.png`, fullPage: false })
await page.keyboard.press('Escape')

const heroPersona = await persona('hero')
log('D4 ④ 조립 경로 정상:', ok(typeof heroPersona === 'string' && heroPersona.includes('평민 병졸')))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
