/**
 * [9-B] 선포 + 교권 + 명분(국제 정당성) 검증. 엔딩 판정을 건드리므로 1만 세이브 재확인.
 *
 * ★ 성물만으론 신성국 안 됨(church_support 필수) / 명분 4조합 / 교권 대가(노선 무효화, 성물 shield)
 *   / 신성국 modifier / ★★ 1만 세이브 수렴.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)
await page.evaluate(() => { window.__queeningAi.setDeterministic(true); window.__queeningAi.setMinorEnabled(false) })

const triggerableAt = (patch) => page.evaluate((p) => {
  window.__queeningAi.setGame(p); return window.__queeningAi.triggerable()
}, patch)
const choiceIds = (id) => page.evaluate((i) => window.__queeningAi.eventById(i).choices.map((c) => c.id), id)
const judge = (patch) => page.evaluate((p) => window.__queeningAi.judgeEnding({ ...window.__queeningAi.state, ...p }), patch)

// ── A. 명분 원천 분리 — 성물은 church_support 를 안 세운다 ──
log('=== A. 명분 원천 분리 (성물 ≠ 교권) ===')
const scrollFlags = await page.evaluate(() => ({
  love: window.__queeningAi.eventById('hero-sacred-scroll').setFlags,
  faith: window.__queeningAi.eventById('scroll-by-faith').setFlags,
}))
log('A1 ★ 사랑 두루마리 = legitimacy_sacred 만(church_support 안 세움):',
  ok(scrollFlags.love.legitimacy_sacred === true && !scrollFlags.love.church_support))
log('A2 ★ 믿음 두루마리 = legitimacy_sacred 만:',
  ok(scrollFlags.faith.legitimacy_sacred === true && !scrollFlags.faith.church_support))

// ── B. 교회와 손잡기 — church_favor gate, 수락 → church_support + 대가 ──
log('')
log('=== B. 교회와 손잡기 ===')
const allianceFires = await triggerableAt({ age: 18, courtInfluence: 50, faith: 70, flags: { church_favor: true, church_support: false, church_alliance_declined: false }, counters: {}, affection: {} })
log('B1 ★ 대주교 호의 후 교회 동맹 제안:', ok(allianceFires.includes('church-alliance')))
const allianceAccept = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ age: 18, courtInfluence: 50, faith: 70, phase: 'event', flags: { church_favor: true, church_support: false, church_alliance_declined: false }, counters: {}, affection: {}, pendingEventIds: ['church-alliance'] })
  q.choose('church-alliance', 'accept')
  return { support: q.state.flags.church_support === true, veto: q.state.flags.church_vetoes_reform === true }
})
log('B2 ★ 수락 → church_support + church_vetoes_reform(대가):', JSON.stringify(allianceAccept),
  ok(allianceAccept.support && allianceAccept.veto))

// ── C. 선포 결정 — 신성국(church_support 필수)/참칭/안함 ──
log('')
log('=== C. 선포 결정 ===')
const procChoices = await choiceIds('proclamation')
log('C1 선포 3갈래(신성국/참칭/안함):', procChoices.join(', '), ok(procChoices.length === 3))
const procFires = await triggerableAt({ age: 19, courtInfluence: 75, flags: { empire_decline_3: true, proclaimed: false }, counters: {}, affection: {} })
log('C2 ★ 제국 붕괴 + 친정(75) → 선포 발동:', ok(procFires.includes('proclamation')))
const notAutonomy = await triggerableAt({ age: 19, courtInfluence: 50, flags: { empire_decline_3: true, proclaimed: false }, counters: {}, affection: {} })
log('C3 ★ 친정 미달(50)이면 선포 안 뜸(신성국·참칭은 실권 전제):', ok(!notAutonomy.includes('proclamation')))

// ★★ 성물만 있는 왕은 신성국이 안 된다 — holy 선택이 church_support 를 요구
const holyReq = await page.evaluate(() => window.__queeningAi.eventById('proclamation').choices.find((c) => c.id === 'holy').requires)
log('C4 ★★ 신성국은 church_support 필수(성물만으론 안 됨):', JSON.stringify(holyReq),
  ok(holyReq?.flags?.church_support === true))

// 참칭 → empire_claimed, 명분 4조합이 상태로 남는지
const claimCombo = await page.evaluate(() => {
  const q = window.__queeningAi
  const run = (relic, church) => {
    q.setGame({ age: 19, courtInfluence: 75, phase: 'event', flags: { empire_decline_3: true, proclaimed: false, legitimacy_sacred: relic, church_support: church }, counters: {}, affection: {}, pendingEventIds: ['proclamation'] })
    q.choose('proclamation', 'usurp')
    const f = q.state.flags
    return { claimed: f.empire_claimed === true, relic: f.legitimacy_sacred === true, church: f.church_support === true }
  }
  return { both: run(true, true), relic: run(true, false), church: run(false, true), force: run(false, false) }
})
log('C5 ★ 참칭 명분 4조합 기록(성물/교권/둘다/국력만) — [9-C]가 읽을 수 있게:',
  ok(claimCombo.both.claimed && claimCombo.both.relic && claimCombo.both.church
    && claimCombo.relic.relic && !claimCombo.relic.church
    && claimCombo.church.church && !claimCombo.church.relic
    && claimCombo.force.claimed && !claimCombo.force.relic && !claimCombo.force.church))

// ── D. 교권 대가 — 노선 무효화, 성물이 shield ──
log('')
log('=== D. 교권 대가 (노선 무효화 / 성물 shield) ===')
const reformBase = { courtInfluence: 75, flags: { house_commons_defended: true, crown_centralized: true, late_king_reform: true, holy_kingdom: true } }
const vetoed = await judge({ ...reformBase, flags: { ...reformBase.flags, church_vetoes_reform: true } })
const shielded = await judge({ ...reformBase, flags: { ...reformBase.flags, church_vetoes_reform: true, legitimacy_sacred: true } })
log('D1 ★ church_vetoes_reform → 개혁 노선(하원·중앙집권·선왕개혁) 무효화:',
  ok(!vetoed.nationFlags.includes('house_commons_defended') && !vetoed.nationFlags.includes('crown_centralized') && !vetoed.nationFlags.includes('late_king_reform')))
log('D2 ★ 성물(legitimacy_sacred) 있으면 노선 지켜짐(shield):',
  ok(shielded.nationFlags.includes('house_commons_defended') && shielded.nationFlags.includes('late_king_reform')))

// ── E. 신성국 modifier ──
log('')
log('=== E. 신성국 modifier ===')
const holy = await judge({ courtInfluence: 75, flags: { holy_kingdom: true } })
const holyNoAutonomy = await judge({ courtInfluence: 50, flags: { holy_kingdom: true } })
log('E1 ★ holy_kingdom + 친정 → "관을 받은 왕" 수식:', ok(holy.modifiers.includes('관을 받은 왕')))
log('E2 ★ 친정 미달이면 수식 안 붙음(친정 전제):', ok(!holyNoAutonomy.modifiers.includes('관을 받은 왕')))

// ── F. ★★ 1만 세이브 완전성 — 새 flag 늘어도 하나로 수렴 ──
log('')
log('=== F. ★★ 1만 세이브 완전성 (새 경로 포함) ===')
const sweep = await page.evaluate((trials) => {
  const q = window.__queeningAi
  const NEW = ['holy_kingdom', 'empire_claimed', 'church_support', 'church_vetoes_reform', 'legitimacy_sacred', 'proclaimed', 'empire_defied', 'empire_decline_3']
  const OLD = ['house_commons_defended', 'crown_centralized', 'late_king_reform', 'regent_disposed', 'tyrant_purge']
  let allOne = true, exampleBad = null
  const base = q.state
  for (let i = 0; i < trials; i++) {
    const flags = {}
    for (const f of [...NEW, ...OLD]) if (Math.random() < 0.5) flags[f] = true
    const influence = Math.floor(Math.random() * 101)
    const r = q.judgeEnding({ ...base, courtInfluence: influence, flags })
    // 판정은 예외 없이 정확히 하나의 tier 를 낸다(빠짐없음).
    if (!r || typeof r.tier !== 'string' || r.tier.length === 0) { allOne = false; exampleBad = { flags, influence }; break }
  }
  return { allOne, exampleBad }
}, 10000)
log('F1 ★★ 무작위 세이브 1만 개 — 예외 없이 하나의 엔딩으로 수렴:',
  ok(sweep.allOne) + (sweep.exampleBad ? ' 반례:' + JSON.stringify(sweep.exampleBad) : ''))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
