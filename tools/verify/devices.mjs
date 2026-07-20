// M2b-3c-2 정치 고유장치 검증.
//
// ★ 두 가지가 이 스크립트의 존재 이유다.
//   1) 키워드 틀이 **진짜 일반 틀인지** — 임시 토픽을 다른 캐릭터에 얹어 실제로 시연한다.
//      "일반적으로 설계했다"는 말은 증명이 아니다. 얹어 보면 증명이다.
//   2) ③⑤ 판정이 **M3 로 예약됐는지** — 예약 flag 를 읽는 condition 이 0건인지
//      이벤트 정의를 정적으로 대조한다. 읽는 곳이 생기면 판정이 앞당겨진 것이다.
import {
  APP_URL, advanceScene, blockAiNetwork, launch, log, ok, shotsDir, SAVE_VERSION,
} from './helpers.mjs'

const OUT = shotsDir('devices')

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})

// 이 검증은 네트워크를 쓰지 않는다. 그런데 C 절에서 키를 설정하므로
// 돌발 현안이 자동으로 생성을 시도할 수 있다 — 실제 호출을 원천 차단한다.
const blockedCalls = await blockAiNetwork(page)

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)
const flagsOf = async () => (await stateOf()).flags ?? {}
const triggerable = (patch) =>
  page.evaluate((p) => {
    window.__queeningAi.setGame(p)
    return window.__queeningAi.triggerable()
  }, patch)

// 돌발 현안은 이 검증의 관심사가 아니다. 확률을 0 으로 눌러 끼어들지 않게 한다.
await page.evaluate(() => window.__queeningAi.setIncidentRate(0))

const SEEN_OTHERS = await page.evaluate(() => {
  const own = new Set([
    ...window.__queeningAi.bloodOathIds(),
    ...window.__queeningAi.deviceIds(),
  ])
  const flags = {}
  for (const e of window.__queeningAi.events()) {
    if (!own.has(e.id)) flags[`event:${e.id}`] = true
  }
  return flags
})

const STATS = { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 }
const BASE = {
  age: 18, date: { year: 7, season: 'summer' },
  affection: { heir: 0, loyalist: 0, prince: 5, commander: 20, hero: 0 },
  courtInfluence: 30, regentRapport: 30, regentSuspicion: 30, wellbeing: 80,
  counters: { '__cooldown:prince-arrival': 99 },
  stats: STATS,
}
const withFlags = (f, extra = {}) => ({
  ...BASE, ...extra,
  flags: { ...SEEN_OTHERS, romance_unlocked: true, ...f },
})

async function runTurn() {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: [] })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(350)
  const titles = []
  for (let i = 0; i < 8; i++) {
    const next = page.getByRole('button', { name: /다음 계절로|무슨 일이|계속/ })
    if (!(await next.isVisible().catch(() => false))) break
    const label = await next.innerText()
    await next.click()
    await page.waitForTimeout(350)
    await advanceScene(page)
    const t = await page.locator('article h1').innerText().catch(() => null)
    if (t && !titles.includes(t)) titles.push(t)
    if (/다음 계절로/.test(label)) break
  }
  for (let i = 0; i < 5; i++) {
    const b = page.getByRole('button', { name: /다음 계절로|계속/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click()
    await page.waitForTimeout(250)
  }
  return titles
}

// ─────────────────────────────────────────────────────────────
log('=== A. ★★ M3 예약 — 판정이 앞당겨지지 않았는가 ===')
log('')

const reservation = await page.evaluate(() => {
  const RESERVED = ['union_possible', 'military_route_open', 'queen_poison_path']
  /**
   * ★ `flag: false` 로 읽는 것은 **자기 재발동 방지 가드**다(한 번 열렸으면 또 열지 않는다).
   *   판정이란 열린 경로를 **전제로 분기하는 것**, 즉 `flag: true` 로 읽는 것이다.
   *   그래서 true 로 읽는 곳만 센다.
   */
  const readers = []
  for (const e of window.__queeningAi.events()) {
    for (const [f, expected] of Object.entries(e.condition?.flags ?? {})) {
      if (RESERVED.includes(f) && expected === true) readers.push(`${e.id} ← ${f}`)
    }
    for (const ch of e.choices ?? []) {
      for (const [f, expected] of Object.entries(ch.requires?.flags ?? {})) {
        if (RESERVED.includes(f) && expected === true) {
          readers.push(`${e.id}/${ch.id} ← ${f}`)
        }
      }
    }
  }
  // 예약 flag 가 실제로 심어지기는 하는가 (심지도 않으면 예약이 아니다)
  const writers = []
  for (const e of window.__queeningAi.events()) {
    for (const f of Object.keys(e.setFlags ?? {})) {
      if (RESERVED.includes(f)) writers.push(`${e.id} → ${f}`)
    }
  }
  return { readers, writers }
})

log('   예약 flag 를 세우는 곳:', reservation.writers.join(', ') || '없음')
log('A1 ★ 예약 flag 로 분기하는 이벤트 0건 — true 로 읽는 곳 없음 (판정 미실시):',
  reservation.readers.length === 0 ? '없음' : reservation.readers.join(', '),
  ok(reservation.readers.length === 0))
log('A2 예약 flag 가 실제로 심어짐 (기록은 되고 있음):',
  ok(reservation.writers.length >= 2))
log('   → 지금은 "경로가 열렸다"까지만이고, 동등/복속·왕주도/군부종속은 갈리지 않는다.')

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ★★ 키워드 틀 일반성 — 다른 캐릭터에 얹히는가 ===')

const generality = await page.evaluate(() => {
  const before = window.__queeningAi.topics('heir').map((t) => t.id)
  // ★ 런타임에 ① 에게 임시 화제를 하나 얹어 본다.
  //   코드 변경 없이 데이터 객체 하나로 되는지가 "일반 틀"의 정의다.
  window.__queeningAi.addTopic({
    id: 'tmp_heir_father',
    charId: 'heir',
    label: '아버지 이야기를 꺼낸다',
    unlock: { affection: { heir: { min: 40 } } },
    sceneId: 'scene-heir-confession',
    effects: [{ target: { kind: 'affection', charId: 'heir' }, amount: 5 }],
    setFlags: { tmp_heir_father_asked: true },
  })
  const lowAff = window.__queeningAi.topics('heir').map((t) => t.id)
  window.__queeningAi.setGame({ affection: { heir: 50 } })
  const highAff = window.__queeningAi.topics('heir').map((t) => t.id)
  window.__queeningAi.removeTopic('tmp_heir_father')
  return { before, lowAff, highAff, after: window.__queeningAi.topics('heir').map((t) => t.id) }
})

log('   ① 화제 목록: 등록 전', JSON.stringify(generality.before))
log('              호감도 0  ', JSON.stringify(generality.lowAff))
log('              호감도 50 ', JSON.stringify(generality.highAff))
log('              제거 후   ', JSON.stringify(generality.after))
log('B1 ★ 데이터 객체 하나로 다른 캐릭터에 화제가 얹힘:',
  ok(generality.highAff.includes('tmp_heir_father')))
log('B2 해금 조건이 그대로 작동 (호감도 미달이면 안 뜸):',
  ok(!generality.lowAff.includes('tmp_heir_father')))
log('B3 엔진에 캐릭터 분기가 없음 (제거하면 깨끗이 사라짐):',
  ok(generality.after.length === generality.before.length))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. ⑤ 키워드 → 가문 역사 → 아버지 만남 → 군사노선 ===')
await setGame(withFlags({}))

const noTopic = await page.evaluate(() => window.__queeningAi.topics('commander').length)
log('C1 호감도 20 에서는 화제 없음:', noTopic, ok(noTopic === 0))

await setGame({ affection: { ...BASE.affection, commander: 55 } })
const hasTopic = await page.evaluate(() => window.__queeningAi.topics('commander'))
log('C2 ★ 호감도 55 에서 화제 해금:', hasTopic.map((t) => t.label).join(', '),
  ok(hasTopic.length === 1))

// 실제 UI 로 눌러 본다 — 대화 화면에 버튼이 뜨는지
await page.evaluate(() =>
  window.__queeningAi.configure('anthropic', 'sk-ant-test-key-not-real'))
await page.getByRole('button', { name: '인연', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('dialog', { name: '인연' }).locator('li').nth(3).click()
await page.waitForTimeout(400)
const dialog = page.getByRole('dialog', { name: '대화' })
const topicBtn = dialog.getByRole('button', { name: '가문의 역사를 묻는다' })
log('C3 ★ 대화 화면에 화제 선택지가 뜸:', ok(await topicBtn.isVisible()))
await page.screenshot({ path: `${OUT}/01-topic-button.png` })

const beforeAff = (await stateOf()).affection.commander
await topicBtn.click()
await page.waitForTimeout(400)
log('C4 ★ AI 호출 없이 고정 씬이 재생됨 (키가 가짜여도 동작):',
  ok(await dialog.getByRole('button', { name: /다음|계속/ }).isVisible()))
await page.screenshot({ path: `${OUT}/02-topic-scene.png` })
await advanceScene(page)
await page.waitForTimeout(300)

const afterAff = (await stateOf()).affection.commander
let f = await flagsOf()
log('C5 결정론적 호감도 보상:', `${beforeAff} → ${afterAff}`, ok(afterAff === beforeAff + 8))
log('C6 flag 기록:', ok(f.commander_house_known === true))
const usedAgain = await page.evaluate(() => window.__queeningAi.topics('commander').length)
log('C7 한 번 꺼낸 화제는 다시 뜨지 않음:', usedAgain, ok(usedAgain === 0))
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ★ 화제 사용 기록의 영속성은 **여기서** 확인한다 —
//   뒤 절들이 setGame 으로 flags 를 통째로 갈아끼우므로, 실제 플레이로 세워진
//   지금 이 시점이 아니면 검사가 무의미해진다.
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const topicSave = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('queening.save')))
log('C13 ★ 화제 사용 기록이 세이브에 남음:',
  ok(topicSave.state.flags['topic:keyword_commander_house_history'] === true))
log('C14 화제 보상 호감도도 저장됨:',
  ok(topicSave.state.affection.commander === afterAff))

// 아버지 만남
const noAudience = await triggerable(withFlags({ commander_house_known: true }, {
  affection: { ...BASE.affection, commander: 60 },
}))
log('C8 호감도 60 에서는 아버지 만남 아직:',
  ok(!noAudience.includes('commander-father-audience')))

await setGame(withFlags({ commander_house_known: true }, {
  affection: { ...BASE.affection, commander: 65 },
}))
const audience = await runTurn()
f = await flagsOf()
log('C9 ★ 호감도 65 + 가문 역사 → 아버지 만남:', audience.join(' / '),
  ok(audience.includes('문 앞에 선 가문')))
log('C10 ★ military_route_open 개방:', ok(f.military_route_open === true))
log('C11 ★ 판정은 아직 안 함 (왕주도/군부종속 없음):',
  ok(!f.military_king_led && !f.military_junta_risk))

const noHistory = await triggerable(withFlags({}, {
  affection: { ...BASE.affection, commander: 80 },
}))
log('C12 가문 역사를 안 들었으면 호감도가 높아도 만남 없음:',
  ok(!noHistory.includes('commander-father-audience')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ★ ④ 두루마리 — 영향도 보상 ===')
const noRomance = await triggerable(withFlags({ hero_at_court: true }))
log('D1 ★ 로맨스를 안 타면 이벤트 자체가 없음:',
  ok(!noRomance.includes('hero-sacred-scroll')))

const noCourt = await triggerable(withFlags({}, {
  affection: { ...BASE.affection, hero: 75 },
}))
log('D2 입궁 전에는 없음:', ok(!noCourt.includes('hero-sacred-scroll')))

const tooYoung = await triggerable(withFlags({ hero_at_court: true }, {
  age: 17, affection: { ...BASE.affection, hero: 75 },
}))
log('D3 17세에는 아직:', ok(!tooYoung.includes('hero-sacred-scroll')))

await setGame(withFlags({ hero_at_court: true }, {
  affection: { ...BASE.affection, hero: 75 },
}))
const beforeInf = (await stateOf()).courtInfluence
const scroll = await runTurn()
const afterState = await stateOf()
f = afterState.flags
log('D4 ★ 깊은 관계 + 입궁 + 18세 → 두루마리:', scroll.join(' / '),
  ok(scroll.includes('두루마리')))
log('D5 ★ 국정 영향도 보상:', `${beforeInf} → ${afterState.courtInfluence}`,
  ok(afterState.courtInfluence === beforeInf + 18))
log('D6 정통성 flag:',
  ok(f.scroll_offered && f.legitimacy_sacred && f.church_support))
await page.screenshot({ path: `${OUT}/03-scroll.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. ③ 공동왕조 ===')
const notPresent = await triggerable(withFlags({}, {
  affection: { ...BASE.affection, prince: 75 },
}))
log('E1 ★ 체류 중이 아니면 열리지 않음:', ok(!notPresent.includes('union-possible')))

const shallow = await triggerable(withFlags({ prince_present: true }, {
  affection: { ...BASE.affection, prince: 60 },
}))
log('E2 깊은 관계가 아니면 열리지 않음:', ok(!shallow.includes('union-possible')))

await setGame(withFlags({ prince_present: true }, {
  affection: { ...BASE.affection, prince: 75 },
}))
const union = await runTurn()
f = await flagsOf()
log('E3 ★ 깊은 관계 + 체류 → 두 개의 왕관:', union.join(' / '),
  ok(union.includes('두 개의 왕관')))
log('E4 ★ union_possible 개방:', ok(f.union_possible === true))
log('E5 ★ 판정은 아직 안 함 (동등/복속 없음):',
  ok(!f.union_equal && !f.union_subjugated))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 씬 겹침 — 뭉개지지 않고 순차 표시 ===')
await setGame(withFlags(
  { hero_at_court: true, prince_present: true, commander_house_known: true },
  { affection: { heir: 0, loyalist: 0, prince: 75, commander: 75, hero: 75 } },
))
const collided = await runTurn()
log('F1 세 장치가 동시에 조건을 채운 턴:', collided.join(' / '))
log('F2 ★ 뭉개지지 않고 우선순위대로 표시:',
  ok(collided.length >= 2 && collided[0] === '두루마리'))
const f2 = await flagsOf()
log('F3 턴 상한(2건) 때문에 남은 것은 다음 턴으로:',
  `두루마리=${!!f2.scroll_offered} 군사=${!!f2.military_route_open} 결합=${!!f2.union_possible}`)
const collided2 = await runTurn()
log('F4 ★ 다음 턴에 나머지가 이어짐:', collided2.join(' / '))
const f3 = await flagsOf()
log('F5 ★ 결국 셋 다 발동 (하나도 유실되지 않음):',
  ok(!!f3.scroll_offered && !!f3.military_route_open && !!f3.union_possible))

// ─────────────────────────────────────────────────────────────
log('')
log('=== G. 세이브 ===')
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('G1 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('G2 장치 flag 보존:',
  ok(saved.state.flags.union_possible && saved.state.flags.military_route_open))
// 화제 사용 기록의 영속성은 C13 에서 확인했다(여기 flags 는 뒤 절들이 갈아끼운 것).
log('G3 호감도·카운터 보존:',
  ok(typeof saved.state.affection === 'object' && typeof saved.state.counters === 'object'))

log('')
log('G5 ★ 실제 AI 호출이 한 건도 나가지 않음:',
  `차단 ${blockedCalls().length}건`, ok(blockedCalls().length === 0))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
