// M3-2 엔딩 씬 조립 검증.
//
// ★ M3-1 이 "판정 빠짐없음"이었다면 M3-2 는 "조립 빠짐없음"이다.
//   무작위 1만 세이브를 조립기에 넣어, 모든 EndingResult 가
//   빈 씬·anchor 미스매치·토큰 미치환 없이 텍스트로 조립되는지 본다.
import { APP_URL, blockAiNetwork, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ending-scene')
const TRIALS = 10000

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
const blockedCalls = await blockAiNetwork(page)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const buildFor = (state) => page.evaluate((s) => window.__queeningAi.buildEndingScene(s), state)
// ★ 토큰은 씬을 조립한 **그 상태**로 치환해야 한다 — 현재 게임(남성)이 아니라.
const resolveWith = (text, state) =>
  page.evaluate(([t, s]) => window.__queeningAi.resolveWith(t, s), [text, state])

const base = (patch = {}) => ({
  stats: { statecraft: 0, finance: 0, rhetoric: 0, martial: 0, courtcraft: 0 },
  wellbeing: 50, tutorTrust: 50, regentSuspicion: 0, regentRapport: 0,
  courtInfluence: 0, affection: {}, flags: {}, counters: {}, monarchGender: 'male',
  ...patch,
})

// ─────────────────────────────────────────────────────────────
log('=== A. ★★ 조립 완전성 — 무작위 세이브 ' + TRIALS.toLocaleString() + '개 ===')
log('')

const sweep = await page.evaluate((trials) => {
  const FLAGS = [
    'queen_poison_path', 'queen_poison_averted', 'military_route_open', 'union_possible',
    'truth_regent_involved', 'truth_mother_mastermind', 'blood_oath_complete',
    'blood_oath_given', 'blood_oath_seized', 'tyrant_purge', 'just_purge', 'regent_alliance',
    'house_commons_defended', 'house_commons_dissolved', 'scroll_offered',
    'legitimacy_sacred', 'church_support',
  ]
  const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']
  const rand = (n) => Math.floor(Math.random() * n)

  const skeletonCount = {}
  const problems = []
  let emptyScene = 0
  let unresolvedToken = 0
  let threw = 0

  for (let i = 0; i < trials; i++) {
    const flags = {}
    for (const f of FLAGS) if (Math.random() < 0.5) flags[f] = true
    const affection = {}
    for (const c of CHARS) affection[c] = rand(101)
    const state = {
      stats: {
        statecraft: rand(101), finance: rand(101), rhetoric: rand(101),
        martial: rand(101), courtcraft: rand(101),
      },
      wellbeing: rand(101), tutorTrust: rand(101),
      regentSuspicion: rand(101), regentRapport: rand(101), courtInfluence: rand(101),
      affection, flags, counters: {}, monarchGender: Math.random() < 0.5 ? 'male' : 'female',
    }

    let out
    try {
      out = window.__queeningAi.buildEndingScene(state)
    } catch (e) {
      threw++
      if (problems.length < 3) problems.push('예외: ' + String(e))
      continue
    }

    const scene = out.scene
    if (!scene || !Array.isArray(scene.lines) || scene.lines.length === 0) {
      emptyScene++
      if (problems.length < 5) problems.push('빈 씬: ' + JSON.stringify(out.result.tier))
      continue
    }

    // 토큰 치환 후에도 {…} 가 남아 있으면 anchor/토큰 미스매치다.
    const text = scene.lines.map((l) => window.__queeningAi.resolveWith(l.text, state)).join('\n')
    if (/\{[^}]+\}/.test(text)) {
      unresolvedToken++
      if (problems.length < 5) problems.push('미치환 토큰: ' + (text.match(/\{[^}]+\}/) ?? [])[0])
    }

    skeletonCount[out.skeletonId] = (skeletonCount[out.skeletonId] ?? 0) + 1
  }

  return { skeletonCount, problems, emptyScene, unresolvedToken, threw }
}, TRIALS)

const total = Object.values(sweep.skeletonCount).reduce((a, b) => a + b, 0)
log('   골격 분포:')
for (const [k, v] of Object.entries(sweep.skeletonCount).sort((a, b) => b[1] - a[1])) {
  log(`     ${k.padEnd(20)} ${String(v).padStart(5)}  ${((v / total) * 100).toFixed(1)}%`)
}
log('')
log('A1 ★ 예외 없이 전부 조립됨:', `${total + sweep.threw} 중 예외 ${sweep.threw}`,
  ok(sweep.threw === 0))
log('A2 ★ 빈 씬 0건:', sweep.emptyScene, ok(sweep.emptyScene === 0))
log('A3 ★ 미치환 토큰 0건 (anchor·토큰 미스매치 없음):', sweep.unresolvedToken,
  ok(sweep.unresolvedToken === 0))
log('A4 catch-all 이 실질을 거의 안 받음 (골격이 제대로 매칭):',
  `${sweep.skeletonCount['catch-all'] ?? 0}건`,
  ok((sweep.skeletonCount['catch-all'] ?? 0) === 0))
if (sweep.problems.length) {
  log('   문제 표본:')
  for (const p of sweep.problems) log('     · ' + p)
}

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★ 전용 삽입이 실제로 뜨는가 ===')

async function sceneText(state) {
  const out = await buildFor(state)
  const parts = []
  for (const l of out.scene.lines) parts.push(await resolveWith(l.text, state))
  return { skeleton: out.skeletonId, text: parts.join('\n'), result: out.result }
}

// A빌드 비극 — 모후주모 + 못함
const tragic = await sceneText(base({
  courtInfluence: 55,
  flags: { truth_mother_mastermind: true, truth_regent_involved: true },
}))
log('B1 ★ A빌드 비극 전용 (모후주모 + 못함):',
  ok(tragic.text.includes('가장 무거운 침묵은')))
log('   골격:', tragic.skeleton, '| 판정:', tragic.result.tier, '/', tragic.result.disposal)

// given vs seized
const given = await sceneText(base({
  courtInfluence: 75, affection: { heir: 80, loyalist: 0, prince: 0, commander: 0, hero: 0 },
  flags: { blood_oath_given: true },
}))
const seized = await sceneText(base({
  courtInfluence: 75, affection: { heir: 80, loyalist: 0, prince: 0, commander: 0, hero: 0 },
  flags: { blood_oath_seized: true },
}))
log('B2 ★ given (연인의 희생):', ok(given.text.includes('제 손으로')))
log('B3 ★ seized (정복의 전리품):', ok(seized.text.includes('사랑인지 전리품인지')))
log('B4 ★ 같은 heir 인데 뉘앙스가 갈림:', ok(given.text !== seized.text))

// poison averted
const averted = await sceneText(base({
  courtInfluence: 75, flags: { queen_poison_path: true, queen_poison_averted: true },
}))
log('B5 ★ poison 회피 흔적:', ok(averted.text.includes('찻잔을 앞에 두고 손이 멈춘')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. 대표 골격이 실제 텍스트인가 (플레이스홀더 아님) ===')
const autonomy = await sceneText(base({ courtInfluence: 80 }))
log('C1 친정 골격:', ok(autonomy.text.includes('대신해 서명하지 않는다')))
const puppet = await sceneText(base({ courtInfluence: 10 }))
log('C2 허수아비 골격:', ok(puppet.text.includes('나라를 움직이는 손은 다른 곳')))
const tyrant = await sceneText(base({ courtInfluence: 80, flags: { tyrant_purge: true } }))
log('C3 폭군 골격 (tier 가로채기):', tyrant.skeleton,
  ok(tyrant.skeleton === 'tyrant' && tyrant.text.includes('물어서 답이 없을 것')))

// nation 복수 삽입
const manyNation = await sceneText(base({
  courtInfluence: 80,
  flags: {
    union_possible: true, military_route_open: true, scroll_offered: true,
    house_commons_defended: true,
    finance: 100,
  },
  stats: { statecraft: 0, finance: 100, rhetoric: 0, martial: 100, courtcraft: 0 },
}))
log('C4 ★ 나라 향방 복수 삽입 (union+military+scroll+commons 연속):',
  ok(manyNation.text.includes('대등한 자리') && manyNation.text.includes('군은') &&
     manyNation.text.includes('축문') && manyNation.text.includes('하원은 살아남았다')))

// 철인통치
const solo = await sceneText(base({ courtInfluence: 80 }))
log('C5 철인통치 (romance none):', ok(solo.text.includes('곁에 선 사람은 없었다')))

// 여왕 토큰
const queen = await sceneText(base({ courtInfluence: 80, monarchGender: 'female' }))
log('C6 여왕도 토큰 치환 정상 (여왕/그녀):',
  ok(!/\{/.test(queen.text) && queen.text.includes('여왕')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ★ 마지막 턴 — 확률 이벤트 차단 (M3-pending 회수) ===')
const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const triggerable = (patch) =>
  page.evaluate((p) => { window.__queeningAi.setGame(p); return window.__queeningAi.triggerable() }, patch)

// 키를 넣어 돌발·③등장이 후보가 될 수 있는 상태로 만든다.
await page.evaluate(() => window.__queeningAi.configure('anthropic', 'sk-ant-fake-000'))

const midGame = await triggerable({
  age: 17, date: { year: 6, season: 'summer' },
  flags: { romance_unlocked: true }, counters: {},
})
const atEnd = await triggerable({
  age: 21, date: { year: 10, season: 'spring' },
  flags: { romance_unlocked: true }, counters: {},
})
const hasChance = (ids) => ids.some((id) => id.startsWith('ai-incident') || id === 'prince-arrival')
log('D0a 게임 중(17세)엔 확률 이벤트가 후보에 있음:', ok(hasChance(midGame)))
log('D0b ★ 20세를 넘긴 마지막 턴(21세)엔 확률 이벤트가 후보에서 빠짐:',
  atEnd.filter((id) => id.startsWith('ai-incident') || id === 'prince-arrival').join(', ') || '없음',
  ok(!hasChance(atEnd)))

// 진행 중이던 체류의 퇴장씬(확률 없음)은 마지막 턴에도 정상 발동해야 한다.
const departureAtEnd = await triggerable({
  age: 21, date: { year: 10, season: 'spring' },
  flags: { romance_unlocked: true, prince_present: true },
  counters: { prince_stay: 0 },
})
log('D0c ★ 확률 없는 퇴장씬은 마지막 턴에도 발동 (진행 중 체류는 정리):',
  ok(departureAtEnd.includes('prince-departure')))
await page.evaluate(() => window.__queeningAi.clearKey())

log('')
log('D1 ★ 실제 AI 호출 0건 (엔딩은 키 없이 동작):',
  `차단 ${blockedCalls().length}건`, ok(blockedCalls().length === 0))
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
