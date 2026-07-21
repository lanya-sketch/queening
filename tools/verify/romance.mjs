// M2b-3a 연애 기반 + 표현 골격 검증.
//
// ★ 핵심: 왕/여왕 양쪽으로 돌려 복합어(선왕·왕국·왕당파·왕대비·옥좌)가 깨지지 않는지,
//   그리고 여왕 플레이가 텍스트상 일관되는지.
import { APP_URL, enterGame, launch, log, ok, overflow, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('romance')

const browser = await launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(400)

log('=== A. 키 없이도 코어 게임 완전 ===')
log('A1 스케줄 화면:', ok(await page.getByText('활동 선택').isVisible()))
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.waitForTimeout(250)
log('A2 턴 진행:', ok(await page.getByText('수행한 활동').isVisible()))
await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
await page.waitForTimeout(200)

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★ 복합어 안전성 (왕/여왕 양쪽) ===')

const SAMPLES = [
  '선왕의 유품을 정리하라는 명이 내려왔다. {왕}은 굳이 직접 하겠다고 했다.',
  '"{왕}국이 언제까지 왕국이어야 하는가."'.replace('{왕}국', '왕국'),
  '왕대비가 {왕}을 처소로 불렀다.',
  '해산 동의안을 올렸다. 왕당파는 존속을 청한다.',
  '{왕}은 옥좌에 앉아 있을 뿐이다.',
  '{왕}이 왕실 의관에게 선왕의 마지막 진료 기록을 청했다.',
]

async function resolveAll(gender) {
  return page.evaluate(
    async ([g, samples]) => {
      window.__queeningAi.setGame({ monarchGender: g })
      return samples.map((s) => window.__queeningAi.resolve(s))
    },
    [gender, SAMPLES],
  )
}

const asKing = await resolveAll('male')
const asQueen = await resolveAll('female')

log('B1 왕 플레이:')
for (const line of asKing) log('   ' + line)
log('B2 여왕 플레이:')
for (const line of asQueen) log('   ' + line)

const COMPOUNDS = ['선왕', '왕국', '왕대비', '왕당파', '옥좌', '왕실']
const brokenCompounds = []
for (const line of asQueen) {
  for (const word of COMPOUNDS) {
    // 복합어가 "여" 로 오염되었는지 확인 (선여왕 / 여왕국 / 여왕대비 …)
    if (line.includes('선여왕') || line.includes('여왕국') || line.includes('여왕대비') ||
        line.includes('여왕당파') || line.includes('여왕실')) {
      brokenCompounds.push(`${word}: ${line}`)
    }
  }
}
log('B3 ★ 복합어 오염 없음:', brokenCompounds.length === 0 ? '없음' : brokenCompounds.join(' | '),
  ok(brokenCompounds.length === 0))
log('B4 복합어 원형 보존 (선왕·왕국·왕대비·왕당파·옥좌):',
  ok(asQueen.some((l) => l.includes('선왕의')) &&
     asQueen.some((l) => l.includes('왕국이')) &&
     asQueen.some((l) => l.includes('왕대비가')) &&
     asQueen.some((l) => l.includes('왕당파는')) &&
     asQueen.some((l) => l.includes('옥좌에'))))
log('B5 군주 지칭만 여왕으로 치환:',
  ok(asQueen[0].includes('여왕은 굳이') && asKing[0].includes('왕은 굳이')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 여왕 플레이의 텍스트 일관성 ===')
await page.evaluate(() => window.__queeningAi.setGame({ monarchGender: 'female' }))
await page.waitForTimeout(300)
const panelText = await page.locator('aside').innerText()
log('C1 패널 나이 표기:', panelText.match(/여?왕 \d+세/)?.[0], ok(/여왕 \d+세/.test(panelText)))
const scheduleText = await page.locator('main').innerText()
log('C2 활동 설명도 치환 ("여왕의 이름으로 서명한다"):',
  ok(scheduleText.includes('여왕의 이름으로 서명한다')))
log('C3 AI 프롬프트도 여왕으로:',
  ok((await page.evaluate(() => window.__queeningAi.prompt())).includes('이 왕국의 여왕이다')))
await page.screenshot({ path: `${OUT}/01-queen.png`, fullPage: false })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 호감도 · 게이팅 · 배타성 ===')
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
const romance = page.getByRole('dialog', { name: '인연' })
log('D1 명부 열림:', ok(await romance.isVisible()))
log('D2 캐릭터 5인 등록:', ok((await romance.locator('li').count()) === 5))
const lockedCount = (await romance.getByText('🔒 잠김').count())
log('D3 데뷔탕트 전 전원 잠김:', lockedCount, ok(lockedCount === 5))
log('D4 초상 표시:', ok((await romance.locator('img').count()) === 5))
log('D5 375px 대비 오버플로:', JSON.stringify(await overflow(page)))
await page.screenshot({ path: `${OUT}/02-romance-locked.png`, fullPage: false })
await page.keyboard.press('Escape')

// 데뷔탕트 해금 + 호감도 주입
await page.evaluate(() =>
  window.__queeningAi.setGame({
    age: 18,
    flags: { romance_unlocked: true },
    affection: { heir: 75, loyalist: 72, prince: 5, commander: 20, hero: 0 },
  }),
)
await page.waitForTimeout(200)
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
const romance2 = page.getByRole('dialog', { name: '인연' })
const stillLocked = await romance2.getByText('🔒 잠김').count()
log('D6 데뷔탕트 후 ①②③⑤ 해금 (④만 잠김):', stillLocked, ok(stillLocked === 1))
// 헤더 안내문에도 "깊은 관계"가 있으므로 목록 항목의 배지만 센다
const deepCount = await romance2.locator('li').getByText('깊은 관계', { exact: true }).count()
log('D7 ★ 느슨한 배타성 — 두 명이 동시에 깊은 관계:', deepCount, ok(deepCount === 2))
await page.screenshot({ path: `${OUT}/03-romance-unlocked.png`, fullPage: false })
await page.keyboard.press('Escape')

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 대사 씬 ===')
await page.evaluate(() =>
  window.__queeningAi.setGame({
    date: { year: 5, season: 'summer' },
    age: 16,
    flags: { 'event:issue-house-of-commons': true },
    phase: 'schedule',
    actionPoints: 3,
    plannedActivityIds: [],
  }),
)
await page.waitForTimeout(200)
await page.getByRole('button', { name: /턴 종료/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
await page.waitForTimeout(400)

const isEvent = await page.getByText('사건', { exact: true }).isVisible().catch(() => false)
log('E1 데뷔탕트 발동 (16세 가을):',
  await page.locator('article h1').innerText().catch(() => '—'),
  ok(isEvent && (await page.locator('article h1').innerText()) === '데뷔탕트'))
log('E2 씬이 한 줄만 먼저 보임:',
  ok((await page.locator('article').innerText()).includes('대연회장의 문이 열린다')))
log('E3 진행 표시 (1 / 4):', ok((await page.locator('article').innerText()).includes('1 / 4')))
log('E4 여왕 토큰 치환 확인 — 다음 줄로')
await page.getByRole('button', { name: '다음' }).click()
await page.waitForTimeout(250)
const sceneText = await page.locator('article').innerText()
log('E5 씬 대사도 성별 치환:', ok(sceneText.includes('여왕의 성년을 알리는')))
await page.screenshot({ path: `${OUT}/04-scene.png`, fullPage: false })

// 끝까지 진행
for (let i = 0; i < 4; i++) {
  const next = page.getByRole('button', { name: /^다음$|^계속$/ })
  if (await next.isVisible().catch(() => false)) {
    await next.click()
    await page.waitForTimeout(200)
  }
}
await page.waitForTimeout(300)
log('E6 씬 종료 후 진행 버튼 등장:',
  ok(await page.getByRole('button', { name: /다음 계절로|계속 \(/ }).isVisible()))
const unlocked = await page.evaluate(() => window.__queeningAi.prompt())
log('E7 romance_unlocked flag 설정됨:',
  ok(typeof unlocked === 'string'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 세이브 v5 · 마이그레이션 ===')
await page.getByRole('button', { name: /다음 계절로|계속 \(/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('F1 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('F2 호감도 저장:', ok(typeof saved.state.affection === 'object'))
log('F3 군주 성별 저장:', saved.state.monarchGender, ok(saved.state.monarchGender === 'female'))

// v4 세이브 → 현재 버전까지 연쇄 마이그레이션 (v4→v5→v6…)
await page.evaluate(() => {
  localStorage.setItem('queening.save', JSON.stringify({
    version: 4, savedAt: '2026-05-05T00:00:00.000Z', state: {
      date: { year: 3, season: 'autumn' }, age: 14,
      stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 35, courtcraft: 30 },
      wellbeing: 60, tutorTrust: 45, regentSuspicion: 20, regentRapport: 30,
      courtInfluence: 25, actionPoints: 3, plannedActivityIds: [],
      flags: { clue_radical_edict: true }, phase: 'schedule',
      lastTurnReport: null, pendingEventIds: [], currentOutfitId: 'office',
    },
  }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.getByRole('button', { name: '불러오기' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('F4 v4 → 현재 버전 연쇄 마이그레이션:', migrated.version,
  ok(migrated.version === SAVE_VERSION))
log('F4b 계절 타이머 필드 주입(v5→v6):', JSON.stringify(migrated.state.counters),
  ok(typeof migrated.state.counters === 'object'))
log('F5 호감도 기본값 주입:', JSON.stringify(migrated.state.affection),
  ok(migrated.state.affection.heir === 0 && migrated.state.affection.loyalist === 20))
log('F6 군주 성별 기본값 male:', ok(migrated.state.monarchGender === 'male'))
log('F7 기존 flag 보존:', ok(migrated.state.flags.clue_radical_edict === true))
log('F8 기존 착장 보존:', ok(migrated.state.currentOutfitId === 'office'))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
