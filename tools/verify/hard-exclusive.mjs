// 하드 배타성 + 숙청 대안 검증.
//
// 코어 메커니즘 변경이라 네 가지를 본다:
//   A 하드 배타성 — 확정/거절/순차/철인통치
//   B 청산 게이팅 — 로맨스 안 함 + 정치 조건일 때만
//   C 엔딩 판정 단순화(romance 최대 하나) 후에도 완전성 유지 (1만 세이브)
//   D 숙청이 엔딩 삽입·수식으로 뜨는지, 호감도 구간 변주
import { APP_URL, advanceScene, blockAiNetwork, launch, log, ok, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('hard-exclusive')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
const blockedCalls = await blockAiNetwork(page)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

// 돌발이 끼어들지 않게 확률 0.
await page.evaluate(() => window.__queeningAi.setIncidentRate(0))

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)
const flagsOf = async () => (await stateOf()).flags ?? {}
const triggerable = (patch) =>
  page.evaluate((p) => { window.__queeningAi.setGame(p); return window.__queeningAi.triggerable() }, patch)
const judge = (state) => page.evaluate((s) => window.__queeningAi.judgeEnding(s), state)

const SEEN_OTHERS = await page.evaluate(() => {
  const own = new Set([
    ...window.__queeningAi.decisiveIds(), ...window.__queeningAi.reckoningIds(),
  ])
  const flags = {}
  for (const e of window.__queeningAi.events()) if (!own.has(e.id)) flags[`event:${e.id}`] = true
  return flags
})

const STATS = { statecraft: 40, finance: 20, rhetoric: 40, martial: 20, courtcraft: 40 }
const base = (patch = {}) => ({
  age: 18, date: { year: 7, month: 6 }, stats: STATS, monarchGender: 'male',
  affection: { heir: 0, loyalist: 0, prince: 5, commander: 20, hero: 0 },
  courtInfluence: 30, regentRapport: 30, regentSuspicion: 30, wellbeing: 80,
  counters: { '__cooldown:prince-arrival': 99 },
  flags: { ...SEEN_OTHERS, romance_unlocked: true },
  ...patch,
})

async function runTurn(choose) {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: [] })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(300)
  const titles = []
  for (let i = 0; i < 8; i++) {
    const next = page.getByRole('button', { name: /다음 달로|무슨 일이|계속/ })
    if (!(await next.isVisible().catch(() => false))) break
    const label = await next.innerText()
    await next.click()
    await page.waitForTimeout(300)
    await advanceScene(page)
    const t = await page.locator('article h1').innerText().catch(() => null)
    if (t && !titles.includes(t)) titles.push(t)
    if (choose) {
      const btn = page.locator('div.mt-4.space-y-2 > button').filter({ hasText: choose })
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click(); await page.waitForTimeout(200)
      }
    }
    if (/다음 달로/.test(label)) break
  }
  for (let i = 0; i < 5; i++) {
    const b = page.getByRole('button', { name: /다음 달로|계속/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click(); await page.waitForTimeout(200)
  }
  return titles
}

// ─────────────────────────────────────────────────────────────
log('=== A. ★ 하드 배타성 ===')

// 호감도 70 → 결정적 씬이 후보로
const decisive = await triggerable(base({ affection: { heir: 75, loyalist: 0, prince: 5, commander: 20, hero: 0 } }))
log('A1 호감도 70 → 결정적 씬 발동 가능:', ok(decisive.includes('decisive-heir')))

// 수락 → 확정 + 나머지 닫힘
await setGame(base({ affection: { heir: 75, loyalist: 75, prince: 5, commander: 20, hero: 0 } }))
await runTurn('그 손을 잡는다')
let f = await flagsOf()
log('A2 ★ 수락 → 확정:', ok(f['romance_confirmed:heir'] === true && f.romance_settled === true))
const afterConfirm = await triggerable(base({
  affection: { heir: 75, loyalist: 75, prince: 5, commander: 20, hero: 0 },
  flags: { ...SEEN_OTHERS, romance_unlocked: true, 'romance_confirmed:heir': true, romance_settled: true, 'decisive_seen:heir': true },
}))
log('A3 ★ 확정 후 다른 결정적 씬 전부 닫힘:',
  afterConfirm.filter((id) => id.startsWith('decisive-')).join(', ') || '없음',
  ok(!afterConfirm.some((id) => id.startsWith('decisive-'))))

// 거절 → settled 안 섬, 다른 캐릭터 계속
await setGame(base({ affection: { heir: 75, loyalist: 75, prince: 5, commander: 20, hero: 0 } }))
await runTurn('아직은 아니라고 말한다')
f = await flagsOf()
log('A4 ★ 거절 → 확정 안 됨, settled 안 섬:',
  ok(!f.romance_settled && f['decisive_seen:heir'] === true))
const afterDecline = await triggerable(base({
  affection: { heir: 75, loyalist: 75, prince: 5, commander: 20, hero: 0 },
  flags: { ...SEEN_OTHERS, romance_unlocked: true, 'decisive_seen:heir': true },
}))
log('A5 ★ 거절 후 다른 캐릭터 결정적 씬은 계속:',
  ok(afterDecline.includes('decisive-loyalist') && !afterDecline.includes('decisive-heir')))

// 판정: 확정된 하나만 romance
const confirmedEnding = await judge(base({
  courtInfluence: 55,
  affection: { heir: 80, loyalist: 90, prince: 0, commander: 0, hero: 0 },
  flags: { 'romance_confirmed:loyalist': true, romance_settled: true },
}))
log('A6 ★ 엔딩 romance = 확정된 하나 (호감도 최고 아님):',
  confirmedEnding.romance, ok(confirmedEnding.romance === 'loyalist'))
const noConfirm = await judge(base({
  courtInfluence: 55, affection: { heir: 90, loyalist: 90, prince: 0, commander: 0, hero: 0 },
}))
log('A7 ★ 호감도 90 여럿이어도 확정 안 했으면 철인통치:',
  noConfirm.romance, ok(noConfirm.romance === 'none'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★ 청산 게이팅 ===')

// ⑤ 반역: 로맨스 안 함 + 영향도 낮음 + 군사노선 안 탐 + 19세
const commanderPurge = await triggerable(base({
  age: 19, courtInfluence: 40,
  flags: { ...SEEN_OTHERS, romance_unlocked: true },
}))
log('B1 ⑤ 청산 조건 충족 → 발동 가능:', ok(commanderPurge.includes('commander-reckoning')))

// 로맨스 확정한 캐릭터는 청산 대상 아님
const commanderConfirmed = await triggerable(base({
  age: 19, courtInfluence: 40,
  flags: { ...SEEN_OTHERS, romance_unlocked: true, 'romance_confirmed:commander': true, romance_settled: true },
}))
log('B2 ★ 확정한 캐릭터는 청산 대상 아님:',
  ok(!commanderConfirmed.includes('commander-reckoning')))

// 정치 조건 미달(영향도 높음)이면 안 뜸
const commanderStrong = await triggerable(base({
  age: 19, courtInfluence: 80,
  flags: { ...SEEN_OTHERS, romance_unlocked: true },
}))
log('B3 정치 조건 미달(영향도 80)이면 청산 안 뜸:',
  ok(!commanderStrong.includes('commander-reckoning')))

// 18세엔 아직
const tooYoung = await triggerable(base({
  age: 18, courtInfluence: 40, flags: { ...SEEN_OTHERS, romance_unlocked: true },
}))
log('B4 19세 전에는 청산 없음:', ok(!tooYoung.includes('commander-reckoning')))

// ★ 철인통치 시 넷 다 조건 맞으면 숙청 가능
const heartlessAll = await triggerable(base({
  age: 19, courtInfluence: 40,
  flags: {
    ...SEEN_OTHERS, romance_unlocked: true,
    regent_disposed: true, house_commons_dissolved: true, hero_at_court: true,
  },
}))
const reckonings = heartlessAll.filter((id) => id.endsWith('-reckoning'))
log('B5 ★ 철인통치 + 넷 다 조건 → 넷 다 청산 가능:',
  reckonings.join(', '), ok(reckonings.length === 4))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. ★★ 판정 단순화 후에도 완전성 (무작위 1만 세이브) ===')
const sweep = await page.evaluate(() => {
  const TIERS = ['친정', '공존', '허수아비', '배드:꼭두각시', '배드:군부종속', '배드:제국복속']
  const FLAGS = [
    'queen_poison_path', 'queen_poison_averted', 'military_route_open', 'union_possible',
    'truth_regent_involved', 'truth_mother_mastermind', 'blood_oath_complete',
    'blood_oath_given', 'blood_oath_seized', 'tyrant_purge', 'just_purge', 'regent_alliance',
    'house_commons_defended', 'house_commons_dissolved', 'scroll_offered',
    'romance_confirmed:heir', 'romance_confirmed:loyalist', 'romance_confirmed:prince',
    'romance_confirmed:commander', 'romance_confirmed:hero',
    'heir_executed', 'heir_spared', 'loyalist_scapegoat', 'loyalist_spared',
    'hero_isolated', 'hero_spared', 'commander_purged', 'commander_spared',
  ]
  const rand = (n) => Math.floor(Math.random() * n)
  const problems = []
  let threw = 0, multiRomance = 0
  const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']

  for (let i = 0; i < 10000; i++) {
    const flags = {}
    for (const f of FLAGS) if (Math.random() < 0.4) flags[f] = true
    const affection = {}
    for (const c of CHARS) affection[c] = rand(101)
    const state = {
      stats: { statecraft: rand(101), finance: rand(101), rhetoric: rand(101), martial: rand(101), courtcraft: rand(101) },
      wellbeing: rand(101), tutorTrust: rand(101), regentSuspicion: rand(101), regentRapport: rand(101),
      courtInfluence: rand(101), affection, flags, counters: {},
    }
    let r
    try { r = window.__queeningAi.judgeEnding(state) } catch (e) { threw++; if (problems.length < 3) problems.push(String(e)); continue }
    if (!r || !TIERS.includes(r.tier)) { problems.push('tier: ' + r?.tier); continue }
    // ★ 하드 배타성 — romance 는 절대 여러 개가 아니다(단일 값 또는 none)
    if (r.romance !== 'none' && !CHARS.includes(r.romance)) { multiRomance++; problems.push('romance: ' + r.romance) }
    if (r.modifiers.includes('복수의 인연')) { multiRomance++; problems.push('복수의 인연 남아있음') }
  }
  return { problems: problems.slice(0, 5), threw, multiRomance }
})
log('C1 ★ 예외 없이 전부 판정 (1만):', `예외 ${sweep.threw}`, ok(sweep.threw === 0))
log('C2 ★ "엔딩 없음"/이상 tier 0건:', sweep.problems.length === 0 ? '없음' : sweep.problems.join(' | '),
  ok(sweep.problems.length === 0))
log('C3 ★ romance 는 항상 최대 하나 (복수의 인연 제거됨):', ok(sweep.multiRomance === 0))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. 숙청 → 엔딩 삽입·수식 ===')
const scene = async (state) => {
  const out = await page.evaluate((s) => window.__queeningAi.buildEndingScene(s), state)
  const parts = []
  for (const l of out.scene.lines) parts.push(await page.evaluate(([t, s]) => window.__queeningAi.resolveWith(t, s), [l.text, state]))
  return { text: parts.join('\n'), result: out.result }
}

const twoPurges = await scene(base({
  courtInfluence: 80,
  flags: { heir_executed: true, commander_purged: true, blood_oath_seized: true },
}))
log('D1 ★ 숙청 2개 → 청산 수식:', ok(twoPurges.result.modifiers.includes('청산')))
log('D2 ① 핏줄 청산 삽입(강탈+처형):', ok(twoPurges.text.includes('아들까지 남기지 않았다')))
log('D3 ⑤ 청산 삽입:', ok(twoPurges.text.includes('아홉 대를 지킨 자리가')))

const lonely = await scene(base({
  courtInfluence: 80,
  flags: { heir_executed: true, loyalist_scapegoat: true, hero_isolated: true, commander_purged: true },
}))
log('D4 ★ 철인통치 + 숙청 다수 → 고독한 옥좌:',
  ok(lonely.result.modifiers.includes('고독한 옥좌') && lonely.text.includes('마지막에는 정말로 혼자')))

const bloody = await scene(base({
  courtInfluence: 80, flags: { tyrant_purge: true, commander_purged: true },
}))
log('D5 ★ 폭군 + 숙청 → 피 묻은 손:', ok(bloody.result.modifiers.includes('피 묻은 손')))

const spared = await scene(base({
  courtInfluence: 80, flags: { commander_spared: true },
}))
log('D6 관용도 삽입으로(위험을 안고 감):', ok(spared.text.includes('갈아치울 힘은 그대로')))

// 호감도 구간 변주 — ⑤ 3구간 실제 발동
log('')
log('=== E. 호감도 구간별 청산 후일담 (⑤ 3구간) ===')
const bandFire = async (affection) => triggerable(base({
  age: 19, courtInfluence: 40,
  affection: { heir: 0, loyalist: 0, prince: 5, commander: affection, hero: 0 },
  flags: { ...SEEN_OTHERS, romance_unlocked: true, commander_purged: true },
}))
const high = await bandFire(80)
const mid = await bandFire(55)
const low = await bandFire(20)
log('E1 ★ 높은 구간 → high 후일담:',
  ok(high.includes('commander-aftermath-high') && !high.includes('commander-aftermath-mid')))
log('E2 ★ 중간 구간 → mid 후일담:',
  ok(mid.includes('commander-aftermath-mid') && !mid.includes('commander-aftermath-high')))
log('E3 ★ 낮은 구간 → low 후일담:',
  ok(low.includes('commander-aftermath-low') && !low.includes('commander-aftermath-mid')))
log('E4 ★ ①②④는 높은 구간만 (중간은 후일담 없음 — 후속 확장분):',
  ok(!(await bandFire(55)).includes('heir-aftermath-high')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 세이브 ===')
await setGame(base({ flags: { ...SEEN_OTHERS, romance_unlocked: true, 'romance_confirmed:heir': true, romance_settled: true, commander_purged: true } }))
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('F1 세이브 버전 유지:', saved.version, ok(saved.version === SAVE_VERSION))
log('F2 확정·숙청 flag 보존:',
  ok(saved.state.flags['romance_confirmed:heir'] === true && saved.state.flags.commander_purged === true))

log('')
log('G1 ★ 실제 AI 호출 0건:', `차단 ${blockedCalls().length}건`, ok(blockedCalls().length === 0))
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
