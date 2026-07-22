// 측실 갈래 + ③ 정복 병합 검증.
//
//   A 측실 — 청산 3갈래, 게이팅, ⑤ 3구간, ①②④ 실제 삽입(플레이스홀더 아님)
//   B ③ 정복 — 능동 발동, 로맨스 중 정복 시 호감도 급락, union 가로챔
//   C 엔딩 네 갈래 + 조합 수식
//   D 완전성 유지(1만 세이브)
import { APP_URL, blockAiNetwork, launch, log, ok, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('concubine')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
const blockedCalls = await blockAiNetwork(page)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.evaluate(() => window.__queeningAi.setIncidentRate(0))

const stateOf = () => page.evaluate(() => window.__queeningAi.state)
const triggerable = (patch) =>
  page.evaluate((p) => { window.__queeningAi.setGame(p); return window.__queeningAi.triggerable() }, patch)
const judge = (state) => page.evaluate((s) => window.__queeningAi.judgeEnding(s), state)

const SEEN = await page.evaluate(() => {
  // 이번 라운드 이벤트(결정적·청산·정복)는 "본 것"으로 마킹하지 않는다 —
  // once 이벤트라 seen 처리되면 발동 후보에서 빠진다.
  const own = new Set([
    ...window.__queeningAi.decisiveIds(), ...window.__queeningAi.reckoningIds(),
    'prince-conquest',
  ])
  const flags = {}
  for (const e of window.__queeningAi.events()) if (!own.has(e.id)) flags[`event:${e.id}`] = true
  return flags
})
const STATS = { statecraft: 40, finance: 20, rhetoric: 40, martial: 20, courtcraft: 40 }
const base = (patch = {}) => ({
  age: 19, date: { year: 8, month: 6 }, stats: STATS, monarchGender: 'male',
  affection: { heir: 0, loyalist: 0, prince: 5, commander: 20, hero: 0 },
  courtInfluence: 40, regentRapport: 30, regentSuspicion: 30, wellbeing: 80,
  counters: { '__cooldown:prince-arrival': 99 },
  flags: { ...SEEN, romance_unlocked: true },
  ...patch,
})
const sceneText = async (state) => {
  const out = await page.evaluate((s) => window.__queeningAi.buildEndingScene(s), state)
  const parts = []
  for (const l of out.scene.lines) parts.push(await page.evaluate(([t, s]) => window.__queeningAi.resolveWith(t, s), [l.text, state]))
  return { text: parts.join('\n'), result: out.result }
}

// ─────────────────────────────────────────────────────────────
log('=== A. 측실 — 청산 3갈래 ===')
const commanderChoices = await page.evaluate(() => {
  const e = window.__queeningAi.events().find((x) => x.id === 'commander-reckoning')
  return e.choices.map((c) => c.id)
})
log('A1 ⑤ 청산이 3갈래(죽임/측실/관용):', commanderChoices.join(', '),
  ok(commanderChoices.length === 3 && commanderChoices.includes('concubine')))
const allThree = await page.evaluate(() =>
  ['heir', 'loyalist', 'hero', 'commander'].map((c) => {
    const e = window.__queeningAi.events().find((x) => x.id === `${c}-reckoning`)
    return e.choices.some((ch) => ch.id === 'concubine')
  }))
log('A2 네 캐릭터 청산 전부 측실 갈래 있음:', ok(allThree.every(Boolean)))

// ⑤ 측실 후일담 3구간 게이팅
const bandFire = (aff) => triggerable(base({
  affection: { ...base().affection, commander: aff },
  flags: { ...SEEN, romance_unlocked: true, commander_concubine: true },
}))
const high = await bandFire(80), mid = await bandFire(55), low = await bandFire(20)
log('A3 ★ ⑤ 측실 높은 구간:', ok(high.includes('commander-concubine-high') && !high.includes('commander-concubine-mid')))
log('A4 ★ ⑤ 측실 중간 구간:', ok(mid.includes('commander-concubine-mid')))
log('A5 ★ ⑤ 측실 낮은 구간:', ok(low.includes('commander-concubine-low')))

// 측실 엔딩 삽입 — ⑤ 실제 텍스트(보검 압수)
const cmdConc = await sceneText(base({
  courtInfluence: 80, flags: { commander_concubine: true },
}))
log('A6 ★ ⑤ 측실 삽입 — 보검 압수:', ok(cmdConc.text.includes('가문의 검을 왕실에')))

// ★ ①②④ 측실 삽입도 실제 문장인지(플레이스홀더/더미 아님)
const heirConc = await sceneText(base({ courtInfluence: 80, flags: { heir_concubine: true } }))
const loyalConc = await sceneText(base({ courtInfluence: 80, flags: { loyalist_concubine: true } }))
const heroConc = await sceneText(base({ courtInfluence: 80, flags: { hero_concubine: true } }))
log('A7 ★ ① 측실 삽입 실제 문장:', ok(heirConc.text.includes('가문이 지워진 채')))
log('A8 ★ ② 측실 삽입 실제 문장:', ok(loyalConc.text.includes('가둔 자리가 되었다')))
log('A9 ★ ④ 측실 삽입 실제 문장:', ok(heroConc.text.includes('벽에 걸렸다')))
log('A10 ★ 삽입 자리 더미("삽입"/anchor) 안 뜸:',
  ok(!/anchor|삽입 자리|placeholder/i.test(cmdConc.text + heirConc.text)))

log('A11 ★ 소유의 옥좌 수식(측실 2개):',
  ok((await judge(base({ courtInfluence: 80, flags: { heir_concubine: true, commander_concubine: true } }))).modifiers.includes('소유의 옥좌')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ③ 정복 — 능동 발동 ===')
// 강한 나라: 조건 충족
const strong = await triggerable(base({
  age: 17, courtInfluence: 60,
  stats: { statecraft: 40, finance: 50, rhetoric: 40, martial: 50, courtcraft: 40 },
}))
log('B1 강한 나라(영향도60·재정50·무예50) → 정복 발동 가능:', ok(strong.includes('prince-conquest')))
// 약한 나라: 안 뜸
const weak = await triggerable(base({
  age: 17, courtInfluence: 40,
  stats: { statecraft: 40, finance: 20, rhetoric: 40, martial: 20, courtcraft: 40 },
}))
log('B2 ★ 약한 나라는 정복 불가:', ok(!weak.includes('prince-conquest')))
// 17세 전
const young = await triggerable(base({
  age: 16, courtInfluence: 60,
  stats: { statecraft: 40, finance: 50, rhetoric: 40, martial: 50, courtcraft: 40 },
}))
log('B3 17세 전에는 안 뜸:', ok(!young.includes('prince-conquest')))
// 로맨스 확정 중에도 발동 가능(무관)
const romanced = await triggerable(base({
  age: 17, courtInfluence: 60,
  stats: { statecraft: 40, finance: 50, rhetoric: 40, martial: 50, courtcraft: 40 },
  affection: { ...base().affection, prince: 90 },
  flags: { ...SEEN, romance_unlocked: true, 'romance_confirmed:prince': true, romance_settled: true },
}))
log('B4 ★ 로맨스 확정 중에도 정복 발동 가능(무관):', ok(romanced.includes('prince-conquest')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 엔딩 네 갈래 (로맨스 × 정복) ===')
const g = (romanceConfirmed, conquered) => {
  const flags = { ...SEEN, romance_unlocked: true, union_possible: true }
  if (romanceConfirmed) { flags['romance_confirmed:prince'] = true; flags.romance_settled = true }
  if (conquered) flags.prince_conquered = true
  return judge(base({
    courtInfluence: 80,
    stats: { statecraft: 40, finance: 60, rhetoric: 40, martial: 60, courtcraft: 40 },
    affection: { ...base().affection, prince: conquered ? 0 : (romanceConfirmed ? 90 : 5) },
    flags,
  }))
}
const c_love_keep = await g(true, false)
const c_love_conq = await g(true, true)
const c_none_conq = await g(false, true)
const c_none_keep = await g(false, false)
log('C1 로맨스 + 정복안함 → 공동왕조(union_equal):',
  ok(c_love_keep.nationFlags.includes('union_equal') && !c_love_keep.nationFlags.includes('prince_conquered')))
log('C2 ★ 로맨스 + 정복 → 사랑을 삼킴 (union 가로챔):',
  `${JSON.stringify(c_love_conq.nationFlags)} ${JSON.stringify(c_love_conq.modifiers)}`,
  ok(c_love_conq.nationFlags.includes('prince_conquered') && !c_love_conq.nationFlags.includes('union_equal') && c_love_conq.modifiers.includes('사랑을 삼킴')))
log('C3 ★ 무로맨스 + 정복 → 무감정 정복:',
  ok(c_none_conq.nationFlags.includes('prince_conquered') && c_none_conq.modifiers.includes('무감정 정복')))
log('C4 무로맨스 + 정복안함 → ③ 무관(union도 정복도 없음이 정상):',
  ok(!c_none_keep.nationFlags.includes('prince_conquered')))

// 정복 씬 삽입
const conqScene = await sceneText(base({
  courtInfluence: 80,
  stats: { statecraft: 40, finance: 60, rhetoric: 40, martial: 60, courtcraft: 40 },
  flags: { ...SEEN, romance_unlocked: true, union_possible: true, prince_conquered: true, 'romance_confirmed:prince': true, romance_settled: true },
}))
log('C5 ★ 사랑을 삼킴 삽입:', ok(conqScene.text.includes('사랑이었던 것을') || conqScene.text.includes('삼켰다')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ★★ 완전성 유지 (1만 세이브, 측실·정복 flag 포함) ===')
const sweep = await page.evaluate(() => {
  const TIERS = ['친정', '공존', '허수아비', '배드:꼭두각시', '배드:군부종속', '배드:제국복속']
  const FLAGS = [
    'queen_poison_path', 'military_route_open', 'union_possible', 'prince_conquered',
    'truth_regent_involved', 'truth_mother_mastermind', 'blood_oath_complete',
    'tyrant_purge', 'just_purge', 'regent_alliance',
    'romance_confirmed:heir', 'romance_confirmed:prince', 'romance_confirmed:commander',
    'heir_executed', 'heir_concubine', 'loyalist_scapegoat', 'loyalist_concubine',
    'hero_isolated', 'hero_concubine', 'commander_purged', 'commander_concubine',
  ]
  const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']
  const rand = (n) => Math.floor(Math.random() * n)
  const problems = []; let threw = 0
  for (let i = 0; i < 10000; i++) {
    const flags = {}
    for (const f of FLAGS) if (Math.random() < 0.4) flags[f] = true
    const affection = {}; for (const c of CHARS) affection[c] = rand(101)
    const state = {
      stats: { statecraft: rand(101), finance: rand(101), rhetoric: rand(101), martial: rand(101), courtcraft: rand(101) },
      wellbeing: rand(101), tutorTrust: rand(101), regentSuspicion: rand(101), regentRapport: rand(101),
      courtInfluence: rand(101), affection, flags, counters: {},
    }
    let r
    try { r = window.__queeningAi.judgeEnding(state) } catch (e) { threw++; if (problems.length < 3) problems.push(String(e)); continue }
    if (!r || !TIERS.includes(r.tier)) { problems.push('tier: ' + r?.tier); continue }
    if (r.romance !== 'none' && !CHARS.includes(r.romance)) problems.push('romance: ' + r.romance)
    // ★ 정복이면 union_equal 과 공존하지 않아야 한다(정복이 가로챔)
    if (r.nationFlags.includes('prince_conquered') && r.nationFlags.includes('union_equal')) {
      problems.push('정복+공동왕조 공존')
    }
  }
  return { problems: problems.slice(0, 5), threw }
})
log('D1 ★ 예외 없이 전부 판정:', `예외 ${sweep.threw}`, ok(sweep.threw === 0))
log('D2 ★ 이상 없음(엔딩없음/정복+union 공존 0):',
  sweep.problems.length === 0 ? '없음' : sweep.problems.join(' | '), ok(sweep.problems.length === 0))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 세이브 ===')
await page.evaluate(() => window.__queeningAi.setGame({
  flags: { commander_concubine: true, prince_conquered: true },
}))
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('E1 세이브 버전 유지:', saved.version, ok(saved.version === SAVE_VERSION))
log('E2 측실·정복 flag 보존:',
  ok(saved.state.flags.commander_concubine === true && saved.state.flags.prince_conquered === true))

log('')
log('G1 ★ 실제 AI 호출 0건:', `차단 ${blockedCalls().length}건`, ok(blockedCalls().length === 0))
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
