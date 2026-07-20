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

/** 시뮬에서 돌발 현안이 켜졌을 때 쓰는 고정 응답(실제 API 를 부르지 않는다). */
const SIM_INCIDENT = JSON.stringify({
  title: '늦서리',
  text: '늦서리가 내려 남쪽 고을의 보리가 상했다.',
  urgent: false,
  choices: [
    { label: '창고를 연다', resultText: '고을이 한숨 돌렸다.', cautious: false,
      deltas: [{ target: 'wellbeing', amount: -1 }], flags: { people_relieved_harvest: true } },
    { label: '지켜본다', resultText: '아무 일도 하지 않았다.', cautious: true,
      deltas: [], flags: {} },
  ],
})

const SIM_INCIDENT_SSE = (() => {
  const chunks = SIM_INCIDENT.match(/[\s\S]{1,60}/g) ?? [SIM_INCIDENT]
  const out = [
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-4-8', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`,
  ]
  for (const c of chunks) {
    out.push(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c } })}\n\n`)
  }
  out.push(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`)
  out.push(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 20 } })}\n\n`)
  out.push(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
  return out.join('')
})()

const COMMON_CHOICES = [
  [/덮인 밤/, /혼자 삼킨다/],
  [/어머니의 필적/, /아무에게도/],
  [/문서고의 밤/, /초안을 감춘다/],
  [/봉인된 기록/, /물러난다/],
  // ★ 가문 수색은 되돌릴 수 없는 결렬이다. 플래너의 기본값("첫 선택지")이
  //   강행이라, 지정하지 않으면 모든 빌드가 자동으로 섭정과 갈라선다 —
  //   실제로 B 빌드가 중립에서 결렬로 뒤집혔다. 옵트인 설계에 맞춰 기본은 물러남으로
  //   두고, 강탈 경로는 전용 빌드(H)가 덮는다.
  [/가문 수색/, /물러난다/],
  // ★ 처분도 되돌릴 수 없다. 플래너 기본값("첫 선택지")이 심판/폭정이라
  //   지정하지 않으면 모든 빌드가 자동으로 숙부를 친다. 기본은 보류로 두고,
  //   폭군 경로는 전용 빌드(J)가 덮는다. (가문 수색에서 배운 것과 같은 규칙)
  [/숙부의 처분/, /그대로 둔다/],
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
    /**
     * ★ M2b-3c-1 혈서 확증 루트 전용 빌드.
     * A 와 같은 궁정처세 특화지만 가문 수색을 **강행**해 두 반쪽을 다 모은다.
     * 침실 수색 성공(궁정처세 68) + 강탈 → blood_oath_complete 도달을 실측한다.
     */
    name: 'H. 혈서 확증 루트 (침실 수색 + 강탈 + 심판)',
    targets: { 궁정처세: 72, 통치학: 50, 변론: 60 },
    reclaim: true,
    choices: [
      [/왕대비의 초대/, /아버지 이야기/],
      [/달이 없는 밤/, /숨는다/],
      [/가문 수색/, /수색을 강행한다/],
      // 확증까지 모은 루트의 자연스러운 종착점 — 그리고 '정당' 처분을
      // 실제 플레이로 밟는 유일한 빌드다(J 는 폭군, 나머지는 보류).
      [/숙부의 처분/, /명분을 들어 심판한다/],
    ],
    expect: { bloodOath: true, just: true },
  },
  {
    /**
     * ★ M2b-3c-2 두루마리 실측 전용 빌드.
     *
     * 시뮬 플래너는 대화를 하지 않으므로 호감도를 올릴 수단이 없다. 그래서
     * **시작 시 ④ 호감도만 시드해** "로맨스를 완주한 플레이"를 흉내 낸다.
     * 나머지는 F(실권 극대화)와 같은 정책이라, F 와 나란히 놓으면
     * 두루마리 +18 이 엔드게임 영향도에 실제로 얼마를 보태는지가 보인다.
     */
    name: 'I. 두루마리 루트 (④ 로맨스 완주 가정)',
    targets: { 통치학: 60 },
    reclaim: true,
    seedAffection: { hero: 75 },
    choices: [
      [/성년식/, /친정을 선포/],
      [/첫 친정/, /인사를 개편|국고|군제/],
      [/귀족들의 견제/, /정면으로 반박/],
      [/국고의 장부/, /밝히게/],
    ],
    expect: { scroll: true },
  },
  {
    /**
     * ★ M3-1 폭군 경로 전용 빌드.
     * F(실권 극대화)와 정책이 같고 **처분만 강행**한다.
     * 진실도 확증도 없이 힘으로 숙부를 치면 어떤 엔딩으로 수렴하는지 실측한다.
     */
    name: 'J. 폭군 루트 (명분 없이 처분)',
    targets: { 통치학: 60 },
    reclaim: true,
    choices: [
      [/성년식/, /친정을 선포/],
      [/첫 친정/, /인사를 개편|국고|군제/],
      [/귀족들의 견제/, /정면으로 반박/],
      [/숙부의 처분/, /명분 없이 처분한다/],
    ],
    expect: { tyrant: true },
  },
  {
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

  /**
   * ★ ablation / 결정론 모드.
   *
   *   QUEENING_DETERMINISTIC=1 → variance 0. 두 실행을 수치까지 비교할 수 있게 한다.
   *   QUEENING_ABLATE=bloodoath,devices,topics → 그 콘텐츠를 실제로 들어낸다.
   *
   *   둘을 함께 쓰면 "얹은 것을 들어내도 로그가 같은가"를 결과로 증명할 수 있다.
   *   (tools/verify/ablation.mjs 가 이 두 변수로 같은 시뮬을 두 번 돌려 대조한다)
   */
  if (process.env.QUEENING_DETERMINISTIC === '1') {
    await page.evaluate(() => window.__queeningAi.setDeterministic(true))
  }
  /**
   * 돌발 현안을 켠 채로 돌린다(ablation 대조군용).
   * 실제 API 는 부르지 않고 고정 응답을 가로채 넣는다 — 검증은 네트워크와 무관해야 한다.
   * 확률은 정상(6~8%)보다 훨씬 높게 올려 **과다 투여** 상태를 만든다.
   */
  if (process.env.QUEENING_INCIDENTS === '1') {
    await page.route('**/v1/messages', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: SIM_INCIDENT_SSE,
      }))
    await page.evaluate(() => {
      window.__queeningAi.configure('anthropic', 'sk-ant-fake-for-simulation')
      window.__queeningAi.setIncidentRate(0.9)
    })
  }
  if (process.env.QUEENING_ABLATE) {
    const packs = process.env.QUEENING_ABLATE.split(',').map((s) => s.trim()).filter(Boolean)
    const result = await page.evaluate((p) => window.__queeningAi.ablate(p), packs)
    console.log(`  [ablation] 제거 ${result.removed.length}건 | 남은 이벤트 ${result.remainingEvents}`)
  }

  /**
   * ★ 호감도 시드. 플래너는 대화를 하지 않아서 호감도를 올릴 방법이 없으므로,
   *   로맨스 완주를 전제로 하는 장치(두루마리 등)를 재려면 시작값을 넣어 줘야 한다.
   *   이건 "로맨스를 끝까지 탄 플레이"의 대역이지 실제 대화 시뮬이 아니다.
   */
  if (run.seedAffection) {
    await page.evaluate((seed) => {
      const game = window.__queeningAi.state
      window.__queeningAi.setGame({ affection: { ...game.affection, ...seed } })
    }, run.seedAffection)
  }

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

  // ★ 엔딩 판정 (M3-1). 모든 빌드가 정확히 하나의 결과로 수렴하는지 실측한다.
  const ending = endedReached
    ? await page.evaluate(() => window.__queeningAi.judgeEnding())
    : null

  await ctx.close()
  return {
    endedReached, fired, flags, stats, resources, errors, turns,
    influenceTrack, minInfluence, ending,
  }
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
  // 혈서 (M2b-3c-1). 반쪽만으론 확증이 아니라는 것이 보이도록 셋 다 찍는다.
  const half = [
    r.flags.blood_oath_half_monarch ? '군주반쪽' : null,
    r.flags.blood_oath_half_heir ? '후계반쪽' : null,
  ].filter(Boolean)
  const caught = !!r.flags.queen_poison_path
  if (half.length || caught || run.expect.bloodOath !== undefined) {
    console.log('혈서:', half.length ? half.join('+') : '없음',
      r.flags.blood_oath_complete ? '→ 확증' : '',
      caught ? '| 발각(queen_poison_path)' : '',
      run.expect.bloodOath === undefined
        ? '' : ok(!!r.flags.blood_oath_complete === run.expect.bloodOath))
  }

  // 정치 고유장치 (M2b-3c-2). 예약 flag 는 "열림"까지만이라는 게 보이도록 그대로 찍는다.
  const devices = [
    r.flags.scroll_offered ? '두루마리(+18)' : null,
    r.flags.military_route_open ? '군사노선 열림' : null,
    r.flags.union_possible ? '공동왕조 열림' : null,
  ].filter(Boolean)
  if (devices.length || run.expect.scroll !== undefined) {
    console.log('고유장치:', devices.length ? devices.join(', ') : '없음',
      run.expect.scroll === undefined
        ? '' : ok(!!r.flags.scroll_offered === run.expect.scroll))
  }

  const accord = !!r.flags.regent_won_over
  console.log('섭정:', r.flags.regent_alliance ? '동맹' : accord ? '회유 성사'
    : r.flags.regent_hostile ? '결렬' : '중립',
    run.expect.accord === undefined ? '' : ok(accord === run.expect.accord))
  // ★ 엔딩 판정 (M3-1). "엔딩 없음"이 하나라도 나오면 그 자리에서 드러난다.
  if (r.ending) {
    const e = r.ending
    const parts = [e.tier, e.disposal, e.truthLevel]
    if (e.romance !== 'none') parts.push(`인연:${e.romance}`)
    console.log('엔딩:', parts.join(' / '),
      e.modifiers.length ? `[${e.modifiers.join('·')}]` : '',
      `| 국력 ${e.power}`,
      e.reprieve.used ? `| 유예: ${e.reprieve.from}` : '')
    if (e.nationFlags.length) console.log('  나라 향방:', e.nationFlags.join(', '))
    if (run.expect.tyrant !== undefined) {
      console.log('  폭군 판정:', ok((e.disposal === '폭군') === run.expect.tyrant))
    }
    if (run.expect.just !== undefined) {
      console.log('  정당 처분 판정:', ok((e.disposal === '정당') === run.expect.just))
    }
  } else if (r.endedReached) {
    console.log('엔딩: *** 판정 실패 ***')
  }

  if (r.errors.length) console.log('*** 런타임 에러:', r.errors.join(' | '))
}

await browser.close()
console.log('\n스크린샷:', OUT)
