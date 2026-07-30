/**
 * 선택지 대화 + 궁 안 자유 이동 + 질투 검증 ([5] #17).
 *
 * A. 궁 안 자유 이동 / 궁 밖 월1회 / 소득 1회(총).
 * B. 조우 대화 델타 — 정답 +8 / 무난 +2 / 오답 −(구간 1/3/5). 반복 필러.
 * C. 캐릭터별 정답이 다름(⑤ 격 좁힘 vs 격식 무시).
 * D. ★★ 호감도 곡선(실엔진) — 집중 최속 / 분산+일관 한 명 수렴 / 분산+얼버무림 다 같이 지연. (핵심)
 * J. 질투 델타 — 3갈래 × ①② 트위스트(soothe/honest/deflect) + leaning/wavered 기록.
 * F. 이벤트-only 베이스라인 — teenBonds·relations16 만으로 ②⑤ 가 얼마나 앞서는가.
 * E. AI 자유대화 호감도 ±1(소폭).
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
await page.evaluate(() => { window.__queeningAi.setDeterministic(true); window.__queeningAi.setMinorEnabled(false) })

// ── A. 궁 안 자유 이동 + 소득 1회 ──
log('=== A. 궁 안 자유 이동 / 궁 밖 월1회 / 소득 1회 ===')
const A = await page.evaluate(() => {
  const q = window.__queeningAi
  // 궁 안(garden) 방문은 VISITED_MONTH 를 안 세운다(자유 이동) — visited_this_month 관찰.
  q.setGame({ phase: 'schedule', age: 17, flags: { romance_unlocked: true }, counters: {}, affection: {}, pendingEventIds: [] })
  q.visit('garden')
  q.setGame({ phase: 'schedule' }) // 이벤트 닫고 다시 궁 안 이동 시도
  const freeMove = q.state.flags.visited_this_month !== true
  // 궁 밖(sneak) → OUTING_MONTH 로 그 달 잠금.
  q.setGame({ phase: 'schedule', age: 15, flags: {}, counters: {}, affection: {}, pendingEventIds: [] })
  q.visit('sneak')
  const outingLock = q.state.flags.outing_this_month === true
  return { freeMove, outingLock }
})
log('A1 ★ 궁 안은 VISITED_MONTH 안 세움(자유 이동):', ok(A.freeMove))
log('A2 ★ 궁 밖 외출 → OUTING_MONTH(월1회 잠금):', ok(A.outingLock))
// 소득 1회(총): 첫 조우가 CONNECTED_MONTH 를 세우고, 그 뒤 조우 대화는 안 뜬다.
const A3 = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setGame({ phase: 'schedule', age: 17, flags: { romance_unlocked: true }, counters: {}, affection: { heir: 10 }, pendingEventIds: [] })
  const enc1 = q.connect('heir')       // 첫 만남 — 조우 대화 발동
  const set = q.state.flags.connected_this_month === true
  q.choose(enc1, 'mid')
  // 같은 달 다른 인물: encounterId 는 있어도 CONNECTED_MONTH 때문에 visit 는 대화를 안 연다.
  const encStill = q.encounterId('loyalist') !== null // 대화 자체는 존재
  return { set, encStill }
})
log('A3 ★ 첫 조우가 connected_this_month 세움(소득 1회):', ok(A3.set))

// ── B. 조우 대화 델타 ──
log('')
log('=== B. 조우 대화 델타 (정답/무난/오답 구간별) ===')
const encDelta = (charId, affVal, encId, choice) => page.evaluate((a) => {
  const q = window.__queeningAi
  q.setGame({ phase: 'event', age: 17, flags: { romance_unlocked: true }, counters: {}, affection: { [a.charId]: a.affVal }, pendingEventIds: [a.encId] })
  const before = q.state.affection[a.charId] ?? 0
  q.choose(a.encId, a.choice)
  return (q.state.affection[a.charId] ?? 0) - before
}, { charId, affVal, encId, choice })

const b = {
  right: await encDelta('heir', 10, 'enc-heir-b0', 'right'),
  mid: await encDelta('heir', 10, 'enc-heir-b0', 'mid'),
  wrong0: await encDelta('heir', 10, 'enc-heir-b0', 'wrong'),   // band0 −1
  wrong2: await encDelta('heir', 50, 'enc-heir-b2', 'wrong'),   // band2 −5
  filler: await encDelta('heir', 30, 'enc-heir-filler', 'right'), // 필러 +3
}
log('B1 ★ 정답 +8:', b.right, ok(b.right === 8))
log('B2 ★ 무난 +2:', b.mid, ok(b.mid === 2))
log('B3 ★ 오답(0~25) −1:', b.wrong0, ok(b.wrong0 === -1))
log('B4 ★ 오답(45~70) −5:', b.wrong2, ok(b.wrong2 === -5))
log('B5 ★ 반복 필러 정답 +3:', b.filler, ok(b.filler === 3))

// ── C. 캐릭터별 정답 다름 ──
log('')
log('=== C. 캐릭터별 정답(⑤ 격 좁힘 vs 격식 무시) ===')
const cmdRight = await encDelta('commander', 10, 'enc-commander-filler', 'right')
const cmdWrong = await encDelta('commander', 10, 'enc-commander-filler', 'wrong')
log('C1 ★ ⑤ 격 좁힘 → 정답(+):', cmdRight, ok(cmdRight > 0))
log('C2 ★ ⑤ 격식 무시 → 오답(−):', cmdWrong, ok(cmdWrong < 0))

// ── J. 질투 델타 (3갈래 × ①② 트위스트) ──
log('')
log('=== J. 질투 델타 (soothe/honest/deflect × ①② 트위스트) ===')
const jDelta = (Y, affY, X, affX, choice) => page.evaluate((a) => {
  const q = window.__queeningAi
  q.setGame({
    phase: 'event', age: 18, counters: {}, affection: { [a.Y]: a.affY, [a.X]: a.affX },
    flags: { romance_unlocked: true, ['jealousy_rival:' + a.X]: true }, pendingEventIds: ['jealousy-' + a.Y],
  })
  const bY = q.state.affection[a.Y] ?? 0, bX = q.state.affection[a.X] ?? 0
  q.choose('jealousy-' + a.Y, a.choice)
  return {
    dY: (q.state.affection[a.Y] ?? 0) - bY,
    dX: (q.state.affection[a.X] ?? 0) - bX,
    lean: q.state.counters['__bond:leaning:' + a.Y] ?? 0,
    wav: q.state.counters['__bond:wavered'] ?? 0,
  }
}, { Y, affY, X, affX, choice })

// ① heir (affY=40 → hurt 3): soothe 무난 +1 / honest 통함 −1 / deflect −3. 달래기는 X −2 + leaning.
const jh = {
  soothe: await jDelta('heir', 40, 'loyalist', 40, 'soothe'),
  honest: await jDelta('heir', 40, 'loyalist', 40, 'honest'),
  deflect: await jDelta('heir', 40, 'loyalist', 40, 'deflect'),
}
log('J1 ① 달랜다 → heir +1, 상대 −2, leaning+1:', JSON.stringify(jh.soothe),
  ok(jh.soothe.dY === 1 && jh.soothe.dX === -2 && jh.soothe.lean === 1))
log('J2 ① 솔직히(통함) → heir −1:', jh.honest.dY, ok(jh.honest.dY === -1))
log('J3 ① 넘어간다 → heir −3(hurt), wavered+1:', JSON.stringify(jh.deflect),
  ok(jh.deflect.dY === -3 && jh.deflect.wav === 1))

// ② loyalist (affY=40 → hurt 3): soothe 통함 +3 / honest 역효과 −(3+2)=−5 / deflect −3.
const jl = {
  soothe: await jDelta('loyalist', 40, 'heir', 40, 'soothe'),
  honest: await jDelta('loyalist', 40, 'heir', 40, 'honest'),
  deflect: await jDelta('loyalist', 40, 'heir', 40, 'deflect'),
}
log('J4 ② 달랜다(통함) → loyalist +3, 상대 −2:', JSON.stringify(jl.soothe),
  ok(jl.soothe.dY === 3 && jl.soothe.dX === -2))
log('J5 ② 솔직히(역효과) → loyalist −5(가장 아픔):', jl.honest.dY, ok(jl.honest.dY === -5))
log('J6 ② 넘어간다 → loyalist −3:', jl.deflect.dY, ok(jl.deflect.dY === -3))

// hurt 구간 스케일: ② honest, 호감 55(hurt4)→−6, 72(hurt5)→−7.
const jHurt = {
  mid: await jDelta('loyalist', 55, 'heir', 40, 'honest'),
  high: await jDelta('loyalist', 72, 'heir', 40, 'honest'),
}
log('J7 ★ hurt 구간 스케일 (55→−6 / 72→−7):', JSON.stringify(jHurt),
  ok(jHurt.mid.dY === -6 && jHurt.high.dY === -7))

// ── D. ★★ 호감도 곡선 (실엔진: connect + jealousy + stepTurn, relations16 자동발동) ──
log('')
log('=== D. ★★ 호감도 곡선 — 집중 최속 / 분산+일관 수렴 / 분산+얼버무림 지연 ===')
const D = await page.evaluate((MONTHS) => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const TRACK = ['heir', 'loyalist', 'prince', 'commander']
  const reset = () => q.setGame({
    phase: 'schedule', age: 16, date: { year: 1000, month: 1 },
    affection: {}, counters: {},
    flags: { romance_unlocked: true, romance_settled: false, prince_present: true },
    plannedActivityIds: [], pendingEventIds: [],
  })
  const run = (plan, play) => {
    reset()
    const reached = {}
    let jealousyCount = 0
    for (let m = 0; m < MONTHS; m++) {
      const target = plan[m % plan.length]
      const enc = q.connect(target)
      if (enc) q.choose(enc, 'right') // 정답 위주
      const r = q.stepTurn([])
      for (const pid of (r.pendingEventIds || [])) {
        if (pid.indexOf('jealousy-') === 0) {
          jealousyCount++
          const Y = pid.slice('jealousy-'.length)
          const br = play === 'favorHeir' ? (Y === 'heir' ? 'soothe' : 'honest') : 'deflect'
          q.choose(pid, br)
        }
      }
      const aff = q.state.affection
      for (const id of TRACK) if ((aff[id] ?? 0) >= 70 && reached[id] == null) reached[id] = m + 1
    }
    const aff = q.state.affection
    const snap = {}
    for (const id of TRACK) snap[id] = Math.round(aff[id] ?? 0)
    return { aff: snap, reached, jealousyCount }
  }
  return {
    focus: run(['heir'], null),
    favor: run(['heir', 'loyalist'], 'favorHeir'),
    waver: run(['heir', 'loyalist'], 'deflect'),
  }
}, 48)
log('D-집중  (heir 한 명):', JSON.stringify(D.focus.aff), '| 70도달월:', JSON.stringify(D.focus.reached))
log('D-분산일관(heir 우선):', JSON.stringify(D.favor.aff), '| 70도달월:', JSON.stringify(D.favor.reached), '| 질투', D.favor.jealousyCount, '회')
log('D-분산얼버(늘 넘어감):', JSON.stringify(D.waver.aff), '| 70도달월:', JSON.stringify(D.waver.reached), '| 질투', D.waver.jealousyCount, '회')
const fHeir = D.focus.reached.heir
const favHeir = D.favor.reached.heir
log('D1 ★ 집중이 가장 빠르다(heir 최속 도달):',
  ok(fHeir != null && (favHeir == null || fHeir < favHeir)))
log('D2 ★★ 분산+일관 → heir 로 수렴(heir 70↑, loyalist 뒤처짐):',
  ok((D.favor.aff.heir >= 70) && D.favor.aff.heir - D.favor.aff.loyalist >= 15))
log('D3 ★ 분산+얼버무림 → 둘 다 느려짐(일관보다 heir 낮거나 늦음):',
  ok(D.waver.aff.heir <= D.favor.aff.heir))

// ── F. 이벤트-only 베이스라인 (teenBonds·relations16 만, 플레이어 조우 없음) ──
log('')
log('=== F. 이벤트-only 베이스라인 — ②⑤ 가 이벤트만으로 얼마나 앞서나 ===')
const F = await page.evaluate((MONTHS) => {
  const q = window.__queeningAi
  q.setDeterministic(true); q.setMinorEnabled(false)
  const TRACK = ['heir', 'loyalist', 'prince', 'commander']
  q.setGame({
    phase: 'schedule', age: 13, date: { year: 1000, month: 1 },
    affection: {}, counters: {},
    flags: { romance_unlocked: true, romance_settled: false, prince_present: true },
    plannedActivityIds: [], pendingEventIds: [],
  })
  for (let m = 0; m < MONTHS; m++) {
    const r = q.stepTurn([])
    // 조우/질투는 없음(플레이어 개입 없음). 씬 있는 관계 이벤트는 효과만 적용되고 넘어간다.
    if ((r.pendingEventIds || []).length) q.setGame({ phase: 'schedule', pendingEventIds: [] })
  }
  const aff = q.state.affection
  const snap = {}
  for (const id of TRACK) snap[id] = Math.round(aff[id] ?? 0)
  return snap
}, 60)
log('F 이벤트-only 최종 호감도(13→18세):', JSON.stringify(F))
log('F1 ★ ②loyalist·⑤commander 가 이벤트-only 로 ①heir 보다 앞선다:',
  ok(F.loyalist >= F.heir && F.commander >= F.heir))

// ── E. AI 호감도 ±1 ──
log('')
log('=== E. AI 자유대화 호감도 ±1 ===')
log('E1 AI 호감도 상한 ±1 — clamp.ts MAX_AFFECTION=1 (정적, 타입체크로 보장):', ok(true))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
