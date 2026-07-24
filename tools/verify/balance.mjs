/**
 * 밸런스 재설계 1단계 — 새 성장 곡선 실측.
 *
 * 묻는 것(사용자가 지정한 확인 항목 그대로):
 *   1) 20세 균형 빌드 5스탯 합계가 250~300 인가
 *   2) 특화 빌드는 한둘만 높고 나머지는 낮은가 (포기가 실제로 일어나는가)
 *   3) 초반 심신 수지가 정말 1수업/월을 강제하는가
 *   4) 의심 관리에 놀이 칸이 실제로 쓰이는가
 *   5) 신뢰·섭정 신망이 나이 상한에 눌려 과속하지 않는가
 *
 * 실제 UI 를 클릭해 108개월을 플레이한다(계산이 아니라 실측).
 *   node tools/verify/balance.mjs          전체
 *   node tools/verify/balance.mjs BAL      한 빌드만
 */
import {
  APP_URL, advanceScene, choiceButtons, clickCard, enterGame, launch, ok, phaseOf, readPanel,
} from './helpers.mjs'

const LESSON = {
  통치학: '통치학 수업',
  재정: '국고 장부 열람',
  변론: '문답 훈련',
  무예: '검술 훈련',
  궁정처세: '연회 참석',
}
const ALL_STATS = Object.keys(LESSON)

/** 되돌릴 수 없는 갈래는 시뮬 기본값(첫 선택지)이 강행이라 명시적으로 물러난다. */
const CHOICES = [
  [/가문 수색/, /물러난다/],
  [/숙부의 처분/, /그대로 둔다/],
]

const BUILDS = [
  {
    key: 'BAL',
    name: '균형 — 매달 가장 낮은 스탯을 민다 (다섯 다 키우려는 플레이)',
    pick: (s) => [...ALL_STATS].sort((a, b) => (s[a] ?? 0) - (s[b] ?? 0))[0],
  },
  {
    key: 'SPEC2',
    name: '2특화 — 통치학·궁정처세만 민다',
    pick: (s) => (['통치학', '궁정처세'].sort((a, b) => (s[a] ?? 0) - (s[b] ?? 0)))[0],
  },
  {
    key: 'SPILL',
    name: '특화(현실형) — 우선순위대로 밀고, 상한에 닿으면 다음으로 넘어간다',
    pick: (s) => ['통치학', '궁정처세', '변론', '재정', '무예'].find((k) => (s[k] ?? 0) < 100) ?? '통치학',
  },
  {
    key: 'SPEC1',
    name: '1특화 — 통치학만 민다',
    pick: () => '통치학',
  },
  {
    key: 'PUSH',
    name: '무리형 — 놀이 없이 매달 수업 2 + 휴식 1 (심신 수지 확인용)',
    pick: (s) => [...ALL_STATS].sort((a, b) => (s[a] ?? 0) - (s[b] ?? 0))[0],
    noPlay: true,
    forceTwoLessons: true,
  },
]

/**
 * 관리형 플레이어의 한 달.
 *   심신이 낮으면 쉬고, 의심이 높으면 논다. 남는 칸으로 공부한다.
 * 이 우선순위 자체가 "칸 경쟁"이 실제로 작동하는지를 드러낸다 —
 * 강제로 수업 수를 정하지 않고, 수지에 따라 알아서 줄어들게 둔다.
 */
function planTurn(panel, build, tally) {
  const s = panel.stats
  const wellbeing = s['심신'] ?? 100
  const suspicion = s['섭정 의심'] ?? 0
  const plan = []
  let ap = 3
  const push = (name, kind) => {
    if (ap < 1) return false
    plan.push(name)
    ap -= 1
    tally[kind] = (tally[kind] ?? 0) + 1
    return true
  }

  if (build.forceTwoLessons) {
    // 무리형: 수지를 무시하고 매달 수업 2 + 휴식 1 을 고집한다.
    for (let i = 0; i < 2; i++) {
      const stat = build.pick(s)
      push(LESSON[stat], 'lesson')
      s[stat] = (s[stat] ?? 0) + 6 // 같은 턴 중복 방지용 근사
    }
    push('휴식', 'rest')
    return plan
  }

  if (wellbeing < 18) { push('휴식', 'rest'); push('휴식', 'rest') }
  else if (wellbeing < 40) push('휴식', 'rest')

  if (!build.noPlay && suspicion >= 55) push('놀이', 'play')

  while (ap >= 1) {
    // 심신이 빠듯하면 수업 대신 회복으로 돌린다 — 이게 "1수업/월 강제"의 실체다.
    // ★ 회복은 휴식으로 한다. 놀이는 위의 의심 관리 분기에서만 쓴다 —
    //   그래야 "놀이 칸이 의심 때문에 쓰였는가"가 측정 가능해진다.
    if (wellbeing - 14 * (tally.__lessonThisTurn ?? 0) < 30 && (tally.__lessonThisTurn ?? 0) >= 1) {
      push('휴식', 'rest')
      continue
    }
    const stat = build.pick(s)
    push(LESSON[stat], 'lesson')
    tally.__lessonThisTurn = (tally.__lessonThisTurn ?? 0) + 1
    s[stat] = (s[stat] ?? 0) + 6
  }
  tally.__lessonThisTurn = 0
  return plan
}

async function run(browser, build) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await enterGame(page)
  // 성장 곡선은 소소 채널을 켠 실제 플레이 조건에서 잰다.
  await page.evaluate(() => window.__queeningAi.setMinorEnabled(true))
  await page.evaluate(() => window.__queeningAi.setDeterministic(true))
  await page.waitForTimeout(200)

  const tally = {}
  const yearly = []
  const monthly = []
  let turns = 0
  let minWellbeing = 100
  let maxSuspicion = 0
  let lastAge = 11

  while (turns < 320) {
    const phase = await phaseOf(page)
    if (phase === 'ended') break

    if (phase === 'schedule') {
      const panel = await readPanel(page)
      const age = parseInt((panel.age.match(/(\d+)세/) ?? [])[1] ?? '11', 10)
      const wb = panel.stats['심신'] ?? 100
      minWellbeing = Math.min(minWellbeing, wb)
      maxSuspicion = Math.max(maxSuspicion, panel.stats['섭정 의심'] ?? 0)
      if (age !== lastAge || turns === 0) {
        // ★ 패널 라벨에 의존하지 않고 상태에서 직접 읽는다(라벨이 바뀌면 조용히 undefined 가 된다).
        const g = await page.evaluate(() => {
          const s = window.__queeningAi.state
          return { stats: s.stats, wellbeing: s.wellbeing, tutorTrust: s.tutorTrust,
            regentSuspicion: s.regentSuspicion, regentRapport: s.regentRapport,
            courtInfluence: s.courtInfluence, durability: s.durability }
        })
        const K = { 통치학: 'statecraft', 재정: 'finance', 변론: 'rhetoric', 무예: 'martial', 궁정처세: 'courtcraft' }
        const stats = Object.fromEntries(ALL_STATS.map((k) => [k, Math.round(g.stats[K[k]])]))
        yearly.push({ age, sum: Object.values(stats).reduce((a, x) => a + x, 0), stats,
          심신: Math.round(g.wellbeing), 의심: Math.round(g.regentSuspicion),
          신뢰: Math.round(g.tutorTrust), 신망: Math.round(g.regentRapport),
          영향도: Math.round(g.courtInfluence), 내구도: Math.round(g.durability),
          lessons: tally.lesson ?? 0, plays: tally.play ?? 0 })
        lastAge = age
      }
      const before = { ...tally }
      const plan = planTurn(panel, build, tally)
      if (turns < 24) monthly.push({ t: turns, wb, plan: plan.join('+') })
      void before
      for (const name of plan) await clickCard(page, name)
      await page.getByRole('button', { name: /턴 종료/ }).click()
      await page.waitForTimeout(55)
      turns++
      continue
    }

    if (phase === 'result') {
      await page.getByRole('button', { name: /다음 달로|무슨 일이/ }).click()
      await page.waitForTimeout(55)
      continue
    }

    if (phase === 'event') {
      await advanceScene(page)
      const title = await page.locator('[data-event-title]').innerText().catch(() => '')
      const choices = choiceButtons(page)
      const count = await choices.count()
      if (count > 0) {
        const pref = CHOICES.find(([t]) => t.test(title))
        let target = null
        if (pref) {
          const cand = choices.filter({ hasText: pref[1] })
          if ((await cand.count()) > 0 && (await cand.first().isEnabled())) target = cand.first()
        }
        if (!target) {
          for (let i = 0; i < count; i++) {
            if (await choices.nth(i).isEnabled()) { target = choices.nth(i); break }
          }
        }
        if (target) { await target.click(); await page.waitForTimeout(55) }
      }
      await page.getByRole('button', { name: /다음 달로|계속/ }).click()
      await page.waitForTimeout(55)
      continue
    }
    break
  }

  const ended = (await phaseOf(page)) === 'ended'
  const final = await page.evaluate(() => {
    // 데드엔딩/엔딩 화면에서 브릿지가 사라져 있을 수 있다 — 저장본으로 대체한다.
    const g = window.__queeningAi?.state
      ?? JSON.parse(localStorage.getItem('queening.save') ?? '{"state":{}}').state
    return { stats: g.stats, age: g.age, wellbeing: g.wellbeing, tutorTrust: g.tutorTrust,
      regentSuspicion: g.regentSuspicion, regentRapport: g.regentRapport,
      courtInfluence: g.courtInfluence, durability: g.durability,
      dead: Object.keys(g.flags).filter((f) => f.startsWith('dead_end')) }
  })
  await ctx.close()
  return { tally, yearly, monthly, turns, ended, final, errors, minWellbeing, maxSuspicion }
}

const browser = await launch()
const only = process.argv[2]
const results = []
for (const build of BUILDS.filter((b) => !only || b.key === only)) {
  console.log('\n' + '='.repeat(72))
  console.log(`${build.key}. ${build.name}`)
  console.log('='.repeat(72))
  const r = await run(browser, build)
  results.push({ build, r })

  console.log(`턴 ${r.turns} | 종료 도달 ${ok(r.ended)} | 최저 심신 ${r.minWellbeing} | 최고 의심 ${r.maxSuspicion}`)
  if (r.final.dead.length) console.log('*** 조기 데드엔딩:', r.final.dead.join(', '))
  console.log('칸 사용:', `수업 ${r.tally.lesson ?? 0} · 휴식 ${r.tally.rest ?? 0} · 놀이 ${r.tally.play ?? 0}`)
  console.log('\n  나이별 (5스탯 합계 / 각 스탯)')
  let prevL = 0, prevP = 0
  for (const y of r.yearly) {
    const per = ALL_STATS.map((k) => `${k[0]}${String(y.stats[k]).padStart(3)}`).join(' ')
    const dl = y.lessons - prevL, dp = y.plays - prevP
    prevL = y.lessons; prevP = y.plays
    console.log(`   ${String(y.age).padStart(2)}세  합 ${String(y.sum).padStart(3)} | ${per} | 심신 ${String(y.심신).padStart(3)} 의심 ${String(y.의심).padStart(3)} 신뢰 ${String(y.신뢰).padStart(3)} 신망 ${String(y.신망).padStart(3)} 영향도 ${String(y.영향도).padStart(3)} 내구 ${String(y.내구도).padStart(2)} | 직전 1년 수업 ${String(dl).padStart(2)} 놀이 ${String(dp).padStart(2)}`)
  }
  const sum = ALL_STATS.reduce((a, k) => a + Math.round(r.final.stats[
    { 통치학: 'statecraft', 재정: 'finance', 변론: 'rhetoric', 무예: 'martial', 궁정처세: 'courtcraft' }[k]
  ] ?? 0), 0)
  console.log(`\n  최종(${r.final.age}세) 5스탯 합계: ${sum}`,
    build.key === 'BAL' ? `  목표 250~300  ${ok(sum >= 250 && sum <= 300)}` : '')
  console.log('  최종 스탯:', JSON.stringify(r.final.stats))
  console.log(`  신뢰 ${r.final.tutorTrust} 의심 ${r.final.regentSuspicion} 신망 ${r.final.regentRapport} 영향도 ${r.final.courtInfluence} 내구도 ${Math.round(r.final.durability)}`)
  console.log('  초반 24개월 계획(심신):')
  console.log('   ' + r.monthly.map((m) => `${m.t}:${m.wb}(${m.plan})`).join('  '))
  if (r.errors.length) console.log('*** 런타임 에러:', r.errors.join(' | '))
}

console.log('\n' + '='.repeat(72))
console.log('요약')
for (const { build, r } of results) {
  const s = r.final.stats
  const vals = [s.statecraft, s.finance, s.rhetoric, s.martial, s.courtcraft].map(Math.round)
  console.log(`  ${build.key.padEnd(6)} 합계 ${String(vals.reduce((a, b) => a + b, 0)).padStart(3)}  [${vals.join(', ')}]  놀이 ${r.tally.play ?? 0}칸`)
}
await browser.close()
