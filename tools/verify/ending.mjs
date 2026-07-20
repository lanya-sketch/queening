// M3-1 엔딩 판정 검증.
//
// ★ A 절이 핵심이다 — **완전성**.
//   빌드 몇 개를 돌려서는 "모든 세이브가 하나로 수렴한다"를 증명할 수 없다.
//   무작위 세이브 1만 개를 만들어 전부 판정에 넣고, 예외 없이 정확히 하나의
//   결과가 나오는지 본다. 빌드 시뮬은 **현실적인** 세이브를 덮고,
//   무작위 시행은 **빠짐없음**을 덮는다. 서로 다른 것을 증명한다.
import { APP_URL, blockAiNetwork, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('ending')
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

const judge = (state) => page.evaluate((s) => window.__queeningAi.judgeEnding(s), state)
const T = await page.evaluate(() => window.__queeningAi.endingThresholds())

/** 판정에 쓰이는 최소 상태. 나머지 필드는 판정이 읽지 않는다. */
const base = (patch = {}) => ({
  stats: { statecraft: 0, finance: 0, rhetoric: 0, martial: 0, courtcraft: 0 },
  wellbeing: 50, tutorTrust: 50, regentSuspicion: 0, regentRapport: 0,
  courtInfluence: 0, affection: {}, flags: {}, counters: {},
  ...patch,
})

// ─────────────────────────────────────────────────────────────
log('=== A. ★★ 완전성 — 무작위 세이브 ' + TRIALS.toLocaleString() + '개 전수 시행 ===')
log('')

const sweep = await page.evaluate((trials) => {
  const TIERS = ['친정', '공존', '허수아비', '배드:꼭두각시', '배드:군부종속', '배드:제국복속']
  const DISPOSALS = ['정당', '폭군', '회유', '못함']
  const TRUTHS = ['모름', '섭정관여', '모후주모']
  // 판정이 읽는 flag 를 전부 무작위로 켜고 끈다.
  const FLAGS = [
    'queen_poison_path', 'queen_poison_averted', 'military_route_open', 'union_possible',
    'truth_regent_involved', 'truth_mother_mastermind', 'blood_oath_complete',
    'blood_oath_given', 'blood_oath_seized', 'tyrant_purge', 'regent_alliance',
    'house_commons_defended', 'house_commons_dissolved', 'scroll_offered',
    'legitimacy_sacred', 'church_support', 'regent_disposed', 'just_purge',
    // 판정이 읽지 않아야 하는 것들도 섞는다 — 섞여도 결과가 흔들리면 안 된다
    'clue_sealed_report', 'people_burdened_harvest', 'prince_present',
  ]
  const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']

  const tierCount = {}
  const disposalCount = {}
  const problems = []
  let threw = 0

  const rand = (n) => Math.floor(Math.random() * n)

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
      regentSuspicion: rand(101), regentRapport: rand(101),
      courtInfluence: rand(101),
      affection, flags, counters: {},
    }

    let result
    try {
      result = window.__queeningAi.judgeEnding(state)
    } catch (e) {
      threw++
      if (problems.length < 3) problems.push('예외: ' + String(e))
      continue
    }

    if (!result) { problems.push('null 반환'); continue }
    if (!TIERS.includes(result.tier)) problems.push('알 수 없는 tier: ' + result.tier)
    if (!DISPOSALS.includes(result.disposal)) problems.push('알 수 없는 disposal: ' + result.disposal)
    if (!TRUTHS.includes(result.truthLevel)) problems.push('알 수 없는 truthLevel: ' + result.truthLevel)

    // 결정론 — 같은 입력은 같은 출력
    const again = window.__queeningAi.judgeEnding(state)
    if (JSON.stringify(again) !== JSON.stringify(result)) {
      problems.push('같은 입력이 다른 결과를 냄')
    }

    tierCount[result.tier] = (tierCount[result.tier] ?? 0) + 1
    disposalCount[result.disposal] = (disposalCount[result.disposal] ?? 0) + 1
  }

  return { tierCount, disposalCount, problems: problems.slice(0, 5), threw }
}, TRIALS)

const total = Object.values(sweep.tierCount).reduce((a, b) => a + b, 0)
log('   tier 분포:')
for (const [k, v] of Object.entries(sweep.tierCount).sort((a, b) => b[1] - a[1])) {
  log(`     ${k.padEnd(14)} ${String(v).padStart(5)}  ${((v / total) * 100).toFixed(1)}%`)
}
log('   disposal 분포:')
for (const [k, v] of Object.entries(sweep.disposalCount).sort((a, b) => b[1] - a[1])) {
  log(`     ${k.padEnd(14)} ${String(v).padStart(5)}  ${((v / total) * 100).toFixed(1)}%`)
}
log('')
log('A1 ★ 예외 없이 전부 판정됨:', `${total} / ${TRIALS}`, ok(total === TRIALS && sweep.threw === 0))
log('A2 ★ "엔딩 없음" 0건 — 모든 세이브가 정확히 하나로 수렴:',
  sweep.problems.length === 0 ? '문제 없음' : sweep.problems.join(' | '),
  ok(sweep.problems.length === 0))
log('A3 ★ 여섯 tier 가 모두 실제로 도달 가능:',
  `${Object.keys(sweep.tierCount).length} / 6`,
  ok(Object.keys(sweep.tierCount).length === 6))
log('A4 ★ 네 disposal 이 모두 도달 가능:',
  `${Object.keys(sweep.disposalCount).length} / 4`,
  ok(Object.keys(sweep.disposalCount).length === 4))
log('A5 ★ 같은 세이브는 항상 같은 엔딩 (판정에 난수 없음):',
  ok(!sweep.problems.some((p) => p.includes('다른 결과'))))

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. 임계값이 의도대로 가르는가 ===')

const tierAt = async (influence) => (await judge(base({ courtInfluence: influence }))).tier
log(`   영향도 ${T.autonomy - 1} → ${await tierAt(T.autonomy - 1)}`)
log(`   영향도 ${T.autonomy}     → ${await tierAt(T.autonomy)}`)
log(`   영향도 ${T.coexist - 1}  → ${await tierAt(T.coexist - 1)}`)
log(`   영향도 ${T.coexist}      → ${await tierAt(T.coexist)}`)
log('B1 ★ 친정 문턱이 정확히 가름:',
  ok((await tierAt(T.autonomy)) === '친정' && (await tierAt(T.autonomy - 1)) === '공존'))
log('B2 ★ 공존 아래는 허수아비:',
  ok((await tierAt(T.coexist)) === '공존' && (await tierAt(T.coexist - 1)) === '허수아비'))
const totalPuppet = await judge(base({ courtInfluence: T.puppetTotal }))
log('B3 완전 허수아비 수식:', JSON.stringify(totalPuppet.modifiers),
  ok(totalPuppet.modifiers.includes('허수아비:완전')))

// 국력 — 결합 판정
const unionAt = async (power) =>
  judge(base({
    flags: { union_possible: true },
    stats: { statecraft: 0, finance: power, rhetoric: 0, martial: 0, courtcraft: 0 },
    courtInfluence: 0,
  }))
const belowReprieve = await unionAt(T.unionReprieve - 1)
const atReprieve = await unionAt(T.unionReprieve)
const atEqual = await unionAt(T.unionEqual)
log('')
log(`   국력 ${T.unionReprieve - 1} → ${belowReprieve.tier}`)
log(`   국력 ${T.unionReprieve}   → ${atReprieve.tier} (유예: ${atReprieve.reprieve.from})`)
log(`   국력 ${T.unionEqual}   → ${atEqual.tier} ${JSON.stringify(atEqual.nationFlags)}`)
log('B4 ★ 국력이 낮으면 복속:', ok(belowReprieve.tier === '배드:제국복속'))
log('B5 ★ 유예선을 넘으면 대등으로 전환:',
  ok(atReprieve.tier !== '배드:제국복속' && atReprieve.nationFlags.includes('union_equal')))
log('B6 ★ 애초에 국력이 충분하면 유예를 쓰지 않음:',
  ok(atEqual.nationFlags.includes('union_equal') && !atEqual.reprieve.used))

// 군부
const juntaAt = async (influence) =>
  judge(base({ flags: { military_route_open: true }, courtInfluence: influence }))
const juntaBad = await juntaAt(T.juntaReprieve - 1)
const juntaSaved = await juntaAt(T.juntaReprieve)
const juntaSafe = await juntaAt(T.juntaSafe)
log('')
log(`   영향도 ${T.juntaReprieve - 1} → ${juntaBad.tier}`)
log(`   영향도 ${T.juntaReprieve}   → ${juntaSaved.tier} (유예: ${juntaSaved.reprieve.from})`)
log(`   영향도 ${T.juntaSafe}   → ${juntaSafe.tier} ${JSON.stringify(juntaSafe.nationFlags)}`)
log('B7 ★ 실권이 낮으면 군부 종속:', ok(juntaBad.tier === '배드:군부종속'))
log('B8 ★ 유예선에서 왕 주도로 전환:',
  ok(juntaSaved.nationFlags.includes('military_king_led')))
log('B9 ★ 실권이 충분하면 애초에 위기가 아님:',
  ok(juntaSafe.tier === '친정' && !juntaSafe.reprieve.used))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. ★ 배드가 실권보다 우선 ===')
const richButJunta = await judge(base({
  courtInfluence: 65, flags: { military_route_open: true },
  stats: { statecraft: 90, finance: 90, rhetoric: 90, martial: 90, courtcraft: 20 },
  wellbeing: 20,
}))
log('C1 영향도 65 + 군부 + 유예 게이트(55) 통과 → 유예로 살아남음:',
  `${richButJunta.tier} (유예: ${richButJunta.reprieve.from})`,
  ok(richButJunta.tier === '공존'))

const poorAndJunta = await judge(base({
  courtInfluence: 50, flags: { military_route_open: true },
}))
log('C2 영향도 50 → 유예 게이트 미달 → 배드:', poorAndJunta.tier,
  ok(poorAndJunta.tier === '배드:군부종속'))

// ★ 유예는 총 1회 — 두 위기가 겹치면 하나만 빠져나간다
const twoCrises = await judge(base({
  courtInfluence: 60,
  wellbeing: 80, // poison 유예 게이트 통과
  flags: { queen_poison_path: true, military_route_open: true },
}))
log('C3 ★ 두 위기가 겹치면 유예는 하나만:',
  `${twoCrises.tier} (유예: ${twoCrises.reprieve.from})`,
  ok(twoCrises.reprieve.used && twoCrises.tier === '배드:군부종속'))
log('   → 모후의 약은 면했지만(먼저 검사), 군부는 못 면했다.')

const poisonAverted = await judge(base({
  courtInfluence: 80,
  flags: { queen_poison_path: true, queen_poison_averted: true },
}))
log('C4 플레이 중 독을 알아챘으면 애초에 위기가 아님:',
  poisonAverted.tier, ok(poisonAverted.tier === '친정'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ★ 처분 — 폭군이 새 지표 없이 조합으로 판정되는가 ===')
const just = await judge(base({
  courtInfluence: 80,
  flags: { truth_mother_mastermind: true, blood_oath_complete: true, just_purge: true },
}))
log('D1 진실 + 확증 + 실제 처분 → 정당:', just.disposal, ok(just.disposal === '정당'))

/**
 * ★ D1b 는 시뮬이 잡은 결함을 고정한다.
 *   진실과 확증을 다 쥐고도 「그대로 둔다」를 고른 군주는 처분한 것이 아니다.
 *   처음 구현은 조건만 보고 '정당'으로 판정했고, H 빌드가 실제로 그렇게 기록됐다.
 */
const declined = await judge(base({
  courtInfluence: 80,
  flags: { truth_mother_mastermind: true, blood_oath_complete: true },
}))
log('D1b ★ 증거를 쥐고도 처분하지 않았으면 "못함":', declined.disposal,
  ok(declined.disposal === '못함'))

const tyrant = await judge(base({
  courtInfluence: 80, flags: { tyrant_purge: true },
}))
log('D2 진실 없이 처분 → 폭군:', tyrant.disposal, ok(tyrant.disposal === '폭군'))
log('D3 ★ 폭정 수식 = tyrant_purge × 영향도 ≥ 70 × 회유 아님:',
  JSON.stringify(tyrant.modifiers), ok(tyrant.modifiers.includes('폭정')))

const weakTyrant = await judge(base({
  courtInfluence: 50, flags: { tyrant_purge: true },
}))
log('D4 ★ 같은 flag 라도 실권이 낮으면 "폭정"이 아님 (조합 판정의 증거):',
  `${weakTyrant.disposal} / ${JSON.stringify(weakTyrant.modifiers)}`,
  ok(weakTyrant.disposal === '폭군' && !weakTyrant.modifiers.includes('폭정')))

const alliedTyrant = await judge(base({
  courtInfluence: 80, flags: { tyrant_purge: true, regent_alliance: true },
}))
log('D5 ★ 회유 중이면 폭정이 아님:',
  JSON.stringify(alliedTyrant.modifiers), ok(!alliedTyrant.modifiers.includes('폭정')))

const allied = await judge(base({ courtInfluence: 50, flags: { regent_alliance: true } }))
log('D6 동맹 → 회유:', allied.disposal, ok(allied.disposal === '회유'))
const nothing = await judge(base({ courtInfluence: 30 }))
log('D7 아무것도 없으면 못함 (catch-all):', nothing.disposal, ok(nothing.disposal === '못함'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 수식 수집 ===')
const distrust = await judge(base({
  courtInfluence: 50, regentSuspicion: T.distrust,
  flags: { regent_alliance: true },
}))
log('E1 ★ 불신의 공치 (동맹 + 높은 의심) — M-콘텐츠 미결 회수:',
  JSON.stringify(distrust.modifiers), ok(distrust.modifiers.includes('불신의 공치')))

const given = await judge(base({ courtInfluence: 50, flags: { blood_oath_given: true } }))
const seized = await judge(base({ courtInfluence: 50, flags: { blood_oath_seized: true } }))
log('E2 ★ 같은 물건을 얻은 방식이 구분됨:',
  `${given.modifiers} vs ${seized.modifiers}`,
  ok(given.modifiers.includes('연인의 희생') && seized.modifiers.includes('정복의 전리품')))

const romance = await judge(base({
  courtInfluence: 50, affection: { heir: 80, loyalist: 75, prince: 10, commander: 10, hero: 10 },
}))
log('E3 깊은 관계 중 최고치를 고름:', romance.romance, ok(romance.romance === 'heir'))
log('E4 복수의 인연 수식:', ok(romance.modifiers.includes('복수의 인연')))

const lonely = await judge(base({ courtInfluence: 80, flags: { tyrant_purge: true } }))
log('E5 폭군 + 인연 없음 → 고립:', ok(lonely.modifiers.includes('고립')))

const truthOnly = await judge(base({ courtInfluence: 50, flags: { truth_regent_involved: true } }))
log('E6 진실 깊이 수집:', truthOnly.truthLevel, ok(truthOnly.truthLevel === '섭정관여'))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. ★ 판정이 심어둔 flag 만 읽는가 ===')
// 판정과 무관한 flag 를 잔뜩 켜도 결과가 흔들리면 안 된다.
const clean = await judge(base({ courtInfluence: 55 }))
const noisy = await judge(base({
  courtInfluence: 55,
  flags: {
    clue_sealed_report: true, clue_witness_gone: true, clue_noble_ledger: true,
    people_burdened_harvest: true, prince_present: true, romance_unlocked: true,
    'event:debut-ball': true, hint_queen_chamber: true, chamber_attempted: true,
    commander_house_known: true, hero_at_court: true,
  },
  counters: { prince_stay: 2, '__pity:ai-incident-notice': 5 },
}))
log('F1 ★ 무관한 flag·카운터를 켜도 판정 불변:',
  ok(JSON.stringify(clean) === JSON.stringify(noisy)))
log(`   기준: ${clean.tier} / ${clean.disposal}`)
log(`   잡음: ${noisy.tier} / ${noisy.disposal}`)

log('')
log('G1 ★ 실제 AI 호출 0건:', `차단 ${blockedCalls().length}건`,
  ok(blockedCalls().length === 0))
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
