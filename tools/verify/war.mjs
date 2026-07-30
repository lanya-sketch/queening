/**
 * [9-C1] 참칭 전쟁 판정 + 명분별 승/패 엔딩 + 황제 호칭 검증. 엔딩 판정을 건드리므로 1만 세이브 재확인.
 *
 * ★ 명분이 "이기냐"가 아니라 "어떤 적과 싸우냐"를 바꾼다(성물/교권이면 쉽고 국력만이면 어렵다).
 * ★ "칼로 선 황제" 도달 가능(국력만 압도 → 승). ★ 전쟁 이벤트 20세 서사.
 * ★ 승리 엔딩 넷 결 다름 + 황제 호칭 엔딩 한정. ★★ 1만 세이브 수렴.
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

// warOutcome 을 임의 상태로 — base 스탯을 눌러 두고(finance/martial/courtInfluence 로만 국력을 만든다) 명분만 바꾼다.
const war = (patch) => page.evaluate((p) => {
  const q = window.__queeningAi
  const base = { stats: { finance: 0, martial: 0, courtcraft: 0 }, courtInfluence: 0, courtStanding: 0, flags: {}, counters: {}, affection: {} }
  return q.warOutcome({ ...q.state, ...base, ...p, stats: { ...base.stats, ...(p.stats || {}) }, flags: { ...base.flags, ...(p.flags || {}) } })
}, patch)
const judge = (patch) => page.evaluate((p) => {
  const q = window.__queeningAi
  return q.judgeEnding({ ...q.state, courtInfluence: 75, stats: { finance: 40, martial: 40, courtcraft: 20 }, ...p, flags: { ...(p.flags || {}) } })
}, patch)
const triggerableAt = (patch) => page.evaluate((p) => { window.__queeningAi.setGame(p); return window.__queeningAi.triggerable() }, patch)

// ── A. ★ 명분이 조건을 바꾼다 — 같은 국력(120)인데 명분에 따라 승패가 갈린다 ──
log('=== A. 명분이 "어떤 적과 싸우냐"를 바꾼다 (같은 국력 120) ===')
const S = { stats: { finance: 25, martial: 25 }, courtInfluence: 70 } // nationalPower = 120
const wRelic = await war({ ...S, flags: { legitimacy_sacred: true } })
const wChurch = await war({ ...S, flags: { church_support: true } })
const wBoth = await war({ ...S, flags: { legitimacy_sacred: true, church_support: true } })
const wForce = await war({ ...S, flags: {} })
log('A1 우리 전력 120 고정, 제국 전력만 명분이 바꾼다:',
  `성물 적=${wRelic.enemy} 교권 적=${wChurch.enemy} 둘다 적=${wBoth.enemy} 국력만 적=${wForce.enemy}`)
log('A2 ★ 성물 → 제국 약화(고립) → 승:', ok(wRelic.outcome === 'won' && wRelic.enemy < 130))
log('A3 ★ 교권 → 제국 약화 → 승:', ok(wChurch.outcome === 'won' && wChurch.enemy < 130))
log('A4 ★★ 국력만 → 제국이 명분 독점, 우리 고립(적 강화) → 같은 국력인데 패:',
  ok(wForce.outcome === 'lost' && wForce.enemy > 130))
log('A5 명분 있음 승 / 명분 없음 패 — 국력 동일:',
  ok(wRelic.outcome === 'won' && wChurch.outcome === 'won' && wForce.outcome === 'lost'))

// ── B. ★ "칼로 선 황제" — 명분 없어도 국력이 압도적이면 이긴다 ──
log('')
log('=== B. ★ 칼로 선 황제 (명분 없이 국력 압도) ===')
const wSword = await war({ stats: { finance: 70, martial: 70 }, courtInfluence: 80, flags: { military_route_open: true } })
log('B1 국력만 + 압도적(우리 전력 ' + wSword.ours + ' ≥ 적 ' + wSword.enemy + ') → 승:',
  ok(wSword.outcome === 'won'))
log('B2 ★ 명분 없어도 도달 가능 — 순수 힘의 승리가 막히지 않는다:', ok(wSword.outcome === 'won'))

// ── C. 전쟁 이벤트 20세 서사 ──
log('')
log('=== C. 전쟁 이벤트 (20세 클라이맥스) ===')
const winFires = await triggerableAt({ age: 20, flags: { empire_claimed: true, war_won: true }, counters: {}, affection: {} })
const loseFires = await triggerableAt({ age: 20, flags: { empire_claimed: true, war_lost: true }, counters: {}, affection: {} })
const noWarAt19 = await triggerableAt({ age: 19, flags: { empire_claimed: true, war_won: true }, counters: {}, affection: {} })
log('C1 ★ war_won → 승리 전쟁 이벤트 발동:', ok(winFires.includes('war-victory')))
log('C2 ★ war_lost → 패배 전쟁 이벤트 발동:', ok(loseFires.includes('war-defeat')))
log('C3 19세엔 전쟁 안 뜸(20세 클라이맥스):', ok(!noWarAt19.includes('war-victory')))
const winText = await page.evaluate(() => window.__queeningAi.eventById('war-victory').text)
log('C4 승리 이벤트가 서사로 드러남(국경/제국):', ok(winText.includes('국경') && winText.includes('제국')))

// ── D. judgeEnding — 승리 명분별 수식 / 패배 tier ──
log('')
log('=== D. 판정: 승리 명분별 수식 / 패배 tier ===')
const jRelic = await judge({ flags: { empire_claimed: true, war_won: true, legitimacy_sacred: true } })
const jChurch = await judge({ flags: { empire_claimed: true, war_won: true, church_support: true } })
const jSword = await judge({ flags: { empire_claimed: true, war_won: true } })
const jLost = await judge({ flags: { empire_claimed: true, war_lost: true } })
log('D1 ★ 성물 승리 → "하늘이 인정한 황제":', ok(jRelic.modifiers.includes('하늘이 인정한 황제')))
log('D2 ★ 교권 승리(성물X) → "교황이 관을 씌운 황제":', ok(jChurch.modifiers.includes('교황이 관을 씌운 황제')))
log('D3 ★ 국력만 승리 → "칼로 선 황제":', ok(jSword.modifiers.includes('칼로 선 황제')))
log('D4 승리 수식은 배타적(한 승리엔 하나만):',
  ok([jRelic, jChurch, jSword].every((j) =>
    ['하늘이 인정한 황제', '교황이 관을 씌운 황제', '칼로 선 황제'].filter((m) => j.modifiers.includes(m)).length === 1)))
log('D5 ★★ 패배 → tier "배드:참칭실패"(20세 엔딩 tier, 조기 데드 아님):', ok(jLost.tier === '배드:참칭실패'))
log('D6 ★ 패배 tier 는 제국복속과 별개(다 걸고 잃음 ≠ 굽혀 삼켜짐):',
  ok(jLost.tier === '배드:참칭실패' && jLost.tier !== '배드:제국복속'))
log('D7 승리는 친정 유지(참칭은 친정 전제):', ok(jRelic.tier === '친정' && jSword.tier === '친정'))

// ── E. 승리 엔딩 넷 결 다름 + 황제 호칭 엔딩 한정 ──
log('')
log('=== E. 승리 엔딩 4결 + 황제 호칭 ===')
const scenes = await page.evaluate(() => {
  const q = window.__queeningAi
  const build = (flags) => {
    const r = q.buildEndingScene({ ...q.state, courtInfluence: 75, stats: { finance: 40, martial: 40, courtcraft: 20 }, flags })
    const text = r.scene.lines.map((l) => l.text).join('\n')
    return { skeleton: r.skeletonId, text }
  }
  return {
    relic: build({ empire_claimed: true, war_won: true, legitimacy_sacred: true }),
    church: build({ empire_claimed: true, war_won: true, church_support: true }),
    sword: build({ empire_claimed: true, war_won: true }),
    lost: build({ empire_claimed: true, war_lost: true }),
  }
})
log('E1 ★ 하늘이 인정한 황제 서술:', ok(scenes.relic.text.includes('하늘이 인정한 황제')))
log('E2 ★ 교황이 관을 씌운 황제 서술:', ok(scenes.church.text.includes('교황이 관을 씌운 황제')))
log('E3 ★ 칼로 선 황제 서술:', ok(scenes.sword.text.includes('칼로 선 황제')))
log('E4 ★ 패배 골격(bad-usurp-failed):', ok(scenes.lost.skeleton === 'bad-usurp-failed'))
log('E5 넷의 서술이 서로 다름:',
  ok(new Set([scenes.relic.text, scenes.church.text, scenes.sword.text, scenes.lost.text]).size === 4))
// 황제 호칭 — {황제} 토큰(성별 반영), {왕}은 안 건드려 조사 안전
const titles = await page.evaluate(() => {
  const q = window.__queeningAi
  const m = (g) => ({
    emperor: q.resolveWith('{황제}', { ...q.state, monarchGender: g, flags: { emperor: true } }),
    king: q.resolveWith('{왕}', { ...q.state, monarchGender: g, flags: { emperor: true } }),
  })
  return { male: m('male'), female: m('female') }
})
log('E6 ★ {황제} 토큰 성별 반영(황제/여제):',
  ok(titles.male.emperor === '황제' && titles.female.emperor === '여제'))
log('E7 ★★ {왕} 은 emperor 여도 왕/여왕 그대로(조사 보존 — 기존 텍스트 안 깨짐):',
  ok(titles.male.king === '왕' && titles.female.king === '여왕'))
log('E8 ★ 승리 삽입에만 황제 호칭(선포 삽입은 {왕} 안 씀 — 게임 중 노출 없음):',
  ok(scenes.sword.text.includes('황제') && !scenes.sword.text.includes('황제은') && !scenes.sword.text.includes('황제이')))

// ── F. ★★ 1만 세이브 완전성 — 새 tier·flag 늘어도 하나로 수렴 ──
log('')
log('=== F. ★★ 1만 세이브 완전성 (전쟁 경로 포함) ===')
const sweep = await page.evaluate((trials) => {
  const q = window.__queeningAi
  const NEW = ['empire_claimed', 'war_won', 'war_lost', 'war_resolved', 'emperor',
    'legitimacy_sacred', 'church_support', 'holy_kingdom', 'proclaimed']
  const OLD = ['house_commons_defended', 'crown_centralized', 'military_route_open', 'prince_conquered', 'people_favor', 'union_possible']
  let allOne = true, exampleBad = null, sawUsurpFail = false, sawWarWin = false
  const base = q.state
  for (let i = 0; i < trials; i++) {
    const flags = {}
    for (const f of [...NEW, ...OLD]) if (Math.random() < 0.5) flags[f] = true
    const influence = Math.floor(Math.random() * 101)
    const standing = Math.floor(Math.random() * 101)
    const r = q.judgeEnding({ ...base, courtInfluence: influence, courtStanding: standing, flags })
    if (!r || typeof r.tier !== 'string' || r.tier.length === 0) { allOne = false; exampleBad = { flags, influence }; break }
    if (r.tier === '배드:참칭실패') sawUsurpFail = true
    if (flags.war_won && r.modifiers.some((m) => m.includes('황제'))) sawWarWin = true
  }
  return { allOne, exampleBad, sawUsurpFail, sawWarWin }
}, 10000)
log('F1 ★★ 무작위 세이브 1만 개 — 예외 없이 하나의 엔딩으로 수렴:',
  ok(sweep.allOne) + (sweep.exampleBad ? ' 반례:' + JSON.stringify(sweep.exampleBad) : ''))
log('F2 참칭실패 tier 가 실제로 도달됨(무작위 중):', ok(sweep.sawUsurpFail))
log('F3 승리 황제 수식이 실제로 도달됨(무작위 중):', ok(sweep.sawWarWin))

// ── G. turn.ts 통합 — empire_claimed + 20세에 endTurn 이 실제로 승/패 flag 를 굳힌다 ──
log('')
log('=== G. endTurn 통합 (20세 참칭 → 전쟁 판정 자동) ===')
const stepped = await page.evaluate(() => {
  const q = window.__queeningAi
  const run = (patch) => {
    const st = q.state
    q.setGame({ ...st, phase: 'idle', pendingEventIds: [], counters: {}, affection: {}, ...patch,
      stats: { ...st.stats, ...(patch.stats || {}) }, flags: { ...(patch.flags || {}) } })
    q.stepTurn()
    const f = q.state.flags
    return { resolved: f.war_resolved === true, won: f.war_won === true, lost: f.war_lost === true, emperor: f.emperor === true }
  }
  return {
    strong: run({ age: 20, stats: { finance: 70, martial: 70 }, courtInfluence: 80, flags: { empire_claimed: true, military_route_open: true } }),
    weak: run({ age: 20, stats: { finance: 20, martial: 20 }, courtInfluence: 70, flags: { empire_claimed: true } }),
    young: run({ age: 19, stats: { finance: 70, martial: 70 }, courtInfluence: 80, flags: { empire_claimed: true } }),
  }
})
log('G1 ★ 20세 참칭 + 강함 → endTurn 이 승리 확정 + 황제:',
  ok(stepped.strong.resolved && stepped.strong.won && stepped.strong.emperor))
log('G2 ★ 20세 참칭 + 약함(국력만) → 패배 확정(황제 아님):',
  ok(stepped.weak.resolved && stepped.weak.lost && !stepped.weak.emperor))
log('G3 19세엔 아직 전쟁 판정 안 함(20세부터):', ok(!stepped.young.resolved))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
