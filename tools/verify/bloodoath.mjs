// M2b-3c-1 혈서 반쪽 검증.
//
// ★ A 절이 이 스크립트의 존재 이유다.
//   "기존 미스터리를 안 건드렸습니다"는 말로 할 주장이 아니라 코드로 대조할 명제다.
//   의존이 단방향(진실 → 혈서)이면 혈서를 통째로 들어내도 진실 도달이 그대로다.
//   A 절은 그 단방향성을 이벤트 정의에서 직접 읽어 확인한다.
import { APP_URL, advanceScene, launch, log, ok, shotsDir, SAVE_VERSION } from './helpers.mjs'

const OUT = shotsDir('bloodoath')

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    errors.push(`HTTP ${r.status()}: ${r.url()}`)
  }
})

await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const setGame = (patch) => page.evaluate((p) => window.__queeningAi.setGame(p), patch)
const stateOf = () => page.evaluate(() => window.__queeningAi.state)
const flagsOf = async () => (await stateOf()).flags ?? {}

/** 한 턴을 끝내고 그 턴에 뜬 이벤트 제목을 모은다. choose 로 선택지를 고를 수 있다. */
async function runTurn(choose) {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: [] })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(350)
  const titles = []
  for (let i = 0; i < 8; i++) {
    const next = page.getByRole('button', { name: /다음 달로|무슨 일이|계속/ })
    if (!(await next.isVisible().catch(() => false))) break
    const label = await next.innerText()
    await next.click()
    await page.waitForTimeout(350)
    await advanceScene(page)
    const t = await page.locator('article h1').innerText().catch(() => null)
    if (t && !titles.includes(t)) titles.push(t)
    if (choose) {
      const btn = page.locator('div.mt-4.space-y-2 > button').filter({ hasText: choose })
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click()
        await page.waitForTimeout(250)
      }
    }
    if (/다음 달로/.test(label)) break
  }
  for (let i = 0; i < 5; i++) {
    const b = page.getByRole('button', { name: /다음 달로|계속/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click()
    await page.waitForTimeout(250)
  }
  return titles
}

// ─────────────────────────────────────────────────────────────
log('=== A. ★★ 의존 단방향성 — 혈서를 들어내도 진실이 그대로인가 ===')
log('')

const dep = await page.evaluate(() => {
  const events = window.__queeningAi.events()
  const NEW = new Set(window.__queeningAi.bloodOathIds())
  const isMysteryFlag = (f) => /^(clue_|truth_)/.test(f)

  const collectConditionFlags = (c) => Object.keys(c?.flags ?? {})
  const collectSetFlags = (e) => [
    ...Object.keys(e.setFlags ?? {}),
    ...(e.choices ?? []).flatMap((ch) => Object.keys(ch.setFlags ?? {})),
  ]

  const newEvents = events.filter((e) => NEW.has(e.id))
  const oldEvents = events.filter((e) => !NEW.has(e.id))

  // 새 이벤트가 만들어 내는 flag 전부
  const producedByNew = new Set(newEvents.flatMap(collectSetFlags))

  // 새 이벤트가 **자동으로**(setFlags) 만드는 것과
  // **플레이어 선택으로만** 만드는 것을 구분한다 — 역방향 간선의 성격이 다르다.
  const producedAutomatically = new Set(newEvents.flatMap((e) => Object.keys(e.setFlags ?? {})))

  return {
    // 1) 새 이벤트가 미스터리 flag 를 쓰는가 (있으면 안 됨)
    newWritesMysteryFlags: [...producedByNew].filter(isMysteryFlag),
    // 2) 기존 이벤트가 새 flag 를 조건으로 읽는가 (역방향 간선)
    oldReadsNewFlags: oldEvents.flatMap((e) =>
      collectConditionFlags(e.condition)
        .filter((f) => producedByNew.has(f))
        .map((f) => `${e.id} ← ${f}`),
    ),
    // 2-b) 그중 플레이어 선택 없이 자동으로 걸리는 것 (있으면 안 됨)
    oldReadsAutoFlags: oldEvents.flatMap((e) =>
      collectConditionFlags(e.condition)
        .filter((f) => producedAutomatically.has(f))
        .map((f) => `${e.id} ← ${f}`),
    ),
    // 3) 새 이벤트는 미스터리 flag 를 읽기만 한다 (읽는 건 정상)
    newReadsMysteryFlags: [
      ...new Set(newEvents.flatMap((e) => collectConditionFlags(e.condition)).filter(isMysteryFlag)),
    ],
    newCount: newEvents.length,
    oldCount: oldEvents.length,
  }
})

log(`   새 이벤트 ${dep.newCount}건 / 기존 이벤트 ${dep.oldCount}건`)
log('A1 ★ 새 이벤트가 clue_*/truth_* 를 하나도 쓰지 않음:',
  dep.newWritesMysteryFlags.length === 0 ? '없음' : dep.newWritesMysteryFlags.join(', '),
  ok(dep.newWritesMysteryFlags.length === 0))
// ★ 역방향 간선은 딱 하나만 허용된다: regent_hostile.
//   명세가 지시한 의도된 결합(적대 수색 강행 = 되돌릴 수 없는 결렬)이다.
//   중요한 건 "없다"가 아니라 **그 하나뿐이고, 플레이어가 골라야만 생긴다**는 것.
const ALLOWED_BACK_EDGE = 'regent_hostile'
const unexpected = dep.oldReadsNewFlags.filter((s) => !s.endsWith(ALLOWED_BACK_EDGE))
log('A2 기존 → 새 flag 역방향 간선:',
  dep.oldReadsNewFlags.length === 0 ? '없음' : dep.oldReadsNewFlags.join(', '))
log('   ★ 허용된 하나(regent_hostile) 외에는 없음:',
  unexpected.length === 0 ? '없음' : unexpected.join(', '),
  ok(unexpected.length === 0))
log('   ★ 그 간선은 자동 발생하지 않음 — 플레이어가 선택해야만 생김:',
  dep.oldReadsAutoFlags.length === 0 ? '자동 없음' : dep.oldReadsAutoFlags.join(', '),
  ok(dep.oldReadsAutoFlags.length === 0))
log('A3 새 이벤트는 미스터리 flag 를 읽기만 함 (단방향):',
  dep.newReadsMysteryFlags.join(', '),
  ok(dep.newReadsMysteryFlags.length > 0))
log('   → A1 + A2 가 성립하면 clue_*/truth_* 판정식은 혈서와 무관하게 불변이다.')
log('   → 유일한 결합은 섭정 관계(regent_hostile)이고, 그건 명세가 지시한 것이다.')

// 진실 판정식 자체가 그대로인지 조건식을 직접 찍어 대조한다
const truthConds = await page.evaluate(() =>
  window.__queeningAi.events()
    .filter((e) => e.id.startsWith('truth-'))
    .map((e) => `${e.id}: ${JSON.stringify(e.condition)}`),
)
log('')
log('A4 진실 회수 조건식 (변경 전과 대조용):')
for (const c of truthConds) log('   ' + c)

// ─────────────────────────────────────────────────────────────
log('')
log('=== B. ② 실마리 → 침실 수색 요구 완화 ===')

/** 주어진 상태에서 발동 가능한 이벤트 id 목록. */
const triggerable = (patch) =>
  page.evaluate((p) => {
    window.__queeningAi.setGame(p)
    return window.__queeningAi.triggerable()
  }, patch)

/**
 * ★ 기존 이벤트를 전부 "이미 본 것"으로 둔다.
 *
 *   턴당 이벤트 상한이 2 라, 17~18세에 몰려 있는 마일스톤(성년식 등)이
 *   턴 예산을 먼저 먹으면 혈서 이벤트가 화면에 오지 않는다. 그건 우선순위 대역이
 *   정상 작동하는 것이지 버그가 아니므로, 여기서는 격리해서 혈서 사슬만 본다.
 *   (③ 방문은 once:false 라 seen flag 가 안 통해 쿨다운으로 막는다)
 */
const SEEN_OTHERS = await page.evaluate(() => {
  const blood = new Set(window.__queeningAi.bloodOathIds())
  const flags = {}
  for (const e of window.__queeningAi.events()) {
    if (!blood.has(e.id)) flags[`event:${e.id}`] = true
  }
  return flags
})

const BASE = {
  age: 17, date: { year: 6, month: 6 },
  affection: { heir: 0, loyalist: 0, prince: 5, commander: 20, hero: 0 },
  courtInfluence: 20, regentRapport: 30, regentSuspicion: 30, wellbeing: 80,
  counters: { '__cooldown:prince-arrival': 99 },
}
const withFlags = (f, extra = {}) => ({
  ...BASE, ...extra,
  flags: { ...SEEN_OTHERS, romance_unlocked: true, clue_apothecary: true, ...f },
})

const c54 = await triggerable({ ...withFlags({}), stats: { courtcraft: 54, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 } })
const c60 = await triggerable({ ...withFlags({}), stats: { courtcraft: 60, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 } })
const c68 = await triggerable({ ...withFlags({}), stats: { courtcraft: 68, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 } })
const c60h = await triggerable({ ...withFlags({ hint_queen_chamber: true }), stats: { courtcraft: 60, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 } })
const c54h = await triggerable({ ...withFlags({ hint_queen_chamber: true }), stats: { courtcraft: 54, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 } })

const canSearch = (ids) => ids.some((i) => i.startsWith('chamber-search'))
log(`   궁정처세 54 실마리없음: ${canSearch(c54) ? '가능' : '불가'}`)
log(`   궁정처세 60 실마리없음: ${canSearch(c60) ? '가능' : '불가'}`)
log(`   궁정처세 68 실마리없음: ${canSearch(c68) ? '가능' : '불가'}`)
log(`   궁정처세 60 실마리있음: ${canSearch(c60h) ? '가능' : '불가'}`)
log(`   궁정처세 54 실마리있음: ${canSearch(c54h) ? '가능' : '불가'}`)
log('B1 ★ 실마리 없이도 궁정처세만으로 도달 (한 경로 종속 아님):', ok(canSearch(c68)))
log('B2 ★ 실마리가 실제로 문턱을 낮춤 (60 은 실마리 있을 때만):',
  ok(!canSearch(c60) && canSearch(c60h)))
log('B3 실마리가 있어도 선행 조건(55) 아래로는 못 내려감:', ok(!canSearch(c54h)))

const hintable = await triggerable({
  ...BASE, age: 17,
  affection: { ...BASE.affection, loyalist: 45 },
  flags: { romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('B4 ② 호감도 45 에서 실마리 씬 발동 가능:',
  ok(hintable.includes('loyalist-chamber-hint')))
const notHintable = await triggerable({
  ...BASE, age: 17,
  affection: { ...BASE.affection, loyalist: 30 },
  flags: { romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('B5 ② 호감도 30 에서는 아직:', ok(!notHintable.includes('loyalist-chamber-hint')))

// ─────────────────────────────────────────────────────────────
log('')
log('=== C. ★ 발각 판정 — 성공 / 실패 ===')

/**
 * ★ C0 은 시뮬 H 빌드가 잡아낸 실제 버그를 고정한다.
 *
 *   수색 이벤트는 setFlags 로 즉시 flag 를 세우지만, 선택지 flag 는 플레이어가
 *   화면에서 고를 때 세워진다. 그 사이 턴 예산이 남아 있으면 같은 턴 재평가에서
 *   발각이 먼저 터져 **선택할 기회 자체가 사라졌다.**
 *   여기서는 예산을 비우지 않고 수색만 띄워, 같은 턴에 판정이 나지 않는지 본다.
 */
await setGame({
  ...withFlags({}),
  stats: { courtcraft: 68, rhetoric: 30, statecraft: 40, finance: 20, martial: 20 },
})
const searchTurn = await runTurn('숨는다')
const afterSearch = await flagsOf()
log('C0 ★ 수색과 발각 판정이 같은 턴에 겹치지 않음:', searchTurn.join(' / '),
  ok(!searchTurn.includes('들켰다')))
log('   ★ 선택할 기회가 실제로 주어짐 (attempt flag 가 섰다):',
  ok(afterSearch.chamber_attempted === true && afterSearch.chamber_resolved !== true))

// 숨기 성공 (궁정처세 68 → 탈출 체크 55 통과)
await setGame({
  ...withFlags({ chamber_attempted: true, chamber_attempt_hide: true }),
  stats: { courtcraft: 68, rhetoric: 30, statecraft: 40, finance: 20, martial: 20 },
})
const hideOk = await runTurn()
let f = await flagsOf()
log('C1 숨기 성공 → 군주 반쪽 획득:', hideOk.join(' / '),
  ok(f.blood_oath_half_monarch === true))

// 둘러대기 성공 (궁정처세는 낮고 변론이 높은 빌드)
await setGame({
  ...withFlags({ chamber_attempted: true, chamber_attempt_talk: true }),
  stats: { courtcraft: 40, rhetoric: 60, statecraft: 40, finance: 20, martial: 20 },
})
const talkOk = await runTurn()
f = await flagsOf()
log('C2 ★ 변론 특화 빌드는 둘러대기로 살아남음:', talkOk.join(' / '),
  ok(f.blood_oath_half_monarch === true))

// 실패 — 어느 체크도 못 넘김
await setGame({
  ...withFlags({
    queen_chamber_searched: true, chamber_attempted: true, chamber_attempt_hide: true,
  }),
  stats: { courtcraft: 40, rhetoric: 30, statecraft: 40, finance: 20, martial: 20 },
})
const beforeCaught = await stateOf()
const caught = await runTurn()
const afterCaught = await stateOf()
f = afterCaught.flags
log('C3 ★ 체크 실패 → 발각:', caught.join(' / '), ok(caught.includes('들켰다')))
log('C4 위기 flag 진입:', `alert=${f.queen_alert_max} poison=${f.queen_poison_path}`,
  ok(f.queen_alert_max === true && f.queen_poison_path === true))
log('C5 반쪽은 못 얻음:', ok(!f.blood_oath_half_monarch))
log('C6 대가:',
  `의심 ${beforeCaught.regentSuspicion}→${afterCaught.regentSuspicion}`,
  `심신 ${beforeCaught.wellbeing}→${afterCaught.wellbeing}`,
  `영향도 ${beforeCaught.courtInfluence}→${afterCaught.courtInfluence}`)
log('C7 ★ 스탯은 깎지 않음 (배우고 쌓은 것은 남는다):',
  ok(JSON.stringify(beforeCaught.stats) === JSON.stringify(afterCaught.stats)))
log('C8 ★ 진실 도달은 취소되지 않음:',
  ok(f.clue_apothecary === true))
await page.screenshot({ path: `${OUT}/01-caught.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== D. ★ 발각 후 재기 가능성 (함정 아님을 실측) ===')
// 발각당한 그 세이브로 계속 플레이한다. 회복되는가?
let recover = await stateOf()
const caughtLow = { wellbeing: recover.wellbeing, influence: recover.courtInfluence }
for (let turn = 0; turn < 8; turn++) {
  await setGame({ phase: 'schedule', actionPoints: 3, plannedActivityIds: [] })
  // 심신이 낮으면 휴식, 회복되면 실권 되찾기
  const s = await stateOf()
  const plan = s.wellbeing < 50 ? ['rest', 'rest', 'rest'] : ['direct-decree', 'rest']
  await setGame({ plannedActivityIds: plan })
  await page.getByRole('button', { name: /턴 종료/ }).click()
  await page.waitForTimeout(300)
  for (let i = 0; i < 5; i++) {
    const b = page.getByRole('button', { name: /다음 달로|무슨 일이|계속/ })
    if (!(await b.isVisible().catch(() => false))) break
    await b.click()
    await page.waitForTimeout(300)
    await advanceScene(page)
  }
}
recover = await stateOf()
log(`   발각 직후  심신 ${caughtLow.wellbeing}  영향도 ${caughtLow.influence}`)
log(`   8계절 후   심신 ${recover.wellbeing}  영향도 ${recover.courtInfluence}`)
log('D1 ★ 심신이 회복됨:', ok(recover.wellbeing > caughtLow.wellbeing))
log('D2 ★ 영향도를 되찾음:', ok(recover.courtInfluence >= caughtLow.influence))
log('D3 ★ 게임이 끝나지 않고 계속 진행됨:', recover.phase, ok(recover.phase !== 'ended'))
log('D4 ★ queen_poison_path 가 지속 손해를 주지 않음 (이번 단계에선 아무도 안 읽음):',
  ok(recover.flags.queen_poison_path === true && recover.wellbeing > caughtLow.wellbeing))
await page.screenshot({ path: `${OUT}/02-recovered.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== E. 나머지 반쪽 — 로맨스 vs 적대 (상호 배타) ===')

const romanceReady = await triggerable({
  ...BASE, age: 18,
  affection: { ...BASE.affection, heir: 75 },
  flags: { romance_unlocked: true, heir_knows_truth: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('E1 ① 깊은 관계 + heir_knows_truth → 발설 가능:',
  ok(romanceReady.includes('half-heir-romance')))

const romanceNoTruth = await triggerable({
  ...BASE, age: 18,
  affection: { ...BASE.affection, heir: 75 },
  flags: { romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('E2 heir_knows_truth 없으면 발설 안 함:',
  ok(!romanceNoTruth.includes('half-heir-romance')))

const hostileReady = await triggerable({
  ...BASE, age: 18, courtInfluence: 50, regentRapport: 40,
  flags: { romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('E3 영향도 50 + 신망 40 → 적대 수색 가능:',
  ok(hostileReady.includes('half-heir-hostile')))

// ★ 회유 트랙 보호 — 신망이 높으면 적대 수색이 아예 안 뜬다
const alliedTrack = await triggerable({
  ...BASE, age: 18, courtInfluence: 50, regentRapport: 70,
  flags: { romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('E4 ★ 신망 70(회유 트랙)이면 적대 수색이 뜨지 않음:',
  ok(!alliedTrack.includes('half-heir-hostile')))

const allied = await triggerable({
  ...BASE, age: 18, courtInfluence: 50, regentRapport: 40,
  flags: { romance_unlocked: true, regent_alliance: true, regent_won_over: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('E5 ★ 이미 동맹이면 적대 수색이 열리지 않음:',
  ok(!allied.includes('half-heir-hostile')))

// 둘 다 조건을 채우면 로맨스가 먼저 (우선순위)
const both = await page.evaluate(() => {
  window.__queeningAi.setGame({
    age: 18, courtInfluence: 50, regentRapport: 40,
    affection: { heir: 75, loyalist: 0, prince: 5, commander: 20, hero: 0 },
    flags: { romance_unlocked: true, heir_knows_truth: true },
    counters: {},
    stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
  })
  return window.__queeningAi.triggerable()
})
const rIdx = both.indexOf('half-heir-romance')
const hIdx = both.indexOf('half-heir-hostile')
log('E6 ★ 둘 다 가능하면 로맨스가 먼저 제시됨:', `발설 ${rIdx} / 강탈 ${hIdx}`,
  ok(rIdx >= 0 && (hIdx === -1 || rIdx < hIdx)))

// 적대 수색은 옵트인 — "물러난다"로 아무 일 없이 지나갈 수 있다
await setGame({
  ...BASE, age: 18, courtInfluence: 50, regentRapport: 40,
  flags: { ...SEEN_OTHERS, romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
await runTurn('물러난다')
f = await flagsOf()
log('E7 ★ "물러난다"를 고르면 결렬되지 않음:',
  `hostile=${f.regent_hostile ?? false} 반쪽=${f.blood_oath_half_heir ?? false}`,
  ok(!f.regent_hostile && !f.blood_oath_half_heir))

// 강행하면 결렬
await setGame({
  ...BASE, age: 18, courtInfluence: 50, regentRapport: 40,
  flags: { ...SEEN_OTHERS, romance_unlocked: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
await runTurn('수색을 강행한다')
f = await flagsOf()
log('E8 ★ "강행한다"는 되돌릴 수 없는 결렬:',
  `hostile=${f.regent_hostile} 반쪽=${f.blood_oath_half_heir}`,
  ok(f.regent_hostile === true && f.blood_oath_half_heir === true))

// ─────────────────────────────────────────────────────────────
log('')
log('=== F. 합체 = 확증 ===')
const halfOnly = await triggerable({
  ...BASE, age: 18,
  flags: { romance_unlocked: true, blood_oath_half_monarch: true },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
log('F1 반쪽만으론 확증 아님:', ok(!halfOnly.includes('blood-oath-complete')))

await setGame({
  ...BASE, age: 18,
  flags: {
    ...SEEN_OTHERS, romance_unlocked: true,
    blood_oath_half_monarch: true, blood_oath_half_heir: true,
  },
  stats: { courtcraft: 40, rhetoric: 40, statecraft: 40, finance: 20, martial: 20 },
})
const completed = await runTurn()
f = await flagsOf()
log('F2 ★ 두 반쪽 → 확증:', completed.join(' / '), ok(f.blood_oath_complete === true))
await page.screenshot({ path: `${OUT}/03-complete.png` })

// ─────────────────────────────────────────────────────────────
log('')
log('=== G. 세이브 ===')
await page.getByRole('button', { name: '저장', exact: true }).click()
await page.waitForTimeout(300)
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('queening.save')))
log('G1 세이브 버전:', saved.version, ok(saved.version === SAVE_VERSION))
log('G2 혈서 flag 보존:',
  ok(saved.state.flags.blood_oath_complete === true))
log('G3 호감도 보존:', ok(typeof saved.state.affection === 'object'))
log('G4 카운터 보존:', ok(typeof saved.state.counters === 'object'))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
