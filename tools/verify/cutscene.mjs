/**
 * 날짜별 컷신 검증.
 *
 * A. 일기 생성 — 고른 활동 수만큼 diary 장면(3활동→3, 1활동→1), 각 항목에 날짜·활동·등급·심신·운.
 * B. ★ 수학 불변 — 같은 계획 두 번(같은 시작 상태) → 최종 스탯·자원·diary 완전 동일(결정론).
 * C. 날짜 분산 — 초·중·하순으로 서로 다르고 오름차순, 1~28, 결정론(같은 달 두 번 같은 날).
 * D. 건너뛰기 — '즉시' 속도 / 토글 끄기면 컷신 없이 바로 요약.
 * E. 서술 분기 — 등급·심신·기질 조건대로 문구가 갈린다(UI 실측).
 * F. ★ 숨은 값 미누출 — 컷신 서술 줄에 수치(내구도·심신 숫자)가 안 뜬다.
 * G. 자동 진행 — 클릭 없이도 요약까지 도달(auto-advance).
 */
import { APP_URL, enterGame, launch, log, ok, shotsDir } from './helpers.mjs'

const OUT = shotsDir('cutscene')
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(APP_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await enterGame(page)
await page.waitForTimeout(300)

// 헬퍼: 시작 상태를 심고 계획을 stepTurn 으로 소화 → lastTurnReport 반환.
const runTurn = (patch, plan) =>
  page.evaluate(({ patch, plan }) => {
    const q = window.__queeningAi
    q.setDeterministic(true)
    q.setMinorEnabled(false)
    q.setGame({ phase: 'schedule', actionPoints: 3, date: { year: 3, month: 6 }, ...patch })
    q.stepTurn(plan)
    const g = q.state
    return { report: g.lastTurnReport, stats: g.stats, wellbeing: g.wellbeing }
  }, { patch, plan })

// ── A. 일기 생성 ──────────────────────────────────────────
log('=== A. 일기 생성 ===')
const three = await runTurn(
  { age: 14, wellbeing: 55, stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 30, courtcraft: 20 } },
  ['lecture-statecraft', 'sword-training', 'rest'],
)
log('A1 3활동 → 3장면:', three.report.diary.length, ok(three.report.diary.length === 3))
const e0 = three.report.diary[0]
log('A2 각 장면에 날짜·활동·등급·심신·운:',
  JSON.stringify({ day: e0.day, id: e0.activityId, tier: e0.tier, w: e0.wellbeing, luck: e0.luck }),
  ok(typeof e0.day === 'number' && !!e0.activityId && 'wellbeing' in e0 && 'luck' in e0))
const one = await runTurn({ age: 14, wellbeing: 60, stats: { statecraft: 30, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 } }, ['rest'])
log('A3 1활동 → 1장면:', one.report.diary.length, ok(one.report.diary.length === 1))

// ── B. 수학 불변 (결정론 재현) ────────────────────────────
log('')
log('=== B. 수학 불변 — 같은 계획 두 번 완전 동일 ===')
const patchB = { age: 13, wellbeing: 60, stats: { statecraft: 22, finance: 14, rhetoric: 18, martial: 12, courtcraft: 10 } }
const planB = ['lecture-statecraft', 'debate-practice', 'rest']
const r1 = await runTurn(patchB, planB)
const r2 = await runTurn(patchB, planB)
log('B1 ★ 최종 스탯 동일:', ok(JSON.stringify(r1.stats) === JSON.stringify(r2.stats)))
log('B2 ★ 심신 동일:', ok(r1.wellbeing === r2.wellbeing))
log('B3 ★ diary 동일:', ok(JSON.stringify(r1.report.diary) === JSON.stringify(r2.report.diary)))

// ── C. 날짜 분산 ──────────────────────────────────────────
log('')
log('=== C. 날짜 분산 ===')
const days = three.report.diary.map((d) => d.day)
log('C1 3장면 날짜:', JSON.stringify(days),
  ok(days.length === 3 && new Set(days).size === 3 && days.every((d) => d >= 1 && d <= 28)))
log('C2 오름차순(초→중→하순):', ok(days[0] < days[1] && days[1] < days[2]))
log('C3 ★ 결정론(같은 달 두 번 같은 날):', ok(JSON.stringify(r1.report.diary.map((d) => d.day)) === JSON.stringify(r2.report.diary.map((d) => d.day))))

// ── D. 건너뛰기 (즉시 / 토글) ─────────────────────────────
log('')
log('=== D. 건너뛰기 ===')
// ★ 스케줄 상태를 먼저 렌더시켜 TurnResultScreen 을 언마운트한 뒤 stepTurn 한다 —
//   한 evaluate 안에서 schedule→result 를 다 하면 React 가 중간 렌더를 건너뛰어(배치)
//   TurnResultScreen 이 리마운트되지 않아 showCutscene 초기화가 안 된다(실제 앱은 클릭 사이 렌더).
async function endTurnUI(speed, cutsceneOn, patch, plan) {
  await page.evaluate(({ speed, cutsceneOn, patch }) => {
    const q = window.__queeningAi
    q.setTextSpeed(speed)
    q.setCutsceneEnabled(cutsceneOn)
    q.setDeterministic(true); q.setMinorEnabled(false)
    q.setGame({ phase: 'schedule', actionPoints: 3, date: { year: 3, month: 6 }, ...patch })
  }, { speed, cutsceneOn, patch })
  await page.waitForTimeout(180)
  await page.evaluate((plan) => window.__queeningAi.stepTurn(plan), plan)
  await page.waitForTimeout(300)
}
async function turnAndScreen(speed, cutsceneOn) {
  await endTurnUI(speed, cutsceneOn,
    { age: 14, wellbeing: 55, stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 30, courtcraft: 20 } },
    ['lecture-statecraft', 'sword-training', 'rest'])
  return page.locator('[data-screen]').first().getAttribute('data-screen').catch(() => '?')
}
log('D1 ★ 보통 속도 + 켜짐 → 컷신:', ok((await turnAndScreen('보통', true)) === 'cutscene'))
log('D2 ★ 즉시 속도 → 컷신 건너뛰고 요약:', ok((await turnAndScreen('즉시', true)) === 'result'))
log('D3 ★ 토글 끄면 → 요약:', ok((await turnAndScreen('보통', false)) === 'result'))

// ── E. 서술 분기 ──────────────────────────────────────────
log('')
log('=== E. 서술 분기 (조건대로 갈림) ===')
async function firstLine(patch, plan) {
  await endTurnUI('보통', true, patch, plan)
  return page.locator('[data-cutscene-line]').first().innerText().catch(() => '')
}
// 통치학 초급(통치 낮음) + 심신 낮음 → "겉돌기"
const lineLow = await firstLine({ age: 13, wellbeing: 20, stats: { statecraft: 15, finance: 10, rhetoric: 10, martial: 10, courtcraft: 10 } }, ['lecture-statecraft'])
log('E1 초급+심신낮음:', JSON.stringify(lineLow), ok(lineLow.includes('겉돌') || lineLow.includes('감겼')))
// 통치학 고급(통치 높음) → "엮어 낸다"
const lineHigh = await firstLine({ age: 18, wellbeing: 70, stats: { statecraft: 80, finance: 20, rhetoric: 20, martial: 20, courtcraft: 20 } }, ['lecture-statecraft'])
log('E2 고급:', JSON.stringify(lineHigh), ok(lineHigh.includes('엮어') || lineHigh.includes('줄어')))
// 강건 기질 + 검술 → "검이 손에 붙은"
const lineRobust = await firstLine({ age: 14, wellbeing: 60, stats: { statecraft: 20, finance: 10, rhetoric: 15, martial: 20, courtcraft: 5 }, flags: { temperament_robust: true } }, ['sword-training'])
log('E3 ★ 강건+검술 기질 문구:', JSON.stringify(lineRobust), ok(lineRobust.includes('검이 손에 붙')))

// ── F. 숨은 값 미누출 ─────────────────────────────────────
log('')
log('=== F. 숨은 값(내구도·심신 수치) 미누출 ===')
// 여러 상태의 서술 줄을 모아 숫자가 섞이는지 본다.
const noDigit = [lineLow, lineHigh, lineRobust].every((s) => !/[0-9]/.test(s))
log('F1 ★ 컷신 서술 줄에 숫자 없음(내구도·수치 안 샘):', ok(noDigit))

// ── G. 자동 진행 ──────────────────────────────────────────
log('')
log('=== G. 자동 진행 (클릭 없이 요약 도달) ===')
await endTurnUI('빠르게', true,
  { age: 14, wellbeing: 55, stats: { statecraft: 40, finance: 20, rhetoric: 25, martial: 30, courtcraft: 20 } },
  ['lecture-statecraft', 'sword-training', 'rest'])
const startedCutscene = (await page.locator('[data-screen]').first().getAttribute('data-screen').catch(() => '?')) === 'cutscene'
await page.screenshot({ path: `${OUT}/verify-scene.png` })
// 클릭 없이 dwell(빠르게 0.9s)×3 + 여유만큼 기다린다.
await page.waitForTimeout(4000)
const reachedSummary = (await page.locator('[data-screen]').first().getAttribute('data-screen').catch(() => '?')) === 'result'
log('G1 컷신으로 시작:', ok(startedCutscene))
log('G2 ★ 클릭 없이 자동 진행으로 요약 도달:', ok(reachedSummary))

log('')
log('런타임 에러:', errors.length === 0 ? 'PASS (없음)' : errors.join('\n  '))
await browser.close()
log('스크린샷:', OUT)
