/**
 * 「기록」 화면 검증 — 미스터리 가시성 (완주 피드백 2, 2-a).
 *
 * A. 버튼 — 첫 단서 전엔 안 뜨고, 단서가 잡히면 뜬다.
 * B. 얻은 것만 — 얻은 단서만 보이고, 못 얻은 건 존재조차 안 보인다(스포일러 방지).
 * C. 테마 — 얻은 축만 뜬다(왕대비 단서 없으면 왕대비 축 자체가 안 보임).
 * D. 진실 — 진실은 배지와 함께 별도로.
 * E. ★ ②-비의존 발견 — clue_apothecary 만으로(로맨스·호감 0) 왕대비궁 방향 힌트가 뜬다.
 * F. 위험 — 발각(queen_poison_path) 후 "위험" 항목. averted 면 "넘겼다".
 * G. ★ 수치 없음 — 힌트에 궁정처세 60 같은 정확한 수치가 안 나온다.
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
const openJournal = async () => {
  await page.locator('[data-journal-button]').click()
  await page.waitForTimeout(200)
}
const closeJournal = async () => {
  await page.getByRole('dialog', { name: '기록' }).getByRole('button', { name: '닫기' }).click()
  await page.waitForTimeout(150)
}
const journalText = () =>
  page.locator('[data-screen="journal"]').innerText().catch(() => '')

// ── A. 버튼 ───────────────────────────────────────────────
log('=== A. 기록 버튼 ===')
await setGame({ phase: 'schedule', age: 14, flags: {} })
await page.waitForTimeout(150)
log('A1 단서 전엔 기록 버튼 없음:',
  ok((await page.locator('[data-journal-button]').count()) === 0))
await setGame({ flags: { clue_radical_edict: true } })
await page.waitForTimeout(150)
log('A2 첫 단서 후 기록 버튼 뜸:',
  ok((await page.locator('[data-journal-button]').count()) === 1))

// ── B/C/D. 얻은 것만 · 테마 · 진실 ────────────────────────
log('')
log('=== B/C/D. 얻은 것만 · 테마 · 진실 ===')
await setGame({
  flags: {
    clue_radical_edict: true, clue_sealed_report: true, // 선왕의 죽음
    truth_regent_involved: true, // 섭정공 (진실)
    // 왕대비 축은 하나도 안 얻음 → 축 자체가 안 보여야 함
  },
})
await openJournal()
const t1 = await journalText()
log('B1 얻은 단서(급진 칙령·봉인된 진료 기록) 보임:',
  ok(t1.includes('급진 칙령') && t1.includes('봉인된 진료 기록')))
log('B2 ★ 못 얻은 단서(왕대비궁의 약재·어머니의 서신) 안 보임:',
  ok(!t1.includes('왕대비궁의 약재') && !t1.includes('어머니의 서신')))
log('C1 얻은 축(선왕의 죽음·섭정공) 보임:',
  ok(t1.includes('선왕의 죽음') && t1.includes('섭정공')))
log('C2 ★ 왕대비 단서 0 → 왕대비 축 자체가 안 보임(스포일러 방지):',
  ok(!t1.includes('왕대비')))
log('D1 진실(덮인 밤)은 배지와 함께:', ok(t1.includes('덮인 밤') && t1.includes('진실')))
await closeJournal()

// ── E. ★ ②-비의존 발견 ───────────────────────────────────
log('')
log('=== E. ★ ②-비의존 발견 (clue_apothecary 만으로) ===')
await setGame({
  age: 17,
  // ★ 로맨스·호감 전무. clue_apothecary(② 없이 궁정처세로 얻는 단서)만.
  affection: { heir: 0, loyalist: 0, prince: 0, commander: 0, hero: 0 },
  flags: {
    clue_sealed_report: true, clue_witness_gone: true, truth_regent_involved: true,
    clue_apothecary: true,
  },
})
await openJournal()
const t2 = await journalText()
log('E1 ★ ② 없이 clue_apothecary → 왕대비궁 방향 힌트 뜸:',
  ok(t2.includes('왕대비궁') && t2.includes('들여다볼')))
log('E2 "남은 의문" 절이 있음:', ok(t2.includes('남은 의문')))
// ── G. 수치 없음 ──────────────────────────────────────────
const hintsRegion = t2.split('남은 의문')[1] ?? ''
log('G1 ★ 힌트에 정확한 수치(60/45/궁정처세 N) 없음:',
  ok(!/\d/.test(hintsRegion)))
await closeJournal()

// ── F. 위험 (발각) ────────────────────────────────────────
log('')
log('=== F. 위험 (발각 후) ===')
await setGame({ flags: { clue_apothecary: true, queen_poison_path: true } })
await openJournal()
const t3 = await journalText()
log('F1 ★ 발각 후 "위험" 항목 + 경계 서술:',
  ok(t3.includes('위험') && t3.includes('경계')))
await closeJournal()
await setGame({ flags: { clue_apothecary: true, queen_poison_path: true, queen_poison_averted: true } })
await openJournal()
const t4 = await journalText()
log('F2 ★ 막았으면(averted) "넘겼다":', ok(t4.includes('넘겼다')))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : '*** FAIL ***\n  ' + errors.join('\n  '))
await browser.close()
