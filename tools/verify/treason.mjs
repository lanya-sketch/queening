/**
 * 처분 갈래 + 연판장 검증 ([4] B 라운드).
 *
 * A. 연판장 획득 — 암살 자백(궁정처세/변론≥30)·집무실 수색. ★ ① 없이. 균형 빌드 자백 17·18세 실측.
 * B. 정당성 판정 — 혈서/연판장/반란 중 하나면 「명분을 들어 심판」 열림, 증거無면 폭군만.
 * C. 이름들 4갈래 — 전부/주모자만/공표(민심 or 권세≥55)/덮어둠.
 * D. 모후 3갈래 — 처형(여론이 대가)/폐탑 유폐/방치.
 * E. 집무실 place — 왕대비궁 패턴(부재 roll → 수색 → 연판장).
 * F. 엔딩 수렴 — 새 flag 조합에도 judgeEnding 이 하나로 수렴.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
// ★ 결정론 + 소소 이벤트 off — dispose/namesDenounce 의 stepTurn 이 무작위 이벤트로 흔들리지 않게.
await page.evaluate(() => { window.__queeningAi.setDeterministic(true); window.__queeningAi.setMinorEnabled(false) })

const forceChoice = async (eventId, advance = true) => {
  // ★ EventScreen 을 언마운트(schedule)했다 다시 띄운다 — 같은 이벤트를 재-force 할 때
  //   이전 chosen 상태가 남아 선택지가 안 뜨는 것을 막는다.
  await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', pendingEventIds: [] }))
  await page.waitForTimeout(80)
  await page.evaluate((id) => window.__queeningAi.forceEvent(id), eventId)
  await page.waitForTimeout(200)
  if (advance) { await page.locator('[data-scene-advance]').click().catch(() => {}); await page.waitForTimeout(150) }
}
const choiceLocked = (id) => page.locator(`[data-choice="${id}"]`).getAttribute('data-locked').catch(() => '?')

// ── A. 연판장 획득 (① 없이) ──
log('=== A. 연판장 획득 (① 없이) ===')
// 자백 게이트: 궁정처세≥30 or 변론≥30
await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 18, courtInfluence: 80, regentSuspicion: 80,
  stats: { statecraft: 40, finance: 30, rhetoric: 20, martial: 30, courtcraft: 34 },
  flags: { declared_rule: true, assassin_evidence: true, collective_treason: false }, counters: {} }))
await page.waitForTimeout(150)
log('A1 자객의 입 발동(assassin_evidence):', ok((await page.evaluate(() => window.__queeningAi.triggerable())).includes('assassin-confession')))
// ★ 락 검사들은 선택지를 클릭하지 않는다(발동만) — 클릭(획득)은 맨 마지막에.
const setAssassin = (stats) => page.evaluate((s) => window.__queeningAi.setGame({ phase: 'schedule', age: 18,
  stats: { statecraft: 40, finance: 30, martial: 30, ...s }, flags: { declared_rule: true, assassin_evidence: true, collective_treason: false } }), stats)
await setAssassin({ rhetoric: 20, courtcraft: 34 }); await forceChoice('assassin-confession')
log('A2 ★ 궁정처세 34 → 소문 흘리기 열림(균형 17세 근사):', ok((await choiceLocked('spread-court')) === 'false'))
await setAssassin({ rhetoric: 35, courtcraft: 20 }); await forceChoice('assassin-confession')
log('A3 ★ 변론 35 → 어전 공언 열림:', ok((await choiceLocked('spread-rhetoric')) === 'false'))
await setAssassin({ rhetoric: 20, courtcraft: 20 }); await forceChoice('assassin-confession')
log('A4 ★ 궁정처세·변론 둘 다 미달 → 소문 경로 잠김(집무실로):',
  ok((await choiceLocked('spread-court')) === 'true' && (await choiceLocked('spread-rhetoric')) === 'true'))
// ★ 균형 빌드 자백 실측 — 17세 34 / 18세 39 둘 다 열려야
for (const [age, cc] of [['17세', 34], ['18세', 39]]) {
  await setAssassin({ rhetoric: 25, courtcraft: cc }); await forceChoice('assassin-confession')
  log(`A5 ★ 균형 빌드 ${age}(궁정처세 ${cc}) 자백 소문 먹힘:`, ok((await choiceLocked('spread-court')) === 'false'))
}
// 실제 획득 (맨 마지막 — 클릭으로 해결)
await setAssassin({ rhetoric: 35, courtcraft: 34 }); await forceChoice('assassin-confession')
await page.locator('[data-choice="spread-rhetoric"]').click().catch(() => {})
await page.waitForTimeout(200)
log('A6 ★ 자백 → collective_treason 확보:', ok(await page.evaluate(() => window.__queeningAi.state.flags.collective_treason === true)))

// ── B. 정당성 판정 (4갈래) ──
log('')
log('=== B. 처분 정당성 (혈서/연판장/반란 → 정당, 증거無 → 폭군) ===')
const dispose = async (flags) => {
  await page.evaluate((f) => window.__queeningAi.setGame({ phase: 'schedule', age: 19, courtInfluence: 80, regentSuspicion: 50,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }, flags: { declared_rule: true, regent_alliance: false, regent_disposed: false, ...f }, counters: {} }), flags)
  // purge_justified 는 turn.ts 파생 — 한 턴 굴려 굳힌다.
  await page.evaluate(() => window.__queeningAi.stepTurn(['rest', 'rest', 'rest']))
  await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 19, courtInfluence: 80 }))
  await forceChoice('regent-disposal')
  return (await choiceLocked('just'))
}
log('B1 ★ 연판장 → 명분 심판 열림:', ok((await dispose({ collective_treason: true })) === 'false'))
log('B2 ★ 반란 진압 → 명분 심판 열림:', ok((await dispose({ rebellion_crushed: true })) === 'false'))
log('B3 혈서 → 명분 심판 열림(기존):', ok((await dispose({ blood_oath_complete: true })) === 'false'))
log('B4 ★ 증거無 → 명분 심판 잠김(폭군만):', ok((await dispose({})) === 'true'))

// ── C. 이름들 4갈래 (공표 게이트) ──
log('')
log('=== C. 연판장 이름들 (공표 = 민심 or 권세≥55) ===')
const namesDenounce = async (flags) => {
  await page.evaluate((f) => window.__queeningAi.setGame({ phase: 'schedule', age: 19, courtStanding: 10,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 },
    flags: { declared_rule: true, collective_treason: true, treason_handled: false, ...f }, counters: {} }), flags)
  await page.evaluate(() => window.__queeningAi.stepTurn(['rest', 'rest', 'rest']))
  await forceChoice('treason-names')
  return (await choiceLocked('denounce'))
}
log('C1 이름들 처리 발동(연판장 보유):', ok(await page.evaluate(() => {
  window.__queeningAi.setGame({ phase: 'schedule', age: 19, flags: { collective_treason: true, treason_handled: false } })
  return window.__queeningAi.triggerable().includes('treason-names')
})))
// 민심(안도 flag 2개 → people_favor) 있으면 공표 열림
log('C2 ★ 민심 있으면 공표 열림:', ok((await namesDenounce({ people_relieved_a: true, people_relieved_b: true })) === 'false'))
// 권세≥55 (king_trusted) 있으면 공표 열림
const denounceStanding = await (async () => {
  await page.evaluate(() => window.__queeningAi.setGame({ phase: 'schedule', age: 19, courtStanding: 60,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 },
    flags: { declared_rule: true, collective_treason: true, treason_handled: false }, counters: {} }))
  await page.evaluate(() => window.__queeningAi.stepTurn(['rest', 'rest', 'rest']))
  await forceChoice('treason-names')
  return await choiceLocked('denounce')
})()
log('C3 ★ 권세≥55 있으면 공표 열림:', ok(denounceStanding === 'false'))
log('C4 ★ 민심·권세 둘 다 없으면 공표 잠김:', ok((await namesDenounce({})) === 'true'))

// ── D. 모후 3갈래 (여론이 대가) ──
log('')
log('=== D. 모후 처분 (여론이 처형의 무게) ===')
log('D1 모후 처분 발동(truth_mother_mastermind):', ok(await page.evaluate(() => {
  window.__queeningAi.setGame({ phase: 'schedule', age: 19, flags: { truth_mother_mastermind: true } })
  return window.__queeningAi.triggerable().includes('queen-disposal')
})))
const queenMod = (flags, choice) => page.evaluate((a) => {
  const base = { courtInfluence: 60, regentSuspicion: 30, stats: { statecraft: 50, finance: 40, rhetoric: 40, martial: 40, courtcraft: 40 }, affection: { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 } }
  return window.__queeningAi.judgeEnding({ ...base, flags: { truth_regent_involved: true, truth_mother_mastermind: true, [a.choice]: true, ...a.flags } }).modifiers
}, { flags, choice })
log('D2 ★ 처형 + 여론 나쁨 → 「민심을 잃은 처형」:', JSON.stringify(await queenMod({ people_favor: false }, 'queen_executed')),
  ok((await queenMod({ people_favor: false }, 'queen_executed')).includes('민심을 잃은 처형')))
log('D3 ★ 처형 + 여론 좋음 → 「어머니를 벤 손」만(민심 대가 없음):', await (async () => {
  const m = await queenMod({ people_favor: true }, 'queen_executed')
  return ok(m.includes('어머니를 벤 손') && !m.includes('민심을 잃은 처형'))
})())
log('D4 ★ 폐탑 유폐 → 「폐탑의 어머니」:', ok((await queenMod({}, 'queen_confined')).includes('폐탑의 어머니')))

// ── E. 집무실 place (왕대비궁 패턴) ──
log('')
log('=== E. 섭정공 집무실 (부재 → 수색 → 연판장) ===')
const officeSearch = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 18, actionPoints: 3, courtStanding: 20,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 45 },
    flags: { rebellion_warned: true, collective_treason: false }, counters: {} }) // knowsTreason via rebellion_warned, courtcraft≥40
  q.forceQueenAbsent(true) // 공유 forceAbsent → 부재 강제
  const ev = q.visit('office')
  q.forceQueenAbsent(null)
  return ev
})
log('E1 ★ 부재+자격 → office-search 발동:', officeSearch, ok(officeSearch === 'office-search'))
await page.waitForTimeout(200)
await page.locator('[data-scene-advance]').click().catch(() => {})
await page.waitForTimeout(150)
await page.locator('[data-choice="take"]').click().catch(() => {})
await page.waitForTimeout(200)
log('E2 ★ 챙긴다 → collective_treason:', ok(await page.evaluate(() => window.__queeningAi.state.flags.collective_treason === true)))
// 재실 — 정무 이야기(수색 아님)
const officeAudience = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 18, actionPoints: 3, flags: { rebellion_warned: true, collective_treason: false }, counters: {} })
  q.forceQueenAbsent(false) // 재실 강제
  const ev = q.visit('office')
  q.forceQueenAbsent(null)
  return ev
})
log('E3 재실 → 정무 이야기(visit-office, 수색 아님):', officeAudience, ok(officeAudience === 'visit-office'))

// ── F. 엔딩 수렴 ──
log('')
log('=== F. 엔딩 수렴 ===')
const conv = await page.evaluate(() => {
  const base = { courtInfluence: 80, regentSuspicion: 40, stats: { statecraft: 50, finance: 40, rhetoric: 40, martial: 40, courtcraft: 40 }, affection: { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 } }
  const combos = [
    { just_purge: true, collective_treason: true, nobles_purged_all: true, queen_executed: true, people_favor: false },
    { just_purge: true, collective_treason: true, treason_denounced: true, queen_confined: true },
    { tyrant_purge: true, treason_concealed: true, queen_left: true },
    { regent_retired: true, collective_treason: true, nobles_purged_leader: true },
  ]
  return combos.map((f) => { try { const r = window.__queeningAi.judgeEnding({ ...base, flags: f }); return r.tier + '/' + r.disposal } catch (e) { return 'ERR:' + e.message } })
})
log('F1 ★ 처분 조합 4종 판정 수렴(에러 없이 하나로):', JSON.stringify(conv), ok(conv.every((c) => !c.startsWith('ERR'))))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
