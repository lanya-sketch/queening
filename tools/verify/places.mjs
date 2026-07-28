/**
 * 궁 안 이동 검증 — 「이번 달, 어디로」 (2-b-1).
 *
 * A. 「이번 달, 어디로」 — 버튼·피커·AP 무소모·월 1회·턴 종료 클리어.
 * B. 장소 방문 — 서고/정원/연무장 씬, 스탯 0.
 * C. ★ 왕대비궁 부재 확률 분기 — 재실(문안)/부재 전(???)/부재 후 자격(수색)/부재 후 미달(잠김).
 * D. ★ ②-비의존 발견→접근→수색 — clue_apothecary 만으로(로맨스 0) 힌트→방문→부재→수색. (핵심 판정)
 * E. ★ 게이트 AND — 방문·부재라도 궁정처세 미달이면 수색이 안 열린다.
 * F. ★ 미스터리 무손상 — 어느 장소를 방문해도 clue_ / truth_ flag 를 안 세운다(타임라인 불변).
 * G. 인물 유동 조우 — 가중치대로 갈리고, pity 가 가뭄을 막는다.
 */
import { APP_URL, enterGame, launch, log, ok } from './helpers.mjs'

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(200)

const setGame = (p) => page.evaluate((pp) => window.__queeningAi.setGame(pp), p)
const flags = () => page.evaluate(() => window.__queeningAi.state.flags)
const rngConst = (v) => page.evaluate((x) => window.__queeningAi.setRngConst(x), v)
// 한 단락씩 렌더 — 씬 전체 텍스트를 모은다.
const sceneText = async () => {
  let t = ''
  for (let i = 0; i < 6; i++) {
    t += ' ' + (await page.locator('article').innerText().catch(() => ''))
    const a = page.locator('[data-scene-advance]')
    if (!(await a.isVisible().catch(() => false))) break
    await a.click().catch(() => {}); await page.waitForTimeout(90)
  }
  return t
}
const visitVia = async (place) => {
  await page.locator('[data-goto-button]').click(); await page.waitForTimeout(120)
  await page.locator(`[data-destination="${place}"]`).click(); await page.waitForTimeout(250)
}

// ── A. 「이번 달, 어디로」 ─────────────────────────────────
log('=== A. 「이번 달, 어디로」 (AP-프리·월 1회) ===')
await setGame({ phase: 'schedule', age: 16, actionPoints: 3, flags: {} })
await page.waitForTimeout(150)
log('A1 goto 버튼 노출:', ok(await page.locator('[data-goto-button]').isVisible()))
const apBefore = await page.evaluate(() => window.__queeningAi.state.actionPoints)
await rngConst(0.99) // 조우 무관
await visitVia('library')
log('A2 방문 → 이벤트 발동:', ok(await page.locator('[data-screen="event"]').isVisible()))
const apAfter = await page.evaluate(() => window.__queeningAi.state.actionPoints)
log('A3 ★ AP 무소모:', `${apBefore}→${apAfter}`, ok(apBefore === apAfter))
log('A4 visited_this_month:', ok((await flags()).visited_this_month === true))
await sceneText() // 씬 종료
await page.waitForTimeout(150)
log('A5 방문 후 goto 버튼 사라짐(월 1회):',
  ok(!(await page.locator('[data-goto-button]').isVisible().catch(() => false))))
// 턴 종료 클리어 — visited_this_month 가 다음 턴엔 꺼져 다시 나갈 수 있다.
const cleared = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(0.99); q.setMinorEnabled(false)
  q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, flags: { visited_this_month: true, visited_library: true }, counters: {} })
  q.stepTurn(['rest', 'rest', 'rest'])
  return { m: q.state.flags.visited_this_month !== true, l: q.state.flags.visited_library !== true }
})
log('A6 ★ 턴 종료에 visited_* 클리어:', ok(cleared.m && cleared.l))

// ── B. 장소 방문 (스탯 0) ─────────────────────────────────
log('')
log('=== B. 장소 방문 (스탯 0) ===')
const statKept = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(0.99)
  q.setGame({ phase: 'schedule', age: 16, actionPoints: 3, stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 }, flags: {}, counters: {} })
  const b = { ...q.state.stats }
  for (const pl of ['library', 'garden', 'yard']) {
    q.setGame({ phase: 'schedule', flags: {} }); q.visit(pl)
  }
  const a = q.state.stats
  return !Object.keys(b).some((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 0.01)
})
log('B1 ★ 서고·정원·연무장 방문은 스탯 0:', ok(statKept))

// ── C. 왕대비궁 부재 확률 분기 ────────────────────────────
log('')
log('=== C. 왕대비궁 — 재실/부재 분기 ===')
await rngConst(0.99) // 재실 강제(0.99 ≥ 0.15·0.5)
await setGame({ phase: 'schedule', age: 15, flags: {} })
await page.waitForTimeout(120)
await visitVia('queen')
log('C1 재실 → 문안(무리하지 말거라):', ok((await sceneText()).includes('무리하지')))
await rngConst(0) // 부재 강제
await setGame({ phase: 'schedule', age: 14, flags: {} })
await page.waitForTimeout(120)
await visitVia('queen')
log('C2 ★ 단서 전 부재 → ???(손댈 엄두):', ok((await sceneText()).includes('엄두')))
await rngConst(0)
await setGame({ phase: 'schedule', age: 17, flags: { clue_apothecary: true }, stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 65 } })
await page.waitForTimeout(120)
await visitVia('queen')
log('C3 ★ 단서 후 자격 → 수색(달이 없는 밤):',
  ok((await page.locator('[data-event-title]').innerText().catch(() => '')).includes('달이 없는 밤')))
log('C4 queen_chamber_searched·open 세워짐:',
  ok((await flags()).queen_chamber_searched === true && (await flags()).queen_chamber_open === true))
await sceneText()

// ── D. ★ ②-비의존 발견 → 접근 → 수색 (핵심) ──────────────
log('')
log('=== D. ★ ②-비의존 발견→접근→수색 (로맨스 0) ===')
await rngConst(0) // 부재 강제
await setGame({
  phase: 'schedule', age: 17,
  affection: { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 }, // ② 없음
  stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 65 },
  flags: { clue_apothecary: true }, // hint_queen_chamber 없음(② 미해금)
})
await page.waitForTimeout(150)
// 2-a 기록의 ②-비의존 힌트가 왕대비궁을 가리키는지(연결 확인).
await page.locator('[data-journal-button]').click(); await page.waitForTimeout(150)
const jtext = await page.locator('[data-screen="journal"]').innerText().catch(() => '')
log('D1 기록이 왕대비궁을 가리킴(②없이):', ok(jtext.includes('왕대비궁') && jtext.includes('들여다볼')))
await page.getByRole('dialog', { name: '기록' }).getByRole('button', { name: '닫기' }).click().catch(() => {})
await page.waitForTimeout(120)
await visitVia('queen')
const dtitle = await page.locator('[data-event-title]').innerText().catch(() => '')
log('D2 ★ ② 없이 왕대비궁 부재 → 달이 없는 밤:', dtitle, ok(dtitle.includes('달이 없는 밤')))
log('D3 ★ 수색 성립(queen_chamber_searched):', ok((await flags()).queen_chamber_searched === true))
await sceneText()

// ── E. ★ 게이트 AND — 방문만으론 안 열린다 ────────────────
log('')
log('=== E. ★ 게이트 AND (방문·부재라도 궁정처세 미달이면 잠김) ===')
await rngConst(0) // 부재 강제
await setGame({
  phase: 'schedule', age: 17,
  stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 }, // 미달
  flags: { clue_apothecary: true },
})
await page.waitForTimeout(120)
await visitVia('queen')
const etext = await sceneText()
log('E1 ★ 궁정처세 미달 → 잠김(들킬 위험), 수색 아님:',
  ok(etext.includes('들킬 위험') && !etext.includes('발소리')))
log('E2 ★ 방문만으로 침실 안 열림(searched 안 섬):',
  ok((await flags()).queen_chamber_searched !== true))
// ② 할인: hint_queen_chamber 면 30 으로 열린다(같은 미달 궁정처세에서).
await rngConst(0)
await setGame({ phase: 'schedule', age: 17, stats: { statecraft: 40, finance: 30, rhetoric: 30, martial: 30, courtcraft: 40 }, flags: { clue_apothecary: true, hint_queen_chamber: true } })
await page.waitForTimeout(120)
await visitVia('queen')
log('E3 ★ ② 할인(hint) → 궁정처세 40 에서도 수색 열림:',
  ok((await page.locator('[data-event-title]').innerText().catch(() => '')).includes('달이 없는 밤')))
await sceneText()

// ── F. ★ clue_* 불변 (미스터리 타임라인) ──────────────────
log('')
log('=== F. ★ 세계관 힌트가 clue_*/truth_* 를 안 세움 ===')
const noClue = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(null) // 실제 난수 — 로테이션·조우 다양하게
  let leaked = []
  for (let i = 0; i < 40; i++) {
    q.setGame({ phase: 'schedule', age: 16, flags: { prince_present: true }, counters: {} })
    const before = Object.keys(q.state.flags)
    q.visit(['library', 'garden', 'yard', 'patrol', 'sneak'][i % 5])
    const after = Object.keys(q.state.flags)
    for (const k of after) {
      if (!before.includes(k) && (k.startsWith('clue_') || k.startsWith('truth_'))) leaked.push(k)
    }
  }
  return [...new Set(leaked)]
})
log('F1 ★ 어느 장소를 방문해도 clue_/truth_ flag 0건:', JSON.stringify(noClue), ok(noClue.length === 0))

// ── G. 인물 유동 조우 (가중치 + pity) ─────────────────────
log('')
log('=== G. 인물 유동 조우 ===')
const sample = (place, count, seed) => page.evaluate(([pl, n, sd]) => {
  const q = window.__queeningAi
  q.setRngConst(null)
  q.setGame({ phase: 'schedule', age: 16, flags: { prince_present: true }, counters: sd ?? {} })
  const tally = { heir: 0, loyalist: 0, prince: 0, commander: 0, none: 0 }
  for (let i = 0; i < n; i++) {
    const who = q.visitPeek(pl)
    tally[who ?? 'none']++
  }
  return tally
}, [place, count, seed])
const lib = await sample('library', 200, {})
log('G1 서고 분포:', JSON.stringify(lib))
log('G1a ★ ② 서고에 가장 잦음(②>①):', ok(lib.loyalist > lib.heir))
log('G1b ★ 아무도 없는 날도 있음:', ok(lib.none > 0))
const yard = await sample('yard', 200, {})
log('G2 연무장 분포:', JSON.stringify(yard))
log('G2a ★ ⑤ 연무장 우세(⑤>③):', ok(yard.commander > yard.prince))
// ③ prince_present=false 면 조우 후보 아님.
const yardNoPrince = await page.evaluate(() => {
  const q = window.__queeningAi
  q.setRngConst(null); q.setGame({ phase: 'schedule', age: 16, flags: {}, counters: {} })
  let p = 0
  for (let i = 0; i < 100; i++) if (q.visitPeek('yard') === 'prince') p++
  return p
})
log('G3 ★ ③은 궁에 있을 때만(prince_present 없으면 0):', yardNoPrince, ok(yardNoPrince === 0))
// pity — 최근 본 ②는 빈도가 준다(같은 서고에서 __seen:loyalist 를 채워 비교).
const libSeen = await sample('library', 200, { '__seen:loyalist': 10 })
log('G4 최근 본 ② 반영 분포:', JSON.stringify(libSeen))
log('G4a ★ pity — 방금 본 ②는 덜 자주(가뭄 방지 회전):', `${lib.loyalist}→${libSeen.loyalist}`,
  ok(libSeen.loyalist < lib.loyalist))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
