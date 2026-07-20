// 실제 UI를 클릭해 9년(40턴)을 플레이하는 시뮬레이터.
// 여러 육성 빌드가 각각 어떤 결말 상태(진실 도달 깊이, 섭정 관계, 국정 영향도)에
// 도달하는지 실측한다. 콘텐츠를 추가한 뒤 회귀 확인용.
//
//   node tools/verify/simulate.mjs        전체 빌드
//   node tools/verify/simulate.mjs D      머리글자가 D 인 빌드만
import {
  APP_URL, advanceScene, choiceButtons, launch, ok, phaseOf, readPanel, shotsDir,
} from './helpers.mjs'

const OUT = shotsDir('simulate')

const CEDE = '정무를 섭정공께 맡긴다'
const RECLAIM = '직접 재가한다'
const HUNT = '사냥 대회'

const STAT_TO_ACTIVITY = {
  통치학: '통치학 수업',
  재정: '국고 장부 열람',
  변론: '문답 훈련',
  무예: '검술 훈련',
  궁정처세: '연회 참석',
}

const COMMON_CHOICES = [
  [/덮인 밤/, /혼자 삼킨다/],
  [/어머니의 필적/, /아무에게도/],
  [/문서고의 밤/, /초안을 감춘다/],
  [/봉인된 기록/, /물러난다/],
]

const RUNS = [
  {
    name: 'A. 궁정처세 특화 (깊은 진실)',
    targets: { 궁정처세: 62, 통치학: 50, 변론: 60 },
    choices: [[/왕대비의 초대/, /아버지 이야기/]],
    expect: { deep: true, shallow: true },
  },
  {
    name: 'B. 무예·재정 특화 (얕은 진실까지)',
    targets: { 무예: 60, 재정: 55, 통치학: 46 },
    choices: [[/왕대비의 초대/, /아버지 이야기/]],
    expect: { deep: false, shallow: true },
  },
  {
    name: 'C. "예의만 갖춘다" (깊은 진실 차단)',
    targets: { 궁정처세: 62, 통치학: 50, 변론: 60 },
    choices: [[/왕대비의 초대/, /예의만/]],
    expect: { deep: false, shallow: true },
  },
  {
    // 연회를 유지하면서 맡기기로 의심을 관리 — "연회 포기 전용"에서 벗어났는지 확인
    name: 'D. 회유 루트 (연회 유지 + 맡기기로 의심 관리)',
    targets: { 궁정처세: 55, 통치학: 45 },
    cedeOver: 25,
    choices: [
      [/왕대비의 초대/, /예의만/],
      [/문서고의 밤/, /섭정공에게 보인다/],
      [/성년식/, /공동 통치/],
      [/첫 친정/, /인사를 개편/],
      [/귀족들의 견제/, /한발 굽히/],
      [/섭정공과의 담판/, /손을 잡는다/],
    ],
    // 궁정처세를 버린 빌드가 아니므로 단서는 모이지만, 이 런의 목표는 회유 성사 자체.
    expect: { accord: true },
  },
  {
    // 15세까지 무조건 넘기기만 → 이후 회복 가능한지 (함정 빌드 확인)
    name: 'E. 함정 빌드 (15세까지 맡기기만, 이후 회복 시도)',
    targets: { 통치학: 60 },
    trapUntilAge: 15,
    reclaim: true,
    choices: [[/성년식/, /친정을 선포/], [/첫 친정/, /인사를 개편|국고|군제/]],
    expect: {},
  },
  {
    // 실권 극대화 — 20세 상한 대비 실제 도달선을 잰다 (친정 엔딩 문턱 설계용)
    name: 'F. 실권 극대화 (친정 엔딩 문턱 측정)',
    targets: { 통치학: 60 },
    reclaim: true,
    choices: [
      [/성년식/, /친정을 선포/],
      [/첫 친정/, /인사를 개편|국고|군제/],
      [/귀족들의 견제/, /정면으로 반박/],
      [/국고의 장부/, /밝히게/],
    ],
    expect: {},
  },
  {
    /**
     * ★ M2b-3b-3 밸런스 실측 전용 빌드.
     *
     * D(회유 루트)와 정책을 똑같이 두고 **사냥 대회로 의심을 낮추는 것만** 다르게 한다.
     * 물어야 할 것은 하나다: 새 활동이 의심 감소의 지름길이 되어
     * 회유를 거저 만들어 주는가? D 와 나란히 놓고 비교하는 게 유일한 답이다.
     */
    name: 'G. 회유 루트 + 사냥 남용 (사냥 밸런스 실측)',
    targets: { 궁정처세: 55, 통치학: 45 },
    huntOver: 25,
    choices: [
      [/왕대비의 초대/, /예의만/],
      [/문서고의 밤/, /섭정공에게 보인다/],
      [/성년식/, /공동 통치/],
      [/첫 친정/, /인사를 개편/],
      [/귀족들의 견제/, /한발 굽히/],
      [/섭정공과의 담판/, /손을 잡는다/],
    ],
    expect: {},
  },
]

function planTurn(panel, run) {
  const s = panel.stats
  const wellbeing = s['심신'] ?? 100
  const suspicion = s['섭정 의심'] ?? 0
  const statecraft = s['통치학'] ?? 0
  const age = parseInt((panel.age.match(/(\d+)세/) ?? [])[1] ?? '11', 10)

  const plan = []
  let ap = 3
  const push = (name, cost) => {
    if (ap >= cost) { plan.push(name); ap -= cost }
  }

  if (wellbeing < 22) { push('휴식', 1); push('휴식', 1) }
  else if (wellbeing < 38) push('휴식', 1)

  // 함정 빌드: 정해진 나이까지 남은 AP를 전부 넘기기에 쓴다
  if (run.trapUntilAge && age <= run.trapUntilAge) {
    while (ap >= 1) push(CEDE, 1)
    return plan
  }

  // 국정 배석/맡기기는 신망을 올리면서 의심을 낮추는 수단
  if (run.cedeOver !== undefined && suspicion > run.cedeOver) push(CEDE, 1)
  // 사냥 대회로 의심을 관리하는 대안 경로 (G 빌드). 14세부터 해금이고 AP 2 를 먹는다.
  if (run.huntOver !== undefined && age >= 14 && suspicion > run.huntOver) push(HUNT, 2)
  if (run.reclaim && age >= 14 && statecraft >= 35) push(RECLAIM, 2)

  while (ap >= 1) {
    const behind = Object.entries(run.targets)
      .map(([stat, goal]) => ({ stat, gap: goal - (s[stat] ?? 0) }))
      .sort((a, b) => b.gap - a.gap)[0]
    // 목표를 다 채우면 휴식으로 떨어진다. 연회로 떨어지면 의심이 단방향으로 쌓인다.
    const best = behind.gap > 0 ? STAT_TO_ACTIVITY[behind.stat] : '휴식'
    push(best, 1)
    if (best !== '휴식') s[behind.stat] = (s[behind.stat] ?? 0) + 6 // 같은 턴 중복 선택 방지용 근사
  }
  return plan
}

async function runSimulation(browser, run) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)

  const prefs = [...(run.choices ?? []), ...COMMON_CHOICES]
  const fired = []
  const influenceTrack = []
  let turns = 0
  let minInfluence = 100

  while (turns < 60) {
    const phase = await phaseOf(page)
    if (phase === 'ended') break

    if (phase === 'schedule') {
      const panel = await readPanel(page)
      const infl = panel.stats['국정 영향도'] ?? 0
      minInfluence = Math.min(minInfluence, infl)
      if (turns % 8 === 0) influenceTrack.push(`${panel.age.replace('왕 ', '')}:${infl}`)

      for (const name of planTurn(panel, run)) {
        const c = page.locator('ul.grid').getByRole('button', { name: new RegExp(name) })
        if (await c.isEnabled().catch(() => false)) await c.click()
      }
      await page.getByRole('button', { name: /턴 종료/ }).click()
      await page.waitForTimeout(60)
      turns++
      continue
    }

    if (phase === 'result') {
      await page.getByRole('button', { name: /다음 계절로|무슨 일이/ }).click()
      await page.waitForTimeout(60)
      continue
    }

    if (phase === 'event') {
      // 씬이 붙은 이벤트는 대사를 먼저 넘긴다
      await advanceScene(page)
      const title = await page.locator('article h1').innerText()
      const panel = await readPanel(page)
      let picked = null
      const choices = choiceButtons(page)
      const count = await choices.count()
      if (count > 0) {
        const pref = prefs.find(([t]) => t.test(title))
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
        picked = (await target.innerText()).split('\n')[0]
        await target.click()
        await page.waitForTimeout(60)
      }
      // 발동 시점의 게이지도 남긴다 — 조건 문턱까지 여유가 얼마였는지 재기 위함
      fired.push({
        title, picked, age: panel.age, date: panel.date,
        의심: panel.stats['섭정 의심'], 신망: panel.stats['섭정 신망'],
        영향도: panel.stats['국정 영향도'],
      })
      await page.getByRole('button', { name: /다음 계절로|계속/ }).click()
      await page.waitForTimeout(60)
      continue
    }
    break
  }

  const endedReached = (await phaseOf(page)) === 'ended'
  let flags = {}, stats = {}, resources = {}
  if (endedReached) {
    await page.getByRole('button', { name: '이 기록 저장' }).click()
    await page.waitForTimeout(200)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
    flags = saved.state.flags
    stats = saved.state.stats
    resources = {
      영향도: saved.state.courtInfluence,
      의심: saved.state.regentSuspicion,
      신망: saved.state.regentRapport,
    }
    await page.screenshot({ path: `${OUT}/ended-${run.name[0]}.png`, fullPage: true })
  }

  await ctx.close()
  return { endedReached, fired, flags, stats, resources, errors, turns, influenceTrack, minInfluence }
}

const browser = await launch()

// 인자로 런 머리글자를 주면 그 런만 돌린다 (예: npm run simulate -- D)
const only = process.argv[2]
for (const run of only ? RUNS.filter((r) => r.name.startsWith(only)) : RUNS) {
  console.log('')
  console.log('='.repeat(66))
  console.log(run.name)
  console.log('='.repeat(66))
  const r = await runSimulation(browser, run)

  console.log(`턴 ${r.turns} | 종료 도달: ${ok(r.endedReached)} | 이벤트 ${r.fired.length}건`)
  for (const e of r.fired) {
    const g = `[의심 ${e.의심} 신망 ${e.신망} 영향도 ${e.영향도}]`
    console.log(`  ${e.date} (${e.age})  ${e.title}${e.picked ? `  → ${e.picked}` : ''}  ${g}`)
  }
  console.log('영향도 추이:', r.influenceTrack.join('  '), `| 최저 ${r.minInfluence}`)
  console.log('최종 자원:', JSON.stringify(r.resources))
  console.log('최종 스탯:', JSON.stringify(r.stats))

  const clues = Object.keys(r.flags).filter((f) => f.startsWith('clue_') && r.flags[f])
  const people = Object.keys(r.flags).filter((f) => f.startsWith('people_') && r.flags[f])
  console.log('단서:', clues.length, '개', people.length ? `| 민심 flag: ${people.join(', ')}` : '')
  if (run.expect.shallow !== undefined)
    console.log('얕은 진실:', !!r.flags.truth_regent_involved,
      ok(!!r.flags.truth_regent_involved === run.expect.shallow))
  if (run.expect.deep !== undefined)
    console.log('깊은 진실:', !!r.flags.truth_mother_mastermind,
      ok(!!r.flags.truth_mother_mastermind === run.expect.deep))
  const accord = !!r.flags.regent_won_over
  console.log('섭정:', r.flags.regent_alliance ? '동맹' : accord ? '회유 성사'
    : r.flags.regent_hostile ? '결렬' : '중립',
    run.expect.accord === undefined ? '' : ok(accord === run.expect.accord))
  if (r.errors.length) console.log('*** 런타임 에러:', r.errors.join(' | '))
}

await browser.close()
console.log('\n스크린샷:', OUT)
