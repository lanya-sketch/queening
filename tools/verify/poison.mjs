/**
 * 모후의 약 — 중반 전개 검증 (M3-pending #3 회수).
 *
 * A. 안 탄 플레이 무영향 — queen_poison_path 없으면 E1~E3 안 뜬다(대부분의 플레이).
 * B. 단계 전개 — 발각 후 E1(탕약이 다시) → E2(가라앉는 날들) → E3(끊어낼 기회) 순으로.
 * C. 막을 기회(3종 게이트) — 궁정처세/②사촌(loyalist 호감)/신뢰. 하나라도 충족→차단(averted).
 *    셋 다 미달이면 「버틴다」만 열리고 averted 안 섬.
 * D. ★ 재기 여지 — averted 면 꼭두각시 탈출. 미차단이라도 유예(심신/궁정처세 60)면 탈출.
 * E. ② 시녀장 사촌 씨앗의 두 번째 회수 — cousin 선택지 텍스트에 사촌·시녀장.
 * F. 판정 직교 — poison_path 없으면 dosing/fog flag 가 있어도 꼭두각시 아님.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const setGame = (p) => page.evaluate((pp) => window.__queeningAi.setGame(pp), p)
const triggerable = () => page.evaluate(() => window.__queeningAi.triggerable())
const forceEvent = (id) => page.evaluate((i) => window.__queeningAi.forceEvent(i), id)
const flagOf = (f) => page.evaluate((k) => window.__queeningAi.state.flags[k] === true, f)
const BASE_STATS = { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 }

// ── A. 안 탄 플레이 무영향 ────────────────────────────────
log('=== A. 안 탄 플레이 무영향 ===')
await setGame({ phase: 'schedule', age: 17, flags: {} })
const t0 = await triggerable()
log('A1 poison_path 없음 → E1~E3 안 뜸:',
  ok(!t0.includes('poison-resumes') && !t0.includes('poison-fog') && !t0.includes('poison-crisis')))

// ── B. 단계 전개 ──────────────────────────────────────────
log('')
log('=== B. 단계 전개 (E1→E2→E3) ===')
await setGame({ phase: 'schedule', age: 17, flags: { queen_poison_path: true } })
const t1 = await triggerable()
log('B1 발각 직후 → E1(탕약이 다시) 뜸:', ok(t1.includes('poison-resumes')))
log('B2 아직 E2·E3 안 뜸:', ok(!t1.includes('poison-fog') && !t1.includes('poison-crisis')))
// E1 이 queen_dosing 을 세운 뒤(+18세) → E2, E1 은 사라짐.
await setGame({ phase: 'schedule', age: 18, flags: { queen_poison_path: true, queen_dosing: true } })
const t2 = await triggerable()
log('B3 dosing+18세 → E2(가라앉는 날들) 뜨고 E1 사라짐:',
  ok(t2.includes('poison-fog') && !t2.includes('poison-resumes')))
// E2 가 poison_fog 를 세운 뒤(+19세) → E3.
await setGame({ phase: 'schedule', age: 19, flags: { queen_poison_path: true, queen_dosing: true, poison_fog: true } })
const t3 = await triggerable()
log('B4 fog+19세 → E3(끊어낼 기회) 뜨고 E2 사라짐:',
  ok(t3.includes('poison-crisis') && !t3.includes('poison-fog')))

// ── C. 막을 기회 (3종 게이트 + averted) ───────────────────
log('')
log('=== C. 막을 기회 (3종 게이트) ===')
const crisisFlags = { queen_poison_path: true, queen_dosing: true, poison_fog: true }
const AFF0 = { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 }
// 위기를 한 번만 강제 발동하고(선택 전), 스탯만 바꿔 게이트 열림/잠김을 관측한다 —
// 선택하면 '결과' 뷰로 넘어가 재발동해도 선택지가 안 돌아오므로 클릭은 마지막에 한 번만.
await setGame({
  phase: 'schedule', age: 19, pendingEventIds: [],
  stats: { ...BASE_STATS }, affection: { ...AFF0 }, tutorTrust: 0, flags: { ...crisisFlags },
})
await page.waitForTimeout(120)
await forceEvent('poison-crisis')
await page.waitForTimeout(250)
const gate = async (patch, id) => {
  await setGame(patch)
  await page.waitForTimeout(150)
  return page.locator(`[data-choice="${id}"]`).isEnabled()
}
log('C1 궁정처세 45 → 「약을 알아본다」 열림:',
  ok(await gate({ stats: { ...BASE_STATS, courtcraft: 45 }, affection: { ...AFF0 }, tutorTrust: 0 }, 'detect')))
log('C2 ★ ② 호감 45 → 「충신 가문에 기댄다」 열림:',
  ok(await gate({ stats: { ...BASE_STATS, courtcraft: 30 }, affection: { ...AFF0, loyalist: 45 }, tutorTrust: 0 }, 'cousin')))
log('C3 신뢰 40 → 「가정교사에게 맡긴다」 열림:',
  ok(await gate({ stats: { ...BASE_STATS, courtcraft: 30 }, affection: { ...AFF0 }, tutorTrust: 40 }, 'tutor')))
// 셋 다 미달 — 게이트 잠기고 버틴다만.
await setGame({ stats: { ...BASE_STATS, courtcraft: 30 }, affection: { ...AFF0 }, tutorTrust: 0 })
await page.waitForTimeout(150)
const locked = {
  detect: await page.locator('[data-choice="detect"]').isDisabled(),
  cousin: await page.locator('[data-choice="cousin"]').isDisabled(),
  tutor: await page.locator('[data-choice="tutor"]').isDisabled(),
  endure: await page.locator('[data-choice="endure"]').isEnabled(),
}
log('C4 ★ 아무것도 없는 플레이어 → 3게이트 잠김·버틴다만 열림:',
  JSON.stringify(locked), ok(locked.detect && locked.cousin && locked.tutor && locked.endure))
// 세 차단 선택지가 모두 queen_poison_averted 를 세운다(정의).
const blockSets = await page.evaluate(() => {
  const ev = window.__queeningAi.events().find((e) => e.id === 'poison-crisis')
  return ['detect', 'cousin', 'tutor'].every(
    (id) => ev.choices.find((c) => c.id === id)?.setFlags?.queen_poison_averted === true)
})
log('C5 세 차단 선택지가 averted 를 세움(정의):', ok(blockSets))
// averted 실제 반영 — 궁정처세 45 로 열어 「약을 알아본다」 클릭(선택 전이라 살아 있음).
await setGame({ stats: { ...BASE_STATS, courtcraft: 45 }, affection: { ...AFF0 }, tutorTrust: 0 })
await page.waitForTimeout(150)
await page.locator('[data-choice="detect"]').click()
await page.waitForTimeout(250)
log('C6 ★ 차단 선택 → queen_poison_averted 실제로 섬:', ok(await flagOf('queen_poison_averted')))

// ── D. 재기 여지 (판정) ───────────────────────────────────
log('')
log('=== D. 재기 여지 (20세 판정) ===')
const judge = (over) => page.evaluate((o) => {
  const g = window.__queeningAi
  const st = {
    ...g.state, age: 21,
    stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 30 },
    courtInfluence: 40, wellbeing: 40, regentSuspicion: 30, regentRapport: 30,
    ...o, flags: { ...o.flags },
  }
  return g.judgeEnding(st).tier
}, over)
log('D1 poison_path·미차단·낮은 심신/궁정처세 → 배드:꼭두각시:',
  await judge({ flags: { queen_poison_path: true } }), ok((await judge({ flags: { queen_poison_path: true } })) === '배드:꼭두각시'))
log('D2 ★ averted → 꼭두각시 아님(정상 판정으로):',
  ok((await judge({ flags: { queen_poison_path: true, queen_poison_averted: true } })) !== '배드:꼭두각시'))
log('D3 ★ 재기 — 심신 65(유예) → 꼭두각시 아님:',
  ok((await judge({ wellbeing: 65, flags: { queen_poison_path: true } })) !== '배드:꼭두각시'))
log('D4 ★ 재기 — 궁정처세 65(유예) → 꼭두각시 아님:',
  ok((await judge({ stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 65 }, flags: { queen_poison_path: true } })) !== '배드:꼭두각시'))

// ── E. ② 시녀장 사촌 씨앗 회수 ────────────────────────────
log('')
log('=== E. ② 시녀장 사촌 씨앗 회수 ===')
const cousinText = await page.evaluate(() => {
  const ev = window.__queeningAi.events().find((e) => e.id === 'poison-crisis')
  return ev.choices.find((c) => c.id === 'cousin')?.resultText ?? ''
})
log('E1 ★ cousin 결과에 사촌·시녀장 회수:',
  ok(cousinText.includes('사촌') && cousinText.includes('시녀장')))

// ── F. 판정 직교 ──────────────────────────────────────────
log('')
log('=== F. 판정 직교 (안 탄 플레이) ===')
log('F1 poison_path 없으면 dosing/fog flag 있어도 꼭두각시 아님:',
  ok((await judge({ flags: { queen_dosing: true, poison_fog: true } })) !== '배드:꼭두각시'))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
