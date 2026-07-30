/**
 * [8] 엔딩 직전 결산 검증 — 청산을 9년의 결산으로.
 *
 * ★★ 핵심: 결산이 엔딩 직전에 뜨고, 끝나면 **반드시 'ended'에 도달**하는지(무한루프 없음).
 * 순서(호감도 낮은→높은) / 처분 폴백 맨 앞 / 데드엔딩 skip / 결정적 씬 확정 제외 / 여파 체인.
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

// 4인 전부 청산 자격 + 처분은 이미 함(폴백 skip). 호감도로 순서 관찰.
const ALL_ELIGIBLE = {
  age: 21, courtInfluence: 50, phase: 'result', pendingEventIds: [], counters: {},
  affection: { heir: 10, hero: 20, loyalist: 30, commander: 50 },
  flags: {
    regent_disposed: true, 'event:regent-disposal': true,
    house_commons_dissolved: true, hero_at_court: true, military_route_open: false,
    'romance_confirmed:heir': false, 'romance_confirmed:loyalist': false,
    'romance_confirmed:hero': false, 'romance_confirmed:commander': false,
    heir_reckoned: false, loyalist_reckoned: false, hero_reckoned: false, commander_reckoned: false,
  },
}

// 결산 세션을 끝까지 몬다 — 각 이벤트를 spare(청산)/tyrant(처분)/dismiss(여파)로 넘긴다.
const drive = (patch) => page.evaluate((p) => {
  const q = window.__queeningAi
  q.setGame(p)
  q.continueResult() // 큐 비었으니 결산 정착 발동
  const order = []
  let phase = q.state.phase
  for (let i = 0; i < 40 && phase !== 'ended'; i++) {
    const id = q.state.pendingEventIds[0]
    if (!id) break // 갇힘(있어선 안 됨)
    order.push(id)
    if (id.endsWith('-reckoning')) q.choose(id, 'spare')
    else if (id === 'regent-disposal') q.choose(id, 'tyrant')
    else q.dismiss() // 여파(선택 없음)
    phase = q.state.phase
  }
  return { phase, order, steps: order.length }
}, patch)

// ── A. ★★ 종료 보장 + 순서(호감도 낮은→높은) ──
log('=== A. ★★ 종료 보장 + 순서 ===')
const A = await drive(ALL_ELIGIBLE)
log('A-결과:', JSON.stringify(A))
log('A1 ★★ 결산 끝나면 반드시 ended 도달(무한루프 없음):', ok(A.phase === 'ended'))
log('A2 ★ 청산 순서 = 호감도 낮은→높은(heir10→hero20→loyalist30→commander50):',
  ok(JSON.stringify(A.order) === JSON.stringify(['heir-reckoning', 'hero-reckoning', 'loyalist-reckoning', 'commander-reckoning'])))

// ── B. 처분 폴백 — 치세 중 못 쳤으면 결산 맨 앞 ──
log('')
log('=== B. 처분 폴백 (결산 맨 앞) ===')
const B = await drive({
  ...ALL_ELIGIBLE,
  flags: {
    ...ALL_ELIGIBLE.flags,
    regent_disposed: false, regent_alliance: false, 'event:regent-disposal': false,
  },
})
log('B-결과:', JSON.stringify(B.order))
log('B1 ★ 미처분+eligible → 처분이 결산 맨 앞:', ok(B.order[0] === 'regent-disposal'))
log('B2 ★ 처분(tyrant→regent_disposed) 후 ① 청산 열림:', ok(B.order.includes('heir-reckoning')))
log('B3 ★★ 처분 폴백 포함해도 반드시 ended:', ok(B.phase === 'ended'))

// ── C. 데드엔딩이면 결산 없이 바로 ended ──
log('')
log('=== C. 데드엔딩 skip ===')
const C = await page.evaluate((base) => {
  const q = window.__queeningAi
  q.setGame({ ...base, age: 18, flags: { ...base.flags, 'dead_end:strain': true } })
  q.continueResult()
  return { phase: q.state.phase, pending: q.state.pendingEventIds.length }
}, ALL_ELIGIBLE)
log('C1 ★ 데드엔딩(dead_end:*)이면 결산 없이 바로 ended:', ok(C.phase === 'ended' && C.pending === 0))

// ── D. 결정적 씬으로 맺어진 캐릭터 제외 ──
log('')
log('=== D. 결정적 씬 확정 제외 ===')
const D = await drive({
  ...ALL_ELIGIBLE,
  flags: { ...ALL_ELIGIBLE.flags, 'romance_confirmed:heir': true },
})
log('D-결과:', JSON.stringify(D.order))
log('D1 ★ romance_confirmed:heir → heir 청산 제외:', ok(!D.order.includes('heir-reckoning') && D.phase === 'ended'))

// ── E. 여파 체인 — 청산 뒤 그 후일담이 이어짐 ──
log('')
log('=== E. 여파 체인 ===')
const E = await page.evaluate((base) => {
  const q = window.__queeningAi
  // ⑤ commander 만 eligible, 호감 높음(75) → purge → commander_purged → 고구간 여파.
  q.setGame({
    ...base, affection: { commander: 75 },
    flags: {
      'event:regent-disposal': true, military_route_open: false,
      'romance_confirmed:commander': false, commander_reckoned: false,
      // regent_disposed 없음 → ①② 제외 / hero_at_court 없음 → ④ 제외 → ⑤만 eligible
    },
  })
  q.continueResult()
  const order = []
  let phase = q.state.phase
  for (let i = 0; i < 20 && phase !== 'ended'; i++) {
    const id = q.state.pendingEventIds[0]
    if (!id) break
    order.push(id)
    if (id.endsWith('-reckoning')) q.choose(id, 'purge')
    else q.dismiss()
    phase = q.state.phase
  }
  return { phase, order }
}, ALL_ELIGIBLE)
log('E-결과:', JSON.stringify(E.order))
log('E1 ★ 청산(purge) 뒤 여파가 체인:',
  ok(E.order[0] === 'commander-reckoning' && E.order.some((id) => id.startsWith('commander-') && !id.endsWith('-reckoning'))))
log('E2 ★★ 여파 체인 포함해도 반드시 ended:', ok(E.phase === 'ended'))

// ── F. 청산이 19세에 auto-fire 하지 않음(결산으로만) ──
log('')
log('=== F. 청산 auto-fire 제거 ===')
const F = await page.evaluate((base) => {
  const q = window.__queeningAi
  // 19세, 자격 충족, 하지만 아직 엔딩 전(age≤20) → triggerable 에 청산 없어야.
  q.setGame({ ...base, age: 19, phase: 'schedule' })
  return q.triggerable().filter((id) => id.endsWith('-reckoning'))
}, ALL_ELIGIBLE)
log('F1 ★ 19세엔 청산 auto-fire 안 함(triggerable 없음):', JSON.stringify(F), ok(F.length === 0))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
